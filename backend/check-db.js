const db = require('./config/database');

// Check tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name));

// Check report_activities table structure
try {
  const columns = db.prepare("PRAGMA table_info(report_activities)").all();
  console.log('report_activities columns:', columns.map(c => c.name));
} catch (error) {
  console.log('report_activities table error:', error.message);
}

// Check damage_reports table structure
try {
  const columns = db.prepare("PRAGMA table_info(damage_reports)").all();
  console.log('damage_reports columns:', columns.map(c => c.name));
} catch (error) {
  console.log('damage_reports table error:', error.message);
}

// Check if there are reports
const reports = db.prepare("SELECT COUNT(*) as count FROM damage_reports").get();
console.log('Total reports:', reports.count);

// Check admin user
const admin = db.prepare("SELECT id, username, is_active, role FROM users WHERE username = 'admin'").get();
console.log('Admin user:', admin);

db.close();
