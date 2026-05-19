@echo off
title Update Git - Personal Website
color 0A

echo ==========================================
echo     UPDATE GIT PERSONAL WEBSITE
echo ==========================================
echo.

:: =========================
:: BACKEND
:: =========================
echo [1/3] Updating BACKEND...
cd /d "D:\Web KKDM\webkkdm3\CascadeProjects\personal-website\backend"

git add .
git commit -m "Update backend"
git pull origin main
git push origin main

echo.
echo BACKEND selesai.
echo.

:: =========================
:: FRONTEND
:: =========================
echo [2/3] Updating FRONTEND...
cd /d "D:\Web KKDM\webkkdm3\CascadeProjects\personal-website\frontend"

git add .
git commit -m "Update frontend"
git pull origin main
git push origin main

echo.
echo FRONTEND selesai.
echo.

:: =========================
:: ROOT PROJECT
:: =========================
echo [3/3] Updating ROOT PROJECT...
cd /d "D:\Web KKDM\webkkdm3\CascadeProjects\personal-website"

git add .
git commit -m "Update project"
git pull origin main
git push origin main

echo.
echo ==========================================
echo      SEMUA REPOSITORY BERHASIL UPDATE
echo ==========================================

pause
