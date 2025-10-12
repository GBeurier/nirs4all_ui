@echo off
REM stop_app.bat - Clean shutdown for nirs4all application

echo ========================================
echo nirs4all - Stopping Application
echo ========================================
echo.

echo Stopping all Python processes...
taskkill /F /IM python.exe 2>nul
taskkill /F /IM pythonw.exe 2>nul

echo Stopping uvicorn processes...
taskkill /F /FI "WINDOWTITLE eq nirs4all Backend*" 2>nul

echo.
echo All processes stopped.
echo.

pause
