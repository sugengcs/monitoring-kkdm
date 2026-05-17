@echo off
chcp 65001 >nul
title Becakayu WebGIS - Deploy
color 0B

echo.
echo ========================================
echo   Becakayu WebGIS - Deploy Script
echo ========================================
echo.

:: Confirm deployment
echo [WARNING] This will clean and rebuild the project for production.
set /p confirm="Are you sure you want to deploy? (Y/N): "
if /i not "%confirm%"=="Y" (
    echo [CANCELLED] Deployment cancelled.
    pause
    exit /b 0
)

echo.
echo [INFO] Starting deployment process...
echo.

:: Step 1: Clean previous builds
echo [1/5] Cleaning previous builds...
if exist "frontend\dist" (
    rd /s /q "frontend\dist"
    echo [SUCCESS] Frontend dist folder cleaned
)
if exist "frontend\.vite" (
    rd /s /q "frontend\.vite"
    echo [SUCCESS] Frontend .vite cache cleaned
)
echo.

:: Step 2: Install dependencies
echo [2/5] Installing dependencies...
call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install root dependencies
    pause
    exit /b 1
)

cd frontend
call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install frontend dependencies
    cd ..
    pause
    exit /b 1
)
cd ..

cd backend
call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install backend dependencies
    cd ..
    pause
    exit /b 1
)
cd ..
echo [SUCCESS] All dependencies installed
echo.

:: Step 3: Build frontend
echo [3/5] Building frontend for production...
cd frontend
call npm run build
if errorlevel 1 (
    echo [ERROR] Failed to build frontend
    cd ..
    pause
    exit /b 1
)
cd ..
echo [SUCCESS] Frontend built successfully
echo.

:: Step 4: Prepare backend
echo [4/5] Preparing backend...
echo [INFO] Backend is ready for production deployment
echo.

:: Step 5: Summary
echo [5/5] Deployment summary:
echo ========================================
echo   Frontend: Built successfully
echo   Output:   frontend\dist\ folder
echo   Backend:  Ready for deployment
echo ========================================
echo.
echo [INFO] Deployment completed successfully!
echo.
echo Next steps:
echo 1. Upload frontend\dist\ folder to your hosting
echo 2. Deploy backend to your server
echo 3. Update environment variables on production
echo.

pause
