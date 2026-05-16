import { useEffect, useState, useRef } from 'react';
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
  Map
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
  if (upper === 'PERKERASAN' || upper.includes('PERKERASAN')) return '#f97316';
  if (upper === 'PJU') return '#eab308';
  if (upper === 'CCTV') return '#3b82f6';
  if (upper === 'RAMBU') return '#ef4444';
  if (upper === 'PANEL' || upper.includes('PANEL')) return '#a855f7';
  if (upper === 'KWH' || upper.includes('KWH')) return '#06b6d4';
  const palette = ['#22c55e', '#14b8a6', '#f43f5e', '#84cc16', '#6366f1', '#ec4899'];
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
    className="glass-card glass-card-hover overflow-hidden group cursor-pointer"
    onClick={onClick}
  >
    <div className={`absolute inset-0 ${gradient} opacity-10 group-hover:opacity-20 transition-opacity duration-300`} />
    <div className="relative p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-3 rounded-xl ${color} bg-opacity-20 backdrop-blur-sm`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider">{title}</p>
        </div>
      </div>
      <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
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
  const [selectedStatus, setSelectedStatus] = useState('');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailModalTitle, setDetailModalTitle] = useState('');
  const [detailModalAssets, setDetailModalAssets] = useState([]);
  const [detailModalLoading, setDetailModalLoading] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

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
  }, [selectedMonth, selectedWeek, selectedYear, selectedStatus]);

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
      zoom: 7,
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

    if (assets.length === 0) return;

    assets.forEach(asset => {
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

    const validPoints = assets
      .map(a => [parseFloat(a.location_lat), parseFloat(a.location_lng)])
      .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));
    if (validPoints.length > 0) {
      if (validPoints.length === 1) {
        map.setView(validPoints[0], 16);
      } else {
        const bounds = L.latLngBounds(validPoints);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true, duration: 1 });
      }
    }

    // Re-invalidate after markers are drawn
    setTimeout(() => map.invalidateSize(), 200);
  }, [assets]);

  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
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
      const response = await api.get('/reports', { params: { limit: 20, status: selectedStatus || undefined } });
      setReports(response.data.data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const handleCardClick = async (cardType) => {
    setDetailModalLoading(true);
    setDetailModalOpen(true);
    
    let filteredData = [];
    let title = '';

    switch (cardType) {
      case 'total':
        filteredData = assets.map((asset, index) => ({
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
        filteredData = assets
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
        filteredData = assets
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
        filteredData = assets
          .filter(a => a.condition_status === 'sedang_diperbaiki')
          .map((asset, index) => ({
            no: index + 1,
            name: asset.name || '-',
            category: asset.category_name || '-',
            location: asset.ruas || '-',
            status: 'Perbaikan',
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
      const asset = assets[index];
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
      <div className="flex-shrink-0 bg-[#0F172A]/80 backdrop-blur-xl px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">Monitoring Aset Jalan Tol Becakayu</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 bg-[#111827] border border-white/6 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 focus:border-[#3B82F6]/50"
            >
              <option value="">Semua Bulan</option>
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
              className="px-3 py-1.5 bg-[#111827] border border-white/6 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 focus:border-[#3B82F6]/50"
            >
              <option value="">Semua Minggu</option>
              <option value="1">M1</option>
              <option value="2">M2</option>
              <option value="3">M3</option>
              <option value="4">M4</option>
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-1.5 bg-[#111827] border border-white/6 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 focus:border-[#3B82F6]/50"
            >
              <option value="">Semua Tahun</option>
              {[2024, 2025, 2026, 2027].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 bg-[#111827] border border-white/6 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 focus:border-[#3B82F6]/50"
            >
              <option value="">Semua Status</option>
              <option value="pending">Pending</option>
              <option value="diproses">Diproses</option>
              <option value="dalam_perbaikan">Perbaikan</option>
              <option value="selesai">Selesai</option>
              <option value="ditolak">Ditolak</option>
            </select>
            <button
              onClick={() => { fetchAssets(); fetchStats(); }}
              className="px-4 py-1.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl text-xs transition-all duration-200 shadow-lg shadow-[#3B82F6]/20"
            >
              Refresh
            </button>
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden p-5 gap-5">
        {/* Statistics Cards */}
        <div className="flex-shrink-0 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Aset"
            value={stats?.totalAssets || 0}
            icon={LayoutDashboard}
            color="bg-[#3B82F6]"
            gradient="gradient-primary"
            onClick={() => handleCardClick('total')}
          />
          <StatCard
            title="Kondisi Baik"
            value={stats?.derived?.baik || 0}
            icon={CheckCircle}
            color="bg-[#22C55E]"
            gradient="gradient-success"
            onClick={() => handleCardClick('baik')}
          />
          <StatCard
            title="Kondisi Rusak"
            value={stats?.derived?.rusak || 0}
            icon={AlertTriangle}
            color="bg-[#EF4444]"
            gradient="gradient-danger"
            onClick={() => handleCardClick('rusak')}
          />
          <StatCard
            title="Dalam Perbaikan"
            value={stats?.derived?.sedangPerbaikan || 0}
            icon={Wrench}
            color="bg-[#F59E0B]"
            gradient="gradient-warning"
            onClick={() => handleCardClick('perbaikan')}
          />
        </div>

        {/* Middle Section: Map with Legend */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-7 gap-5 min-h-0">
          {/* Legend */}
          <div className="lg:col-span-1 glass-card p-3 flex flex-col overflow-y-auto">
            <h2 className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
              <Activity className="w-3 h-3 text-[#3B82F6]" />
              Jenis Aset
            </h2>
            <div className="space-y-2">
              {[...new Set(assets.map(a => a.category_name).filter(Boolean))].map(cat => {
                const count = assets.filter(a => a.category_name === cat).length;
                const color = getCategoryColor(cat);
                // Use original category name, preserve KML file names
                let displayName = cat.toUpperCase();
                // Replace category names including KML IMPORT (only for CCTV-specific naming)
                displayName = displayName.replace(/PENGAWAS/g, 'CCTV').replace(/KAMERA/g, 'CCTV').replace(/PJU/g, 'LAMPU PJU');
                return (
                  <div
                    key={cat}
                    onClick={() => handleLegendClick(cat)}
                    className="flex items-center gap-2 p-1.5 hover:bg-gray-800/50 rounded-lg transition-colors cursor-pointer"
                  >
                    <div className="w-3 h-3 rounded-full border-2 border-white" style={{ backgroundColor: color }} />
                    <div className="flex-1">
                      <p className="text-xs text-white font-medium truncate">{displayName}</p>
                      <p className="text-[10px] text-gray-400">{count} titik</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Map */}
          <div className="lg:col-span-6 glass-card p-3 flex flex-col min-h-0">
            <h2 className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
              <Map className="w-3 h-3 text-[#22C55E]" />
              Peta Sebaran Aset ({assets.length} titik)
            </h2>
            <div
              ref={mapContainerRef}
              className="flex-1 min-h-0 rounded-xl overflow-hidden"
              style={{ background: '#111827' }}
            />
          </div>
        </div>

        {/* Repair Report Summary - Bottom bar */}
        <div className="flex-shrink-0">
          <RepairReportSummary
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
