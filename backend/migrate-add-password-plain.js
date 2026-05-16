const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'becakayu.db');
const db = new Database(dbPath);

try {
  console.log('Adding password_plain column to users table...');
  
  // Check if column already exists
  const tableInfo = db.pragma('table_info(users)');
  const hasPasswordPlain = tableInfo.some(col => col.name === 'password_plain');
  
  if (hasPasswordPlain) {
    console.log('Column password_plain already exists');
  } else {
    // Add password_plain column
    db.exec(`ALTER TABLE users ADD COLUMN password_plain TEXT`);
    console.log('Column password_plain added successfully');
  }
  
  console.log('Migration completed!');
  
} catch (error) {
  console.error('Migration failed:', error);
} finally {
  db.close();
}
