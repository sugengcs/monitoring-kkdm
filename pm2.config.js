/**
 * ========================================
 * PM2 Configuration File - WebGIS Backend
 * ========================================
 * Konfigurasi PM2 untuk production deployment
 * 
 * Penggunaan:
 * - pm2 start pm2.config.js
 * - pm2 restart webgis-backend
 * - pm2 stop webgis-backend
 * - pm2 delete webgis-backend
 * - pm2 logs webgis-backend
 * - pm2 monit
 * ========================================
 */

module.exports = {
  apps: [
    {
      // Nama aplikasi (untuk identifikasi di PM2)
      name: 'webgis-backend',

      // Entry point aplikasi
      script: './server.js',

      // Working directory
      cwd: '/var/www/webgis/backend',

      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
        DB_PATH: './database/becakayu.db'
      },

      // Production environment
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        DB_PATH: './database/becakayu.db'
      },

      // Instance mode (untuk scaling)
      instances: 1,
      exec_mode: 'fork',

      // Auto-restart configuration
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',

      // Logging configuration
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      merge_logs: true,

      // Process management
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // Clustering (jika ingin menggunakan cluster mode)
      // instances: 'max',
      // exec_mode: 'cluster'
    }
  ],

  /**
   * Deployment configuration (opsional untuk PM2 deploy)
   * Catatan: Untuk deployment sederhana, gunakan script BAT yang sudah dibuat
   */
  deploy: {
    production: {
      user: 'ubuntu',
      host: 'your-vps-ip.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/webgis.git',
      path: '/var/www/webgis',
      'post-deploy': 'npm install && npm run build && pm2 reload pm2.config.js --env production'
    }
  }
};
