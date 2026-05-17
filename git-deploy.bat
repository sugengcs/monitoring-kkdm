@echo off
chcp 65001 >nul
title Git Deployment
color 0A

echo.
echo ========================================
echo   Git Deployment Script
echo ========================================
echo.

:: Check if this is a git repository
git rev-parse --git-dir >nul 2>&1
if errorlevel 1 (
    echo [ERROR] This is not a git repository
    pause
    exit /b 1
)

echo [1/5] Checking current branch...
for /f "tokens=*" %%i in ('git branch --show-current') do set currentBranch=%%i
echo Current branch: %currentBranch%
echo.

echo [2/5] Checking git status...
git status --short
echo.

echo [3/5] Adding all changes...
git add .
if errorlevel 1 (
    echo [ERROR] Failed to add changes
    pause
    exit /b 1
)
echo [SUCCESS] Changes added
echo.

echo [4/5] Committing changes...
set /p commitMessage="Enter commit message: "
if "%commitMessage%"=="" (
    echo [ERROR] Commit message cannot be empty
    pause
    exit /b 1
)
git commit -m "%commitMessage%"
if errorlevel 1 (
    echo [WARNING] No changes to commit or commit failed
)
echo [SUCCESS] Changes committed
echo.

echo [5/5] Pushing to remote repository...
set /p remoteBranch="Enter remote branch (default: main): "
if "%remoteBranch%"=="" set remoteBranch=main

git push origin %remoteBranch%
if errorlevel 1 (
    echo [ERROR] Failed to push to remote
    echo Please check your git credentials and try again
    pause
    exit /b 1
)
echo [SUCCESS] Pushed to origin/%remoteBranch%
echo.

echo ========================================
echo   Git Deployment Completed!
echo ========================================
echo.
pause
