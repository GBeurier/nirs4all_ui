"""
Desktop launcher for nirs4all UI using pywebview
"""
import webview
import os
import sys
import threading
import time
from pathlib import Path


# Store window reference for API methods
window = None
backend_server = None


class Api:
    """API class to expose Python functions to JavaScript"""

    def select_folder(self):
        """Open native folder picker dialog"""
        global window
        if not window:
            return None

        result = window.create_file_dialog(
            webview.FOLDER_DIALOG
        )
        if result and len(result) > 0:
            return result[0]
        return None

    def select_file(self, file_types=None, allow_multiple=False):
        """Open native file picker dialog"""
        global window
        if not window:
            print('[select_file] No window available')
            return None

        if file_types is None:
            file_types = ('JSON files (*.json)',)

        print(f'[select_file] Opening dialog with file_types={file_types}, allow_multiple={allow_multiple}')
        result = window.create_file_dialog(
            webview.OPEN_DIALOG,
            allow_multiple=allow_multiple,
            file_types=file_types
        )
        print(f'[select_file] Dialog returned: {result}')

        # If multiple selection, return all files
        if allow_multiple and result:
            return result
        # If single selection, return first file
        elif result and len(result) > 0:
            return result[0]
        return None

    def save_file(self, default_filename='pipeline.json', file_types=None):
        """Open native save file dialog"""
        global window
        if not window:
            print('[save_file] No window available')
            return None

        if file_types is None:
            file_types = ('JSON files (*.json)',)

        print(f'[save_file] Opening dialog with default_filename={default_filename}, file_types={file_types}')
        result = window.create_file_dialog(
            webview.SAVE_DIALOG,
            save_filename=default_filename,
            file_types=file_types
        )
        print(f'[save_file] Dialog returned: {result} (type: {type(result)})')

        # SAVE_DIALOG returns a tuple like other dialogs
        # Return first element if it's a tuple/list, otherwise return as-is
        if result:
            if isinstance(result, (list, tuple)) and len(result) > 0:
                path = result[0]
                print(f'[save_file] Extracted path from tuple: {path}')
                return path
            else:
                print(f'[save_file] Returning result directly: {result}')
                return result
        print('[save_file] No file selected')
        return None


def get_url():
    """Get the URL for the React app"""
    # In development, use Vite dev server
    if os.environ.get('VITE_DEV', 'false').lower() == 'true':
        return 'http://localhost:5173'

    # In production, use the backend to serve static files
    # The backend will serve from dist/ folder
    return 'http://127.0.0.1:8000'


def is_packaged():
    """Check if running as packaged executable"""
    return getattr(sys, 'frozen', False)


def start_backend_server():
    """Start the FastAPI backend server in a separate thread"""
    try:
        import uvicorn

        # Suppress TensorFlow warnings
        os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
        os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

        # Get the correct path for the backend module
        if is_packaged():
            # When packaged, the main.py is in _internal directory
            base_path = Path(getattr(sys, '_MEIPASS', '.'))
        else:
            # When running from source, use current directory
            base_path = Path(__file__).parent

        # Add the base path to sys.path so imports work
        if str(base_path) not in sys.path:
            sys.path.insert(0, str(base_path))

        # Change working directory to base_path for relative imports
        os.chdir(str(base_path))

        # Start uvicorn server
        uvicorn.run(
            "main:app",
            host="127.0.0.1",
            port=8000,
            log_level="warning",
            access_log=False
        )
    except Exception as e:
        # Write error to log file in temp directory
        import tempfile
        log_file = Path(tempfile.gettempdir()) / "nirs4all_backend_error.log"
        with open(log_file, "w", encoding="utf-8") as f:
            f.write(f"Backend startup error:\n{str(e)}\n")
            import traceback
            f.write(traceback.format_exc())
        print(f"Backend error logged to: {log_file}")
        raise


def main():
    """Launch the desktop application"""
    global window
    global backend_server

    # Determine if we need to show debug console
    # In pure production (packaged), no debug console
    # In dev mode or prod_dbg mode, show debug console
    is_prod = is_packaged()
    show_debug = not is_prod or os.environ.get('NIRS4ALL_DEBUG', 'false').lower() == 'true'

    # Start backend server in a separate thread (only in production)
    backend_ready = False
    if is_prod:
        print("Starting embedded backend server...")
        backend_server = threading.Thread(target=start_backend_server, daemon=True)
        backend_server.start()

        # Wait for backend to be ready with retries
        print("Waiting for backend to initialize...")
        max_retries = 10
        for i in range(max_retries):
            time.sleep(1)
            try:
                import urllib.request
                urllib.request.urlopen("http://127.0.0.1:8000/api/health", timeout=1)
                print("Backend ready!")
                backend_ready = True
                break
            except Exception as e:
                if i == max_retries - 1:
                    print(f"Warning: Backend not responding after {max_retries} seconds")
                    print(f"Last error: {e}")
                    print("Check: C:\\Users\\grego\\AppData\\Local\\Temp\\nirs4all_backend_error.log")
                    print("Opening window anyway...")
                else:
                    print(f"Waiting... ({i + 1}/{max_retries})")
                continue

    print(f"Opening application window (backend_ready={backend_ready})...")

    url = get_url()
    api = Api()

    # Determine base path for resources depending on packaging
    if is_packaged():
        base_path = Path(sys._MEIPASS)
    else:
        base_path = Path(__file__).parent

    # Prefer dedicated nirs4all icon assets (.ico > .png > .svg) before falling back to legacy files.
    icon_path = None
    icon_candidates = [
        base_path / 'public' / 'nirs4all_icon.ico',
        base_path / 'public' / 'nirs4all.ico',
        base_path / 'public' / 'nirs4all_icon.png',
        base_path / 'public' / 'nirs4all_logo.png',
        base_path / 'public' / 'nirs4all_icon.svg',
        base_path / 'public' / 'nirs4all.svg',
    ]

    for candidate in icon_candidates:
        if candidate.exists():
            icon_path = str(candidate)
            break

    if icon_path:
        print(f"Using application icon: {icon_path}")
    else:
        print("No application icon found in public folder; continuing without explicit icon")

    # Create window and store reference (pass icon path when available).
    # Some pywebview versions/platforms don't accept the 'icon' kwarg, so pass
    # it dynamically only when present to avoid unexpected keyword errors.
    create_kwargs = {
        'title': 'nirs4all - NIRS Analysis Desktop Application',
        'url': url,
        'width': 1400,
        'height': 900,
        'resizable': True,
        'fullscreen': False,
        'min_size': (1024, 768),
        'js_api': api,
    }
    if icon_path:
        try:
            create_kwargs['icon'] = icon_path
        except Exception:
            # Defensive: some environments may not accept an icon path; ignore
            pass

    try:
        window = webview.create_window(**create_kwargs)
    except TypeError as exc:
        if 'icon' in create_kwargs:
            icon_value = create_kwargs.pop('icon', None)
            print(f"create_window does not support 'icon' parameter ({exc}); retrying without icon.")
            window = webview.create_window(**create_kwargs)
        else:
            raise

    print("Starting webview...")
    # Start the app with debug based on mode
    webview.start(debug=show_debug)
    print("Webview closed.")
if __name__ == '__main__':
    main()
