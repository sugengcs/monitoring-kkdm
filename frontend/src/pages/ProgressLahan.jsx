import React, { useState, useEffect, useMemo } from 'react';
import { useResponsive } from '../utils/responsive';
import api from '../utils/api';
import ProgressLahanHeader from '../components/progress/ProgressLahanHeader';
import KpiCardsHorizontal from '../components/progress/KpiCardsHorizontal';
import ProgressSeksiCards from '../components/progress/ProgressSeksiCards';
import BecakayuMap from '../components/progress/BecakayuMap';
import ProgressDataTable from '../components/progress/ProgressDataTable';
import GlowCard from '../components/GlowCard';
import { AlertCircle, X, Download, FileSpreadsheet, FileText, Loader2, Edit2, Save, Plus, Pencil, Trash2, Check, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const ProgressLahan = () => {
  const { isMobile, isTablet } = useResponsive();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [highlightedSeksi, setHighlightedSeksi] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lahanData, setLahanData] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showDttModal, setShowDttModal] = useState(false);
  const [dttLoading, setDttLoading] = useState(false);
  const [editingOutstandingRow, setEditingOutstandingRow] = useState(null);
  const [editOutstandingForm, setEditOutstandingForm] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Load Outstanding DTT data from localStorage on mount
  const [outstandingData, setOutstandingData] = useState(() => {
    const savedData = localStorage.getItem('outstandingDttData');
    if (savedData) {
      try {
        return JSON.parse(savedData);
      } catch (e) {
        console.error('Error loading outstanding data from localStorage:', e);
      }
    }
    // Default data
    return [
      {
        id: 1,
        no: 'A',
        uraian: 'Nilai',
        dtt: 15000000000,
        cof: 12000000000,
        si: 8000000000,
        total: 35000000000
      },
      {
        id: 2,
        no: 'B',
        uraian: 'Realisasi',
        dtt: 10000000000,
        cof: 9000000000,
        si: 5000000000,
        total: 24000000000
      },
      {
        id: 3,
        no: 'C',
        uraian: 'Outstanding',
        dtt: 5000000000,
        cof: 3000000000,
        si: 3000000000,
        total: 11000000000,
        isOutstanding: true,
        breakdown: {
          lman: 7000000000,
          apbn: 4000000000
        }
      }
    ];
  });

  // Manual input state for financial cards
  const [manualFinancialData, setManualFinancialData] = useState(() => {
    const savedData = localStorage.getItem('manualFinancialData');
    if (savedData) {
      try {
        return JSON.parse(savedData);
      } catch (e) {
        console.error('Error loading manual financial data from localStorage:', e);
      }
    }
    return {
      realisasiDTT: 0,
      pengembalian: 0,
      outstandingDTT: 0,
      estimasiCoF: 0,
      realisasiCoF: 0,
      outstandingCoF: 0,
      standingInstruction: 0
    };
  });

  const [editingFinancialCard, setEditingFinancialCard] = useState(null);
  const [financialEditForm, setFinancialEditForm] = useState({});
  const [detailTableModal, setDetailTableModal] = useState(null); // For Outstanding DTT, CoF, SI detail tables
  const [editingDetailRow, setEditingDetailRow] = useState(null);
  const [detailEditForm, setDetailEditForm] = useState({});
  const [detailTableData, setDetailTableData] = useState(() => {
    const savedData = localStorage.getItem('detailTableData');
    if (savedData) {
      try {
        return JSON.parse(savedData);
      } catch (e) {
        console.error('Error loading detail table data from localStorage:', e);
      }
    }
    // Default sample data
    return {
      outstandingDTT: [
        { no: '1', nama: 'Contoh Item 1', nilai: 1000000000, status: 'Proses', keterangan: 'Contoh keterangan' },
        { no: '2', nama: 'Contoh Item 2', nilai: 2000000000, status: 'Selesai', keterangan: 'Contoh keterangan 2' }
      ],
      outstandingCoF: [
        { no: '1', nama: 'Contoh CoF 1', nilai: 1500000000, status: 'Proses', keterangan: 'Contoh keterangan CoF' },
        { no: '2', nama: 'Contoh CoF 2', nilai: 2500000000, status: 'Pending', keterangan: 'Contoh keterangan CoF 2' }
      ],
      standingInstruction: [
        { no: '1', nama: 'SI Item 1', nilai: 500000000, status: 'Selesai', keterangan: 'Contoh keterangan SI' },
        { no: '2', nama: 'SI Item 2', nilai: 750000000, status: 'Proses', keterangan: 'Contoh keterangan SI 2' }
      ]
    };
  });
  const [addingNewRow, setAddingNewRow] = useState(false);
  const [newRowForm, setNewRowForm] = useState({ nama: '', nilai: '', status: '', keterangan: '' });
  const [savingRow, setSavingRow] = useState(null);
  const [deletingRow, setDeletingRow] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Save Outstanding DTT data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('outstandingDttData', JSON.stringify(outstandingData));
  }, [outstandingData]);

  // Save manual financial data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('manualFinancialData', JSON.stringify(manualFinancialData));
  }, [manualFinancialData]);

  // Save detail table data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('detailTableData', JSON.stringify(detailTableData));
  }, [detailTableData]);

  // Calculate financial summary - use manual values if provided, otherwise calculate from data
  const realisasiDTT = manualFinancialData.realisasiDTT > 0 ? manualFinancialData.realisasiDTT : (outstandingData.find(row => row.no === 'B')?.dtt || 0);
  
  // Calculate Outstanding DTT as sum of 'nilai' from detail table
  const outstandingDTT = detailTableData.outstandingDTT?.reduce((sum, row) => sum + (parseFloat(row.nilai) || 0), 0) || 0;
  
  // Calculate Pengembalian as Realisasi DTT - Outstanding DTT
  const pengembalian = manualFinancialData.pengembalian > 0 ? manualFinancialData.pengembalian : Math.max(0, realisasiDTT - outstandingDTT);
  
  const estimasiCoF = manualFinancialData.estimasiCoF > 0 ? manualFinancialData.estimasiCoF : (outstandingData.find(row => row.no === 'A')?.cof || 0);
  
  // Calculate Outstanding CoF as sum of 'nilai' from detail table
  const outstandingCoF = detailTableData.outstandingCoF?.reduce((sum, row) => sum + (parseFloat(row.nilai) || 0), 0) || 0;
  
  // Calculate Realisasi CoF as Estimasi CoF - Outstanding CoF
  const realisasiCoF = manualFinancialData.realisasiCoF > 0 ? manualFinancialData.realisasiCoF : Math.max(0, estimasiCoF - outstandingCoF);
  
  // Calculate Standing Instruction as sum of 'nilai' from detail table
  const standingInstruction = detailTableData.standingInstruction?.reduce((sum, row) => sum + (parseFloat(row.nilai) || 0), 0) || 0;

  // Calculate counts from outstanding data
  const dttTotalCount = outstandingData.length;
  const dttProsesCount = outstandingData.filter(row => row.isOutstanding).length;
  const dttPendingCount = 0;

  // Currency formatter for Indonesian format
  const formatCurrency = (value) => {
    if (!value) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Format number with thousand separator
  const formatNumber = (value) => {
    if (!value) return '0';
    return new Intl.NumberFormat('id-ID').format(value);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const headers = ['NO', 'URAIAN', 'DTT', 'CoF', 'SI', 'TOTAL OUTSTANDING'];
    const rows = outstandingData.map(row => [
      row.no,
      row.uraian,
      formatCurrency(row.dtt),
      formatCurrency(row.cof),
      formatCurrency(row.si),
      formatCurrency(row.total)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `outstanding_dtt_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to PDF (simple implementation)
  const handleExportPDF = () => {
    alert('Fitur export PDF akan segera tersedia');
  };

  // Outstanding DTT Edit Functions
  const handleEditOutstandingRow = (row) => {
    setEditingOutstandingRow(row.id);
    setEditOutstandingForm({
      uraian: row.uraian,
      dtt: row.dtt,
      cof: row.cof,
      si: row.si,
      breakdown: row.breakdown || { lman: 0, apbn: 0 }
    });
    setShowEditModal(true);
  };

  const handleSaveOutstandingEdit = () => {
    setOutstandingData(outstandingData.map(row => 
      row.id === editingOutstandingRow 
        ? { 
            ...row, 
            ...editOutstandingForm, 
            total: editOutstandingForm.dtt + editOutstandingForm.cof + editOutstandingForm.si
          }
        : row
    ));
    setShowEditModal(false);
    setEditingOutstandingRow(null);
    setEditOutstandingForm({});
  };

  const handleCancelOutstandingEdit = () => {
    setShowEditModal(false);
    setEditingOutstandingRow(null);
    setEditOutstandingForm({});
  };

  const handleOutstandingInputChange = (field, value) => {
    setEditOutstandingForm({ ...editOutstandingForm, [field]: value });
  };

  // Financial card edit handlers
  const handleEditFinancialCard = (cardKey, cardTitle) => {
    // For Outstanding DTT, Outstanding CoF, and Standing Instruction, show detail table
    if (cardKey === 'outstandingDTT' || cardKey === 'outstandingCoF' || cardKey === 'standingInstruction') {
      console.log('Opening detail table for:', cardKey, cardTitle);
      console.log('Data:', detailTableData[cardKey]);
      setDetailTableModal({ key: cardKey, title: cardTitle });
    } else {
      setEditingFinancialCard({ key: cardKey, title: cardTitle });
      setFinancialEditForm({
        [cardKey]: manualFinancialData[cardKey] || 0
      });
    }
  };

  const handleSaveFinancialCard = () => {
    const cardKey = editingFinancialCard.key;
    const value = parseFloat(financialEditForm[cardKey]) || 0;
    setManualFinancialData({
      ...manualFinancialData,
      [cardKey]: value
    });
    setEditingFinancialCard(null);
    setFinancialEditForm({});
  };

  const handleCancelFinancialCard = () => {
    setEditingFinancialCard(null);
    setFinancialEditForm({});
  };

  // Detail table modal handlers
  const handleEditDetailRow = (index, row) => {
    setEditingDetailRow(index);
    setDetailEditForm({
      no: row.no,
      nama: row.nama,
      nilai: row.nilai,
      status: row.status,
      keterangan: row.keterangan
    });
  };

  const handleSaveDetailRow = async () => {
    // Validation
    if (!detailEditForm.nama || detailEditForm.nama.trim() === '') {
      toast.error('Nama wajib diisi');
      return;
    }
    if (!detailEditForm.nilai || isNaN(detailEditForm.nilai)) {
      toast.error('Nilai harus berupa angka');
      return;
    }
    if (!detailEditForm.status) {
      toast.error('Status wajib dipilih');
      return;
    }

    setSavingRow(editingDetailRow);
    try {
      // Simulate API call - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));

      if (detailTableModal) {
        const cardKey = detailTableModal.key;
        setDetailTableData(prev => ({
          ...prev,
          [cardKey]: prev[cardKey].map((row, index) =>
            index === editingDetailRow
              ? {
                  ...row,
                  no: detailEditForm.no,
                  nama: detailEditForm.nama,
                  nilai: parseFloat(detailEditForm.nilai) || 0,
                  status: detailEditForm.status,
                  keterangan: detailEditForm.keterangan
                }
              : row
          )
        }));
      }
      toast.success('Data berhasil disimpan');
      setEditingDetailRow(null);
      setDetailEditForm({});
    } catch (error) {
      toast.error('Gagal menyimpan data');
      console.error('Error saving detail row:', error);
    } finally {
      setSavingRow(null);
    }
  };

  const handleCancelDetailRow = () => {
    setEditingDetailRow(null);
    setDetailEditForm({});
  };

  const handleAddNewRow = () => {
    setAddingNewRow(true);
    setNewRowForm({ nama: '', nilai: '', status: '', keterangan: '' });
  };

  const handleSaveNewRow = async () => {
    // Validation
    if (!newRowForm.nama || newRowForm.nama.trim() === '') {
      toast.error('Nama wajib diisi');
      return;
    }
    if (!newRowForm.nilai || isNaN(newRowForm.nilai)) {
      toast.error('Nilai harus berupa angka');
      return;
    }
    if (!newRowForm.status) {
      toast.error('Status wajib dipilih');
      return;
    }

    setSavingRow('new');
    try {
      // Simulate API call - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));

      if (detailTableModal) {
        const cardKey = detailTableModal.key;
        const newNo = (detailTableData[cardKey].length + 1).toString();
        const newRow = {
          no: newNo,
          nama: newRowForm.nama,
          nilai: parseFloat(newRowForm.nilai) || 0,
          status: newRowForm.status,
          keterangan: newRowForm.keterangan
        };
        setDetailTableData(prev => ({
          ...prev,
          [cardKey]: [...prev[cardKey], newRow]
        }));
      }
      toast.success('Data berhasil ditambahkan');
      setAddingNewRow(false);
      setNewRowForm({ nama: '', nilai: '', status: '', keterangan: '' });
    } catch (error) {
      toast.error('Gagal menambahkan data');
      console.error('Error adding new row:', error);
    } finally {
      setSavingRow(null);
    }
  };

  const handleCancelNewRow = () => {
    setAddingNewRow(false);
    setNewRowForm({ nama: '', nilai: '', status: '', keterangan: '' });
  };

  const handleDeleteRow = (index) => {
    setShowDeleteConfirm(index);
  };

  const confirmDeleteRow = async () => {
    setDeletingRow(showDeleteConfirm);
    try {
      // Simulate API call - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));

      if (detailTableModal) {
        const cardKey = detailTableModal.key;
        setDetailTableData(prev => ({
          ...prev,
          [cardKey]: prev[cardKey].filter((_, index) => index !== showDeleteConfirm)
        }));
      }
      toast.success('Data berhasil dihapus');
      setShowDeleteConfirm(null);
    } catch (error) {
      toast.error('Gagal menghapus data');
      console.error('Error deleting row:', error);
    } finally {
      setDeletingRow(null);
    }
  };

  const cancelDeleteRow = () => {
    setShowDeleteConfirm(null);
  };

  const handleCloseDetailTableModal = () => {
    setDetailTableModal(null);
    setEditingDetailRow(null);
    setDetailEditForm({});
    setAddingNewRow(false);
    setNewRowForm({ nama: '', nilai: '', status: '', keterangan: '' });
    setShowDeleteConfirm(null);
  };

  // Fetch data from API on mount and poll for real-time updates
  useEffect(() => {
    fetchProgressLahan();

    // Poll for real-time updates every 3 seconds
    const interval = setInterval(() => {
      fetchProgressLahan();
    }, 3000);

    return () => clearInterval(interval);
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

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.error('Error attempting to exit fullscreen:', err);
      });
    }
  };

  // Listen for fullscreen changes to hide/show sidebar
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        document.body.classList.add('fullscreen-mode');
      } else {
        document.body.classList.remove('fullscreen-mode');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.body.classList.remove('fullscreen-mode');
    };
  }, []);

  return (
    <div className="h-screen overflow-hidden" style={{ background: 'linear-gradient(135deg, #0B1120 0%, #0F172A 50%, #111827 100%)' }}>
      <div className={`h-full flex flex-col ${isMobile ? 'p-2' : 'p-4 lg:p-6'} gap-${isMobile ? '2' : '4'}`}>
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
              onFullscreen={handleFullscreen}
              onExport={() => {}}
              onUploadCSV={handleCSVUpload}
            />

            <KpiCardsHorizontal data={stats} />

            <div className={`flex-1 grid grid-cols-1 ${isMobile ? 'grid-cols-1' : 'lg:grid-cols-2'} gap-${isMobile ? '2' : '4'} min-h-0`}>
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

            {/* Outstanding DTT & CoF Financial Dashboard - Premium */}
            <GlowCard 
              color="#3B82F6" 
              hoverable={true} 
              glowPosition="top"
              className="mt-4"
            >
              <div className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110"
                      style={{
                        background: 'rgba(59, 130, 246, 0.2)',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)',
                      }}
                    >
                      <AlertCircle className="w-5 h-5" style={{ color: '#3B82F6', filter: 'drop-shadow(0 0 8px #3B82F6)' }} />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-white" style={{ textShadow: '0 0 20px rgba(59, 130, 246, 0.5)' }}>Outstanding DTT & CoF</h3>
                      <p className="text-[10px] sm:text-xs text-[#94A3B8]">Dokumen Tanah Tertunda & Compensation of Fund</p>
                    </div>
                  </div>
                </div>
                <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-${isMobile ? '2' : '3'}`}>
                  {/* Card 1: Realisasi DTT */}
                  <div
                    className="text-center p-3 bg-[#1E3A5F]/30 rounded-lg border border-white/10 hover:border-[#3B82F6]/50 transition-all duration-300 cursor-pointer overflow-hidden"
                    onClick={() => handleEditFinancialCard('realisasiDTT', 'Realisasi DTT')}
                  >
                    <p className="text-sm sm:text-base font-bold text-[#3B82F6] truncate">{formatCurrency(realisasiDTT)}</p>
                    <p className="text-[8px] sm:text-[10px] text-[#94A3B8] mt-1 truncate">Realisasi DTT</p>
                  </div>
                  {/* Card 2: Pengembalian */}
                  <div
                    className="text-center p-3 bg-[#1E3A5F]/30 rounded-lg border border-white/10 hover:border-[#10B981]/50 transition-all duration-300 cursor-pointer overflow-hidden"
                    onClick={() => handleEditFinancialCard('pengembalian', 'Pengembalian')}
                  >
                    <p className="text-sm sm:text-base font-bold text-[#10B981] truncate">{formatCurrency(pengembalian)}</p>
                    <p className="text-[8px] sm:text-[10px] text-[#94A3B8] mt-1 truncate">Pengembalian</p>
                  </div>
                  {/* Card 3: Outstanding DTT */}
                  <div
                    className="text-center p-3 bg-[#1E3A5F]/30 rounded-lg border border-white/10 hover:border-[#F59E0B]/50 transition-all duration-300 cursor-pointer overflow-hidden"
                    onClick={() => handleEditFinancialCard('outstandingDTT', 'Outstanding DTT')}
                  >
                    <p className="text-sm sm:text-base font-bold text-[#F59E0B] truncate">{formatCurrency(outstandingDTT)}</p>
                    <p className="text-[8px] sm:text-[10px] text-[#94A3B8] mt-1 truncate">Outstanding DTT</p>
                  </div>
                  {/* Card 4: Estimasi CoF */}
                  <div
                    className="text-center p-3 bg-[#1E3A5F]/30 rounded-lg border border-white/10 hover:border-[#8B5CF6]/50 transition-all duration-300 cursor-pointer overflow-hidden"
                    onClick={() => handleEditFinancialCard('estimasiCoF', 'Estimasi CoF')}
                  >
                    <p className="text-sm sm:text-base font-bold text-[#8B5CF6] truncate">{formatCurrency(estimasiCoF)}</p>
                    <p className="text-[8px] sm:text-[10px] text-[#94A3B8] mt-1 truncate">Estimasi CoF</p>
                  </div>
                  {/* Card 5: Realisasi CoF */}
                  <div
                    className="text-center p-3 bg-[#1E3A5F]/30 rounded-lg border border-white/10 hover:border-[#06B6D4]/50 transition-all duration-300 cursor-pointer overflow-hidden"
                    onClick={() => handleEditFinancialCard('realisasiCoF', 'Realisasi CoF')}
                  >
                    <p className="text-sm sm:text-base font-bold text-[#06B6D4] truncate">{formatCurrency(realisasiCoF)}</p>
                    <p className="text-[8px] sm:text-[10px] text-[#94A3B8] mt-1 truncate">Realisasi CoF</p>
                  </div>
                  {/* Card 6: Outstanding CoF */}
                  <div
                    className="text-center p-3 bg-[#1E3A5F]/30 rounded-lg border border-white/10 hover:border-[#EF4444]/50 transition-all duration-300 cursor-pointer overflow-hidden"
                    onClick={() => handleEditFinancialCard('outstandingCoF', 'Outstanding CoF')}
                  >
                    <p className="text-sm sm:text-base font-bold text-[#EF4444] truncate">{formatCurrency(outstandingCoF)}</p>
                    <p className="text-[8px] sm:text-[10px] text-[#94A3B8] mt-1 truncate">Outstanding CoF</p>
                  </div>
                  {/* Card 7: Standing Instruction (SI) */}
                  <div
                    className="text-center p-3 bg-[#1E3A5F]/30 rounded-lg border border-white/10 hover:border-[#EC4899]/50 transition-all duration-300 cursor-pointer overflow-hidden"
                    onClick={() => handleEditFinancialCard('standingInstruction', 'Standing Instruction (SI)')}
                  >
                    <p className="text-sm sm:text-base font-bold text-[#EC4899] truncate">{formatCurrency(standingInstruction)}</p>
                    <p className="text-[8px] sm:text-[10px] text-[#94A3B8] mt-1 truncate">Standing Instruction (SI)</p>
                  </div>
                </div>
              </div>
            </GlowCard>

            {/* Financial Card Edit Modal */}
            {editingFinancialCard && (
              <div
                className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                onClick={(e) => e.target === e.currentTarget && handleCancelFinancialCard()}
              >
                <div
                  className={`bg-[#0F172A] border border-white/10 rounded-2xl w-full ${isMobile ? 'max-w-full mx-2' : 'max-w-md mx-auto'} max-h-[90vh] overflow-hidden shadow-2xl`}
                  style={{
                    boxShadow: '0 0 60px rgba(59, 130, 246, 0.3)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#0F172A] z-10">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white" style={{ textShadow: '0 0 20px rgba(59, 130, 246, 0.5)' }}>Edit {editingFinancialCard.title}</h2>
                      <p className="text-sm text-[#94A3B8]">Input nilai manual</p>
                    </div>
                    <button
                      onClick={handleCancelFinancialCard}
                      className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Modal Content */}
                  <div className="p-4 sm:p-6">
                    <div>
                      <label className="block text-sm font-medium text-[#94A3B8] mb-2">Nilai (Rp)</label>
                      <input
                        type="number"
                        value={financialEditForm[editingFinancialCard.key] || ''}
                        onChange={(e) => setFinancialEditForm({ ...financialEditForm, [editingFinancialCard.key]: e.target.value })}
                        placeholder="Masukkan nilai dalam Rupiah"
                        className="w-full px-4 py-3 bg-[#0F172A] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#3B82F6]"
                      />
                      <p className="text-xs text-[#94A3B8] mt-2">Contoh: 10000000000</p>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 sm:p-6 border-t border-white/10 flex gap-3">
                    <button
                      onClick={handleCancelFinancialCard}
                      className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleSaveFinancialCard}
                      className="flex-1 px-4 py-2 bg-[#3B82F6] hover:bg-[#3B82F6]/80 text-white rounded-lg transition-all duration-200 border border-[#3B82F6]/20"
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Detail Table Modal for Outstanding DTT, CoF, and SI */}
            {detailTableModal && (
              <div
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                onClick={(e) => e.target === e.currentTarget && handleCloseDetailTableModal()}
              >
                <div
                  className="bg-[#0F172A] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col"
                  style={{
                    boxShadow: '0 0 60px rgba(59, 130, 246, 0.3)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#0F172A] z-10">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white" style={{ textShadow: '0 0 20px rgba(59, 130, 246, 0.5)' }}>Detail {detailTableModal.title}</h2>
                      <p className="text-sm text-[#94A3B8]">Tabel rincian data</p>
                    </div>
                    <button
                      onClick={handleCloseDetailTableModal}
                      className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Add Data Button */}
                  <div className="p-4 sm:p-6 pt-2 pb-2">
                    <button
                      onClick={handleAddNewRow}
                      disabled={addingNewRow}
                      className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6] hover:bg-[#3B82F6]/80 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-lg"
                    >
                      <Plus className="w-4 h-4" />
                      Tambah Data
                    </button>
                  </div>

                  {/* Modal Content - Table */}
                  <div className="p-4 sm:p-6 overflow-auto max-h-[60vh]">
                    <table className="w-full border-collapse relative z-10">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left p-3 text-sm font-semibold text-[#94A3B8]">No</th>
                          <th className="text-left p-3 text-sm font-semibold text-[#94A3B8]">Nama</th>
                          <th className="text-left p-3 text-sm font-semibold text-[#94A3B8]">Nilai</th>
                          <th className="text-left p-3 text-sm font-semibold text-[#94A3B8]">Status</th>
                          <th className="text-left p-3 text-sm font-semibold text-[#94A3B8]">Keterangan</th>
                          <th className="text-left p-3 text-sm font-semibold text-[#94A3B8] sticky right-0 bg-[#0F172A]">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Add New Row */}
                        {addingNewRow && (
                          <tr className="border-b border-white/5 bg-[#3B82F6]/10 transition-all duration-300">
                            <td className="p-3 text-sm text-white">{detailTableData[detailTableModal.key]?.length + 1}</td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={newRowForm.nama}
                                onChange={(e) => setNewRowForm({ ...newRowForm, nama: e.target.value })}
                                placeholder="Nama"
                                className="w-full px-3 py-2 bg-[#0F172A] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#3B82F6]"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={newRowForm.nilai}
                                onChange={(e) => setNewRowForm({ ...newRowForm, nilai: e.target.value })}
                                placeholder="Nilai"
                                className="w-full px-3 py-2 bg-[#0F172A] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#3B82F6]"
                              />
                            </td>
                            <td className="p-3">
                              <select
                                value={newRowForm.status}
                                onChange={(e) => setNewRowForm({ ...newRowForm, status: e.target.value })}
                                className="w-full px-3 py-2 bg-[#0F172A] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#3B82F6]"
                              >
                                <option value="">Pilih Status</option>
                                <option value="Outstanding">Outstanding</option>
                                <option value="Progress">Progress</option>
                                <option value="Selesai">Selesai</option>
                              </select>
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={newRowForm.keterangan}
                                onChange={(e) => setNewRowForm({ ...newRowForm, keterangan: e.target.value })}
                                placeholder="Keterangan"
                                className="w-full px-3 py-2 bg-[#0F172A] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#3B82F6]"
                              />
                            </td>
                            <td className="p-3 sticky right-0 bg-[#0F172A]">
                              <div className="flex gap-2">
                                <button
                                  onClick={handleSaveNewRow}
                                  disabled={savingRow === 'new'}
                                  className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all duration-200"
                                >
                                  {savingRow === 'new' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={handleCancelNewRow}
                                  className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-200"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* Existing Rows */}
                        {detailTableData[detailTableModal.key]?.length > 0 ? (
                          detailTableData[detailTableModal.key].map((row, index) => (
                            <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors relative">
                              {editingDetailRow === index ? (
                                // Edit Mode
                                <>
                                  <td className="p-3 text-sm text-white">{row.no}</td>
                                  <td className="p-3">
                                    <input
                                      type="text"
                                      value={detailEditForm.nama}
                                      onChange={(e) => setDetailEditForm({ ...detailEditForm, nama: e.target.value })}
                                      className="w-full px-3 py-2 bg-[#0F172A] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#3B82F6]"
                                    />
                                  </td>
                                  <td className="p-3">
                                    <input
                                      type="number"
                                      value={detailEditForm.nilai}
                                      onChange={(e) => setDetailEditForm({ ...detailEditForm, nilai: e.target.value })}
                                      className="w-full px-3 py-2 bg-[#0F172A] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#3B82F6]"
                                    />
                                  </td>
                                  <td className="p-3">
                                    <select
                                      value={detailEditForm.status}
                                      onChange={(e) => setDetailEditForm({ ...detailEditForm, status: e.target.value })}
                                      className="w-full px-3 py-2 bg-[#0F172A] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#3B82F6]"
                                    >
                                      <option value="">Pilih Status</option>
                                      <option value="Outstanding">Outstanding</option>
                                      <option value="Progress">Progress</option>
                                      <option value="Selesai">Selesai</option>
                                    </select>
                                  </td>
                                  <td className="p-3">
                                    <input
                                      type="text"
                                      value={detailEditForm.keterangan}
                                      onChange={(e) => setDetailEditForm({ ...detailEditForm, keterangan: e.target.value })}
                                      className="w-full px-3 py-2 bg-[#0F172A] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#3B82F6]"
                                    />
                                  </td>
                                  <td className="p-3 sticky right-0 bg-[#0F172A]">
                                    <div className="flex gap-2">
                                      <button
                                        onClick={handleSaveDetailRow}
                                        disabled={savingRow === index}
                                        className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all duration-200"
                                      >
                                        {savingRow === index ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                      </button>
                                      <button
                                        onClick={handleCancelDetailRow}
                                        className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-200"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                // View Mode
                                <>
                                  <td className="p-3 text-sm text-white">{row.no}</td>
                                  <td className="p-3 text-sm text-white">{row.nama}</td>
                                  <td className="p-3 text-sm text-white">{formatCurrency(row.nilai)}</td>
                                  <td className="p-3 text-sm">
                                    <span
                                      className={`px-2 py-1 rounded-full text-xs font-medium border ${
                                        row.status === 'Selesai'
                                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                          : row.status === 'Progress'
                                          ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                          : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                      }`}
                                    >
                                      {row.status}
                                    </span>
                                  </td>
                                  <td className="p-3 text-sm text-slate-400">{row.keterangan}</td>
                                  <td className="p-3 sticky right-0 bg-[#0F172A]">
                                    {showDeleteConfirm === index ? (
                                      // Delete Confirmation
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={confirmDeleteRow}
                                          disabled={deletingRow === index}
                                          className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-200"
                                        >
                                          {deletingRow === index ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        </button>
                                        <button
                                          onClick={cancelDeleteRow}
                                          className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all duration-200"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ) : (
                                      // Normal Actions
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => handleEditDetailRow(index, row)}
                                          className="p-2 bg-[#3B82F6] hover:bg-[#3B82F6]/80 text-white rounded-lg transition-all duration-200"
                                          title="Edit"
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteRow(index)}
                                          className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-200"
                                          title="Hapus"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </>
                              )}
                            </tr>
                          ))
                        ) : (
                          // Empty State
                          !addingNewRow && (
                            <tr>
                              <td colSpan="6" className="p-12 text-center">
                                <div className="flex flex-col items-center gap-4">
                                  <div className="p-4 bg-white/5 rounded-full">
                                    <AlertTriangle className="w-12 h-12 text-slate-500" />
                                  </div>
                                  <div>
                                    <p className="text-lg font-medium text-slate-400 mb-2">Belum ada data</p>
                                    <button
                                      onClick={handleAddNewRow}
                                      className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6] hover:bg-[#3B82F6]/80 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-lg"
                                    >
                                      <Plus className="w-4 h-4" />
                                      Tambah Data Pertama
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 sm:p-6 border-t border-white/10 flex justify-end">
                    <button
                      onClick={handleCloseDetailTableModal}
                      className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* DTT Edit Modal */}
            {showEditModal && (
              <div 
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                onClick={(e) => e.target === e.currentTarget && setShowEditModal(false)}
                style={{
                  animation: 'fadeIn 0.3s ease-out'
                }}
              >
                <div 
                  className="bg-[#0F172A] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl"
                  style={{
                    boxShadow: '0 0 60px rgba(59, 130, 246, 0.3)',
                    animation: 'scaleIn 0.3s ease-out'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#0F172A] z-10">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white" style={{ textShadow: '0 0 20px rgba(59, 130, 246, 0.5)' }}>Edit Outstanding DTT</h2>
                      <p className="text-sm text-[#94A3B8]">Update nilai Outstanding</p>
                    </div>
                    <button
                      onClick={handleCancelOutstandingEdit}
                      className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Modal Content */}
                  <div className="p-4 sm:p-6 overflow-y-auto max-h-[70vh]">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-[#94A3B8] mb-2">Uraian</label>
                        <input
                          type="text"
                          value={editOutstandingForm.uraian}
                          onChange={(e) => handleOutstandingInputChange('uraian', e.target.value)}
                          className="w-full px-4 py-2 bg-[#0F172A] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#3B82F6]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#94A3B8] mb-2">DTT (Rp)</label>
                        <input
                          type="text"
                          value={editOutstandingForm.dtt}
                          onChange={(e) => handleOutstandingInputChange('dtt', parseFloat(e.target.value.replace(/,/g, '')) || 0)}
                          className="w-full px-4 py-2 bg-[#0F172A] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#3B82F6]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#94A3B8] mb-2">CoF (Rp)</label>
                        <input
                          type="text"
                          value={editOutstandingForm.cof}
                          onChange={(e) => handleOutstandingInputChange('cof', parseFloat(e.target.value.replace(/,/g, '')) || 0)}
                          className="w-full px-4 py-2 bg-[#0F172A] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#3B82F6]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#94A3B8] mb-2">SI (Rp)</label>
                        <input
                          type="text"
                          value={editOutstandingForm.si}
                          onChange={(e) => handleOutstandingInputChange('si', parseFloat(e.target.value.replace(/,/g, '')) || 0)}
                          className="w-full px-4 py-2 bg-[#0F172A] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#3B82F6]"
                        />
                      </div>
                      {editOutstandingForm.breakdown && (
                        <>
                          <div className="border-t border-white/10 pt-4 mt-4">
                            <h3 className="text-sm font-semibold text-white mb-3">Breakdown Outstanding</h3>
                            <div>
                              <label className="block text-sm font-medium text-[#94A3B8] mb-2">LMAN (Rp)</label>
                              <input
                                type="text"
                                value={editOutstandingForm.breakdown.lman}
                                onChange={(e) => handleOutstandingInputChange('breakdown', {
                                  ...editOutstandingForm.breakdown,
                                  lman: parseFloat(e.target.value.replace(/,/g, '')) || 0
                                })}
                                className="w-full px-4 py-2 bg-[#0F172A] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#3B82F6]"
                              />
                            </div>
                            <div className="mt-4">
                              <label className="block text-sm font-medium text-[#94A3B8] mb-2">APBN (Rp)</label>
                              <input
                                type="text"
                                value={editOutstandingForm.breakdown.apbn}
                                onChange={(e) => handleOutstandingInputChange('breakdown', {
                                  ...editOutstandingForm.breakdown,
                                  apbn: parseFloat(e.target.value.replace(/,/g, '')) || 0
                                })}
                                className="w-full px-4 py-2 bg-[#0F172A] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#3B82F6]"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 sm:p-6 border-t border-white/10 flex justify-end gap-3">
                    <button
                      onClick={handleCancelOutstandingEdit}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleSaveOutstandingEdit}
                      className="px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Simpan
                    </button>
                  </div>
                </div>
              </div>
            )}

            <style>{`
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              @keyframes scaleIn {
                from { 
                  opacity: 0;
                  transform: scale(0.95);
                }
                to { 
                  opacity: 1;
                  transform: scale(1);
                }
              }
            `}</style>
          </>
        )}
      </div>
    </div>
  );
};

export default ProgressLahan;
