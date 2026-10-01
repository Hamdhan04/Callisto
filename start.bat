@echo off
echo Starting Callisto GenAI Application...

REM Find Python executable (prefer local .venv if available)
set "PYTHON_EXE=python"
if exist "%~dp0.venv314\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0.venv314\Scripts\python.exe"
) else if exist "%~dp0.venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0.venv\Scripts\python.exe"
)

REM Start Backend
echo Starting Backend on port 8000...
start "Callisto Backend" cmd /k "cd /d "%~dp0backend" && "%PYTHON_EXE%" -m uvicorn main:app --reload --port 8000"

REM Start Frontend
echo Starting Frontend on port 5173...
start "Callisto Frontend" cmd /k "cd /d "%~dp0frontend" && npm.cmd run dev"

echo.
echo ========================================
echo Callisto GenAI Servers Started!
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo ========================================