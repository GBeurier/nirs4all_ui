@echo off
REM run_all.bat - start frontend, backend and desktop launcher in dev or prod mode
REM Usage: run_all.bat [dev|prod]

setlocal

if "%1"=="" goto usage
if /I "%1"=="dev" goto dev
if /I "%1"=="prod" goto prod

:usage
echo Usage: run_all.bat [dev^|prod]
echo.
echo dev  - start frontend (Vite), backend (python main.py) and launcher (pywebview)
echo prod - build frontend, start backend (uvicorn) and launcher (pywebview)
exit /b 1

:dev
echo Starting in DEV mode...
echo.

REM Start backend
echo [1/3] Starting backend...
if exist .venv\Scripts\python.exe (
  start "nirs4all-backend" cmd /k "set TF_CPP_MIN_LOG_LEVEL=2 && set TF_ENABLE_ONEDNN_OPTS=0 && .venv\Scripts\python.exe main.py"
) else (
  start "nirs4all-backend" cmd /k "set TF_CPP_MIN_LOG_LEVEL=2 && set TF_ENABLE_ONEDNN_OPTS=0 && python main.py"
)
echo Backend starting on http://127.0.0.1:8000

REM Give backend a moment to bind to port
echo Waiting 3 seconds for backend to initialize...
timeout /t 3 /nobreak >nul

REM Start frontend
echo [2/3] Starting frontend...
start "nirs4all-frontend" cmd /k "set VITE_DEV=true && npm run dev"
echo Frontend starting on http://localhost:5173

REM Give Vite a moment to start
echo Waiting 5 seconds for Vite to initialize...
timeout /t 5 /nobreak >nul

REM Launch browser or desktop app
echo [3/3] Opening UI...
if /I "%2"=="desktop" (
  echo Starting desktop launcher...
  if exist .venv\Scripts\python.exe (
    start "nirs4all-launcher" cmd /k "set VITE_DEV=true && .venv\Scripts\python.exe launcher.py"
  ) else (
    start "nirs4all-launcher" cmd /k "set VITE_DEV=true && python launcher.py"
  )
) else (
  echo Opening browser...
  start "" "http://localhost:5173/"
)

echo.
echo ========================================
echo Dev environment started!
echo ========================================
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:5173
echo API Docs: http://127.0.0.1:8000/docs
echo.
echo Check the terminal windows for logs.
echo Press Ctrl+C in each window to stop.
echo ========================================
goto :end

:prod
echo Starting in PROD mode...

REM Build frontend
echo Building frontend (this may take a while)...
call npm run build
if errorlevel 1 (
  echo ERROR: Build failed!
  pause
  exit /b 1
)

echo Build successful!
echo.

REM Start backend using uvicorn (in visible console for nirs4all output)
echo Starting backend server (keep this window open for logs)...
echo.
if exist .venv\Scripts\python.exe (
  start "nirs4all Backend - Keep Open for Logs" cmd /k "set TF_CPP_MIN_LOG_LEVEL=2 && set TF_ENABLE_ONEDNN_OPTS=0 && echo ======================================== && echo nirs4all Backend Server && echo ======================================== && echo. && echo Listening on http://127.0.0.1:8000 && echo API Docs: http://127.0.0.1:8000/docs && echo. && echo This window shows backend logs and nirs4all pipeline execution output. && echo Press Ctrl+C to stop the server. && echo. && echo ======================================== && echo. && .venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --log-level warning"
) else (
  start "nirs4all Backend - Keep Open for Logs" cmd /k "set TF_CPP_MIN_LOG_LEVEL=2 && set TF_ENABLE_ONEDNN_OPTS=0 && echo ======================================== && echo nirs4all Backend Server && echo ======================================== && echo. && echo Listening on http://127.0.0.1:8000 && echo API Docs: http://127.0.0.1:8000/docs && echo. && echo This window shows backend logs and nirs4all pipeline execution output. && echo Press Ctrl+C to stop the server. && echo. && echo ======================================== && echo. && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --log-level warning"
)

REM Give backend time to start
echo Waiting for backend to initialize...
timeout /t 3 /nobreak >nul

REM Launch the desktop app (will open in windowed mode)
echo Launching application window...
if exist .venv\Scripts\python.exe (
  start /B "" .venv\Scripts\pythonw.exe launcher.py
) else (
  start /B "" pythonw.exe launcher.py
)

echo.
echo ========================================
echo Production mode started!
echo ========================================
echo Backend: Running in separate console
echo App:     Opening in desktop window
echo.
echo Keep the backend console open to see:
echo - API logs
echo - Pipeline execution output
echo - nirs4all library messages
echo ========================================
goto :end

:end
endlocal
exit /b 0
