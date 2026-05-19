const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'becakayu.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
const createTables = () => {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'pelapor', 'tim_perbaikan')),
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT 1
    )
  `);

  // Asset categories
  db.exec(`
    CREATE TABLE IF NOT EXISTS asset_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Assets table
  db.exec(`
    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      sub_category TEXT,
      location_lat REAL NOT NULL,
      location_lng REAL NOT NULL,
      sta TEXT,
      ruas TEXT,
      condition_status TEXT DEFAULT 'baik' CHECK(condition_status IN ('baik', 'rusak_ringan', 'rusak_berat', 'sedang_diperbaiki', 'selesai_diperbaiki')),
      description TEXT,
      photo_before TEXT,
      photo_after TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER,
      FOREIGN KEY (category_id) REFERENCES asset_categories(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Perkerasan
  db.exec(`
    CREATE TABLE IF NOT EXISTS perkerasan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id INTEGER UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('patching', 'sfo')),
      area_size REAL,
      thickness REAL,
      material TEXT,
      inspection_date TEXT,
      FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
    )
  `);

  // PJU
  db.exec(`
    CREATE TABLE IF NOT EXISTS pju (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id INTEGER UNIQUE NOT NULL,
      pole_number TEXT NOT NULL,
      lamp_condition TEXT DEFAULT 'nyala' CHECK(lamp_condition IN ('nyala', 'mati', 'redup')),
      power_wattage INTEGER,
      is_active BOOLEAN DEFAULT 1,
      last_maintenance TEXT,
      FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
    )
  `);

  // Panel Utama
  db.exec(`
    CREATE TABLE IF NOT EXISTS panel_utama (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id INTEGER UNIQUE NOT NULL,
      panel_location TEXT,
      panel_condition TEXT DEFAULT 'baik' CHECK(panel_condition IN ('baik', 'rusak', 'maintenance')),
      voltage REAL,
      amperage REAL,
      status TEXT DEFAULT 'aktif' CHECK(status IN ('aktif', 'non_aktif')),
      FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
    )
  `);

  // KWH Meter
  db.exec(`
    CREATE TABLE IF NOT EXISTS kwh_meter (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id INTEGER UNIQUE NOT NULL,
      meter_number TEXT UNIQUE NOT NULL,
      power_capacity INTEGER,
      current_reading REAL,
      status TEXT DEFAULT 'aktif' CHECK(status IN ('aktif', 'non_aktif')),
      location TEXT,
      FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
    )
  `);

  // Rambu
  db.exec(`
    CREATE TABLE IF NOT EXISTS rambu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id INTEGER UNIQUE NOT NULL,
      sign_type TEXT NOT NULL,
      sign_code TEXT,
      condition_status TEXT DEFAULT 'baik' CHECK(condition_status IN ('baik', 'rusak', 'hilang')),
      material TEXT,
      reflectivity TEXT CHECK(reflectivity IN ('tinggi', 'sedang', 'rendah')),
      FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
    )
  `);

  // CCTV
  db.exec(`
    CREATE TABLE IF NOT EXISTS cctv (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id INTEGER UNIQUE NOT NULL,
      cctv_name TEXT NOT NULL,
      status TEXT DEFAULT 'online' CHECK(status IN ('online', 'offline', 'maintenance')),
      stream_url TEXT,
      ip_address TEXT,
      location TEXT,
      last_check DATETIME,
      FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
    )
  `);

  // Damage reports
  db.exec(`
    CREATE TABLE IF NOT EXISTS damage_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_number TEXT UNIQUE NOT NULL,
      asset_id INTEGER,
      reporter_id INTEGER NOT NULL,
      damage_level TEXT NOT NULL CHECK(damage_level IN ('ringan', 'sedang', 'berat')),
      description TEXT NOT NULL,
      location_lat REAL,
      location_lng REAL,
      photo_before TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','on_progress','dalam_perbaikan','diproses','selesai','ditolak')),
      technician_name TEXT,
      technician_notes TEXT,
      estimated_time TEXT,
      rejection_reason TEXT,
      is_read INTEGER DEFAULT 0,
      reported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
      FOREIGN KEY (reporter_id) REFERENCES users(id)
    )
  `);

  // Repair progress timeline
  db.exec(`
    CREATE TABLE IF NOT EXISTS repair_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      notes TEXT,
      photo TEXT,
      updated_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (report_id) REFERENCES damage_reports(id) ON DELETE CASCADE,
      FOREIGN KEY (updated_by) REFERENCES users(id)
    )
  `);

  // Report activities log
  db.exec(`
    CREATE TABLE IF NOT EXISTS report_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      activity_type TEXT NOT NULL,
      description TEXT,
      performed_by INTEGER,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (report_id) REFERENCES damage_reports(id) ON DELETE CASCADE,
      FOREIGN KEY (performed_by) REFERENCES users(id)
    )
  `);

  // Maintenance progress
  db.exec(`
    CREATE TABLE IF NOT EXISTS maintenance_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      repair_team_id INTEGER,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'on_progress', 'selesai')),
      progress_percentage INTEGER DEFAULT 0,
      notes TEXT,
      photo_after TEXT,
      started_at DATETIME,
      completed_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (report_id) REFERENCES damage_reports(id),
      FOREIGN KEY (repair_team_id) REFERENCES users(id)
    )
  `);

  // Maintenance history
  db.exec(`
    CREATE TABLE IF NOT EXISTS maintenance_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id INTEGER NOT NULL,
      maintenance_type TEXT,
      description TEXT,
      performed_by INTEGER,
      cost REAL,
      maintenance_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
      FOREIGN KEY (performed_by) REFERENCES users(id)
    )
  `);

  // Activity logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Notifications
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT NOT NULL,
      message TEXT,
      type TEXT DEFAULT 'info' CHECK(type IN ('info', 'warning', 'success', 'error')),
      is_read BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Progress Lahan (Land Acquisition Progress)
  db.exec(`
    CREATE TABLE IF NOT EXISTS progress_lahan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      no INTEGER NOT NULL,
      lokasi TEXT NOT NULL,
      kebutuhan REAL NOT NULL DEFAULT 0,
      realisasi REAL NOT NULL DEFAULT 0,
      sisa REAL NOT NULL DEFAULT 0,
      keterangan TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER,
      UNIQUE(lokasi)
    )
  `);

  // Maintenance Budget (Anggaran Pemeliharaan)
  db.exec(`
    CREATE TABLE IF NOT EXISTS maintenance_budget (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kategori TEXT NOT NULL CHECK(kategori IN ('Perbaikan Jalan', 'Drainase', 'Lampu PJU', 'Marka Jalan', 'Guardrail', 'Landscape')),
      lokasi TEXT NOT NULL,
      anggaran REAL NOT NULL DEFAULT 0,
      realisasi REAL NOT NULL DEFAULT 0,
      sisa REAL NOT NULL DEFAULT 0,
      progress INTEGER DEFAULT 0 CHECK(progress >= 0 AND progress <= 100),
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'progress', 'selesai')),
      latitude REAL,
      longitude REAL,
      tanggal TEXT,
      keterangan TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER
    )
  `);

  console.log('Tables created successfully');
};

// Insert sample data
const insertSampleData = () => {
  // Insert asset categories
  const categories = [
    { name: 'Perkerasan', description: 'Aset perkerasan jalan tol', icon: 'road' },
    { name: 'PJU', description: 'Penerangan Jalan Umum', icon: 'lightbulb' },
    { name: 'Panel Utama', description: 'Panel listrik utama', icon: 'zap' },
    { name: 'KWH Meter', description: 'Meteran listrik', icon: 'activity' },
    { name: 'Rambu', description: 'Rambu lalu lintas', icon: 'alert-triangle' },
    { name: 'CCTV', description: 'Kamera pengawas', icon: 'video' }
  ];

  const insertCategory = db.prepare('INSERT OR IGNORE INTO asset_categories (name, description, icon) VALUES (?, ?, ?)');
  categories.forEach(cat => insertCategory.run(cat.name, cat.description, cat.icon));

  // Insert admin user (password: admin123)
  const bcrypt = require('bcryptjs');
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync('admin123', salt);

  const insertUser = db.prepare('INSERT OR IGNORE INTO users (username, email, password, full_name, role, phone) VALUES (?, ?, ?, ?, ?, ?)');
  insertUser.run('admin', 'admin@becakayu.co.id', hashedPassword, 'Administrator', 'admin', '081234567890');

  // Insert sample assets
  const assets = [
    { asset_code: 'ASSET-001', name: 'Perkerasan KM 10+500', category_id: 1, location_lat: -6.2347001, location_lng: 106.9321978, sta: 'KM 10+500', ruas: 'Becakayu', condition_status: 'baik' },
    { asset_code: 'ASSET-002', name: 'PJU Tiang 15', category_id: 2, location_lat: -6.2350000, location_lng: 106.9330000, sta: 'KM 10+600', ruas: 'Becakayu', condition_status: 'baik' },
    { asset_code: 'ASSET-003', name: 'Panel Utama A', category_id: 3, location_lat: -6.2355000, location_lng: 106.9335000, sta: 'KM 10+700', ruas: 'Becakayu', condition_status: 'baik' },
    { asset_code: 'ASSET-004', name: 'KWH Meter 001', category_id: 4, location_lat: -6.2360000, location_lng: 106.9340000, sta: 'KM 10+800', ruas: 'Becakayu', condition_status: 'baik' },
    { asset_code: 'ASSET-005', name: 'Rambu Peringatan', category_id: 5, location_lat: -6.2365000, location_lng: 106.9345000, sta: 'KM 10+900', ruas: 'Becakayu', condition_status: 'baik' },
    { asset_code: 'ASSET-006', name: 'CCTV Gerbang Tol', category_id: 6, location_lat: -6.2370000, location_lng: 106.9350000, sta: 'KM 11+000', ruas: 'Becakayu', condition_status: 'online' }
  ];

  const insertAsset = db.prepare('INSERT OR IGNORE INTO assets (asset_code, name, category_id, location_lat, location_lng, sta, ruas, condition_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  assets.forEach(asset => insertAsset.run(asset.asset_code, asset.name, asset.category_id, asset.location_lat, asset.location_lng, asset.sta, asset.ruas, asset.condition_status));

  // Insert sample maintenance budget data
  const maintenanceBudgets = [
    { kategori: 'Perbaikan Jalan', lokasi: 'KM 10+500', anggaran: 50000000, realisasi: 35000000, sisa: 15000000, progress: 70, status: 'progress', latitude: -6.2347001, longitude: 106.9321978, tanggal: '2024-01-15', keterangan: 'Perbaikan perkerasan jalan' },
    { kategori: 'Drainase', lokasi: 'KM 11+200', anggaran: 30000000, realisasi: 30000000, sisa: 0, progress: 100, status: 'selesai', latitude: -6.2355000, longitude: 106.9335000, tanggal: '2024-02-10', keterangan: 'Pembersihan saluran air' },
    { kategori: 'Lampu PJU', lokasi: 'KM 10+800', anggaran: 25000000, realisasi: 10000000, sisa: 15000000, progress: 40, status: 'progress', latitude: -6.2360000, longitude: 106.9340000, tanggal: '2024-03-05', keterangan: 'Penggantian lampu PJU' },
    { kategori: 'Marka Jalan', lokasi: 'KM 12+000', anggaran: 40000000, realisasi: 0, sisa: 40000000, progress: 0, status: 'pending', latitude: -6.2370000, longitude: 106.9350000, tanggal: '2024-04-01', keterangan: 'Pengecatan marka jalan' },
    { kategori: 'Guardrail', lokasi: 'KM 9+500', anggaran: 60000000, realisasi: 55000000, sisa: 5000000, progress: 92, status: 'progress', latitude: -6.2335000, longitude: 106.9315000, tanggal: '2024-01-20', keterangan: 'Perbaikan guardrail' },
    { kategori: 'Landscape', lokasi: 'KM 10+000', anggaran: 35000000, realisasi: 35000000, sisa: 0, progress: 100, status: 'selesai', latitude: -6.2340000, longitude: 106.9320000, tanggal: '2024-02-20', keterangan: 'Perawatan taman median' },
    { kategori: 'Perbaikan Jalan', lokasi: 'KM 13+500', anggaran: 45000000, realisasi: 20000000, sisa: 25000000, progress: 44, status: 'progress', latitude: -6.2380000, longitude: 106.9360000, tanggal: '2024-03-15', keterangan: 'Patch perkerasan' },
    { kategori: 'Drainase', lokasi: 'KM 14+000', anggaran: 28000000, realisasi: 0, sisa: 28000000, progress: 0, status: 'pending', latitude: -6.2390000, longitude: 106.9370000, tanggal: '2024-05-01', keterangan: 'Perbaikan box culvert' },
    { kategori: 'Lampu PJU', lokasi: 'KM 11+800', anggaran: 22000000, realisasi: 22000000, sisa: 0, progress: 100, status: 'selesai', latitude: -6.2365000, longitude: 106.9345000, tanggal: '2024-02-28', keterangan: 'Pemasangan tiang PJU baru' },
    { kategori: 'Marka Jalan', lokasi: 'KM 9+000', anggaran: 38000000, realisasi: 32000000, sisa: 6000000, progress: 84, status: 'progress', latitude: -6.2330000, longitude: 106.9310000, tanggal: '2024-04-10', keterangan: 'Refresh marka jalan' },
  ];

  const insertBudget = db.prepare('INSERT OR IGNORE INTO maintenance_budget (kategori, lokasi, anggaran, realisasi, sisa, progress, status, latitude, longitude, tanggal, keterangan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  maintenanceBudgets.forEach(budget => insertBudget.run(budget.kategori, budget.lokasi, budget.anggaran, budget.realisasi, budget.sisa, budget.progress, budget.status, budget.latitude, budget.longitude, budget.tanggal, budget.keterangan));

  console.log('Sample data inserted successfully');
};

// Initialize database
createTables();
insertSampleData();

console.log('Database initialized successfully');
db.close();
