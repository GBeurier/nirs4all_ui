@echo off
REM nirs4all.bat - Centralized launcher for all app modes
REM Usage:
REM   nirs4all.bat dev        - Development mode (Vite dev server in browser)
REM   nirs4all.bat dev_app    - Development mode (Vite dev server + pywebview shell)
REM   nirs4all.bat prod_dbg   - Production debug (Desktop app + backend console with logs)
REM   nirs4all.bat prod       - Production mode (Packaged executable)
REM   nirs4all.bat clean      - Kill all running servers and app instances

setlocal enabledelayedexpansion

REM Get the command (first argument)
set "MODE=%~1"

REM If no argument, show usage
if "%MODE%"=="" (
  echo.
  echo ========================================
  echo nirs4all - Centralized Launcher
  echo ========================================
  echo.
  echo Usage:
  echo   nirs4all.bat dev        Development mode ^(browser + hot reload^)
  echo   nirs4all.bat dev_app    Development mode ^(pywebview + Vite hot reload^)
  echo   nirs4all.bat prod_dbg   Production debug ^(desktop app + logs^)
  echo   nirs4all.bat prod       Production mode ^(standalone app^)
  echo   nirs4all.bat build      Build frontend only
  echo   nirs4all.bat package    Build frontend + package executable
  echo   nirs4all.bat clean      Kill all running servers and apps
  echo.
  echo ========================================
  exit /b 1
)

REM ============================================
REM CLEAN MODE: Kill all running instances
REM ============================================
if "%MODE%"=="clean" (
  echo.
  echo ========================================
  echo nirs4all - Cleaning Running Instances
  echo ========================================
  echo.

  REM Kill Python backend servers
  taskkill /F /IM python.exe 2>nul
  if !errorlevel! equ 0 (
    echo [OK] Killed Python backend servers
  ) else (
    echo [INFO] No Python backend servers running
  )

  REM Kill pythonw.exe (GUI Python)
  taskkill /F /IM pythonw.exe 2>nul
  if !errorlevel! equ 0 (
    echo [OK] Killed Python GUI processes
  ) else (
    echo [INFO] No Python GUI processes running
  )

  REM Kill Node.js dev servers
  taskkill /F /IM node.exe 2>nul
  if !errorlevel! equ 0 (
    echo [OK] Killed Node.js dev servers
  ) else (
    echo [INFO] No Node.js dev servers running
  )

  REM Kill packaged app
  taskkill /F /IM nirs4all.exe 2>nul
  if !errorlevel! equ 0 (
    echo [OK] Killed nirs4all application
  ) else (
    echo [INFO] No nirs4all application running
  )

  echo.
  echo ========================================
  echo All processes cleaned!
  echo ========================================
  echo.
  exit /b 0
)

REM ============================================
REM BUILD MODE: Build frontend only
REM ============================================
if "%MODE%"=="build" (
  echo.
  echo ========================================
  echo nirs4all - Building Frontend
  echo ========================================
  echo.
  echo Running: npm run build
  echo.
  call npm run build
  if !errorlevel! equ 0 (
    echo.
    echo ========================================
    echo Build completed successfully!
    echo ========================================
    echo.
    echo Output: dist\index.html
    echo.
  ) else (
    echo.
    echo ========================================
    echo Build failed!
    echo ========================================
    echo.
  )
  exit /b !errorlevel!
)

REM ============================================
REM PACKAGE MODE: Build frontend + package executable
REM ============================================
if "%MODE%"=="package" (
  echo.
  echo ========================================
  echo nirs4all - Building and Packaging
  echo ========================================
  echo.

  REM Step 1: Build frontend
  echo [1/2] Building frontend...
  call npm run build
  if !errorlevel! neq 0 (
    echo.
    echo ERROR: Frontend build failed!
    exit /b 1
  )

  REM Step 2: Package with PyInstaller
  echo.
  echo [2/2] Packaging with PyInstaller...
  if exist .venv\Scripts\pyinstaller.exe (
    .venv\Scripts\pyinstaller.exe nirs4all.spec
  ) else (
    pyinstaller nirs4all.spec
  )

  if !errorlevel! equ 0 (
    echo.
    echo ========================================
    echo Packaging completed successfully!
    echo ========================================
    echo.
    echo Executable: dist\nirs4all\nirs4all.exe
    echo.
    echo Run with: nirs4all.bat prod
    echo.
  ) else (
    echo.
    echo ========================================
    echo Packaging failed!
    echo ========================================
    echo.
  )
  exit /b !errorlevel!
)

REM ============================================
REM DEV MODE: Vite dev server + backend + browser
REM ============================================
if "%MODE%"=="dev" (
  echo.
  echo ========================================
  echo nirs4all - Development Mode
  echo ========================================
  echo.
  echo Starting:
  echo   1. Backend server on port 8000
  echo   2. Vite dev server on port 5173
  echo.
  echo Open: http://localhost:5173
  echo.
  echo Press Ctrl+C to stop both servers
  echo ========================================
  echo.

  REM Start backend in a new window
  if exist .venv\Scripts\python.exe (
    start "nirs4all Backend [DEV]" cmd /k "cls && set TF_CPP_MIN_LOG_LEVEL=2 && set TF_ENABLE_ONEDNN_OPTS=0 && echo ======================================== && echo. && echo   nirs4all Backend Server ^(DEV^) && echo. && echo ======================================== && echo. && echo Server: http://127.0.0.1:8000 && echo API Docs: http://127.0.0.1:8000/docs && echo. && echo Press Ctrl+C to stop && echo. && .venv\Scripts\python.exe main.py"
  ) else (
    start "nirs4all Backend [DEV]" cmd /k "cls && set TF_CPP_MIN_LOG_LEVEL=2 && set TF_ENABLE_ONEDNN_OPTS=0 && echo ======================================== && echo. && echo   nirs4all Backend Server ^(DEV^) && echo. && echo ======================================== && echo. && echo Server: http://127.0.0.1:8000 && echo API Docs: http://127.0.0.1:8000/docs && echo. && echo Press Ctrl+C to stop && echo. && python main.py"
  )

  REM Wait for backend to start
  echo Waiting for backend to initialize...
  timeout /t 3 /nobreak >nul

  REM Start Vite dev server in current window
  echo Starting Vite dev server...
  echo.
  call npm run dev

  exit /b 0
)

REM ============================================
REM DEV_APP MODE: Dev mode with desktop shell
REM ============================================
if "%MODE%"=="dev_app" (
  echo.
  echo ========================================
  echo nirs4all - Dev Desktop Mode
  echo ========================================
  echo.

  echo [1/3] Starting backend server...
  if exist .venv\Scripts\python.exe (
    start "nirs4all Backend [DEV]" cmd /k "cls && set TF_CPP_MIN_LOG_LEVEL=2 && set TF_ENABLE_ONEDNN_OPTS=0 && echo ======================================== && echo. && echo   nirs4all Backend Server ^(DEV^) && echo. && echo ======================================== && echo. && echo Server: http://127.0.0.1:8000 && echo API Docs: http://127.0.0.1:8000/docs && echo. && echo Press Ctrl+C to stop && echo. && .venv\Scripts\python.exe main.py"
  ) else (
    start "nirs4all Backend [DEV]" cmd /k "cls && set TF_CPP_MIN_LOG_LEVEL=2 && set TF_ENABLE_ONEDNN_OPTS=0 && echo ======================================== && echo. && echo   nirs4all Backend Server ^(DEV^) && echo. && echo ======================================== && echo. && echo Server: http://127.0.0.1:8000 && echo API Docs: http://127.0.0.1:8000/docs && echo. && echo Press Ctrl+C to stop && echo. && python main.py"
  )
  echo       Waiting for backend to initialize...
  timeout /t 3 /nobreak >nul

  echo [2/3] Starting Vite dev server...
  start "nirs4all Vite [DEV]" cmd /k "cls && echo ======================================== && echo. && echo   nirs4all Vite Dev Server && echo. && echo ======================================== && echo. && echo Server: http://localhost:5173 && echo Hot reload enabled - edit files to see changes! && echo. && echo Press Ctrl+C to stop && echo. && npm run dev"

  echo       Waiting for Vite to initialize...
  timeout /t 5 /nobreak >nul

  echo [3/3] Launching pywebview desktop shell...
  echo.
  echo ========================================
  echo Dev desktop environment ready!
  echo ========================================
  echo   Windows launched:
  echo     1. Backend Server  - http://127.0.0.1:8000
  echo     2. Vite Dev Server - http://localhost:5173 ^(HOT RELOAD^)
  echo     3. Desktop Shell   - pywebview window ^(opening now...^)
  echo.
  echo   To see changes:
  echo     - Edit React/TypeScript files
  echo     - Changes appear automatically in pywebview
  echo     - No rebuild needed!
  echo.
  echo   To stop:
  echo     - Close the pywebview window
  echo     - Press Ctrl+C in Vite and Backend consoles
  echo     - Or run: nirs4all.bat clean
  echo ========================================
  echo.

  REM Launch pywebview in foreground (blocking) with VITE_DEV=true
  if exist .venv\Scripts\python.exe (
    set VITE_DEV=true
    set NIRS4ALL_DEBUG=true
    .venv\Scripts\python.exe launcher.py
  ) else (
    set VITE_DEV=true
    set NIRS4ALL_DEBUG=true
    python launcher.py
  )

  echo.
  echo ========================================
  echo Desktop shell closed.
  echo ========================================
  echo Backend and Vite servers are still running.
  echo To stop them, run: nirs4all.bat clean
  echo ========================================
  echo.

  exit /b 0
)

REM ============================================
REM PROD_DBG MODE: Production with debug console
REM ============================================
if "%MODE%"=="prod_dbg" (
  echo.
  echo ========================================
  echo nirs4all - Production Debug Mode
  echo ========================================
  echo.

  REM Check if dist folder exists
  if not exist "dist\index.html" (
    echo ERROR: Production build not found!
    echo Please run: npm run build
    echo.
    pause
    exit /b 1
  )

  echo [1/2] Starting backend server...
  echo       ^(Console will show pipeline execution logs^)
  echo.

  REM Start backend in a visible console (for nirs4all output)
  if exist .venv\Scripts\python.exe (
    start "nirs4all Backend Server" cmd /c "cls && set TF_CPP_MIN_LOG_LEVEL=2 && set TF_ENABLE_ONEDNN_OPTS=0 && echo ======================================== && echo. && echo   nirs4all Backend Server && echo. && echo ======================================== && echo. && echo Server: http://127.0.0.1:8000 && echo API Docs: http://127.0.0.1:8000/docs && echo. && echo This window shows: && echo   - Pipeline execution output && echo   - nirs4all library messages && echo   - Errors and warnings && echo. && echo Press Ctrl+C to stop the server && echo. && echo ======================================== && echo. && .venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --log-level warning && pause"
  ) else (
    start "nirs4all Backend Server" cmd /c "cls && set TF_CPP_MIN_LOG_LEVEL=2 && set TF_ENABLE_ONEDNN_OPTS=0 && echo ======================================== && echo. && echo   nirs4all Backend Server && echo. && echo ======================================== && echo. && echo Server: http://127.0.0.1:8000 && echo API Docs: http://127.0.0.1:8000/docs && echo. && echo This window shows: && echo   - Pipeline execution output && echo   - nirs4all library messages && echo   - Errors and warnings && echo. && echo Press Ctrl+C to stop the server && echo. && echo ======================================== && echo. && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --log-level warning && pause"
  )

  REM Wait for backend to start
  echo       Waiting for backend to initialize...
  timeout /t 3 /nobreak >nul

  echo [2/2] Launching application window...
  echo.

  REM Launch app window with debug console (set environment variable)
  if exist .venv\Scripts\python.exe (
    start /B "" cmd /c "set NIRS4ALL_DEBUG=true && .venv\Scripts\python.exe launcher.py"
  ) else (
    start /B "" cmd /c "set NIRS4ALL_DEBUG=true && python launcher.py"
  )

  echo ========================================
  echo Application Started!
  echo ========================================
  echo.
  echo Windows opened:
  echo   1. Backend Console - Shows logs and output
  echo   2. Application Window - Main UI ^(with debug console^)
  echo.
  echo To stop:
  echo   - Close the application window
  echo   - Press Ctrl+C in backend console
  echo.
  echo ========================================

  REM Keep this window open for a moment
  timeout /t 5 /nobreak >nul
  exit /b 0
)

REM ============================================
REM PROD MODE: Standalone executable
REM ============================================
if "%MODE%"=="prod" (
  echo.
  echo ========================================
  echo nirs4all - Production Mode
  echo ========================================
  echo.

  REM Check if executable exists
  if exist "dist\nirs4all\nirs4all.exe" (
    echo Starting standalone application...
    echo.
    start "" "dist\nirs4all\nirs4all.exe"
    exit /b 0
  ) else (
    echo ERROR: Standalone executable not found!
    echo.
    echo Please build the application first:
    echo   npm run build
    echo   npm run desktop:build
    echo.
    echo The executable will be in: dist\nirs4all\nirs4all.exe
    echo.
    pause
    exit /b 1
  )
)

REM ============================================
REM Unknown mode
REM ============================================
echo.
echo ERROR: Unknown mode "%MODE%"
echo.
echo Valid modes:
echo   dev        - Development mode ^(browser + hot reload^)
echo   dev_app    - Development mode ^(desktop shell + hot reload^)
echo   prod_dbg   - Production debug ^(desktop app + logs^)
echo   prod       - Production mode ^(standalone app^)
echo   build      - Build frontend only
echo   package    - Build frontend + package executable
echo   clean      - Kill all running servers and apps
echo.
exit /b 1

endlocal
