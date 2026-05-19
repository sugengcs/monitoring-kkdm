# Struktur Folder VPS untuk WebGIS

## Struktur Direktori di VPS Ubuntu

```
/var/www/webgis/                    # Root directory project
├── backend/                        # Backend Node.js application
│   ├── server.js                   # Main server file
│   ├── config/                     # Configuration files
│   │   ├── database.js            # Database configuration
│   │   └── ...
│   ├── routes/                     # API routes
│   ├── controllers/                # Controllers
│   ├── models/                     # Database models
│   ├── middleware/                 # Express middleware
│   ├── database/                   # SQLite database files
│   │   └── becakayu.db            # Main database
│   ├── logs/                       # Application logs
│   │   ├── pm2-error.log
│   │   ├── pm2-out.log
│   │   └── pm2-combined.log
│   ├── node_modules/               # Backend dependencies
│   ├── package.json
│   └── pm2.config.js              # PM2 configuration
│
├── frontend/                       # Frontend React + Vite
│   ├── src/                        # Source code
│   │   ├── components/            # React components
│   │   ├── pages/                 # Page components
│   │   ├── assets/                # Static assets
│   │   ├── App.jsx               # Main App component
│   │   └── main.jsx              # Entry point
│   ├── public/                     # Public assets
│   ├── dist/                       # Production build (generated)
│   ├── node_modules/               # Frontend dependencies
│   ├── package.json
│   ├── vite.config.js             # Vite configuration
│   ├── index.html
│   └── .env                        # Environment variables
│
├── .git/                           # Git repository
├── .gitignore
├── package.json                    # Root package.json
├── deploy-update-simple.bat        # Deployment script (simple)
├── deploy-update-pro.bat           # Deployment script (professional)
├── pm2.config.js                   # PM2 configuration
└── README.md                       # Project documentation

/var/www/html/                      # Nginx public directory (symlink or copy)
└── (isi dari frontend/dist/)
    ├── index.html
    ├── assets/
    │   ├── index-abc123.js
    │   └── index-def456.css
    └── ...
```

## Setup VPS Ubuntu

### 1. Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Node.js (v18 atau lebih baru)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### 3. Install PM2 Global
```bash
sudo npm install -g pm2
```

### 4. Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 5. Setup Project Directory
```bash
sudo mkdir -p /var/www/webgis
sudo chown -R $USER:$USER /var/www/webgis
cd /var/www/webgis
```

### 6. Clone Repository
```bash
git clone https://github.com/your-username/webgis.git .
```

### 7. Install Dependencies
```bash
npm install
cd frontend
npm install
cd ..
```

### 8. Build Frontend
```bash
npm run build
```

### 9. Copy Frontend to Nginx
```bash
sudo cp -r frontend/dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/
sudo chmod -R 755 /var/www/html/
```

### 10. Configure PM2
```bash
cd backend
pm2 start ../pm2.config.js
pm2 save
pm2 startup
```

### 11. Configure Nginx
Edit `/etc/nginx/sites-available/webgis`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/html;
    index index.html;

    # Frontend static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/webgis /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 12. Setup Firewall
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## PM2 Commands

### Basic Commands
```bash
pm2 list                    # List all processes
pm2 start pm2.config.js     # Start application
pm2 restart webgis-backend  # Restart application
pm2 stop webgis-backend     # Stop application
pm2 delete webgis-backend   # Delete application
pm2 logs webgis-backend     # View logs
pm2 monit                   # Monitor dashboard
pm2 status                  # Check status
```

### Advanced Commands
```bash
pm2 logs --lines 100        # View last 100 log lines
pm2 flush                   # Clear all logs
pm2 reload webgis-backend   # Zero-downtime reload
pm2 reset webgis-backend    # Reset restart counter
pm2 describe webgis-backend # Detailed process info
pm2 startup                 # Generate startup script
pm2 save                    # Save process list
```

## Troubleshooting

### Check PM2 Logs
```bash
pm2 logs webgis-backend --err  # Error logs only
pm2 logs webgis-backend --out  # Output logs only
```

### Check Nginx Logs
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Restart Services
```bash
sudo systemctl restart nginx
pm2 restart webgis-backend
```

### Check Port Usage
```bash
sudo netstat -tlnp | grep :5000
sudo netstat -tlnp | grep :80
```

## Environment Variables

### Backend (.env in backend/)
```
NODE_ENV=production
PORT=5000
DB_PATH=./database/becakayu.db
JWT_SECRET=your-secret-key
```

### Frontend (.env in frontend/)
```
VITE_API_URL=http://your-domain.com/api
VITE_MAP_API_KEY=your-map-api-key
```

## Backup Strategy

### Database Backup
```bash
# Backup database
cp /var/www/webgis/backend/database/becakayu.db /backup/becakayu-$(date +%Y%m%d).db

# Automated backup (add to crontab)
0 2 * * * cp /var/www/webgis/backend/database/becakayu.db /backup/becakayu-$(date +\%Y\%m\%d).db
```

### Project Backup
```bash
# Backup entire project
tar -czf /backup/webgis-$(date +%Y%m%d).tar.gz /var/www/webgis
```

## Security Best Practices

1. **SSH Key Authentication**: Use SSH keys instead of passwords
2. **Firewall**: Configure UFW to allow only necessary ports
3. **SSL/TLS**: Install Let's Encrypt certificate for HTTPS
4. **Updates**: Regular system and dependency updates
5. **Monitoring**: Set up monitoring for PM2 and Nginx
6. **Backups**: Automated regular backups
7. **User Permissions**: Use non-root user for application
8. **Environment Variables**: Never commit sensitive data to git
