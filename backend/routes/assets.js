const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { parseString } = require('xml2js');
const JSZip = require('jszip');
const shapefile = require('shapefile');
const db = require('../config/database');
const { auth, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Get all assets with filters
router.get('/', auth, async (req, res) => {
  try {
    const { category, condition, search, month, year, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT a.*, ac.name as category_name, ac.icon 
      FROM assets a 
      LEFT JOIN asset_categories ac ON a.category_id = ac.id
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      query += ' AND a.category_id = ?';
      params.push(category);
    }

    if (condition) {
      query += ' AND a.condition_status = ?';
      params.push(condition);
    }

    if (search) {
      query += ' AND (a.name LIKE ? OR a.asset_code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (month) {
      query += " AND strftime('%m', a.created_at) = ?";
      params.push(month.padStart(2, '0'));
    }

    if (year) {
      query += " AND strftime('%Y', a.created_at) = ?";
      params.push(year);
    }

    query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const assets = db.prepare(query).all(...params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM assets a WHERE 1=1';
    const countParams = [];
    
    if (category) {
      countQuery += ' AND a.category_id = ?';
      countParams.push(category);
    }
    if (condition) {
      countQuery += ' AND a.condition_status = ?';
      countParams.push(condition);
    }
    if (search) {
      countQuery += ' AND (a.name LIKE ? OR a.asset_code LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }
    if (month) {
      countQuery += " AND strftime('%m', a.created_at) = ?";
      countParams.push(month.padStart(2, '0'));
    }
    if (year) {
      countQuery += " AND strftime('%Y', a.created_at) = ?";
      countParams.push(year);
    }

    const count = db.prepare(countQuery).get(...countParams);

    res.json({
      success: true,
      data: assets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count.total,
        pages: Math.ceil(count.total / limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /conditions — lightweight polling, returns only id + condition_status + updated_at
router.get('/conditions', auth, async (req, res) => {
  try {
    const rows = db.prepare('SELECT id, condition_status, updated_at FROM assets').all();
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[Conditions] Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /detail/:id — asset + latest report + maintenance status for rich popup
router.get('/detail/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const asset = db.prepare(`
      SELECT a.*, ac.name as category_name
      FROM assets a
      LEFT JOIN asset_categories ac ON a.category_id = ac.id
      WHERE a.id = ?
    `).get(id);

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    // Latest damage report for this asset
    const latestReport = db.prepare(`
      SELECT dr.*, u.full_name as reporter_name,
             mp.status as repair_status, mp.progress_percentage
      FROM damage_reports dr
      LEFT JOIN users u ON dr.reporter_id = u.id
      LEFT JOIN maintenance_progress mp ON dr.id = mp.report_id
      WHERE dr.asset_id = ?
      ORDER BY dr.reported_at DESC
      LIMIT 1
    `).get(id);

    // Active reports count (pending or on_progress)
    const activeCount = db.prepare(`
      SELECT COUNT(*) as cnt FROM damage_reports
      WHERE asset_id = ? AND status IN ('pending', 'on_progress', 'dalam_perbaikan')
    `).get(id);

    res.json({
      success: true,
      data: {
        ...asset,
        latest_report: latestReport || null,
        active_report_count: activeCount ? activeCount.cnt : 0
      }
    });
  } catch (error) {
    console.error('[Detail] Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get asset by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const asset = db.prepare(`SELECT a.*, ac.name as category_name, ac.icon FROM assets a LEFT JOIN asset_categories ac ON a.category_id = ac.id WHERE a.id = ?`).get(id);

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    // Get maintenance history
    const history = db.prepare('SELECT * FROM maintenance_history WHERE asset_id = ? ORDER BY maintenance_date DESC').all(id);

    res.json({
      success: true,
      data: { ...asset, maintenance_history: history }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create asset
router.post('/', auth, authorize('admin'), upload.single('photo'), async (req, res) => {
  try {
    const { asset_code, name, category_id, sub_category, location_lat, location_lng, sta, ruas, condition_status, description } = req.body;

    const photo_path = req.file ? `/uploads/${req.body.type || 'general'}/${req.file.filename}` : null;

    const result = db.prepare('INSERT INTO assets (asset_code, name, category_id, sub_category, location_lat, location_lng, sta, ruas, condition_status, description, photo_before, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(asset_code, name, category_id, sub_category, location_lat, location_lng, sta, ruas, condition_status, description, photo_path, req.user.id);

    res.status(201).json({
      success: true,
      message: 'Asset created successfully',
      data: { id: result.lastInsertRowid }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update asset
router.put('/:id', auth, authorize('admin'), upload.single('photo'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, condition_status, description, photo_after } = req.body;

    const photo_path = req.file ? `/uploads/${req.body.type || 'general'}/${req.file.filename}` : photo_after;

    const result = db.prepare('UPDATE assets SET name = ?, condition_status = ?, description = ?, photo_after = ? WHERE id = ?').run(name, condition_status, description, photo_path, id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    res.json({
      success: true,
      message: 'Asset updated successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Bulk delete assets by category name (MUST be before /:id to avoid route conflict)
router.delete('/category/:categoryName', auth, authorize('admin'), async (req, res) => {
  try {
    const { categoryName } = req.params;
    console.log('[Bulk Delete] categoryName param:', categoryName);
    
    // Find category ID
    const category = db.prepare('SELECT id FROM asset_categories WHERE name = ?').get(categoryName);
    console.log('[Bulk Delete] category found:', category);
    
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    
    // Get all asset IDs in this category first
    const assetIds = db.prepare('SELECT id FROM assets WHERE category_id = ?').all(category.id);
    const ids = assetIds.map(row => row.id);
    console.log('[Bulk Delete] asset IDs:', ids);
    
    if (ids.length === 0) {
      return res.json({ success: true, message: 'No assets to delete', count: 0 });
    }
    
    // Delete referencing rows in tables without ON DELETE CASCADE
    const placeholders = ids.map(() => '?').join(',');
    
    // Delete from damage_reports
    const delReports = db.prepare(`DELETE FROM damage_reports WHERE asset_id IN (${placeholders})`).run(...ids);
    console.log('[Bulk Delete] damage_reports removed:', delReports.changes);
    
    // Delete from maintenance_history
    const delHistory = db.prepare(`DELETE FROM maintenance_history WHERE asset_id IN (${placeholders})`).run(...ids);
    console.log('[Bulk Delete] maintenance_history removed:', delHistory.changes);
    
    // Now delete all assets in this category
    const result = db.prepare('DELETE FROM assets WHERE category_id = ?').run(category.id);
    console.log('[Bulk Delete] assets deleted:', result.changes);
    
    res.json({
      success: true,
      message: `${result.changes} assets deleted successfully`,
      count: result.changes
    });
  } catch (error) {
    console.error('[Bulk Delete] Error:', error.message);
    console.error('[Bulk Delete] Stack:', error.stack);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Delete asset
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // First, delete related records from child tables
    db.prepare('DELETE FROM perkerasan WHERE asset_id = ?').run(id);
    db.prepare('DELETE FROM pju WHERE asset_id = ?').run(id);
    db.prepare('DELETE FROM panel_utama WHERE asset_id = ?').run(id);
    db.prepare('DELETE FROM kwh_meter WHERE asset_id = ?').run(id);
    db.prepare('DELETE FROM rambu WHERE asset_id = ?').run(id);
    db.prepare('DELETE FROM cctv WHERE asset_id = ?').run(id);
    db.prepare('DELETE FROM maintenance_history WHERE asset_id = ?').run(id);
    db.prepare('DELETE FROM damage_reports WHERE asset_id = ?').run(id);

    // Now delete the asset
    const result = db.prepare('DELETE FROM assets WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    res.json({
      success: true,
      message: 'Asset deleted successfully'
    });
  } catch (error) {
    console.error('[Delete Asset] Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Helper: parse GeoJSON file
const parseGeoJSONFile = (geoJsonContent, layerName) => {
  const results = [];
  try {
    const data = JSON.parse(geoJsonContent);
    const features = data.features || [];

    features.forEach((feature, index) => {
      if (!feature.geometry) return;

      const geometry = feature.geometry;
      const properties = feature.properties || {};
      const name = properties.name || properties.Name || properties.NAMA || `Feature ${index + 1}`;
      const description = properties.description || properties.Description || properties.DESKRIPSI || '';

      let geoType = null;
      let coords = null;
      let lat = null, lng = null;

      if (geometry.type === 'Point') {
        geoType = 'Point';
        coords = geometry.coordinates;
        lng = coords[0];
        lat = coords[1];
      } else if (geometry.type === 'LineString') {
        geoType = 'LineString';
        coords = geometry.coordinates;
        const mid = coords[Math.floor(coords.length / 2)];
        lng = mid[0];
        lat = mid[1];
      } else if (geometry.type === 'Polygon') {
        geoType = 'Polygon';
        coords = geometry.coordinates[0]; // outer ring
        const centroid = coords.reduce((acc, c) => [acc[0] + c[0], acc[1] + c[1]], [0, 0]);
        lng = centroid[0] / coords.length;
        lat = centroid[1] / coords.length;
      }

      if (geoType && coords && lat !== null && lng !== null) {
        const assetCodePrefix = geoType === 'Polygon' ? 'GEO-POLY-' : geoType === 'LineString' ? 'GEO-LINE-' : 'GEO-';
        results.push({
          geometryType: geoType,
          name,
          jenis: layerName,
          description: geoType === 'Point' ? description : JSON.stringify({ geometryType: geoType, coordinates: coords }),
          lat,
          lng,
          layer: layerName,
          assetCodePrefix
        });
      }
    });
  } catch (error) {
    console.error('GeoJSON parse error:', error);
  }
  return results;
};

// Helper: parse GPX file
const parseGPXFile = (gpxContent, layerName) => {
  const results = [];
  try {
    parseString(gpxContent, (err, result) => {
      if (err) return;

      const gpx = result.gpx;
      if (!gpx) return;

      // Parse waypoints (points)
      if (gpx.wpt) {
        gpx.wpt.forEach((wpt, index) => {
          const name = wpt.name?.[0] || `Waypoint ${index + 1}`;
          const description = wpt.desc?.[0] || '';
          const lat = parseFloat(wpt.$.lat);
          const lon = parseFloat(wpt.$.lon);
          if (!isNaN(lat) && !isNaN(lon)) {
            results.push({
              geometryType: 'Point',
              name,
              jenis: layerName,
              description,
              lat,
              lng: lon,
              layer: layerName,
              assetCodePrefix: 'GPX-'
            });
          }
        });
      }

      // Parse tracks (linestrings)
      if (gpx.trk) {
        gpx.trk.forEach((trk, index) => {
          const name = trk.name?.[0] || `Track ${index + 1}`;
          const description = trk.desc?.[0] || '';
          if (trk.trkseg) {
            trk.trkseg.forEach(seg => {
              if (seg.trkpt) {
                const coords = seg.trkpt.map(pt => [parseFloat(pt.$.lon), parseFloat(pt.$.lat)]);
                if (coords.length >= 2) {
                  const mid = coords[Math.floor(coords.length / 2)];
                  results.push({
                    geometryType: 'LineString',
                    name,
                    jenis: layerName,
                    description: JSON.stringify({ geometryType: 'LineString', coordinates: coords }),
                    lat: mid[1],
                    lng: mid[0],
                    layer: layerName,
                    assetCodePrefix: 'GPX-LINE-'
                  });
                }
              }
            });
          }
        });
      }

      // Parse routes (linestrings)
      if (gpx.rte) {
        gpx.rte.forEach((rte, index) => {
          const name = rte.name?.[0] || `Route ${index + 1}`;
          const description = rte.desc?.[0] || '';
          if (rte.rtept) {
            const coords = rte.rtept.map(pt => [parseFloat(pt.$.lon), parseFloat(pt.$.lat)]);
            if (coords.length >= 2) {
              const mid = coords[Math.floor(coords.length / 2)];
              results.push({
                geometryType: 'LineString',
                name,
                jenis: layerName,
                description: JSON.stringify({ geometryType: 'LineString', coordinates: coords }),
                lat: mid[1],
                lng: mid[0],
                layer: layerName,
                assetCodePrefix: 'GPX-LINE-'
              });
            }
          }
        });
      }
    });
  } catch (error) {
    console.error('GPX parse error:', error);
  }
  return results;
};

// Helper: parse KMZ file (extract KML)
const parseKMZFile = async (kmzPath, layerName) => {
  const results = [];
  try {
    const zip = new JSZip();
    const zipContents = await zip.loadAsync(kmzPath);

    // Find .kml files in the archive
    const kmlFiles = [];
    zipContents.forEach((relativePath, file) => {
      if (relativePath.toLowerCase().endsWith('.kml') && !file.dir) {
        kmlFiles.push(file);
      }
    });

    if (kmlFiles.length === 0) {
      console.warn('No KML file found in KMZ archive');
      return results;
    }

    // Parse the first KML file found
    const kmlFile = kmlFiles[0];
    const kmlContent = await kmlFile.async('string');

    const parsed = await new Promise((resolve, reject) => {
      parseString(kmlContent, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    // Extract layer name from filename (without extension)
    const layerNameFromFilename = layerName.replace(/\.(kmz|KMZ)$/, '');

    // Parse multi-coordinate string into array of [lng, lat] pairs
    function parseMultiCoords(rawCoords) {
      const coords = [];
      const tuples = (rawCoords || '').trim().split(/\s+/).filter(Boolean);
      for (const tuple of tuples) {
        const parts = tuple.split(',').map(Number);
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          const [lng, lat] = parts;
          if (lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
            coords.push([lng, lat]);
          }
        }
      }
      return coords;
    }

    // Compute centroid [lat, lng] of a polygon (array of [lng, lat])
    function computeCentroid(coords) {
      const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
      const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
      return { lat, lng };
    }

    // Compute midpoint [lat, lng] of a linestring (array of [lng, lat])
    function computeMidpoint(coords) {
      const mid = coords[Math.floor(coords.length / 2)];
      return { lat: mid[1], lng: mid[0] };
    }

    // Recursive function to extract all geometries from Placemarks
    function extractPlacemarks(node, layerName = layerNameFromFilename) {
      const placemarkResults = [];

      if (node.Placemark) {
        node.Placemark.forEach(pm => {
          const rawName = pm?.name?.[0] || 'Unnamed';
          const pmDesc = pm?.description?.[0] || '';

          // --- Point ---
          const pointCoordsRaw =
            pm.Point?.[0]?.coordinates?.[0] ||
            pm.MultiGeometry?.[0]?.Point?.[0]?.coordinates?.[0] ||
            pm.MultiGeometry?.[0]?.MultiGeometry?.[0]?.Point?.[0]?.coordinates?.[0];

          if (pointCoordsRaw) {
            const firstCoord = pointCoordsRaw.trim().split(/\s+/)[0];
            const parts = firstCoord.split(',').map(Number);
            if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
              const [lng, lat] = parts;
              if (lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
                placemarkResults.push({
                  geometryType: 'Point',
                  name: rawName,
                  jenis: layerName,
                  description: pmDesc,
                  lat, lng,
                  layer: layerName,
                  assetCodePrefix: 'KML-'
                });
              }
            }
          }

          // --- LineString ---
          const lineCoorsRaw =
            pm.LineString?.[0]?.coordinates?.[0] ||
            pm.MultiGeometry?.[0]?.LineString?.[0]?.coordinates?.[0];

          if (lineCoorsRaw) {
            const coords = parseMultiCoords(lineCoorsRaw);
            if (coords.length >= 2) {
              const { lat, lng } = computeMidpoint(coords);
              placemarkResults.push({
                geometryType: 'LineString',
                name: rawName,
                jenis: layerName,
                description: JSON.stringify({ geometryType: 'LineString', coordinates: coords }),
                lat, lng,
                layer: layerName,
                assetCodePrefix: 'KML-LINE-'
              });
            }
          }

          // --- Polygon ---
          const polyNode =
            pm.Polygon?.[0] ||
            pm.MultiGeometry?.[0]?.Polygon?.[0];

          if (polyNode) {
            const outerRingRaw =
              polyNode.outerBoundaryIs?.[0]?.LinearRing?.[0]?.coordinates?.[0];
            if (outerRingRaw) {
              const coords = parseMultiCoords(outerRingRaw);
              if (coords.length >= 3) {
                const { lat, lng } = computeCentroid(coords);
                placemarkResults.push({
                  geometryType: 'Polygon',
                  name: rawName,
                  jenis: layerName,
                  description: JSON.stringify({ geometryType: 'Polygon', coordinates: coords }),
                  lat, lng,
                  layer: layerName,
                  assetCodePrefix: 'KML-POLY-'
                });
              }
            }
          }
        });
      }

      // Recurse into nested Folders
      if (node.Folder) {
        node.Folder.forEach(subFolder => {
          const subLayer = subFolder?.name?.[0] || layerName;
          placemarkResults.push(...extractPlacemarks(subFolder, subLayer));
        });
      }

      return placemarkResults;
    }

    const document = parsed?.kml?.Document?.[0];
    const placemarks = extractPlacemarks(document, document?.name?.[0] || layerNameFromFilename);

    results.push(...placemarks);
  } catch (error) {
    console.error('KMZ parse error:', error);
  }
  return results;
};

// Helper: parse Shapefile (SHP)
const parseShapefile = async (zipPath, layerName) => {
  const results = [];
  try {
    const zip = new JSZip();
    const zipContents = await zip.loadAsync(zipPath);

    // Find required files
    let shpFile = null;
    let dbfFile = null;

    zipContents.forEach((relativePath, file) => {
      const lowerPath = relativePath.toLowerCase();
      if (!file.dir) {
        if (lowerPath.endsWith('.shp')) shpFile = file;
        if (lowerPath.endsWith('.dbf')) dbfFile = file;
      }
    });

    if (!shpFile) {
      console.warn('No .shp file found in shapefile archive');
      return results;
    }

    const shpBuffer = await shpFile.async('arraybuffer');
    let dbfBuffer = null;
    if (dbfFile) {
      dbfBuffer = await dbfFile.async('arraybuffer');
    }

    const features = await shapefile.open(shpBuffer, dbfBuffer).then(source => source.read()).then(result => result.value.features);

    features.forEach((feature, index) => {
      if (!feature.geometry) return;

      const geometry = feature.geometry;
      const properties = feature.properties || {};
      const name = properties.name || properties.Name || properties.NAMA || `Feature ${index + 1}`;
      const description = properties.description || properties.Description || properties.DESKRIPSI || '';

      let geoType = null;
      let coords = null;
      let lat = null, lng = null;

      if (geometry.type === 'Point') {
        geoType = 'Point';
        coords = geometry.coordinates;
        lng = coords[0];
        lat = coords[1];
      } else if (geometry.type === 'LineString') {
        geoType = 'LineString';
        coords = geometry.coordinates;
        const mid = coords[Math.floor(coords.length / 2)];
        lng = mid[0];
        lat = mid[1];
      } else if (geometry.type === 'Polygon') {
        geoType = 'Polygon';
        coords = geometry.coordinates[0];
        const centroid = coords.reduce((acc, c) => [acc[0] + c[0], acc[1] + c[1]], [0, 0]);
        lng = centroid[0] / coords.length;
        lat = centroid[1] / coords.length;
      }

      if (geoType && coords && lat !== null && lng !== null) {
        const assetCodePrefix = geoType === 'Polygon' ? 'SHP-POLY-' : geoType === 'LineString' ? 'SHP-LINE-' : 'SHP-';
        results.push({
          geometryType: geoType,
          name,
          jenis: layerName,
          description: geoType === 'Point' ? description : JSON.stringify({ geometryType: geoType, coordinates: coords }),
          lat,
          lng,
          layer: layerName,
          assetCodePrefix
        });
      }
    });
  } catch (error) {
    console.error('Shapefile parse error:', error);
  }
  return results;
};

// Helper: parse CSV file
const parseCSVFile = (csvContent, layerName) => {
  const results = [];
  try {
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return results;

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Find column indices
    const latIdx = headers.findIndex(h => h.includes('lat') || h.includes('latitude'));
    const lngIdx = headers.findIndex(h => h.includes('lng') || h.includes('long') || h.includes('longitude') || h.includes('lon'));
    const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('nama'));
    const descIdx = headers.findIndex(h => h.includes('desc') || h.includes('description') || h.includes('deskripsi'));

    if (latIdx === -1 || lngIdx === -1) {
      console.warn('CSV file must contain latitude and longitude columns');
      return results;
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < headers.length) continue;

      const lat = parseFloat(values[latIdx]);
      const lng = parseFloat(values[lngIdx]);
      const name = nameIdx !== -1 ? values[nameIdx] : `Point ${i}`;
      const description = descIdx !== -1 ? values[descIdx] : '';

      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        results.push({
          geometryType: 'Point',
          name,
          jenis: layerName,
          description,
          lat,
          lng,
          layer: layerName,
          assetCodePrefix: 'CSV-'
        });
      }
    }
  } catch (error) {
    console.error('CSV parse error:', error);
  }
  return results;
};

// Import assets from GIS file (KML, KMZ, GeoJSON, Shapefile, GPX)
router.post('/import-kml', auth, authorize('admin'), upload.single('kmlFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const fileExt = path.extname(fileName).toLowerCase();

    // Extract layer name from filename (without extension)
    const layerNameFromFilename = fileName.replace(/\.(kml|KML|kmz|KMZ|geojson|json|zip|shp|gpx|csv)$/, '');

    let parsedData = [];
    let fileType = '';

    // Detect file type and parse accordingly
    if (fileExt === '.kml' || fileExt === '.KML') {
      fileType = 'KML';
      const kmlContent = fs.readFileSync(filePath, 'utf-8');

      const parsed = await new Promise((resolve, reject) => {
        parseString(kmlContent, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      // Smart name parser: split "Jenis - Nama" or "Jenis_Nama" etc.
      function parseItemName(rawName) {
        const knownTypes = ['PJU', 'CCTV', 'RAMBU', 'PERKERASAN', 'PANEL', 'KWH', 'GAPURA', 'PINTU', 'PAGAR', 'LOKET'];
        const name = (rawName || '').trim();
        if (!name) return { jenis: layerNameFromFilename, nama: 'Unnamed' };
        const sepMatch = name.match(/^(.+?)(?:\s*[-:_]\s+|\s+)(.+)$/);
        if (sepMatch) {
          const left = sepMatch[1].trim();
          const right = sepMatch[2].trim();
          const leftUpper = left.toUpperCase();
          for (const t of knownTypes) {
            if (leftUpper === t || leftUpper.includes(t)) return { jenis: t.charAt(0) + t.slice(1).toLowerCase(), nama: right };
          }
          for (const t of knownTypes) {
            if (right.toUpperCase().includes(t)) return { jenis: t.charAt(0) + t.slice(1).toLowerCase(), nama: left };
          }
          return { jenis: left, nama: right };
        }
        const upper = name.toUpperCase();
        for (const t of knownTypes) {
          if (upper.includes(t)) return { jenis: t.charAt(0) + t.slice(1).toLowerCase(), nama: name };
        }
        return { jenis: layerNameFromFilename, nama: name };
      }

      // Parse multi-coordinate string into array of [lng, lat] pairs
      function parseMultiCoords(rawCoords) {
        const coords = [];
        const tuples = (rawCoords || '').trim().split(/\s+/).filter(Boolean);
        for (const tuple of tuples) {
          const parts = tuple.split(',').map(Number);
          if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            const [lng, lat] = parts;
            if (lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
              coords.push([lng, lat]);
            }
          }
        }
        return coords;
      }

      // Compute centroid [lat, lng] of a polygon (array of [lng, lat])
      function computeCentroid(coords) {
        const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
        const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
        return { lat, lng };
      }

      // Compute midpoint [lat, lng] of a linestring (array of [lng, lat])
      function computeMidpoint(coords) {
        const mid = coords[Math.floor(coords.length / 2)];
        return { lat: mid[1], lng: mid[0] };
      }

      // Recursive function to extract all geometries from Placemarks
      function extractPlacemarks(node, layerName = layerNameFromFilename) {
        const results = [];

        if (node.Placemark) {
          node.Placemark.forEach(pm => {
            const rawName = pm?.name?.[0] || 'Unnamed';
            const pmDesc = pm?.description?.[0] || '';
            const parsedName = parseItemName(rawName);

            // --- Point ---
            const pointCoordsRaw =
              pm.Point?.[0]?.coordinates?.[0] ||
              pm.MultiGeometry?.[0]?.Point?.[0]?.coordinates?.[0] ||
              pm.MultiGeometry?.[0]?.MultiGeometry?.[0]?.Point?.[0]?.coordinates?.[0];

            if (pointCoordsRaw) {
              const firstCoord = pointCoordsRaw.trim().split(/\s+/)[0];
              const parts = firstCoord.split(',').map(Number);
              if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                const [lng, lat] = parts;
                if (lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
                  results.push({
                    geometryType: 'Point',
                    name: parsedName.nama,
                    jenis: parsedName.jenis,
                    description: pmDesc,
                    lat, lng,
                    layer: layerName,
                    assetCodePrefix: 'KML'
                  });
                }
              }
            }

            // --- LineString ---
            const lineCoorsRaw =
              pm.LineString?.[0]?.coordinates?.[0] ||
              pm.MultiGeometry?.[0]?.LineString?.[0]?.coordinates?.[0];

            if (lineCoorsRaw) {
              const coords = parseMultiCoords(lineCoorsRaw);
              if (coords.length >= 2) {
                const { lat, lng } = computeMidpoint(coords);
                results.push({
                  geometryType: 'LineString',
                  name: parsedName.nama,
                  jenis: parsedName.jenis,
                  description: JSON.stringify({ geometryType: 'LineString', coordinates: coords }),
                  lat, lng,
                  layer: layerName,
                  assetCodePrefix: 'KML-LINE'
                });
              }
            }

            // --- Polygon ---
            const polyNode =
              pm.Polygon?.[0] ||
              pm.MultiGeometry?.[0]?.Polygon?.[0];

            if (polyNode) {
              const outerRingRaw =
                polyNode.outerBoundaryIs?.[0]?.LinearRing?.[0]?.coordinates?.[0];
              if (outerRingRaw) {
                const coords = parseMultiCoords(outerRingRaw);
                if (coords.length >= 3) {
                  const { lat, lng } = computeCentroid(coords);
                  results.push({
                    geometryType: 'Polygon',
                    name: parsedName.nama,
                    jenis: parsedName.jenis,
                    description: JSON.stringify({ geometryType: 'Polygon', coordinates: coords }),
                    lat, lng,
                    layer: layerName,
                    assetCodePrefix: 'KML-POLY'
                  });
                }
              }
            }
          });
        }

        // Recurse into nested Folders
        if (node.Folder) {
          node.Folder.forEach(subFolder => {
            const subLayer = subFolder?.name?.[0] || layerName;
            results.push(...extractPlacemarks(subFolder, subLayer));
          });
        }

        return results;
      }

      const document = parsed?.kml?.Document?.[0];
      parsedData = extractPlacemarks(document, document?.name?.[0] || layerNameFromFilename);
    } else if (fileExt === '.kmz' || fileExt === '.KMZ') {
      fileType = 'KMZ';
      parsedData = await parseKMZFile(filePath, layerNameFromFilename);
    } else if (fileExt === '.geojson' || fileExt === '.json') {
      fileType = 'GeoJSON';
      const geoJsonContent = fs.readFileSync(filePath, 'utf-8');
      parsedData = parseGeoJSONFile(geoJsonContent, layerNameFromFilename);
    } else if (fileExt === '.zip' || fileExt === '.shp') {
      fileType = 'Shapefile';
      parsedData = await parseShapefile(filePath, layerNameFromFilename);
    } else if (fileExt === '.gpx') {
      fileType = 'GPX';
      const gpxContent = fs.readFileSync(filePath, 'utf-8');
      parsedData = parseGPXFile(gpxContent, layerNameFromFilename);
    } else if (fileExt === '.csv') {
      fileType = 'CSV';
      const csvContent = fs.readFileSync(filePath, 'utf-8');
      parsedData = parseCSVFile(csvContent, layerNameFromFilename);
    } else {
      return res.status(400).json({ success: false, message: 'Format file tidak didukung. Gunakan KML, KMZ, GeoJSON, Shapefile (.zip), GPX, atau CSV.' });
    }

    if (parsedData.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Tidak ada geometri valid ditemukan dalam file ${fileType}. File harus mengandung Point, LineString, atau Polygon dengan koordinat valid.`
      });
    }

    // Get or create categories based on jenis
    const getOrCreateCategory = (name) => {
      let cat = db.prepare('SELECT id FROM asset_categories WHERE name = ?').get(name);
      if (!cat) {
        const result = db.prepare('INSERT INTO asset_categories (name, icon, description) VALUES (?, ?, ?)')
          .run(name, 'MapPin', `Imported from ${fileType}: ${name}`);
        cat = { id: result.lastInsertRowid };
      }
      return cat.id;
    };

    const insert = db.prepare(`
      INSERT INTO assets (asset_code, name, category_id, location_lat, location_lng, sta, ruas, condition_status, description, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const imported = [];
    const ts = Date.now();
    for (let i = 0; i < parsedData.length; i++) {
      const pm = parsedData[i];
      const assetCode = `${pm.assetCodePrefix}-${ts}-${i}`;
      const categoryId = getOrCreateCategory(pm.jenis);
      const result = insert.run(assetCode, pm.name, categoryId, pm.lat, pm.lng, '-', 'Becakayu', 'baik', pm.description || null, req.user.id);
      imported.push({ id: result.lastInsertRowid, ...pm, category_id: categoryId });
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    const summary = {
      total: imported.length,
      points: imported.filter(p => p.geometryType === 'Point').length,
      lines: imported.filter(p => p.geometryType === 'LineString').length,
      polygons: imported.filter(p => p.geometryType === 'Polygon').length,
    };

    res.json({
      success: true,
      message: `${summary.total} geometri berhasil diimport dari ${fileType} (${summary.points} Point, ${summary.lines} LineString, ${summary.polygons} Polygon)`,
      data: imported,
      summary,
      fileType
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Gagal memproses file: ' + error.message });
  }
});

// Get asset categories
router.get('/categories/list', auth, async (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM asset_categories ORDER BY name').all();
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
