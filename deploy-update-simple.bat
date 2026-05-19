@echo off
REM ========================================
REM WebGIS Deployment Script - Simple Version
REM ========================================
REM Script ini otomatis mendeploy project WebGIS ke VPS Ubuntu
REM 
REM Fitur:
REM - Git push ke GitHub
REM - SSH otomatis ke VPS
REM - Git pull di server
REM - Install dependencies
REM - Build frontend
REM - Restart PM2 backend
REM - Copy build ke Nginx
REM ========================================

REM ========================================
REM KONFIGURASI - SESUAIKAN DENGAN VPS ANDA
REM ========================================
set VPS_USER=ubuntu
set VPS_HOST=your-vps-ip.com
set VPS_PORT=22
set PROJECT_PATH=/var/www/webgis
set NGINX_PATH=/var/www/html
set PM2_APP_NAME=webgis-backend
set GITHUB_REPO=your-username/webgis

REM ========================================
REM 1. PUSH PERUBAHAN KE GITHUB
REM ========================================
echo.
echo [STEP 1] Pushing changes to GitHub...
echo.

git add .
git commit -m "Auto deploy: %date% %time%"
git push origin main

if %errorlevel% neq 0 (
    echo [ERROR] Gagal push ke GitHub!
    pause
    exit /b 1
)

echo [SUCCESS] Berhasil push ke GitHub!

REM ========================================
REM 2. SSH KE VPS DAN JALANKAN DEPLOYMENT
REM ========================================
echo.
echo [STEP 2] Connecting to VPS and deploying...
echo.

plink -P %VPS_PORT% %VPS_USER%@%VPS_HOST% ^
  "cd %PROJECT_PATH% && ^
   echo '=== Git Pull ===' && ^
   git pull && ^
   echo '=== Install Dependencies ===' && ^
   npm install && ^
   echo '=== Build Frontend ===' && ^
   npm run build && ^
   echo '=== Restart PM2 Backend ===' && ^
   pm2 restart %PM2_APP_NAME% && ^
   echo '=== Copy to Nginx ===' && ^
   cp -r frontend/dist/* %NGINX_PATH%/ && ^
   echo '=== Deployment Complete ==='"

if %errorlevel% neq 0 (
    echo [ERROR] Gagal deployment di VPS!
    echo Pastikan:
    echo 1. PuTTY/PLink sudah terinstall
    echo 2. SSH key sudah dikonfigurasi
    echo 3. VPS dapat diakses
    pause
    exit /b 1
)

REM ========================================
REM 3. DEPLOYMENT BERHASIL
REM ========================================
echo.
echo ========================================
echo [SUCCESS] Deployment Berhasil!
echo ========================================
echo.
echo Frontend: http://%VPS_HOST%
echo Backend: http://%VPS_HOST%:5000
echo.
pause
