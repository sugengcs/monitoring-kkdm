import { useState, useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';
import { MapPin, ExternalLink, Clock, Wrench, CheckCircle, AlertCircle, Play, X, Trash2, LayoutGrid, RefreshCw, User, Camera, ChevronDown } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const RepairTracking = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [teknisiList, setTeknisiList] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [progressHistory, setProgressHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [progressModal, setProgressModal] = useState(null);
  const [progressForm, setProgressForm] = useState({ progress_percentage: 0, notes: '', photo: null });
  const [updatingProgress, setUpdatingProgress] = useState(false);
  const [deletingReport, setDeletingReport] = useState(null);
  const [assignModal, setAssignModal] = useState(null);
  const [assignTeknisiId, setAssignTeknisiId] = useState('');
  const [viewMode, setViewMode] = useState('map');
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const routeLayersRef = useRef([]);
  const pollRef = useRef(null);

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const fetchReports = useCallback(async () => {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const [reportRes, maintRes] = await Promise.all([
        api.get('/reports', { params }),
        api.get('/maintenance')
      ]);
      const reportsData = reportRes.data.data || [];
      const maintData = maintRes.data.data || [];

      const merged = reportsData.map(r => {
        const maint = maintData.find(m => m.report_id === r.id) || {};
        return {
          ...r,
          maintenance_id: maint.id || null,
          progress_percentage: maint.progress_percentage ?? 0,
          repair_team_name: maint.repair_team_name || '-',
          repair_team_id: maint.repair_team_id || null,
          maintenance_notes: maint.notes || '',
          maintenance_status: maint.status || null,
          started_at: maint.started_at || null,
          completed_at: maint.completed_at || null,
        };
      });
      setReports(merged);
      // update selectedReport if open
      setSelectedReport(prev => prev ? (merged.find(r => r.id === prev.id) || prev) : null);
    } catch (err) {
      console.error('fetchReports error:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchTeknisi = useCallback(async () => {
    try {
      const res = await api.get('/users/list/teknisi');
      setTeknisiList(res.data.data || []);
    } catch (_) {}
  }, []);

  const fetchProgressHistory = useCallback(async (reportId) => {
    try {
      const res = await api.get(`/reports/${reportId}/progress`);
      setProgressHistory(res.data.data || []);
    } catch (_) {
      setProgressHistory([]);
    }
  }, []);

  // ─── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchReports();
    if (user?.role === 'admin') fetchTeknisi();
  }, [fetchReports, fetchTeknisi, user?.role]);

  // Polling every 30 seconds
  useEffect(() => {
    pollRef.current = setInterval(fetchReports, 30000);
    return () => clearInterval(pollRef.current);
  }, [fetchReports]);

  // Refresh on tab visibility
  useEffect(() => {
    const handle = () => { if (document.visibilityState === 'visible') fetchReports(); };
    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, [fetchReports]);

  // Map initialization
  useEffect(() => {
    if (mapInstanceRef.current || !mapRef.current) return;
    mapInstanceRef.current = L.map(mapRef.current, {
      center: [-6.2347001, 106.9321978],
      zoom: 13,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstanceRef.current);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sync markers when reports change
  useEffect(() => {
    if (mapInstanceRef.current) updateMapMarkers();
  }, [reports]); // eslint-disable-line

  // ─── Map Markers ────────────────────────────────────────────────────────────

  const updateMapMarkers = () => {
    // Remove existing markers
    Object.values(markersRef.current).forEach(m => {
      try { mapInstanceRef.current.removeLayer(m); } catch (_) {}
    });
    markersRef.current = {};

    reports.forEach(report => {
      const lat = parseFloat(report.location_lat);
      const lng = parseFloat(report.location_lng);
      if (isNaN(lat) || isNaN(lng)) return;

      const statusColors = {
        pending: '#F59E0B',
        diproses: '#3B82F6',
        dalam_perbaikan: '#EF4444',
        on_progress: '#EF4444',
        selesai: '#22C55E',
        ditolak: '#6B7280',
      };
      const fillColor = statusColors[report.status] || '#9CA3AF';
      const animClass = (report.status === 'dalam_perbaikan' || report.status === 'on_progress')
        ? 'marker-status-damage'
        : (report.status === 'pending' || report.status === 'diproses')
          ? 'marker-status-repair'
          : '';

      const marker = L.circleMarker([lat, lng], {
        radius: (report.status === 'dalam_perbaikan' || report.status === 'on_progress') ? 9 : 7,
        fillColor,
        fillOpacity: 0.9,
        color: '#fff',
        weight: 2,
        className: animClass,
      })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div style="min-width:240px;font-family:Inter,sans-serif">
            <h3 style="font-weight:700;margin-bottom:6px;color:#1f2937;font-size:14px">${report.asset_name || 'Aset'}</h3>
            <p style="font-size:12px;color:#6b7280;margin:3px 0"><b>No.:</b> ${report.report_number}</p>
            <p style="font-size:12px;color:#6b7280;margin:3px 0"><b>Status:</b> ${getStatusLabel(report.status)}</p>
            <p style="font-size:12px;color:#6b7280;margin:3px 0"><b>Kerusakan:</b> ${report.damage_level || '-'}</p>
            <p style="font-size:12px;color:#6b7280;margin:3px 0"><b>Progress:</b> ${report.progress_percentage ?? 0}%</p>
            <p style="font-size:12px;color:#6b7280;margin:3px 0"><b>Pelapor:</b> ${report.reporter_name || '-'}</p>
            ${report.photo_before ? `<img src="${report.photo_before}" style="width:100%;max-height:120px;object-fit:cover;margin-top:6px;border-radius:4px">` : ''}
          </div>
        `);

      marker.on('click', () => {
        setSelectedReport(report);
        fetchProgressHistory(report.id);
      });

      markersRef.current[report.id] = marker;
    });
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const getStatusLabel = (status) => {
    const map = {
      pending: 'Menunggu', diproses: 'Diproses', on_progress: 'Dalam Perbaikan',
      dalam_perbaikan: 'Dalam Perbaikan', selesai: 'Selesai', ditolak: 'Ditolak'
    };
    return map[status] || status;
  };

  const getProgressColor = (p) => p === 0 ? 'bg-red-500' : p === 100 ? 'bg-green-500' : 'bg-orange-500';

  const getStatusBadge = (status) => {
    const cfg = {
      pending:          { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: AlertCircle, label: 'Menunggu' },
      diproses:         { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Clock, label: 'Diproses' },
      on_progress:      { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: Wrench, label: 'Dalam Perbaikan' },
      dalam_perbaikan:  { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: Wrench, label: 'Dalam Perbaikan' },
      selesai:          { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle, label: 'Selesai' },
      ditolak:          { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertCircle, label: 'Ditolak' },
    };
    return cfg[status] || { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: AlertCircle, label: status };
  };

  // ─── Helper: Ensure maintenance_id exists ────────────────────────────────

  const ensureMaintenanceId = async (report) => {
    if (report.maintenance_id) return report.maintenance_id;
    try {
      const res = await api.post(`/reports/${report.id}/ensure-maintenance`);
      if (res.data.success) {
        const mid = res.data.data.id;
        // Update local state
        setReports(prev => prev.map(r => r.id === report.id ? { ...r, maintenance_id: mid } : r));
        setSelectedReport(prev => prev && prev.id === report.id ? { ...prev, maintenance_id: mid } : prev);
        return mid;
      }
    } catch (err) {
      console.error('ensureMaintenanceId error:', err);
      toast.error('Gagal membuat record maintenance');
      return null;
    }
    return null;
  };

  // ─── Actions ─────────────────────────────────────────────────────────────────

  const handleViewLocation = (report) => {
    const lat = parseFloat(report.location_lat);
    const lng = parseFloat(report.location_lng);
    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Koordinat lokasi tidak tersedia');
      return;
    }
    if (viewMode !== 'map') setViewMode('map');
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([lat, lng], 18);
        const m = markersRef.current[report.id];
        if (m) m.openPopup();
      }
    }, 100);
    setSelectedReport(report);
    fetchProgressHistory(report.id);
    toast.success('Menuju lokasi aset...');
  };

  const handleOpenRoute = (report) => {
    const lat = parseFloat(report.location_lat);
    const lng = parseFloat(report.location_lng);
    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Koordinat lokasi tidak tersedia');
      return;
    }

    // Clear old route layers
    routeLayersRef.current.forEach(l => { try { mapInstanceRef.current.removeLayer(l); } catch (_) {} });
    routeLayersRef.current = [];

    if (!navigator.geolocation) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
      return;
    }

    toast('Mengambil lokasi Anda...', { icon: '📍' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        if (viewMode !== 'map') setViewMode('map');

        const routeUrl = `https://router.project-osrm.org/route/v1/driving/${uLng},${uLat};${lng},${lat}?overview=full&geometries=geojson`;
        fetch(routeUrl)
          .then(r => r.json())
          .then(data => {
            if (data.code === 'Ok' && data.routes[0]) {
              const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
              const routeLine = L.polyline(coords, { color: '#3B82F6', weight: 5, opacity: 0.85 }).addTo(mapInstanceRef.current);
              const userMk = L.circleMarker([uLat, uLng], { radius: 8, fillColor: '#22c55e', color: '#fff', weight: 2, fillOpacity: 1 })
                .addTo(mapInstanceRef.current).bindPopup('Lokasi Anda');
              routeLayersRef.current = [routeLine, userMk];
              mapInstanceRef.current.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
              const dist = (data.routes[0].distance / 1000).toFixed(1);
              const dur = Math.round(data.routes[0].duration / 60);
              toast.success(`Jarak: ${dist} km | Estimasi: ~${dur} menit`);
            } else {
              toast.error('Rute tidak ditemukan');
            }
          })
          .catch(() => {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
          });
      },
      () => {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleProgressUpdate = async () => {
    const report = progressModal;
    const mid = await ensureMaintenanceId(report);
    if (!mid) return;

    try {
      setUpdatingProgress(true);
      const fd = new FormData();
      fd.append('progress_percentage', progressForm.progress_percentage);
      fd.append('notes', progressForm.notes || `Progress diperbarui menjadi ${progressForm.progress_percentage}%`);
      if (progressForm.photo) fd.append('photo', progressForm.photo);

      const res = await api.put(`/maintenance/${mid}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        toast.success('Progress berhasil diperbarui');
        setProgressModal(null);
        setProgressForm({ progress_percentage: 0, notes: '', photo: null });
        fetchReports();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengupdate progress');
    } finally {
      setUpdatingProgress(false);
    }
  };

  const handleQuickStart = async (report) => {
    setUpdatingProgress(true);
    try {
      const mid = await ensureMaintenanceId(report);
      if (!mid) {
        toast.error('Gagal membuat record maintenance');
        return;
      }
      await api.put(`/reports/${report.id}/status`, { status: 'dalam_perbaikan' });
      toast.success('Perbaikan dimulai!');
      fetchReports();
    } catch (err) {
      console.error('handleQuickStart error:', err);
      toast.error(err.response?.data?.message || 'Gagal memulai perbaikan');
    } finally {
      setUpdatingProgress(false);
    }
  };

  const handleQuickFinish = async (report) => {
    const mid = await ensureMaintenanceId(report);
    if (!mid) return;
    try {
      setUpdatingProgress(true);
      const fd = new FormData();
      fd.append('progress_percentage', 100);
      fd.append('notes', 'Perbaikan selesai');
      await api.put(`/maintenance/${mid}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Perbaikan selesai! 🎉');
      fetchReports();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyelesaikan perbaikan');
    } finally {
      setUpdatingProgress(false);
    }
  };

  const handleAssignTeknisi = async () => {
    if (!assignModal || !assignTeknisiId) return;
    try {
      const res = await api.put(`/reports/${assignModal.id}/assign`, { repair_team_id: parseInt(assignTeknisiId) });
      toast.success(res.data.message || 'Teknisi berhasil ditugaskan');
      setAssignModal(null);
      setAssignTeknisiId('');
      fetchReports();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal assign teknisi');
    }
  };

  const handleDeleteReport = async (reportId) => {
    try {
      const response = await api.delete(`/reports/${reportId}`);
      if (response.data.success) {
        toast.success('Laporan berhasil dihapus');
        fetchReports();
        if (selectedReport?.id === reportId) {
          setSelectedReport(null);
        }
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Gagal menghapus laporan');
    } finally {
      setDeletingReport(null);
    }
  };

  if (user?.role !== 'admin' && user?.role !== 'teknisi') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Akses ditolak. Halaman ini hanya untuk Admin dan Teknisi.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Status Perbaikan</h1>
          <p className="text-gray-400 mt-1">
            Pantau dan kelola progress perbaikan aset
            <span className="ml-2 inline-flex items-center gap-1 text-xs text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse inline-block" />
              Live · refresh tiap 30s
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Semua Status</option>
            <option value="pending">Menunggu</option>
            <option value="diproses">Diproses</option>
            <option value="dalam_perbaikan">Dalam Perbaikan</option>
            <option value="on_progress">On Progress</option>
            <option value="selesai">Selesai</option>
          </select>
          <div className="flex bg-gray-800 border border-gray-700 rounded-lg p-1">
            <button onClick={() => setViewMode('map')} title="Tampilan Peta"
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${viewMode === 'map' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              <MapPin className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('card')} title="Tampilan Kartu"
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${viewMode === 'card' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <button onClick={fetchReports} title="Refresh"
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Map View ─── */}
      {viewMode === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-500" /> Peta Lokasi Perbaikan
              </h2>
              <div className="flex gap-2 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" /> Menunggu</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Perbaikan</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Selesai</span>
              </div>
            </div>
            <div ref={mapRef} style={{ width: '100%', height: '520px' }} />
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col">
            <h2 className="text-lg font-semibold text-white mb-3">Daftar Laporan ({reports.length})</h2>
            <div className="flex-1 overflow-y-auto space-y-3 max-h-[480px] pr-1">
              {loading ? (
                <div className="animate-pulse space-y-3">
                  {[1,2,3].map(i => <div key={i} className="bg-gray-700/50 rounded-lg p-4 h-24" />)}
                </div>
              ) : reports.length === 0 ? (
                <p className="text-gray-400 text-center py-12">Tidak ada laporan</p>
              ) : reports.map((report) => {
                const sc = getStatusBadge(report.status);
                const prog = report.progress_percentage || 0;
                const isActive = selectedReport?.id === report.id;
                return (
                  <div key={report.id}
                    className={`bg-gray-700/50 rounded-lg p-3 cursor-pointer hover:bg-gray-700 transition-colors border ${isActive ? 'border-orange-500' : 'border-transparent'}`}
                    onClick={() => { setSelectedReport(report); fetchProgressHistory(report.id); }}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{report.asset_name || report.report_number}</p>
                        <p className="text-xs text-gray-400">{report.report_number}</p>
                      </div>
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 flex-shrink-0 border ${sc.color}`}>
                        <sc.icon className="w-3 h-3" />{sc.label}
                      </span>
                    </div>
                    <div className="mb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Progress</span>
                        <span className="text-white font-medium">{prog}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-600 rounded-full overflow-hidden">
                        <div className={`h-full ${getProgressColor(prog)} rounded-full transition-all duration-500`} style={{ width: `${prog}%` }} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={(e) => { e.stopPropagation(); handleViewLocation(report); }}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Lokasi
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleOpenRoute(report); }}
                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> Rute
                      </button>
                      {report.status === 'pending' && (
                        <button onClick={(e) => { e.stopPropagation(); handleQuickStart(report); }}
                          className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs flex items-center gap-1">
                          <Play className="w-3 h-3" /> Mulai
                        </button>
                      )}
                      {(report.status === 'dalam_perbaikan' || report.status === 'on_progress' || report.status === 'diproses') && (
                        <button onClick={(e) => { e.stopPropagation(); setProgressModal(report); setProgressForm({ progress_percentage: prog, notes: '', photo: null }); }}
                          className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs flex items-center gap-1">
                          <Wrench className="w-3 h-3" /> Update
                        </button>
                      )}
                      {report.status !== 'selesai' && prog > 0 && (
                        <button onClick={(e) => { e.stopPropagation(); handleQuickFinish(report); }}
                          disabled={updatingProgress}
                          className="px-2 py-1 bg-green-700 hover:bg-green-800 text-white rounded text-xs flex items-center gap-1 disabled:opacity-50">
                          <CheckCircle className="w-3 h-3" /> Selesai
                        </button>
                      )}
                      {user?.role === 'admin' && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); setAssignModal(report); setAssignTeknisiId(''); }}
                            className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs flex items-center gap-1">
                            <User className="w-3 h-3" /> Assign
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setDeletingReport(report); }}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs flex items-center gap-1">
                            <Trash2 className="w-3 h-3" /> Hapus
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── Card View ─── */}
      {viewMode === 'card' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-3 flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
            </div>
          ) : reports.length === 0 ? (
            <div className="col-span-3 text-center text-gray-400 py-12">Tidak ada laporan</div>
          ) : reports.map((report) => {
            const sc = getStatusBadge(report.status);
            const prog = report.progress_percentage || 0;
            return (
              <div key={report.id}
                className={`bg-gray-800 border rounded-xl p-5 hover:border-gray-500 transition-colors cursor-pointer ${selectedReport?.id === report.id ? 'border-orange-500' : 'border-gray-700'}`}
                onClick={() => { setSelectedReport(report); fetchProgressHistory(report.id); }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{report.asset_name || 'Aset'}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{report.report_number}</p>
                  </div>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 border ${sc.color}`}>
                    <sc.icon className="w-3 h-3" />{sc.label}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mb-3 line-clamp-2">{report.description}</p>
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">Progress</span>
                    <span className="text-white font-bold">{prog}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full ${getProgressColor(prog)} rounded-full transition-all duration-500`} style={{ width: `${prog}%` }} />
                  </div>
                </div>
                <div className="space-y-1 text-xs mb-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Teknisi:</span>
                    <span className="text-white">{report.repair_team_name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tingkat:</span>
                    <span className="text-white capitalize">{report.damage_level || '-'}</span>
                  </div>
                  {report.maintenance_notes && (
                    <div className="pt-1 border-t border-gray-700">
                      <p className="text-gray-400">Catatan: <span className="text-gray-300">{report.maintenance_notes}</span></p>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={(e) => { e.stopPropagation(); handleViewLocation(report); }}
                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Lokasi
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleOpenRoute(report); }}
                    className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> Rute
                  </button>
                  {report.status === 'pending' && (
                    <button onClick={(e) => { e.stopPropagation(); handleQuickStart(report); }}
                      className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs flex items-center gap-1">
                      <Play className="w-3 h-3" /> Mulai
                    </button>
                  )}
                  {(report.status === 'dalam_perbaikan' || report.status === 'on_progress' || report.status === 'diproses') && (
                    <button onClick={(e) => { e.stopPropagation(); setProgressModal(report); setProgressForm({ progress_percentage: prog, notes: '', photo: null }); }}
                      className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs flex items-center gap-1">
                      <Wrench className="w-3 h-3" /> Update
                    </button>
                  )}
                  {report.status !== 'selesai' && prog > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); handleQuickFinish(report); }}
                      disabled={updatingProgress}
                      className="px-2 py-1 bg-green-700 hover:bg-green-800 text-white rounded text-xs flex items-center gap-1 disabled:opacity-50">
                      <CheckCircle className="w-3 h-3" /> Selesai
                    </button>
                  )}
                  {user?.role === 'admin' && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); setAssignModal(report); setAssignTeknisiId(''); }}
                        className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs flex items-center gap-1">
                        <User className="w-3 h-3" /> Assign
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDeletingReport(report); }}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Hapus
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Selected Report Detail Panel ─── */}
      {selectedReport && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Wrench className="w-5 h-5 text-orange-500" /> Detail Laporan
            </h2>
            <button onClick={() => setSelectedReport(null)} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {[
              ['No. Laporan', selectedReport.report_number],
              ['Nama Aset', selectedReport.asset_name || '-'],
              ['Pelapor', selectedReport.reporter_name || '-'],
              ['Tingkat Kerusakan', <span className="capitalize">{selectedReport.damage_level}</span>],
              ['Status', getStatusBadge(selectedReport.status).label],
              ['Progress', `${selectedReport.progress_percentage || 0}%`],
              ['Teknisi', selectedReport.repair_team_name || '-'],
              ['Tanggal Lapor', new Date(selectedReport.reported_at).toLocaleString('id-ID')],
              ['Koordinat', selectedReport.location_lat && selectedReport.location_lng
                ? `${parseFloat(selectedReport.location_lat).toFixed(5)}, ${parseFloat(selectedReport.location_lng).toFixed(5)}`
                : '-'],
            ].map(([label, val], i) => (
              <div key={i}>
                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                <p className="text-sm text-white">{val}</p>
              </div>
            ))}
            <div className="md:col-span-2 lg:col-span-3">
              <p className="text-xs text-gray-400 mb-0.5">Deskripsi</p>
              <p className="text-sm text-white">{selectedReport.description}</p>
            </div>
          </div>

          {/* Foto sebelum */}
          {selectedReport.photo_before && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-2">Foto Kerusakan</p>
              <img src={selectedReport.photo_before} alt="foto kerusakan" className="max-h-40 rounded-lg object-cover" />
            </div>
          )}

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Progress Perbaikan</span>
              <span className="text-white font-bold">{selectedReport.progress_percentage || 0}%</span>
            </div>
            <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
              <div className={`h-full ${getProgressColor(selectedReport.progress_percentage || 0)} rounded-full transition-all duration-700`}
                style={{ width: `${selectedReport.progress_percentage || 0}%` }} />
            </div>
          </div>

          {/* Timeline history */}
          {progressHistory.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-300 mb-2">Timeline Progress</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {progressHistory.map((h, i) => (
                  <div key={i} className="flex gap-3 text-xs">
                    <span className="text-gray-500 whitespace-nowrap">{h.created_at ? new Date(h.created_at).toLocaleString('id-ID') : '-'}</span>
                    <span className="text-gray-300">{h.notes || h.status}</span>
                    {h.updated_by_name && <span className="text-gray-500 ml-auto">— {h.updated_by_name}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons in detail */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-700">
            <button onClick={() => handleViewLocation(selectedReport)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-1">
              <MapPin className="w-4 h-4" /> Lihat Lokasi
            </button>
            <button onClick={() => handleOpenRoute(selectedReport)}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center gap-1">
              <ExternalLink className="w-4 h-4" /> Arahkan Rute
            </button>
            {selectedReport.status === 'pending' && (
              <button onClick={() => handleQuickStart(selectedReport)}
                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm flex items-center gap-1">
                <Play className="w-4 h-4" /> Mulai Perbaikan
              </button>
            )}
            {(selectedReport.status === 'dalam_perbaikan' || selectedReport.status === 'on_progress' || selectedReport.status === 'diproses') && (
              <button onClick={() => { setProgressModal(selectedReport); setProgressForm({ progress_percentage: selectedReport.progress_percentage || 0, notes: '', photo: null }); }}
                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm flex items-center gap-1">
                <Wrench className="w-4 h-4" /> Update Progress
              </button>
            )}
            {selectedReport.status !== 'selesai' && (selectedReport.progress_percentage || 0) > 0 && (
              <button onClick={() => handleQuickFinish(selectedReport)}
                disabled={updatingProgress}
                className="px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-50">
                <CheckCircle className="w-4 h-4" /> Selesai Perbaikan
              </button>
            )}
            {user?.role === 'admin' && (
              <>
                <button onClick={() => { setAssignModal(selectedReport); setAssignTeknisiId(''); }}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm flex items-center gap-1">
                  <User className="w-4 h-4" /> Assign Teknisi
                </button>
                <button onClick={() => setDeletingReport(selectedReport)}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm flex items-center gap-1">
                  <Trash2 className="w-4 h-4" /> Hapus Laporan
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Progress Update Modal ─── */}
      {progressModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-orange-500" /> Update Progress
              </h2>
              <button onClick={() => setProgressModal(null)} className="text-gray-400 hover:text-white" disabled={updatingProgress}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
              <p className="text-sm font-medium text-white">{progressModal.asset_name || progressModal.report_number}</p>
              <p className="text-xs text-gray-400 mt-0.5">{progressModal.report_number}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Progress: <span className="text-white font-bold">{progressForm.progress_percentage}%</span></label>
                <input type="range" min="0" max="100" step="5"
                  value={progressForm.progress_percentage}
                  onChange={(e) => setProgressForm(p => ({ ...p, progress_percentage: parseInt(e.target.value) }))}
                  className="w-full accent-orange-500" />
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mt-2">
                  <div className={`h-full ${getProgressColor(progressForm.progress_percentage)} rounded-full transition-all duration-300`}
                    style={{ width: `${progressForm.progress_percentage}%` }} />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Menunggu</span><span>Dalam Perbaikan</span><span>Selesai</span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Catatan Teknisi</label>
                <textarea
                  value={progressForm.notes}
                  onChange={(e) => setProgressForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Deskripsikan pekerjaan yang sudah dilakukan..."
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1 flex items-center gap-1">
                  <Camera className="w-4 h-4" /> Foto Progress
                </label>
                <input type="file" accept="image/*"
                  onChange={(e) => setProgressForm(p => ({ ...p, photo: e.target.files[0] || null }))}
                  className="w-full text-sm text-gray-400 file:mr-3 file:px-3 file:py-1 file:bg-gray-700 file:border-0 file:rounded file:text-white file:text-sm hover:file:bg-gray-600" />
                {progressForm.photo && (
                  <p className="text-xs text-green-400 mt-1">✓ {progressForm.photo.name}</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setProgressModal(null)} disabled={updatingProgress}
                  className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm disabled:opacity-50">
                  Batal
                </button>
                <button onClick={handleProgressUpdate} disabled={updatingProgress}
                  className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                  {updatingProgress ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Wrench className="w-4 h-4" />}
                  {updatingProgress ? 'Menyimpan...' : 'Simpan Progress'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Assign Teknisi Modal (admin only) ─── */}
      {assignModal && user?.role === 'admin' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-purple-400" /> Assign Teknisi
              </h2>
              <button onClick={() => setAssignModal(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-400 mb-4">{assignModal.report_number} — {assignModal.asset_name}</p>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Pilih Teknisi</label>
              <select value={assignTeknisiId} onChange={(e) => setAssignTeknisiId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">— Pilih Teknisi —</option>
                {teknisiList.map(t => (
                  <option key={t.id} value={t.id}>{t.full_name} {t.phone ? `(${t.phone})` : ''}</option>
                ))}
              </select>
              {teknisiList.length === 0 && (
                <p className="text-xs text-yellow-400 mt-1">⚠ Belum ada teknisi terdaftar</p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAssignModal(null)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">Batal</button>
              <button onClick={handleAssignTeknisi} disabled={!assignTeknisiId}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                Tugaskan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      {deletingReport && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-500" /> Hapus Laporan
              </h2>
              <button onClick={() => setDeletingReport(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-300 mb-2"><span className="font-medium text-white">{deletingReport.report_number}</span></p>
            <p className="text-sm text-gray-400 mb-4">{deletingReport.description?.substring(0, 100)}</p>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-400">Tindakan ini akan menghapus laporan dan semua data terkait dan tidak dapat dibatalkan.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeletingReport(null)}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">Batal</button>
              <button onClick={() => handleDeleteReport(deletingReport.id)}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepairTracking;
