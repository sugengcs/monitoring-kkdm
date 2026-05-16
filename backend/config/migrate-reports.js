const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database/becakayu.db');
const db = new Database(dbPath);

try {
  // Add is_read column to damage_reports if not exists
  try {
    db.exec('ALTER TABLE damage_reports ADD COLUMN is_read INTEGER DEFAULT 0');
    console.log('Added is_read column to damage_reports');
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('is_read column already exists in damage_reports');
    } else {
      console.log('Error adding is_read:', error.message);
    }
  }

  // Add updated_at column to damage_reports if not exists (without default)
  try {
    db.exec('ALTER TABLE damage_reports ADD COLUMN updated_at TEXT');
    db.exec('UPDATE damage_reports SET updated_at = reported_at WHERE updated_at IS NULL');
    console.log('Added updated_at column to damage_reports');
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('updated_at column already exists in damage_reports');
    } else {
      console.log('Error adding updated_at:', error.message);
    }
  }

  // Add technician_name column to damage_reports if not exists
  try {
    db.exec('ALTER TABLE damage_reports ADD COLUMN technician_name TEXT');
    console.log('Added technician_name column to damage_reports');
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('technician_name column already exists in damage_reports');
    } else {
      console.log('Error adding technician_name:', error.message);
    }
  }

  // Add technician_notes column to damage_reports if not exists
  try {
    db.exec('ALTER TABLE damage_reports ADD COLUMN technician_notes TEXT');
    console.log('Added technician_notes column to damage_reports');
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('technician_notes column already exists in damage_reports');
    } else {
      console.log('Error adding technician_notes:', error.message);
    }
  }

  // Add estimated_time column to damage_reports if not exists
  try {
    db.exec('ALTER TABLE damage_reports ADD COLUMN estimated_time TEXT');
    console.log('Added estimated_time column to damage_reports');
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('estimated_time column already exists in damage_reports');
    } else {
      console.log('Error adding estimated_time:', error.message);
    }
  }

  // Add rejection_reason column to damage_reports if not exists
  try {
    db.exec('ALTER TABLE damage_reports ADD COLUMN rejection_reason TEXT');
    console.log('Added rejection_reason column to damage_reports');
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('rejection_reason column already exists in damage_reports');
    } else {
      console.log('Error adding rejection_reason:', error.message);
    }
  }

  // Add photo_after column to damage_reports if not exists
  try {
    db.exec('ALTER TABLE damage_reports ADD COLUMN photo_after TEXT');
    console.log('Added photo_after column to damage_reports');
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('photo_after column already exists in damage_reports');
    } else {
      console.log('Error adding photo_after:', error.message);
    }
  }

  // Create report_activities table
  db.exec(`
    CREATE TABLE IF NOT EXISTS report_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      activity_type TEXT NOT NULL,
      description TEXT NOT NULL,
      performed_by INTEGER,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (report_id) REFERENCES damage_reports(id) ON DELETE CASCADE,
      FOREIGN KEY (performed_by) REFERENCES users(id)
    )
  `);
  console.log('Created report_activities table');

  console.log('Migration completed successfully');
} catch (error) {
  console.error('Migration failed:', error);
} finally {
  db.close();
}
