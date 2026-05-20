import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Search, Layers, Map as MapIcon, Maximize2, Minimize2, Download, Upload } from 'lucide-react';
import toGeoJSON from '@mapbox/togeojson';
import shp from 'shpjs';
import JSZip from 'jszip';
import api from '../../utils/api';

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
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [highlightedSeksi, setHighlightedSeksi] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);

  // Load layers from database on mount
  useEffect(() => {
    fetchLayers();
  }, []);

  const fetchLayers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/gis-layers');
      if (response.data.success) {
        const layers = response.data.data.map(layer => ({
          id: layer.id,
          name: layer.name,
          filename: layer.filename,
          file_type: layer.file_type,
          seksi: layer.seksi,
          color: layer.color,
          geojson: layer.geojson ? JSON.parse(layer.geojson) : null,
          visible: true,
        }));
        setUploadedLayers(layers);
      }
    } catch (error) {
      console.error('Error fetching layers:', error);
    } finally {
      setLoading(false);
    }
  };


  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    try {
      const map = L.map(mapContainerRef.current, {
        center: [-6.2347, 106.9322],
        zoom: 14,
        zoomControl: false,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        touchZoom: true,
        boxZoom: true,
        keyboard: true,
        dragging: true,
        zoomAnimation: true,
        fadeAnimation: true,
        markerZoomAnimation: true,
      });
      mapInstanceRef.current = map;

      // Enable all interactions explicitly
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();

      // Cursor grab/grabbing functionality
      const mapContainer = mapContainerRef.current;
      map.on('mousedown', () => {
        mapContainer.style.cursor = 'grabbing';
      });
      map.on('mouseup', () => {
        mapContainer.style.cursor = 'grab';
      });
      map.on('mouseout', () => {
        mapContainer.style.cursor = 'grab';
      });
      mapContainer.style.cursor = 'grab';

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

  // Restore layers after map is initialized and data is loaded
  useEffect(() => {
    if (!mapInstanceRef.current || restoredLayersRef.current || uploadedLayers.length === 0) return;

    const map = mapInstanceRef.current;
    const bounds = L.latLngBounds([]);

    const restored = uploadedLayers
      .filter(saved => saved.geojson && saved.visible)
      .map((saved) => {
        try {
          const seksiName = saved.seksi || detectSeksi(saved.name);
          const colors = SEKSI_COLORS[seksiName] || { color: saved.color || '#3B82F6', gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)' };

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

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [uploadedLayers, lahanData]);

  // Basemap switch
  const handleBasemapChange = (type) => {
    if (!mapInstanceRef.current?.basemapLayers) return;
    Object.values(mapInstanceRef.current.basemapLayers).forEach(layer => mapInstanceRef.current.removeLayer(layer));
    mapInstanceRef.current.basemapLayers[type].addTo(mapInstanceRef.current);
    setBasemap(type);
  };

  // File upload handler - supports KML, KMZ, GeoJSON, SHP, ZIP
  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!mapInstanceRef.current) {
      alert('Peta belum siap. Tunggu beberapa saat dan coba lagi.');
      e.target.value = '';
      return;
    }

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('File terlalu besar. Maksimal 50MB.');
      e.target.value = '';
      return;
    }

    try {
      setLoading(true);
      let geojson;
      const fileExt = file.name.toLowerCase().split('.').pop();

      // Detect Seksi from file name
      const seksiName = detectSeksi(file.name);
      
      // Parse based on file type
      if (fileExt === 'kml') {
        const text = await file.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');
        geojson = toGeoJSON.kml(xml);
      } else if (fileExt === 'kmz') {
        const zip = await JSZip.loadAsync(file);
        const kmlFile = Object.keys(zip.files).find(name => name.toLowerCase().endsWith('.kml'));
        if (!kmlFile) {
          throw new Error('File KMZ tidak mengandung file KML');
        }
        const kmlContent = await zip.file(kmlFile).async('string');
        const parser = new DOMParser();
        const xml = parser.parseFromString(kmlContent, 'text/xml');
        geojson = toGeoJSON.kml(xml);
      } else if (fileExt === 'geojson' || fileExt === 'json') {
        const text = await file.text();
        geojson = JSON.parse(text);
      } else if (fileExt === 'shp' || fileExt === 'zip') {
        const arrayBuffer = await file.arrayBuffer();
        geojson = await shp(arrayBuffer);
      } else {
        throw new Error('Format file tidak didukung. Gunakan .kml, .kmz, .geojson, .shp, atau .zip');
      }

      if (geojson?.features && geojson.features.length > 0) {
        // Upload file to backend
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', file.name);
        formData.append('seksi', seksiName || '');

        const uploadResponse = await api.post('/gis-layers/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (uploadResponse.data.success) {
          const layerId = uploadResponse.data.data.id;

          // Update GeoJSON to backend
          await api.put(`/gis-layers/${layerId}/geojson`, { geojson });

          // Render layer on map
          const colors = SEKSI_COLORS[seksiName] || { color: '#3B82F6', gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)' };

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

          // Add progress marker if Seksi detected
          if (seksiName && layer.getBounds().isValid()) {
            const seksiData = lahanData.filter(item => item.lokasi === seksiName);
            let persen = 0;
            if (seksiData.length > 0) {
              const totalKeb = seksiData.reduce((sum, item) => sum + (parseFloat((item.kebutuhan || '0').toString().replace(/,/g, '')) || 0), 0);
              const totalReal = seksiData.reduce((sum, item) => sum + (parseFloat((item.realisasi || '0').toString().replace(/,/g, '')) || 0), 0);
              persen = totalKeb > 0 ? ((totalReal / totalKeb) * 100) : 0;
            }

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
                <p style="margin:8px 0 0;font-size:11px;color:#64748b;">File: ${file.name}</p>
              </div>
            `, { maxWidth: 280, className: 'seksi-popup' });

            layer.marker = marker;
          }

          const newLayer = {
            id: layerId,
            name: file.name,
            layer,
            glowLayer,
            visible: true,
            seksiName,
            geojson,
          };

          setUploadedLayers(prev => [...prev, newLayer]);
          mapInstanceRef.current.fitBounds(layer.getBounds());
          alert('File berhasil diupload!');
        }
      } else {
        alert('File tidak mengandung data GIS valid (tidak ada features).');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Gagal memuat file: ' + (err.message || 'Unknown error'));
    } finally {
      e.target.value = '';
      setLoading(false);
    }
  }, [lahanData]);

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

  // Remove layer - uses backend API
  const removeLayer = async (id) => {
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

      // Remove from map
      if (layer.layer && map.hasLayer(layer.layer)) {
        map.removeLayer(layer.layer);
      }
      if (layer.glowLayer && map.hasLayer(layer.glowLayer)) {
        map.removeLayer(layer.glowLayer);
      }
      if (layer.marker && map.hasLayer(layer.marker)) {
        map.removeLayer(layer.marker);
      }

      // Delete from backend
      await api.delete(`/gis-layers/${id}`);

      // Remove from state
      setUploadedLayers(prev => prev.filter(l => l.id !== id));
      alert('Layer berhasil dihapus!');
    } catch (err) {
      console.error('Error removing layer:', err);
      alert('Gagal menghapus layer: ' + (err.message || 'Unknown error'));
    }
  };

  // Zoom to layer
  const zoomToLayer = (id) => {
    const layer = uploadedLayers.find(l => l.id === id);
    if (layer && layer.layer) {
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

  // Toggle fullscreen - expands map card to fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    // Invalidate map size after a short delay to ensure proper rendering
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 300);
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

  // Clear uploaded layers
  const handleClearLayers = async () => {
    try {
      // Remove all from map
      uploadedLayers.forEach(item => {
        if (item.layer && mapInstanceRef.current) {
          mapInstanceRef.current.removeLayer(item.layer);
        }
        if (item.glowLayer && mapInstanceRef.current) {
          mapInstanceRef.current.removeLayer(item.glowLayer);
        }
        if (item.marker && mapInstanceRef.current) {
          mapInstanceRef.current.removeLayer(item.marker);
        }
      });
      layersRef.current = [];

      // Clear from backend
      await api.delete('/gis-layers');
      
      setUploadedLayers([]);
      alert('Semua layer berhasil dihapus!');
    } catch (err) {
      console.error('Error clearing layers:', err);
      alert('Gagal menghapus semua layer: ' + (err.message || 'Unknown error'));
    }
  };

  // Download layer - uses backend API
  const handleDownloadLayer = async (id) => {
    try {
      window.open(`/api/gis-layers/${id}/download`, '_blank');
    } catch (err) {
      console.error('Error downloading layer:', err);
      alert('Gagal mendownload layer: ' + (err.message || 'Unknown error'));
    }
  };

  return (
    <div
      className={`rounded-2xl overflow-hidden flex flex-col transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'h-full'}`}
      style={{
        background: 'rgba(17,24,39,0.6)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Header */}
      <div className="flex flex-col gap-3 p-4 pb-0 flex-shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">Peta Lokasi</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">Visualisasi lokasi dan progres per seksi</p>
          </div>

          {/* Upload GIS Button */}
          <div className="flex gap-2">
            <input
              type="file"
              accept=".kml,.kmz,.geojson,.json,.shp,.zip"
              onChange={handleFileUpload}
              disabled={loading}
              style={{ display: 'none' }}
              id="gis-upload"
            />
            <label
              htmlFor="gis-upload"
              className="px-4 py-2 rounded-lg text-xs font-medium text-white cursor-pointer transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, rgba(59,130,246,0.9), rgba(37,99,235,0.9))',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(59,130,246,0.4)',
                boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
              }}
            >
              {loading ? 'Uploading...' : 'Upload GIS'}
            </label>

            {uploadedLayers.length > 0 && (
              <button
                onClick={handleClearLayers}
                className="px-3 py-2 rounded-lg text-xs font-medium text-white cursor-pointer transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.9), rgba(220,38,38,0.9))',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(239,68,68,0.4)',
                  boxShadow: '0 4px 16px rgba(239,68,68,0.3)',
                }}
              >
                Hapus Semua
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Map */}
      <div
        className="relative rounded-2xl overflow-hidden flex-1 min-h-0 transition-all duration-300"
        style={{
          width: '100%',
          minHeight: '600px',
          border: showTooltip ? '2px solid rgba(59,130,246,0.6)' : '1px solid rgba(255,255,255,0.08)',
          boxShadow: showTooltip ? '0 0 20px rgba(59,130,246,0.4), 0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        <div
          ref={mapContainerRef}
          style={{ width: '100%', height: '100%', background: '#0B1120' }}
        />

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute top-3 left-1/2 transform -translate-x-1/2 px-3 py-1.5 rounded-lg text-[10px] text-white z-[1001] transition-opacity duration-300"
            style={{
              background: 'rgba(11,17,32,0.95)',
              border: '1px solid rgba(59,130,246,0.4)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
            }}
          >
            Gunakan Ctrl + Scroll untuk zoom
          </div>
        )}

        {/* Coordinates overlay */}
        <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg text-[10px] text-slate-400"
          style={{ background: 'rgba(11,17,32,0.85)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {mouseCoords.lat}, {mouseCoords.lng}
        </div>

        {/* Zoom controls */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-[1000]">
          <button
            onClick={toggleFullscreen}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white transition-all hover:scale-110 hover:shadow-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.9), rgba(217,119,6,0.9))',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(245,158,11,0.4)',
              boxShadow: '0 4px 16px rgba(245,158,11,0.3)',
            }}
            title={isFullscreen ? 'Keluar Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
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

        {/* Legend Section */}
        <div
          className="absolute top-3 left-3 rounded-xl px-3 py-2 text-[9px] z-[2000] transition-all duration-300"
          style={{
            background: 'rgba(11,17,32,0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          <p className="text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[8px]">Keterangan</p>
          <div className="flex items-center gap-3 flex-wrap">
            {SEKSI_ORDER.map(seksi => {
              const colors = SEKSI_COLORS[seksi];
              const seksiData = lahanData.filter(item => item.lokasi === seksi);
              let persen = 0;
              if (seksiData.length > 0) {
                const totalKeb = seksiData.reduce((sum, item) => sum + (parseFloat((item.kebutuhan || '0').toString().replace(/,/g, '')) || 0), 0);
                const totalReal = seksiData.reduce((sum, item) => sum + (parseFloat((item.realisasi || '0').toString().replace(/,/g, '')) || 0), 0);
                persen = totalKeb > 0 ? ((totalReal / totalKeb) * 100) : 0;
              }

              return (
                <div key={seksi} className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      background: colors.color,
                      boxShadow: `0 0 8px ${colors.color}`,
                    }}
                  />
                  <span className="text-slate-300 font-medium">{seksi}</span>
                  <span className="text-white font-bold" style={{ color: colors.color }}>{persen.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Uploaded layers with download and delete buttons */}
        {uploadedLayers.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            {uploadedLayers.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg"
                style={{
                  background: `${item.color || '#3B82F6'}20`,
                  border: `1px solid ${item.color || '#3B82F6'}50`,
                  backdropFilter: 'blur(12px)',
                }}
              >
                <span
                  className="w-1 h-1 rounded-full"
                  style={{ background: item.color || '#3B82F6' }}
                />
                <span className="text-[7px] text-white font-medium max-w-20 truncate">{item.name}</span>
                <button
                  onClick={() => handleDownloadLayer(item.id)}
                  className="w-3 h-3 rounded flex items-center justify-center text-green-400 hover:text-green-300 hover:bg-green-500/30 transition-all text-[7px]"
                  style={{
                    background: 'rgba(34,197,94,0.1)',
                    border: '1px solid rgba(34,197,94,0.3)',
                  }}
                  title="Download"
                >
                  ↓
                </button>
                <button
                  onClick={() => removeLayer(item.id)}
                  className="w-3 h-3 rounded flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/30 transition-all text-[7px]"
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                  }}
                  title="Hapus"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BecakayuMap;
