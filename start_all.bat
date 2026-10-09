@echo off
echo ========================================================
echo   Starting DiabetesSense (FastAPI Backend + Vite UI)
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] Launching FastAPI Backend (http://localhost:8000)...
start "DiabetesSense Backend (FastAPI)" cmd /k "cd backend && python -m uvicorn api:app --reload --port 8000"

echo [2/2] Launching Vite Frontend (http://localhost:5173)...
start "DiabetesSense Frontend (Vite)" cmd /k "cd frontend && npm run dev"

echo.
echo Both services have been started in separate windows!
echo - API Documentation: http://localhost:8000/docs
echo - Web Dashboard:     http://localhost:5173
echo.
pause
