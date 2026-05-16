const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database/becakayu.db');
const db = new Database(dbPath);

console.log('=== Running Repair Migration ===');

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = OFF');

// 1. Fix damage_reports status constraint by recreating table
const repairMigration = db.transaction(() => {

  // Check if damage_reports needs migration
  const tableInfo = db.prepare("PRAGMA table_info(damage_reports)").all();
  const hasUpdatedAt = tableInfo.some(col => col.name === 'updated_at');

  // Recreate damage_reports with correct status values + extra columns
  console.log('Recreating damage_reports with extended status values...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS damage_reports_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_number TEXT UNIQUE NOT NULL,
      asset_id INTEGER,
      reporter_id INTEGER NOT NULL,
      damage_level TEXT NOT NULL CHECK(damage_level IN ('ringan', 'sedang', 'berat')),
      description TEXT NOT NULL,
      location_lat REAL,
      location_lng REAL,
      photo_before TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN (
        'pending','on_progress','dalam_perbaikan','diproses','selesai','ditolak'
      )),
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

  // Copy existing data
  const cols = 'id,report_number,asset_id,reporter_id,damage_level,description,location_lat,location_lng,photo_before,status,reported_at';
  db.exec(`INSERT OR IGNORE INTO damage_reports_new (${cols}) SELECT ${cols} FROM damage_reports`);

  // Drop old and rename
  db.exec('DROP TABLE damage_reports');
  db.exec('ALTER TABLE damage_reports_new RENAME TO damage_reports');
  console.log('damage_reports migrated OK');

  // 2. Create repair_progress table
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
  console.log('repair_progress table OK');

  // 3. Create report_activities table
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
  console.log('report_activities table OK');

  // 4. Ensure maintenance_progress has started_at + completed_at
  const mpInfo = db.prepare("PRAGMA table_info(maintenance_progress)").all();
  const hasStartedAt = mpInfo.some(col => col.name === 'started_at');
  const hasCompletedAt = mpInfo.some(col => col.name === 'completed_at');
  if (!hasStartedAt) {
    db.exec('ALTER TABLE maintenance_progress ADD COLUMN started_at DATETIME');
    console.log('Added started_at to maintenance_progress');
  }
  if (!hasCompletedAt) {
    db.exec('ALTER TABLE maintenance_progress ADD COLUMN completed_at DATETIME');
    console.log('Added completed_at to maintenance_progress');
  }

  // 5. Ensure maintenance_progress has photo_after
  const hasPhotoAfter = mpInfo.some(col => col.name === 'photo_after');
  if (!hasPhotoAfter) {
    db.exec('ALTER TABLE maintenance_progress ADD COLUMN photo_after TEXT');
    console.log('Added photo_after to maintenance_progress');
  }
});

try {
  repairMigration();
  console.log('=== Migration completed successfully ===');
} catch (err) {
  console.error('=== Migration error:', err.message);
}

db.pragma('foreign_keys = ON');
db.close();
