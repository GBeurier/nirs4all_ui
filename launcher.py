"""
Desktop launcher for nirs4all UI using pywebview
"""
import webview
import sys
import os
from pathlib import Path


class Api:
    """API class to expose Python functions to JavaScript"""

    def select_folder(self):
        """Open native folder picker dialog"""
        result = webview.windows[0].create_file_dialog(
            webview.FOLDER_DIALOG,
            allow_multiple=False
        )
        if result and len(result) > 0:
            return result[0]
        return None

    def select_file(self, file_types=None):
        """Open native file picker dialog"""
        if file_types is None:
            file_types = ('JSON files (*.json)',)

        result = webview.windows[0].create_file_dialog(
            webview.OPEN_DIALOG,
            allow_multiple=False,
            file_types=file_types
        )
        if result and len(result) > 0:
            return result[0]
        return None

    def save_file(self, default_filename='file.json', file_types=None):
        """Open native save file dialog"""
        if file_types is None:
            file_types = ('JSON files (*.json)',)

        result = webview.windows[0].create_file_dialog(
            webview.SAVE_DIALOG,
            save_filename=default_filename,
            file_types=file_types
        )
        if result:
            return result
        return None


def get_url():
    """Get the URL for the React app"""
    # In development, use Vite dev server
    if os.environ.get('VITE_DEV', 'false').lower() == 'true':
        return 'http://localhost:5173'

    # In production, serve from dist folder
    dist_path = Path(__file__).parent / 'dist' / 'index.html'
    return str(dist_path.absolute())


def main():
    """Launch the desktop application"""
    url = get_url()
    api = Api()

    # Create window
    window = webview.create_window(
        title='nirs4all',
        url=url,
        width=1280,
        height=800,
        resizable=True,
        fullscreen=False,
        min_size=(800, 600),
        js_api=api
    )

    # Start the app
    webview.start(debug=os.environ.get('DEBUG', 'false').lower() == 'true')


if __name__ == '__main__':
    main()
