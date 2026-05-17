@echo off
chcp 65001 >nul
title Becakayu WebGIS - Safe Deploy
color 0A

echo.
echo ====================================================
echo         BECAKAYU WEBGIS SAFE DEPLOY TOOL
echo ====================================================
echo.

:: ====================================================
:: GO TO PROJECT ROOT
:: ====================================================

cd /d "D:\web KKDM\webkkdm3\CascadeProjects\personal-website"

if errorlevel 1 (
    echo [ERROR] Failed to open project directory
    pause
    exit /b 1
)

echo [INFO] Current Project:
echo %CD%
echo.

:: ====================================================
:: CHECK GIT
:: ====================================================

echo [1/10] Checking Git...

git --version >nul 2>&1

if errorlevel 1 (
    echo.
    echo [ERROR] Git is not installed
    echo Download:
    echo https://git-scm.com/
    echo.
    pause
    exit /b 1
)

echo [SUCCESS] Git detected
echo.

:: ====================================================
:: CHECK NODE
:: ====================================================

echo [2/10] Checking Node.js...

node -v >nul 2>&1

if errorlevel 1 (
    echo.
    echo [ERROR] Node.js is not installed
    echo Download:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [SUCCESS] Node.js detected
echo.

:: ====================================================
:: CLEAN SQLITE TEMP FILES
:: ====================================================

echo [3/10] Cleaning SQLite temp files...

del /f /q "backend\database\*.db-shm" >nul 2>&1
del /f /q "backend\database\*.db-wal" >nul 2>&1

echo [SUCCESS] SQLite temp files cleaned
echo.

:: ====================================================
:: BUILD FRONTEND
:: ====================================================

echo [4/10] Building frontend...
echo.

cd frontend

call npm run build

if errorlevel 1 (
    echo.
    echo ====================================================
    echo [ERROR] FRONTEND BUILD FAILED
    echo ====================================================
    echo.
    echo Fix React/Vite errors before deploy
    echo.
    pause
    exit /b 1
)

cd ..

echo.
echo [SUCCESS] Frontend build successful
echo.

:: ====================================================
:: CHECK BACKEND
:: ====================================================

echo [5/10] Checking backend...

if exist "backend\package.json" (
    echo [SUCCESS] Backend package.json found
) else (
    echo [ERROR] backend\package.json not found
    pause
    exit /b 1
)

echo.

:: ====================================================
:: SHOW GIT STATUS
:: ====================================================

echo [6/10] Git Status
echo ----------------------------------------------------

git status

echo ----------------------------------------------------
echo.

:: ====================================================
:: COMMIT MESSAGE
:: ====================================================

set /p commit_msg=Enter commit message: 

if "%commit_msg%"=="" (
    set commit_msg=Update project features
)

echo.
echo [INFO] Commit:
echo %commit_msg%
echo.

:: ====================================================
:: GIT ADD
:: ====================================================

echo [7/10] Adding files...

git add .

if errorlevel 1 (
    echo [ERROR] Failed to add files
    pause
    exit /b 1
)

echo [SUCCESS] Files added
echo.

:: ====================================================
:: GIT COMMIT
:: ====================================================

echo [8/10] Committing...

git commit -m "%commit_msg%"

if errorlevel 1 (
    echo.
    echo [WARNING] No changes to commit
    echo Continuing...
    echo.
) else (
    echo [SUCCESS] Commit successful
    echo.
)

:: ====================================================
:: GET CURRENT BRANCH
:: ====================================================

for /f "delims=" %%i in ('git branch --show-current') do set branch=%%i

echo [INFO] Current Branch:
echo %branch%
echo.

:: ====================================================
:: OPTIONAL PULL
:: ====================================================

echo [9/10] Pull latest changes?
set /p pull_choice=Pull before push? (Y/N): 

if /i "%pull_choice%"=="Y" (

    echo.
    echo Pulling latest changes...
    echo.

    git pull origin %branch%

    if errorlevel 1 (
        echo.
        echo [WARNING] Pull failed
        echo Continuing push...
        echo.
    ) else (
        echo [SUCCESS] Pull successful
        echo.
    )
)

:: ====================================================
:: GIT PUSH
:: ====================================================

echo [10/10] Pushing to GitHub...

git push origin %branch%

if errorlevel 1 (
    echo.
    echo ====================================================
    echo [ERROR] PUSH FAILED
    echo ====================================================
    echo.
    echo Possible causes:
    echo - Internet disconnected
    echo - GitHub authentication failed
    echo - Remote conflict
    echo.
    pause
    exit /b 1
)

echo.
echo ====================================================
echo              DEPLOY SUCCESSFUL
echo ====================================================
echo.

echo Branch:
echo %branch%
echo.

echo Frontend:
echo D:\web KKDM\webkkdm3\CascadeProjects\personal-website\frontend
echo.

echo Backend:
echo D:\web KKDM\webkkdm3\CascadeProjects\personal-website\backend
echo.

echo If connected to:
echo - Vercel
echo - Railway
echo Deployment should start automatically.
echo.

pause
