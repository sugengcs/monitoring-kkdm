import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Search, Layers, Map as MapIcon, Maximize2, Download, Upload, ZoomIn } from 'lucide-react';
import toGeoJSON from '@mapbox/togeojson';

// Seksi colors matching ProgressSeksiCards
const SEKSI_COLORS = {
  'Seksi 1A': { color: '#06B6D4', gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)' },
  'Seksi 1B': { color: '#8B5CF6', gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' },
  'Seksi 1C': { color: '#EC4899', gradient: 'linear-gradient(135deg, #EC4899, #DB2777)' },
  'Seksi 2A': { color: '#F59E0B', gradient: 'linear-gradient(135deg, #F59E0B, #D97706)' },
  'Seksi 2B': { color: '#10B981', gradient: 'linear-gradient(135deg, #10B981, #059669)' },
};

// Seksi order for legend
const SEKSI_ORDER = ['Seksi 1A', 'Seksi 1B', 'Seksi 1C', 'Seksi 2A', 'Seksi 2B'];
const detectSeksi = (name) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('1a') || lowerName.includes('sek1a')) return 'Seksi 1A';
  if (lowerName.includes('1b') || lowerName.includes('sek1b')) return 'Seksi 1B';
  if (lowerName.includes('1c') || lowerName.includes('sek1c')) return 'Seksi 1C';
  if (lowerName.includes('2a') || lowerName.includes('sek2a')) return 'Seksi 2A';
  if (lowerName.includes('2b') || lowerName.includes('sek2b')) return 'Seksi 2B';
  return null;
};

// Dark map tiles
const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const SATELLITE_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const STREET_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

// Becakayu route coordinates (approximate)
const BECAKAYU_ROUTE = [
  [-6.1960, 106.9320], // Seksi 1A start
  [-6.2000, 106.9350],
  [-6.2100, 106.9400],
  [-6.2200, 106.9420], // Seksi 1B
  [-6.2300, 106.9400],
  [-6.2400, 106.9380], // Seksi 1C
  [-6.2500, 106.9350], // Seksi 2A
  [-6.2600, 106.9300],
  [-6.2700, 106.9250], // Seksi 2B end
];

const SEKSI_MARKERS = [
  { pos: [-6.2050, 106.9375], name: 'Seksi 1A', persen: 92 },
  { pos: [-6.2250, 106.9410], name: 'Seksi 1B', persen: 78 },
  { pos: [-6.2350, 106.9390], name: 'Seksi 1C', persen: 45 },
  { pos: [-6.2500, 106.9350], name: 'Seksi 2A', persen: 88 },
  { pos: [-6.2650, 106.9280], name: 'Seksi 2B', persen: 62 },
];

const BecakayuMap = ({ lahanData }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef([]);
  const restoredLayersRef = useRef(false);
  const [basemap, setBasemap] = useState('dark');
  const [mouseCoords, setMouseCoords] = useState({ lat: 0, lng: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadedLayers, setUploadedLayers] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [highlightedSeksi, setHighlightedSeksi] = useState(null);

  // Load saved layers from localStorage on mount
  useEffect(() => {
    const savedLayers = localStorage.getItem('becakayu_gis_layers');
    if (savedLayers) {
      try {
        const parsed = JSON.parse(savedLayers);
        // Only load metadata, don't set state yet
        // This will trigger the restoration effect
        setUploadedLayers(parsed);
        restoredLayersRef.current = false; // Reset to allow restoration
      } catch (e) {
        console.error('Failed to load saved layers:', e);
      }
    }
  }, []);

  // Save layers to localStorage whenever they change
  useEffect(() => {
    try {
      if (uploadedLayers.length > 0) {
        // Only save necessary data, exclude the Leaflet layer object
        const layersToSave = uploadedLayers.map(l => ({
          id: l.id,
          name: l.name,
          visible: l.visible,
          geojson: l.geojson,
        }));
        localStorage.setItem('becakayu_gis_layers', JSON.stringify(layersToSave));
      } else {
        localStorage.removeItem('becakayu_gis_layers');
      }
    } catch (err) {
      console.error('Failed to save layers to localStorage:', err);
      // Don't crash if localStorage fails
    }
  }, [uploadedLayers]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    try {
      const map = L.map(mapContainerRef.current, {
        center: [-6.2347, 106.9322],
        zoom: 14,
        zoomControl: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        boxZoom: false,
        keyboard: false,
        dragging: false,
      });
      mapInstanceRef.current = map;

      // Basemap layers
      const darkLayer = L.tileLayer(DARK_TILES, {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      const satelliteLayer = L.tileLayer(SATELLITE_TILES, {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19,
      });

      const streetLayer = L.tileLayer(STREET_TILES, {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      });

      map.basemapLayers = { dark: darkLayer, satellite: satelliteLayer, street: streetLayer };

      // Mouse move coordinates
      map.on('mousemove', (e) => {
        setMouseCoords({ lat: e.latlng.lat.toFixed(4), lng: e.latlng.lng.toFixed(4) });
      });

      // Fit bounds
      const bounds = L.latLngBounds(BECAKAYU_ROUTE);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });

      return () => {
        map.remove();
        mapInstanceRef.current = null;
      };
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }, []);

  // Restore saved layers after map is initialized and data is loaded
  useEffect(() => {
    if (!mapInstanceRef.current || restoredLayersRef.current || uploadedLayers.length === 0) return;

    const map = mapInstanceRef.current;
    const bounds = L.latLngBounds([]);

    const restored = uploadedLayers
      .filter(saved => saved.geojson && saved.visible)
      .map((saved) => {
        try {
          const seksiName = saved.seksiName || detectSeksi(saved.name);
          const colors = SEKSI_COLORS[seksiName] || { color: '#3B82F6', gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)' };

          const layer = L.geoJSON(saved.geojson, {
            style: {
              color: colors.color,
              weight: 3,
              fillColor: colors.color,
              fillOpacity: 0.2,
            },
            onEachFeature: (f, l) => {
              l.bindPopup(`
                <div style="min-width:200px;font-family:Inter,sans-serif;">
                  <h4 style="margin:0 0 8px;font-size:14px;font-weight:700;color:#fff;">${f.properties?.name || saved.name}</h4>
                  ${seksiName ? `<p style="margin:0;font-size:12px;color:${colors.color};font-weight:600;">${seksiName}</p>` : ''}
                </div>
              `, { maxWidth: 250, className: 'seksi-popup' });
            },
          }).addTo(map);

          bounds.extend(layer.getBounds());

          const glowLayer = L.geoJSON(saved.geojson, {
            style: {
              color: colors.color,
              weight: 10,
              opacity: 0.3,
              fillColor: colors.color,
              fillOpacity: 0.1,
            },
          }).addTo(map);
          glowLayer.bringToBack();

          if (seksiName && layer.getBounds().isValid()) {
            const seksiData = lahanData.filter(item => item.lokasi === seksiName);
            let persen = 0;
            if (seksiData.length > 0) {
              const totalKeb = seksiData.reduce((sum, item) => sum + (parseFloat((item.kebutuhan || '0').toString().replace(/,/g, '')) || 0), 0);
              const totalReal = seksiData.reduce((sum, item) => sum + (parseFloat((item.realisasi || '0').toString().replace(/,/g, '')) || 0), 0);
              persen = totalKeb > 0 ? ((totalReal / totalKeb) * 100) : 0;
            }

            // Determine color based on progress
            let progressColor = colors.color;
            if (persen >= 90) progressColor = '#22C55E';
            else if (persen >= 70) progressColor = '#06B6D4';
            else if (persen >= 50) progressColor = '#F59E0B';
            else progressColor = '#EF4444';

            const center = layer.getBounds().getCenter();
          const iconHtml = `
              <div style="
                min-width:55px;
                padding:4px 8px;
                border-radius:6px;
                background:rgba(11,17,32,0.95);
                backdrop-filter:blur(12px);
                border:2px solid ${progressColor}60;
                box-shadow:0 0 16px ${progressColor}50, 0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15);
                font-family:Inter,sans-serif;
                animation:float-pulse 3s ease-in-out infinite;
              ">
                <div style="
                  font-size:7px;
                  font-weight:700;
                  color:${progressColor};
                  letter-spacing:0.3px;
                  text-transform:uppercase;
                  margin-bottom:2px;
                  text-align:center;
                ">${seksiName}</div>
                <div style="
                  font-size:12px;
                  font-weight:900;
                  color:#fff;
                  text-shadow:0 0 12px ${progressColor}70;
                  text-align:center;
                ">${persen.toFixed(1)}%</div>
              </div>
              <style>
                @keyframes float-pulse {
                  0%, 100% { 
                    transform: translateY(0px);
                    box-shadow:0 0 16px ${progressColor}50, 0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15);
                  }
                  50% { 
                    transform: translateY(-1px);
                    box-shadow:0 0 24px ${progressColor}70, 0 6px 28px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2);
                  }
                }
              </style>
            `;
            const icon = L.divIcon({
              className: 'seksi-marker-wrapper',
              html: iconHtml,
              iconSize: [55, 32],
              iconAnchor: [27.5, 16],
              popupAnchor: [0, -16],
            });
            const marker = L.marker(center, { icon }).addTo(mapInstanceRef.current);
            marker.bindPopup(`
              <div style="min-width:220px;font-family:Inter,sans-serif;padding:16px;background:rgba(11,17,32,0.95);border-radius:12px;border:1px solid ${colors.color}30;backdrop-filter:blur(12px);">
                <h4 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#fff;">${seksiName}</h4>
                <p style="margin:0;font-size:12px;color:#94a3b8;">Progress: <strong style="color:${colors.color};">${persen.toFixed(2)}%</strong></p>
                <div style="height:6px;border-radius:3px;background:rgba(255,255,255,0.1);margin:12px 0;overflow:hidden;">
                  <div style="height:100%;width:${Math.min(persen, 100)}%;background:${colors.gradient};border-radius:3px;box-shadow:0 0 12px ${colors.color}50;"></div>
                </div>
                <p style="margin:8px 0 0;font-size:11px;color:#64748b;">File: ${saved.name}</p>
              </div>
            `, { maxWidth: 280, className: 'seksi-popup' });

            layer.marker = marker;
          }

          return { id: saved.id, name: saved.name, layer, glowLayer, visible: true, seksiName, geojson: saved.geojson };
        } catch (layerErr) {
          console.error('Failed to restore layer:', saved.name, layerErr);
          return null;
        }
      })
      .filter(Boolean);

    setUploadedLayers(restored);
    restoredLayersRef.current = true;

    // Fit map to all layers
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [uploadedLayers.length, lahanData]);

  // Basemap switch
  const handleBasemapChange = (type) => {
    if (!mapInstanceRef.current?.basemapLayers) return;
    Object.values(mapInstanceRef.current.basemapLayers).forEach(layer => mapInstanceRef.current.removeLayer(layer));
    mapInstanceRef.current.basemapLayers[type].addTo(mapInstanceRef.current);
    setBasemap(type);
  };

  // File upload handler
  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check map instance
    if (!mapInstanceRef.current) {
      alert('Peta belum siap. Tunggu beberapa saat dan coba lagi.');
      e.target.value = '';
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File terlalu besar. Maksimal 5MB.');
      e.target.value = '';
      return;
    }

    try {
      const text = await file.text();

      // Check if content size is too large for localStorage (max ~2-3MB safe)
      const contentSize = new Blob([text]).size;
      if (contentSize > 2 * 1024 * 1024) {
        alert('File terlalu besar untuk disimpan. Layer tidak akan persist setelah refresh.');
      }

      let geojson;

      // Try to parse as KML
      if (file.name.toLowerCase().endsWith('.kml') || file.name.toLowerCase().endsWith('.kmz')) {
        try {
          const parser = new DOMParser();
          const xml = parser.parseFromString(text, 'text/xml');
          geojson = toGeoJSON.kml(xml);
        } catch (kmlErr) {
          throw new Error('Gagal parse KML: ' + kmlErr.message);
        }
      }
      // Try to parse as GeoJSON
      else if (file.name.toLowerCase().endsWith('.geojson') || file.name.toLowerCase().endsWith('.json')) {
        try {
          geojson = JSON.parse(text);
        } catch (jsonErr) {
          throw new Error('Gagal parse GeoJSON: ' + jsonErr.message);
        }
      } else {
        throw new Error('Format file tidak didukung. Gunakan .kml, .kmz, atau .geojson');
      }

      if (geojson?.features && geojson.features.length > 0) {
        // Detect Seksi from file name
        const seksiName = detectSeksi(file.name);
        const colors = SEKSI_COLORS[seksiName] || { color: '#3B82F6', gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)' };

        // Create main layer
        const layer = L.geoJSON(geojson, {
          style: {
            color: colors.color,
            weight: 3,
            fillColor: colors.color,
            fillOpacity: 0.2,
          },
          onEachFeature: (f, l) => {
            l.bindPopup(`
              <div style="min-width:200px;font-family:Inter,sans-serif;">
                <h4 style="margin:0 0 8px;font-size:14px;font-weight:700;color:#fff;">${f.properties?.name || file.name}</h4>
                ${seksiName ? `<p style="margin:0;font-size:12px;color:${colors.color};font-weight:600;">${seksiName}</p>` : ''}
              </div>
            `, { maxWidth: 250, className: 'seksi-popup' });
          },
        }).addTo(mapInstanceRef.current);

        // Create neon glow layer (duplicate with higher weight and opacity)
        const glowLayer = L.geoJSON(geojson, {
          style: {
            color: colors.color,
            weight: 10,
            opacity: 0.3,
            fillColor: colors.color,
            fillOpacity: 0.1,
          },
        }).addTo(mapInstanceRef.current);
        glowLayer.bringToBack();

        // Add marker at center with percentage if Seksi detected
        if (seksiName && layer.getBounds().isValid()) {
          // Calculate percentage from lahanData
          const seksiData = lahanData.filter(item => item.lokasi === seksiName);
          let persen = 0;
          if (seksiData.length > 0) {
            const totalKeb = seksiData.reduce((sum, item) => sum + (parseFloat((item.kebutuhan || '0').toString().replace(/,/g, '')) || 0), 0);
            const totalReal = seksiData.reduce((sum, item) => sum + (parseFloat((item.realisasi || '0').toString().replace(/,/g, '')) || 0), 0);
            persen = totalKeb > 0 ? ((totalReal / totalKeb) * 100) : 0;
          }

          // Determine color based on progress
          let progressColor = colors.color;
          if (persen >= 90) progressColor = '#22C55E'; // Green for completed
          else if (persen >= 70) progressColor = '#06B6D4'; // Cyan for good
          else if (persen >= 50) progressColor = '#F59E0B'; // Yellow for warning
          else progressColor = '#EF4444'; // Red for low

          const center = layer.getBounds().getCenter();
          const iconHtml = `
            <div style="
              min-width:55px;
              padding:4px 8px;
              border-radius:6px;
              background:rgba(11,17,32,0.95);
              backdrop-filter:blur(12px);
              border:2px solid ${progressColor}60;
              box-shadow:0 0 16px ${progressColor}50, 0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15);
              font-family:Inter,sans-serif;
              animation:float-pulse 3s ease-in-out infinite;
            ">
              <div style="
                font-size:7px;
                font-weight:700;
                color:${progressColor};
                letter-spacing:0.3px;
                text-transform:uppercase;
                margin-bottom:2px;
                text-align:center;
              ">${seksiName}</div>
              <div style="
                font-size:12px;
                font-weight:900;
                color:#fff;
                text-shadow:0 0 12px ${progressColor}70;
                text-align:center;
              ">${persen.toFixed(1)}%</div>
            </div>
            <style>
              @keyframes float-pulse {
                0%, 100% { 
                  transform: translateY(0px);
                  box-shadow:0 0 16px ${progressColor}50, 0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15);
                }
                50% { 
                  transform: translateY(-1px);
                  box-shadow:0 0 24px ${progressColor}70, 0 6px 28px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2);
                }
              }
            </style>
          `;
          const icon = L.divIcon({
            className: 'seksi-marker-wrapper',
            html: iconHtml,
            iconSize: [55, 32],
            iconAnchor: [27.5, 16],
            popupAnchor: [0, -16],
          });
          const marker = L.marker(center, { icon }).addTo(mapInstanceRef.current);
          marker.bindPopup(`
            <div style="min-width:220px;font-family:Inter,sans-serif;padding:16px;background:rgba(11,17,32,0.95);border-radius:12px;border:1px solid ${colors.color}30;backdrop-filter:blur(12px);">
              <h4 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#fff;">${seksiName}</h4>
              <p style="margin:0;font-size:12px;color:#94a3b8;">Progress: <strong style="color:${colors.color};">${persen.toFixed(2)}%</strong></p>
              <div style="height:6px;border-radius:3px;background:rgba(255,255,255,0.1);margin:12px 0;overflow:hidden;">
                <div style="height:100%;width:${Math.min(persen, 100)}%;background:${colors.gradient};border-radius:3px;box-shadow:0 0 12px ${colors.color}50;"></div>
              </div>
              <p style="margin:8px 0 0;font-size:11px;color:#64748b;">File: ${file.name}</p>
            </div>
          `, { maxWidth: 280, className: 'seksi-popup' });

          // Store marker with layer
          layer.marker = marker;
        }

        const newLayer = {
          id: Date.now(),
          name: file.name,
          layer,
          glowLayer,
          visible: true,
          seksiName,
          geojson: contentSize > 2 * 1024 * 1024 ? null : geojson,
        };

        // Use functional update to avoid stale state
        setUploadedLayers(prev => {
          const updated = [...prev, newLayer];
          return updated;
        });

        mapInstanceRef.current.fitBounds(layer.getBounds());
      } else {
        alert('File tidak mengandung data GIS valid (tidak ada features).');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Gagal memuat file: ' + (err.message || 'Unknown error'));
    } finally {
      e.target.value = ''; // Reset file input
    }
  }, []);

  // Toggle layer visibility
  const toggleLayer = (id) => {
    const layer = uploadedLayers.find(l => l.id === id);
    if (layer) {
      if (layer.visible) {
        mapInstanceRef.current.removeLayer(layer.layer);
        if (layer.glowLayer) mapInstanceRef.current.removeLayer(layer.glowLayer);
        if (layer.marker) mapInstanceRef.current.removeLayer(layer.marker);
      } else {
        layer.layer.addTo(mapInstanceRef.current);
        if (layer.glowLayer) {
          layer.glowLayer.addTo(mapInstanceRef.current);
          layer.glowLayer.bringToBack();
        }
        if (layer.marker) layer.marker.addTo(mapInstanceRef.current);
      }
      setUploadedLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
    }
  };

  // Remove layer
  const removeLayer = (id) => {
    try {
      const layer = uploadedLayers.find(l => l.id === id);
      if (!layer) {
        console.error('Layer not found:', id);
        return;
      }

      const map = mapInstanceRef.current;
      if (!map) {
        console.error('Map instance not available');
        return;
      }

      // Remove main layer
      if (layer.layer && map.hasLayer(layer.layer)) {
        map.removeLayer(layer.layer);
      }

      // Remove glow layer
      if (layer.glowLayer && map.hasLayer(layer.glowLayer)) {
        map.removeLayer(layer.glowLayer);
      }

      // Remove marker
      if (layer.marker && map.hasLayer(layer.marker)) {
        map.removeLayer(layer.marker);
      }

      // Remove from state
      setUploadedLayers(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      console.error('Error removing layer:', err);
      alert('Gagal menghapus layer: ' + err.message);
    }
  };

  // Zoom to layer
  const zoomToLayer = (id) => {
    const layer = uploadedLayers.find(l => l.id === id);
    if (layer) {
      mapInstanceRef.current.fitBounds(layer.layer.getBounds(), { padding: [50, 50] });
    }
  };

  // Zoom to fit all layers
  const zoomToAll = () => {
    if (!mapInstanceRef.current || uploadedLayers.length === 0) return;

    const map = mapInstanceRef.current;
    const bounds = L.latLngBounds([]);

    uploadedLayers.forEach(layer => {
      if (layer.visible && layer.layer && layer.layer.getBounds) {
        bounds.extend(layer.layer.getBounds());
        // Increase line thickness for better visibility
        const colors = SEKSI_COLORS[layer.seksiName] || { color: '#3B82F6' };
        layer.layer.setStyle({
          color: colors.color,
          weight: 5,
          fillColor: colors.color,
          fillOpacity: 0.3,
        });
        // Ensure main layer is on top of glow layer
        if (layer.glowLayer) {
          layer.glowLayer.bringToBack();
          layer.glowLayer.setStyle({
            color: colors.color,
            weight: 15,
            opacity: 0.4,
            fillColor: colors.color,
            fillOpacity: 0.15,
          });
        }
        layer.layer.bringToFront();
      }
    });

    if (bounds.isValid()) {
      const center = bounds.getCenter();
      map.setView(center, 13);
      // Ensure all layers are properly ordered after zoom
      uploadedLayers.forEach(layer => {
        if (layer.visible && layer.glowLayer) {
          layer.glowLayer.bringToBack();
        }
        if (layer.visible && layer.layer) {
          layer.layer.bringToFront();
        }
      });
    } else {
      // Fallback to default center if no valid layers
      map.setView([-6.2347, 106.9322], 13);
    }
  };

  // Highlight animation for layers
  useEffect(() => {
    if (!highlightedSeksi || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    uploadedLayers.forEach(layer => {
      if (layer.seksiName === highlightedSeksi && layer.visible) {
        // Add blinking animation
        const originalStyle = {
          color: SEKSI_COLORS[layer.seksiName]?.color || '#3B82F6',
          weight: 3,
          fillColor: SEKSI_COLORS[layer.seksiName]?.color || '#3B82F6',
          fillOpacity: 0.2,
        };

        let blink = 0;
        const interval = setInterval(() => {
          blink++;
          const opacity = blink % 2 === 0 ? 1 : 0.2;
          const weight = blink % 2 === 0 ? 5 : 2;
          layer.layer.setStyle({
            ...originalStyle,
            opacity,
            weight,
          });
          if (layer.glowLayer) {
            layer.glowLayer.setStyle({
              color: originalStyle.color,
              weight: 15,
              opacity,
              fillColor: originalStyle.color,
              fillOpacity: 0.1,
            });
          }
          if (blink >= 6) {
            clearInterval(interval);
            layer.layer.setStyle(originalStyle);
            if (layer.glowLayer) {
              layer.glowLayer.setStyle({
                color: originalStyle.color,
                weight: 10,
                opacity: 0.3,
                fillColor: originalStyle.color,
                fillOpacity: 0.1,
              });
            }
          }
        }, 300);

        return () => clearInterval(interval);
      }
    });
  }, [highlightedSeksi, uploadedLayers]);

  // Handle legend click
  const handleLegendClick = (seksiName) => {
    setHighlightedSeksi(seksiName);
    // Zoom to layer if it exists
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      mapContainerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  // Zoom in
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  // Zoom out
  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col h-full"
      style={{
        background: 'rgba(17,24,39,0.6)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-0 flex-shrink-0">
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight">Peta Lokasi</h2>
          <p className="text-[10px] text-slate-500 mt-0.5">Visualisasi lokasi dan progres per seksi</p>
        </div>
      </div>

      {/* Map */}
      <div className="relative rounded-2xl overflow-hidden flex-1 min-h-0" style={{ width: '100%', minHeight: '600px' }}>
        <div
          ref={mapContainerRef}
          style={{ width: '100%', height: '100%', background: '#0B1120' }}
        />

        {/* Coordinates overlay */}
        <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg text-[10px] text-slate-400"
          style={{ background: 'rgba(11,17,32,0.85)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {mouseCoords.lat}, {mouseCoords.lng}
        </div>

        {/* Zoom controls */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-[1000]">
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white transition-all hover:scale-110 hover:shadow-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.9), rgba(37,99,235,0.9))',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(59,130,246,0.4)',
              boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </button>
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white transition-all hover:scale-110 hover:shadow-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.9), rgba(37,99,235,0.9))',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(59,130,246,0.4)',
              boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </button>
        </div>

        {/* Seksi Legend */}
        <div className="absolute bottom-12 left-3 right-3 z-[1000]">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {SEKSI_ORDER.map((name) => {
              const colors = SEKSI_COLORS[name];
              const isHighlighted = highlightedSeksi === name;
              return (
                <div
                  key={name}
                  onClick={() => handleLegendClick(name)}
                  className="flex items-center gap-2 cursor-pointer px-4 py-2 rounded-full transition-all"
                  style={{
                    background: isHighlighted ? `${colors.color}40` : 'rgba(11,17,32,0.8)',
                    border: `1px solid ${colors.color}60`,
                    opacity: isHighlighted ? 1 : 0.8,
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{
                      background: colors.color,
                      boxShadow: isHighlighted ? `0 0 12px ${colors.color}` : `0 0 6px ${colors.color}60`,
                      animation: isHighlighted ? 'pulse 1s infinite' : 'none'
                    }}
                  />
                  <span className="text-[11px] text-slate-200 font-medium">{name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BecakayuMap;
