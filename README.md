# nirs4all UI

Desktop application for the nirs4all NIR spectroscopy analysis platform. Built with React, TypeScript, and pywebview for a native desktop experience.

## Quick Start

All application modes are centralized through the `nirs4all.bat` launcher:

> **Note:** In PowerShell, use `.\nirs4all.bat` instead of `nirs4all.bat`

### Development Mode (Browser + Hot Reload)
```bash
.\nirs4all.bat dev
```
- Starts backend server on port 8000
- Starts Vite dev server on port 5173
- Opens in your web browser with hot reload
- Best for rapid UI development
- Press Ctrl+C to stop both servers

### Production Debug Mode (Desktop App + Debug Console)
```bash
.\nirs4all.bat prod_dbg
```
- Requires built application: `npm run build`
- Opens backend console window (shows nirs4all pipeline execution logs)
- Opens desktop application window **with debug console (F12 available)**
- Backend runs in separate console window
- Best for testing production build with full logging

### Production Mode (Standalone App)
```bash
.\nirs4all.bat prod
```
- Runs the packaged standalone executable with embedded backend
- Requires: `npm run build && npm run desktop:build`
- **Shows console window** with backend logs and nirs4all pipeline output
- Backend server runs embedded in the application
- No debug console (F12) in the app window
- Executable located at: `dist\nirs4all\nirs4all.exe`

### Clean Mode (Kill All Processes)
```bash
.\nirs4all.bat clean
```
- Kills all running backend servers (Python)
- Kills all Node.js dev servers
- Kills nirs4all desktop application instances
- Use when processes are stuck or before restarting
- Replaces the old `stop_app.bat`

## Development

### Web-only Development (Faster)
```bash
npm run dev
```
Then open `http://localhost:5173` in your browser.

### Full Desktop Development
```bash
.\run_all.bat dev
```
Starts Vite + backend + pywebview window.

## Building

```bash
npm run build              # Build frontend
npm run desktop:build      # Package as executable
```

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Desktop**: pywebview + PyInstaller
- **Backend**: FastAPI (from nirs4all core)

## Overview

This is a standalone UI application for nirs4all that connects to the FastAPI backend. It provides:

- **Workspace Management**: Link/unlink datasets, organize into groups
- **Pipeline Editor**: Visual pipeline builder with nirs4all format support
- **Dataset Configuration**: Configure preprocessing and feature selection
- **Pipeline Execution**: Run ML/DL pipelines on datasets
- **Results Visualization**: View predictions and pipeline results
- **File Browser**: Native file selection dialogs

## Tech Stack

### Frontend
- **Vite**: Fast build tool and dev server
- **React 18+**: Modern UI framework
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Feather Icons**: Lightweight icon library

### Desktop Wrapper
- **pywebview**: Native webview wrapper
- **PyInstaller**: Application packaging

### Backend (Separate Project)
- **FastAPI**: API server (from nirs4all core project)
- Runs on `http://localhost:8000` by default

## Project Structure

```
nirs4all_ui/
├── src/
│   ├── api/              # API client for FastAPI backend
│   │   └── client.ts
│   ├── components/       # Reusable React components
│   │   ├── DatasetTable.tsx
│   │   ├── GroupsModal.tsx
│   │   └── FileBrowserModal.tsx
│   ├── pages/            # Page-level components
│   │   └── WorkspacePage.tsx
│   ├── types/            # TypeScript type definitions
│   │   └── index.ts
│   ├── App.tsx           # Main app component
│   ├── main.tsx          # React entry point
│   └── index.css         # Global styles (Tailwind)
├── launcher.py           # pywebview desktop launcher
├── nirs4all.spec         # PyInstaller build config
├── requirements.txt      # Python dependencies
├── package.json          # Node.js dependencies
├── vite.config.ts        # Vite configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── tsconfig.json         # TypeScript configuration
```

## Features

### State Persistence
- **Pipeline state preserved across navigation** - your pipeline remains intact when switching pages
- Navigate between Workspace, Pipeline, Predictions without losing work
- Pipeline nodes, selections, and dataset choices are maintained
- Only cleared when explicitly using "Clear Pipeline" button

### Pipeline Editor
- Visual pipeline builder with drag-and-drop
- **Full nirs4all format support** - load/save pipelines in nirs4all JSON format
- Generator nodes (`_or_`, `_range_`) for parameter sweeps
- Support for all sklearn and nirs4all transformations
- See [NIRS4ALL_FORMAT.md](NIRS4ALL_FORMAT.md) and [QUICK_START_NIRS4ALL.md](QUICK_START_NIRS4ALL.md)

### Workspace Management
- Link/unlink datasets
- Organize into groups
- Native file dialogs

### Pipeline Execution
- Run ML/DL pipelines on datasets
- Real-time progress tracking
- View results and metrics

### Supported Components
- **Scalers**: MinMax, Standard, Robust
- **NIRS Transforms**: Detrend, Derivatives, SNV, MSC, Savitzky-Golay, Haar
- **Models**: PLS Regression, Random Forest, SVM, Neural Networks
- **Cross-Validation**: ShuffleSplit, KFold
- **Generators**: OR combinations, Range sweeps

## Development Setup

### Prerequisites

- **Node.js** 22.12+ (or 20.19+)
- **Python** 3.9+
- **nirs4all Core API**: Running on `http://localhost:8000`

### Installation

1. **Clone the repository** (or navigate to this workspace)

2. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

3. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

### Running in Development

#### Option 1: Web-only Development (Recommended for UI work)

```bash
# Start Vite dev server
npm run dev
```

Then open `http://localhost:5173` in your browser.

#### Option 2: Desktop Application Development

```bash
# Terminal 1: Start Vite dev server
npm run dev

# Terminal 2: Start pywebview launcher
npm run desktop:dev
```

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:8000
```

### Troubleshooting: CORS and "I can't open a folder"

If you still see CORS errors like:

```
Blocage d’une requête multiorigine (Cross-Origin Request) : la politique « Same Origin » ne permet pas de consulter la ressource distante située sur http://localhost:8000/api/workspace/groups. Raison : échec de la requête CORS. Code d’état : (null).
```

Check the following:

- Are you running the backend (FastAPI) on `http://localhost:8000`? If not, start it or update `VITE_API_URL`.
- When developing in the browser (`npm run dev`), ensure you set `VITE_DEV=true` (our helper scripts do this) so the Vite dev server proxies `/api` requests to the backend and avoids CORS.
- If you are testing the desktop app via `pywebview` (launcher), `window.pywebview` is only available when the app runs inside the pywebview environment. Trying to call `window.pywebview.api.*` in a regular browser will fail — fallbacks will be used instead.

Specific: "I can't open a folder"

- If the "Open folder" native dialog does nothing or throws errors when clicked in the browser:
  - That's expected: native dialogs are only available inside pywebview (desktop). In the browser we fall back to HTML file inputs.
  - To test the native dialogs, run the desktop launcher in dev mode after starting Vite and the backend so the webview points to the dev server:

    Bash/WSL/macOS:
    ```bash
    export BACKEND_CMD="cd ../nirs4all && uvicorn main:app --reload --port 8000"
    npm run dev:desktop:all
    ```

    PowerShell (Windows):
    ```powershell
    $env:BACKEND_CMD = "cd ..\nirs4all && uvicorn main:app --reload --port 8000"
    npm run dev:desktop:all
    ```

  - `dev:desktop:all` starts the frontend, the backend, waits for Vite to be ready, then launches `launcher.py` (pywebview). Inside pywebview the `select_folder/select_file` APIs are available.

If the backend is running but you still get CORS errors in the browser: check backend logs — it may not be reachable or may reject CORS. When in doubt, start the backend manually and open the UI in the browser to inspect exact network errors in devtools.

## Running frontend and backend together (single command)

To simplify development you can start both the frontend (Vite) and your backend API at once using the `dev:all` script.

This script expects an environment variable `BACKEND_CMD` that contains the shell command used to start your backend server (for example a `uvicorn` command). The frontend will be started with `VITE_DEV=true` so API calls are proxied by Vite and avoid CORS issues.

Examples:

- Bash / macOS / WSL:

```bash
# Example: start backend with uvicorn (adjust module name/path as needed)
export BACKEND_CMD="cd ../nirs4all && uvicorn main:app --reload --port 8000"
npm run dev:all
```

- PowerShell (Windows):

```powershell
# Set the environment variable for the current session and run
$env:BACKEND_CMD = "cd ..\nirs4all && uvicorn main:app --reload --port 8000"
npm run dev:all
```

Notes:

- If `BACKEND_CMD` is not set the helper will print instructions and exit.
- The default example assumes your backend can be started with `uvicorn main:app` from the `nirs4all` directory. If your backend uses a different entrypoint, update `BACKEND_CMD` accordingly.
- The `dev:all` script runs both processes and prefixes console output so you can see which messages come from frontend or backend. Press Ctrl+C to stop both processes.

If you prefer a simpler approach without the helper script, you can also start both processes in two separate terminals:

```powershell
# Terminal 1 (frontend)
npm run dev

# Terminal 2 (backend)
# from the backend project directory
uvicorn main:app --reload --port 8000
```

## Building for Production

### 1. Build the React App

```bash
npm run build
```

This creates a `dist/` directory with the optimized production build.

### 2. Package as Desktop Application

```bash
npm run desktop:build
```

Or manually:

```bash
# Build frontend
npm run build

# Package with PyInstaller
pyinstaller nirs4all.spec
```

The packaged application will be in the `dist/nirs4all/` directory.

## API Integration

The UI communicates with the nirs4all FastAPI backend through these endpoints:

### Workspace API
- `GET /api/workspace` - Get all linked datasets
- `POST /api/workspace/link` - Link a new dataset
- `DELETE /api/workspace/unlink/:id` - Unlink a dataset
- `GET /api/workspace/dataset/:id/config` - Get dataset configuration
- `PUT /api/workspace/dataset/:id/config` - Update dataset configuration

### Groups API
- `GET /api/workspace/groups` - Get all groups
- `POST /api/workspace/groups` - Create a new group
- `PUT /api/workspace/groups/:id` - Rename a group
- `DELETE /api/workspace/groups/:id` - Delete a group
- `POST /api/workspace/groups/:id/datasets` - Add dataset to group
- `DELETE /api/workspace/groups/:id/datasets/:datasetId` - Remove dataset from group

### Files API
- `GET /api/files/browse?path=` - Browse directory contents
- `GET /api/files/select` - Trigger native file dialog
- `GET /api/files/select-folder` - Trigger native folder dialog

### Predictions API
- `GET /api/predictions` - Get all predictions
- `POST /api/predictions/run` - Run a new prediction
- `DELETE /api/predictions/:id` - Delete a prediction

## Development Workflow

1. **Make changes** to React components in `src/`
2. **Test in browser** with `npm run dev` (faster iteration)
3. **Test desktop app** with `npm run desktop:dev` (when needed)
4. **Build for production** with `npm run desktop:build`

## Troubleshooting

### Vite dev server won't start
- Check Node.js version: `node --version` (needs 20.19+ or 22.12+)
- Clear node_modules: `rm -rf node_modules && npm install`

### API connection errors
- Ensure nirs4all core API is running on port 8000
- Check `.env` file has correct `VITE_API_URL`
- Check browser console for CORS errors

### pywebview errors
- Ensure pywebview is installed: `pip install pywebview`
- On Linux, may need: `sudo apt-get install python3-gi python3-gi-cairo gir1.2-gtk-3.0 gir1.2-webkit2-4.0`
- On macOS, may need: `brew install python-tk`

### PyInstaller build fails
- Ensure you've run `npm run build` first
- Check that `dist/` directory exists
- Try: `pyinstaller --clean nirs4all.spec`

## VS Code Setup

### Recommended Extensions
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin (Volar)
- Python

### Tasks
Press `Ctrl+Shift+P` and select "Tasks: Run Task" to:
- Start dev server
- Build production
- Package desktop app

## Contributing

When making changes:
1. Follow TypeScript best practices
2. Use functional components with hooks
3. Keep components small and focused
4. Add proper TypeScript types
5. Use Tailwind CSS for styling
6. Handle errors gracefully with try-catch

## Documentation

- **[PRODUCTION_MODE.md](PRODUCTION_MODE.md)** - Complete guide for running in production
- **[NIRS4ALL_FORMAT.md](NIRS4ALL_FORMAT.md)** - Full nirs4all pipeline format specification
- **[QUICK_START_NIRS4ALL.md](QUICK_START_NIRS4ALL.md)** - Quick start guide for nirs4all format
- **[ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md)** - System architecture and data flow
- **[PROD_SETUP_SUMMARY.md](PROD_SETUP_SUMMARY.md)** - Production setup summary

## Scripts Reference

### Centralized Launcher (Recommended)
```bash
.\nirs4all.bat dev         # Development: Browser + hot reload + backend
.\nirs4all.bat prod_dbg    # Production debug: Desktop app + logs
.\nirs4all.bat prod        # Production: Standalone executable
.\nirs4all.bat build       # Build frontend only
.\nirs4all.bat package     # Build frontend + package executable
.\nirs4all.bat clean       # Kill all running servers and apps
```

### Build Commands
```bash
.\nirs4all.bat build       # Build frontend only
.\nirs4all.bat package     # Build frontend + package executable (replaces npm run desktop:build)
```

### Development Tools
```bash
npm run dev              # Start Vite dev server only (no backend)
npm run lint             # Run ESLint
npm run preview          # Preview production build
```

### Usage Examples
```bash
# Quick development
.\nirs4all.bat dev

# Stop everything if stuck
.\nirs4all.bat clean

# Build frontend only
.\nirs4all.bat build

# Test production build
.\nirs4all.bat build
.\nirs4all.bat prod_dbg

# Create standalone app
.\nirs4all.bat package
.\nirs4all.bat prod
```

### Obsolete Files
The following files are now replaced by `nirs4all.bat` and can be deleted:
- `run_all.bat` → use `.\nirs4all.bat dev`
- `start_app.bat` → use `.\nirs4all.bat prod_dbg`
- `stop_app.bat` → use `.\nirs4all.bat clean`

## License

MIT License - See LICENSE file for details

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
