const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'becakayu.db');
const db = new Database(dbPath);

try {
  console.log('Adding phone column to users table...');
  
  // Check if phone column exists
  const tableInfo = db.prepare('PRAGMA table_info(users)').all();
  const hasPhone = tableInfo.some(col => col.name === 'phone');
  
  if (hasPhone) {
    console.log('Phone column already exists');
  } else {
    db.exec('ALTER TABLE users ADD COLUMN phone TEXT');
    console.log('Phone column added successfully');
  }
  
  console.log('Migration completed!');
  
} catch (error) {
  console.error('Migration failed:', error);
} finally {
  db.close();
}
