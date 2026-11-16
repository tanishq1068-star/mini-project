@echo off
TITLE GeoVision AI - Environmental Change Detection
COLOR 0A

echo =====================================================================
echo                GeoVision AI - Environmental Monitoring
echo   Change Detection of Deforestation and Water Resources
echo              Using Multi-Temporal Satellite Images
echo                     B.Tech CSE Mini Project
echo =====================================================================
echo.

:: Detect root directory
set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

echo [1/3] Checking environment...
if not exist "geovision-ai\backend\venv\Scripts\python.exe" (
    echo [ERROR] Python virtual environment not found in geovision-ai\backend\venv.
    echo Please run installation steps in README.md first.
    pause
    exit /b 1
)

echo [2/3] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "GeoVision AI - Backend API" cmd /k "cd /d "%ROOT_DIR%geovision-ai\backend" && "venv\Scripts\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 3 /nobreak > nul

echo [3/3] Starting Vite React Frontend on http://localhost:5173 ...
start "GeoVision AI - Frontend" cmd /k "cd /d "%ROOT_DIR%geovision-ai\frontend" && npm run dev"

echo.
echo =====================================================================
echo  Both services launched successfully!
echo  - Frontend UI:  http://localhost:5173
echo  - Backend API:  http://127.0.0.1:8000
echo  - API Docs:     http://127.0.0.1:8000/docs
echo =====================================================================
echo.
pause
