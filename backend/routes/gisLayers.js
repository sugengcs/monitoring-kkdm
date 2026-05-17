const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const dbPath = path.join(__dirname, '../database/becakayu.db');
const db = new Database(dbPath);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/gis');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.kml', '.kmz', '.geojson', '.json', '.shp', '.zip'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .kml, .kmz, .geojson, .shp, and .zip files are allowed.'));
    }
  }
});

// Create table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS gis_layers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    file_type TEXT NOT NULL,
    seksi TEXT,
    color TEXT DEFAULT '#3B82F6',
    geojson TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// Get all GIS layers
router.get('/', (req, res) => {
  try {
    const layers = db.prepare('SELECT * FROM gis_layers ORDER BY uploaded_at DESC').all();
    res.json({
      success: true,
      data: layers
    });
  } catch (error) {
    console.error('Error fetching GIS layers:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get single GIS layer by id
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const layer = db.prepare('SELECT * FROM gis_layers WHERE id = ?').get(id);
    if (!layer) {
      return res.status(404).json({ success: false, message: 'Layer not found' });
    }
    res.json({ success: true, data: layer });
  } catch (error) {
    console.error('Error fetching GIS layer:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Upload GIS layer
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { name, seksi } = req.body;
    const filename = req.file.filename;
    const filepath = req.file.path;
    const file_type = path.extname(req.file.originalname).toLowerCase().replace('.', '');

    // Determine color based on seksi
    let color = '#3B82F6'; // Default blue
    if (seksi) {
      const seksiUpper = seksi.toUpperCase();
      if (seksiUpper.includes('1A')) color = '#06B6D4';
      else if (seksiUpper.includes('1B')) color = '#8B5CF6';
      else if (seksiUpper.includes('1C')) color = '#EC4899';
      else if (seksiUpper.includes('2A')) color = '#F59E0B';
      else if (seksiUpper.includes('2B')) color = '#10B981';
    }

    const result = db.prepare(`
      INSERT INTO gis_layers (name, filename, filepath, file_type, seksi, color)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name || req.file.originalname, filename, filepath, file_type, seksi || null, color);

    res.status(201).json({
      success: true,
      message: 'GIS layer uploaded successfully',
      data: { id: result.lastInsertRowid }
    });
  } catch (error) {
    console.error('Error uploading GIS layer:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Update GIS layer GeoJSON
router.put('/:id/geojson', (req, res) => {
  try {
    const { id } = req.params;
    const { geojson } = req.body;

    const existing = db.prepare('SELECT * FROM gis_layers WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Layer not found' });
    }

    db.prepare(`
      UPDATE gis_layers
      SET geojson = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(JSON.stringify(geojson), id);

    res.json({ success: true, message: 'GeoJSON updated successfully' });
  } catch (error) {
    console.error('Error updating GeoJSON:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Delete GIS layer
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const layer = db.prepare('SELECT * FROM gis_layers WHERE id = ?').get(id);
    if (!layer) {
      return res.status(404).json({ success: false, message: 'Layer not found' });
    }

    // Delete file from filesystem
    if (fs.existsSync(layer.filepath)) {
      fs.unlinkSync(layer.filepath);
    }

    // Delete from database
    db.prepare('DELETE FROM gis_layers WHERE id = ?').run(id);

    res.json({ success: true, message: 'GIS layer deleted successfully' });
  } catch (error) {
    console.error('Error deleting GIS layer:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Download GIS layer
router.get('/:id/download', (req, res) => {
  try {
    const { id } = req.params;
    const layer = db.prepare('SELECT * FROM gis_layers WHERE id = ?').get(id);
    if (!layer) {
      return res.status(404).json({ success: false, message: 'Layer not found' });
    }

    if (!fs.existsSync(layer.filepath)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    res.download(layer.filepath, layer.name);
  } catch (error) {
    console.error('Error downloading GIS layer:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Clear all GIS layers
router.delete('/', (req, res) => {
  try {
    const layers = db.prepare('SELECT * FROM gis_layers').all();
    
    // Delete all files
    layers.forEach(layer => {
      if (fs.existsSync(layer.filepath)) {
        fs.unlinkSync(layer.filepath);
      }
    });

    // Delete all records
    const result = db.prepare('DELETE FROM gis_layers').run();

    res.json({
      success: true,
      message: `Deleted ${result.changes} layers`,
      data: { deletedCount: result.changes }
    });
  } catch (error) {
    console.error('Error clearing GIS layers:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

module.exports = router;
