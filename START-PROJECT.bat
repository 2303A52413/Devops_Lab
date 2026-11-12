
@echo off
title Digital Notice Board
cd /d "%~dp0"

echo Starting Digital Notice Board...
docker compose up -d

echo.
echo Project started!
echo Opening Digital Notice Board...

timeout /t 5 /nobreak >nul
start http://localhost:5173

pause
