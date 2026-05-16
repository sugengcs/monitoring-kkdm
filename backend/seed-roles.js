const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'database', 'becakayu.db');
const db = new Database(dbPath);

try {
  console.log('Creating seed data for new roles...');
  
  // Create Editing user
  const editingPassword = bcrypt.hashSync('editing123', bcrypt.genSaltSync(10));
  const editingExists = db.prepare('SELECT id FROM users WHERE username = ?').get('editing');
  
  if (!editingExists) {
    db.prepare(`
      INSERT INTO users (username, email, password, full_name, role, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('editing', 'editing@becakayu.com', editingPassword, 'Editing User', 'editing', 1);
    console.log('Editing user created');
  } else {
    console.log('Editing user already exists');
  }
  
  // Create Pelapor user
  const pelaporPassword = bcrypt.hashSync('pelapor123', bcrypt.genSaltSync(10));
  const pelaporExists = db.prepare('SELECT id FROM users WHERE username = ?').get('pelapor');
  
  if (!pelaporExists) {
    db.prepare(`
      INSERT INTO users (username, email, password, full_name, role, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('pelapor', 'pelapor@becakayu.com', pelaporPassword, 'Pelapor User', 'pelapor', 1);
    console.log('Pelapor user created');
  } else {
    console.log('Pelapor user already exists');
  }
  
  // Verify users
  const users = db.prepare('SELECT username, role FROM users').all();
  console.log('Current users:', users);
  
  console.log('Seed data creation completed!');
  console.log('\nTest credentials:');
  console.log('Editing user: username=editing, password=editing123');
  console.log('Pelapor user: username=pelapor, password=pelapor123');
  
} catch (error) {
  console.error('Seed data creation failed:', error);
} finally {
  db.close();
}
