# Running nirs4all UI in Production Mode

## Quick Start

### Option 1: Using npm (Recommended)
```bash
npm run prod
```

This will:
1. ✅ Build the frontend automatically (if needed)
2. ✅ Start the **Backend Console** (keep this open - shows pipeline execution logs)
3. ✅ Open the **Application Window** (main UI)

### Option 2: Using start_app.bat
```bash
start_app.bat
```

Same as Option 1, but uses batch script instead of npm.

### Option 3: Using run_all.bat
```bash
.\run_all.bat prod
```

Alternative batch script that also builds and starts the application.

## What You'll See

### Window 1: Backend Console
```
========================================

  nirs4all Backend Server

========================================

Server: http://127.0.0.1:8000
API Docs: http://127.0.0.1:8000/docs

This window shows:
  - API request logs
  - Pipeline execution output
  - nirs4all library messages

Press Ctrl+C to stop the server

========================================

INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

**Keep this window open** while using the application. You'll see:
- Dataset loading messages
- Pipeline execution progress
- Model training output
- Any errors or warnings

### Window 2: Application Window
- Clean desktop application window
- No console attached
- Full UI functionality
- Runs from built files in `dist/` folder

## Production vs Development

| Feature | Development | Production |
|---------|-------------|------------|
| **Frontend** | Vite dev server (hot reload) | Built static files |
| **Backend** | Python main.py (auto-reload) | Uvicorn (optimized) |
| **Console** | Multiple terminals | Single backend console |
| **App Window** | Browser or pywebview | pywebview only |
| **Speed** | Slower (dev tools) | Faster (optimized) |
| **Debugging** | Full debugging | Console logs only |

## Building for Production

### 1. Clean Build
```bash
# Remove old build files
rm -rf dist/

# Build fresh
npm run build
```

### 2. Verify Build
After building, you should see:
```
dist/
  ├── index.html
  ├── assets/
  │   ├── index-[hash].css
  │   └── index-[hash].js
  └── ...
```

### 3. Test Build
```bash
# Test that it works
start_app.bat
```

## Running the Application

### Normal Startup (Recommended)
```bash
npm run prod
```

This builds and starts everything in one command.

### Alternative: Using Batch Script
```bash
start_app.bat
```

### With Custom Backend Port
Edit `main.py` or set environment variable:
```bash
set UVICORN_PORT=8080
start_app.bat
```

## Stopping the Application

### Option 1: Using Ctrl+C (Recommended)
Press `Ctrl+C` in the backend console terminal. This will:
1. Shutdown the backend gracefully
2. Close the application window automatically

### Option 2: Close Windows Manually
1. Close the application window
2. Press `Ctrl+C` in the backend console (if still running)

### Option 3: Kill Processes (Emergency)
```bash
# Find Python processes
tasklist | findstr python

# Kill if needed
taskkill /F /IM python.exe
taskkill /F /IM pythonw.exe
```

## Logs and Debugging

### Backend Logs
All backend logs appear in the backend console:
- Request logs (API calls)
- Pipeline execution output
- Errors and warnings

### Application Logs
To see application logs, run with debugging:
```bash
# Edit launcher.py, set:
# webview.start(debug=True)
```

Or use Chrome DevTools:
- Right-click in app → Inspect Element
- View console for JavaScript errors

## Troubleshooting

### Build Fails
```bash
# Check for TypeScript errors
npm run build

# Fix errors, then rebuild
npm run build
```

### Port Already in Use
```
ERROR: [Errno 10048] error while attempting to bind on address ('127.0.0.1', 8000)
```

**Solution**: Kill the process using port 8000
```bash
# Find process
netstat -ano | findstr :8000

# Kill process (replace PID)
taskkill /F /PID <PID>
```

### Application Window Doesn't Open
**Check**:
1. Is backend console running?
2. Does `dist/index.html` exist?
3. Try rebuilding: `npm run build`

### Backend Console Shows Errors
**Common errors**:

1. **Module not found**
   ```
   ModuleNotFoundError: No module named 'fastapi'
   ```
   Solution: Install dependencies
   ```bash
   .venv\Scripts\pip install -r requirements.txt
   ```

2. **CUDA/TensorFlow warnings**
   These are usually safe to ignore:
   ```
   TF_CPP_MIN_LOG_LEVEL=2  # Already set in script
   ```

3. **Workspace not found**
   The app will create a default workspace on first run.

## Production Deployment

### For End Users
Package the application using PyInstaller:

```bash
# Install PyInstaller
pip install pyinstaller

# Build executable (see nirs4all.spec)
pyinstaller nirs4all.spec

# Distributable will be in dist/
```

### Directory Structure for Deployment
```
nirs4all_ui/
  ├── nirs4all.exe          # Main executable
  ├── dist/                 # Web UI files
  │   ├── index.html
  │   └── assets/
  ├── api/                  # Python backend
  └── requirements.txt
```

## Performance Tips

### 1. Optimize Build
```bash
# Build with optimizations
npm run build

# Check bundle size
npm run build -- --minify esbuild
```

### 2. Reduce Backend Logging
In production, reduce log verbosity:
```python
# main.py
uvicorn.run(..., log_level="warning")
```

### 3. Use Production Backend
The script already uses optimized uvicorn:
```bash
# Optimized (no reload, no debug)
uvicorn main:app --host 127.0.0.1 --port 8000
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TF_CPP_MIN_LOG_LEVEL` | `2` | Suppress TensorFlow info/warnings |
| `TF_ENABLE_ONEDNN_OPTS` | `0` | Disable oneDNN optimizations |
| `VITE_DEV` | `false` | Use Vite dev server (dev mode only) |
| `DEBUG` | `false` | Enable pywebview debugging |

## Updating the Application

### 1. Update Code
```bash
git pull origin main
```

### 2. Update Dependencies
```bash
# Python
.venv\Scripts\pip install -r requirements.txt

# Node
npm install
```

### 3. Rebuild
```bash
npm run build
```

### 4. Test
```bash
start_app.bat
```

## Development vs Production Workflow

### Development
```bash
# Start dev environment (3 consoles + browser/window)
.\run_all.bat dev

# Hot reload on code changes
# Console logging for debugging
```

### Production
```bash
# Build once
npm run build

# Start clean environment (1 console + window)
start_app.bat

# No hot reload (must rebuild for changes)
# Optimized and fast
```

## FAQs

### Q: Do I need to rebuild after every change?
**A**: Yes, in production mode. Use dev mode for development.

### Q: Can I run without the backend console?
**A**: Not recommended. You won't see pipeline execution output or errors.

### Q: How do I package this for distribution?
**A**: Use PyInstaller (see `nirs4all.spec`) to create a standalone executable.

### Q: Can I use a different port?
**A**: Yes, modify the port in `main.py` and `launcher.py`.

### Q: Why use pythonw.exe instead of python.exe?
**A**: `pythonw.exe` runs without creating a console window, keeping the UI clean.

## Support

For issues:
1. Check backend console for errors
2. Check browser DevTools console
3. Verify build succeeded: `npm run build`
4. Try dev mode: `.\run_all.bat dev`

---

**Ready to start?**
```bash
npm run prod
```

Enjoy your nirs4all analysis! 🚀
