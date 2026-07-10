@echo off
cd /d "%~dp0"

set "HTTPS_PROXY=http://127.0.0.1:7897"
set "HTTP_PROXY=http://127.0.0.1:7897"
set "PORT=4185"

echo Starting Xinling Huajuan Mainland Prep Edition...
echo.
echo If the browser does not open automatically, visit:
echo http://127.0.0.1:4185
echo.
echo ACCESS_CODE and OPENAI_API_KEY must be set as environment variables.
echo.
echo Keep this window open while using the website.
echo To stop the website, press Ctrl+C and then close this window.
echo.

powershell -NoProfile -Command "$portOpen = Test-NetConnection 127.0.0.1 -Port 4185 -InformationLevel Quiet; if ($portOpen) { Start-Process 'http://127.0.0.1:4185'; exit 10 }"
if %errorlevel%==10 (
  echo Mainland Prep Edition is already running. Browser has been opened.
  pause
  exit /b 0
)

start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:4185'"
node --use-env-proxy local-server.js

echo.
echo Website stopped.
pause
