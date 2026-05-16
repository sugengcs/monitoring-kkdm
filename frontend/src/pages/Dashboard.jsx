import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  AlertTriangle,
  Wrench,
  CheckCircle,
  TrendingUp,
  Activity,
  Map,
  History
} from 'lucide-react';
import RepairReportSummary from '../components/RepairReportSummary';
import ProfileDropdown from '../components/ProfileDropdown';
import ProfileModal from '../components/ProfileModal';
import AssetDetailModal from '../components/AssetDetailModal';
import NotificationCenter from '../components/NotificationCenter';
import ReportDetailModal from '../components/ReportDetailModal';
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
  <div
    className="relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl group"
    style={{
      background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    }}
    onClick={onClick}
  >
    <div className={`absolute inset-0 ${gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />
    <div className="relative p-6">
      <div className="flex items-start justify-between mb-4">
        <div
          className="p-3 rounded-xl transition-all duration-300 group-hover:scale-110"
          style={{
            background: `${color}20`,
            backdropFilter: 'blur(10px)',
            boxShadow: `0 0 20px ${color}40`,
          }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider opacity-70">{title}</p>
        </div>
      </div>
      <p className="text-4xl font-bold text-white tracking-tight group-hover:scale-105 transition-transform duration-300">
        {value}
      </p>
      <div className="mt-2 h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-transparent via-current to-transparent transition-all duration-500" style={{ color }} />
    </div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
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
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  // Asset type filter state
  const [selectedAssetTypes, setSelectedAssetTypes] = useState([
    'CCTV',
    'SFO',
    'LAMPU PJU',
    'PANEL',
    'KWH'
  ]);

  // Helper function to normalize asset category name to standard type
  const normalizeAssetType = (categoryName) => {
    if (!categoryName) return null;
    const upper = categoryName.toUpperCase();
    if (upper.includes('CCTV') || upper.includes('PENGAWAS') || upper.includes('KAMERA')) return 'CCTV';
    if (upper.includes('SFO')) return 'SFO';
    if (upper.includes('LAMPU') || upper.includes('PJU')) return 'LAMPU PJU';
    if (upper.includes('PANEL')) return 'PANEL';
    if (upper.includes('KWH')) return 'KWH';
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

  // Handle checkbox change
  const handleAssetTypeToggle = (type) => {
    setSelectedAssetTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Select all asset types
  const handleSelectAllTypes = () => {
    const availableTypes = getAvailableAssetTypes();
    setSelectedAssetTypes(availableTypes);
  };

  // Reset filter to all types
  const handleResetFilter = () => {
    setSelectedAssetTypes(['CCTV', 'SFO', 'LAMPU PJU', 'PANEL', 'KWH']);
  };

  // Filter assets based on all selected filters (asset type, month, week, year)
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      // Filter by asset type
      const assetType = normalizeAssetType(asset.category_name);
      const matchType = assetType && selectedAssetTypes.includes(assetType);

      if (!matchType) return false;

      // Filter by month
      if (selectedMonth) {
        const assetDate = new Date(asset.created_at || asset.installed_at);
        const assetMonth = assetDate.getMonth() + 1;
        if (assetMonth !== parseInt(selectedMonth)) return false;
      }

      // Filter by week
      if (selectedWeek) {
        const assetDate = new Date(asset.created_at || asset.installed_at);
        const weekNumber = Math.ceil(assetDate.getDate() / 7);
        if (weekNumber !== parseInt(selectedWeek)) return false;
      }

      // Filter by year
      if (selectedYear) {
        const assetDate = new Date(asset.created_at || asset.installed_at);
        const assetYear = assetDate.getFullYear();
        if (assetYear !== parseInt(selectedYear)) return false;
      }

      return true;
    });
  }, [assets, selectedAssetTypes, selectedMonth, selectedWeek, selectedYear]);

  // Calculate statistics from filtered assets
  const filteredStats = useMemo(() => {
    return {
      total: filteredAssets.length,
      baik: filteredAssets.filter(a => a.condition_status === 'baik' || a.condition_status === 'selesai_diperbaiki').length,
      rusak: filteredAssets.filter(a => a.condition_status === 'rusak_ringan' || a.condition_status === 'rusak_berat').length,
      sedangPerbaikan: filteredAssets.filter(a => a.condition_status === 'sedang_diperbaiki').length,
    };
  }, [filteredAssets]);

  useEffect(() => {
    fetchStats();
    fetchAssets();
    fetchReports();

    // Poll for realtime updates every 5 seconds
    const interval = setInterval(() => {
      fetchStats();
      fetchAssets();
      fetchReports();
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedMonth, selectedWeek, selectedYear]);

  useEffect(() => {
    const handleOpenReportDetail = (event) => {
      setSelectedReport(event.detail);
    };

    window.addEventListener('openReportDetail', handleOpenReportDetail);
    return () => window.removeEventListener('openReportDetail', handleOpenReportDetail);
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;
    const container = mapContainerRef.current;
    const map = L.map(container, {
      center: [-6.2347001, 106.9321978],
      zoom: 6,
      scrollWheelZoom: false,
      dragging: true,
      layers: [],
    });

    const baseLayers = {
      'Topographic': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri &amp; the GIS User Community',
        maxZoom: 19,
      }),
    };

    baseLayers['Topographic'].addTo(map);
    mapInstanceRef.current = map;

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
      if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
    });
    ro.observe(container);

    return () => {
      timers.forEach(clearTimeout);
      ro.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    if (filteredAssets.length === 0) return;

    filteredAssets.forEach(asset => {
      const lat = parseFloat(asset.location_lat);
      const lng = parseFloat(asset.location_lng);
      if (isNaN(lat) || isNaN(lng)) return;
      const circle = L.circleMarker([lat, lng], {
        radius: 8,
        fillColor: getCategoryColor(asset.category_name),
        fillOpacity: 0.9,
        color: '#ffffff',
        weight: 1.5,
      }).addTo(map);
      circle.bindTooltip(asset.category_name || asset.name, { direction: 'top', offset: [0, -8] });
      circle.bindPopup(`<div style="text-align: center; padding: 8px; font-family: Inter, sans-serif;"><strong>${asset.category_name || asset.name}</strong></div>`);
      markersRef.current.push(circle);
    });

    const validPoints = filteredAssets
      .map(a => [parseFloat(a.location_lat), parseFloat(a.location_lng)])
      .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));
    if (validPoints.length > 0) {
      if (validPoints.length === 1) {
        map.setView(validPoints[0], 13);
      } else {
        const bounds = L.latLngBounds(validPoints);
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 13, animate: true, duration: 1 });
      }
    }

    // Re-invalidate after markers are drawn
    setTimeout(() => map.invalidateSize(), 200);
  }, [filteredAssets]);

  const fetchStats = async () => {
    try {
      console.log('[Dashboard] Fetching stats...');
      const response = await api.get('/dashboard/stats');
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
      const response = await api.get('/assets', { params: { month: selectedMonth, year: selectedYear || '', limit: 9999 } });
      let data = response.data.data || [];
      // Apply week-of-month filter client-side (Minggu 1 = tanggal 1-7, dst)
      if (selectedWeek) {
        data = data.filter(asset => {
          const date = new Date(asset.created_at || asset.installed_at);
          const weekNumber = Math.ceil(date.getDate() / 7);
          return weekNumber === parseInt(selectedWeek);
        });
      }
      setAssets(data);
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      const response = await api.get('/reports', { params: { limit: 20 } });
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
      <div className="flex-shrink-0 bg-[#0F172A]/80 backdrop-blur-xl px-4 md:px-6 py-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-6">
          {/* Title */}
          <div className="flex items-center min-w-0 flex-shrink-0">
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight truncate">Monitoring Aset Jalan Tol Becakayu</h1>
          </div>

          {/* Filter Section */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3 justify-start lg:justify-end w-full lg:w-auto min-w-0">
            {/* Date Filters */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-2 md:px-3 py-1.5 bg-[#111827] border border-white/6 rounded-xl text-white text-[10px] md:text-xs focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 focus:border-[#3B82F6]/50 min-w-[80px] md:min-w-[100px] whitespace-nowrap"
              >
                <option value="">Bulan</option>
                <option value="1">Jan</option>
                <option value="2">Feb</option>
                <option value="3">Mar</option>
                <option value="4">Apr</option>
                <option value="5">Mei</option>
                <option value="6">Jun</option>
                <option value="7">Jul</option>
                <option value="8">Ags</option>
                <option value="9">Sep</option>
                <option value="10">Okt</option>
                <option value="11">Nov</option>
                <option value="12">Des</option>
              </select>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="px-2 md:px-3 py-1.5 bg-[#111827] border border-white/6 rounded-xl text-white text-[10px] md:text-xs focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 focus:border-[#3B82F6]/50 min-w-[70px] md:min-w-[90px] whitespace-nowrap"
              >
                <option value="">Minggu</option>
                <option value="1">M1</option>
                <option value="2">M2</option>
                <option value="3">M3</option>
                <option value="4">M4</option>
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-2 md:px-3 py-1.5 bg-[#111827] border border-white/6 rounded-xl text-white text-[10px] md:text-xs focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 focus:border-[#3B82F6]/50 min-w-[80px] md:min-w-[100px] whitespace-nowrap"
              >
                <option value="">Tahun</option>
                {[2024, 2025, 2026, 2027].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Separator */}
            <div className="hidden md:block w-px h-6 bg-white/10 flex-shrink-0"></div>

            {/* Asset Type Filter */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1 md:gap-2">
                <button
                  onClick={handleSelectAllTypes}
                  className="px-2 py-1 text-[10px] bg-[#3B82F6]/20 hover:bg-[#3B82F6]/30 text-[#3B82F6] rounded transition-colors whitespace-nowrap"
                >
                  Semua
                </button>
                <button
                  onClick={handleResetFilter}
                  className="px-2 py-1 text-[10px] bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors whitespace-nowrap"
                >
                  Reset
                </button>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {['CCTV', 'SFO', 'LAMPU PJU', 'PANEL', 'KWH'].map(type => {
                  const isSelected = selectedAssetTypes.includes(type);
                  const color = getCategoryColor(type);
                  const typeAssets = assets.filter(asset => normalizeAssetType(asset.category_name) === type);
                  if (typeAssets.length === 0) return null;
                  return (
                    <button
                      key={type}
                      onClick={() => handleAssetTypeToggle(type)}
                      className={`px-2 py-1 text-[10px] rounded transition-colors flex items-center gap-1 flex-shrink-0 ${
                        isSelected
                          ? 'text-white'
                          : 'text-gray-400'
                      }`}
                      style={{
                        backgroundColor: isSelected ? `${color}40` : 'rgba(17, 24, 39, 0.8)',
                        border: isSelected ? `1px solid ${color}` : '1px solid rgba(255,255,255,0.1)'
                      }}
                    >
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="hidden sm:inline">{type}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => { fetchAssets(); fetchStats(); }}
              className="px-3 md:px-4 py-1.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl text-[10px] md:text-xs transition-all duration-200 shadow-lg shadow-[#3B82F6]/20 flex-shrink-0 whitespace-nowrap"
            >
              Refresh
            </button>

            {/* Profile & Notification */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <NotificationCenter />
              <ProfileDropdown
                onProfileClick={() => setProfileModalOpen(true)}
                onSettingsClick={handleSettingsClick}
                onPasswordClick={handlePasswordClick}
                onLogout={handleLogout}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden p-5 gap-5">
        {/* Statistics Cards - computed from filtered assets */}
        <div className="flex-shrink-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
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
            onClick={() => handleCardClick('perbaikan')}
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
        <div className="flex-1 min-h-0">
          <div className="glass-card p-0 overflow-hidden relative h-full">
            <div
              ref={mapContainerRef}
              className="w-full h-full min-h-[300px] md:min-h-[400px] lg:min-h-[500px]"
              style={{ zIndex: 0 }}
            />
          </div>
        </div>

        {/* Repair Report Summary - Bottom bar */}
        <div className="flex-shrink-0">
          <RepairReportSummary
            reports={reports}
            onSelesaiClick={() => handleCardClick('selesai')}
            onBelumSelesaiClick={() => handleCardClick('belum_selesai')}
          />
        </div>
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
