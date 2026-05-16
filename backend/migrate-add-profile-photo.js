const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'becakayu.db');
const db = new Database(dbPath);

try {
  console.log('Adding profile_photo column to users table...');
  
  // Check if column already exists
  const tableInfo = db.pragma('table_info(users)');
  const hasProfilePhoto = tableInfo.some(col => col.name === 'profile_photo');
  
  if (hasProfilePhoto) {
    console.log('Column profile_photo already exists');
  } else {
    // Add profile_photo column
    db.exec(`ALTER TABLE users ADD COLUMN profile_photo TEXT`);
    console.log('Column profile_photo added successfully');
  }
  
  console.log('Migration completed!');
  
} catch (error) {
  console.error('Migration failed:', error);
} finally {
  db.close();
}
