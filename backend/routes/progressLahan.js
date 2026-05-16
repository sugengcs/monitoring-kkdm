const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database/becakayu.db');
const db = new Database(dbPath);

// Get all progress lahan data
router.get('/', (req, res) => {
  try {
    const data = db.prepare('SELECT * FROM progress_lahan ORDER BY no ASC').all();
    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error fetching progress lahan:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get single progress lahan by id
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = db.prepare('SELECT * FROM progress_lahan WHERE id = ?').get(id);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Data not found' });
    }
    res.json({ success: true, data: data });
  } catch (error) {
    console.error('Error fetching progress lahan:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create new progress lahan
router.post('/', (req, res) => {
  try {
    const { no, lokasi, kebutuhan, realisasi, sisa, keterangan } = req.body;
    
    if (!lokasi) {
      return res.status(400).json({ success: false, message: 'lokasi is required' });
    }

    // Check if lokasi already exists
    const existing = db.prepare('SELECT * FROM progress_lahan WHERE lokasi = ?').get(lokasi);
    if (existing) {
      return res.status(400).json({ success: false, message: 'lokasi already exists' });
    }

    const result = db.prepare(`
      INSERT INTO progress_lahan (no, lokasi, kebutuhan, realisasi, sisa, keterangan)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(no, lokasi, kebutuhan || 0, realisasi || 0, sisa || 0, keterangan || '');

    res.status(201).json({
      success: true,
      message: 'Progress lahan created successfully',
      data: { id: result.lastInsertRowid }
    });
  } catch (error) {
    console.error('Error creating progress lahan:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Update progress lahan
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { no, lokasi, kebutuhan, realisasi, sisa, keterangan } = req.body;

    const existing = db.prepare('SELECT * FROM progress_lahan WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Data not found' });
    }

    // Check if new lokasi already exists (if lokasi is being changed)
    if (lokasi && lokasi !== existing.lokasi) {
      const lokasiExists = db.prepare('SELECT * FROM progress_lahan WHERE lokasi = ? AND id != ?').get(lokasi, id);
      if (lokasiExists) {
        return res.status(400).json({ success: false, message: 'lokasi already exists' });
      }
    }

    db.prepare(`
      UPDATE progress_lahan
      SET no = ?, lokasi = ?, kebutuhan = ?, realisasi = ?, sisa = ?, keterangan = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(no || existing.no, lokasi || existing.lokasi, kebutuhan || existing.kebutuhan, realisasi || existing.realisasi, sisa || existing.sisa, keterangan || existing.keterangan, id);

    res.json({ success: true, message: 'Progress lahan updated successfully' });
  } catch (error) {
    console.error('Error updating progress lahan:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Delete progress lahan
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM progress_lahan WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Data not found' });
    }

    db.prepare('DELETE FROM progress_lahan WHERE id = ?').run(id);
    res.json({ success: true, message: 'Progress lahan deleted successfully' });
  } catch (error) {
    console.error('Error deleting progress lahan:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Bulk import/UPSERT from CSV data
router.post('/import', (req, res) => {
  try {
    const { data } = req.body;
    
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid data format' });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Begin transaction
    const transaction = db.transaction((item) => {
      const { no, lokasi, kebutuhan, realisasi, sisa, keterangan } = item;

      if (!lokasi) {
        errorCount++;
        errors.push({ lokasi: lokasi || 'unknown', error: 'lokasi is required' });
        return;
      }

      // Check if lokasi exists
      const existing = db.prepare('SELECT * FROM progress_lahan WHERE lokasi = ?').get(lokasi);
      
      if (existing) {
        // Update existing record (UPSERT)
        db.prepare(`
          UPDATE progress_lahan
          SET no = ?, kebutuhan = ?, realisasi = ?, sisa = ?, keterangan = ?, updated_at = CURRENT_TIMESTAMP
          WHERE lokasi = ?
        `).run(no || existing.no, kebutuhan || existing.kebutuhan, realisasi || existing.realisasi, sisa || existing.sisa, keterangan || existing.keterangan, lokasi);
        successCount++;
      } else {
        // Insert new record
        db.prepare(`
          INSERT INTO progress_lahan (no, lokasi, kebutuhan, realisasi, sisa, keterangan)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(no || 0, lokasi, kebutuhan || 0, realisasi || 0, sisa || 0, keterangan || '');
        successCount++;
      }
    });

    // Execute transaction for all items
    data.forEach(item => {
      try {
        transaction(item);
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
    console.error('Error importing progress lahan:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Clear all progress lahan data (use with caution)
router.delete('/', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM progress_lahan').run();
    res.json({
      success: true,
      message: `Deleted ${result.changes} records`,
      data: { deletedCount: result.changes }
    });
  } catch (error) {
    console.error('Error clearing progress lahan:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

module.exports = router;
