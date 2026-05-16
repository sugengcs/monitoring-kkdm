import { useState, useEffect } from 'react';
import { 
  MapPinned, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Search,
  Filter,
  ChevronRight,
  Eye,
  Download,
  Upload,
  FileText,
  Trash2
} from 'lucide-react';
import api from '../utils/api';

const ProgressLahan = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [lahanData, setLahanData] = useState([]);

  // Fetch data from API on mount
  useEffect(() => {
    fetchProgressLahan();
  }, []);

  const fetchProgressLahan = async () => {
    try {
      setLoading(true);
      const response = await api.get('/progress-lahan');
      if (response.data.success) {
        // Convert numeric values to formatted strings
        const formattedData = response.data.data.map(item => ({
          ...item,
          kebutuhan: item.kebutuhan ? item.kebutuhan.toLocaleString('en-US') : '0',
          realisasi: item.realisasi ? item.realisasi.toLocaleString('en-US') : '0',
          sisa: item.sisa ? item.sisa.toLocaleString('en-US') : '0'
        }));
        setLahanData(formattedData);
        console.log('Progress lahan data loaded:', formattedData.length, 'records');
      } else {
        console.error('Failed to fetch progress lahan:', response.data.message);
      }
    } catch (error) {
      console.error('Error fetching progress lahan:', error);
    } finally {
      setLoading(false);
    }
  };

  // Stats
  const totalLahan = lahanData.length;
  const totalKebutuhan = lahanData.reduce((sum, item) => {
    const val = parseFloat(item.kebutuhan.replace(/,/g, '')) || 0;
    return sum + val;
  }, 0);
  const totalRealisasi = lahanData.reduce((sum, item) => {
    const val = parseFloat(item.realisasi.replace(/,/g, '')) || 0;
    return sum + val;
  }, 0);
  const totalSisa = lahanData.reduce((sum, item) => {
    const val = parseFloat(item.sisa.replace(/,/g, '')) || 0;
    return sum + val;
  }, 0);
  const progressPersen = totalKebutuhan > 0 ? ((totalRealisasi / totalKebutuhan) * 100).toFixed(2) : '0.00';
  const sisaPersen = totalKebutuhan > 0 ? ((totalSisa / totalKebutuhan) * 100).toFixed(2) : '0.00';

  // Format number with comma separator
  const formatNumber = (num) => {
    // If already a string with commas, return as is
    if (typeof num === 'string' && num.includes(',')) {
      return num;
    }
    // If number, format with commas
    const numericValue = parseFloat(num.toString().replace(/,/g, '')) || 0;
    return numericValue.toLocaleString('en-US');
  };

  // Filtered data
  const filteredData = lahanData.filter(item => {
    const matchesSearch = !searchQuery || 
      item.lokasi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.keterangan.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // StatCard
  const StatCard = ({ title, value, icon: Icon, color, bgColor }) => (
    <div className="glass-card glass-card-hover overflow-hidden group relative">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="relative p-5 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className={`p-3 rounded-xl ${bgColor} bg-opacity-20 backdrop-blur-sm shadow-lg shadow-${bgColor.replace('bg-', '')}/20 group-hover:scale-110 transition-transform duration-300`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">{title}</p>
        </div>
        <p className="text-3xl font-bold text-white tracking-tight group-hover:scale-105 transition-transform duration-300">{value}</p>
      </div>
    </div>
  );

  // Export data to CSV
  const handleExportCSV = () => {
    const headers = ['No', 'Lokasi', 'Kebutuhan (m²)', 'Realisasi (m²)', 'Sisa (m²)', 'Keterangan'];
    const rows = filteredData.map(item => [
      item.no,
      item.lokasi,
      item.kebutuhan,
      item.realisasi,
      item.sisa,
      item.keterangan
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `progress_lahan_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download template CSV
  const handleDownloadTemplate = () => {
    const headers = ['No', 'Lokasi', 'Kebutuhan (m²)', 'Realisasi (m²)', 'Sisa (m²)', 'Keterangan'];
    const sampleRow = ['1', 'Area Contoh', '10,000', '5,000', '5,000', 'Keterangan contoh'];

    const csvContent = [
      headers.join(','),
      sampleRow.map(cell => `"${cell}"`).join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_progress_lahan.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import CSV file
  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (event) => {
      const text = event.target.result;
      
      if (!text || text.trim() === '') {
        alert('File kosong');
        return;
      }

      const lines = text.split('\n');
      
      // Remove empty lines
      const validLines = lines.filter(line => line.trim() !== '');
      
      if (validLines.length < 2) {
        alert('File CSV tidak memiliki data. Pastikan file memiliki header dan minimal satu baris data.');
        return;
      }
      
      // Skip header row
      const dataLines = validLines.slice(1);
      
      const newData = dataLines.map(line => {
        const parts = line.split(',');
        return {
          no: parts[0] ? parseInt(parts[0].replace(/"/g, '').trim()) : 0,
          lokasi: parts[1] ? parts[1].replace(/"/g, '').trim() : '',
          kebutuhan: parts[2] ? parseFloat(parts[2].replace(/,/g, '').replace(/"/g, '').trim()) : 0,
          realisasi: parts[3] ? parseFloat(parts[3].replace(/,/g, '').replace(/"/g, '').trim()) : 0,
          sisa: parts[4] ? parseFloat(parts[4].replace(/,/g, '').replace(/"/g, '').trim()) : 0,
          keterangan: parts[5] ? parts[5].replace(/"/g, '').trim() : ''
        };
      }).filter(item => item && item.lokasi);

      if (newData.length > 0) {
        // Use API import endpoint with UPSERT logic
        api.post('/progress-lahan/import', { data: newData })
          .then(response => {
            if (response.data.success) {
              alert(`Berhasil mengimpor data:\nSukses: ${response.data.data.successCount}\nGagal: ${response.data.data.errorCount}`);
              // Refresh data from server
              fetchProgressLahan();
            } else {
              alert('Gagal mengimpor data: ' + response.data.message);
            }
          })
          .catch(error => {
            console.error('API Import Error:', error);
            alert('Gagal mengimpor data ke server: ' + error.message);
          });
      } else {
        alert('Gagal mengimpor data. Pastikan format CSV sesuai template.\n\nFormat yang diharapkan:\nNo, Lokasi, Kebutuhan, Realisasi, Sisa, Keterangan');
      }
    };
    
    reader.onerror = () => {
      alert('Gagal membaca file CSV');
    };
    
    reader.readAsText(file);
    setImportFile(null);
  };

  // Edit handlers
  const handleEditClick = (item, index) => {
    setEditingItem(index);
    setEditForm({
      lokasi: item.lokasi,
      kebutuhan: item.kebutuhan,
      realisasi: item.realisasi,
      sisa: item.sisa,
      keterangan: item.keterangan
    });
  };

  const handleEditSave = async (index) => {
    const item = lahanData[index];
    try {
      const response = await api.put(`/progress-lahan/${item.id}`, editForm);
      if (response.data.success) {
        fetchProgressLahan();
        setEditingItem(null);
        setEditForm({});
        alert('Data berhasil diupdate');
      } else {
        alert('Gagal mengupdate data: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error updating progress lahan:', error);
      alert('Gagal mengupdate data: ' + error.message);
    }
  };

  const handleEditCancel = () => {
    setEditingItem(null);
    setEditForm({});
  };

  const handleDelete = async (index) => {
    const item = lahanData[index];
    if (!window.confirm(`Yakin ingin menghapus data "${item.lokasi}"?`)) {
      return;
    }
    
    try {
      const response = await api.delete(`/progress-lahan/${item.id}`);
      if (response.data.success) {
        fetchProgressLahan();
        alert('Data berhasil dihapus');
      } else {
        alert('Gagal menghapus data: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error deleting progress lahan:', error);
      alert('Gagal menghapus data: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-[#3B82F6]/20 to-[#8B5CF6]/20 rounded-2xl blur-xl"></div>
        <div className="relative bg-[#0F172A]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h1 className="text-3xl font-bold text-white tracking-tight bg-gradient-to-r from-white to-[#94A3B8] bg-clip-text text-transparent">
            Progress Pengadaan Tanah Jalan Tol Becakayu
          </h1>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Kebutuhan"
          value={`${formatNumber(totalKebutuhan)} m²`}
          icon={CheckCircle}
          color="text-[#22C55E]"
          bgColor="bg-[#22C55E]"
        />
        <StatCard
          title="Total Realisasi"
          value={`${formatNumber(totalRealisasi)} m²`}
          icon={Clock}
          color="text-[#F59E0B]"
          bgColor="bg-[#F59E0B]"
        />
        <StatCard
          title="Progress"
          value={`${progressPersen}%`}
          icon={AlertTriangle}
          color="text-[#3B82F6]"
          bgColor="bg-[#3B82F6]"
        />
        <StatCard
          title="Sisa Belum Bebas"
          value={`${sisaPersen}%`}
          icon={AlertTriangle}
          color="text-[#EF4444]"
          bgColor="bg-[#EF4444]"
        />
      </div>

      {/* Filters */}
      <div className="bg-[#0F172A]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg shadow-black/20">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Cari lokasi atau keterangan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#111827] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 focus:border-[#3B82F6]/50 placeholder:text-[#475569] transition-all duration-200"
            />
          </div>
          <div className="flex items-center gap-3 border-l border-white/10 pl-4 ml-auto">
            <button
              onClick={handleExportCSV}
              className="px-5 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl text-sm transition-all duration-200 flex items-center gap-2 shadow-lg shadow-green-600/20 hover:shadow-green-600/40 hover:scale-105"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={handleDownloadTemplate}
              className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl text-sm transition-all duration-200 flex items-center gap-2 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 hover:scale-105"
            >
              <FileText className="w-4 h-4" />
              Template
            </button>
            <label className="px-5 py-3 bg-gradient-to-r from-[#3B82F6] to-[#2563EB] hover:from-[#2563EB] hover:to-[#1D4ED8] text-white rounded-xl text-sm transition-all duration-200 cursor-pointer flex items-center gap-2 shadow-lg shadow-[#3B82F6]/20 hover:shadow-[#3B82F6]/40 hover:scale-105">
              <Upload className="w-4 h-4" />
              {importFile ? importFile.name : 'Upload CSV'}
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImportCSV}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0F172A]/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-lg shadow-black/20">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
                <th className="text-left text-[#94A3B8] font-semibold px-4 py-4 uppercase tracking-wider text-xs">No</th>
                <th className="text-left text-[#94A3B8] font-semibold px-4 py-4 uppercase tracking-wider text-xs">Lokasi</th>
                <th className="text-left text-[#94A3B8] font-semibold px-4 py-4 uppercase tracking-wider text-xs">Kebutuhan (m²)</th>
                <th className="text-left text-[#94A3B8] font-semibold px-4 py-4 uppercase tracking-wider text-xs">Realisasi (m²)</th>
                <th className="text-left text-[#94A3B8] font-semibold px-4 py-4 uppercase tracking-wider text-xs">Sisa (m²)</th>
                <th className="text-left text-[#94A3B8] font-semibold px-4 py-4 uppercase tracking-wider text-xs">Keterangan</th>
                <th className="text-left text-[#94A3B8] font-semibold px-4 py-4 uppercase tracking-wider text-xs">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-[#E5E7EB]">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="p-4 bg-white/5 rounded-full mb-4">
                        <MapPinned className="w-12 h-12 text-[#475569]" />
                      </div>
                      <p className="text-[#94A3B8] text-lg font-medium">Tidak ada data lahan ditemukan</p>
                      <p className="text-[#64748B] text-sm mt-2">Upload file CSV untuk memulai</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr 
                    key={index}
                    className="border-b border-white/5 hover:bg-white/5 transition-all duration-200 hover:scale-[1.01]"
                  >
                    {editingItem === index ? (
                      <>
                        <td className="px-4 py-4 font-mono text-xs text-[#3B82F6] font-semibold">{item.no}</td>
                        <td className="px-4 py-4">
                          <input
                            type="text"
                            value={editForm.lokasi}
                            onChange={(e) => setEditForm({...editForm, lokasi: e.target.value})}
                            className="w-full px-3 py-2 bg-[#111827] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 focus:border-[#3B82F6]/50 transition-all duration-200"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="text"
                            value={editForm.kebutuhan}
                            onChange={(e) => setEditForm({...editForm, kebutuhan: e.target.value})}
                            className="w-full px-3 py-2 bg-[#111827] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 focus:border-[#3B82F6]/50 transition-all duration-200"
                            placeholder="10,000"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="text"
                            value={editForm.realisasi}
                            onChange={(e) => setEditForm({...editForm, realisasi: e.target.value})}
                            className="w-full px-3 py-2 bg-[#111827] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 focus:border-[#3B82F6]/50 transition-all duration-200"
                            placeholder="5,000"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="text"
                            value={editForm.sisa}
                            onChange={(e) => setEditForm({...editForm, sisa: e.target.value})}
                            className="w-full px-3 py-2 bg-[#111827] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 focus:border-[#3B82F6]/50 transition-all duration-200"
                            placeholder="5,000"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="text"
                            value={editForm.keterangan}
                            onChange={(e) => setEditForm({...editForm, keterangan: e.target.value})}
                            className="w-full px-3 py-2 bg-[#111827] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 focus:border-[#3B82F6]/50 transition-all duration-200"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditSave(index)}
                              className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg text-xs font-semibold transition-all duration-200 shadow-lg shadow-green-600/20 hover:shadow-green-600/40 hover:scale-105"
                            >
                              Simpan
                            </button>
                            <button
                              onClick={handleEditCancel}
                              className="px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-lg text-xs font-semibold transition-all duration-200 shadow-lg shadow-gray-600/20 hover:shadow-gray-600/40 hover:scale-105"
                            >
                              Batal
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-4 font-mono text-xs text-[#3B82F6] font-semibold">{item.no}</td>
                        <td className="px-4 py-4 font-semibold text-white">{item.lokasi}</td>
                        <td className="px-4 py-4 text-[#94A3B8] font-medium">{formatNumber(item.kebutuhan)}</td>
                        <td className="px-4 py-4 text-[#22C55E] font-semibold">{formatNumber(item.realisasi)}</td>
                        <td className="px-4 py-4 text-[#F59E0B] font-medium">{formatNumber(item.sisa)}</td>
                        <td className="px-4 py-4 text-[#94A3B8] text-xs">{item.keterangan}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditClick(item, index)}
                              className="px-4 py-2 bg-gradient-to-r from-[#3B82F6] to-[#2563EB] hover:from-[#2563EB] hover:to-[#1D4ED8] text-white rounded-lg text-xs font-semibold transition-all duration-200 shadow-lg shadow-[#3B82F6]/20 hover:shadow-[#3B82F6]/40 hover:scale-105"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(index)}
                              className="px-3 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg text-xs font-semibold transition-all duration-200 shadow-lg shadow-red-600/20 hover:shadow-red-600/40 hover:scale-105 flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProgressLahan;
