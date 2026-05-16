const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth } = require('../middleware/auth');

// Get dashboard statistics
router.get('/stats', auth, async (req, res) => {
  try {
    console.log('=== Dashboard Stats Calculation ===');

    // Total assets
    const totalAssets = db.prepare('SELECT COUNT(*) as count FROM assets').get();
    console.log('Total Assets:', totalAssets.count);

    // Assets by condition - using latest report AND maintenance status
    const assetsByCondition = db.prepare(`
      SELECT
        CASE
          -- A. KONDISI BAIK: no active damage report OR latest report status = selesai
          WHEN latest_report.status IS NULL THEN 'baik'
          WHEN latest_report.status = 'selesai' THEN 'baik'
          WHEN latest_report.status = 'ditolak' THEN 'baik'

          -- C. DALAM PERBAIKAN / SEDANG PERBAIKAN: teknisi sudah klik Mulai, maintenance record exists, progress < 100%
          WHEN latest_report.status IN ('diproses', 'dalam_perbaikan', 'on_progress') THEN 'sedang_diperbaiki'

          -- B. KONDISI RUSAK: ada laporan baru, status menunggu, belum dimulai teknisi
          WHEN latest_report.status = 'pending' THEN
            CASE
              WHEN latest_report.damage_level = 'ringan' THEN 'rusak_ringan'
              ELSE 'rusak_berat'
            END

          -- Fallback to current asset condition
          ELSE a.condition_status
        END as condition_status,
        COUNT(*) as count
      FROM assets a
      LEFT JOIN (
        SELECT
          asset_id,
          status,
          damage_level,
          ROW_NUMBER() OVER (PARTITION BY asset_id ORDER BY reported_at DESC) as rn
        FROM damage_reports
      ) latest_report ON a.id = latest_report.asset_id AND latest_report.rn = 1
      GROUP BY condition_status
    `).all();

    console.log('Assets by Condition:', assetsByCondition);

    // Calculate individual counts
    const countBaik = (assetsByCondition.find(c => c.condition_status === 'baik')?.count || 0);
    const countRusakRingan = (assetsByCondition.find(c => c.condition_status === 'rusak_ringan')?.count || 0);
    const countRusakBerat = (assetsByCondition.find(c => c.condition_status === 'rusak_berat')?.count || 0);
    const countSedangPerbaikan = (assetsByCondition.find(c => c.condition_status === 'sedang_diperbaiki')?.count || 0);
    const countSelesaiDiperbaiki = (assetsByCondition.find(c => c.condition_status === 'selesai_diperbaiki')?.count || 0);

    const totalRusak = countRusakRingan + countRusakBerat;
    const totalBaik = countBaik + countSelesaiDiperbaiki;

    console.log('Baik:', totalBaik, '(baik:', countBaik, ', selesai_diperbaiki:', countSelesaiDiperbaiki, ')');
    console.log('Rusak:', totalRusak, '(ringan:', countRusakRingan, ', berat:', countRusakBerat, ')');
    console.log('Sedang Perbaikan:', countSedangPerbaikan);

    // Total damage reports
    const totalReports = db.prepare('SELECT COUNT(*) as count FROM damage_reports').get();
    console.log('Total Reports:', totalReports.count);

    // Reports by status
    const reportsByStatus = db.prepare('SELECT status, COUNT(*) as count FROM damage_reports GROUP BY status').all();
    console.log('Reports by Status:', reportsByStatus);

    // Maintenance progress stats
    const maintenanceStats = db.prepare('SELECT status, COUNT(*) as count FROM maintenance_progress GROUP BY status').all();
    console.log('Maintenance Stats:', maintenanceStats);

    // Calculate: Sisa Belum Selesai = total laporan - laporan selesai
    const countSelesai = (reportsByStatus.find(s => s.status === 'selesai')?.count || 0);
    const sisaBelumSelesai = totalReports.count - countSelesai;
    console.log('Sisa Belum Selesai:', sisaBelumSelesai, '(total:', totalReports.count, '- selesai:', countSelesai, ')');

    // Assets by category
    const assetsByCategory = db.prepare('SELECT ac.name as category, COUNT(*) as count FROM assets a LEFT JOIN asset_categories ac ON a.category_id = ac.id GROUP BY a.category_id').all();

    // Recent reports
    const recentReports = db.prepare('SELECT dr.*, u.full_name as reporter_name FROM damage_reports dr LEFT JOIN users u ON dr.reporter_id = u.id ORDER BY dr.reported_at DESC LIMIT 5').all();

    // Verify no double count
    const totalConditions = assetsByCondition.reduce((sum, item) => sum + item.count, 0);
    console.log('Total Conditions Sum:', totalConditions);
    console.log('Match with Total Assets:', totalConditions === totalAssets.count ? '✓' : '✗');
    console.log('=== End Dashboard Stats ===');

    res.json({
      success: true,
      data: {
        totalAssets: totalAssets.count,
        totalReports: totalReports.count,
        assetsByCondition,
        reportsByStatus,
        maintenanceStats,
        assetsByCategory,
        recentReports,
        // Derived counts for easier frontend use
        derived: {
          baik: totalBaik,
          rusak: totalRusak,
          sedangPerbaikan: countSedangPerbaikan,
          selesai: countSelesai,
          sisaBelumSelesai
        }
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Get analytics data
router.get('/analytics', auth, async (req, res) => {
  try {
    console.log('=== Analytics Calculation ===');

    // Monthly damage reports
    const monthlyReports = db.prepare("SELECT strftime('%Y-%m', reported_at) as month, COUNT(*) as count FROM damage_reports WHERE reported_at >= date('now', '-12 months') GROUP BY strftime('%Y-%m', reported_at) ORDER BY month").all();

    // Repair progress over time
    const repairProgress = db.prepare("SELECT strftime('%Y-%m', updated_at) as month, AVG(progress_percentage) as avg_progress FROM maintenance_progress WHERE updated_at >= date('now', '-12 months') GROUP BY strftime('%Y-%m', updated_at) ORDER BY month").all();

    // Asset condition distribution - using same logic as stats
    const totalAssets = db.prepare('SELECT COUNT(*) as count FROM assets').get().count;
    const conditionDistribution = db.prepare(`
      SELECT
        CASE
          -- A. KONDISI BAIK: no active damage report OR latest report status = selesai
          WHEN latest_report.status IS NULL THEN 'baik'
          WHEN latest_report.status = 'selesai' THEN 'baik'
          WHEN latest_report.status = 'ditolak' THEN 'baik'

          -- C. DALAM PERBAIKAN / SEDANG PERBAIKAN: teknisi sudah klik Mulai, maintenance record exists, progress < 100%
          WHEN latest_report.status IN ('diproses', 'dalam_perbaikan', 'on_progress') THEN 'sedang_diperbaiki'

          -- B. KONDISI RUSAK: ada laporan baru, status menunggu, belum dimulai teknisi
          WHEN latest_report.status = 'pending' THEN
            CASE
              WHEN latest_report.damage_level = 'ringan' THEN 'rusak_ringan'
              ELSE 'rusak_berat'
            END

          -- Fallback to current asset condition
          ELSE a.condition_status
        END as condition_status,
        COUNT(*) as count
      FROM assets a
      LEFT JOIN (
        SELECT
          asset_id,
          status,
          damage_level,
          ROW_NUMBER() OVER (PARTITION BY asset_id ORDER BY reported_at DESC) as rn
        FROM damage_reports
      ) latest_report ON a.id = latest_report.asset_id AND latest_report.rn = 1
      GROUP BY condition_status
    `).all().map(item => ({
      ...item,
      percentage: totalAssets > 0 ? (item.count / totalAssets) * 100 : 0
    }));

    console.log('Condition Distribution:', conditionDistribution);
    console.log('=== End Analytics ===');

    res.json({
      success: true,
      data: {
        monthlyReports,
        repairProgress,
        conditionDistribution
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

module.exports = router;
