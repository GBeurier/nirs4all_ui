# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

# nirs4all UI

Desktop application for the nirs4all NIR spectroscopy analysis platform. Built with React, TypeScript, and pywebview for a native desktop experience.

## Overview

This is a standalone UI application for nirs4all that connects to the FastAPI backend. It provides:

- **Workspace Management**: Link/unlink datasets, organize into groups
- **Dataset Configuration**: Configure preprocessing and feature selection
- **File Browser**: Native and fallback file selection dialogs
- **Group Management**: Create, rename, delete, and manage dataset groups
- **Results Visualization**: View predictions and pipeline results

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

## License

[Add your license here]

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
