const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'database', 'becakayu.db');
const db = new Database(dbPath);

try {
  console.log('Checking admin user...');
  
  const admin = db.prepare('SELECT id, username, password, is_active FROM users WHERE username = ?').get('admin');
  
  if (!admin) {
    console.log('Admin user not found. Creating admin user...');
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync('admin123', salt);
    
    db.prepare('INSERT INTO users (username, email, password, password_plain, full_name, role, phone, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run('admin', 'admin@becakayu.co.id', hashedPassword, 'admin123', 'Administrator', 'admin', '081234567890', 1);
    
    console.log('Admin user created successfully');
  } else {
    console.log('Admin user found:');
    console.log('- ID:', admin.id);
    console.log('- Username:', admin.username);
    console.log('- Is Active:', admin.is_active);
    console.log('- Password hash exists:', !!admin.password);
    
    // Check if is_active is 1
    if (!admin.is_active) {
      console.log('Admin user is inactive. Activating...');
      db.prepare('UPDATE users SET is_active = 1 WHERE username = ?').run('admin');
      console.log('Admin user activated');
    }
    
    // Reset password to admin123
    console.log('Resetting password to admin123...');
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync('admin123', salt);
    
    db.prepare('UPDATE users SET password = ?, password_plain = ? WHERE username = ?')
      .run(hashedPassword, 'admin123', 'admin');
    
    console.log('Password reset to admin123');
  }
  
  // List all users
  const users = db.prepare('SELECT id, username, role, is_active FROM users').all();
  console.log('\nAll users:');
  users.forEach(user => {
    console.log(`- ${user.username} (${user.role}) - Active: ${user.is_active}`);
  });
  
} catch (error) {
  console.error('Error:', error);
} finally {
  db.close();
}
