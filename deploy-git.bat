@echo off
chcp 65001 >nul
title Becakayu WebGIS - Deploy via Git
color 0E

echo.
echo ========================================
echo   Becakayu WebGIS - Git Deploy
echo ========================================
echo.

:: Check if git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git is not installed or not in PATH
    echo Please install Git from https://git-scm.com/
    pause
    exit /b 1
)

:: Get commit message
set /p commit_msg="Enter commit message (or press Enter for default): "
if "%commit_msg%"=="" set commit_msg="Update project features"

echo.
echo [INFO] Commit message: %commit_msg%
echo.

:: Step 1: Check git status
echo [1/6] Checking git status...
git status
echo.

:: Step 2: Add all changes
echo [2/6] Adding all changes...
git add .
if errorlevel 1 (
    echo [ERROR] Failed to add changes
    pause
    exit /b 1
)
echo [SUCCESS] All changes added
echo.

:: Step 3: Commit changes
echo [3/6] Committing changes...
git commit -m "%commit_msg%"
if errorlevel 1 (
    echo [WARNING] No changes to commit or commit failed
    echo Continuing with push...
)
echo [SUCCESS] Changes committed
echo.

:: Step 4: Check current branch
echo [4/6] Checking current branch...
for /f "delims=" %%i in ('git branch --show-current') do set branch=%%i
echo Current branch: %branch%
echo.

:: Step 5: Pull latest changes (optional)
echo [5/6] Pulling latest changes from remote...
set /p pull="Pull latest changes before push? (Y/N): "
if /i "%pull%"=="Y" (
    git pull origin %branch%
    if errorlevel 1 (
        echo [WARNING] Pull failed, continuing with push...
    )
)
echo.

:: Step 6: Push to remote
echo [6/6] Pushing to remote repository...
git push origin %branch%
if errorlevel 1 (
    echo [ERROR] Failed to push to remote
    echo Please check your authentication and internet connection
    pause
    exit /b 1
)
echo [SUCCESS] Pushed to remote successfully
echo.

echo ========================================
echo   Deployment completed successfully!
echo ========================================
echo.
echo Repository URL: Check your git remote
echo Branch: %branch%
echo.

pause
