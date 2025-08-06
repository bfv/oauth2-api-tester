@echo off
REM OAuth Callback Server Starter
REM This script starts the OAuth callback server on port 18820 (or specified port)

cd /d "%~dp0"

if "%1"=="" (
    set PORT=18820
) else (
    set PORT=%1
)

echo Starting OAuth Callback Server on port %PORT%...
echo.
echo Press Ctrl+C to stop the server
echo.

node oauth-callback-server.js %PORT%

pause
