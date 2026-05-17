@echo off
title Becakayu Auto Deploy Git
color 0A

echo =======================================
echo      BECAKAYU AUTO DEPLOY SYSTEM
echo =======================================
echo.

set PROJECT_ROOT=D:\web KKDM\webkkdm3\CascadeProjects\personal-website
set FRONTEND=%PROJECT_ROOT%\frontend
set BACKEND=%PROJECT_ROOT%\backend

echo [INFO] Moving to project folder...
cd /d "%PROJECT_ROOT%"

echo.
echo =======================================
echo [1/8] Checking Git Status
echo =======================================
git status

echo.
echo =======================================
echo [2/8] Installing Frontend Dependencies
echo =======================================
cd /d "%FRONTEND%"
call npm install

echo.
echo =======================================
echo [3/8] Building Frontend Production
echo =======================================
call npm run build

echo.
echo =======================================
echo [4/8] Installing Backend Dependencies
echo =======================================
cd /d "%BACKEND%"
call npm install

echo.
echo =======================================
echo [5/8] Returning to Root Project
echo =======================================
cd /d "%PROJECT_ROOT%"

echo.
echo =======================================
echo [6/8] Git Add
echo =======================================
git add .

echo.
echo =======================================
echo [7/8] Git Commit
echo =======================================
set /p commitmsg=Enter commit message: 
git commit -m "%commitmsg%"

echo.
echo =======================================
echo [8/8] Git Push
echo =======================================
git push origin main

echo.
echo =======================================
echo        DEPLOY COMPLETED SUCCESS
echo =======================================
echo.
echo Frontend Build:
echo %FRONTEND%\dist
echo.
echo Backend Ready:
echo %BACKEND%
echo.

pause
