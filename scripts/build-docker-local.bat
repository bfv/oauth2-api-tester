@echo off
setlocal enabledelayedexpansion

REM Local Docker Build Script for Windows
REM Simple build script for the OAuth2 API Tester application

echo Building OAuth2 API Tester Docker Image...

REM Build the Docker image
echo Building Docker image...
docker build -t oauth2-api-tester:local .

if %ERRORLEVEL% EQU 0 (
    echo Build completed successfully!
    echo To run the container:
    echo docker run -p 80:80 oauth2-api-tester:local
    echo.
    echo Note: This image only serves HTTP on port 80.
    echo For HTTPS, configure SSL at deployment time using a reverse proxy.
) else (
    echo Build failed!
    exit /b 1
)
