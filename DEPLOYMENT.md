# WebGIS Deployment Guide

## Overview

Dokumentasi ini menjelaskan cara mendeploy project WebGIS ke VPS Ubuntu menggunakan script deployment otomatis.

## Prerequisites

### Di Windows (Local Machine)
- Git terinstall
- PuTTY atau OpenSSH terinstall (untuk plink command)
- Koneksi internet stabil
- Akses ke repository GitHub

### Di VPS Ubuntu
- Ubuntu Server 20.04+ atau 22.04+
- Node.js v18+ terinstall
- PM2 terinstall globally
- Nginx terinstall
- SSH access enabled
- Git terinstall

## Setup Awal

### 1. Konfigurasi SSH Key (Windows)

Generate SSH key:
```bash
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
```

Copy public key ke VPS:
```bash
type C:\Users\YourUser\.ssh\id_rsa.pub | clip
```

Paste ke VPS:
```bash
# Di VPS
nano ~/.ssh/authorized_keys
# Paste key dan save
```

### 2. Install PuTTY (jika belum ada)

Download dari: https://www.putty.org/

Pastikan `plink.exe` ada di PATH atau copy ke folder project.

### 3. Konfigurasi Script Deployment

Edit file `deploy-update-simple.bat` atau `deploy-update-pro.bat`:

```batch
set VPS_USER=ubuntu              # Username VPS
set VPS_HOST=your-vps-ip.com     # IP atau domain VPS
set VPS_PORT=22                  # Port SSH (default 22)
set PROJECT_PATH=/var/www/webgis # Path project di VPS
set NGINX_PATH=/var/www/html     # Path Nginx public
set PM2_APP_NAME=webgis-backend  # Nama aplikasi di PM2
set GITHUB_REPO=your-username/webgis
set BRANCH=main                  # Branch git
```

## Penggunaan Script Deployment

### Versi Simple

Script sederhana tanpa warna, cocok untuk deployment cepat:

```batch
deploy-update-simple.bat
```

**Fitur:**
- Git push otomatis
- SSH ke VPS
- Git pull, npm install, build
- Restart PM2
- Copy ke Nginx
- Status deployment

### Versi Professional

Script dengan warna terminal, logging detail, dan verifikasi:

```batch
deploy-update-pro.bat
```

**Fitur Tambahan:**
- Warna terminal untuk readability
- Validasi koneksi internet
- Cek perubahan git
- Verifikasi deployment
- Summary deployment
- Troubleshooting tips
- PM2 dan Nginx status check

## Alur Deployment

```
1. Git Add + Commit + Push (Local)
   ↓
2. SSH Connect to VPS
   ↓
3. Git Pull (VPS)
   ↓
4. npm install --production
   ↓
5. npm run build (Frontend)
   ↓
6. PM2 Restart (Backend)
   ↓
7. Copy dist to Nginx
   ↓
8. Set Permissions
   ↓
9. Verification & Summary
```

## Troubleshooting

### Error: "plink is not recognized"

**Solusi:**
1. Install PuTTY dari https://www.putty.org/
2. Tambahkan PuTTY ke system PATH
3. Atau copy `plink.exe` ke folder project

### Error: "Failed to push to GitHub"

**Solusi:**
1. Cek koneksi internet
2. Pastikan GitHub token valid (untuk 2FA)
3. Cek remote URL: `git remote -v`
4. Configure git credentials:
   ```bash
   git config --global user.name "Your Name"
   git config --global user.email "your-email@example.com"
   ```

### Error: "Connection refused" saat SSH

**Solusi:**
1. Cek IP VPS benar
2. Cek SSH service di VPS: `sudo systemctl status ssh`
3. Cek firewall: `sudo ufw status`
4. Test manual: `plink ubuntu@your-vps-ip.com`

### Error: PM2 process not found

**Solusi:**
1. SSH ke VPS
2. Cek PM2 list: `pm2 list`
3. Start aplikasi: `pm2 start pm2.config.js`
4. Save process: `pm2 save`
5. Setup startup: `pm2 startup`

### Error: Nginx 404 atau 502

**Solusi:**
1. Cek Nginx config: `sudo nginx -t`
2. Cek Nginx logs:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```
3. Restart Nginx: `sudo systemctl restart nginx`
4. Pastikan frontend sudah di-copy ke `/var/www/html/`

### Error: Build failed

**Solusi:**
1. Cek Node.js version: `node --version` (min v18)
2. Clear cache:
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```
3. Cek error di build log

## Commands Manual (Jika Script Gagal)

### Deploy Manual dari Windows

```batch
REM 1. Push ke GitHub
git add .
git commit -m "Manual deploy"
git push origin main

REM 2. SSH ke VPS
plink ubuntu@your-vps-ip.com

REM 3. Di VPS, jalankan:
cd /var/www/webgis
git pull origin main
npm install
npm run build
pm2 restart webgis-backend
cp -r frontend/dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/
```

### Commands PM2

```bash
# Start
pm2 start pm2.config.js

# Restart
pm2 restart webgis-backend

# Stop
pm2 stop webgis-backend

# Logs
pm2 logs webgis-backend

# Monitor
pm2 monit

# Status
pm2 status

# Save process list
pm2 save

# Startup script
pm2 startup
```

## Best Practices

### 1. Version Control
- Selalu commit perubahan sebelum deploy
- Gunakan semantic versioning
- Maintain changelog

### 2. Environment Variables
- Jangan commit .env file
- Gunakan environment variables untuk sensitive data
- Konfigurasi .env di VPS

### 3. Backup
- Backup database sebelum deploy
- Backup konfigurasi penting
- Gunakan git untuk version control

### 4. Testing
- Test di local environment dulu
- Test build process
- Verify setelah deployment

### 5. Monitoring
- Monitor PM2 logs
- Monitor Nginx logs
- Set up alerts jika memungkinkan

### 6. Security
- Gunakan SSH key authentication
- Update dependencies regularly
- Configure firewall
- Use HTTPS dengan Let's Encrypt

## Advanced Setup

### SSL/HTTPS dengan Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Domain Configuration

Update Nginx config di `/etc/nginx/sites-available/webgis`:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect ke HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com www.your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # ... rest of config
}
```

### Auto-deploy dengan Webhook (Optional)

Setup GitHub webhook untuk trigger deployment otomatis saat push:
1. Install webhook receiver di VPS
2. Configure GitHub webhook URL
3. Script akan trigger saat ada push ke repository

## Support

Jika mengalami masalah:
1. Cek logs (PM2 dan Nginx)
2. Review troubleshooting section
3. Cek dokumentasi PM2: https://pm2.keymetrics.io/
4. Cek dokumentasi Nginx: https://nginx.org/en/docs/

## Changelog

### v1.0 (2024)
- Initial release
- Simple and professional deployment scripts
- PM2 configuration
- VPS structure documentation
