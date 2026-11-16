# GeoVision AI Launch Script for Windows PowerShell
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "                GeoVision AI - Environmental Monitoring" -ForegroundColor Green
Write-Host "   Change Detection of Deforestation and Water Resources" -ForegroundColor Cyan
Write-Host "              Using Multi-Temporal Satellite Images" -ForegroundColor Cyan
Write-Host "                     B.Tech CSE Mini Project" -ForegroundColor Yellow
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host ""

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$pythonPath = Join-Path $rootDir "geovision-ai\backend\venv\Scripts\python.exe"
if (-not (Test-Path $pythonPath)) {
    Write-Host "[ERROR] Python virtual environment not found at $pythonPath" -ForegroundColor Red
    Write-Host "Please see README.md for installation instructions." -ForegroundColor Red
    pause
    exit 1
}

Write-Host "[1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ..." -ForegroundColor Cyan
$backendDir = Join-Path $rootDir "geovision-ai\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendDir'; & '$pythonPath' -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

Start-Sleep -Seconds 3

Write-Host "[2/2] Starting React Vite Frontend on http://localhost:5173 ..." -ForegroundColor Cyan
$frontendDir = Join-Path $rootDir "geovision-ai\frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendDir'; npm run dev"

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host " Both servers launched in separate terminal windows!" -ForegroundColor Green
Write-Host "  Frontend Dashboard : http://localhost:5173" -ForegroundColor Yellow
Write-Host "  Backend API Docs   : http://127.0.0.1:8000/docs" -ForegroundColor Yellow
Write-Host "=====================================================================" -ForegroundColor Green
