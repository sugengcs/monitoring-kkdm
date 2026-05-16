import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import api from '../utils/api';
import { validateKMLFile } from '../utils/kmlParser';
import { Edit2, Trash2, MapPin, Upload, X, Save, Layers, Eye, EyeOff, ChevronRight, ChevronDown, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { getStatusConfig, requiresAnimation, getAnimationClass, isDamageStatus, isRepairStatus } from '../utils/markerStatusHelper';

// Calculate polygon area in square meters using Shoelace formula
const calculatePolygonArea = (coordinates) => {
  if (!coordinates || coordinates.length < 3) return 0;

  let area = 0;
  const n = coordinates.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const [lng1, lat1] = coordinates[i];
    const [lng2, lat2] = coordinates[j];
    area += (lng1 * lat2) - (lng2 * lat1);
  }

  area = Math.abs(area) / 2;

  // Convert to square meters (approximate for small areas)
  // This is a rough conversion - for accurate results, use a proper geospatial library
  const earthRadius = 6371000; // meters
  const avgLat = coordinates.reduce((sum, coord) => sum + coord[1], 0) / n;
  const latRad = avgLat * (Math.PI / 180);
  const metersPerDeg = earthRadius * (Math.PI / 180) * Math.cos(latRad);

  return area * metersPerDeg * metersPerDeg;
};

// Format area to human readable string (always in square meters)
const formatArea = (areaSqMeters) => {
  if (areaSqMeters === 0) return '0 m²';
  return `${Math.round(areaSqMeters).toLocaleString('id-ID')} m²`;
};

const getConditionColor = (condition) => {
  switch (condition) {
    case 'baik': return '#22c55e';
    case 'rusak_ringan':
    case 'rusak_berat': return '#ef4444';
    case 'sedang_diperbaiki': return '#3b82f6';
    case 'selesai_diperbaiki': return '#22c55e';
    default: return '#6b7280';
  }
};

const getConditionDisplay = (condition) => {
  switch (condition) {
    case 'baik': return 'Baik';
    case 'rusak_ringan':
    case 'rusak_berat': return 'Rusak';
    case 'sedang_diperbaiki': return 'Perbaikan';
    case 'selesai_diperbaiki': return 'Selesai Perbaikan';
    default: return condition ? condition.replace(/_/g, ' ') : '-';
  }
};

const getCategoryColor = (categoryName) => {
  if (!categoryName) return '#6b7280';
  const upper = categoryName.toUpperCase();
  // Fixed colors for known categories
  if (upper === 'PERKERASAN' || upper.includes('PERKERASAN')) return '#f97316'; // orange
  if (upper === 'PJU') return '#eab308'; // yellow
  if (upper === 'CCTV' || upper === 'PENGAWAS' || upper === 'KAMERA') return '#3b82f6'; // blue
  if (upper === 'RAMBU') return '#ef4444'; // red
  if (upper === 'PANEL' || upper.includes('PANEL')) return '#a855f7'; // purple
  if (upper === 'KWH' || upper.includes('KWH')) return '#06b6d4'; // cyan
  const palette = ['#22c55e', '#14b8a6', '#f43f5e', '#84cc16', '#6366f1', '#ec4899'];
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
};

const getCategoryDisplayName = (categoryName) => {
  if (!categoryName) return '-';
  return categoryName.toUpperCase()
    .replace(/PENGAWAS/g, 'CCTV')
    .replace(/KAMERA/g, 'CCTV')
    .replace(/PJU/g, 'LAMPU PJU');
};

const MonitoringMap = () => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const categoryLayersRef = useRef({});
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [visibleCategories, setVisibleCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedCondition, setSelectedCondition] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [editingAsset, setEditingAsset] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [kmlFile, setKmlFile] = useState(null);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const markersByCategoryRef = useRef({});
  const markerByAssetIdRef = useRef({});
  const blinkTimerRef = useRef(null);
  const blinkingMarkerRef = useRef(null);
  const blinkOriginalRef = useRef(null);
  const markerStatusRef = useRef({}); // Store status animations by asset ID
  const assetConditionRef = useRef({}); // Track current condition per asset id
  const pollIntervalRef = useRef(null);
  const [selectedAssetDetail, setSelectedAssetDetail] = useState(null); // rich popup data
  const [detailLoading, setDetailLoading] = useState(false);

  // Update marker status with animation
  const updateMarkerStatus = useCallback((marker, conditionStatus, originalStyle) => {
    if (!marker) return;

    const statusConfig = getStatusConfig(conditionStatus);
    
    // Remove old animation classes
    const pathElement = marker?.getElement();
    if (pathElement) {
      pathElement.classList.remove('marker-status-damage', 'marker-status-repair');
    }

    // Apply new animation if required
    if (statusConfig.animationClass && pathElement) {
      pathElement.classList.add(statusConfig.animationClass);
    }

    // Update marker style based on status
    const condColor = getConditionColor(conditionStatus);
    marker.setStyle({
      color: condColor,
      weight: isDamageStatus(conditionStatus) || isRepairStatus(conditionStatus) ? 4 : 3,
    });

    // Store status reference for cleanup
    markerStatusRef.current[marker._leaflet_id] = {
      conditionStatus,
      animationClass: statusConfig.animationClass
    };
  }, []);

  // Clean up marker status animations
  const cleanupMarkerStatus = useCallback((marker) => {
    if (!marker) return;

    const pathElement = marker?.getElement();
    if (pathElement) {
      pathElement.classList.remove('marker-status-damage', 'marker-status-repair');
    }

    delete markerStatusRef.current[marker._leaflet_id];
  }, []);

  // Apply or remove animation class on marker SVG element
  const applyMarkerAnimation = useCallback((marker, conditionStatus) => {
    if (!marker) return;
    const el = marker.getElement ? marker.getElement() : null;
    if (el) {
      el.classList.remove('marker-status-damage', 'marker-status-repair');
      const statusConfig = getStatusConfig(conditionStatus);
      if (statusConfig.animationClass) {
        el.classList.add(statusConfig.animationClass);
      }
    }
  }, []);

  // Update a single marker's visual based on new condition without re-rendering the map
  const updateMarkerCondition = useCallback((assetId, newCondition) => {
    const marker = markerByAssetIdRef.current[assetId];
    if (!marker) return;

    const condColor = getConditionColor(newCondition);
    const isDmg = isDamageStatus(newCondition);
    const isRep = isRepairStatus(newCondition);
    const weight = isDmg || isRep ? 4 : 3;
    const radius = isDmg || isRep ? 8 : 5;

    try {
      if (marker.setRadius) {
        // circleMarker
        marker.setStyle({ color: condColor, weight });
        marker.setRadius(radius);
      } else {
        // polygon / polyline
        marker.setStyle({ color: condColor, weight });
      }
      if (isDmg || isRep) marker.bringToFront();
    } catch (_) {}

    applyMarkerAnimation(marker, newCondition);
    assetConditionRef.current[assetId] = newCondition;
  }, [applyMarkerAnimation]);

  // Fetch asset detail (with latest report) for popup
  const fetchAssetDetail = useCallback(async (assetId) => {
    try {
      setDetailLoading(true);
      const res = await api.get(`/assets/detail/${assetId}`);
      if (res.data.success) {
        setSelectedAssetDetail(res.data.data);
      }
    } catch (err) {
      console.error('fetchAssetDetail error:', err);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // Polling: fetch only conditions every 30s and update changed markers
  const pollConditions = useCallback(async () => {
    try {
      const res = await api.get('/assets/conditions');
      if (!res.data.success) return;
      const rows = res.data.data;
      rows.forEach(({ id, condition_status }) => {
        const prev = assetConditionRef.current[id];
        if (prev !== undefined && prev !== condition_status) {
          console.log(`[Poll] Asset ${id} condition changed: ${prev} → ${condition_status}`);
          updateMarkerCondition(id, condition_status);
          // Also update local assets state so sidebar reflects change
          setAssets(prevAssets =>
            prevAssets.map(a => a.id === id ? { ...a, condition_status } : a)
          );
        }
      });
    } catch (err) {
      // silent fail on poll
    }
  }, [updateMarkerCondition]);

  const stopBlink = useCallback(() => {
    if (blinkTimerRef.current) {
      clearInterval(blinkTimerRef.current);
      blinkTimerRef.current = null;
    }
    if (blinkingMarkerRef.current && blinkOriginalRef.current) {
      blinkingMarkerRef.current.setStyle(blinkOriginalRef.current);
      blinkingMarkerRef.current = null;
      blinkOriginalRef.current = null;
    }
  }, []);

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/assets', {
        params: { condition: selectedCondition, month: selectedMonth, year: selectedYear, limit: 9999 }
      });
      const data = response.data.data || [];
      setAssets(data);

      const cats = [...new Set(data.map(a => a.category_name).filter(Boolean))];
      setCategories(cats);
      setVisibleCategories(prev => {
        const next = { ...prev };
        cats.forEach(c => { if (next[c] === undefined) next[c] = true; });
        return next;
      });
      setSelectedAsset(null);
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCondition]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Start polling after initial load
  useEffect(() => {
    pollIntervalRef.current = setInterval(pollConditions, 30000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [pollConditions]);

  // Refresh on page visibility change (user returns to tab)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        pollConditions();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [pollConditions]);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-6.2347001, 106.9321978],
      zoom: 14,
      scrollWheelZoom: true,
      layers: [],
    });

    const baseLayers = {
      'Imagery': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
        maxZoom: 19,
      }),
      'Imagery Hybrid': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
        maxZoom: 19,
      }),
      'Topographic': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri &amp; the GIS User Community',
        maxZoom: 19,
      }),
    };

    // Default to Topographic
    baseLayers['Topographic'].addTo(map);

    // Add layer control
    L.control.layers(baseLayers, null, { collapsed: true, position: 'topright' }).addTo(map);

    mapInstanceRef.current = map;

    // Stop blinking when map is panned/dragged
    map.on('dragstart', () => stopBlink());

    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      // Clean up all marker status animations
      Object.values(markerByAssetIdRef.current).forEach(marker => {
        cleanupMarkerStatus(marker);
      });
      markerStatusRef.current = {};
      
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [stopBlink, cleanupMarkerStatus]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clean up old marker status animations
    Object.values(markerByAssetIdRef.current).forEach(marker => {
      cleanupMarkerStatus(marker);
    });
    markerStatusRef.current = {};

    Object.values(categoryLayersRef.current).forEach(layerGroup => {
      map.removeLayer(layerGroup);
    });
    categoryLayersRef.current = {};
    markersByCategoryRef.current = {};
    markerByAssetIdRef.current = {};

    if (assets.length === 0) return;

    const validPoints = assets
      .map(a => [parseFloat(a.location_lat), parseFloat(a.location_lng)])
      .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));

    if (validPoints.length > 0) {
      if (validPoints.length === 1) {
        map.setView(validPoints[0], 16);
      } else {
        const bounds = L.latLngBounds(validPoints);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16, animate: true, duration: 1 });
      }
    }

    // Helper: parse geometry from asset description field
    const parseGeometry = (asset) => {
      if (!asset.description) return null;
      try {
        const geo = JSON.parse(asset.description);
        if (geo && geo.geometryType && Array.isArray(geo.coordinates)) return geo;
      } catch (_) {}
      return null;
    };

    // Helper: detect geometry type from asset_code prefix
    const getGeometryType = (asset) => {
      const code = asset.asset_code || '';
      if (code.startsWith('KML-POLY-') || code.startsWith('GEO-POLY-') || code.startsWith('SHP-POLY-')) return 'Polygon';
      if (code.startsWith('KML-LINE-') || code.startsWith('GEO-LINE-') || code.startsWith('SHP-LINE-') || code.startsWith('GPX-LINE-')) return 'LineString';
      return 'Point'; // KML, GEO, SHP, GPX, CSV all default to Point
    };

    const byCategory = {};
    assets.forEach(asset => {
      const cat = asset.category_name || 'Tanpa Kategori';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(asset);
    });

    Object.entries(byCategory).forEach(([cat, items]) => {
      const layerGroup = L.layerGroup();
      const color = getCategoryColor(cat);

      items.forEach(asset => {
        const lat = parseFloat(asset.location_lat);
        const lng = parseFloat(asset.location_lng);
        if (isNaN(lat) || isNaN(lng)) return;

        const condColor = getConditionColor(asset.condition_status);
        const statusConfig = getStatusConfig(asset.condition_status);
        const markerWeight = isDamageStatus(asset.condition_status) || isRepairStatus(asset.condition_status) ? 4 : 3;
        const geoType = getGeometryType(asset);
        const geometry = parseGeometry(asset);

        // Popup content builder
        const isKmlImport = asset.asset_code && asset.asset_code.startsWith('KML-');
        const isPJU = asset.category_name?.toUpperCase().includes('PJU');
        const geoLabel = geoType === 'Polygon' ? '⬡ Polygon' : geoType === 'LineString' ? '╌ Garis' : '● Titik';

        const popupContent = isKmlImport
          ? `<div style="min-width:120px;font-family:Inter,sans-serif">
              <h3 style="font-weight:700;color:#1f2937;font-size:14px;margin:0 0 4px 0">${asset.name || asset.category_name || 'N/A'}</h3>
              <p style="font-size:11px;color:#6b7280;margin:0"><b>Layer:</b> ${asset.category_name || '-'}</p>
              <p style="font-size:11px;color:#6b7280;margin:2px 0"><b>Tipe:</b> ${geoLabel}</p>
            </div>`
          : `<div style="min-width:220px;font-family:Inter,sans-serif">
              <h3 style="font-weight:700;margin-bottom:6px;color:#1f2937;font-size:15px">${asset.name || asset.category_name}</h3>
              <p style="font-size:12px;color:#4b5563;margin:3px 0"><b>Jenis:</b> ${asset.category_name || '-'}</p>
              <p style="font-size:12px;color:#4b5563;margin:3px 0"><b>Kondisi:</b> <span style="color:${condColor};font-weight:600">${getConditionDisplay(asset.condition_status)}</span></p>
              <p style="font-size:12px;color:#4b5563;margin:3px 0"><b>STA:</b> ${asset.sta || '-'}</p>
              <p style="font-size:11px;color:#9ca3af;margin-top:6px">&#128722; Klik sidebar untuk detail lengkap</p>
            </div>`;

        let marker;

        if (geoType === 'Polygon' && geometry) {
          // Render as L.polygon — coords are [lng, lat], Leaflet needs [lat, lng]
          const latLngs = geometry.coordinates.map(c => [c[1], c[0]]);
          marker = L.polygon(latLngs, {
            color: color,
            weight: isDamageStatus(asset.condition_status) || isRepairStatus(asset.condition_status) ? 4 : 2,
            opacity: 0.9,
            fillColor: color,
            fillOpacity: 0.2,
            className: statusConfig.animationClass || ''
          });
        } else if (geoType === 'LineString' && geometry) {
          // Render as L.polyline — coords are [lng, lat], Leaflet needs [lat, lng]
          const latLngs = geometry.coordinates.map(c => [c[1], c[0]]);
          marker = L.polyline(latLngs, {
            color: color,
            weight: isDamageStatus(asset.condition_status) || isRepairStatus(asset.condition_status) ? 5 : 3,
            opacity: 0.9,
            className: statusConfig.animationClass || ''
          });
        } else {
          // Default: circleMarker for Point
          marker = L.circleMarker([lat, lng], {
            radius: isDamageStatus(asset.condition_status) || isRepairStatus(asset.condition_status) ? 8 : 5,
            fillColor: color,
            fillOpacity: 0.9,
            color: condColor,
            weight: markerWeight,
            className: statusConfig.animationClass || ''
          });
        }

        // Register condition in ref for polling comparison
        assetConditionRef.current[asset.id] = asset.condition_status;

        marker.on('click', () => {
          setSelectedAsset(asset);
          setSelectedAssetDetail(null);
          setEditingAsset(null);
          fetchAssetDetail(asset.id);
          stopBlink();
          const m = marker;
          const orig = {
            color: m.options.color,
            weight: m.options.weight,
            fillColor: m.options.fillColor,
            fillOpacity: m.options.fillOpacity,
            ...(geoType === 'Point' ? { radius: m.options.radius } : {}),
          };
          blinkOriginalRef.current = orig;
          blinkingMarkerRef.current = m;
          let on = true;
          const blinkStyle = geoType === 'Point'
            ? { radius: 22, fillColor: '#ef4444', color: '#ef4444', weight: 5, fillOpacity: 1 }
            : { color: '#ef4444', weight: 4, fillColor: '#ef4444', fillOpacity: geoType === 'Polygon' ? 0.4 : undefined };
          m.setStyle(blinkStyle);
          m.bringToFront();
          blinkTimerRef.current = setInterval(() => {
            on = !on;
            m.setStyle(on ? blinkStyle : orig);
            if (on) m.bringToFront();
          }, 500);
        });

        marker.bindPopup(popupContent);

        if (isKmlImport) {
          marker.bindTooltip(`${asset.name || asset.category_name || 'N/A'}`, {
            direction: 'top',
            offset: [0, geoType === 'Point' ? -10 : 0],
            className: 'kml-layer-tooltip'
          });
        }

        layerGroup.addLayer(marker);

        if (!markersByCategoryRef.current[cat]) markersByCategoryRef.current[cat] = [];
        markersByCategoryRef.current[cat].push(marker);
        markerByAssetIdRef.current[asset.id] = marker;
      });

      categoryLayersRef.current[cat] = layerGroup;
      if (visibleCategories[cat] !== false) {
        layerGroup.addTo(map);
      }
    });
  }, [assets, visibleCategories]);

  const toggleCategory = (cat) => {
    setVisibleCategories(prev => {
      const next = { ...prev, [cat]: !prev[cat] };
      const layer = categoryLayersRef.current[cat];
      const map = mapInstanceRef.current;
      if (layer && map) {
        if (next[cat]) {
          map.addLayer(layer);
        } else {
          map.removeLayer(layer);
        }
      }
      return next;
    });
  };

  const zoomToCategory = (cat) => {
    setActiveCategory(cat);
    const catAssets = assets.filter(a => a.category_name === cat);
    if (catAssets.length === 0) return;

    const map = mapInstanceRef.current;
    if (!map) return;

    // Ensure layer is visible
    setVisibleCategories(prev => {
      if (prev[cat] === false) {
        const layer = categoryLayersRef.current[cat];
        if (layer) map.addLayer(layer);
      }
      return { ...prev, [cat]: true };
    });

    // Build bounds
    const validPoints = catAssets
      .map(a => [parseFloat(a.location_lat), parseFloat(a.location_lng)])
      .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));

    if (validPoints.length === 0) return;

    if (validPoints.length === 1) {
      map.setView(validPoints[0], 16);
    } else {
      const bounds = L.latLngBounds(validPoints);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }

    // Blink effect: flash markers in this category
    const markers = markersByCategoryRef.current[cat] || [];
    if (markers.length === 0) return;

    // Save original styles
    const originals = markers.map(m => ({
      radius: m.options.radius,
      fillColor: m.options.fillColor,
      color: m.options.color,
      weight: m.options.weight,
      fillOpacity: m.options.fillOpacity,
    }));

    // Flash ON: big white markers
    markers.forEach(m => {
      m.setStyle({
        radius: 20,
        fillColor: '#ffffff',
        color: '#ffffff',
        weight: 4,
        fillOpacity: 1,
      });
      m.bringToFront();
    });

    // Flash OFF after 400ms
    setTimeout(() => {
      markers.forEach((m, i) => {
        m.setStyle({
          radius: originals[i].radius,
          fillColor: originals[i].fillColor,
          color: originals[i].color,
          weight: originals[i].weight,
          fillOpacity: originals[i].fillOpacity,
        });
      });
    }, 400);

    // Flash ON again
    setTimeout(() => {
      markers.forEach(m => {
        m.setStyle({
          radius: 20,
          fillColor: '#ffffff',
          color: '#ffffff',
          weight: 4,
          fillOpacity: 1,
        });
        m.bringToFront();
      });
    }, 600);

    // Restore final
    setTimeout(() => {
      markers.forEach((m, i) => {
        m.setStyle({
          radius: originals[i].radius,
          fillColor: originals[i].fillColor,
          color: originals[i].color,
          weight: originals[i].weight,
          fillOpacity: originals[i].fillOpacity,
        });
      });
      setActiveCategory(null);
    }, 1000);
  };

  const handleDeleteCategory = async (categoryName) => {
    const catAssets = assets.filter(a => a.category_name === categoryName);
    if (catAssets.length === 0) return;
    
    if (!window.confirm(`Yakin ingin menghapus ${catAssets.length} aset di layer "${categoryName}"?\n\nTindakan ini tidak dapat dibatalkan!`)) {
      return;
    }
    
    try {
      // Delete all assets in the category individually
      for (const asset of catAssets) {
        await api.delete(`/assets/${asset.id}`);
      }
      
      fetchAssets();
      toast.success(`${catAssets.length} aset berhasil dihapus dari layer "${categoryName}"`);
    } catch (error) {
      console.error('Delete category error:', error);
      toast.error('Gagal menghapus aset: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (id) => {
    console.log('[Delete] clicked for id:', id);
    if (!window.confirm('Yakin ingin menghapus aset ini?')) {
      console.log('[Delete] cancelled by user');
      return;
    }
    try {
      console.log('[Delete] calling API DELETE /assets/' + id);
      const res = await api.delete(`/assets/${id}`);
      console.log('[Delete] API success:', res.data);
      setSelectedAsset(null);
      await fetchAssets();
      toast.success('Aset berhasil dihapus');
      console.log('[Delete] completed');
    } catch (error) {
      console.error('[Delete] error:', error);
      const msg = error.response?.data?.message || 'Gagal menghapus aset';
      console.error('[Delete] error message:', msg);
      toast.error(msg);
      alert('Gagal menghapus: ' + msg);
    }
  };

  const handleEditClick = (asset) => {
    setEditingAsset(asset.id);
    setEditForm({
      name: asset.name,
      condition_status: asset.condition_status,
      sta: asset.sta || '',
      description: asset.description || '',
    });
  };

  const handleEditSave = async () => {
    try {
      await api.put(`/assets/${editingAsset}`, editForm);
      setEditingAsset(null);
      setSelectedAsset(null);
      fetchAssets();
      toast.success('Aset berhasil diupdate');
    } catch (error) {
      console.error('Edit error:', error);
      toast.error('Gagal mengupdate aset');
    }
  };

  const handleKmlUpload = async () => {
    if (!kmlFile) return;
    
    console.log('Starting KML upload from MonitoringMap...');
    console.log('File details:', {
      name: kmlFile.name,
      size: kmlFile.size,
      type: kmlFile.type
    });
    
    // Check file extension
    const fileName = kmlFile.name.toLowerCase();
    if (!fileName.endsWith('.kml') && !fileName.endsWith('.kmz')) {
      toast.error('File harus berformat .kml atau .kmz');
      return;
    }
    
    // For KMZ files, show warning
    if (fileName.endsWith('.kmz')) {
      toast.error('File KMZ belum didukung saat ini. Silakan extract dan upload file .kml');
      return;
    }
    
    // Try to validate KML file (optional - if it fails, still try to upload)
    let validation = null;
    try {
      console.log('Validating KML file...');
      validation = await validateKMLFile(kmlFile);
      console.log('KML Validation Result:', validation);
    } catch (validationError) {
      console.warn('KML validation failed, but will try to upload anyway:', validationError);
      validation = { valid: false, error: validationError.message };
    }
    
    if (validation && validation.valid) {
      const summary = validation.data.summary;
      toast.success(`KML valid: ${summary.points} Point, ${summary.lineStrings} LineString, ${summary.polygons} Polygon. Mengupload...`);
    } else {
      toast('Validasi KML dilewati, mencoba upload ke backend...');
    }

    const formData = new FormData();
    formData.append('kmlFile', kmlFile);

    try {
      const response = await api.post('/assets/import-kml', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success(`Berhasil import ${response.data.summary.total} geometri`);
      setKmlFile(null);
      fetchAssets();
      fetchCategories();

      // Auto-fit bounds after import
      setTimeout(() => {
        if (mapInstanceRef.current && response.data.data.length > 0) {
          const bounds = L.latLngBounds(
            response.data.data.map(a => [a.location_lat, a.location_lng]).filter(c => c[0] && c[1])
          );
          if (bounds.isValid()) {
            mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
          }
        }
      }, 500);
    } catch (error) {
      console.error('KML import error:', error);
      let errorMessage = error.response?.data?.message || error.message || 'Gagal mengimport KML';
      toast.error('Gagal mengimport KML: ' + errorMessage);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await api.get('/assets', { params: { limit: 9999 } });
      const data = response.data.data || [];

      if (data.length === 0) {
        toast.error('Tidak ada data untuk didownload');
        return;
      }

      // Convert to CSV
      const headers = ['Kode', 'Nama', 'Kategori', 'Latitude', 'Longitude', 'Kondisi', 'STA', 'Deskripsi'];
      const csvContent = [
        headers.join(','),
        ...data.map(asset => [
          asset.asset_code || '',
          `"${asset.name || ''}"`,
          `"${asset.category_name || ''}"`,
          asset.location_lat || '',
          asset.location_lng || '',
          asset.condition_status || '',
          asset.sta || '',
          `"${asset.description || ''}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `aset-monitoring-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Berhasil download ${data.length} aset`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Gagal download data');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Monitoring Map</h1>
          <p className="text-gray-400 mt-1">Peta interaktif monitoring aset jalan tol — {assets.length} titik</p>
        </div>
      </div>

      {/* Top bar: Filter + KML + Stats */}
      <div className="flex flex-wrap gap-4 items-end">
        <select
          value={selectedCondition}
          onChange={(e) => setSelectedCondition(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Semua Kondisi</option>
          <option value="baik">Baik</option>
          <option value="rusak_berat">Rusak</option>
          <option value="sedang_diperbaiki">Perbaikan</option>
          <option value="selesai_diperbaiki">Selesai Perbaikan</option>
        </select>

        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Semua Bulan</option>
          <option value="1">Januari</option>
          <option value="2">Februari</option>
          <option value="3">Maret</option>
          <option value="4">April</option>
          <option value="5">Mei</option>
          <option value="6">Juni</option>
          <option value="7">Juli</option>
          <option value="8">Agustus</option>
          <option value="9">September</option>
          <option value="10">Oktober</option>
          <option value="11">November</option>
          <option value="12">Desember</option>
        </select>

        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Semua Tahun</option>
          <option value="2026">2026</option>
          <option value="2025">2025</option>
          <option value="2024">2024</option>
          <option value="2023">2023</option>
          <option value="2022">2022</option>
        </select>

        <button
          onClick={fetchAssets}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Refresh
        </button>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            title="Download Data"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          <label className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-2">
            <Upload className="w-4 h-4" />
            {kmlFile ? kmlFile.name : 'Upload'}
            <input
              type="file"
              accept=".kml,.KML,.kmz,.KMZ,.geojson,.json,.zip,.shp,.gpx,.csv"
              className="hidden"
              onChange={(e) => setKmlFile(e.target.files?.[0] || null)}
            />
          </label>
          {kmlFile && (
            <button
              onClick={handleKmlUpload}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Import KML
            </button>
          )}
        </div>
      </div>

      {/* Map + Sidebar */}
      <div className="flex gap-4">
        <div className="flex-1 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div ref={mapContainerRef} style={{ width: '100%', height: '600px', background: '#1a1a2e' }} />
        </div>

        {/* Category Layer Sidebar */}
        <div className="w-64 bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-blue-500" />
            <h3 className="text-white font-semibold">Jenis Aset</h3>
          </div>
          <div className="flex-1 overflow-auto space-y-2">
            {categories.length === 0 ? (
              <p className="text-gray-400 text-sm">Belum ada data</p>
            ) : (
              categories.map(cat => {
                const catAssets = assets.filter(a => a.category_name === cat);
                const count = catAssets.length;
                if (count === 0) return null; // Skip categories with no assets
                const visible = visibleCategories[cat] !== false;
                const expanded = expandedCategory === cat;
                return (
                  <div key={cat}>
                    <div
                      onClick={() => zoomToCategory(cat)}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        activeCategory === cat
                          ? 'bg-blue-900/30 ring-1 ring-blue-500/50'
                          : visible
                            ? 'bg-gray-700/60 hover:bg-gray-700'
                            : 'bg-gray-800/40 opacity-50 hover:bg-gray-700'
                      }`}
                    >
                      {catAssets.some(a => {
                      const code = a.asset_code || '';
                      return code.startsWith('KML-POLY-') || code.startsWith('GEO-POLY-') || code.startsWith('SHP-POLY-');
                    }) ? (
                      <div className="w-4 h-4 flex-shrink-0 border-2 rounded-sm"
                        style={{ borderColor: getCategoryColor(cat), backgroundColor: getCategoryColor(cat) + '33' }} />
                    ) : catAssets.some(a => {
                      const code = a.asset_code || '';
                      return code.startsWith('KML-LINE-') || code.startsWith('GEO-LINE-') || code.startsWith('SHP-LINE-') || code.startsWith('GPX-LINE-');
                    }) ? (
                      <div className="w-4 h-0.5 flex-shrink-0 rounded"
                        style={{ borderTop: `3px solid ${getCategoryColor(cat)}`, width: 16, height: 0 }} />
                    ) : (
                      <div className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getCategoryColor(cat) }} />
                    )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate" title={cat}>{getCategoryDisplayName(cat)}</p>
                        <p className="text-gray-400 text-xs">{count} titik</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleCategory(cat); }}
                        className="p-1 hover:bg-gray-600 rounded transition-colors"
                        title={visible ? 'Sembunyikan layer' : 'Tampilkan layer'}
                      >
                        {visible ? (
                          <Eye className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(cat);
                        }}
                        className="p-1 hover:bg-red-600/50 rounded transition-colors"
                        title="Hapus semua aset di layer ini"
                      >
                        <Trash2 className="w-4 h-4 text-red-400 flex-shrink-0" />
                      </button>
                    </div>
                    {/* Expandable item list */}
                    {visible && (
                      <div
                        onClick={() => setExpandedCategory(expanded ? null : cat)}
                        className="flex items-center gap-1 ml-6 mt-1 mb-1 cursor-pointer text-gray-400 hover:text-white"
                      >
                        {expanded ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                        <span className="text-xs">{expanded ? 'Sembunyikan' : 'Lihat'} {count} item</span>
                      </div>
                    )}
                    {expanded && visible && (
                      <div className="ml-6 space-y-1 mb-2">
                        {catAssets.map(asset => (
                          <div
                            key={asset.id}
                            onClick={() => {
                              setSelectedAsset(asset);
                              setSelectedAssetDetail(null);
                              setEditingAsset(null);
                              fetchAssetDetail(asset.id);
                              // Pan map to this asset
                              const map = mapInstanceRef.current;
                              const alat = parseFloat(asset.location_lat);
                              const alng = parseFloat(asset.location_lng);
                              if (map && !isNaN(alat) && !isNaN(alng)) {
                                map.setView([alat, alng], 20);
                              }
                              // Red blink on specific marker — continuous until clicked elsewhere
                              stopBlink();
                              const m = markerByAssetIdRef.current[asset.id];
                              if (m) {
                                const orig = {
                                  radius: m.options.radius,
                                  fillColor: m.options.fillColor,
                                  color: m.options.color,
                                  weight: m.options.weight,
                                  fillOpacity: m.options.fillOpacity,
                                };
                                blinkOriginalRef.current = orig;
                                blinkingMarkerRef.current = m;
                                let on = true;
                                m.setStyle({ radius: 22, fillColor: '#ef4444', color: '#ef4444', weight: 5, fillOpacity: 1 });
                                m.bringToFront();
                                blinkTimerRef.current = setInterval(() => {
                                  on = !on;
                                  if (on) {
                                    m.setStyle({ radius: 22, fillColor: '#ef4444', color: '#ef4444', weight: 5, fillOpacity: 1 });
                                    m.bringToFront();
                                  } else {
                                    m.setStyle(orig);
                                  }
                                }, 500);
                              }
                            }}
                            className="text-xs text-gray-400 hover:text-white cursor-pointer truncate py-0.5"
                            title={asset.name}
                          >
                            • {asset.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-700">
            <p className="text-gray-400 text-xs">Total: {assets.length} aset</p>
            <p className="text-gray-500 text-xs mt-1">Klik layer untuk zoom, klik mata untuk sembunyikan</p>
            <button
              onClick={() => {
                const map = mapInstanceRef.current;
                if (!map || assets.length === 0) return;
                const pts = assets
                  .map(a => [parseFloat(a.location_lat), parseFloat(a.location_lng)])
                  .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));
                if (pts.length > 0) {
                  const bounds = L.latLngBounds(pts);
                  map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
                }
              }}
              className="mt-2 w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
            >
              <MapPin className="w-3 h-3" />
              Lihat Semua Titik
            </button>
          </div>
        </div>
      </div>

      {/* Selected Asset Detail / Edit Panel */}
      {selectedAsset && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" />
              {editingAsset === selectedAsset.id ? 'Edit Aset' : 'Detail Aset'}
            </h3>
            <button
              onClick={() => { setSelectedAsset(null); setEditingAsset(null); }}
              className="p-1 hover:bg-gray-700 rounded-lg text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {editingAsset === selectedAsset.id ? (
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nama Aset</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Kondisi</label>
                <select
                  value={editForm.condition_status}
                  onChange={(e) => setEditForm({ ...editForm, condition_status: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="baik">Baik</option>
                  <option value="rusak_berat">Rusak</option>
                  <option value="sedang_diperbaiki">Perbaikan</option>
                  <option value="selesai_diperbaiki">Selesai Perbaikan</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">STA</label>
                <input
                  value={editForm.sta}
                  onChange={(e) => setEditForm({ ...editForm, sta: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleEditSave}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> Simpan
                </button>
                <button
                  onClick={() => setEditingAsset(null)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Basic asset info */}
              <p className="text-white font-semibold text-base">{selectedAsset.name}</p>
              <p className="text-gray-300 text-sm"><span className="text-gray-400">Jenis:</span> {selectedAsset.category_name}</p>
              <p className="text-gray-300 text-sm"><span className="text-gray-400">STA:</span> {selectedAsset.sta || '-'}</p>
              <p className="text-gray-300 text-sm"><span className="text-gray-400">Koordinat:</span> {selectedAsset.location_lat}, {selectedAsset.location_lng}</p>

              {/* Realtime condition badge */}
              {(() => {
                const cond = selectedAssetDetail?.condition_status || selectedAsset.condition_status;
                const color = getConditionColor(cond);
                const label = getConditionDisplay(cond);
                const isDmg = isDamageStatus(cond);
                const isRep = isRepairStatus(cond);
                return (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-gray-400 text-sm">Kondisi:</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold`}
                      style={{ background: color + '22', color, border: `1px solid ${color}` }}>
                      {isDmg && <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-ping mr-1" />}
                      {isRep && <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse mr-1" />}
                      {label}
                    </span>
                    {detailLoading && <span className="text-gray-500 text-xs">memuat...</span>}
                  </div>
                );
              })()}

              {/* Active report count */}
              {selectedAssetDetail && selectedAssetDetail.active_report_count > 0 && (
                <p className="text-red-400 text-sm font-medium">
                  ⚠ {selectedAssetDetail.active_report_count} laporan aktif
                </p>
              )}

              {/* Latest report section */}
              {selectedAssetDetail?.latest_report && (
                <div className="mt-3 p-3 bg-gray-700/50 rounded-lg border border-gray-600 space-y-1">
                  <p className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-2">Laporan Terakhir</p>
                  <p className="text-gray-300 text-sm"><span className="text-gray-400">No. Laporan:</span> {selectedAssetDetail.latest_report.report_number}</p>
                  <p className="text-gray-300 text-sm"><span className="text-gray-400">Tingkat:</span> <span className="capitalize">{selectedAssetDetail.latest_report.damage_level}</span></p>
                  <p className="text-gray-300 text-sm"><span className="text-gray-400">Deskripsi:</span> {selectedAssetDetail.latest_report.description || '-'}</p>
                  <p className="text-gray-300 text-sm"><span className="text-gray-400">Pelapor:</span> {selectedAssetDetail.latest_report.reporter_name || '-'}</p>
                  <p className="text-gray-300 text-sm"><span className="text-gray-400">Tanggal:</span> {selectedAssetDetail.latest_report.reported_at ? new Date(selectedAssetDetail.latest_report.reported_at).toLocaleString('id-ID') : '-'}</p>
                  {selectedAssetDetail.latest_report.repair_status && (
                    <p className="text-gray-300 text-sm"><span className="text-gray-400">Status Perbaikan:</span> {' '}
                      <span className={`font-medium ${
                        selectedAssetDetail.latest_report.repair_status === 'selesai' ? 'text-green-400'
                        : selectedAssetDetail.latest_report.repair_status === 'on_progress' ? 'text-blue-400'
                        : 'text-yellow-400'
                      }`}>
                        {selectedAssetDetail.latest_report.repair_status === 'selesai' ? 'Selesai'
                          : selectedAssetDetail.latest_report.repair_status === 'on_progress' ? 'Dalam Perbaikan'
                          : 'Menunggu'}
                      </span>
                      {selectedAssetDetail.latest_report.progress_percentage != null && ` (${selectedAssetDetail.latest_report.progress_percentage}%)`}
                    </p>
                  )}
                </div>
              )}

              {/* Polygon area */}
              {(() => {
                const code = selectedAsset.asset_code || '';
                if (code.startsWith('KML-POLY-') || code.startsWith('GEO-POLY-') || code.startsWith('SHP-POLY-')) {
                  try {
                    const geo = JSON.parse(selectedAsset.description);
                    if (geo && geo.geometryType === 'Polygon' && geo.coordinates) {
                      const area = calculatePolygonArea(geo.coordinates);
                      return <p className="text-gray-300 text-sm"><span className="text-gray-400">Luas Area:</span> {formatArea(area)}</p>;
                    }
                  } catch (_) {}
                }
                return null;
              })()}

              <div className="flex gap-3 pt-3">
                <button
                  onClick={() => handleEditClick(selectedAsset)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm"
                >
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
                {!selectedAsset.asset_code?.startsWith('KML-') && (
                  <button
                    onClick={() => handleDelete(selectedAsset.id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 text-sm"
                  >
                    <Trash2 className="w-4 h-4" /> Hapus
                  </button>
                )}
                <button
                  onClick={() => fetchAssetDetail(selectedAsset.id)}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
                  title="Refresh detail"
                >
                  ↺
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Keterangan */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <h3 className="text-white font-medium mb-3">Keterangan</h3>
        <div className="flex flex-wrap gap-8">
          {/* Status indicators */}
          <div className="space-y-2">
            <p className="text-gray-400 text-xs font-medium mb-2">Status Aset:</p>
            <div className="flex items-center gap-2">
              <div className="relative w-4 h-4 rounded-full bg-green-500 animate-pulse" />
              <span className="text-gray-300 text-sm">Baik</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-4 h-4 rounded-full bg-red-500 animate-ping" />
              <span className="text-gray-300 text-sm">Laporan Kerusakan</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-4 h-4 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-gray-300 text-sm">Proses Perbaikan</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500" />
              <span className="text-gray-300 text-sm">Selesai Perbaikan</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoringMap;
