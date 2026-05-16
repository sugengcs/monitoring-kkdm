/**
 * KML Parser Utility - Enhanced Version
 * Handles parsing of KML files from various sources (Google Earth, Google My Maps, QGIS)
 * Supports: Point, LineString, Polygon, MultiGeometry, GroundOverlay
 */

/**
 * Parse KML file and extract all geometric elements
 * @param {File} kmlFile - The KML file to parse
 * @returns {Promise<Object>} - Object with success status, parsed data, and debug info
 */
export const parseKMLFile = async (kmlFile) => {
  const debug = {
    fileSize: kmlFile.size,
    fileType: kmlFile.type,
    fileName: kmlFile.name,
    placemarksFound: 0,
    pointsFound: 0,
    lineStringsFound: 0,
    polygonsFound: 0,
    groundOverlaysFound: 0,
    validGeometries: 0,
    errors: [],
    warnings: []
  };

  try {
    const text = await kmlFile.text();
    debug.fileContentLength = text.length;

    // Check if file has KML content
    if (!text.toLowerCase().includes('<kml')) {
      debug.errors.push('File does not appear to be a valid KML file (no <kml> tag found)');
      return { success: false, debug, error: 'Invalid KML file format' };
    }

    // Parse using DOMParser
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');

    // Check for XML parsing errors
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      debug.errors.push(`XML parsing error: ${parseError.textContent}`);
      return { success: false, debug, error: 'Failed to parse KML XML' };
    }

    // Find all Placemark elements (case-insensitive, with or without namespace)
    const placemarks = xmlDoc.querySelectorAll('Placemark, placemark, kml\\:Placemark, kml\\:placemark, *|Placemark, *|placemark');
    debug.placemarksFound = placemarks.length;

    // Find GroundOverlay elements
    const groundOverlays = xmlDoc.querySelectorAll('GroundOverlay, groundoverlay, kml\\:GroundOverlay, kml\\:groundoverlay, *|GroundOverlay, *|groundoverlay');
    debug.groundOverlaysFound = groundOverlays.length;

    if (placemarks.length === 0 && groundOverlays.length === 0) {
      debug.errors.push('No Placemark or GroundOverlay elements found in KML file');
      return { success: false, debug, error: 'No geometric elements found' };
    }

    const extractedGeometries = [];

    // Process each Placemark
    for (let i = 0; i < placemarks.length; i++) {
      const placemark = placemarks[i];
      const geometries = extractGeometriesFromPlacemark(placemark, debug, i + 1);
      extractedGeometries.push(...geometries);
    }

    // Process each GroundOverlay
    for (let i = 0; i < groundOverlays.length; i++) {
      const overlay = groundOverlays[i];
      const geometry = extractGroundOverlay(overlay, debug, i + 1);
      if (geometry) {
        extractedGeometries.push(geometry);
      }
    }

    debug.validGeometries = extractedGeometries.filter(g => g.valid).length;
    debug.pointsFound = extractedGeometries.filter(g => g.type === 'Point').length;
    debug.lineStringsFound = extractedGeometries.filter(g => g.type === 'LineString').length;
    debug.polygonsFound = extractedGeometries.filter(g => g.type === 'Polygon').length;

    if (extractedGeometries.length === 0) {
      debug.errors.push(`Found ${placemarks.length} Placemark(s) and ${groundOverlays.length} GroundOverlay(s) but no valid geometries`);
      return { success: false, debug, error: 'No valid geometries found' };
    }

    // Extract layer name from KML document
    let layerName = kmlFile.name.replace('.kml', '').replace('.KML', '');
    const documentName = xmlDoc.querySelector('Document > name, kml\\:Document > name');
    if (documentName && documentName.textContent) {
      layerName = documentName.textContent.trim();
    }

    return {
      success: true,
      debug,
      data: {
        layerName,
        geometries: extractedGeometries,
        totalPlacemarks: placemarks.length,
        totalGroundOverlays: groundOverlays.length,
        validGeometries: extractedGeometries.filter(g => g.valid).length,
        summary: {
          points: debug.pointsFound,
          lineStrings: debug.lineStringsFound,
          polygons: debug.polygonsFound,
          groundOverlays: debug.groundOverlaysFound
        }
      }
    };

  } catch (error) {
    debug.errors.push(`Exception during parsing: ${error.message}`);
    return { success: false, debug, error: error.message };
  }
};

/**
 * Extract all geometries from a Placemark element
 * Supports: Point, LineString, Polygon, MultiGeometry
 */
const extractGeometriesFromPlacemark = (placemark, debug, index) => {
  const result = [];
  
  try {
    // Extract name and description
    const nameElement = placemark.querySelector('name, kml\\:name');
    const descElement = placemark.querySelector('description, kml\\:description');
    const name = nameElement ? nameElement.textContent.trim() : null;
    const description = descElement ? descElement.textContent.trim() : null;

    // Check for MultiGeometry
    const multiGeometry = placemark.querySelector('MultiGeometry, multigeometry, kml\\:MultiGeometry, kml\\:multigeometry');
    if (multiGeometry) {
      const subGeometries = extractMultiGeometry(multiGeometry, debug, index);
      subGeometries.forEach(g => {
        g.name = g.name || name;
        g.description = g.description || description;
      });
      result.push(...subGeometries);
      return result;
    }

    // Extract Point
    const point = extractPoint(placemark, debug, index);
    if (point) {
      point.name = name;
      point.description = description;
      result.push(point);
    }

    // Extract LineString
    const lineString = extractLineString(placemark, debug, index);
    if (lineString) {
      lineString.name = name;
      lineString.description = description;
      result.push(lineString);
    }

    // Extract Polygon
    const polygon = extractPolygon(placemark, debug, index);
    if (polygon) {
      polygon.name = name;
      polygon.description = description;
      result.push(polygon);
    }

    if (result.length === 0) {
      debug.warnings.push(`Placemark #${index}: No valid geometry found`);
    }

    return result;

  } catch (error) {
    debug.errors.push(`Placemark #${index}: ${error.message}`);
    return result;
  }
};

/**
 * Extract Point geometry
 */
const extractPoint = (placemark, debug, index) => {
  const result = {
    type: 'Point',
    valid: false,
    coordinates: null,
    rawCoordinates: null,
    warnings: []
  };

  try {
    const point = placemark.querySelector('Point, point, kml\\:Point, kml\\:point, *|Point, *|point');
    if (!point) return null;

    const coordsElement = point.querySelector('coordinates, kml\\:coordinates');
    if (!coordsElement) {
      result.warnings.push('No coordinates element found in Point');
      return null;
    }

    const rawCoords = coordsElement.textContent.trim();
    result.rawCoordinates = rawCoords;

    if (!rawCoords) {
      result.warnings.push('Coordinates element is empty');
      return null;
    }

    const parsedCoords = parseCoordinates(rawCoords, debug, index);
    if (!parsedCoords) {
      result.warnings.push('Failed to parse coordinates');
      return null;
    }

    result.coordinates = parsedCoords;
    result.valid = true;
    return result;

  } catch (error) {
    result.warnings.push(`Exception: ${error.message}`);
    return null;
  }
};

/**
 * Extract LineString geometry
 */
const extractLineString = (placemark, debug, index) => {
  const result = {
    type: 'LineString',
    valid: false,
    coordinates: [],
    rawCoordinates: null,
    warnings: []
  };

  try {
    const lineString = placemark.querySelector('LineString, linestring, kml\\:LineString, kml\\:linestring, *|LineString, *|linestring');
    if (!lineString) return null;

    const coordsElement = lineString.querySelector('coordinates, kml\\:coordinates');
    if (!coordsElement) {
      result.warnings.push('No coordinates element found in LineString');
      return null;
    }

    const rawCoords = coordsElement.textContent.trim();
    result.rawCoordinates = rawCoords;

    if (!rawCoords) {
      result.warnings.push('Coordinates element is empty');
      return null;
    }

    const parsedCoords = parseLineStringCoordinates(rawCoords, debug, index);
    if (!parsedCoords || parsedCoords.length === 0) {
      result.warnings.push('Failed to parse LineString coordinates');
      return null;
    }

    result.coordinates = parsedCoords;
    result.valid = true;
    return result;

  } catch (error) {
    result.warnings.push(`Exception: ${error.message}`);
    return null;
  }
};

/**
 * Extract Polygon geometry
 */
const extractPolygon = (placemark, debug, index) => {
  const result = {
    type: 'Polygon',
    valid: false,
    coordinates: [],
    rawCoordinates: null,
    warnings: []
  };

  try {
    const polygon = placemark.querySelector('Polygon, polygon, kml\\:Polygon, kml\\:polygon, *|Polygon, *|polygon');
    if (!polygon) return null;

    // Extract outer boundary
    const outerBoundary = polygon.querySelector('outerBoundaryIs, outerboundaryis, kml\\:outerBoundaryIs, kml\\:outerboundaryis');
    if (!outerBoundary) {
      result.warnings.push('No outerBoundaryIs found in Polygon');
      return null;
    }

    const linearRing = outerBoundary.querySelector('LinearRing, linearring, kml\\:LinearRing, kml\\:linearring');
    if (!linearRing) {
      result.warnings.push('No LinearRing found in outerBoundaryIs');
      return null;
    }

    const coordsElement = linearRing.querySelector('coordinates, kml\\:coordinates');
    if (!coordsElement) {
      result.warnings.push('No coordinates element found in LinearRing');
      return null;
    }

    const rawCoords = coordsElement.textContent.trim();
    result.rawCoordinates = rawCoords;

    if (!rawCoords) {
      result.warnings.push('Coordinates element is empty');
      return null;
    }

    const parsedCoords = parseLineStringCoordinates(rawCoords, debug, index);
    if (!parsedCoords || parsedCoords.length === 0) {
      result.warnings.push('Failed to parse Polygon coordinates');
      return null;
    }

    result.coordinates = parsedCoords;
    result.valid = true;
    return result;

  } catch (error) {
    result.warnings.push(`Exception: ${error.message}`);
    return null;
  }
};

/**
 * Extract geometries from MultiGeometry
 */
const extractMultiGeometry = (multiGeometry, debug, index) => {
  const result = [];

  try {
    const nameElement = multiGeometry.querySelector('name, kml\\:name');
    const descElement = multiGeometry.querySelector('description, kml\\:description');
    const name = nameElement ? nameElement.textContent.trim() : null;
    const description = descElement ? descElement.textContent.trim() : null;

    // Extract Point from MultiGeometry
    const point = multiGeometry.querySelector('Point, point, kml\\:Point, kml\\:point');
    if (point) {
      const coordsElement = point.querySelector('coordinates, kml\\:coordinates');
      if (coordsElement) {
        const rawCoords = coordsElement.textContent.trim();
        const parsedCoords = parseCoordinates(rawCoords, debug, index);
        if (parsedCoords) {
          result.push({
            type: 'Point',
            valid: true,
            coordinates: parsedCoords,
            rawCoordinates: rawCoords,
            name: name,
            description: description,
            warnings: []
          });
        }
      }
    }

    // Extract LineString from MultiGeometry
    const lineString = multiGeometry.querySelector('LineString, linestring, kml\\:LineString, kml\\:linestring');
    if (lineString) {
      const coordsElement = lineString.querySelector('coordinates, kml\\:coordinates');
      if (coordsElement) {
        const rawCoords = coordsElement.textContent.trim();
        const parsedCoords = parseLineStringCoordinates(rawCoords, debug, index);
        if (parsedCoords && parsedCoords.length > 0) {
          result.push({
            type: 'LineString',
            valid: true,
            coordinates: parsedCoords,
            rawCoordinates: rawCoords,
            name: name,
            description: description,
            warnings: []
          });
        }
      }
    }

    // Extract Polygon from MultiGeometry
    const polygon = multiGeometry.querySelector('Polygon, polygon, kml\\:Polygon, kml\\:polygon');
    if (polygon) {
      const outerBoundary = polygon.querySelector('outerBoundaryIs, outerboundaryis, kml\\:outerBoundaryIs, kml\\:outerboundaryis');
      if (outerBoundary) {
        const linearRing = outerBoundary.querySelector('LinearRing, linearring, kml\\:LinearRing, kml\\:linearring');
        if (linearRing) {
          const coordsElement = linearRing.querySelector('coordinates, kml\\:coordinates');
          if (coordsElement) {
            const rawCoords = coordsElement.textContent.trim();
            const parsedCoords = parseLineStringCoordinates(rawCoords, debug, index);
            if (parsedCoords && parsedCoords.length > 0) {
              result.push({
                type: 'Polygon',
                valid: true,
                coordinates: parsedCoords,
                rawCoordinates: rawCoords,
                name: name,
                description: description,
                warnings: []
              });
            }
          }
        }
      }
    }

    return result;

  } catch (error) {
    debug.errors.push(`MultiGeometry #${index}: ${error.message}`);
    return result;
  }
};

/**
 * Extract GroundOverlay
 */
const extractGroundOverlay = (overlay, debug, index) => {
  const result = {
    type: 'GroundOverlay',
    valid: false,
    name: null,
    icon: null,
    north: null,
    south: null,
    east: null,
    west: null,
    rotation: 0,
    warnings: []
  };

  try {
    const nameElement = overlay.querySelector('name, kml\\:name');
    if (nameElement) {
      result.name = nameElement.textContent.trim();
    }

    const iconElement = overlay.querySelector('Icon, icon, kml\\:Icon, kml\\:icon');
    if (iconElement) {
      const hrefElement = iconElement.querySelector('href, kml\\:href');
      if (hrefElement) {
        result.icon = hrefElement.textContent.trim();
      }
    }

    const latLonBox = overlay.querySelector('LatLonBox, latlonbox, kml\\:LatLonBox, kml\\:latlonbox');
    if (latLonBox) {
      const north = latLonBox.querySelector('north, kml\\:north');
      const south = latLonBox.querySelector('south, kml\\:south');
      const east = latLonBox.querySelector('east, kml\\:east');
      const west = latLonBox.querySelector('west, kml\\:west');
      const rotation = latLonBox.querySelector('rotation, kml\\:rotation');

      if (north) result.north = parseFloat(north.textContent.trim());
      if (south) result.south = parseFloat(south.textContent.trim());
      if (east) result.east = parseFloat(east.textContent.trim());
      if (west) result.west = parseFloat(west.textContent.trim());
      if (rotation) result.rotation = parseFloat(rotation.textContent.trim());
    }

    if (result.north === null || result.south === null || result.east === null || result.west === null) {
      result.warnings.push('Incomplete LatLonBox in GroundOverlay');
      return null;
    }

    result.valid = true;
    return result;

  } catch (error) {
    result.warnings.push(`Exception: ${error.message}`);
    return null;
  }
};

/**
 * Parse coordinate string into [lon, lat] array
 * Handles various formats:
 * - longitude,latitude
 * - longitude,latitude,altitude
 * - Multiple coordinate sets (take the first one)
 */
const parseCoordinates = (coordString, debug, index) => {
  try {
    // Remove extra whitespace and newlines
    const cleaned = coordString.replace(/\s+/g, ' ').trim();
    
    // Split by whitespace to get coordinate tuples
    const tuples = cleaned.split(/\s+/);
    
    if (tuples.length === 0) {
      debug.warnings.push(`Placemark #${index}: No coordinate tuples found`);
      return null;
    }

    // Parse the first tuple
    const firstTuple = tuples[0];
    const parts = firstTuple.split(',').map(p => p.trim());

    if (parts.length < 2) {
      debug.warnings.push(`Placemark #${index}: Invalid coordinate format (need at least lon,lat)`);
      return null;
    }

    const lon = parseFloat(parts[0]);
    const lat = parseFloat(parts[1]);

    if (isNaN(lon) || isNaN(lat)) {
      debug.warnings.push(`Placemark #${index}: Invalid numeric coordinates (lon=${parts[0]}, lat=${parts[1]})`);
      return null;
    }

    // Validate coordinate ranges
    if (lon < -180 || lon > 180) {
      debug.warnings.push(`Placemark #${index}: Longitude out of range (${lon})`);
      return null;
    }

    if (lat < -90 || lat > 90) {
      debug.warnings.push(`Placemark #${index}: Latitude out of range (${lat})`);
      return null;
    }

    return [lon, lat];

  } catch (error) {
    debug.errors.push(`Placemark #${index}: Coordinate parsing error: ${error.message}`);
    return null;
  }
};

/**
 * Parse LineString or Polygon coordinate string into array of [lon, lat] arrays
 * Handles multiple coordinate tuples
 */
const parseLineStringCoordinates = (coordString, debug, index) => {
  try {
    // Remove extra whitespace and newlines
    const cleaned = coordString.replace(/\s+/g, ' ').trim();
    
    // Split by whitespace to get coordinate tuples
    const tuples = cleaned.split(/\s+/).filter(t => t.trim());
    
    if (tuples.length === 0) {
      debug.warnings.push(`Placemark #${index}: No coordinate tuples found`);
      return null;
    }

    const coordinates = [];

    for (const tuple of tuples) {
      const parts = tuple.split(',').map(p => p.trim());

      if (parts.length < 2) {
        debug.warnings.push(`Placemark #${index}: Invalid coordinate format (need at least lon,lat)`);
        continue;
      }

      const lon = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);

      if (isNaN(lon) || isNaN(lat)) {
        debug.warnings.push(`Placemark #${index}: Invalid numeric coordinates (lon=${parts[0]}, lat=${parts[1]})`);
        continue;
      }

      // Validate coordinate ranges
      if (lon < -180 || lon > 180) {
        debug.warnings.push(`Placemark #${index}: Longitude out of range (${lon})`);
        continue;
      }

      if (lat < -90 || lat > 90) {
        debug.warnings.push(`Placemark #${index}: Latitude out of range (${lat})`);
        continue;
      }

      coordinates.push([lon, lat]);
    }

    if (coordinates.length === 0) {
      debug.warnings.push(`Placemark #${index}: No valid coordinates parsed`);
      return null;
    }

    return coordinates;

  } catch (error) {
    debug.errors.push(`Placemark #${index}: LineString/Polygon coordinate parsing error: ${error.message}`);
    return null;
  }
};

/**
 * Validate KML file structure before uploading
 * @param {File} kmlFile - The KML file to validate
 * @returns {Promise<Object>} - Validation result with debug info
 */
export const validateKMLFile = async (kmlFile) => {
  const result = await parseKMLFile(kmlFile);
  
  if (result.success) {
    const summary = result.data.summary;
    const message = `KML valid: ${summary.points} Point, ${summary.lineStrings} LineString, ${summary.polygons} Polygon, ${summary.groundOverlays} GroundOverlay - Total ${result.data.validGeometries} geometri valid`;
    return {
      valid: true,
      message: message,
      debug: result.debug,
      data: result.data
    };
  } else {
    return {
      valid: false,
      message: result.error,
      debug: result.debug
    };
  }
};

/**
 * Generate sample KML for testing
 */
export const generateSampleKML = () => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Sample Layer</name>
    <Placemark>
      <name>Point 1</name>
      <description>Sample point 1</description>
      <Point>
        <coordinates>106.9321978,-6.2347001,0</coordinates>
      </Point>
    </Placemark>
    <Placemark>
      <name>Point 2</name>
      <Point>
        <coordinates>106.9421978,-6.2447001</coordinates>
      </Point>
    </Placemark>
  </Document>
</kml>`;
};
