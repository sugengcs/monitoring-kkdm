const db = require('./config/database');
const bcrypt = require('bcryptjs');

// Reset admin password to 'admin123'
const salt = bcrypt.genSaltSync(10);
const hashedPassword = bcrypt.hashSync('admin123', salt);

const result = db.prepare('UPDATE users SET password = ? WHERE username = ?').run(hashedPassword, 'admin');

console.log('Password admin berhasil direset');
console.log('Username: admin');
console.log('Password: admin123');
console.log('Affected rows:', result.changes);

db.close();
