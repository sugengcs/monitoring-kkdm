const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database/becakayu.db');
const db = new Database(dbPath);

// Get all maintenance budget data
router.get('/', (req, res) => {
  try {
    const data = db.prepare('SELECT * FROM maintenance_budget ORDER BY created_at DESC').all();
    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error fetching maintenance budget:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get single maintenance budget by id
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = db.prepare('SELECT * FROM maintenance_budget WHERE id = ?').get(id);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Data not found' });
    }
    res.json({ success: true, data: data });
  } catch (error) {
    console.error('Error fetching maintenance budget:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get statistics
router.get('/stats/summary', (req, res) => {
  try {
    const totalAnggaran = db.prepare('SELECT SUM(anggaran) as total FROM maintenance_budget').get();
    const totalRealisasi = db.prepare('SELECT SUM(realisasi) as total FROM maintenance_budget').get();
    const totalSisa = db.prepare('SELECT SUM(sisa) as total FROM maintenance_budget').get();
    const avgProgress = db.prepare('SELECT AVG(progress) as avg FROM maintenance_budget').get();
    
    const persentaseRealisasi = totalAnggaran.total > 0 
      ? ((totalRealisasi.total / totalAnggaran.total) * 100).toFixed(2) 
      : 0;

    res.json({
      success: true,
      data: {
        totalAnggaran: totalAnggaran.total || 0,
        totalRealisasi: totalRealisasi.total || 0,
        totalSisa: totalSisa.total || 0,
        persentaseRealisasi: parseFloat(persentaseRealisasi),
        avgProgress: avgProgress.avg || 0
      }
    });
  } catch (error) {
    console.error('Error fetching maintenance budget stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create new maintenance budget
router.post('/', (req, res) => {
  try {
    const { kategori, lokasi, anggaran, realisasi, sisa, progress, status, latitude, longitude, tanggal, keterangan } = req.body;
    
    if (!kategori || !lokasi) {
      return res.status(400).json({ success: false, message: 'kategori and lokasi are required' });
    }

    const result = db.prepare(`
      INSERT INTO maintenance_budget (kategori, lokasi, anggaran, realisasi, sisa, progress, status, latitude, longitude, tanggal, keterangan)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(kategori, lokasi, anggaran || 0, realisasi || 0, sisa || 0, progress || 0, status || 'pending', latitude, longitude, tanggal, keterangan || '');

    res.status(201).json({
      success: true,
      message: 'Maintenance budget created successfully',
      data: { id: result.lastInsertRowid }
    });
  } catch (error) {
    console.error('Error creating maintenance budget:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Update maintenance budget
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { kategori, lokasi, anggaran, realisasi, sisa, progress, status, latitude, longitude, tanggal, keterangan } = req.body;

    const existing = db.prepare('SELECT * FROM maintenance_budget WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Data not found' });
    }

    db.prepare(`
      UPDATE maintenance_budget
      SET kategori = ?, lokasi = ?, anggaran = ?, realisasi = ?, sisa = ?, progress = ?, status = ?, latitude = ?, longitude = ?, tanggal = ?, keterangan = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(kategori || existing.kategori, lokasi || existing.lokasi, anggaran || existing.anggaran, realisasi || existing.realisasi, sisa || existing.sisa, progress || existing.progress, status || existing.status, latitude || existing.latitude, longitude || existing.longitude, tanggal || existing.tanggal, keterangan || existing.keterangan, id);

    res.json({ success: true, message: 'Maintenance budget updated successfully' });
  } catch (error) {
    console.error('Error updating maintenance budget:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Delete maintenance budget
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM maintenance_budget WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Data not found' });
    }

    db.prepare('DELETE FROM maintenance_budget WHERE id = ?').run(id);
    res.json({ success: true, message: 'Maintenance budget deleted successfully' });
  } catch (error) {
    console.error('Error deleting maintenance budget:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Bulk import
router.post('/import', (req, res) => {
  try {
    const { data } = req.body;
    
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid data format' });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    data.forEach(item => {
      try {
        const { kategori, lokasi, anggaran, realisasi, sisa, progress, status, latitude, longitude, tanggal, keterangan } = item;

        if (!kategori || !lokasi) {
          errorCount++;
          errors.push({ lokasi: lokasi || 'unknown', error: 'kategori and lokasi are required' });
          return;
        }

        db.prepare(`
          INSERT INTO maintenance_budget (kategori, lokasi, anggaran, realisasi, sisa, progress, status, latitude, longitude, tanggal, keterangan)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(kategori, lokasi, anggaran || 0, realisasi || 0, sisa || 0, progress || 0, status || 'pending', latitude, longitude, tanggal, keterangan || '');
        successCount++;
      } catch (error) {
        errorCount++;
        errors.push({ lokasi: item.lokasi || 'unknown', error: error.message });
      }
    });

    res.json({
      success: true,
      message: `Import completed: ${successCount} success, ${errorCount} failed`,
      data: {
        successCount,
        errorCount,
        errors
      }
    });
  } catch (error) {
    console.error('Error importing maintenance budget:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

module.exports = router;
