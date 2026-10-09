@echo off
cd /d "%~dp0backend"
echo Starting DiabetesSense Backend on http://localhost:8000 ...
python -m uvicorn api:app --reload --port 8000
pause
