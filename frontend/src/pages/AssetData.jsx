import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Download, Upload, FileText, Edit, Trash2, Filter, FileSpreadsheet, Link, Database } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { validateKMLFile, generateSampleKML } from '../utils/kmlParser';
import * as XLSX from 'xlsx';

// Neon color palette for legend
const NEON_COLORS = [
  '#06b6d4', // cyan
  '#10b981', // green
  '#8b5cf6', // purple
  '#f97316', // orange
  '#ec4899', // pink
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#ef4444', // red
  '#84cc16', // lime
];

// Generate random neon color
const generateNeonColor = (usedColors = []) => {
  const availableColors = NEON_COLORS.filter(color => !usedColors.includes(color));
  return availableColors.length > 0 
    ? availableColors[Math.floor(Math.random() * availableColors.length)]
    : NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
};

// Generate UUID v4
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

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
  const [excelImportFile, setExcelImportFile] = useState(null);
  const [showJoinTableModal, setShowJoinTableModal] = useState(false);
  const [joinTableFile, setJoinTableFile] = useState(null);
  const [joinTablePreview, setJoinTablePreview] = useState(null);
  const [isProcessingJoin, setIsProcessingJoin] = useState(false);
  const [newLayersInfo, setNewLayersInfo] = useState(null);

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
    setEditingAsset(asset);
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

  // Export Excel with proper formatting
  const handleExportExcel = async () => {
    try {
      const response = await api.get('/assets', {
        params: { search, category, condition, month, year, limit: 9999 }
      });
      
      const data = response.data.data || [];
      
      if (data.length === 0) {
        toast.error('Tidak ada data untuk diexport');
        return;
      }

      // Prepare data for Excel
      const excelData = data.map(asset => ({
        'Kode': asset.asset_code || '',
        'Nama Aset': asset.name || '',
        'Geometry': getGeometryType(asset.asset_code),
        'Layer': getCategoryDisplayName(asset.category_name),
        'Koordinat': getCoordinates(asset),
        'Luas Area': getAreaFromDescription(asset.description),
        'Upload': asset.created_at ? new Date(asset.created_at).toLocaleDateString('id-ID') : '',
        'Kondisi': asset.condition_status === 'baik' ? 'Baik' :
                   asset.condition_status === 'rusak_ringan' || asset.condition_status === 'rusak_berat' ? 'Rusak' :
                   asset.condition_status === 'sedang_diperbaiki' ? 'Perbaikan' :
                   asset.condition_status === 'selesai_diperbaiki' ? 'Selesai Perbaikan' :
                   asset.condition_status.replace('_', ' '),
        'STA': asset.sta || ''
      }));

      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      ws['!cols'] = [
        { wch: 20 }, // Kode
        { wch: 30 }, // Nama Aset
        { wch: 15 }, // Geometry
        { wch: 20 }, // Layer
        { wch: 25 }, // Koordinat
        { wch: 15 }, // Luas Area
        { wch: 15 }, // Upload
        { wch: 15 }, // Kondisi
        { wch: 15 }  // STA
      ];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Data Aset');

      // Add instruction sheet
      const instructionData = [
        { 'PETUNJUK UPLOAD EXCEL': '' },
        { '': '' },
        { '1. Download Template': 'Gunakan template yang tersedia untuk format yang benar' },
        { '2. Isi Data': 'Lengkapi semua kolom yang diperlukan' },
        { '3. Kode': 'Kode aset bersifat unik dan akan digunakan untuk update data' },
        { '4. Nama Aset': 'Nama aset yang jelas dan deskriptif' },
        { '5. Geometry': 'Pilih dari: Point, LineString, Polygon' },
        { '6. Layer': 'Pilih dari jenis aset yang tersedia' },
        { '7. Koordinat': 'Format: latitude, longitude (contoh: -6.2000, 106.8000)' },
        { '8. Luas Area': 'Format: angka dalam m² (contoh: 1000 m²)' },
        { '9. Kondisi': 'Pilih dari: Baik, Rusak, Perbaikan, Selesai Perbaikan' },
        { '10. STA': 'Format: angka (contoh: 0+100)' },
        { '': '' },
        { 'CATATAN PENTING': '' },
        { '-': 'Jangan ubah format header/kolom' },
        { '-': 'Kode yang sudah ada akan diupdate data yang lama' },
        { '-': 'Kode baru akan ditambahkan sebagai data baru' },
        { '-': 'Pastikan data valid sebelum upload' }
      ];
      const wsInstructions = XLSX.utils.json_to_sheet(instructionData);
      wsInstructions['!cols'] = [{ wch: 40 }, { wch: 60 }];
      XLSX.utils.book_append_sheet(wb, wsInstructions, 'Petunjuk Upload');

      // Generate and download
      XLSX.writeFile(wb, `data-aset-${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast.success(`Data aset berhasil diexport ke Excel (${data.length} baris)`);
    } catch (error) {
      console.error('Export Excel error:', error);
      toast.error('Gagal mengexport data aset ke Excel: ' + (error.response?.data?.message || error.message));
    }
  };

  // Download Template Excel
  const handleDownloadTemplate = () => {
    try {
      // Create template data with sample
      const templateData = [
        {
          'Kode': 'ASET-TEMPLATE-001',
          'Nama Aset': 'Contoh Aset',
          'Geometry': 'Point',
          'Layer': 'LAMPU PJU',
          'Koordinat': '-6.2000, 106.8000',
          'Luas Area': '0 m²',
          'Upload': '',
          'Kondisi': 'Baik',
          'STA': '0+100'
        },
        {
          'Kode': 'ASET-TEMPLATE-002',
          'Nama Aset': 'Contoh Aset 2',
          'Geometry': 'Polygon',
          'Layer': 'PERKERASAN',
          'Koordinat': '-6.2000, 106.8000',
          'Luas Area': '1000 m²',
          'Upload': '',
          'Kondisi': 'Rusak',
          'STA': '1+200'
        }
      ];

      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(templateData);

      // Set column widths
      ws['!cols'] = [
        { wch: 20 }, // Kode
        { wch: 30 }, // Nama Aset
        { wch: 15 }, // Geometry
        { wch: 20 }, // Layer
        { wch: 25 }, // Koordinat
        { wch: 15 }, // Luas Area
        { wch: 15 }, // Upload
        { wch: 15 }, // Kondisi
        { wch: 15 }  // STA
      ];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Data Aset');

      // Add instruction sheet
      const instructionData = [
        { 'PETUNJUK UPLOAD EXCEL': '' },
        { '': '' },
        { '1. Download Template': 'Gunakan template ini untuk format yang benar' },
        { '2. Isi Data': 'Lengkapi semua kolom yang diperlukan' },
        { '3. Kode': 'Kode aset bersifat unik dan akan digunakan untuk update data' },
        { '4. Nama Aset': 'Nama aset yang jelas dan deskriptif' },
        { '5. Geometry': 'Pilih dari: Point, LineString, Polygon' },
        { '6. Layer': 'Pilih dari jenis aset yang tersedia' },
        { '7. Koordinat': 'Format: latitude, longitude (contoh: -6.2000, 106.8000)' },
        { '8. Luas Area': 'Format: angka dalam m² (contoh: 1000 m²)' },
        { '9. Kondisi': 'Pilih dari: Baik, Rusak, Perbaikan, Selesai Perbaikan' },
        { '10. STA': 'Format: angka (contoh: 0+100)' },
        { '': '' },
        { 'CATATAN PENTING': '' },
        { '-': 'Jangan ubah format header/kolom' },
        { '-': 'Kode yang sudah ada akan diupdate data yang lama' },
        { '-': 'Kode baru akan ditambahkan sebagai data baru' },
        { '-': 'Pastikan data valid sebelum upload' },
        { '-': 'Hapus baris contoh ini sebelum upload data asli' },
        { '-': 'Perhatikan keterangan pada template untuk informasi lebih lanjut' }
      ];
      const wsInstructions = XLSX.utils.json_to_sheet(instructionData);
      wsInstructions['!cols'] = [{ wch: 40 }, { wch: 60 }];
      XLSX.utils.book_append_sheet(wb, wsInstructions, 'Petunjuk Upload');

      // Generate and download
      XLSX.writeFile(wb, `template-data-aset.xlsx`);
      
      toast.success('Template berhasil didownload');
    } catch (error) {
      console.error('Download template error:', error);
      toast.error('Gagal mendownload template: ' + error.message);
    }
  };

  // Import Excel with update logic
  const handleImportExcel = async () => {
    if (!excelImportFile) {
      toast.error('Pilih file Excel untuk diimport');
      return;
    }

    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Read first sheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          if (jsonData.length === 0) {
            toast.error('File Excel kosong');
            return;
          }

          // Process data for import
          const importResults = {
            success: 0,
            updated: 0,
            inserted: 0,
            failed: 0,
            errors: []
          };

          // Get existing assets for matching
          const existingAssetsResponse = await api.get('/assets', { params: { limit: 9999 } });
          const existingAssets = existingAssetsResponse.data.data || [];
          const existingCodes = new Set(existingAssets.map(a => a.asset_code));

          for (const row of jsonData) {
            try {
              const kode = row['Kode'] || row['kode'];
              const namaAset = row['Nama Aset'] || row['nama_aset'] || row['Nama Aset'];
              
              if (!kode || !namaAset) {
                importResults.failed++;
                importResults.errors.push(`Baris tanpa Kode atau Nama Aset: ${JSON.stringify(row)}`);
                continue;
              }

              // Map condition status
              const kondisi = row['Kondisi'] || row['kondisi'] || '';
              let conditionStatus = 'baik';
              if (kondisi.toLowerCase().includes('rusak')) {
                conditionStatus = 'rusak_berat';
              } else if (kondisi.toLowerCase().includes('perbaikan')) {
                conditionStatus = 'sedang_diperbaiki';
              } else if (kondisi.toLowerCase().includes('selesai')) {
                conditionStatus = 'selesai_diperbaiki';
              }

              // Parse coordinates
              const koordinat = row['Koordinat'] || row['koordinat'] || '';
              let lat = '', lng = '';
              if (koordinat && koordinat.includes(',')) {
                const coords = koordinat.split(',').map(c => c.trim());
                lat = coords[0];
                lng = coords[1];
              }

              // Find category ID by name
              const layer = row['Layer'] || row['layer'] || '';
              let categoryId = '';
              if (layer) {
                const categoryMatch = categories.find(cat => 
                  cat.name.toLowerCase().includes(layer.toLowerCase()) ||
                  layer.toLowerCase().includes(cat.name.toLowerCase())
                );
                if (categoryMatch) {
                  categoryId = categoryMatch.id;
                }
              }

              const assetData = {
                name: namaAset,
                category_id: categoryId,
                condition_status: conditionStatus,
                sta: row['STA'] || row['sta'] || '',
                location_lat: lat,
                location_lng: lng,
                description: row['Luas Area'] ? JSON.stringify({
                  geometryType: row['Geometry'] || 'Point',
                  area: row['Luas Area']
                }) : ''
              };

              if (existingCodes.has(kode)) {
                // Update existing
                const existingAsset = existingAssets.find(a => a.asset_code === kode);
                await api.put(`/assets/${existingAsset.id}`, assetData);
                importResults.updated++;
              } else {
                // Insert new
                await api.post('/assets', {
                  ...assetData,
                  asset_code: kode,
                  ruas: 'Becakayu'
                });
                importResults.inserted++;
              }
              
              importResults.success++;
            } catch (error) {
              importResults.failed++;
              importResults.errors.push(`Error pada baris: ${JSON.stringify(row)} - ${error.message}`);
            }
          }

          // Show results
          const message = `Import Excel selesai:\n✅ Berhasil: ${importResults.success}\n🔄 Update: ${importResults.updated}\n➕ Insert: ${importResults.inserted}\n❌ Gagal: ${importResults.failed}`;
          toast.success(message);
          
          if (importResults.errors.length > 0) {
            console.error('Import errors:', importResults.errors);
            alert(`${message}\n\nError details:\n${importResults.errors.join('\n')}`);
          }

          // Refresh data
          fetchAssets();
          fetchCategories();
          setExcelImportFile(null);
        } catch (error) {
          console.error('Error processing Excel file:', error);
          toast.error('Gagal memproses file Excel: ' + error.message);
        }
      };

      reader.onerror = () => {
        toast.error('Gagal membaca file Excel');
      };

      reader.readAsArrayBuffer(excelImportFile);
    } catch (error) {
      console.error('Import Excel error:', error);
      toast.error('Gagal mengimport file Excel: ' + error.message);
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

  // Process Join Table - Parse file and show preview
  const handleProcessJoinTable = async () => {
    if (!joinTableFile) {
      toast.error('Pilih file Excel/CSV untuk diproses');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (joinTableFile.size > maxSize) {
      toast.error('Ukuran file maksimal 10MB');
      return;
    }

    // Validate file type
    const fileName = joinTableFile.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv')) {
      toast.error('File harus berformat .xlsx, .xls, atau .csv');
      return;
    }

    setIsProcessingJoin(true);

    try {
      let jsonData = [];
      
      if (fileName.endsWith('.csv')) {
        // Parse CSV
        const text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = (e) => reject(e);
          reader.readAsText(joinTableFile);
        });
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const row = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx] || '';
          });
          jsonData.push(row);
        }
      } else {
        // Parse Excel
        const data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = (e) => reject(e);
          reader.readAsArrayBuffer(joinTableFile);
        });
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        jsonData = XLSX.utils.sheet_to_json(worksheet);
      }

      if (jsonData.length === 0) {
        toast.error('File kosong');
        setIsProcessingJoin(false);
        return;
      }

      // Get existing assets for matching
      const existingAssetsResponse = await api.get('/assets', { params: { limit: 9999 } });
      const existingAssets = existingAssetsResponse.data.data || [];
      const existingCodes = new Set(existingAssets.map(a => a.asset_code));

      console.log('[Join Table] Existing assets count:', existingAssets.length);

      // Detect unique layers from the file (use EXACT names, no modification)
      const fileLayers = new Set();
      jsonData.forEach(row => {
        const layer = row['Layer'] || row['layer'] || '';
        if (layer) {
          fileLayers.add(layer); // Keep EXACT name
        }
      });

      // Get existing category names
      const existingCategoryNames = new Set(categories.map(c => c.name));
      
      // Detect new layers
      const newLayers = Array.from(fileLayers).filter(layer => !existingCategoryNames.has(layer));
      
      // Assign neon colors to new layers
      const usedColors = categories.map(c => c.color || '#06b6d4').filter(Boolean);
      const newLayersWithColors = newLayers.map(layer => ({
        name: layer,
        color: generateNeonColor(usedColors)
      }));

      console.log('[Join Table] File layers:', Array.from(fileLayers));
      console.log('[Join Table] Existing categories:', Array.from(existingCategoryNames));
      console.log('[Join Table] New layers to create:', newLayersWithColors);

      // Set new layers info
      setNewLayersInfo({
        newLayers: newLayersWithColors,
        totalNewLayers: newLayersWithColors.length,
        existingLayers: Array.from(fileLayers).filter(layer => existingCategoryNames.has(layer))
      });

      // Check if codes are unique in the uploaded file
      const codeCounts = new Map();
      jsonData.forEach(row => {
        const kode = row['Kode'] || row['kode'] || row['Code'] || row['code'];
        if (kode) {
          codeCounts.set(kode, (codeCounts.get(kode) || 0) + 1);
        }
      });

      const hasDuplicateCodes = Array.from(codeCounts.values()).some(count => count > 1);
      
      console.log('[Join Table] Has duplicate codes:', hasDuplicateCodes);

      // Count statistics
      let newCount = 0;
      let updateCount = 0;
      let failedCount = 0;
      let markerCount = 0;
      let polygonCount = 0;

      jsonData.forEach(row => {
        const kode = row['Kode'] || row['kode'] || row['Code'] || row['code'];
        if (!kode) {
          failedCount++;
          return;
        }
        
        const geometry = row['Geometry'] || row['geometry'] || '';
        if (geometry && geometry.toLowerCase().includes('polygon')) {
          polygonCount++;
        } else {
          markerCount++;
        }
        
        if (existingCodes.has(kode)) {
          updateCount++;
        } else {
          newCount++;
        }
      });

      // Auto-detect field mapping
      const headers = Object.keys(jsonData[0]);
      const fieldMapping = [
        { source: 'Kode', target: 'asset_code' },
        { source: 'Nama Aset', target: 'name' },
        { source: 'Geometry', target: 'geometry_type' },
        { source: 'Layer', target: 'category_name' },
        { source: 'Koordinat', target: 'coordinates' },
        { source: 'Luas Area', target: 'area' },
        { source: 'Kondisi', target: 'condition_status' },
        { source: 'STA', target: 'sta' }
      ];

      // Auto-detect similar column names
      const detectedMapping = fieldMapping.map(mapping => {
        const matchedHeader = headers.find(h => 
          h.toLowerCase().includes(mapping.source.toLowerCase()) ||
          mapping.source.toLowerCase().includes(h.toLowerCase())
        );
        return {
          source: matchedHeader || mapping.source,
          target: mapping.target
        };
      }).filter(m => headers.includes(m.source));

      // Set preview
      setJoinTablePreview({
        total: jsonData.length,
        new: newCount,
        updated: updateCount,
        failed: failedCount,
        mapping: detectedMapping,
        headers: headers,
        previewData: jsonData.slice(0, 5),
        markerCount,
        polygonCount,
        newLayersInfo: {
          newLayers: newLayersWithColors,
          totalNewLayers: newLayersWithColors.length,
          existingLayers: Array.from(fileLayers).filter(layer => existingCategoryNames.has(layer))
        }
      });

      toast.success('File berhasil diproses. Silakan review preview sebelum menyimpan.');
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Gagal memproses file: ' + error.message);
    } finally {
      setIsProcessingJoin(false);
    }
  };

  // Execute Join Table - Save data to backend
  const handleExecuteJoinTable = async () => {
    if (!joinTableFile || !joinTablePreview) {
      toast.error('Tidak ada data untuk disimpan');
      return;
    }

    setIsProcessingJoin(true);

    try {
      let jsonData = [];
      const fileName = joinTableFile.name.toLowerCase();
      
      if (fileName.endsWith('.csv')) {
        const text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = (e) => reject(e);
          reader.readAsText(joinTableFile);
        });
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const row = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx] || '';
          });
          jsonData.push(row);
        }
      } else {
        const data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = (e) => reject(e);
          reader.readAsArrayBuffer(joinTableFile);
        });
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        jsonData = XLSX.utils.sheet_to_json(worksheet);
      }

      console.log('[Join Table] Total rows to process:', jsonData.length);
      console.log('[Join Table] Sample data:', jsonData.slice(0, 2));

      // Get existing assets
      const existingAssetsResponse = await api.get('/assets', { params: { limit: 9999 } });
      const existingAssets = existingAssetsResponse.data.data || [];
      const existingCodes = new Map(existingAssets.map(a => [a.asset_code, a]));

      console.log('[Join Table] Existing assets count:', existingAssets.length);

      // Create new categories with assigned colors
      const createdCategories = new Map();
      if (newLayersInfo && newLayersInfo.newLayers.length > 0) {
        for (const layerInfo of newLayersInfo.newLayers) {
          try {
            console.log(`[Join Table] Creating new category: ${layerInfo.name} with color ${layerInfo.color}`);
            const categoryResponse = await api.post('/assets/categories/create', { 
              name: layerInfo.name,
              color: layerInfo.color
            });
            createdCategories.set(layerInfo.name, categoryResponse.data.data.id);
            console.log(`[Join Table] Category created successfully: ${categoryResponse.data.data.id}`);
          } catch (catError) {
            console.error(`[Join Table] Failed to create category ${layerInfo.name}:`, catError);
          }
        }
        // Refresh categories after creating new ones
        await fetchCategories();
      }

      // Re-fetch categories to get the latest data
      const categoriesResponse = await api.get('/assets/categories/list');
      const updatedCategories = categoriesResponse.data.data || [];

      let successCount = 0;
      let updateCount = 0;
      let insertCount = 0;
      let failedCount = 0;
      const errors = [];

      for (let i = 0; i < jsonData.length; i++) {
        try {
          const row = jsonData[i];
          let kode = row['Kode'] || row['kode'] || row['Code'] || row['code'];
          const namaAset = row['Nama Aset'] || row['nama_aset'] || row['Nama Aset'];
          const layer = row['Layer'] || row['layer'] || '';
          
          if (!namaAset) {
            failedCount++;
            errors.push(`Baris ${i + 1}: Nama Aset wajib diisi`);
            continue;
          }

          // Use EXACT layer name from file (no modification)
          if (!layer) {
            failedCount++;
            errors.push(`Baris ${i + 1}: Layer wajib diisi`);
            continue;
          }

          // Find category ID by EXACT name match (case-insensitive)
          let categoryId = '';
          const categoryMatch = updatedCategories.find(cat => 
            cat.name.toLowerCase() === layer.toLowerCase()
          );
          
          if (categoryMatch) {
            categoryId = categoryMatch.id;
          } else if (createdCategories.has(layer)) {
            categoryId = createdCategories.get(layer);
          } else {
            // Try to create category on-the-fly if not found
            try {
              console.log(`[Join Table] Category not found, creating: ${layer}`);
              const neonColor = generateNeonColor(updatedCategories.map(c => c.color));
              const categoryResponse = await api.post('/assets/categories/create', { 
                name: layer,
                color: neonColor
              });
              categoryId = categoryResponse.data.data.id;
              createdCategories.set(layer, categoryId);
              console.log(`[Join Table] Category created on-the-fly: ${categoryId}`);
            } catch (catError) {
              console.error(`[Join Table] Failed to create category ${layer}:`, catError);
              // Use first available category as last resort
              if (updatedCategories.length > 0) {
                categoryId = updatedCategories[0].id;
                console.log(`[Join Table] Using fallback category: ${updatedCategories[0].name}`);
              } else {
                failedCount++;
                errors.push(`Baris ${i + 1}: Kategori tidak ditemukan dan tidak dapat dibuat: ${layer}`);
                continue;
              }
            }
          }

          // Generate unique code using UUID if kode is not provided
          if (!kode) {
            kode = generateUUID();
          }

          // Map condition status
          const kondisi = row['Kondisi'] || row['kondisi'] || '';
          let conditionStatus = 'baik';
          if (kondisi.toLowerCase().includes('rusak')) {
            conditionStatus = 'rusak_berat';
          } else if (kondisi.toLowerCase().includes('perbaikan')) {
            conditionStatus = 'sedang_diperbaiki';
          } else if (kondisi.toLowerCase().includes('selesai')) {
            conditionStatus = 'selesai_diperbaiki';
          }

          // Parse coordinates
          const koordinat = row['Koordinat'] || row['koordinat'] || '';
          let lat = '', lng = '';
          if (koordinat && koordinat.includes(',')) {
            const coords = koordinat.split(',').map(c => c.trim());
            lat = coords[0];
            lng = coords[1];
          }

          const assetData = {
            name: namaAset,
            category_id: categoryId,
            condition_status: conditionStatus,
            sta: row['STA'] || row['sta'] || '',
            location_lat: lat,
            location_lng: lng,
            description: row['Luas Area'] ? JSON.stringify({
              geometryType: row['Geometry'] || 'Point',
              area: row['Luas Area']
            }) : ''
          };

          console.log(`[Join Table] Processing row ${i + 1}:`, {
            kode,
            namaAset,
            categoryId,
            layer,
            conditionStatus
          });

          if (existingCodes.has(kode)) {
            // Update existing
            const existingAsset = existingCodes.get(kode);
            console.log(`[Join Table] Updating existing asset: ${existingAsset.id}`);
            console.log(`[Join Table] Update data:`, assetData);
            await api.put(`/assets/${existingAsset.id}`, assetData);
            updateCount++;
          } else {
            // Insert new - ALWAYS create new, never overwrite
            console.log(`[Join Table] Inserting new asset with code: ${kode}`);
            const insertData = {
              ...assetData,
              asset_code: kode,
              ruas: 'Becakayu'
            };
            console.log(`[Join Table] Insert data:`, insertData);
            const response = await api.post('/assets', insertData);
            console.log(`[Join Table] Insert response:`, response.data);
            insertCount++;
          }
          
          successCount++;
        } catch (error) {
          failedCount++;
          console.error(`[Join Table] Error on row ${i + 1}:`, error);
          console.error(`[Join Table] Error response:`, error.response?.data);
          
          let errorMessage = error.response?.data?.message || error.message || 'Unknown error';
          if (error.response?.data?.errors) {
            errorMessage += ` - ${JSON.stringify(error.response.data.errors)}`;
          }
          if (error.response?.status) {
            errorMessage += ` (Status: ${error.response.status})`;
          }
          errors.push(`Baris ${i + 1}: ${errorMessage}`);
        }
      }

      // Show results
      const message = `Join Table selesai:\n✅ Berhasil: ${successCount}\n🔄 Update: ${updateCount}\n➕ Insert: ${insertCount}\n❌ Gagal: ${failedCount}\n\n📊 Layer Baru: ${newLayersInfo?.totalNewLayers || 0}`;
      
      if (successCount > 0) {
        toast.success(message);
      } else {
        toast.error('Semua data gagal diproses. Cek console browser untuk detail error.');
      }
      
      if (errors.length > 0) {
        console.error('[Join Table] All errors:', errors);
        alert(`${message}\n\nError details:\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? '\n...' : ''}`);
      }

      // Close modal and refresh data
      setShowJoinTableModal(false);
      setJoinTableFile(null);
      setJoinTablePreview(null);
      setNewLayersInfo(null);
      fetchAssets();
      fetchCategories();
    } catch (error) {
      console.error('[Join Table] Fatal error:', error);
      toast.error('Gagal menyimpan data: ' + error.message);
    } finally {
      setIsProcessingJoin(false);
    }
  };
  // Get unique categories (case-insensitive) to avoid duplicates
  const uniqueCategories = categories.reduce((acc, cat) => {
    const existingIndex = acc.findIndex(c => c.name.toLowerCase().trim() === cat.name.toLowerCase().trim());
    if (existingIndex === -1) {
      acc.push(cat);
    }
    return acc;
  }, []);

  // Sort categories alphabetically
  const sortedCategories = uniqueCategories.sort((a, b) => 
    a.name.toLowerCase().trim().localeCompare(b.name.toLowerCase().trim())
  );

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
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-[260px] overflow-y-auto"
            style={{
              maxHeight: '260px',
              scrollbarWidth: 'thin',
              scrollbarColor: '#06b6d4 #1f2937'
            }}
          >
            <option value="">Semua Jenis Aset</option>
            {sortedCategories.map(cat => (
              <option 
                key={cat.id} 
                value={cat.id}
                className="hover:bg-cyan-500/20 hover:text-cyan-400 transition-colors"
              >
                {cat.name}
              </option>
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
            Export CSV
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Download Template
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

          <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            {excelImportFile ? excelImportFile.name : 'Import Excel'}
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => setExcelImportFile(e.target.files?.[0] || null)}
            />
          </label>

          <button
            type="button"
            onClick={() => setShowJoinTableModal(true)}
            className="px-4 py-2 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
              boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #22d3ee, #06b6d4)';
              e.currentTarget.style.boxShadow = '0 0 25px rgba(6, 182, 212, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #06b6d4, #0891b2)';
              e.currentTarget.style.boxShadow = '0 0 15px rgba(6, 182, 212, 0.4)';
            }}
          >
            <Database className="w-4 h-4" />
            Join Table
          </button>
          {excelImportFile && (
            <button
              type="button"
              onClick={handleImportExcel}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Upload Excel
            </button>
          )}
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
                    <td className="px-4 py-4 text-sm">{asset.category_name}</td>
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

      {/* Join Table Modal */}
      {showJoinTableModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="bg-gray-900 border border-cyan-500/30 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            style={{
              boxShadow: '0 0 40px rgba(6, 182, 212, 0.2)',
            }}
          >
            <div className="p-6 border-b border-cyan-500/20 bg-gray-900 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database className="w-6 h-6 text-cyan-400" />
                  <h3 className="text-xl font-bold text-white">Join Table Otomatis</h3>
                </div>
                <button
                  onClick={() => {
                    setShowJoinTableModal(false);
                    setJoinTableFile(null);
                    setJoinTablePreview(null);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
              <p className="text-gray-400 text-sm mt-2">
                Upload file Excel/CSV untuk melakukan JOIN TABLE otomatis dengan data aset yang sudah ada.
              </p>
            </div>

            <div className="p-6 overflow-y-auto">
              {!joinTablePreview ? (
                <>
                  {/* File Upload Section */}
                  <div className="mb-6">
                    <label className="block text-sm text-gray-300 mb-3 font-medium">
                      Pilih File Excel/CSV
                    </label>
                    <div
                      className="border-2 border-dashed border-cyan-500/30 rounded-xl p-8 text-center hover:border-cyan-500/60 transition-colors cursor-pointer"
                      onClick={() => document.getElementById('joinTableFileInput').click()}
                    >
                      <Database className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
                      <p className="text-white font-medium mb-1">
                        {joinTableFile ? joinTableFile.name : 'Klik untuk upload file'}
                      </p>
                      <p className="text-gray-400 text-sm">
                        Format: .xlsx, .xls, .csv (Maksimal 10MB)
                      </p>
                    </div>
                    <input
                      id="joinTableFileInput"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(e) => setJoinTableFile(e.target.files?.[0] || null)}
                    />
                  </div>

                  {/* Instructions */}
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-cyan-500/20">
                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-cyan-400" />
                      Petunjuk Penggunaan
                    </h4>
                    <ul className="text-gray-400 text-sm space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400 mt-1">•</span>
                        <span>File harus memiliki kolom "Kode" atau "Nama Aset" untuk pencocokan</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400 mt-1">•</span>
                        <span>Jika kode sama dengan data yang sudah ada, data akan diupdate</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400 mt-1">•</span>
                        <span>Jika kode baru, data akan ditambahkan sebagai data baru</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400 mt-1">•</span>
                        <span>Sistem otomatis mendeteksi dan memetakan kolom yang mirip</span>
                      </li>
                    </ul>
                  </div>

                  {/* Process Button */}
                  {joinTableFile && (
                    <button
                      onClick={handleProcessJoinTable}
                      disabled={isProcessingJoin}
                      className="w-full mt-6 px-4 py-3 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                        boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)',
                      }}
                    >
                      {isProcessingJoin ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Memproses...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <Link className="w-5 h-5" />
                          Proses Join Table
                        </span>
                      )}
                    </button>
                  )}
                </>
              ) : (
                <>
                  {/* Preview Section */}
                  <div className="space-y-6">
                    {/* Statistics */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-cyan-500/20">
                        <p className="text-gray-400 text-sm mb-1">Total Data</p>
                        <p className="text-2xl font-bold text-white">{joinTablePreview.total}</p>
                      </div>
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-green-500/20">
                        <p className="text-gray-400 text-sm mb-1">Data Baru</p>
                        <p className="text-2xl font-bold text-green-400">{joinTablePreview.new}</p>
                      </div>
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-blue-500/20">
                        <p className="text-gray-400 text-sm mb-1">Data Update</p>
                        <p className="text-2xl font-bold text-blue-400">{joinTablePreview.updated}</p>
                      </div>
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-purple-500/20">
                        <p className="text-gray-400 text-sm mb-1">Layer Baru</p>
                        <p className="text-2xl font-bold text-purple-400">{joinTablePreview.newLayersInfo?.totalNewLayers || 0}</p>
                      </div>
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-red-500/20">
                        <p className="text-gray-400 text-sm mb-1">Data Gagal</p>
                        <p className="text-2xl font-bold text-red-400">{joinTablePreview.failed}</p>
                      </div>
                    </div>

                    {/* New Layers Info */}
                    {joinTablePreview.newLayersInfo?.newLayers && joinTablePreview.newLayersInfo.newLayers.length > 0 && (
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-purple-500/20">
                        <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                          <Database className="w-4 h-4 text-purple-400" />
                          Layer Baru yang Akan Dibuat
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {joinTablePreview.newLayersInfo.newLayers.map((layer, idx) => (
                            <div key={idx} className="flex items-center gap-3 bg-gray-900/50 rounded-lg p-3">
                              <div 
                                className="w-4 h-4 rounded-full"
                                style={{ 
                                  backgroundColor: layer.color,
                                  boxShadow: `0 0 10px ${layer.color}`
                                }}
                              />
                              <span className="text-white font-medium">{layer.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Marker & Polygon Count */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-cyan-500/20">
                        <p className="text-gray-400 text-sm mb-1">Jumlah Marker (Point)</p>
                        <p className="text-2xl font-bold text-cyan-400">{joinTablePreview.markerCount || 0}</p>
                      </div>
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-pink-500/20">
                        <p className="text-gray-400 text-sm mb-1">Jumlah Polygon (Area)</p>
                        <p className="text-2xl font-bold text-pink-400">{joinTablePreview.polygonCount || 0}</p>
                      </div>
                    </div>

                    {/* Field Mapping */}
                    <div className="bg-gray-800/50 rounded-xl p-4 border border-cyan-500/20">
                      <h4 className="text-white font-medium mb-3">Pemetaan Kolom</h4>
                      <div className="space-y-2">
                        {joinTablePreview.mapping.map((map, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">{map.source}</span>
                            <Link className="w-4 h-4 text-cyan-400" />
                            <span className="text-white font-medium">{map.target}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Preview Table */}
                    <div className="bg-gray-800/50 rounded-xl p-4 border border-cyan-500/20 overflow-x-auto">
                      <h4 className="text-white font-medium mb-3">Preview Data (5 Baris Pertama)</h4>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-400 border-b border-gray-700">
                            {joinTablePreview.headers.map((header, idx) => (
                              <th key={idx} className="pb-2 pr-4">{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {joinTablePreview.previewData.map((row, rowIdx) => (
                            <tr key={rowIdx} className="border-b border-gray-700/50">
                              {joinTablePreview.headers.map((header, colIdx) => (
                                <td key={colIdx} className="py-2 pr-4 text-gray-300">
                                  {row[header] || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleExecuteJoinTable}
                        disabled={isProcessingJoin}
                        className="flex-1 px-4 py-3 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                          boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)',
                        }}
                      >
                        {isProcessingJoin ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Menyimpan...
                          </span>
                        ) : (
                          'Konfirmasi & Simpan'
                        )}
                      </button>
                      <button
                        onClick={() => setJoinTablePreview(null)}
                        className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetData;
