const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'becakayu.db');
const db = new Database(dbPath);

try {
  console.log('Starting role rename migration...');
  
  db.pragma('foreign_keys = OFF');
  
  // Backup table
  db.exec('DROP TABLE IF EXISTS users_backup');
  db.exec('CREATE TABLE users_backup AS SELECT * FROM users');
  console.log('Backup created');
  
  // Drop original
  db.exec('DROP TABLE users');
  console.log('Original table dropped');
  
  // Create with new role names
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'karyawan' CHECK(role IN ('admin', 'teknisi', 'karyawan', 'manager')),
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  console.log('New table created with renamed roles');
  
  // Migrate data with renamed roles
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
        WHEN role = 'editing' THEN 'teknisi'
        WHEN role = 'pelapor' THEN 'karyawan'
        WHEN role = 'viewer' THEN 'manager'
        ELSE 'karyawan'
      END as role,
      is_active,
      created_at,
      updated_at
    FROM users_backup
  `);
  console.log('Data migrated with renamed roles');
  
  db.exec('DROP TABLE users_backup');
  
  // Recreate indexes
  db.exec('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
  
  db.pragma('foreign_keys = ON');
  
  const users = db.prepare('SELECT id, username, role FROM users').all();
  console.log('Users after migration:', users);
  
  console.log('Role rename migration completed!');
  
} catch (error) {
  console.error('Migration failed:', error);
} finally {
  db.close();
}
