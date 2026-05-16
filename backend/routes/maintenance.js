const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Get all maintenance progress
router.get('/', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT mp.*, dr.report_number, dr.description as damage_description, 
             u.full_name as repair_team_name, a.name as asset_name
      FROM maintenance_progress mp
      LEFT JOIN damage_reports dr ON mp.report_id = dr.id
      LEFT JOIN users u ON mp.repair_team_id = u.id
      LEFT JOIN assets a ON dr.asset_id = a.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND mp.status = ?';
      params.push(status);
    }

    // If user is repair team, only show their assigned tasks
    if (req.user.role === 'teknisi') {
      query += ' AND mp.repair_team_id = ?';
      params.push(req.user.id);
    }

    query += ' ORDER BY mp.updated_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const maintenance = db.prepare(query).all(...params);

    res.json({ success: true, data: maintenance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update maintenance progress
router.put('/:id', auth, authorize('admin', 'teknisi'), upload.single('photo'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, progress_percentage, notes } = req.body;

    console.log('=== Update Progress Request ===');
    console.log('ID:', id);
    console.log('Request body:', req.body);
    console.log('User:', req.user);

    // Validate progress_percentage
    const validProgress = [0, 25, 50, 75, 100];
    if (progress_percentage !== undefined && progress_percentage !== null) {
      const progressInt = parseInt(progress_percentage);
      if (isNaN(progressInt) || !validProgress.includes(progressInt)) {
        return res.status(400).json({
          success: false,
          message: 'Progress percentage must be one of: 0, 25, 50, 75, 100'
        });
      }
    }

    // Get current maintenance record
    const currentMaintenance = db.prepare('SELECT * FROM maintenance_progress WHERE id = ?').get(id);
    if (!currentMaintenance) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found' });
    }

    console.log('Current progress:', currentMaintenance.progress_percentage);
    console.log('New progress:', progress_percentage);

    const photo_path = req.file ? `/uploads/maintenance/${req.file.filename}` : null;

    // Determine status based on progress
    let newStatus = status;
    if (progress_percentage !== undefined && progress_percentage !== null) {
      const progressInt = parseInt(progress_percentage);
      if (progressInt === 0) {
        newStatus = 'pending';
      } else if (progressInt === 100) {
        newStatus = 'selesai';
      } else {
        newStatus = 'on_progress';
      }
    }

    console.log('New status:', newStatus);

    // Transaction to ensure data consistency
    const updateResult = db.transaction(() => {
      // Update maintenance progress
      const result = db.prepare(
        'UPDATE maintenance_progress SET status = ?, progress_percentage = ?, notes = ?, photo_after = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(newStatus, progress_percentage, notes, photo_path, id);

      if (result.changes === 0) {
        throw new Error('No rows updated');
      }

      // If completed, set completion time
      if (newStatus === 'selesai') {
        db.prepare('UPDATE maintenance_progress SET completed_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
      }

      // Update report status
      const report = db.prepare('SELECT report_id FROM maintenance_progress WHERE id = ?').get(id);
      if (report && report.report_id) {
        const reportStatus = newStatus === 'selesai' ? 'selesai' : (newStatus === 'on_progress' ? 'dalam_perbaikan' : 'pending');
        db.prepare('UPDATE damage_reports SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(reportStatus, report.report_id);

        // Update asset condition based on progress
        const damageReport = db.prepare('SELECT asset_id, damage_level FROM damage_reports WHERE id = ?').get(report.report_id);
        if (damageReport && damageReport.asset_id) {
          let conditionStatus = 'baik';
          if (newStatus === 'selesai') {
            conditionStatus = 'selesai_diperbaiki';
          } else if (newStatus === 'on_progress') {
            conditionStatus = 'sedang_diperbaiki';
          } else {
            // pending - use damage level
            if (damageReport.damage_level === 'ringan') {
              conditionStatus = 'rusak_ringan';
            } else {
              conditionStatus = 'rusak_berat';
            }
          }
          db.prepare('UPDATE assets SET condition_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(conditionStatus, damageReport.asset_id);
        }
      }

      // Log activity
      db.prepare(`
        INSERT INTO report_activities (report_id, activity_type, description, performed_by, metadata)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        report.report_id,
        'progress_update',
        `Progress diubah dari ${currentMaintenance.progress_percentage}% menjadi ${progress_percentage}%`,
        req.user.id,
        JSON.stringify({
          previous_progress: currentMaintenance.progress_percentage,
          new_progress: progress_percentage,
          previous_status: currentMaintenance.status,
          new_status: newStatus,
          notes
        })
      );

      return result;
    })();

    console.log('Update successful');
    console.log('=== End Update Progress ===');

    res.json({
      success: true,
      message: 'Progress berhasil diperbarui',
      progress: parseInt(progress_percentage),
      status: newStatus
    });
  } catch (error) {
    console.error('=== Update Progress Error ===');
    console.error('Error:', error);
    console.error('=== End Error ===');
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// Create maintenance history
router.post('/history', auth, authorize('admin'), async (req, res) => {
  try {
    const { asset_id, maintenance_type, description, cost, maintenance_date } = req.body;

    const result = db.prepare('INSERT INTO maintenance_history (asset_id, maintenance_type, description, cost, maintenance_date, performed_by) VALUES (?, ?, ?, ?, ?, ?)').run(asset_id, maintenance_type, description, cost, maintenance_date, req.user.id);

    res.status(201).json({
      success: true,
      message: 'Maintenance history created successfully',
      data: { id: result.lastInsertRowid }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
