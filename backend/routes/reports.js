const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth, authorize } = require('../middleware/auth');
const { teknisiOnly } = require('../middleware/role');
const upload = require('../middleware/upload');

// Get all reports (admin and editing can see all, pelapor only own)
router.get('/', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT dr.*, u.full_name as reporter_name, a.name as asset_name, mp.progress_percentage 
      FROM damage_reports dr 
      LEFT JOIN users u ON dr.reporter_id = u.id 
      LEFT JOIN assets a ON dr.asset_id = a.id
      LEFT JOIN maintenance_progress mp ON dr.id = mp.report_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND dr.status = ?';
      params.push(status);
    }

    // If user is pelapor, only show their own reports
    if (req.user.role === 'pelapor') {
      query += ' AND dr.reporter_id = ?';
      params.push(req.user.id);
    }

    query += ' ORDER BY dr.reported_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const reports = db.prepare(query).all(...params);

    res.json({ success: true, data: reports });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create damage report
router.post('/', auth, upload.single('photo'), async (req, res) => {
  try {
    const { asset_id, damage_level, description, location_lat, location_lng } = req.body;

    // Validate required fields
    if (!damage_level) {
      return res.status(400).json({ success: false, message: 'damage_level is required' });
    }
    if (!description) {
      return res.status(400).json({ success: false, message: 'description is required' });
    }
    if (!location_lat || !location_lng) {
      return res.status(400).json({ success: false, message: 'location_lat and location_lng are required' });
    }

    const report_number = 'RPT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const photo_path = req.file ? `/uploads/reports/${req.file.filename}` : null;

    const result = db.prepare('INSERT INTO damage_reports (report_number, asset_id, reporter_id, damage_level, description, location_lat, location_lng, photo_before) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(report_number, asset_id || null, req.user.id, damage_level, description, location_lat, location_lng, photo_path);

    // Create maintenance progress record for this report
    db.prepare(`
      INSERT INTO maintenance_progress (report_id, repair_team_id, status, progress_percentage, notes, started_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(result.lastInsertRowid, null, 'pending', 0, 'Laporan baru dibuat, menunggu penugasan tim perbaikan');

    // Update asset condition status based on damage level (only if asset_id is provided)
    if (asset_id) {
      let conditionStatus = 'baik';
      if (damage_level === 'ringan') {
        conditionStatus = 'rusak_ringan';
      } else if (damage_level === 'sedang' || damage_level === 'berat') {
        conditionStatus = 'rusak_berat';
      }
      
      db.prepare('UPDATE assets SET condition_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(conditionStatus, asset_id);
    }

    // Create notification for admin
    db.prepare('INSERT INTO notifications (user_id, title, message, type) SELECT id, ?, ?, ? FROM users WHERE role = ?').run(`Laporan Kerusakan Baru - ${report_number}`, `Laporan kerusakan baru telah dibuat oleh ${req.user.full_name}`, 'warning', 'admin');

    res.status(201).json({
      success: true,
      message: 'Damage report created successfully',
      data: { id: result.lastInsertRowid, report_number }
    });
  } catch (error) {
    console.error('Error creating report:', error.message);
    console.error('Request body:', req.body);
    console.error('Error stack:', error.stack);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Ensure maintenance_progress exists for a report (auto-create if missing)
router.post('/:id/ensure-maintenance', auth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[Ensure Maintenance] Request for report ${id} by user ${req.user.id} (${req.user.role})`);

    const existing = db.prepare('SELECT id, repair_team_id FROM maintenance_progress WHERE report_id = ?').get(id);
    if (existing) {
      console.log(`[Ensure Maintenance] Existing record found: ${existing.id}, repair_team_id: ${existing.repair_team_id}`);
      return res.json({ success: true, data: existing });
    }

    // If teknisi is calling, assign them as repair team
    const repairTeamId = req.user.role === 'teknisi' ? req.user.id : null;
    console.log(`[Ensure Maintenance] Creating new record with repair_team_id: ${repairTeamId}`);

    const result = db.prepare(`
      INSERT INTO maintenance_progress (report_id, repair_team_id, status, progress_percentage, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, repairTeamId, 'pending', 0, 'Maintenance record auto-created');

    console.log(`[Ensure Maintenance] Created record ${result.lastInsertRowid} successfully`);
    res.json({ success: true, data: { id: result.lastInsertRowid } });
  } catch (error) {
    console.error('[Ensure Maintenance] Error:', error.message);
    console.error('[Ensure Maintenance] Stack:', error.stack);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Get report by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const report = db.prepare(`SELECT dr.*, u.full_name as reporter_name, a.name as asset_name FROM damage_reports dr LEFT JOIN users u ON dr.reporter_id = u.id LEFT JOIN assets a ON dr.asset_id = a.id WHERE dr.id = ?`).get(id);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // Get maintenance progress
    const progress = db.prepare('SELECT * FROM maintenance_progress WHERE report_id = ? ORDER BY updated_at DESC').all(id);

    res.json({
      success: true,
      data: { ...report, maintenance_progress: progress }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update report status (admin and editing only)
router.put('/:id/status', auth, teknisiOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, technician_name, technician_notes, estimated_time, rejection_reason, progress } = req.body;

    console.log('Updating report status:', { id, status, user: req.user });

    // Get current status and asset_id for logging
    const currentReport = db.prepare('SELECT status, asset_id FROM damage_reports WHERE id = ?').get(id);
    const previousStatus = currentReport ? currentReport.status : 'pending';
    const assetId = currentReport ? currentReport.asset_id : null;

    // Update report status
    const updateQuery = `
      UPDATE damage_reports 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    db.prepare(updateQuery).run(status, id);

    // Update asset condition based on report status
    if (assetId) {
      let conditionStatus = 'baik';
      if (status === 'diproses' || status === 'dalam_perbaikan') {
        conditionStatus = 'sedang_diperbaiki';
      } else if (status === 'selesai') {
        conditionStatus = 'selesai_diperbaiki';
      } else if (status === 'ditolak' || status === 'pending') {
        // Keep current condition or revert based on damage level
        const report = db.prepare('SELECT damage_level FROM damage_reports WHERE id = ?').get(id);
        if (report) {
          if (report.damage_level === 'ringan') {
            conditionStatus = 'rusak_ringan';
          } else {
            conditionStatus = 'rusak_berat';
          }
        }
      }
      
      db.prepare('UPDATE assets SET condition_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(conditionStatus, assetId);
    }

    // Also update technician fields if provided
    if (technician_name) {
      db.prepare('UPDATE damage_reports SET technician_name = ? WHERE id = ?').run(technician_name, id);
    }
    if (technician_notes) {
      db.prepare('UPDATE damage_reports SET technician_notes = ? WHERE id = ?').run(technician_notes, id);
    }
    if (estimated_time) {
      db.prepare('UPDATE damage_reports SET estimated_time = ? WHERE id = ?').run(estimated_time, id);
    }
    if (rejection_reason) {
      db.prepare('UPDATE damage_reports SET rejection_reason = ? WHERE id = ?').run(rejection_reason, id);
    }

    // Save timeline entry to repair_progress
    try {
      db.prepare(`INSERT INTO repair_progress (report_id, status, notes, updated_by) VALUES (?, ?, ?, ?)`)
        .run(id, status, technician_notes || `Status diubah dari ${previousStatus} ke ${status}`, req.user.id);
    } catch (_) { /* table may not exist on old installs */ }

    // Sync maintenance_progress status
    const mp = db.prepare('SELECT id, repair_team_id FROM maintenance_progress WHERE report_id = ?').get(id);
    if (mp) {
      let mpStatus = 'pending';
      if (status === 'dalam_perbaikan' || status === 'on_progress' || status === 'diproses') mpStatus = 'on_progress';
      if (status === 'selesai') mpStatus = 'selesai';
      const mpProgress = status === 'selesai' ? 100 : (status === 'dalam_perbaikan' || status === 'on_progress' ? 25 : 0);

      // If teknisi is starting repair and repair_team_id is null, assign them
      let repairTeamId = mp.repair_team_id;
      if (req.user.role === 'teknisi' && status === 'dalam_perbaikan' && !mp.repair_team_id) {
        repairTeamId = req.user.id;
        console.log(`[Start Repair] Assigning teknisi ${req.user.id} to maintenance_progress ${mp.id}`);
      }

      db.prepare('UPDATE maintenance_progress SET status = ?, progress_percentage = ?, repair_team_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(mpStatus, mpProgress, repairTeamId, mp.id);

      // If starting repair, set started_at timestamp
      if (status === 'dalam_perbaikan' && !mp.started_at) {
        db.prepare('UPDATE maintenance_progress SET started_at = CURRENT_TIMESTAMP WHERE id = ?').run(mp.id);
      }
    }

    // Log activity
    const activityQuery = `
      INSERT INTO report_activities (report_id, activity_type, description, performed_by, metadata)
      VALUES (?, ?, ?, ?, ?)
    `;
    const metadata = JSON.stringify({
      previous_status: previousStatus,
      new_status: status,
      technician_name,
      progress,
      rejection_reason
    });
    db.prepare(activityQuery).run(
      id,
      'status_update',
      `Status berubah menjadi ${status}`,
      req.user.id,
      metadata
    );

    // Create notification for pelapor
    if (status !== previousStatus) {
      const report = db.prepare('SELECT reporter_id, report_number FROM damage_reports WHERE id = ?').get(id);
      if (report && report.reporter_id) {
        db.prepare(`
          INSERT INTO notifications (user_id, title, message, type)
          VALUES (?, ?, ?, ?)
        `).run(
          report.reporter_id,
          `Update Laporan - ${report.report_number}`,
          `Status laporan Anda telah diubah menjadi ${status}`,
          'info'
        );
      }
    }

    res.json({
      success: true,
      message: 'Report status updated successfully'
    });
  } catch (error) {
    console.error('Error updating report status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Assign teknisi to a report (admin only)
router.put('/:id/assign', auth, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { repair_team_id } = req.body;
    if (!repair_team_id) return res.status(400).json({ success: false, message: 'repair_team_id required' });

    const mp = db.prepare('SELECT id FROM maintenance_progress WHERE report_id = ?').get(id);
    if (!mp) return res.status(404).json({ success: false, message: 'Maintenance record not found' });

    db.prepare('UPDATE maintenance_progress SET repair_team_id = ?, updated_at = CURRENT_TIMESTAMP WHERE report_id = ?')
      .run(repair_team_id, id);

    const teknisi = db.prepare('SELECT full_name FROM users WHERE id = ?').get(repair_team_id);
    res.json({ success: true, message: `Teknisi ${teknisi?.full_name || ''} berhasil ditugaskan` });
  } catch (error) {
    console.error('[Assign] Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Delete report (admin only)
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    console.log('=== Delete Report Request ===');
    console.log('ID:', id);
    console.log('User:', req.user);

    // Transaction to ensure data consistency
    const result = db.transaction(() => {
      // Delete related maintenance progress
      const maintenanceResult = db.prepare('DELETE FROM maintenance_progress WHERE report_id = ?').run(id);
      console.log(`Deleted ${maintenanceResult.changes} maintenance progress records`);

      // Delete related report activities
      const activitiesResult = db.prepare('DELETE FROM report_activities WHERE report_id = ?').run(id);
      console.log(`Deleted ${activitiesResult.changes} activity records`);

      // Delete related repair progress
      const repairProgressResult = db.prepare('DELETE FROM repair_progress WHERE report_id = ?').run(id);
      console.log(`Deleted ${repairProgressResult.changes} repair progress records`);

      // Delete the report
      const reportResult = db.prepare('DELETE FROM damage_reports WHERE id = ?').run(id);
      console.log(`Deleted ${reportResult.changes} report records`);

      if (reportResult.changes === 0) {
        throw new Error('Report not found');
      }

      return reportResult;
    })();

    console.log('Delete successful');
    console.log('=== End Delete Report ===');

    res.json({ success: true, message: 'Report deleted successfully' });
  } catch (error) {
    console.error('=== Delete Report Error ===');
    console.error('Error:', error);
    console.error('=== End Error ===');
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Get repair progress for a report
router.get('/:id/progress', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const progress = db.prepare(`
      SELECT rp.*, u.full_name as updated_by_name 
      FROM repair_progress rp 
      LEFT JOIN users u ON rp.updated_by = u.id 
      WHERE rp.report_id = ? 
      ORDER BY rp.created_at DESC
    `).all(id);

    res.json({ success: true, data: progress });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get report activities
router.get('/:id/activities', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const activities = db.prepare(`
      SELECT ra.*, u.full_name as performer_name 
      FROM report_activities ra 
      LEFT JOIN users u ON ra.performed_by = u.id 
      WHERE ra.report_id = ? 
      ORDER BY ra.created_at DESC
    `).all(id);

    res.json({ success: true, data: activities });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Mark report as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const { id } = req.params;

    db.prepare('UPDATE damage_reports SET is_read = 1 WHERE id = ?').run(id);

    res.json({ success: true, message: 'Marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Mark all reports as read
router.put('/read-all', auth, authorize(['admin']), async (req, res) => {
  try {
    db.prepare('UPDATE damage_reports SET is_read = 1 WHERE is_read = 0').run();

    res.json({ success: true, message: 'All reports marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get repair report summary
router.get('/summary', auth, async (req, res) => {
  try {
    const { start_date, end_date, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        DATE(reported_at) as tanggal,
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('diproses', 'dalam_perbaikan') THEN 1 ELSE 0 END) as perbaikan,
        SUM(CASE WHEN status = 'selesai' THEN 1 ELSE 0 END) as selesai,
        SUM(CASE WHEN status = 'pending' OR status = 'ditolak' THEN 1 ELSE 0 END) as sisa
      FROM damage_reports
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      query += ' AND DATE(reported_at) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND DATE(reported_at) <= ?';
      params.push(end_date);
    }

    query += ' GROUP BY DATE(reported_at) ORDER BY tanggal DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const data = db.prepare(query).all(...params);

    // Get totals
    let totalQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('diproses', 'dalam_perbaikan') THEN 1 ELSE 0 END) as total_perbaikan,
        SUM(CASE WHEN status = 'selesai' THEN 1 ELSE 0 END) as total_selesai,
        SUM(CASE WHEN status = 'pending' OR status = 'ditolak' THEN 1 ELSE 0 END) as total_sisa
      FROM damage_reports
      WHERE 1=1
    `;
    const totalParams = [];

    if (start_date) {
      totalQuery += ' AND DATE(reported_at) >= ?';
      totalParams.push(start_date);
    }

    if (end_date) {
      totalQuery += ' AND DATE(reported_at) <= ?';
      totalParams.push(end_date);
    }

    const totals = db.prepare(totalQuery).get(...totalParams);

    // Get count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT DATE(reported_at)) as count
      FROM damage_reports
      WHERE 1=1
    `;
    const countParams = [];

    if (start_date) {
      countQuery += ' AND DATE(reported_at) >= ?';
      countParams.push(start_date);
    }

    if (end_date) {
      countQuery += ' AND DATE(reported_at) <= ?';
      countParams.push(end_date);
    }

    const { count } = db.prepare(countQuery).get(...countParams);

    res.json({
      success: true,
      data,
      totals,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
