"""
Desktop launcher for nirs4all UI using pywebview
"""
import webview
import os


# Store window reference for API methods
window = None


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


def main():
    """Launch the desktop application"""
    global window

    url = get_url()
    api = Api()

    # Create window and store reference
    window = webview.create_window(
        title='nirs4all - NIRS Analysis Desktop Application',
        url=url,
        width=1400,
        height=900,
        resizable=True,
        fullscreen=False,
        min_size=(1024, 768),
        js_api=api
    )

    # Start the app with debug enabled to see console logs
    webview.start(debug=True)


if __name__ == '__main__':
    main()
