import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { 
  DollarSign, 
  TrendingUp, 
  Wallet, 
  Activity,
  Search,
  Download,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  Printer,
  Upload,
  X,
  ChevronDown,
  Eye,
  Settings,
  Percent
} from 'lucide-react';
import api from '../utils/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const COLORS = ['#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const AnggaranPemeliharaan = () => {
  const [budgetData, setBudgetData] = useState([]);
  const [stats, setStats] = useState({ totalAnggaran: 0, totalRealisasi: 0, totalSisa: 0, persentaseRealisasi: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [tableSearch, setTableSearch] = useState('');
  const [tableYear, setTableYear] = useState('2026');
  const [tableCategory, setTableCategory] = useState('');
  const [selectedCardFilter, setSelectedCardFilter] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailCardType, setDetailCardType] = useState('');
  const [tablePage, setTablePage] = useState(1);
  const [editingMonthlyItem, setEditingMonthlyItem] = useState(null);
  const [monthlyEditForm, setMonthlyEditForm] = useState({});
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);
  const itemsPerPage = 10;
  const tableItemsPerPage = 5;

  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  // Load monthly data from localStorage or use default
  const [monthlyData, setMonthlyData] = useState(() => {
    const saved = localStorage.getItem('monthlyBudgetData');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved monthly data:', e);
        return [
          {
            id: 1,
            uraian: 'Pemeliharaan Kebersihan Jalan Tol',
            status: 'Aktif',
            tahun: '2026',
            rencana: [50000000, 45000000, 50000000, 48000000, 52000000, 50000000, 51000000, 49000000, 50000000, 53000000, 51000000, 50000000],
            realisasi: [48000000, 44000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
          },
          {
            id: 2,
            uraian: 'Perbaikan Marka Jalan',
            status: 'Aktif',
            tahun: '2026',
            rencana: [30000000, 25000000, 30000000, 28000000, 32000000, 30000000, 31000000, 29000000, 30000000, 33000000, 31000000, 30000000],
            realisasi: [28000000, 24000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
          },
          {
            id: 3,
            uraian: 'Pemeliharaan Lampu PJU',
            status: 'Selesai',
            tahun: '2026',
            rencana: [20000000, 18000000, 20000000, 19000000, 21000000, 20000000, 20500000, 19500000, 20000000, 21500000, 20500000, 20000000],
            realisasi: [20000000, 18000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
          },
          {
            id: 4,
            uraian: 'Perawatan Taman Median',
            status: 'Aktif',
            tahun: '2025',
            rencana: [15000000, 12000000, 15000000, 14000000, 16000000, 15000000, 15500000, 14500000, 15000000, 16500000, 15500000, 15000000],
            realisasi: [14000000, 11000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
          },
          {
            id: 5,
            uraian: 'Perbaikan Drainase',
            status: 'Aktif',
            tahun: '2025',
            rencana: [25000000, 22000000, 25000000, 23000000, 27000000, 25000000, 26000000, 24000000, 25000000, 28000000, 26000000, 25000000],
            realisasi: [23000000, 20000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
          }
        ];
      }
    }
    return [
      {
        id: 1,
        uraian: 'Pemeliharaan Kebersihan Jalan Tol',
        status: 'Aktif',
        tahun: '2026',
        rencana: [50000000, 45000000, 50000000, 48000000, 52000000, 50000000, 51000000, 49000000, 50000000, 53000000, 51000000, 50000000],
        realisasi: [48000000, 44000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      },
      {
        id: 2,
        uraian: 'Perbaikan Marka Jalan',
        status: 'Aktif',
        tahun: '2026',
        rencana: [30000000, 25000000, 30000000, 28000000, 32000000, 30000000, 31000000, 29000000, 30000000, 33000000, 31000000, 30000000],
        realisasi: [28000000, 24000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      },
      {
        id: 3,
        uraian: 'Pemeliharaan Lampu PJU',
        status: 'Selesai',
        tahun: '2026',
        rencana: [20000000, 18000000, 20000000, 19000000, 21000000, 20000000, 20500000, 19500000, 20000000, 21500000, 20500000, 20000000],
        realisasi: [20000000, 18000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      },
      {
        id: 4,
        uraian: 'Perawatan Taman Median',
        status: 'Aktif',
        tahun: '2025',
        rencana: [15000000, 12000000, 15000000, 14000000, 16000000, 15000000, 15500000, 14500000, 15000000, 16500000, 15500000, 15000000],
        realisasi: [14000000, 11000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      },
      {
        id: 5,
        uraian: 'Perbaikan Drainase',
        status: 'Aktif',
        tahun: '2025',
        rencana: [25000000, 22000000, 25000000, 23000000, 27000000, 25000000, 26000000, 24000000, 25000000, 28000000, 26000000, 25000000],
        realisasi: [23000000, 20000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      }
    ];
  });

  // Save monthly data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('monthlyBudgetData', JSON.stringify(monthlyData));
  }, [monthlyData]);

  const availableYears = useMemo(() => {
    const years = [...new Set(monthlyData.map(item => item.tahun))];
    return years.sort().reverse();
  }, [monthlyData]);

  const formatRupiah = (number) => {
    if (number === null || number === undefined) {
      return '-';
    }
    return number.toLocaleString('id-ID');
  };

  const calculateTotal = (arr) => {
    return arr.reduce((sum, val) => sum + (val || 0), 0);
  };

  const filteredMonthlyData = monthlyData.filter(item => {
    const matchesSearch = !tableSearch || 
      item.uraian.toLowerCase().includes(tableSearch.toLowerCase());
    const matchesCategory = !tableCategory || item.status === tableCategory;
    const matchesYear = !tableYear || item.tahun === tableYear;
    
    // Apply card-based filtering
    let matchesCardFilter = true;
    if (selectedCardFilter === 'realisasi') {
      const totalRealisasi = calculateTotal(item.realisasi);
      matchesCardFilter = totalRealisasi > 0;
    } else if (selectedCardFilter === 'sisa') {
      const totalRencana = calculateTotal(item.rencana);
      const totalRealisasi = calculateTotal(item.realisasi);
      const sisa = totalRencana - totalRealisasi;
      matchesCardFilter = sisa > 0;
    } else if (selectedCardFilter === 'active') {
      matchesCardFilter = item.status === 'Aktif';
    } else if (selectedCardFilter === 'completed') {
      matchesCardFilter = item.status === 'Selesai';
    }
    
    return matchesSearch && matchesCategory && matchesCardFilter && matchesYear;
  });

  const tablePaginatedData = filteredMonthlyData.slice(
    (tablePage - 1) * tableItemsPerPage,
    tablePage * tableItemsPerPage
  );

  const tableTotalPages = Math.ceil(filteredMonthlyData.length / tableItemsPerPage);

  const handleCardClick = (cardType) => {
    setDetailCardType(cardType);
    setShowDetailModal(true);
  };

  const handleTableExportExcel = () => {
    const data = [];
    filteredMonthlyData.forEach((item, index) => {
      data.push({
        No: index + 1,
        Uraian: item.uraian,
        Status: 'Rencana',
        ...Object.fromEntries(months.map((m, i) => [m, item.rencana[i]])),
        Total_Rencana: calculateTotal(item.rencana),
        Total_Realisasi: '-'
      });
      data.push({
        No: '',
        Uraian: '',
        Status: 'Realisasi',
        ...Object.fromEntries(months.map((m, i) => [m, item.realisasi[i]])),
        Total_Rencana: '-',
        Total_Realisasi: calculateTotal(item.realisasi)
      });
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Bulanan');
    XLSX.writeFile(wb, `laporan_bulanan_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleTableExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(16);
    doc.text('Laporan Anggaran Pemeliharaan Bulanan', 14, 20);
    doc.setFontSize(10);
    doc.text(`Tahun: ${tableYear}`, 14, 30);

    const tableData = [];
    filteredMonthlyData.forEach((item, index) => {
      tableData.push([
        index + 1,
        item.uraian,
        'Rencana',
        ...item.rencana.map(v => formatRupiah(v)),
        formatRupiah(calculateTotal(item.rencana)),
        '-'
      ]);
      tableData.push([
        '',
        '',
        'Realisasi',
        ...item.realisasi.map(v => formatRupiah(v)),
        '-',
        formatRupiah(calculateTotal(item.realisasi))
      ]);
    });

    doc.autoTable({
      head: [['No', 'Uraian', 'Status', ...months, 'Total Rencana', 'Total Realisasi']],
      body: tableData,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 6 },
      columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 35 }, 2: { cellWidth: 15 } }
    });

    doc.save(`laporan_bulanan_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleTablePrint = () => {
    window.print();
  };

  const handleEditMonthly = (item) => {
    setEditingMonthlyItem(item.id);
    setMonthlyEditForm({ ...item });
    setShowMonthlyModal(true);
  };

  const handleSaveMonthly = () => {
    setMonthlyData(prevData => 
      prevData.map(item => 
        item.id === editingMonthlyItem ? { ...monthlyEditForm, id: item.id } : item
      )
    );
    setShowMonthlyModal(false);
    setEditingMonthlyItem(null);
    setMonthlyEditForm({});
  };

  const handleDeleteMonthly = (id) => {
    if (!window.confirm('Yakin ingin menghapus data ini?')) return;
    setMonthlyData(prevData => prevData.filter(item => item.id !== id));
  };

  const handleUploadExcel = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            console.log('[Excel Upload] Raw data:', jsonData);
            console.log('[Excel Upload] Columns:', Object.keys(jsonData[0] || {}));
            
            // Map Excel data to monthlyData format
            // Template structure: 2 rows per item (Rencana + Realisasi)
            const newData = [];
            for (let i = 0; i < jsonData.length; i += 2) {
              const rencanaRow = jsonData[i];
              const realisasiRow = jsonData[i + 1];
              
              if (!rencanaRow) break;
              
              console.log(`[Excel Upload] Processing item ${i/2}:`, rencanaRow);
              
              // Get uraian from rencana row
              const uraian = rencanaRow['Uraian'] || rencanaRow[' Uraian '] || 
                             rencanaRow['uraian'] || rencanaRow[' uraian '] || 
                             `Item ${newData.length + 1}`;
              
              // Get status from rencana row
              const status = rencanaRow['Status'] || rencanaRow[' Status '] || 
                             rencanaRow['status'] || rencanaRow[' status '] || 'Aktif';
              
              // Get tahun (default to current year if not specified)
              const tahun = String(rencanaRow['Tahun'] || rencanaRow[' Tahun '] || 
                                  rencanaRow['tahun'] || rencanaRow[' tahun '] || 
                                  new Date().getFullYear());
              
              // Build rencana array from rencana row
              const rencana = months.map((month) => {
                const value = rencanaRow[month] || rencanaRow[` ${month} `] || 0;
                console.log(`[Excel Upload] Month ${month}: ${value}`);
                return value;
              });
              
              // Build realisasi array from realisasi row (if exists)
              const realisasi = realisasiRow ? months.map((month) => {
                return realisasiRow[month] || realisasiRow[` ${month} `] || 0;
              }) : months.map(() => 0);
              
              newData.push({
                id: Date.now() + newData.length,
                uraian,
                status,
                tahun,
                rencana,
                realisasi
              });
            }

            console.log('[Excel Upload] Mapped data:', newData);
            setMonthlyData(prevData => [...prevData, ...newData]);
            alert(`Berhasil upload ${newData.length} data ke tabel`);
          } catch (error) {
            console.error('Error parsing Excel:', error);
            alert('Gagal memproses file Excel. Pastikan format file benar.');
          }
        };
        reader.readAsArrayBuffer(file);
      }
    };
    input.click();
  };

  const handleAddMonthly = () => {
    const newItem = {
      id: Date.now(),
      uraian: 'Item Baru',
      status: 'Aktif',
      rencana: new Array(12).fill(0),
      realisasi: new Array(12).fill(0)
    };
    setMonthlyData(prevData => [...prevData, newItem]);
    handleEditMonthly(newItem);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [budgetRes, statsRes] = await Promise.all([
        api.get('/maintenance-budget'),
        api.get('/maintenance-budget/stats/summary')
      ]);
      
      if (budgetRes.data.success) {
        setBudgetData(budgetRes.data.data);
      }
      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = budgetData.filter(item => {
    const matchesSearch = !searchQuery || 
      item.lokasi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kategori.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !filterStatus || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const handleEdit = (item) => {
    setEditingItem(item.id);
    setEditForm({ ...item });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      await api.put(`/maintenance-budget/${editingItem}`, editForm);
      fetchData();
      setShowModal(false);
      setEditingItem(null);
      setEditForm({});
    } catch (error) {
      console.error('Error updating:', error);
      alert('Gagal mengupdate data');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus data ini?')) return;
    try {
      await api.delete(`/maintenance-budget/${id}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Gagal menghapus data');
    }
  };

  const handleExportCSV = () => {
    const headers = ['No', 'Kategori', 'Lokasi', 'Anggaran', 'Realisasi', 'Sisa', 'Progress', 'Status'];
    const rows = filteredData.map((item, index) => [
      index + 1,
      item.kategori,
      item.lokasi,
      item.anggaran,
      item.realisasi,
      item.sisa,
      item.progress,
      item.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `anggaran_pemeliharaan_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleExportExcel = () => {
    const data = filteredData.map((item, index) => ({
      'No': index + 1,
      'Kategori': item.kategori,
      'Lokasi': item.lokasi,
      'Anggaran': item.anggaran,
      'Realisasi': item.realisasi,
      'Sisa': item.sisa,
      'Progress': item.progress,
      'Status': item.status,
      'Tanggal': item.tanggal,
      'Keterangan': item.keterangan
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Anggaran Pemeliharaan');
    
    // Auto-size columns
    const colWidths = Object.keys(data[0] || {}).map(key => ({
      wch: Math.max(key.length, ...data.map(row => String(row[key]).length))
    }));
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `anggaran_pemeliharaan_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const StatCard = ({ title, value, icon: Icon, color, bgColor }) => (
    <div className="glass-card glass-card-hover overflow-hidden group relative">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="relative p-5 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className={`p-3 rounded-xl ${bgColor} bg-opacity-20 backdrop-blur-sm shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">{title}</p>
        </div>
        <p className="text-3xl font-bold text-white tracking-tight group-hover:scale-105 transition-transform duration-300">
          {typeof value === 'number' ? `Rp ${value.toLocaleString('id-ID')}` : value}
        </p>
      </div>
    </div>
  );

  // Calculate statistics from monthly table data
  const monthlyStats = useMemo(() => {
    if (!monthlyData || monthlyData.length === 0) {
      return {
        totalRencana: 0,
        totalRealisasi: 0,
        sisaAnggaran: 0,
        persentase: 0,
        totalItems: 0,
        activeItems: 0,
        completedItems: 0
      };
    }
    const totalRencana = monthlyData.reduce((sum, item) => sum + calculateTotal(item.rencana || []), 0);
    const totalRealisasi = monthlyData.reduce((sum, item) => sum + calculateTotal(item.realisasi || []), 0);
    const sisaAnggaran = totalRencana - totalRealisasi;
    const persentase = totalRencana > 0 ? ((totalRealisasi / totalRencana) * 100).toFixed(1) : 0;
    const totalItems = monthlyData.length;
    const activeItems = monthlyData.filter(item => item.status === 'Aktif').length;
    const completedItems = monthlyData.filter(item => item.status === 'Selesai').length;

    return {
      totalRencana,
      totalRealisasi,
      sisaAnggaran,
      persentase,
      totalItems,
      activeItems,
      completedItems
    };
  }, [monthlyData]);

  // Chart data from monthly table
  const monthlyChartData = useMemo(() => {
    if (!monthlyData || monthlyData.length === 0) {
      return months.map((month) => ({ month, rencana: 0, realisasi: 0 }));
    }
    return months.map((month, index) => {
      const rencanaSum = monthlyData.reduce((sum, item) => sum + ((item.rencana || [])[index] || 0), 0);
      const realisasiSum = monthlyData.reduce((sum, item) => sum + ((item.realisasi || [])[index] || 0), 0);
      return {
        month,
        rencana: rencanaSum > 0 ? rencanaSum : null,
        realisasi: realisasiSum > 0 ? realisasiSum : null
      };
    });
  }, [monthlyData]);

  const itemDistributionData = useMemo(() => {
    if (!monthlyData || monthlyData.length === 0) {
      return [];
    }
    const statusMap = { Aktif: 0, Selesai: 0 };
    monthlyData.forEach(item => {
      if (statusMap[item.status] !== undefined) {
        statusMap[item.status]++;
      }
    });
    return Object.entries(statusMap).map(([name, value]) => ({ name, value }));
  }, [monthlyData]);

  const chartData = {
    byCategory: useMemo(() => {
      const categoryMap = {};
      budgetData.forEach(item => {
        if (!categoryMap[item.kategori]) {
          categoryMap[item.kategori] = 0;
        }
        categoryMap[item.kategori] += item.anggaran || 0;
      });
      return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
    }, [budgetData]),

    byStatus: useMemo(() => {
      const statusMap = { pending: 0, progress: 0, selesai: 0 };
      budgetData.forEach(item => {
        if (statusMap[item.status] !== undefined) {
          statusMap[item.status] += item.anggaran || 0;
        }
      });
      return Object.entries(statusMap).map(([name, value]) => ({ name, value }));
    }, [budgetData]),

    monthlyTrend: useMemo(() => {
      const monthMap = {};
      budgetData.forEach(item => {
        if (item.tanggal) {
          const month = item.tanggal.substring(0, 7);
          if (!monthMap[month]) {
            monthMap[month] = { anggaran: 0, realisasi: 0 };
          }
          monthMap[month].anggaran += item.anggaran || 0;
          monthMap[month].realisasi += item.realisasi || 0;
        }
      });
      return Object.entries(monthMap)
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month));
    }, [budgetData])
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'linear-gradient(135deg, #0B1120 0%, #0F172A 50%, #111827 100%)' }}>
        <div className="w-10 h-10 rounded-full border-2 border-transparent animate-spin" style={{
          borderTopColor: '#3B82F6',
          borderRightColor: '#06B6D4',
          boxShadow: '0 0 12px rgba(59,130,246,0.3)',
        }} />
        <span className="ml-3 text-sm text-slate-400">Memuat data...</span>
      </div>
    );
  }

  try {
    return (
      <div className="min-h-screen overflow-y-auto" style={{ background: 'linear-gradient(135deg, #0B1120 0%, #0F172A 50%, #111827 100%)' }}>
        <div className="flex flex-col p-4 lg:p-6 gap-4">
        {/* Header */}
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Anggaran Pemeliharaan</h1>
              <p className="text-[#94A3B8] text-sm">Monitoring Anggaran Pemeliharaan Jalan Tol</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={fetchData}
                className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6]/10 hover:bg-[#3B82F6]/20 text-[#3B82F6] rounded-lg transition-all duration-200 border border-[#3B82F6]/20"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="text-sm font-medium">Refresh</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-[#10B981]/10 hover:bg-[#10B981]/20 text-[#10B981] rounded-lg transition-all duration-200 border border-[#10B981]/20"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm font-medium">Export CSV</span>
              </button>
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 text-[#F59E0B] rounded-lg transition-all duration-200 border border-[#F59E0B]/20"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="text-sm font-medium">Download</span>
              </button>
            </div>
          </div>
        </div>

        {/* Analytics Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="space-y-4"
        >
          {/* Summary Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleCardClick('all')}
              className="glass-card glass-card-hover overflow-hidden group relative rounded-2xl cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative p-5 text-center">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className="p-3 rounded-xl bg-[#3B82F6] bg-opacity-20 backdrop-blur-sm shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Wallet className="w-5 h-5 text-[#3B82F6]" />
                  </div>
                  <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Total Anggaran</p>
                </div>
                <motion.p 
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 100 }}
                  className="text-3xl font-bold text-white tracking-tight"
                >
                  Rp {monthlyStats.totalRencana.toLocaleString('id-ID')}
                </motion.p>
              </div>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleCardClick('realisasi')}
              className="glass-card glass-card-hover overflow-hidden group relative rounded-2xl cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative p-5 text-center">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className="p-3 rounded-xl bg-[#10B981] bg-opacity-20 backdrop-blur-sm shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="w-5 h-5 text-[#10B981]" />
                  </div>
                  <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Total Realisasi</p>
                </div>
                <motion.p 
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 100 }}
                  className="text-3xl font-bold text-white tracking-tight"
                >
                  Rp {monthlyStats.totalRealisasi.toLocaleString('id-ID')}
                </motion.p>
              </div>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleCardClick('sisa')}
              className="glass-card glass-card-hover overflow-hidden group relative rounded-2xl cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative p-5 text-center">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className="p-3 rounded-xl bg-[#F59E0B] bg-opacity-20 backdrop-blur-sm shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Activity className="w-5 h-5 text-[#F59E0B]" />
                  </div>
                  <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Sisa Anggaran</p>
                </div>
                <motion.p 
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 100 }}
                  className="text-3xl font-bold text-white tracking-tight"
                >
                  Rp {monthlyStats.sisaAnggaran.toLocaleString('id-ID')}
                </motion.p>
              </div>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleCardClick('active')}
              className="glass-card glass-card-hover overflow-hidden group relative rounded-2xl cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative p-5 text-center">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className="p-3 rounded-xl bg-[#06B6D4] bg-opacity-20 backdrop-blur-sm shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Percent className="w-5 h-5 text-[#06B6D4]" />
                  </div>
                  <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Persentase Serapan</p>
                </div>
                <motion.p 
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 100 }}
                  className="text-3xl font-bold text-white tracking-tight"
                >
                  {monthlyStats.persentase}%
                </motion.p>
              </div>
            </motion.div>
          </div>

          {/* Main Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="glass-card p-5 rounded-2xl"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Rekap Tahunan Berjalan</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} />
                  <YAxis stroke="#94A3B8" fontSize={12} tickFormatter={(value) => `${(value / 1000000).toFixed(0)} Juta`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#E2E8F0' }}
                    formatter={(value) => value ? `Rp ${value.toLocaleString('id-ID')}` : '-'}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="rencana" stroke="#3B82F6" strokeWidth={2} name="Rencana" dot={{ fill: '#3B82F6', r: 4 }} connectNulls={false} />
                  <Line type="monotone" dataKey="realisasi" stroke="#10B981" strokeWidth={2} name="Realisasi" dot={{ fill: '#10B981', r: 4 }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* Progress Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="glass-card p-5 rounded-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">Progress Serapan Anggaran</h3>
              <span className="text-2xl font-bold text-[#06B6D4]">{monthlyStats.persentase}%</span>
            </div>
            <div className="w-full h-4 bg-[#0F172A] rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${monthlyStats.persentase}%` }}
                transition={{ duration: 1, delay: 0.8 }}
                className="h-full bg-gradient-to-r from-[#3B82F6] via-[#06B6D4] to-[#10B981] rounded-full"
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-[#94A3B8]">
              <span>Rp {monthlyStats.totalRencana.toLocaleString('id-ID')} (Target)</span>
              <span>Rp {monthlyStats.totalRealisasi.toLocaleString('id-ID')} (Terealisasi)</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Monthly Budget Table Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="glass-card p-5 rounded-2xl"
        >
          {/* Toolbar */}
          <div className="flex flex-col lg:flex-row gap-4 mb-4 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Cari uraian..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#3B82F6]/50 transition-all duration-200 w-64"
                />
              </div>
              <select
                value={tableYear}
                onChange={(e) => setTableYear(e.target.value)}
                className="px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50 transition-all duration-200"
              >
                <option value="">Semua Tahun</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleUploadExcel}
                className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6]/10 hover:bg-[#3B82F6]/20 text-[#3B82F6] rounded-lg transition-all duration-200 border border-[#3B82F6]/20"
              >
                <Upload className="w-4 h-4" />
                <span className="text-sm font-medium">Upload</span>
              </button>
              <button
                onClick={handleTableExportExcel}
                className="flex items-center gap-2 px-4 py-2 bg-[#10B981]/10 hover:bg-[#10B981]/20 text-[#10B981] rounded-lg transition-all duration-200 border border-[#10B981]/20"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="text-sm font-medium">Excel</span>
              </button>
              <button
                onClick={handleTableExportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 text-[#F59E0B] rounded-lg transition-all duration-200 border border-[#F59E0B]/20"
              >
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">PDF</span>
              </button>
              <button
                onClick={handleTablePrint}
                className="flex items-center gap-2 px-4 py-2 bg-[#8B5CF6]/10 hover:bg-[#8B5CF6]/20 text-[#8B5CF6] rounded-lg transition-all duration-200 border border-[#8B5CF6]/20"
              >
                <Printer className="w-4 h-4" />
                <span className="text-sm font-medium">Print</span>
              </button>
              <button
                onClick={handleAddMonthly}
                className="flex items-center gap-2 px-4 py-2 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] rounded-lg transition-all duration-200 border border-[#EF4444]/20"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Tambah</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gradient-to-r from-[#1E3A5F] to-[#0F2744]">
                <tr>
                  <th className="px-4 py-3 font-semibold text-white border-b border-white/10" rowSpan={3}>NO</th>
                  <th className="px-4 py-3 font-semibold text-white border-b border-white/10" rowSpan={3}>Uraian</th>
                  <th className="px-4 py-3 font-semibold text-white border-b border-white/10" rowSpan={3}>Status</th>
                  <th className="px-4 py-3 font-semibold text-white border-b border-white/10" colSpan={12}>{tableYear}</th>
                  <th className="px-4 py-3 font-semibold text-white border-b border-white/10" colSpan={2}>Total</th>
                  <th className="px-4 py-3 font-semibold text-white border-b border-white/10" rowSpan={3}>Aksi</th>
                </tr>
                <tr>
                  {months.map(month => (
                    <th key={month} className="px-2 py-2 font-medium text-[#94A3B8] border-b border-white/10 text-center">
                      {month.substring(0, 3)}
                    </th>
                  ))}
                  <th className="px-4 py-2 font-medium text-[#10B981] border-b border-white/10 text-center">Rencana</th>
                  <th className="px-4 py-2 font-medium text-[#06B6D4] border-b border-white/10 text-center">Realisasi</th>
                </tr>
              </thead>
              <tbody>
                {tablePaginatedData.map((item, index) => {
                  const itemNumber = (tablePage - 1) * tableItemsPerPage + index + 1;
                  const totalRencana = calculateTotal(item.rencana);
                  const totalRealisasi = calculateTotal(item.realisasi);
                  
                  return (
                    <>
                      {/* Rencana Row */}
                      <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 text-white font-semibold text-center" rowSpan={2}>{itemNumber}</td>
                        <td className="px-4 py-3 text-white" rowSpan={2}>{item.uraian}</td>
                        <td className="px-4 py-3 text-[#3B82F6] font-semibold bg-[#3B82F6]/10">Rencana</td>
                        {item.rencana.map((val, i) => (
                          <td key={i} className="px-2 py-3 text-right text-white font-medium">{formatRupiah(val)}</td>
                        ))}
                        <td className="px-4 py-3 text-right text-white font-semibold bg-[#10B981]/10">{formatRupiah(totalRencana)}</td>
                        <td className="px-4 py-3 text-right text-[#94A3B8]">-</td>
                        <td className="px-4 py-3 text-center" rowSpan={2}>
                          <div className="flex gap-2 justify-center">
                            <button className="p-1.5 hover:bg-[#3B82F6]/20 text-[#3B82F6] rounded transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditMonthly(item)}
                              className="p-1.5 hover:bg-[#F59E0B]/20 text-[#F59E0B] rounded transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteMonthly(item.id)}
                              className="p-1.5 hover:bg-[#EF4444]/20 text-[#EF4444] rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {/* Realisasi Row */}
                      <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 text-[#10B981] font-semibold bg-[#10B981]/10">Realisasi</td>
                        {item.realisasi.map((val, i) => (
                          <td key={i} className="px-2 py-3 text-right text-white font-medium">{formatRupiah(val)}</td>
                        ))}
                        <td className="px-4 py-3 text-right text-[#94A3B8]">-</td>
                        <td className="px-4 py-3 text-right text-white font-semibold bg-[#06B6D4]/10">{formatRupiah(totalRealisasi)}</td>
                      </tr>
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between mt-4 pt-4 border-t border-white/5">
            <p className="text-sm text-[#94A3B8] mb-3 sm:mb-0">
              Menampilkan {((tablePage - 1) * tableItemsPerPage) + 1} - {Math.min(tablePage * tableItemsPerPage, filteredMonthlyData.length)} dari {filteredMonthlyData.length} item
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setTablePage(prev => Math.max(1, prev - 1))}
                disabled={tablePage === 1}
                className="px-3 py-1 bg-[#0F172A]/50 border border-white/10 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5 transition-colors text-sm"
              >
                Prev
              </button>
              <span className="px-3 py-1 text-[#94A3B8] text-sm">
                {tablePage} / {tableTotalPages}
              </span>
              <button
                onClick={() => setTablePage(prev => Math.min(tableTotalPages, prev + 1))}
                disabled={tablePage >= tableTotalPages}
                className="px-3 py-1 bg-[#0F172A]/50 border border-white/10 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5 transition-colors text-sm"
              >
                Next
              </button>
            </div>
          </div>
        </motion.div>

        {/* Monthly Edit Modal */}
        {showMonthlyModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#1E293B] rounded-2xl p-6 w-full max-w-2xl border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Edit Data Bulanan</h3>
                <button onClick={() => setShowMonthlyModal(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#94A3B8] mb-1">Uraian</label>
                  <input
                    type="text"
                    value={monthlyEditForm.uraian || ''}
                    onChange={(e) => setMonthlyEditForm({ ...monthlyEditForm, uraian: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94A3B8] mb-1">Tahun</label>
                  <select
                    value={monthlyEditForm.tahun || '2026'}
                    onChange={(e) => setMonthlyEditForm({ ...monthlyEditForm, tahun: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50"
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94A3B8] mb-2">Anggaran Rencana per Bulan</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {months.map((month, index) => (
                      <div key={month}>
                        <label className="block text-xs text-[#94A3B8] mb-1">{month}</label>
                        <input
                          type="number"
                          value={monthlyEditForm.rencana?.[index] || 0}
                          onChange={(e) => {
                            const newRencana = [...(monthlyEditForm.rencana || new Array(12).fill(0))];
                            newRencana[index] = parseFloat(e.target.value) || 0;
                            setMonthlyEditForm({ ...monthlyEditForm, rencana: newRencana });
                          }}
                          className="w-full px-3 py-2 bg-[#0F172A]/50 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-[#3B82F6]/50 [-moz-appearance:_textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94A3B8] mb-2">Realisasi per Bulan</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {months.map((month, index) => (
                      <div key={month}>
                        <label className="block text-xs text-[#94A3B8] mb-1">{month}</label>
                        <input
                          type="number"
                          value={monthlyEditForm.realisasi?.[index] || 0}
                          onChange={(e) => {
                            const newRealisasi = [...(monthlyEditForm.realisasi || new Array(12).fill(0))];
                            newRealisasi[index] = parseFloat(e.target.value) || 0;
                            setMonthlyEditForm({ ...monthlyEditForm, realisasi: newRealisasi });
                          }}
                          className="w-full px-3 py-2 bg-[#0F172A]/50 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-[#3B82F6]/50 [-moz-appearance:_textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveMonthly}
                  className="flex-1 px-4 py-2 bg-[#3B82F6] hover:bg-[#3B82F6]/80 text-white rounded-lg transition-colors font-medium"
                >
                  Simpan
                </button>
                <button
                  onClick={() => setShowMonthlyModal(false)}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-medium"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#1E293B] rounded-2xl p-6 w-full max-w-lg border border-white/10 shadow-2xl">
              <h3 className="text-xl font-semibold text-white mb-4">Edit Data</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#94A3B8] mb-1">Kategori</label>
                  <select
                    value={editForm.kategori || ''}
                    onChange={(e) => setEditForm({ ...editForm, kategori: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50"
                  >
                    <option value="Perbaikan Jalan">Perbaikan Jalan</option>
                    <option value="Drainase">Drainase</option>
                    <option value="Lampu PJU">Lampu PJU</option>
                    <option value="Marka Jalan">Marka Jalan</option>
                    <option value="Guardrail">Guardrail</option>
                    <option value="Landscape">Landscape</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94A3B8] mb-1">Lokasi</label>
                  <input
                    type="text"
                    value={editForm.lokasi || ''}
                    onChange={(e) => setEditForm({ ...editForm, lokasi: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#94A3B8] mb-1">Anggaran</label>
                    <input
                      type="number"
                      value={editForm.anggaran || ''}
                      onChange={(e) => setEditForm({ ...editForm, anggaran: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#94A3B8] mb-1">Realisasi</label>
                    <input
                      type="number"
                      value={editForm.realisasi || ''}
                      onChange={(e) => setEditForm({ ...editForm, realisasi: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#94A3B8] mb-1">Progress (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editForm.progress || ''}
                      onChange={(e) => setEditForm({ ...editForm, progress: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#94A3B8] mb-1">Status</label>
                    <select
                      value={editForm.status || ''}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50"
                    >
                      <option value="pending">Pending</option>
                      <option value="progress">Progress</option>
                      <option value="selesai">Selesai</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94A3B8] mb-1">Keterangan</label>
                  <textarea
                    value={editForm.keterangan || ''}
                    onChange={(e) => setEditForm({ ...editForm, keterangan: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-[#3B82F6] hover:bg-[#3B82F6]/80 text-white rounded-lg transition-colors font-medium"
                >
                  Simpan
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-medium"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Card Detail Modal */}
        {showDetailModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#1E293B] rounded-2xl p-6 w-full max-w-lg border border-white/10 shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-white">
                  {detailCardType === 'all' && 'Detail Total Anggaran'}
                  {detailCardType === 'realisasi' && 'Detail Total Realisasi'}
                  {detailCardType === 'sisa' && 'Detail Sisa Anggaran'}
                  {detailCardType === 'active' && 'Detail Persentase Serapan'}
                </h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-1 hover:bg-white/10 rounded-lg text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                {detailCardType === 'all' && (
                  <>
                    <div className="p-4 bg-[#0F172A]/50 rounded-lg border border-white/10">
                      <p className="text-sm text-[#94A3B8] mb-2">Total Anggaran</p>
                      <p className="text-2xl font-bold text-[#3B82F6]">Rp {monthlyStats.totalRencana.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-[#0F172A]/50 rounded-lg border border-white/10">
                        <p className="text-sm text-[#94A3B8] mb-2">Total Item</p>
                        <p className="text-xl font-bold text-white">{monthlyStats.totalItems}</p>
                      </div>
                      <div className="p-4 bg-[#0F172A]/50 rounded-lg border border-white/10">
                        <p className="text-sm text-[#94A3B8] mb-2">Item Aktif</p>
                        <p className="text-xl font-bold text-[#10B981]">{monthlyStats.activeItems}</p>
                      </div>
                    </div>
                  </>
                )}
                
                {detailCardType === 'realisasi' && (
                  <>
                    <div className="p-4 bg-[#0F172A]/50 rounded-lg border border-white/10">
                      <p className="text-sm text-[#94A3B8] mb-2">Total Realisasi</p>
                      <p className="text-2xl font-bold text-[#10B981]">Rp {monthlyStats.totalRealisasi.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="p-4 bg-[#0F172A]/50 rounded-lg border border-white/10">
                      <p className="text-sm text-[#94A3B8] mb-2">Persentase Serapan</p>
                      <p className="text-xl font-bold text-[#06B6D4]">{monthlyStats.persentase}%</p>
                    </div>
                    <div className="p-4 bg-[#0F172A]/50 rounded-lg border border-white/10">
                      <p className="text-sm text-[#94A3B8] mb-2">Item Selesai</p>
                      <p className="text-xl font-bold text-white">{monthlyStats.completedItems}</p>
                    </div>
                  </>
                )}
                
                {detailCardType === 'sisa' && (
                  <>
                    <div className="p-4 bg-[#0F172A]/50 rounded-lg border border-white/10">
                      <p className="text-sm text-[#94A3B8] mb-2">Sisa Anggaran</p>
                      <p className="text-2xl font-bold text-[#F59E0B]">Rp {monthlyStats.sisaAnggaran.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="p-4 bg-[#0F172A]/50 rounded-lg border border-white/10">
                      <p className="text-sm text-[#94A3B8] mb-2">Persentase Tersisa</p>
                      <p className="text-xl font-bold text-white">
                        {((monthlyStats.sisaAnggaran / monthlyStats.totalRencana) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-4 bg-[#0F172A]/50 rounded-lg border border-white/10">
                      <p className="text-sm text-[#94A3B8] mb-2">Status</p>
                      <p className="text-xl font-bold text-white">
                        {monthlyStats.persentase >= 100 ? 'Lengkap' : 'Belum Lengkap'}
                      </p>
                    </div>
                  </>
                )}
                
                {detailCardType === 'active' && (
                  <>
                    <div className="p-4 bg-[#0F172A]/50 rounded-lg border border-white/10">
                      <p className="text-sm text-[#94A3B8] mb-2">Persentase Serapan</p>
                      <p className="text-2xl font-bold text-[#06B6D4]">{monthlyStats.persentase}%</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-[#0F172A]/50 rounded-lg border border-white/10">
                        <p className="text-sm text-[#94A3B8] mb-2">Total Realisasi</p>
                        <p className="text-lg font-bold text-[#10B981]">Rp {monthlyStats.totalRealisasi.toLocaleString('id-ID')}</p>
                      </div>
                      <div className="p-4 bg-[#0F172A]/50 rounded-lg border border-white/10">
                        <p className="text-sm text-[#94A3B8] mb-2">Sisa Anggaran</p>
                        <p className="text-lg font-bold text-[#F59E0B]">Rp {monthlyStats.sisaAnggaran.toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                    <div className="w-full h-4 bg-[#0F172A] rounded-full overflow-hidden mt-4">
                      <div 
                        className="h-full bg-gradient-to-r from-[#3B82F6] via-[#06B6D4] to-[#10B981] rounded-full transition-all duration-1000"
                        style={{ width: `${monthlyStats.persentase}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
              
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-full mt-6 px-4 py-2 bg-[#3B82F6] hover:bg-[#3B82F6]/80 text-white rounded-lg transition-colors font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    );
  } catch (error) {
    console.error('Error rendering AnggaranPemeliharaan:', error);
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'linear-gradient(135deg, #0B1120 0%, #0F172A 50%, #111827 100%)' }}>
        <div className="text-center">
          <p className="text-white text-lg mb-4">Terjadi kesalahan saat memuat halaman</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg">
            Refresh Halaman
          </button>
        </div>
      </div>
    );
  }
};

export default AnggaranPemeliharaan;
