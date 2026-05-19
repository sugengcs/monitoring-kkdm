@echo off
REM ========================================
REM WebGIS Deployment Script - Professional Version
REM ========================================
REM Script deployment modern dengan warna terminal dan logging
REM Mendukung Windows PowerShell dan CMD
REM ========================================

REM ========================================
REM INISIALISASI VARIABEL
REM ========================================
setlocal enabledelayedexpansion

REM Warna terminal (ANSI escape codes untuk Windows 10+)
set "RESET=[0m"
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "MAGENTA=[95m"
set "CYAN=[96m"
set "WHITE=[97m"

REM ========================================
REM KONFIGURASI - SESUAIKAN DENGAN VPS ANDA
REM ========================================
set "VPS_USER=ubuntu"
set "VPS_HOST=your-vps-ip.com"
set "VPS_PORT=22"
set "PROJECT_PATH=/var/www/webgis"
set "NGINX_PATH=/var/www/html"
set "PM2_APP_NAME=webgis-backend"
set "GITHUB_REPO=your-username/webgis"
set "BRANCH=main"

REM ========================================
REM FUNGSI LOGGING DENGAN WARNA
REM ========================================
:log_info
echo %CYAN%[INFO]%RESET% %~1
goto :eof

:log_success
echo %GREEN%[SUCCESS]%RESET% %~1
goto :eof

:log_warning
echo %YELLOW%[WARNING]%RESET% %~1
goto :eof

:log_error
echo %RED%[ERROR]%RESET% %~1
goto :eof

:log_step
echo.
echo %MAGENTA%========================================%RESET%
echo %MAGENTA%[STEP %~1]%RESET% %~2
echo %MAGENTA%========================================%RESET%
goto :eof

REM ========================================
# FUNGSI VALIDASI KONEKSI
REM ========================================
:check_connection
call :log_info "Mengecek koneksi internet..."
ping -n 1 8.8.8.8 >nul 2>&1
if %errorlevel% neq 0 (
    call :log_error "Tidak ada koneksi internet!"
    pause
    exit /b 1
)
call :log_success "Koneksi internet OK"
goto :eof

REM ========================================
# FUNGSI CEK GIT CHANGES
REM ========================================
:check_git_changes
call :log_info "Mengecek perubahan git..."
git diff --quiet
if %errorlevel% equ 0 (
    call :log_warning "Tidak ada perubahan untuk di-deploy"
    set "HAS_CHANGES=0"
) else (
    call :log_success "Ditemukan perubahan untuk di-deploy"
    set "HAS_CHANGES=1"
)
goto :eof

REM ========================================
# FUNGSI PUSH KE GITHUB
REM ========================================
:push_to_github
call :log_step "1" "Pushing changes to GitHub"

call :log_info "Menambahkan semua perubahan..."
git add .
if %errorlevel% neq 0 (
    call :log_error "Gagal git add!"
    exit /b 1
)

call :log_info "Membuat commit..."
git commit -m "Auto deploy: %date% %time% - WebGIS Update"
if %errorlevel% neq 0 (
    call :log_warning "Tidak ada perubahan untuk commit"
)

call :log_info "Pushing to branch: %BRANCH%..."
git push origin %BRANCH%
if %errorlevel% neq 0 (
    call :log_error "Gagal push ke GitHub!"
    call :log_info "Pastikan:
    - GitHub token sudah dikonfigurasi
    - Branch '%BRANCH%' ada di remote
    - Koneksi internet stabil"
    exit /b 1
)

call :log_success "Berhasil push ke GitHub!"
goto :eof

REM ========================================
# FUNGSI DEPLOY KE VPS
REM ========================================
:deploy_to_vps
call :log_step "2" "Deploying to VPS"

call :log_info "Connecting to %VPS_USER%@%VPS_HOST%:%VPS_PORT%..."
call :log_info "Project path: %PROJECT_PATH%"

REM Buat script deployment di server
plink -P %VPS_PORT% %VPS_USER%@%VPS_HOST% ^
  "cd %PROJECT_PATH% && ^
   echo '%GREEN%=== Git Pull ===%RESET%' && ^
   git pull origin %BRANCH% && ^
   echo '%GREEN%=== Install Dependencies ===%RESET%' && ^
   npm install --production && ^
   echo '%GREEN%=== Build Frontend ===%RESET%' && ^
   npm run build && ^
   echo '%GREEN%=== Restart PM2 Backend ===%RESET%' && ^
   pm2 restart %PM2_APP_NAME% --update-env && ^
   echo '%GREEN%=== Save PM2 Process List ===%RESET%' && ^
   pm2 save && ^
   echo '%GREEN%=== Copy Frontend to Nginx ===%RESET%' && ^
   rm -rf %NGINX_PATH%/* && ^
   cp -r frontend/dist/* %NGINX_PATH%/ && ^
   echo '%GREEN%=== Set Permissions ===%RESET%' && ^
   chown -R www-data:www-data %NGINX_PATH%/ && ^
   chmod -R 755 %NGINX_PATH%/ && ^
   echo '%GREEN%=== Deployment Complete ===%RESET%' && ^
   echo '%CYAN%=== PM2 Status ===%RESET%' && ^
   pm2 status"

if %errorlevel% neq 0 (
    call :log_error "Gagal deployment di VPS!"
    call :log_info "Troubleshooting:
    1. Pastikan PuTTY/PLink terinstall
    2. Cek koneksi SSH: plink %VPS_USER%@%VPS_HOST%
    3. Pastikan folder project ada di VPS
    4. Cek PM2: pm2 list
    5. Cek Nginx: sudo nginx -t"
    exit /b 1
)

call :log_success "Deployment VPS berhasil!"
goto :eof

REM ========================================
# FUNGSI VERIFIKASI DEPLOYMENT
REM ========================================
:verify_deployment
call :log_step "3" "Verifying Deployment"

call :log_info "Checking PM2 process status..."
plink -P %VPS_PORT% %VPS_USER%@%VPS_HOST% "pm2 status %PM2_APP_NAME%"

if %errorlevel% neq 0 (
    call :log_warning "PM2 process mungkin tidak berjalan normal"
) else (
    call :log_success "PM2 process OK"
)

call :log_info "Checking Nginx status..."
plink -P %VPS_PORT% %VPS_USER%@%VPS_HOST% "sudo systemctl status nginx --no-pager"

if %errorlevel% neq 0 (
    call :log_warning "Nginx mungkin tidak berjalan normal"
) else (
    call :log_success "Nginx OK"
)

goto :eof

REM ========================================
# FUNGSI TAMPILKAN SUMMARY
REM ========================================
:show_summary
echo.
echo %GREEN%========================================%RESET%
echo %GREEN%   DEPLOYMENT SUCCESSFUL!%RESET%
echo %GREEN%========================================%RESET%
echo.
echo %CYAN%Project Information:%RESET%
echo   - Frontend: %WHITE%http://%VPS_HOST%%RESET%
echo   - Backend:  %WHITE%http://%VPS_HOST%:5000%RESET%
echo   - API:      %WHITE%http://%VPS_HOST%:5000/api%RESET%
echo.
echo %CYAN%Deployment Details:%RESET%
echo   - Date:     %WHITE%%date%%RESET%
echo   - Time:     %WHITE%%time%%RESET%
echo   - Branch:   %WHITE%%BRANCH%%RESET%
echo   - VPS:      %WHITE%%VPS_USER%@%VPS_HOST%%RESET%
echo.
echo %CYAN%Useful Commands:%RESET%
echo   - PM2 logs:  %WHITE%plink %VPS_USER%@%VPS_HOST% "pm2 logs %PM2_APP_NAME%"%RESET%
echo   - PM2 restart:%WHITE%plink %VPS_USER%@%VPS_HOST% "pm2 restart %PM2_APP_NAME%"%RESET%
echo   - SSH VPS:   %WHITE%plink %VPS_USER%@%VPS_HOST%%RESET%
echo.
goto :eof

REM ========================================
# MAIN EXECUTION
REM ========================================
cls
echo %BLUE%========================================%RESET%
echo %BLUE%   WebGIS Deployment Script%RESET%
echo %BLUE%   Professional Version v1.0%RESET%
echo %BLUE%========================================%RESET%
echo.

call :check_connection
call :push_to_github
call :deploy_to_vps
call :verify_deployment
call :show_summary

echo %YELLOW%Press any key to exit...%RESET%
pause >nul
