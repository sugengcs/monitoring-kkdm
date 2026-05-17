@echo off
chcp 65001 >nul
title Becakayu WebGIS - Development Server
color 0A

echo.
echo ========================================
echo   Becakayu WebGIS Development Server
echo ========================================
echo.

:: Check if node_modules exists in root
if not exist "node_modules" (
    echo [INFO] Installing root dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install root dependencies
        pause
        exit /b 1
    )
    echo [SUCCESS] Root dependencies installed
    echo.
)

:: Check if frontend node_modules exists
if not exist "frontend\node_modules" (
    echo [INFO] Installing frontend dependencies...
    cd frontend
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install frontend dependencies
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo [SUCCESS] Frontend dependencies installed
    echo.
)

:: Check if backend node_modules exists
if not exist "backend\node_modules" (
    echo [INFO] Installing backend dependencies...
    cd backend
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install backend dependencies
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo [SUCCESS] Backend dependencies installed
    echo.
)

echo [INFO] Starting development server...
echo [INFO] Frontend: http://localhost:5173
echo [INFO] Backend:  http://localhost:5000
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

:: Start both frontend and backend
call npm run dev

pause
