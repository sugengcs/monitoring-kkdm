const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database/becakayu.db');
const db = new Database(dbPath);

console.log('Starting migration: Make repair_team_id nullable in maintenance_progress');

try {
  // Check current schema
  const tableInfo = db.prepare("PRAGMA table_info(maintenance_progress)").all();
  console.log('Current maintenance_progress schema:', tableInfo);

  // Check if repair_team_id is NOT NULL
  const repairTeamColumn = tableInfo.find(col => col.name === 'repair_team_id');
  if (!repairTeamColumn) {
    console.error('Column repair_team_id not found in maintenance_progress table');
    process.exit(1);
  }

  if (repairTeamColumn.notnull === 0) {
    console.log('Column repair_team_id is already nullable. Migration not needed.');
    process.exit(0);
  }

  // SQLite doesn't support ALTER COLUMN directly, need to recreate table
  console.log('Recreating maintenance_progress table with nullable repair_team_id...');

  // Create new table with nullable repair_team_id
  db.exec(`
    CREATE TABLE IF NOT EXISTS maintenance_progress_new (
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

  // Copy data from old table to new table
  const insert = db.prepare(`
    INSERT INTO maintenance_progress_new 
    (id, report_id, repair_team_id, status, progress_percentage, notes, photo_after, started_at, completed_at, updated_at)
    SELECT id, report_id, repair_team_id, status, progress_percentage, notes, photo_after, started_at, completed_at, updated_at
    FROM maintenance_progress
  `);
  const result = insert.run();
  console.log(`Copied ${result.changes} rows from maintenance_progress to maintenance_progress_new`);

  // Drop old table
  db.exec('DROP TABLE maintenance_progress');

  // Rename new table to original name
  db.exec('ALTER TABLE maintenance_progress_new RENAME TO maintenance_progress');

  // Recreate indexes if needed
  db.exec('CREATE INDEX IF NOT EXISTS idx_maintenance_progress_report_id ON maintenance_progress(report_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_maintenance_progress_repair_team_id ON maintenance_progress(repair_team_id)');

  console.log('Migration completed successfully!');
  console.log('repair_team_id is now nullable in maintenance_progress table');

} catch (error) {
  console.error('Migration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.close();
}
