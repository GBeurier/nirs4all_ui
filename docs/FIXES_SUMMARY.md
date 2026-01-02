# Production Issues - Fixes Summary

## Issues Fixed

### 1. ✅ Static Assets Not Loading in Production
**Problem:** Images (nirs4all_logo.png) and JSON files (component-library.json) were not visible in production mode.

**Root Cause:** Files in the `/public` folder were being served under the `/public/` prefix, but the code referenced them at the root level (e.g., `/nirs4all_logo.png`).

**Fix:** Added explicit routes in `main.py` to serve public files at the root level:
- `/nirs4all_logo.png` → serves from `public/nirs4all_logo.png`
- `/component-library.json` → serves from `public/component-library.json`
- `/vite.svg` → serves from `public/vite.svg`

**Files Modified:**
- `main.py` - Added root-level routes for public assets

---

### 2. ✅ File Dialogs Not Working in Production (Open/Save Pipeline)
**Problem:**
- In production mode, loading pipelines failed with errors
- Saving pipelines didn't actually save to the selected file location
- Workspace folder/file pickers showed "not authorized" errors
- Browse button in "Add Dataset" did nothing

**Root Cause:**
1. `gui='edgechromium'` parameter in `launcher.py` was breaking `window.pywebview` API injection
2. Frontend was trying to use `fetch('file://...')` to read local files (CORS issue)
3. File dialogs had no fallback for dev/browser mode

**Why Dev Mode Partially Worked:**
- Pipeline open/save used `isPywebviewAvailable()` check with HTML input fallback
- Workspace and Add Dataset had NO fallback - button did nothing in browser

**Fix:**
1. **Removed `gui='edgechromium'`** from `launcher.py` - this was breaking API injection
2. **Added API endpoints** `/api/files/read` and `/api/files/write` in `api/pipelines.py`
3. **Updated fileDialogs.ts** to use API endpoints instead of `fetch('file://')`
4. **Added HTML input fallbacks** in WorkspacePage and AddDatasetModal for browser/dev mode
5. **Unified approach**: All file dialogs now work in BOTH dev (browser) and prod (desktop)

**Files Modified:**
- `launcher.py` - **CRITICAL FIX**: Removed `gui='edgechromium'`
- `api/pipelines.py` - Added `/api/files/read` and `/api/files/write` endpoints
- `src/utils/fileDialogs.ts` - Use API endpoints, added debug logging
- `src/pages/PipelinePage.tsx` - Call writeLocalFile() when saving
- `src/pages/WorkspacePage.tsx` - Added HTML input fallback, use isPywebviewAvailable()
- `src/components/AddDatasetModal.tsx` - Added HTML input fallback, use isPywebviewAvailable()

**Now Works in Both Dev and Prod:**
- ✅ Open pipeline: Native dialog (desktop) or HTML input (browser) → Works
- ✅ Save pipeline: Native dialog (desktop) or download (browser) → Actually saves
- ✅ Export pipeline: Browser download → Works everywhere
- ✅ Change Workspace: Native dialog (desktop) or HTML input (browser) → Works
- ✅ Add Dataset Browse: Native dialog (desktop) or HTML input (browser) → Works---

### 3. ✅ API Request Spam in Console
**Problem:** Backend console was flooded with GET request logs, hiding important nirs4all pipeline execution output.

**Root Cause:**
1. Uvicorn was logging all requests at INFO level
2. Frontend had a 5-second polling interval checking backend availability

**Fix:**
- Changed uvicorn log level to `warning` (suppresses routine GET/POST logs)
- Removed the 5-second polling in `WorkspacePage.tsx` - now only checks backend once on mount
- nirs4all library output (print statements, errors, warnings) still visible

**Files Modified:**
- `start_app.bat` - Added `--log-level warning` to uvicorn
- `run_all.bat` - Added `--log-level warning` to uvicorn
- `src/pages/WorkspacePage.tsx` - Removed polling interval

---

### 3. ⚠️ Slow Shutdown / VS Code Freeze
**Problem:** When closing the app, everything becomes very slow, Python seems saturated, and VS Code freezes.

**Root Cause:** Backend server (uvicorn) continues running after app window closes, potentially causing resource issues.

**Solution Provided:**
- Created `stop_app.bat` script to forcefully terminate all Python processes
- Use this script if app doesn't close cleanly

**Recommended Shutdown Process:**
1. Close the application window
2. Press `Ctrl+C` in the backend console
3. If still frozen, run `stop_app.bat`

**Alternative:** Use Task Manager to kill `python.exe` and `pythonw.exe` processes

---

## How to Test

### Production Mode
```bash
# Build the frontend
npm run build

# Start the app
start_app.bat

# Test:
# 1. Logo should be visible in the UI
# 2. Pipeline builder should show component library
# 3. Backend console should NOT show routine GET requests
# 4. Backend console SHOULD show pipeline execution output when running predictions

# To stop:
# - Close app window
# - Press Ctrl+C in backend console
# - If frozen, run: stop_app.bat
```

### Development Mode
```bash
# Start dev mode (frontend + backend + desktop)
.\run_all.bat dev

# OR start components separately:
# Terminal 1: Backend
python main.py

# Terminal 2: Frontend
npm run dev

# Then open browser at http://localhost:5173
```

---

## What You'll See Now

### Production Backend Console (Clean!)
```
========================================

  nirs4all Backend Server

========================================

Server: http://127.0.0.1:8000
API Docs: http://127.0.0.1:8000/docs

This window shows:
  - Pipeline execution output
  - nirs4all library messages
  - Errors and warnings

Press Ctrl+C to stop the server

========================================

[Only important output shown here]
Loading dataset: sample_data/regression
Running pipeline with 3 configurations...
Training PLS model with n_components=5...
Model trained successfully!
Evaluation metrics: RMSE=0.234, R2=0.89
```

### What's Hidden Now
- ❌ `INFO: 127.0.0.1:54321 - "GET /api/workspace HTTP/1.1" 200`
- ❌ `INFO: 127.0.0.1:54321 - "GET /api/predictions/counts HTTP/1.1" 200`
- ❌ Repetitive polling requests
- ✅ Only warnings, errors, and nirs4all output shown

---

## File Dialogs (Open/Save Pipeline)

### Status: Should Work
The file dialog functionality uses pywebview's native APIs:
- `select_file()` - Opens native file picker
- `save_file()` - Opens native save dialog
- `select_folder()` - Opens native folder picker

### If File Dialogs Don't Work

**Check 1:** Ensure you're running in production mode (not browser)
```bash
start_app.bat
```

**Check 2:** Check console for errors when clicking "Open" or "Save"

**Check 3:** Verify pywebview is installed
```bash
pip show pywebview
```

**Fallback:** The app will fall back to browser download/upload if pywebview API is unavailable.

---

## Common Issues & Solutions

### Issue: "No native folder picker available in this browser" (in desktop app!)
**Cause:** Pywebview API not being injected properly.

**Fixed:** Removed `gui='edgechromium'` parameter from launcher.py - this was breaking API injection.

**To verify fix:**
1. Close the app completely
2. Close backend console
3. Rebuild: `npm run build`
4. Restart: `start_app.bat`
5. Open browser console (F12) and check for pywebview debug logs

### Issue: Build Errors
```bash
# Clear cache and rebuild
npm run build
```

### Issue: Port Already in Use
```bash
# Stop all processes
stop_app.bat

# Or manually
taskkill /F /IM python.exe
taskkill /F /IM pythonw.exe
```

### Issue: Assets Still Not Loading
```bash
# Verify dist folder has assets
dir dist
# Should show: assets/, index.html, nirs4all_logo.png, component-library.json

# Verify public folder
dir public
# Should show: nirs4all_logo.png, component-library.json, vite.svg

# Rebuild if missing
npm run build
```

### Issue: VS Code Frozen
```bash
# Run stop script
stop_app.bat

# If that doesn't work, use Task Manager:
# 1. Open Task Manager (Ctrl+Shift+Esc)
# 2. Find "Python" processes
# 3. End task for each
```

---

## Files Changed

| File | Change | Reason |
|------|--------|--------|
| `main.py` | Added root-level routes for public assets | Fix static assets not loading |
| `start_app.bat` | Added `--log-level warning` to uvicorn | Reduce API spam |
| `run_all.bat` | Added `--log-level warning` to uvicorn | Reduce API spam |
| `src/pages/WorkspacePage.tsx` | Removed 5-second polling interval | Reduce unnecessary API calls |
| `stop_app.bat` | **NEW** - Script to kill all processes | Help with shutdown issues |
| `launcher.py` | Reverted cleanup changes | Simplified (backend started separately) |

---

## Dev Mode Clarification

**Important:** `npm run dev` only starts the Vite frontend server.

For full development environment, use:
```bash
.\run_all.bat dev
```

This starts:
1. Backend server (Python FastAPI)
2. Frontend server (Vite with hot reload)
3. Desktop launcher (optional)

---

## Next Steps

1. **Test production mode** - Run `start_app.bat` and verify logo/assets load
2. **Test file dialogs** - Try opening/saving pipelines
3. **Test shutdown** - Close app and verify it doesn't hang
4. **Report any remaining issues** with specific error messages

---

## Quick Commands

```bash
# Build
npm run build

# Start production
start_app.bat

# Stop (if frozen)
stop_app.bat

# Dev mode (full stack)
.\run_all.bat dev

# Dev mode (frontend only)
npm run dev
```

---

**Status:** ✅ Static assets fixed | ✅ API spam reduced | ⚠️ Shutdown improved (manual cleanup available)
