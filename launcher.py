"""
Desktop launcher for nirs4all UI using pywebview
"""
import webview
import sys
import os
from pathlib import Path


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

    # Create window
    window = webview.create_window(
        title='nirs4all',
        url=url,
        width=1280,
        height=800,
        resizable=True,
        fullscreen=False,
        min_size=(800, 600),
    )

    # Start the app
    webview.start(debug=os.environ.get('DEBUG', 'false').lower() == 'true')


if __name__ == '__main__':
    main()
