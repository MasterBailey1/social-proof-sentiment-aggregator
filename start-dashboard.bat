@echo off
title Social Proof Sentiment Aggregator
cd /d "%~dp0"

:: Set Node.js path
set "NODE_PATH=D:\"
set "PATH=%NODE_PATH%;%PATH%"

echo Starting Social Proof Sentiment Aggregator...
echo.

:: Check if node_modules exists, if not run npm install
if not exist "node_modules" (
    echo Installing dependencies...
    call "%NODE_PATH%npm.cmd" install
    echo.
)

:: Start the server in background and open browser after short delay
start "" /b cmd /c ""%NODE_PATH%node.exe" server.js"

:: Wait for server to start then open browser
timeout /t 3 /nobreak >nul
start http://localhost:3500

echo.
echo Dashboard is running at http://localhost:3500
echo Press any key or close this window to stop the server.
echo.
pause >nul
taskkill /f /im node.exe >nul 2>&1
