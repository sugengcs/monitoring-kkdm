import { useState, useEffect, useRef } from 'react';
import { X, MapPin, AlertTriangle, Calendar, Image as ImageIcon, Clock, User, Wrench, CheckCircle, XCircle, PlayCircle } from 'lucide-react';
import L from 'leaflet';
import api from '../utils/api';

const ReportDetailModal = ({ report, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(report);
  const [activeTab, setActiveTab] = useState('detail');
  const [activities, setActivities] = useState([]);
  const [showProcessForm, setShowProcessForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [processForm, setProcessForm] = useState({
    technician_name: '',
    technician_notes: '',
    estimated_time: ''
  });
  const [rejectReason, setRejectReason] = useState('');
  const [progress, setProgress] = useState(0);
  const mapRef = useRef(null);

  useEffect(() => {
    setReportData(report);
    if (report?.id) {
      fetchActivities(report.id);
    }
  }, [report]);

  useEffect(() => {
    if (activeTab === 'detail' && reportData?.location_lat && reportData?.location_lng) {
      setTimeout(() => initMiniMap(), 100);
    }
  }, [activeTab, reportData]);

  const fetchActivities = async (reportId) => {
    try {
      const response = await api.get(`/reports/${reportId}/activities`);
      setActivities(response.data.data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const initMiniMap = () => {
    const mapContainer = document.getElementById('mini-map-container');
    if (!mapContainer || !reportData?.location_lat || !reportData?.location_lng) return;

    if (mapRef.current) {
      mapRef.current.remove();
    }

    const map = L.map(mapContainer, {
      center: [reportData.location_lat, reportData.location_lng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);

    const marker = L.circleMarker([reportData.location_lat, reportData.location_lng], {
      radius: 10,
      fillColor: '#ef4444',
      fillOpacity: 0.9,
      color: '#ffffff',
      weight: 2
    }).addTo(map);

    marker.bindTooltip('Lokasi Kerusakan', { direction: 'top', offset: [0, -10] });

    mapRef.current = map;
  };

  const updateStatus = async (newStatus, additionalData = {}) => {
    try {
      setLoading(true);
      const response = await api.put(`/reports/${reportData.id}/status`, {
        status: newStatus,
        ...additionalData
      });
      
      const updatedReport = { ...reportData, status: newStatus, ...additionalData };
      setReportData(updatedReport);
      
      if (newStatus === 'diproses' || newStatus === 'dalam_perbaikan') {
        setShowProcessForm(false);
      }
      if (newStatus === 'ditolak') {
        setShowRejectForm(false);
      }
      
      fetchActivities(reportData.id);
      alert('Status berhasil diperbarui');
    } catch (error) {
      console.error('Error updating status:', error);
      const msg = error.response?.data?.message || error.message || 'Gagal memperbarui status';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (newProgress) => {
    try {
      setLoading(true);
      await api.put(`/reports/${reportData.id}/progress`, {
        progress: newProgress,
        notes: processForm.technician_notes
      });
      
      setProgress(newProgress);
      fetchActivities(reportData.id);
      alert('Progress berhasil diperbarui');
    } catch (error) {
      console.error('Error updating progress:', error);
      alert('Gagal memperbarui progress');
    } finally {
      setLoading(false);
    }
  };

  const getDamageColor = (level) => {
    switch (level) {
      case 'ringan': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'sedang': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'berat': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'selesai': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'diproses': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'dalam_perbaikan': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'ditolak': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'selesai': return <CheckCircle className="w-4 h-4" />;
      case 'ditolak': return <XCircle className="w-4 h-4" />;
      case 'diproses': return <PlayCircle className="w-4 h-4" />;
      case 'dalam_perbaikan': return <Wrench className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (!reportData) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 isolate">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl transform transition-all flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">Detail Laporan Kerusakan</h2>
            <p className="text-gray-400 text-sm mt-1">{reportData.report_number}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 shrink-0">
          {['detail', 'tindak-lanjut', 'riwayat'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab === 'detail' ? 'Detail' : tab === 'tindak-lanjut' ? 'Tindak Lanjut' : 'Riwayat Aktivitas'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'detail' && (
            <div className="space-y-6">
              {/* Status & Damage Level */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border ${getDamageColor(reportData.damage_level)}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">Tingkat Kerusakan</span>
                  </div>
                  <p className="text-lg font-bold capitalize">{reportData.damage_level}</p>
                </div>
                <div className={`p-4 rounded-xl border ${getStatusColor(reportData.status)}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(reportData.status)}
                    <span className="text-sm font-medium">Status</span>
                  </div>
                  <p className="text-lg font-bold capitalize">{reportData.status?.replace('_', ' ')}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Deskripsi</label>
                <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                  <p className="text-gray-200">{reportData.description || '-'}</p>
                </div>
              </div>

              {/* Mini Map */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Lokasi</label>
                <div className="bg-gray-700/50 border border-gray-600 rounded-lg overflow-hidden">
                  <div id="mini-map-container" style={{ height: '250px', width: '100%' }}></div>
                  <div className="p-3 bg-gray-700/50 border-t border-gray-600">
                    <div className="flex items-center gap-2 text-gray-200">
                      <MapPin className="w-4 h-4 text-orange-500" />
                      <div>
                        <p className="font-medium text-sm">Latitude: {reportData.location_lat || '-'}</p>
                        <p className="font-medium text-sm">Longitude: {reportData.location_lng || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Asset Info */}
              {reportData.asset_name && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Aset Terkait</label>
                  <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                    <p className="text-white font-medium">{reportData.asset_name}</p>
                    <p className="text-gray-400 text-sm mt-1">{reportData.asset_code || '-'}</p>
                  </div>
                </div>
              )}

              {/* Photo */}
              {reportData.photo_before && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Foto Kerusakan</label>
                  <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                    <img
                      src={reportData.photo_before}
                      alt="Foto Kerusakan"
                      className="w-full h-auto rounded-lg object-cover max-h-64"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Reporter Info */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Pelapor</label>
                <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                  <p className="text-white font-medium">{reportData.reporter_name || '-'}</p>
                  <p className="text-gray-400 text-sm mt-1">{reportData.reporter_phone || '-'}</p>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tanggal Laporan</label>
                <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                  <p className="text-gray-200">
                    {reportData.reported_at ? new Date(reportData.reported_at).toLocaleString('id-ID', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : '-'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tindak-lanjut' && (
            <div className="space-y-6">
              {/* Current Status */}
              <div className={`p-4 rounded-xl border ${getStatusColor(reportData.status)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(reportData.status)}
                    <span className="text-lg font-bold capitalize">{reportData.status?.replace('_', ' ')}</span>
                  </div>
                  <span className="text-sm text-gray-400">
                    {new Date(reportData.reported_at).toLocaleDateString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              {(reportData.status === 'diproses' || reportData.status === 'dalam_perbaikan') && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Progress Perbaikan</label>
                  <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                    <div className="w-full bg-gray-600 rounded-full h-4 mb-3">
                      <div
                        className="bg-gradient-to-r from-orange-500 to-orange-600 h-4 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between gap-2">
                      {[0, 25, 50, 75, 100].map((p) => (
                        <button
                          key={p}
                          onClick={() => updateProgress(p)}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                            progress === p
                              ? 'bg-orange-600 text-white'
                              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                          }`}
                        >
                          {p}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Process Form */}
              {showProcessForm && (
                <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4 space-y-4">
                  <h3 className="text-white font-semibold">Mulai Proses Perbaikan</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nama Petugas</label>
                    <input
                      type="text"
                      value={processForm.technician_name}
                      onChange={(e) => setProcessForm({...processForm, technician_name: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Masukkan nama petugas"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Catatan Teknisi</label>
                    <textarea
                      value={processForm.technician_notes}
                      onChange={(e) => setProcessForm({...processForm, technician_notes: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      rows="3"
                      placeholder="Catatan teknis..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Estimasi Waktu</label>
                    <input
                      type="text"
                      value={processForm.estimated_time}
                      onChange={(e) => setProcessForm({...processForm, estimated_time: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Contoh: 2 jam, 1 hari, dll"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowProcessForm(false)}
                      className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => updateStatus('diproses', processForm)}
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Memproses...' : 'Proses'}
                    </button>
                  </div>
                </div>
              )}

              {/* Reject Form */}
              {showRejectForm && (
                <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4 space-y-4">
                  <h3 className="text-white font-semibold">Tolak Laporan</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Alasan Penolakan</label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      rows="3"
                      placeholder="Jelaskan alasan penolakan..."
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowRejectForm(false)}
                      className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => updateStatus('ditolak', { rejection_reason: rejectReason })}
                      disabled={loading || !rejectReason}
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Memproses...' : 'Tolak'}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {reportData.status === 'pending' && (
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowProcessForm(true)}
                    className="flex-1 min-w-[200px] px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <PlayCircle className="w-5 h-5" />
                    Proses Perbaikan
                  </button>
                  <button
                    onClick={() => setShowRejectForm(true)}
                    className="flex-1 min-w-[200px] px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-5 h-5" />
                    Tolak Laporan
                  </button>
                </div>
              )}

              {(reportData.status === 'diproses' || reportData.status === 'dalam_perbaikan') && (
                <div className="flex gap-3">
                  <button
                    onClick={() => updateStatus('dalam_perbaikan')}
                    className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Wrench className="w-5 h-5" />
                    Mulai Perbaikan
                  </button>
                  {progress === 100 && (
                    <button
                      onClick={() => updateStatus('selesai')}
                      className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Selesaikan Perbaikan
                    </button>
                  )}
                </div>
              )}

              {/* Technician Info */}
              {reportData.technician_name && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Informasi Petugas</label>
                  <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-200">{reportData.technician_name}</span>
                    </div>
                    {reportData.technician_notes && (
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-gray-400 mt-1" />
                        <span className="text-gray-200">{reportData.technician_notes}</span>
                      </div>
                    )}
                    {reportData.estimated_time && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-200">Estimasi: {reportData.estimated_time}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Rejection Reason */}
              {reportData.rejection_reason && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Alasan Penolakan</label>
                  <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                    <p className="text-red-400">{reportData.rejection_reason}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'riwayat' && (
            <div className="space-y-4">
              {activities.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Belum ada aktivitas</p>
                </div>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-orange-500" />
                      </div>
                      <div className="w-0.5 h-full bg-gray-700 mt-2"></div>
                    </div>
                    <div className="flex-1 pb-6">
                      <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-medium capitalize">{activity.activity_type?.replace('_', ' ')}</span>
                          <span className="text-gray-400 text-xs">
                            {new Date(activity.created_at).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <p className="text-gray-300">{activity.description}</p>
                        {activity.performer_name && (
                          <p className="text-gray-400 text-sm mt-2 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {activity.performer_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportDetailModal;
