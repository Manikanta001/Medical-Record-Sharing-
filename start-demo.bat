@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul || (echo Node.js is required. Install Node.js 20 or newer, then try again.& pause & exit /b 1)
where npm >nul 2>nul || (echo npm was not found. Reinstall Node.js with npm enabled.& pause & exit /b 1)

if not exist "backend\node_modules" (
  echo Installing backend dependencies...
  call npm install --prefix backend || (pause & exit /b 1)
)
if not exist "frontend\node_modules" (
  echo Installing frontend dependencies...
  call npm install --prefix frontend || (pause & exit /b 1)
)

start "MedLedger API" cmd /k "cd /d ""%~dp0backend"" ^&^& npm start"
start "MedLedger Web App" cmd /k "cd /d ""%~dp0frontend"" ^&^& npm run dev -- --host 127.0.0.1"
timeout /t 3 /nobreak >nul
start "" http://localhost:3000
echo MedLedger is starting. Keep both terminal windows open while presenting.
endlocal
