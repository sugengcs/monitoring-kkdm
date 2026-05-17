import { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import ProgressLahanHeader from '../components/progress/ProgressLahanHeader';
import KpiCardsHorizontal from '../components/progress/KpiCardsHorizontal';
import ProgressSeksiCards from '../components/progress/ProgressSeksiCards';
import BecakayuMap from '../components/progress/BecakayuMap';
import ProgressDataTable from '../components/progress/ProgressDataTable';

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

  // Filtered data
  const filteredData = lahanData.filter(item => {
    const matchesSearch = !searchQuery || 
      item.lokasi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.keterangan.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Simple number parser helper
  const cleanNumber = (val) => {
    if (!val) return 0;
    if (typeof val === 'number') {
      return val;
    }
    return Number(
      val.toString().replace(/,/g, '')
    ) || 0;
  };

  // Handle CSV upload
  const handleCSVUpload = (file) => {
    console.log('File uploaded:', file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      console.log('CSV content:', text);
      const lines = text.split('\n');
      console.log('Lines:', lines);
      
      if (lines.length < 2) {
        alert('File CSV tidak valid atau kosong');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      console.log('Headers:', headers);
      
      const newData = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',').map(v => v.trim());
        const item = {};
        headers.forEach((header, index) => {
          item[header] = values[index];
        });
        newData.push(item);
      }

      console.log('Parsed data:', newData);
      setLahanData(newData);
      alert(`Berhasil mengupload ${newData.length} data dari CSV`);
    };
    reader.readAsText(file);
  };

  // Stats - Total of all Seksi (calculated from table data)
  const totalKebutuhan = useMemo(() => {
    const result = filteredData.reduce((sum, item) => {
      return sum + cleanNumber(item.kebutuhan);
    }, 0);
    console.log('totalKebutuhan calculated:', result);
    console.log('totalKebutuhan formatted:', result.toLocaleString('id-ID'));
    return result;
  }, [filteredData]);

  const totalRealisasi = useMemo(() => {
    const result = filteredData.reduce((sum, item) => {
      return sum + cleanNumber(item.realisasi);
    }, 0);
    console.log('totalRealisasi calculated:', result);
    console.log('totalRealisasi formatted:', result.toLocaleString('id-ID'));
    return result;
  }, [filteredData]);

  const totalSisa = totalKebutuhan - totalRealisasi;
  const progressPersen = totalKebutuhan > 0 ? ((totalRealisasi / totalKebutuhan) * 100) : 0;
  const sisaPersen = totalKebutuhan > 0 ? ((totalSisa / totalKebutuhan) * 100) : 0;

  const stats = useMemo(() => {
    return {
      totalKebutuhan,
      totalRealisasi,
      totalSisa,
      progressPersen,
      sisaPersen,
    };
  }, [totalKebutuhan, totalRealisasi, totalSisa, progressPersen, sisaPersen]);

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
  const handleEditClick = (item, index, formData = null) => {
    if (formData) {
      // Update form data when typing in inputs
      setEditForm(formData);
    } else {
      // Start editing mode
      setEditingItem(index);
      setEditForm({
        lokasi: item.lokasi,
        kebutuhan: item.kebutuhan,
        realisasi: item.realisasi,
        sisa: item.sisa,
        keterangan: item.keterangan
      });
    }
  };

  const handleEditSave = async (index) => {
    const item = lahanData[index];
    // Convert formatted numbers to raw numbers for API
    const formData = {
      lokasi: editForm.lokasi,
      kebutuhan: parseFloat(editForm.kebutuhan?.replace(/,/g, '')) || 0,
      realisasi: parseFloat(editForm.realisasi?.replace(/,/g, '')) || 0,
      sisa: parseFloat(editForm.sisa?.replace(/,/g, '')) || 0,
      keterangan: editForm.keterangan
    };
    try {
      const response = await api.put(`/progress-lahan/${item.id}`, formData);
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
    <div className="h-screen overflow-hidden" style={{ background: 'linear-gradient(135deg, #0B1120 0%, #0F172A 50%, #111827 100%)' }}>
      <div className="h-full flex flex-col p-4 lg:p-6 gap-4">
        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div
              className="w-10 h-10 rounded-full border-2 border-transparent animate-spin"
              style={{
                borderTopColor: '#3B82F6',
                borderRightColor: '#06B6D4',
                boxShadow: '0 0 12px rgba(59,130,246,0.3)',
              }}
            />
            <span className="ml-3 text-sm text-slate-400">Memuat data...</span>
          </div>
        ) : (
          <>
            <ProgressLahanHeader
              onRefresh={fetchProgressLahan}
              onFullscreen={() => {}}
              onExport={() => {}}
              onUploadCSV={handleCSVUpload}
            />

            <KpiCardsHorizontal data={stats} />

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
              <div className="space-y-4 flex flex-col min-h-0">
                <ProgressSeksiCards lahanData={lahanData} />
                <ProgressDataTable
                  lahanData={lahanData}
                  onEdit={handleEditClick}
                  onDelete={handleDelete}
                  editingItem={editingItem}
                  editForm={editForm}
                  onEditSave={handleEditSave}
                  onEditCancel={handleEditCancel}
                />
              </div>
              <BecakayuMap lahanData={lahanData} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProgressLahan;
