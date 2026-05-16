const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'becakayu.db');
const db = new Database(dbPath);

try {
  console.log('Creating repair_progress table...');
  
  db.pragma('foreign_keys = OFF');
  
  // Check if table exists
  const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='repair_progress'").get();
  
  if (tableExists) {
    console.log('Table repair_progress already exists');
  } else {
    db.exec(`
      CREATE TABLE repair_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id INTEGER NOT NULL,
        status TEXT NOT NULL,
        notes TEXT,
        updated_by INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (report_id) REFERENCES damage_reports(id) ON DELETE CASCADE,
        FOREIGN KEY (updated_by) REFERENCES users(id)
      )
    `);
    console.log('Table repair_progress created');
    
    // Create indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_repair_progress_report_id ON repair_progress(report_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_repair_progress_updated_by ON repair_progress(updated_by)');
    console.log('Indexes created');
  }
  
  db.pragma('foreign_keys = ON');
  
  console.log('Migration completed successfully!');
  
} catch (error) {
  console.error('Migration failed:', error);
} finally {
  db.close();
}
