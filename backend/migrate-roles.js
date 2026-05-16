const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'becakayu.db');
const db = new Database(dbPath);

try {
  console.log('Starting role migration...');
  
  // Disable foreign keys temporarily
  db.pragma('foreign_keys = OFF');
  
  // Check current role column type
  const tableInfo = db.prepare('PRAGMA table_info(users)').all();
  const roleColumn = tableInfo.find(col => col.name === 'role');
  console.log('Current role column:', roleColumn);
  
  // SQLite doesn't support ALTER COLUMN directly, need to recreate table
  db.exec('DROP TABLE IF EXISTS users_backup');
  db.exec(`
    CREATE TABLE users_backup AS 
    SELECT * FROM users
  `);
  console.log('Backup table created');
  
  // Drop original table
  db.exec('DROP TABLE users');
  console.log('Original table dropped');
  
  // Create table with new role constraint
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'pelapor' CHECK(role IN ('admin', 'editing', 'pelapor', 'viewer')),
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  console.log('New table created with role constraint');
  
  // Restore data - convert old roles to new roles
  db.exec(`
    INSERT INTO users (id, full_name, username, email, password, role, is_active, created_at, updated_at)
    SELECT 
      id, 
      full_name, 
      username, 
      email, 
      password, 
      CASE 
        WHEN role = 'admin' THEN 'admin'
        WHEN role = 'tim_perbaikan' THEN 'editing'
        ELSE 'pelapor'
      END as role,
      is_active,
      created_at,
      updated_at
    FROM users_backup
  `);
  console.log('Data restored with role conversion');
  
  // Drop backup table
  db.exec('DROP TABLE users_backup');
  console.log('Backup table dropped');
  
  // Recreate indexes
  db.exec('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
  console.log('Indexes recreated');
  
  // Re-enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Verify migration
  const users = db.prepare('SELECT id, username, role FROM users').all();
  console.log('Users after migration:', users);
  
  console.log('Migration completed successfully!');
  
} catch (error) {
  console.error('Migration failed:', error);
} finally {
  db.close();
}
