@echo off
REM start_app.bat - Clean production launcher for nirs4all
REM This script starts only what's needed: backend console + app window

setlocal

echo ========================================
echo nirs4all - Starting Application
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
echo       (Console will show pipeline execution logs)
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

REM Launch app window (no console)
if exist .venv\Scripts\pythonw.exe (
  start /B "" .venv\Scripts\pythonw.exe launcher.py
) else (
  start /B "" pythonw.exe launcher.py
)

echo ========================================
echo Application Started!
echo ========================================
echo.
echo Windows opened:
echo   1. Backend Console - Shows logs and output
echo   2. Application Window - Main UI
echo.
echo To stop:
echo   - Close the application window
echo   - Press Ctrl+C in backend console
echo.
echo ========================================

REM Hide this launcher console after 5 seconds
timeout /t 5 /nobreak >nul
exit

endlocal
