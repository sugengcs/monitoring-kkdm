import React, { useState, useEffect, useRef, createContext, useContext, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Map, FileText, Settings, LogOut,
  RefreshCw, Download, Upload, Search,
  Filter, ChevronDown, ChevronUp, Maximize2, Minimize2,
  TrendingUp, AlertCircle, CheckCircle, Clock, AlertTriangle, Menu,
  LayoutDashboard, Wrench, Activity, History, Expand, Bell
} from 'lucide-react';
import { useResponsive } from '../utils/responsive';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
import RepairReportSummary from '../components/RepairReportSummary';
import ProfileDropdown from '../components/ProfileDropdown';
import ProfileModal from '../components/ProfileModal';
import AssetDetailModal from '../components/AssetDetailModal';
import NotificationCenter from '../components/NotificationCenter';
import ReportDetailModal from '../components/ReportDetailModal';
import MapLegend from '../components/MapLegend';
import NeonButton from '../components/NeonButton';
import FilterChip from '../components/FilterChip';
import GlowCard from '../components/GlowCard';
import NeonSelect from '../components/NeonSelect';
import {
  createAssetIcon,
  createAssetIconHighlight,
  createModernPopup,
  getConditionStyle,
  normalizeAssetType,
  CONDITION_FILTERS,
  ASSET_TYPE_SHAPES,
  createLegendSVG
} from '../utils/assetMarkerUtils';
import toast from 'react-hot-toast';

const getCategoryColor = (categoryName) => {
  if (!categoryName) return '#6b7280';
  const upper = categoryName.toUpperCase();
  // Specific asset types with their colors
  if (upper.includes('K3')) return '#3B82F6'; // Blue
  if (upper.includes('CCTV') || upper.includes('PENGAWAS') || upper.includes('KAMERA')) return '#8B5CF6'; // Purple
  if (upper.includes('SFO')) return '#06B6D4'; // Cyan
  if (upper.includes('LAMPU') || upper.includes('PJU')) return '#F59E0B'; // Orange
  if (upper.includes('PANEL')) return '#EC4899'; // Pink
  if (upper.includes('KWH')) return '#10B981'; // Emerald
  // Fallback palette
  const palette = ['#22c55e', '#14b8a6', '#f43f5e', '#84cc16', '#6366f1'];
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
};

const getStatusColor = (status) => {
  switch (status) {
    case 'pending': return '#fbbf24';
    case 'diproses': return '#3b82f6';
    case 'dalam_perbaikan': return '#f97316';
    case 'selesai': return '#22c55e';
    case 'ditolak': return '#ef4444';
    default: return '#6b7280';
  }
};

const getConditionColor = (conditionStatus) => {
  switch (conditionStatus) {
    case 'baik':
    case 'selesai_diperbaiki':
      return '#22c55e'; // Green
    case 'rusak_ringan':
      return '#f59e0b'; // Orange
    case 'rusak_berat':
      return '#ef4444'; // Red
    case 'sedang_diperbaiki':
      return '#f97316'; // Orange/Yellow
    default:
      return '#6b7280'; // Gray
  }
};

const StatCard = ({ title, value, icon: Icon, color, gradient, onClick }) => (
  <GlowCard color={color} onClick={onClick} hoverable={true} glowPosition="bottom">
    <div className="p-4 md:p-6">
      <div className="flex items-start justify-between mb-4">
        <div
          className="p-3 rounded-xl transition-all duration-300 group-hover:scale-110"
          style={{
            background: `${color}20`,
            backdropFilter: 'blur(10px)',
            boxShadow: `0 0 20px ${color}40`,
          }}
        >
          <Icon className="w-6 h-6" style={{ color, filter: `drop-shadow(0 0 8px ${color})` }} />
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider opacity-70">{title}</p>
        </div>
      </div>
      <p className="text-3xl md:text-4xl font-bold text-white tracking-tight group-hover:scale-105 transition-transform duration-300">
        {value}
      </p>
      <div className="mt-2 h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-transparent via-current to-transparent transition-all duration-500" style={{ color }} />
    </div>
  </GlowCard>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { isMobile, isTablet } = useResponsive();
  const [stats, setStats] = useState(null);
  const [assets, setAssets] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailModalTitle, setDetailModalTitle] = useState('');
  const [detailModalAssets, setDetailModalAssets] = useState([]);
  const [detailModalLoading, setDetailModalLoading] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedBaseMap, setSelectedBaseMap] = useState('Topographic');
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const baseLayersRef = useRef({});

  // Asset type filter state
  const [selectedAssetTypes, setSelectedAssetTypes] = useState([
    'PERKERASAN',
    'CCTV',
    'LAMPU PJU',
    'PANEL',
    'KWH'
  ]);

  // Condition filter state (multi-select)
  const [selectedConditions, setSelectedConditions] = useState(
    CONDITION_FILTERS.map(f => f.key)
  );

  // Helper function to normalize asset category name to standard type
  const normalizeAssetType = (categoryName) => {
    if (!categoryName) return null;
    const upper = categoryName.toUpperCase();
    if (upper.includes('PERKERASAN')) return 'PERKERASAN';
    if (upper.includes('CCTV') || upper.includes('PENGAWAS') || upper.includes('KAMERA')) return 'CCTV';
    if (upper.includes('LAMPU') || upper.includes('PJU')) return 'LAMPU PJU';
    if (upper.includes('PANEL')) return 'PANEL';
    if (upper.includes('KWH')) return 'KWH';
    if (upper.includes('SFO')) return 'SFO';
    if (upper.includes('DRAINASE')) return 'DRAINASE';
    if (upper.includes('GUARDRAIL') || upper.includes('GUARD')) return 'GUARDRAIL';
    if (upper.includes('RAMBU')) return 'RAMBU';
    return null;
  };

  // Helper function to resolve asset type to shape key
  const resolveAssetType = (type) => {
    if (!type) return null;
    const upper = type.toUpperCase();
    if (upper.includes('PERKERASAN')) return 'perkerasan';
    if (upper.includes('CCTV')) return 'cctv';
    if (upper.includes('LAMPU') || upper.includes('PJU')) return 'lampu';
    if (upper.includes('PANEL')) return 'panel';
    if (upper.includes('KWH')) return 'kwh';
    if (upper.includes('SFO')) return 'sfo';
    if (upper.includes('DRAINASE')) return 'drainase';
    if (upper.includes('GUARDRAIL') || upper.includes('GUARD')) return 'guardrail';
    if (upper.includes('RAMBU')) return 'rambu';
    return null;
  };

  // Get unique asset types from current assets
  const getAvailableAssetTypes = () => {
    const types = new Set();
    assets.forEach(asset => {
      const type = normalizeAssetType(asset.category_name);
      if (type) types.add(type);
    });
    return Array.from(types);
  };

  // Handle checkbox change - single select mode
  const handleAssetTypeToggle = (type) => {
    setSelectedAssetTypes(prev => {
      // If clicking the already selected type, deselect all (show none) or keep it selected
      if (prev.includes(type) && prev.length === 1) {
        return []; // Deselect all if clicking the only selected type
      }
      // Otherwise, select only the clicked type
      return [type];
    });
  };

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  // Change base map
  const changeBaseMap = (baseMapName) => {
    const map = mapInstanceRef.current;
    if (!map || !baseLayersRef.current) return;

    // Remove all base layers
    Object.values(baseLayersRef.current).forEach(layer => {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });

    // Add selected base layer
    const newBaseLayer = baseLayersRef.current[baseMapName];
    if (newBaseLayer) {
      newBaseLayer.addTo(map);
      setSelectedBaseMap(baseMapName);
    }
  };

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      window.addEventListener('keydown', handleEsc);
    }

    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isFullscreen]);

  // Invalidate map size when fullscreen mode changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      const map = mapInstanceRef.current;
      
      // Enable/disable scroll wheel zoom based on fullscreen mode
      if (isFullscreen) {
        try {
          if (!map.scrollWheelZoom.enabled()) {
            map.scrollWheelZoom.enable();
          }
        } catch (e) {
          console.log('[Dashboard] Error enabling scroll wheel zoom:', e);
        }
      } else {
        try {
          if (map.scrollWheelZoom.enabled()) {
            map.scrollWheelZoom.disable();
          }
        } catch (e) {
          console.log('[Dashboard] Error disabling scroll wheel zoom:', e);
        }
      }
      
      // Force re-add base layer when switching to fullscreen
      if (isFullscreen && baseLayersRef.current[selectedBaseMap]) {
        // Remove all base layers
        Object.values(baseLayersRef.current).forEach(layer => {
          if (map.hasLayer(layer)) {
            map.removeLayer(layer);
          }
        });
        // Re-add the selected base layer
        baseLayersRef.current[selectedBaseMap].addTo(map);
      }
      
      // Force multiple invalidations to ensure proper resizing
      const delays = [50, 100, 200, 400, 800, 1500];
      delays.forEach(delay => {
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
            console.log('[Dashboard] invalidateSize at', delay, 'ms after fullscreen change, isFullscreen:', isFullscreen);
          }
        }, delay);
      });
    }
  }, [isFullscreen, selectedBaseMap]);

  // Select all asset types
  const handleSelectAllTypes = () => {
    setSelectedAssetTypes(['PERKERASAN', 'CCTV', 'LAMPU PJU', 'PANEL', 'KWH']);
  };

  // Condition filter toggle
  const handleConditionToggle = (key) => {
    setSelectedConditions(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Reset condition filter to all conditions
  const handleResetConditionFilter = () => {
    console.log('[Dashboard] Resetting condition filter to all conditions');
    const allConditions = CONDITION_FILTERS.map(f => f.key);
    console.log('[Dashboard] Setting conditions to:', allConditions);
    setSelectedConditions(allConditions);
  };

  // Reset filter to all types + all conditions
  const handleResetFilter = () => {
    console.log('[Dashboard] Resetting filters to default');
    setSelectedAssetTypes(['PERKERASAN', 'CCTV', 'LAMPU PJU', 'PANEL', 'KWH']);
    setSelectedConditions(CONDITION_FILTERS.map(f => f.key));
    setSelectedMonth('');
    setSelectedWeek('');
    setSelectedYear('');
    
    if (mapInstanceRef.current) {
      if (isFullscreen) {
        // In fullscreen mode, zoom to show all markers
        const validPoints = filteredAssets
          .map(a => [parseFloat(a.location_lat), parseFloat(a.location_lng)])
          .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180);
        
        if (validPoints.length > 0) {
          if (validPoints.length === 1) {
            mapInstanceRef.current.setView(validPoints[0], 13);
          } else {
            const bounds = L.latLngBounds(validPoints);
            mapInstanceRef.current.fitBounds(bounds, { padding: [80, 80], maxZoom: 13, animate: true, duration: 1 });
          }
          console.log('[Dashboard] Map zoomed to show all markers in fullscreen mode');
        }
      } else {
        // In normal mode, reset to initial position
        mapInstanceRef.current.setView([-6.2347001, 106.9321978], 6);
        console.log('[Dashboard] Map view reset to initial position');
      }
    }
  };

  // Filter assets based on all selected filters (asset type, month, week, year)
  const filteredAssets = useMemo(() => {
    console.log('[Dashboard] Filtering assets:', {
      totalAssets: assets.length,
      selectedAssetTypes,
      selectedConditions,
      selectedMonth,
      selectedWeek,
      selectedYear
    });

    const filtered = assets.filter(asset => {
      // Filter by asset type
      const assetType = normalizeAssetType(asset.category_name);
      const matchType = assetType && selectedAssetTypes.includes(assetType);

      if (!matchType) {
        return false;
      }

      // Filter by condition
      const conditionMatch = selectedConditions.some(key => {
        const filter = CONDITION_FILTERS.find(f => f.key === key);
        return filter && filter.match(asset.condition_status);
      });
      if (!conditionMatch) {
        return false;
      }

      // Filter by month
      if (selectedMonth) {
        const assetDate = new Date(asset.created_at || asset.installed_at);
        const assetMonth = assetDate.getMonth() + 1;
        if (assetMonth !== parseInt(selectedMonth)) {
          return false;
        }
      }

      // Filter by week
      if (selectedWeek) {
        const assetDate = new Date(asset.created_at || asset.installed_at);
        const weekNumber = Math.ceil(assetDate.getDate() / 7);
        if (weekNumber !== parseInt(selectedWeek)) {
          return false;
        }
      }

      // Filter by year
      if (selectedYear) {
        const assetDate = new Date(asset.created_at || asset.installed_at);
        const assetYear = assetDate.getFullYear();
        if (assetYear !== parseInt(selectedYear)) {
          return false;
        }
      }

      return true;
    });

    console.log('[Dashboard] Filtered assets result:', {
      filteredCount: filtered.length,
      originalCount: assets.length
    });

    return filtered;
  }, [assets, selectedAssetTypes, selectedConditions, selectedMonth, selectedWeek, selectedYear]);

  // Calculate statistics from filtered assets
  const filteredStats = useMemo(() => {
    // Use stats from API if available, otherwise calculate from filteredAssets
    if (stats?.derived) {
      return {
        total: stats.totalAssets || 0,
        baik: stats.derived.baik || 0,
        rusak: stats.derived.rusak || 0,
        sedangPerbaikan: stats.derived.sedangPerbaikan || 0,
      };
    }
    
    // Fallback to calculated from filteredAssets
    return {
      total: filteredAssets.length,
      baik: filteredAssets.filter(a => a.condition_status === 'baik' || a.condition_status === 'selesai_diperbaiki').length,
      rusak: filteredAssets.filter(a => a.condition_status === 'rusak_ringan' || a.condition_status === 'rusak_berat').length,
      sedangPerbaikan: filteredAssets.filter(a => a.condition_status === 'sedang_diperbaiki').length,
    };
  }, [filteredAssets, stats]);

  useEffect(() => {
    fetchStats();
    fetchAssets();
    fetchReports();

    // Poll for realtime updates every 30 seconds (reduced from 2 seconds to prevent excessive calls)
    const interval = setInterval(() => {
      fetchStats();
      fetchAssets();
      fetchReports();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleOpenReportDetail = (event) => {
      setSelectedReport(event.detail);
    };

    window.addEventListener('openReportDetail', handleOpenReportDetail);
    return () => window.removeEventListener('openReportDetail', handleOpenReportDetail);
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;
    
    const initializeMap = () => {
      const container = mapContainerRef.current;
      if (!container) return;
      
      console.log('[Dashboard] Initializing map, container:', container);
      console.log('[Dashboard] Container dimensions:', container.offsetWidth, 'x', container.offsetHeight);
      
      if (container.offsetWidth === 0 || container.offsetHeight === 0) {
        console.log('[Dashboard] Container has no dimensions, retrying...');
        setTimeout(initializeMap, 100);
        return;
      }
      
      // Only initialize map once
      if (!mapInstanceRef.current) {
        const map = L.map(container, {
          center: [-6.2347001, 106.9321978],
          zoom: 6,
          scrollWheelZoom: false,
          dragging: true,
          layers: [],
          zoomControl: true,
        });

        const baseLayers = {
          'Topographic': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri &amp; the GIS User Community',
            maxZoom: 19,
          }),
          'CartoDB Dark': L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20,
          }),
        };

        baseLayersRef.current = baseLayers;
        baseLayers[selectedBaseMap].addTo(map);
        mapInstanceRef.current = map;
        console.log('[Dashboard] Map initialized successfully');
      }

      // Force invalidateSize at multiple delays
      const timers = [100, 300, 600, 1000, 2000].map(t =>
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
            console.log('[Dashboard] invalidateSize at', t, 'ms');
          }
        }, t)
      );

      // Watch for container resize
      const ro = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
          console.log('[Dashboard] ResizeObserver triggered invalidateSize');
        }
      });
      ro.observe(container);

      return () => {
        timers.forEach(clearTimeout);
        ro.disconnect();
      };
    };

    setTimeout(initializeMap, 100);
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach(m => {
      if (map.hasLayer(m)) {
        map.removeLayer(m);
      }
    });
    markersRef.current = [];

    console.log('[Dashboard] Rendering markers, filteredAssets count:', filteredAssets.length);
    console.log('[Dashboard] Map instance:', map);

    if (filteredAssets.length === 0) {
      console.log('[Dashboard] No filtered assets to display');
      return;
    }

    let validMarkers = 0;
    let invalidMarkers = 0;

    filteredAssets.forEach((asset, index) => {
      // Use normalized coordinates from fetchAssets
      const lat = asset._normalized_lat;
      const lng = asset._normalized_lng;
      
      // Validate coordinates
      if (lat === undefined || lat === null || lng === undefined || lng === null || isNaN(lat) || isNaN(lng)) {
        console.log('[Dashboard] Skipping asset with invalid normalized coordinates:', {
          index,
          name: asset.name,
          category: asset.category_name,
          _normalized_lat: lat,
          _normalized_lng: lng,
          original_lat: asset.location_lat,
          original_lng: asset.location_lng
        });
        invalidMarkers++;
        return;
      }

      // Validate coordinate ranges
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        console.log('[Dashboard] Skipping asset with out-of-range normalized coordinates:', {
          index,
          name: asset.name,
          lat,
          lng
        });
        invalidMarkers++;
        return;
      }

      try {
        // Use custom asset icon with category colors
        const icon = createAssetIcon(asset.category_name, asset.condition_status);
        const marker = L.marker([lat, lng], { icon });
        marker.addTo(map);

        marker.bindTooltip(asset.category_name || asset.name, {
          direction: 'top',
          offset: [0, -14],
          className: 'kml-layer-tooltip',
        });
        marker.bindPopup(createModernPopup(asset), { maxWidth: 280, className: '' });
        markersRef.current.push(marker);
        validMarkers++;
        console.log('[Dashboard] Marker added for:', asset.category_name, 'at', lat, lng);
      } catch (error) {
        console.error('[Dashboard] Error adding marker for asset:', asset, error);
        invalidMarkers++;
      }
    });

    console.log('[Dashboard] Markers rendered:', {
      valid: validMarkers,
      invalid: invalidMarkers,
      total: filteredAssets.length
    });

    const validPoints = filteredAssets
      .map(a => [a._normalized_lat, a._normalized_lng])
      .filter(([lat, lng]) => lat !== undefined && lat !== null && lng !== undefined && lng !== null && !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180);
    
    // Only auto-fit bounds if not in fullscreen mode and we have valid points
    if (!isFullscreen && validPoints.length > 0) {
      if (validPoints.length === 1) {
        map.setView(validPoints[0], 13);
        console.log('[Dashboard] Map centered on single marker at:', validPoints[0]);
      } else {
        const bounds = L.latLngBounds(validPoints);
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 13, animate: true, duration: 1 });
        console.log('[Dashboard] Map fitted to bounds for', validPoints.length, 'markers');
      }
    }

    // Re-invalidate after markers are drawn
    setTimeout(() => map.invalidateSize(), 200);
  }, [filteredAssets, isFullscreen]);

  const fetchStats = async () => {
    try {
      console.log('[Dashboard] Fetching stats...');
      const response = await api.get('/dashboard/stats', {
        params: { month: selectedMonth, year: selectedYear || '', _t: Date.now() }
      });
      console.log('[Dashboard] API Response:', response.data);
      const statsData = response.data.data;
      console.log('[Dashboard] Stats Data:', JSON.stringify(statsData, null, 2));
      setStats(statsData);

      // Verify total assets = baik + rusak + sedang_perbaikan
      if (statsData?.derived) {
        const sumOfConditions = (statsData.derived.baik || 0) + (statsData.derived.rusak || 0) + (statsData.derived.sedangPerbaikan || 0);
        const total = statsData.totalAssets || 0;
        console.log('[Dashboard Stats] Total Assets:', total);
        console.log('[Dashboard Stats] Sum of conditions:', sumOfConditions);
        console.log('[Dashboard Stats] Baik:', statsData.derived.baik, 'Rusak:', statsData.derived.rusak, 'Sedang Perbaikan:', statsData.derived.sedangPerbaikan);
        console.log('[Dashboard Stats] Selesai Perbaikan History:', statsData.derived.selesai_perbaikan_history);
        if (sumOfConditions !== total) {
          console.warn('[Dashboard Stats] MISMATCH: Total assets does not equal sum of conditions!', {
            total,
            sumOfConditions,
            difference: total - sumOfConditions
          });
        }
      } else {
        console.error('[Dashboard Stats] No derived data in response!');
      }
    } catch (error) {
      console.error('[Dashboard] Error fetching stats:', error);
      console.error('[Dashboard] Error details:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    try {
      console.log('[Dashboard] Fetching assets...');
      const response = await api.get('/assets', { params: { limit: 9999, _t: Date.now() } });
      console.log('[Dashboard] ASSET API:', response.data);
      
      let data = response.data.data || [];
      console.log('[Dashboard] TOTAL ASSETS:', data.length);
      
      // Normalize coordinate field names
      data = data.map(asset => {
        let lat, lng;
        
        // Try different field names for latitude
        if (asset.location_lat !== undefined && asset.location_lat !== null) {
          lat = asset.location_lat;
        } else if (asset.latitude !== undefined && asset.latitude !== null) {
          lat = asset.latitude;
        } else if (asset.lat !== undefined && asset.lat !== null) {
          lat = asset.lat;
        } else if (asset.y !== undefined && asset.y !== null) {
          lat = asset.y;
        }
        
        // Try different field names for longitude
        if (asset.location_lng !== undefined && asset.location_lng !== null) {
          lng = asset.location_lng;
        } else if (asset.longitude !== undefined && asset.longitude !== null) {
          lng = asset.longitude;
        } else if (asset.lng !== undefined && asset.lng !== null) {
          lng = asset.lng;
        } else if (asset.x !== undefined && asset.x !== null) {
          lng = asset.x;
        }
        
        // Handle comma vs decimal point
        if (typeof lat === 'string') {
          lat = parseFloat(lat.replace(',', '.'));
        }
        if (typeof lng === 'string') {
          lng = parseFloat(lng.replace(',', '.'));
        }
        
        return {
          ...asset,
          _normalized_lat: lat,
          _normalized_lng: lng
        };
      });
      
      setAssets(data);
      console.log('[Dashboard] Assets set to state:', data.length, 'items');
    } catch (error) {
      console.error('[Dashboard] Error fetching assets:', error);
      console.error('[Dashboard] Error details:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      const response = await api.get('/reports', { params: { limit: 20, _t: Date.now() } });
      setReports(response.data.data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const handleCardClick = async (cardType) => {
    console.log('[Dashboard] Card clicked:', cardType);
    setDetailModalLoading(true);
    setDetailModalOpen(true);

    let filteredData = [];
    let title = '';

    switch (cardType) {
      case 'total':
        filteredData = filteredAssets.map((asset, index) => ({
          no: index + 1,
          name: asset.name || '-',
          category: asset.category_name || '-',
          location: asset.ruas || '-',
          status: asset.condition_status || '-',
          date: asset.created_at ? new Date(asset.created_at).toLocaleDateString('id-ID') : '-',
          technician: '-',
          notes: '-'
        }));
        title = 'Total Aset';
        break;
      case 'baik':
        filteredData = filteredAssets
          .filter(a => a.condition_status === 'baik' || a.condition_status === 'selesai_diperbaiki')
          .map((asset, index) => ({
            no: index + 1,
            name: asset.name || '-',
            category: asset.category_name || '-',
            location: asset.ruas || '-',
            status: 'Baik',
            date: asset.created_at ? new Date(asset.created_at).toLocaleDateString('id-ID') : '-',
            technician: '-',
            notes: '-'
          }));
        title = 'Kondisi Baik';
        break;
      case 'rusak':
        filteredData = filteredAssets
          .filter(a => a.condition_status === 'rusak_ringan' || a.condition_status === 'rusak_berat')
          .map((asset, index) => ({
            no: index + 1,
            name: asset.name || '-',
            category: asset.category_name || '-',
            location: asset.ruas || '-',
            status: 'Rusak',
            date: asset.created_at ? new Date(asset.created_at).toLocaleDateString('id-ID') : '-',
            technician: '-',
            notes: '-'
          }));
        title = 'Kondisi Rusak';
        break;
      case 'perbaikan':
        filteredData = filteredAssets
          .filter(a => a.condition_status === 'sedang_diperbaiki')
          .map((asset, index) => ({
            no: index + 1,
            name: asset.name || '-',
            category: asset.category_name || '-',
            location: asset.ruas || '-',
            status: 'Dalam Perbaikan',
            date: asset.created_at ? new Date(asset.created_at).toLocaleDateString('id-ID') : '-',
            technician: '-',
            notes: '-'
          }));
        title = 'Dalam Perbaikan';
        break;
      case 'sedang_perbaikan':
        filteredData = reports
          .filter(r => r.status === 'diproses' || r.status === 'dalam_perbaikan')
          .map((report, index) => ({
            no: index + 1,
            name: report.report_number || '-',
            category: report.asset_name || '-',
            location: report.location || '-',
            status: r.status === 'diproses' ? 'Diproses' : 'Sedang Perbaikan',
            date: report.reported_at ? new Date(report.reported_at).toLocaleDateString('id-ID') : '-',
            technician: report.technician || '-',
            notes: report.description || '-'
          }));
        title = 'Sedang Perbaikan (Laporan)';
        break;
      case 'selesai':
        filteredData = reports
          .filter(r => r.status === 'selesai')
          .map((report, index) => ({
            no: index + 1,
            name: report.report_number || '-',
            category: report.asset_name || '-',
            location: report.location || '-',
            status: 'Selesai',
            date: report.reported_at ? new Date(report.reported_at).toLocaleDateString('id-ID') : '-',
            technician: report.technician || '-',
            notes: report.description || '-'
          }));
        title = 'Selesai (Laporan)';
        break;
      case 'belum_selesai':
        filteredData = reports
          .filter(r => r.status === 'pending' || r.status === 'diproses')
          .map((report, index) => ({
            no: index + 1,
            name: report.report_number || '-',
            category: report.asset_name || '-',
            location: report.location || '-',
            status: r.status === 'pending' ? 'Pending' : 'Diproses',
            date: report.reported_at ? new Date(report.reported_at).toLocaleDateString('id-ID') : '-',
            technician: report.technician || '-',
            notes: report.description || '-'
          }));
        title = 'Belum Selesai (Laporan)';
        console.log('[Dashboard] Belum selesai filtered data:', filteredData.length, 'items');
        break;
    }

    setDetailModalTitle(title);
    setDetailModalAssets(filteredData);
    setDetailModalLoading(false);
  };

  const handleLegendClick = (category) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const categoryMarkers = markersRef.current.filter((marker, index) => {
      const asset = filteredAssets[index];
      return asset && asset.category_name === category;
    });

    if (categoryMarkers.length === 0) return;

    // Blink animation
    const originals = categoryMarkers.map(m => ({
      radius: m.options.radius,
      fillColor: m.options.fillColor,
      color: m.options.color,
      weight: m.options.weight,
      fillOpacity: m.options.fillOpacity
    }));

    // Flash ON
    categoryMarkers.forEach((m, i) => {
      m.setStyle({
        radius: 20,
        fillColor: '#FFD700',
        color: '#FFA500',
        weight: 3,
        fillOpacity: 1
      });
    });

    setTimeout(() => {
      // Flash OFF
      categoryMarkers.forEach((m, i) => {
        m.setStyle(originals[i]);
      });
    }, 500);

    // Zoom to markers
    const bounds = L.latLngBounds(categoryMarkers.map(m => m.getLatLng()));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true, duration: 1 });
  };

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  const handlePasswordClick = () => {
    toast.success('Fitur ubah password akan segera tersedia');
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#0F172A]">
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0F172A]/80 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3B82F6]"></div>
        </div>
      )}
      
      {/* Header */}
      <div className={`flex-shrink-0 ${isFullscreen ? 'hidden' : ''}`}>
        <div
          className={`${isMobile ? 'px-2 py-1' : 'px-5'} flex items-center justify-between gap-2`}
          style={{
            minHeight: isMobile ? '44px' : '72px',
            background: 'rgba(20,25,40,0.88)',
            backdropFilter: 'blur(20px)',
            borderRadius: isMobile ? '8px' : '18px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Title - Minimized on mobile */}
          {!isMobile && (
            <div className="flex items-center gap-2">
              <div>
                <h1 className="text-2xl font-bold text-white" style={{ textShadow: '0 0 20px rgba(59, 130, 246, 0.5)' }}>Dashboard</h1>
                <p className="text-xs text-gray-400 font-medium">Monitoring Aset Jalan Tol Becakayu</p>
              </div>
            </div>
          )}

          {/* Mobile: Just show icon */}
          {isMobile && (
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-blue-500" />
            </div>
          )}

          {/* Filters Container - Hidden on mobile */}
          {!isMobile && (
            <div className="flex items-center gap-6 flex-1 justify-center">
            {/* Jenis Aset Filters */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetFilter}
                className="h-10 px-4 rounded-xl text-white font-semibold text-xs cursor-pointer transition-all duration-250 ease-out hover:-translate-y-0.5 border border-white/10"
                style={{
                  background: 'rgba(107,114,128,0.2)',
                  boxShadow: '0 0 12px rgba(107,114,128,0.2)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(107,114,128,0.35)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(107,114,128,0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(107,114,128,0.2)';
                  e.currentTarget.style.boxShadow = '0 0 12px rgba(107,114,128,0.2)';
                }}
              >
                Reset
              </button>

              {['PERKERASAN', 'CCTV', 'LAMPU PJU', 'PANEL', 'KWH'].map(type => {
                const isSelected = selectedAssetTypes.includes(type);
                const color = getCategoryColor(type);
                return (
                  <button
                    key={type}
                    onClick={() => handleAssetTypeToggle(type)}
                    className="h-10 px-4 rounded-xl text-white font-semibold text-xs cursor-pointer transition-all duration-250 ease-out hover:-translate-y-0.5 border border-white/10"
                    style={{
                      background: isSelected ? `${color}30` : 'rgba(20,25,40,0.6)',
                      borderColor: isSelected ? `${color}60` : 'rgba(255,255,255,0.08)',
                      boxShadow: isSelected ? `0 0 12px ${color}40` : '0 0 8px rgba(0,0,0,0.2)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isSelected ? `${color}50` : 'rgba(40,45,60,0.7)';
                      e.currentTarget.style.boxShadow = isSelected ? `0 0 20px ${color}50` : '0 0 16px rgba(0,0,0,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isSelected ? `${color}30` : 'rgba(20,25,40,0.6)';
                      e.currentTarget.style.boxShadow = isSelected ? `0 0 12px ${color}40` : '0 0 8px rgba(0,0,0,0.2)';
                    }}
                  >
                    {type}
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

            {/* Kondisi Filters */}
            <div className="flex items-center gap-2">
              {CONDITION_FILTERS.map(({ key, label, color }) => {
                const isSelected = selectedConditions.includes(key);
                return (
                  <button
                    key={key}
                    onClick={() => handleConditionToggle(key)}
                    className="h-10 px-4 rounded-xl text-white font-semibold text-xs cursor-pointer transition-all duration-250 ease-out hover:-translate-y-0.5 border border-white/10"
                    style={{
                      background: isSelected ? `${color}30` : 'rgba(20,25,40,0.6)',
                      borderColor: isSelected ? `${color}60` : 'rgba(255,255,255,0.08)',
                      boxShadow: isSelected ? `0 0 12px ${color}40` : '0 0 8px rgba(0,0,0,0.2)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isSelected ? `${color}50` : 'rgba(40,45,60,0.7)';
                      e.currentTarget.style.boxShadow = isSelected ? `0 0 20px ${color}50` : '0 0 16px rgba(0,0,0,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isSelected ? `${color}30` : 'rgba(20,25,40,0.6)';
                      e.currentTarget.style.boxShadow = isSelected ? `0 0 12px ${color}40` : '0 0 8px rgba(0,0,0,0.2)';
                    }}
                  >
                    {label}
                  </button>
                );
              })}
              
              {/* Reset Condition Filter Button */}
              <button
                onClick={handleResetConditionFilter}
                className="h-10 px-4 rounded-xl text-white font-semibold text-xs cursor-pointer transition-all duration-250 ease-out hover:-translate-y-0.5 border border-white/10"
                style={{
                  background: 'rgba(107,114,128,0.2)',
                  boxShadow: '0 0 12px rgba(107,114,128,0.2)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(107,114,128,0.35)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(107,114,128,0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(107,114,128,0.2)';
                  e.currentTarget.style.boxShadow = '0 0 12px rgba(107,114,128,0.2)';
                }}
              >
                Reset
              </button>
            </div>
          </div>
          )}

          {/* Fullscreen Button - Top Right Corner */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-2 h-10 px-5 rounded-2xl text-white font-bold text-xs cursor-pointer transition-all duration-300 ease-out hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #ffb703)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 0 15px rgba(245,158,11,0.45)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #fbbf24, #fcd34d)';
              e.currentTarget.style.boxShadow = '0 0 25px rgba(245,158,11,0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #f59e0b, #ffb703)';
              e.currentTarget.style.boxShadow = '0 0 15px rgba(245,158,11,0.45)';
            }}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
            <span>{isFullscreen ? 'Exit' : 'Full'}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 bg-[#0B1120] p-4' : isMobile ? 'p-2' : 'p-2 sm:p-4'} gap-${isMobile ? '2' : '2 sm:gap-3'}`}>
        {/* Statistics Cards - computed from filtered assets */}
        <div className={`flex-shrink-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3 md:gap-4 ${isFullscreen ? 'bg-black/30 backdrop-blur-sm rounded-xl p-3' : ''}`}>
          <StatCard
            title="Total Aset"
            value={filteredStats.total}
            icon={LayoutDashboard}
            color="#3B82F6"
            gradient="gradient-primary"
            onClick={() => handleCardClick('total')}
          />
          <StatCard
            title="Kondisi Baik"
            value={filteredStats.baik}
            icon={CheckCircle}
            color="#22C55E"
            gradient="gradient-success"
            onClick={() => handleCardClick('baik')}
          />
          <StatCard
            title="Kondisi Rusak"
            value={filteredStats.rusak}
            icon={AlertTriangle}
            color="#EF4444"
            gradient="gradient-danger"
            onClick={() => handleCardClick('rusak')}
          />
          <StatCard
            title="Dalam Perbaikan"
            value={filteredStats.sedangPerbaikan}
            icon={Wrench}
            color="#F59E0B"
            gradient="gradient-warning"
            onClick={() => handleCardClick('dalam_perbaikan')}
          />
          <StatCard
            title="Selesai Perbaikan"
            value={reports.filter(r => r.status === 'selesai').length}
            icon={History}
            color="#8B5CF6"
            gradient="gradient-purple"
            onClick={() => handleCardClick('selesai')}
          />
        </div>

        {/* Middle Section: Map */}
        <div className={`flex-1 min-h-0 ${isFullscreen ? 'flex-grow relative' : ''}`}>
          <div className={`glass-card p-0 overflow-hidden relative h-full ${isFullscreen ? 'bg-transparent border-0' : ''}`} style={{ minHeight: isFullscreen ? '100vh' : '400px' }}>
            <div
              ref={mapContainerRef}
              className="w-full h-full"
              style={{ zIndex: 10, height: '100%', minHeight: isFullscreen ? '100vh' : '400px' }}
            />
            <MapLegend assets={filteredAssets} />
            
            {/* Floating Filter Bar - Only in Fullscreen Mode */}
            {isFullscreen && (
              <div className="absolute top-4 left-4 right-4 z-10 bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/10" style={{
                boxShadow: '0 0 40px rgba(59, 130, 246, 0.2)'
              }}>
                <div className="flex flex-col gap-4">
                  {/* Base Map Selector */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs text-white font-medium">Base Map:</span>
                    <div className="flex gap-2">
                      {['Topographic', 'CartoDB Dark'].map(baseMap => (
                        <FilterChip
                          key={baseMap}
                          label={baseMap}
                          onClick={() => changeBaseMap(baseMap)}
                          isActive={selectedBaseMap === baseMap}
                          color="#3B82F6"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Asset Type Filter */}
                      <span className="text-xs text-white font-medium">Jenis Aset:</span>
                      <NeonButton onClick={handleResetFilter} color="#6B7280" size="sm">Reset</NeonButton>
                      {getAvailableAssetTypes().map(type => {
                        const isSelected = selectedAssetTypes.includes(type);
                        const color = getCategoryColor(type);
                        const typeAssets = assets.filter(asset => normalizeAssetType(asset.category_name) === type);
                        if (typeAssets.length === 0) return null;
                        const shapeKey = resolveAssetType(type);
                        const shape = shapeKey && ASSET_TYPE_SHAPES[shapeKey] ? ASSET_TYPE_SHAPES[shapeKey].shape : 'circle';
                        return (
                          <FilterChip
                            key={type}
                            label={type}
                            onClick={() => handleAssetTypeToggle(type)}
                            isActive={isSelected}
                            color={color}
                            icon={createLegendSVG(shape, isSelected ? color : '#6b7280', 12)}
                          />
                        );
                      })}
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Condition Filter */}
                      <span className="text-xs text-white font-medium">Kondisi:</span>
                      {CONDITION_FILTERS.map(({ key, label, color }) => {
                        const isSelected = selectedConditions.includes(key);
                        return (
                          <FilterChip
                            key={key}
                            label={label}
                            onClick={() => handleConditionToggle(key)}
                            isActive={isSelected}
                            color={color}
                          />
                        );
                      })}
                      
                      {/* Reset Condition Filter Button */}
                      <button
                        onClick={handleResetConditionFilter}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl text-white font-semibold text-xs cursor-pointer transition-all duration-300 ease-out hover:scale-105 active:scale-95"
                        style={{
                          background: 'rgba(107,114,128,0.3)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          boxShadow: '0 0 8px rgba(107,114,128,0.2)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(107,114,128,0.5)';
                          e.currentTarget.style.boxShadow = '0 0 12px rgba(107,114,128,0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(107,114,128,0.3)';
                          e.currentTarget.style.boxShadow = '0 0 8px rgba(107,114,128,0.2)';
                        }}
                      >
                        Reset
                      </button>
                      
                      {/* Exit Fullscreen Button */}
                      <button
                        onClick={toggleFullscreen}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-bold text-sm cursor-pointer transition-all duration-300 ease-out hover:scale-103 active:scale-95"
                        style={{
                          background: 'linear-gradient(135deg, #f59e0b, #ffb703)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          boxShadow: '0 0 20px rgba(245,158,11,0.45)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #fbbf24, #fcd34d)';
                          e.currentTarget.style.boxShadow = '0 0 30px rgba(245,158,11,0.6)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #f59e0b, #ffb703)';
                          e.currentTarget.style.boxShadow = '0 0 20px rgba(245,158,11,0.45)';
                        }}
                      >
                        <Minimize2 className="w-4 h-4" />
                        Exit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Repair Report Summary - Bottom bar - Hide in fullscreen */}
        {!isFullscreen && (
        <div className="flex-shrink-0">
          <RepairReportSummary
            reports={reports}
            onSelesaiClick={() => handleCardClick('selesai')}
            onBelumSelesaiClick={() => handleCardClick('belum_selesai')}
          />
        </div>
        )}
      </div>

      {/* Asset Detail Modal */}
      <AssetDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={detailModalTitle}
        assets={detailModalAssets}
        loading={detailModalLoading}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={{
          name: 'Administrator',
          role: 'Administrator',
          email: 'admin@becakayu.com',
          phone: '+62 812 3456 7890',
          lastLogin: '14 Mei 2026, 18:45'
        }}
      />

      {/* Report Detail Modal */}
      {selectedReport && (
        <ReportDetailModal 
          report={selectedReport} 
          onClose={() => setSelectedReport(null)} 
        />
      )}
    </div>
  );
};

export default Dashboard;
