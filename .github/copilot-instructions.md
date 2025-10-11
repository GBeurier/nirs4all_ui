# GitHub Copilot Instructions for nirs4all UI Workspace

## Workspace Setup Checklist

### 1. Project Requirements (Verified)
- [x] Desktop application for local use only (no online deployment)
- [x] Frontend: Vite + React + TypeScript
- [x] Desktop wrapper: pywebview
- [x] Packaging: PyInstaller
- [x] Backend: Connect to FastAPI server from core project (nirs4all)
- [x] Migrate UI functionality from workspace.html

### 2. Project Scaffolding
- [x] Initialize Vite + React + TypeScript project
- [x] Set up proper folder structure
- [x] Configure Vite for desktop app needs
- [x] Create Python backend wrapper for pywebview

### 3. Core Components
- [ ] Set up routing (if needed)
- [x] Create main Workspace view component
- [x] Create Dataset management components
- [x] Create Group management components
- [x] Create File browser components
- [ ] Create Results view components
- [x] Set up API client for FastAPI backend

### 4. Desktop Integration
- [x] Create pywebview launcher script
- [x] Configure API communication between pywebview and React app
- [x] Set up window management (size, title, etc.)

### 5. Build & Packaging
- [x] Create PyInstaller spec file
- [x] Configure asset bundling
- [x] Set up build scripts (npm + pyinstaller)
- [ ] Test packaged application

### 6. Development Environment
- [ ] Install recommended VS Code extensions
- [ ] Configure ESLint + Prettier
- [ ] Set up development server scripts
- [ ] Create VS Code tasks for build/run

### 7. Documentation
- [x] Create comprehensive README.md
- [x] Document API integration points
- [x] Document build/packaging process
- [x] Add development guide

## Execution Guidelines

### Progress Tracking
- Use this checklist to track workspace setup progress
- Mark items complete as they are finished
- Add sub-items as needed for complex tasks

### Communication Rules
- Explain what you're doing before each major step
- Use tool calls instead of providing code blocks
- Don't repeat yourself after tool calls

### Development Rules
- Use TypeScript for all React components
- Follow React best practices (hooks, functional components)
- Keep components modular and reusable
- Use proper error handling for API calls

### Folder Creation Rules
- Create all necessary directories before files
- Use absolute paths for all operations
- Follow standard project structure conventions

## Tech Stack Reference

### Frontend
- **Vite**: Build tool and dev server
- **React 18+**: UI framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling (matching current UI)
- **Feather Icons**: Icon library (matching current UI)

### Desktop
- **pywebview**: Python webview wrapper
- **PyInstaller**: Application packaging

### Backend Integration
- **FastAPI**: Core API server (runs separately)
- **Fetch API**: HTTP client in React app

## Migration Context

### UI Features to Migrate
1. **Workspace View** (from workspace.html):
   - Dataset table with selection
   - Link/unlink dataset buttons
   - Refresh workspace button
   - Dataset configuration modal

2. **Group Management**:
   - Groups modal with list
   - Create/rename/delete groups
   - Add/remove datasets to/from groups
   - Inline group operations

3. **File Browser**:
   - Directory tree navigation
   - File selection
   - Path display
   - Native + fallback file dialogs

4. **Results View**:
   - Predictions display
   - Pipeline configuration
   - Results management

### API Endpoints Used
- `/api/workspace/*` - Workspace operations
- `/api/files/*` - File system operations
- `/api/predictions/*` - Predictions and results

### Current Implementation Notes
- Vanilla JS with heavy DOM manipulation
- Complex state management with global variables
- Mix of inline event handlers and listeners
- File dialogs with native + fallback strategy
- In-place DOM updates to avoid full refreshes
