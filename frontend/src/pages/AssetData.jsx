import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Download, Upload, FileText, Edit, Trash2, Filter } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { validateKMLFile, generateSampleKML } from '../utils/kmlParser';

const getCategoryDisplayName = (categoryName) => {
  if (!categoryName) return '-';
  return categoryName.toUpperCase()
    .replace(/PENGAWAS/g, 'CCTV')
    .replace(/KAMERA/g, 'CCTV')
    .replace(/PJU/g, 'LAMPU PJU');
};

const getGeometryType = (assetCode) => {
  if (!assetCode) return '-';
  if (assetCode.startsWith('KML-POLY-') || assetCode.startsWith('GEO-POLY-') || assetCode.startsWith('SHP-POLY-')) return '⬡ Polygon';
  if (assetCode.startsWith('KML-LINE-') || assetCode.startsWith('GEO-LINE-') || assetCode.startsWith('SHP-LINE-') || assetCode.startsWith('GPX-LINE-')) return '╌ LineString';
  if (assetCode.startsWith('KML-') || assetCode.startsWith('GEO-') || assetCode.startsWith('SHP-') || assetCode.startsWith('GPX-') || assetCode.startsWith('CSV-')) return '● Point';
  return '-';
};

const getCoordinates = (asset) => {
  const lat = asset.location_lat || '-';
  const lng = asset.location_lng || '-';
  if (lat === '-' || lng === '-') return '-';
  return `${lat}, ${lng}`;
};

const AssetData = () => {
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [editingAsset, setEditingAsset] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [importFile, setImportFile] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    category_id: '',
    condition_status: 'baik',
    sta: '',
    location_lat: '',
    location_lng: '',
    description: ''
  });
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

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

  const getAreaFromDescription = (description) => {
    try {
      const geo = JSON.parse(description);
      if (geo && geo.geometryType === 'Polygon' && geo.coordinates) {
        return formatArea(calculatePolygonArea(geo.coordinates));
      }
    } catch (_) {}
    return '-';
  };

  useEffect(() => {
    fetchAssets();
    fetchCategories();
  }, [page, category, condition, month, year]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const response = await api.get('/assets', {
        params: { search, category, condition, month, year, page, limit: 10 }
      });
      setAssets(response.data.data || []);
      setPagination(response.data.pagination || {});
    } catch (error) {
      console.error('Error fetching assets:', error);
      setAssets([]);
      setPagination({});
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/assets/categories/list');
      const allCategories = response.data.data || [];
      
      // Get unique categories from assets
      const responseAssets = await api.get('/assets', { params: { limit: 9999 } });
      const assetCategories = [...new Set(responseAssets.data.data?.map(a => a.category_name).filter(Boolean))];
      
      // Filter categories to only show those that have assets
      const categoriesWithAssets = allCategories.filter(cat => 
        assetCategories.includes(cat.name)
      );
      
      setCategories(categoriesWithAssets);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleDelete = async (id) => {
    console.log('[AssetData Delete] clicked for id:', id);
    if (!window.confirm('Yakin ingin menghapus aset ini?')) {
      console.log('[AssetData Delete] cancelled by user');
      return;
    }
    try {
      console.log('[AssetData Delete] calling API DELETE /assets/' + id);
      const res = await api.delete(`/assets/${id}`);
      console.log('[AssetData Delete] API success:', res.data);
      await fetchAssets();
      toast.success('Aset berhasil dihapus');
    } catch (error) {
      console.error('[AssetData Delete] error:', error);
      const msg = error.response?.data?.message || 'Gagal menghapus aset';
      toast.error(msg);
      alert('Gagal menghapus: ' + msg);
    }
  };

  const handleEditClick = (asset) => {
    setEditingAsset(asset.id);
    setEditForm({
      name: asset.name,
      category_id: asset.category_id,
      condition_status: asset.condition_status,
      sta: asset.sta || '',
      description: asset.description || '',
    });
  };

  const handleEditSave = async () => {
    try {
      await api.put(`/assets/${editingAsset.id}`, editForm);
      toast.success('Aset berhasil diperbarui');
      setEditingAsset(null);
      setEditForm({});
      fetchAssets();
    } catch (error) {
      console.error(error);
      toast.error('Gagal memperbarui aset');
    }
  };

  const handleAddSave = async () => {
    try {
      if (!addForm.name || !addForm.category_id) {
        toast.error('Nama dan jenis aset harus diisi');
        return;
      }
      const assetCode = `ASET-${Date.now()}`;
      await api.post('/assets', {
        ...addForm,
        asset_code: assetCode,
        ruas: 'Becakayu'
      });
      toast.success('Aset berhasil ditambahkan');
      setShowAddModal(false);
      setAddForm({
        name: '',
        category_id: '',
        condition_status: 'baik',
        sta: '',
        location_lat: '',
        location_lng: '',
        description: ''
      });
      fetchAssets();
    } catch (error) {
      console.error(error);
      toast.error('Gagal menambahkan aset');
    }
  };

  const handleCreateCategory = async () => {
    try {
      if (!newCategoryName.trim()) {
        toast.error('Nama jenis aset harus diisi');
        return;
      }
      const response = await api.post('/categories', { name: newCategoryName });
      const newCategory = response.data.data;
      setAddForm({ ...addForm, category_id: newCategory.id });
      setNewCategoryName('');
      setShowNewCategoryInput(false);
      fetchCategories();
      toast.success('Jenis aset berhasil ditambahkan');
    } catch (error) {
      console.error(error);
      toast.error('Gagal menambahkan jenis aset');
    }
  };

  const handleExport = async () => {
    try {
      // Try to fetch all data with current filters but without pagination
      const response = await api.get('/assets', {
        params: { search, category, condition, month, year, limit: 9999 }
      });
      
      const data = response.data.data || [];
      
      if (data.length === 0) {
        toast.error('Tidak ada data untuk diexport');
        return;
      }
      
      // Convert to CSV
      const headers = ['Kode', 'Nama Aset', 'Kategori', 'Lokasi', 'Kondisi', 'STA', 'Latitude', 'Longitude'];
      const csvContent = [
        headers.join(','),
        ...data.map(asset => [
          asset.asset_code || '',
          `"${asset.name || ''}"`,
          `"${asset.category_name || ''}"`,
          `"${asset.ruas || ''}"`,
          asset.condition_status || '',
          asset.sta || '',
          asset.location_lat || '',
          asset.location_lng || ''
        ].join(','))
      ].join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `data-aset-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Data aset berhasil diexport (${data.length} baris)`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Gagal mengexport data aset: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Pilih file untuk diimport');
      return;
    }
    
    console.log('Starting KML import process...');
    console.log('File details:', {
      name: importFile.name,
      size: importFile.size,
      type: importFile.type,
      lastModified: importFile.lastModified
    });
    
    // Check file extension
    const fileName = importFile.name.toLowerCase();
    if (!fileName.endsWith('.kml') && !fileName.endsWith('.kmz')) {
      toast.error('File harus berformat .kml atau .kmz');
      return;
    }
    
    // For KMZ files, we need to extract the KML first
    if (fileName.endsWith('.kmz')) {
      toast.error('File KMZ belum didukung saat ini. Silakan extract dan upload file .kml');
      return;
    }
    
    // Try to validate KML file (optional - if it fails, still try to upload)
    let validation = null;
    try {
      console.log('Validating KML file...');
      validation = await validateKMLFile(importFile);
      console.log('KML Validation Result:', validation);
    } catch (validationError) {
      console.warn('KML validation failed, but will try to upload anyway:', validationError);
      validation = { valid: false, error: validationError.message };
    }
    
    if (validation && validation.valid) {
      // Log successful validation with detailed summary
      const summary = validation.data.summary;
      console.log('KML Validation Successful:', {
        fileName: validation.debug.fileName,
        placemarksFound: validation.debug.placemarksFound,
        groundOverlaysFound: validation.debug.groundOverlaysFound,
        validGeometries: validation.debug.validGeometries,
        summary: summary,
        layerName: validation.data?.layerName
      });
      
      toast.success(`KML valid: ${summary.points} Point, ${summary.lineStrings} LineString, ${summary.polygons} Polygon. Mengupload...`);
    } else {
      // Validation failed, but try to upload anyway
      console.warn('KML validation failed or skipped, attempting upload to backend');
      toast('Validasi KML dilewati, mencoba upload ke backend...');
    }
    
    const formData = new FormData();
    formData.append('kmlFile', importFile);
    formData.append('layerName', validation?.data?.layerName || importFile.name.replace('.kml', '').replace('.KML', '').replace('.kmz', '').replace('.KMZ', ''));
    
    try {
      console.log('Uploading KML file to backend...');
      const response = await api.post('/assets/import-kml', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      console.log('Upload response:', response);
      
      setImportFile(null);
      fetchAssets();
      fetchCategories();
      toast.success('File KML berhasil diimport!');
    } catch (error) {
      console.error('Import error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error headers:', error.response?.headers);
      
      let errorMessage = 'Gagal mengimport file KML';
      if (error.response?.data?.message) {
        errorMessage += ': ' + error.response.data.message;
      } else if (error.message) {
        errorMessage += ': ' + error.message;
      }
      
      toast.error(errorMessage);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchAssets();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Data Aset</h1>
          <p className="text-gray-400 mt-1">Kelola data aset jalan tol</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Tambah Aset
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari aset..."
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Jenis Aset</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{getCategoryDisplayName(cat.name)}</option>
            ))}
          </select>

          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Semua Kondisi</option>
            <option value="baik">Baik</option>
            <option value="rusak_berat">Rusak</option>
            <option value="sedang_diperbaiki">Perbaikan</option>
            <option value="selesai_diperbaiki">Selesai Perbaikan</option>
          </select>

          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Semua Tahun</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2022">2022</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filter
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>

          <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-2">
            <Upload className="w-4 h-4" />
            {importFile ? importFile.name : 'Import KML'}
            <input
              type="file"
              accept=".kml,.KML,.kmz,.KMZ,.geojson,.json,.zip,.shp,.gpx,.csv"
              className="hidden"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            />
          </label>
          {importFile && (
            <button
              type="button"
              onClick={handleImport}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Upload
            </button>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                <th className="px-4 py-4">Kode</th>
                <th className="px-4 py-4">Nama Aset</th>
                <th className="px-4 py-4">Geometry</th>
                <th className="px-4 py-4">Layer</th>
                <th className="px-4 py-4">Koordinat</th>
                <th className="px-4 py-4">Luas Area</th>
                <th className="px-4 py-4">Upload</th>
                <th className="px-4 py-4">Kondisi</th>
                <th className="px-4 py-4">STA</th>
                <th className="px-4 py-4">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan="10" className="px-6 py-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  </td>
                </tr>
              ) : !assets || assets.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-6 py-8 text-center text-gray-400">
                    Tidak ada data aset
                  </td>
                </tr>
              ) : (
                assets.map((asset) => (
                  <tr key={asset.id} className="border-b border-gray-700/50 hover:bg-gray-700/50">
                    <td className="px-4 py-4 font-medium text-xs">{asset.asset_code}</td>
                    <td className="px-4 py-4 text-sm">{asset.name}</td>
                    <td className="px-4 py-4 text-sm">{getGeometryType(asset.asset_code)}</td>
                    <td className="px-4 py-4 text-sm">{getCategoryDisplayName(asset.category_name)}</td>
                    <td className="px-4 py-4 text-xs font-mono">{getCoordinates(asset)}</td>
                    <td className="px-4 py-4 text-xs font-medium">{getAreaFromDescription(asset.description)}</td>
                    <td className="px-4 py-4 text-xs">
                      {asset.created_at ? new Date(asset.created_at).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        asset.condition_status === 'baik' || asset.condition_status === 'selesai_diperbaiki' ? 'bg-green-500/20 text-green-400' :
                        asset.condition_status === 'rusak_ringan' || asset.condition_status === 'rusak_berat' ? 'bg-red-500/20 text-red-400' :
                        asset.condition_status === 'sedang_diperbaiki' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {asset.condition_status === 'baik' ? 'Baik' :
                         asset.condition_status === 'rusak_ringan' || asset.condition_status === 'rusak_berat' ? 'Rusak' :
                         asset.condition_status === 'sedang_diperbaiki' ? 'Perbaikan' :
                         asset.condition_status === 'selesai_diperbaiki' ? 'Selesai Perbaikan' :
                         asset.condition_status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm">{asset.sta || '-'}</td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditClick(asset)}
                          className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(asset.id)}
                          className="p-2 hover:bg-gray-600 rounded-lg transition-colors text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Halaman {pagination.page} dari {pagination.pages} ({pagination.total} total)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={pagination.page === 1}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingAsset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Edit Aset</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nama Aset</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Kategori</label>
                <select
                  value={editForm.category_id || ''}
                  onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{getCategoryDisplayName(cat.name)}</option>
                  ))}
                </select>
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
              <div>
                <label className="block text-sm text-gray-400 mb-1">Deskripsi</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleEditSave}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  Simpan
                </button>
                <button
                  onClick={() => setEditingAsset(null)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Tambah Aset</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nama Aset *</label>
                <input
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Masukkan nama aset"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Jenis Aset *</label>
                <select
                  value={addForm.category_id}
                  onChange={(e) => setAddForm({ ...addForm, category_id: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">Pilih jenis aset</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{getCategoryDisplayName(cat.name)}</option>
                  ))}
                </select>
                {!showNewCategoryInput ? (
                  <button
                    type="button"
                    onClick={() => setShowNewCategoryInput(true)}
                    className="mt-2 text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Buat jenis aset baru
                  </button>
                ) : (
                  <div className="mt-2 space-y-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Nama jenis aset baru"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && handleCreateCategory()}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCreateCategory}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                      >
                        Simpan
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewCategoryInput(false);
                          setNewCategoryName('');
                        }}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Kondisi</label>
                <select
                  value={addForm.condition_status}
                  onChange={(e) => setAddForm({ ...addForm, condition_status: e.target.value })}
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
                  value={addForm.sta}
                  onChange={(e) => setAddForm({ ...addForm, sta: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Contoh: 0+100"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={addForm.location_lat}
                    onChange={(e) => setAddForm({ ...addForm, location_lat: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="-6.2000"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={addForm.location_lng}
                    onChange={(e) => setAddForm({ ...addForm, location_lng: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="106.8000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Deskripsi</label>
                <textarea
                  value={addForm.description}
                  onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Deskripsi aset"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleAddSave}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  Simpan
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetData;
