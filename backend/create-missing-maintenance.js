const Database = require('better-sqlite3');
const db = new Database('./database/becakayu.db');

console.log('=== Creating Missing Maintenance Progress Records ===\n');

// Get admin user ID to use as default repair_team_id
const adminUser = db.prepare('SELECT id FROM users WHERE role = ? LIMIT 1').get('admin');
const defaultRepairTeamId = adminUser ? adminUser.id : 1;

console.log(`Using default repair_team_id: ${defaultRepairTeamId}\n`);

// Get all reports
const reports = db.prepare('SELECT id, report_number, status FROM damage_reports').all();
console.log(`Total reports: ${reports.length}`);

// Get existing maintenance progress records
const existingMaintenance = db.prepare('SELECT report_id FROM maintenance_progress').all();
const existingReportIds = new Set(existingMaintenance.map(m => m.report_id));

let createdCount = 0;
let skippedCount = 0;

reports.forEach(report => {
  if (!existingReportIds.has(report.id)) {
    try {
      // Determine initial progress based on report status
      let progressPercentage = 0;
      let status = 'pending';
      let notes = 'Laporan baru dibuat, menunggu penugasan tim perbaikan';
      
      if (report.status === 'diproses' || report.status === 'dalam_perbaikan') {
        progressPercentage = 25;
        status = 'on_progress';
        notes = 'Perbaikan sedang berjalan';
      } else if (report.status === 'selesai') {
        progressPercentage = 100;
        status = 'selesai';
        notes = 'Perbaikan selesai';
      }
      
      db.prepare(`
        INSERT INTO maintenance_progress (report_id, repair_team_id, status, progress_percentage, notes, started_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(report.id, defaultRepairTeamId, status, progressPercentage, notes);
      
      console.log(`✓ Created maintenance record for report ${report.report_number} (status: ${report.status}, progress: ${progressPercentage}%)`);
      createdCount++;
    } catch (error) {
      console.error(`✗ Error creating maintenance for report ${report.id}:`, error.message);
    }
  } else {
    skippedCount++;
  }
});

console.log(`\n=== Summary ===`);
console.log(`Created: ${createdCount}`);
console.log(`Skipped (already exists): ${skippedCount}`);

db.close();
