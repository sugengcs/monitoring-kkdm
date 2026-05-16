const Database = require('better-sqlite3');
const db = new Database('./database/becakayu.db');

console.log('=== Syncing Asset Conditions with Latest Reports ===\n');

// Get total assets
const totalAssets = db.prepare('SELECT COUNT(*) as count FROM assets').get();
console.log(`Total Assets: ${totalAssets.count}`);

// Get all assets
const assets = db.prepare('SELECT id, name, condition_status FROM assets').all();
console.log(`Fetching conditions for ${assets.length} assets...\n`);

let updatedCount = 0;
let unchangedCount = 0;
let errorCount = 0;

// For each asset, get the latest report and update condition
assets.forEach(asset => {
  try {
    // Get latest report for this asset
    const latestReport = db.prepare(`
      SELECT status, damage_level 
      FROM damage_reports 
      WHERE asset_id = ? 
      ORDER BY reported_at DESC 
      LIMIT 1
    `).get(asset.id);

    let newCondition = 'baik';

    if (latestReport) {
      // Determine condition based on latest report status
      if (latestReport.status === 'selesai') {
        newCondition = 'selesai_diperbaiki';
      } else if (latestReport.status === 'diproses' || latestReport.status === 'dalam_perbaikan') {
        newCondition = 'sedang_diperbaiki';
      } else if (latestReport.status === 'ditolak' || latestReport.status === 'pending') {
        // If rejected or pending, use damage level
        if (latestReport.damage_level === 'ringan') {
          newCondition = 'rusak_ringan';
        } else if (latestReport.damage_level === 'sedang' || latestReport.damage_level === 'berat') {
          newCondition = 'rusak_berat';
        }
      } else {
        // Default to damage level for other statuses
        if (latestReport.damage_level === 'ringan') {
          newCondition = 'rusak_ringan';
        } else if (latestReport.damage_level === 'sedang' || latestReport.damage_level === 'berat') {
          newCondition = 'rusak_berat';
        }
      }
    }

    // Update if condition changed
    if (newCondition !== asset.condition_status) {
      db.prepare('UPDATE assets SET condition_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newCondition, asset.id);
      console.log(`✓ Asset ${asset.id} (${asset.name}): ${asset.condition_status} → ${newCondition}`);
      updatedCount++;
    } else {
      unchangedCount++;
    }
  } catch (error) {
    console.error(`✗ Error updating asset ${asset.id}:`, error.message);
    errorCount++;
  }
});

console.log(`\n=== Summary ===`);
console.log(`Updated: ${updatedCount}`);
console.log(`Unchanged: ${unchangedCount}`);
console.log(`Errors: ${errorCount}`);

// Verify totals after sync
console.log(`\n=== Verification ===`);
const conditions = db.prepare('SELECT condition_status, COUNT(*) as count FROM assets GROUP BY condition_status').all();
let totalConditions = 0;
conditions.forEach(c => {
  console.log(`${c.condition_status}: ${c.count}`);
  totalConditions += c.count;
});
console.log(`Total Conditions: ${totalConditions}`);
console.log(`Total Assets: ${totalAssets.count}`);
console.log(`Match: ${totalConditions === totalAssets.count ? '✓' : '✗'}`);

db.close();
