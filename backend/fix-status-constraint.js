const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Use the correct database path
const dbDir = path.join(__dirname, 'database');
const dbPath = path.join(dbDir, 'becakayu.db');

console.log('Database path:', dbPath);
console.log('Database exists:', fs.existsSync(dbPath));

if (!fs.existsSync(dbPath)) {
  console.error('Database file not found!');
  process.exit(1);
}

const db = new Database(dbPath);

try {
  console.log('Database path:', dbPath);
  
  // Check current constraint
  const tableInfo = db.prepare('PRAGMA table_info(damage_reports)').all();
  console.log('Current damage_reports columns:', tableInfo.map(c => c.name));
  
  // SQLite doesn't support ALTER TABLE to modify CHECK constraint directly
  // We need to recreate the table with the new constraint
  
  console.log('Starting migration to update status constraint...');
  
  // 1. Create backup table
  db.exec('DROP TABLE IF EXISTS damage_reports_backup');
  db.exec(`
    CREATE TABLE damage_reports_backup AS 
    SELECT * FROM damage_reports
  `);
  console.log('Backup table created');
  
  // 2. Drop the original table
  db.exec('DROP TABLE damage_reports');
  console.log('Original table dropped');
  
  // 3. Create table with new constraint
  db.exec(`
    CREATE TABLE damage_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_number TEXT UNIQUE NOT NULL,
      asset_id INTEGER,
      reporter_id INTEGER NOT NULL,
      damage_level TEXT NOT NULL CHECK(damage_level IN ('ringan', 'sedang', 'berat')),
      description TEXT NOT NULL,
      location_lat REAL,
      location_lng REAL,
      photo_before TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'diproses', 'dalam_perbaikan', 'selesai', 'ditolak')),
      is_read INTEGER DEFAULT 0,
      updated_at TEXT,
      technician_name TEXT,
      technician_notes TEXT,
      estimated_time TEXT,
      rejection_reason TEXT,
      photo_after TEXT,
      reported_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (asset_id) REFERENCES assets(id),
      FOREIGN KEY (reporter_id) REFERENCES users(id)
    )
  `);
  console.log('New table created with updated constraint');
  
  // 4. Restore data from backup
  db.exec(`
    INSERT INTO damage_reports 
    SELECT * FROM damage_reports_backup
  `);
  console.log('Data restored from backup');
  
  // 5. Drop backup table
  db.exec('DROP TABLE damage_reports_backup');
  console.log('Backup table dropped');
  
  // 6. Recreate indexes if needed
  db.exec('CREATE INDEX IF NOT EXISTS idx_reports_status ON damage_reports(status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_reports_reporter ON damage_reports(reporter_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_reports_asset ON damage_reports(asset_id)');
  console.log('Indexes recreated');
  
  console.log('Migration completed successfully!');
  console.log('New allowed statuses: pending, diproses, dalam_perbaikan, selesai, ditolak');
  
} catch (error) {
  console.error('Migration failed:', error);
} finally {
  db.close();
}
