import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import { 
  Search, 
  Bell, 
  User, 
  ChevronDown,
  AlertTriangle,
  Wrench,
  Camera,
  XCircle,
  Image as ImageIcon,
  Download,
  RefreshCw,
  Plus,
  Eye,
  Edit,
  Upload,
  FileDown,
  Trash2,
  FileSpreadsheet,
  FileText
} from 'lucide-react';

// Initial data constant - defined outside component to prevent recreation on render
const INITIAL_TABLE_DATA = [
  { 
    id: 1, 
    kategori: 'Kondisi Jalan Tol (Lubang)',
    groupId: 1,
    no: 1,
    lokasi: 'KM 102+500 - KM 103+000',
    jalur: 'Jalur A',
    km: '102+500',
    foto: 'https://via.placeholder.com/150x100/1E293B/3B82F6?text=FOTO+1',
    keterangan: 'Terdapat lubang berukuran 30cm x 30cm dengan kedalaman 5cm di jalur lambat. Perlu perbaikan segera untuk menghindari kecelakaan.',
    rencanaTindakLanjut: 'Perbaikan dengan cold mix dan compactor',
    target: '2026-01-30',
    realisasiTindakLanjut: 'Perbaikan telah dilakukan dengan cold mix, compactor, dan finishing dengan aspal hotmix. Area sekitar juga diperbaiki.',
    fotoTindakLanjut: 'https://via.placeholder.com/150x100/1E293B/10B981?text=FOTO+TL+1',
    tanggalTindakLanjut: '2026-01-28'
  },
  { 
    id: 2, 
    kategori: 'Kondisi Jalan Tol (Lubang)',
    groupId: 1,
    no: 2,
    lokasi: 'KM 78+200 - KM 78+500',
    jalur: 'Jalur B',
    km: '78+200',
    foto: 'https://via.placeholder.com/150x100/1E293B/F59E0B?text=FOTO+2',
    keterangan: 'Lubang kecil berukuran 20cm x 20cm. Kondisi masih aman namun perlu monitoring berkala.',
    rencanaTindakLanjut: 'Monitoring dan perbaikan jika memburuk',
    target: '2026-02-15',
    realisasiTindakLanjut: 'Monitoring rutin dilakukan setiap minggu. Kondisi lubang stabil, tidak membesar.',
    fotoTindakLanjut: 'https://via.placeholder.com/150x100/1E293B/3B82F6?text=FOTO+TL+2',
    tanggalTindakLanjut: '2026-02-10'
  },
  { 
    id: 3, 
    kategori: 'Kondisi Jalan Tol (Lubang)',
    groupId: 1,
    no: 3,
    lokasi: 'KM 45+800 - KM 46+000',
    jalur: 'Jalur A',
    km: '45+800',
    foto: 'https://via.placeholder.com/150x100/1E293B/EF4444?text=FOTO+3',
    keterangan: 'Lubang besar berukuran 50cm x 50cm dengan kedalaman 10cm. Sangat berbahaya untuk pengendara.',
    rencanaTindakLanjut: 'Perbaikan total dengan penggantian lapisan aspal',
    target: '2026-02-28',
    realisasiTindakLanjut: 'Belum dilakukan',
    fotoTindakLanjut: null,
    tanggalTindakLanjut: null
  },
  { 
    id: 4, 
    kategori: 'Kondisi Marka Jalan',
    groupId: 2,
    no: 1,
    lokasi: 'KM 120+100 - KM 120+500',
    jalur: 'Jalur A',
    km: '120+100',
    foto: 'https://via.placeholder.com/150x100/1E293B/06B6D4?text=FOTO+4',
    keterangan: 'Marka jalur memudar dan tidak terlihat jelas. Perlu repainting.',
    rencanaTindakLanjut: 'Repainting marka dengan cat thermoplastic',
    target: '2026-02-10',
    realisasiTindakLanjut: 'Repainting telah selesai dengan cat thermoplastic berwarna putih. Marka kini terlihat jelas.',
    fotoTindakLanjut: 'https://via.placeholder.com/150x100/1E293B/10B981?text=FOTO+TL+4',
    tanggalTindakLanjut: '2026-02-08'
  },
  { 
    id: 5, 
    kategori: 'Kondisi Marka Jalan',
    groupId: 2,
    no: 2,
    lokasi: 'KM 89+300 - KM 89+700',
    jalur: 'Jalur B',
    km: '89+300',
    foto: 'https://via.placeholder.com/150x100/1E293B/8B5CF6?text=FOTO+5',
    keterangan: 'Marka pembatas jalur rusak dan terkelupas di beberapa titik.',
    rencanaTindakLanjut: 'Perbaikan marka pembatas jalur',
    target: '2026-02-20',
    realisasiTindakLanjut: 'Perbaikan sedang berlangsung',
    fotoTindakLanjut: 'https://via.placeholder.com/150x100/1E293B/F59E0B?text=FOTO+TL+5',
    tanggalTindakLanjut: '2026-02-18'
  }
];

const MonitoringSPMWTR = () => {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [addFormData, setAddFormData] = useState({
    ruasTol: '',
    lokasi: '',
    jenisTemuan: '',
    tanggalTemuan: '',
    status: 'Progress',
    pic: '',
    deadline: ''
  });
  const [editFormData, setEditFormData] = useState({
    ruasTol: '',
    lokasi: '',
    jenisTemuan: '',
    tanggalTemuan: '',
    status: 'Progress',
    pic: '',
    deadline: ''
  });

  // Categories state - load from localStorage or use empty array (manual entry only)
  const [categories, setCategories] = useState(() => {
    try {
      const savedCategories = localStorage.getItem('monitoringSPMCategories');
      return savedCategories ? JSON.parse(savedCategories) : [];
    } catch (error) {
      console.error('Error loading categories from localStorage:', error);
      return [];
    }
  });
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [showEditCategoryInput, setShowEditCategoryInput] = useState(false);
  const [newEditCategory, setNewEditCategory] = useState('');
  
  // Jalur options state - load from localStorage or use empty array (manual entry only)
  const [jalurOptions, setJalurOptions] = useState(() => {
    try {
      const savedJalurOptions = localStorage.getItem('monitoringSPMJalurOptions');
      return savedJalurOptions ? JSON.parse(savedJalurOptions) : [];
    } catch (error) {
      console.error('Error loading jalur options from localStorage:', error);
      return [];
    }
  });
  const [showNewJalurInput, setShowNewJalurInput] = useState(false);
  const [newJalur, setNewJalur] = useState('');
  const [showEditJalurInput, setShowEditJalurInput] = useState(false);
  const [newEditJalur, setNewEditJalur] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [excelImportFile, setExcelImportFile] = useState(null);
  
  // Group management state
  const [groups, setGroups] = useState(() => {
    try {
      const savedGroups = localStorage.getItem('monitoringSPMGroups');
      return savedGroups ? JSON.parse(savedGroups) : [
        { id: 1, name: 'Kondisi Jalan Tol (Lubang)', color: '#3B82F6' },
        { id: 2, name: 'Kondisi Marka Jalan', color: '#10B981' },
        { id: 3, name: 'Kondisi Guardrail', color: '#F59E0B' },
        { id: 4, name: 'Kondisi Reflektor', color: '#EF4444' },
        { id: 5, name: 'Kondisi Drainase', color: '#8B5CF6' }
      ];
    } catch (error) {
      console.error('Error loading groups from localStorage:', error);
      return [
        { id: 1, name: 'Kondisi Jalan Tol (Lubang)', color: '#3B82F6' },
        { id: 2, name: 'Kondisi Marka Jalan', color: '#10B981' },
        { id: 3, name: 'Kondisi Guardrail', color: '#F59E0B' },
        { id: 4, name: 'Kondisi Reflektor', color: '#EF4444' },
        { id: 5, name: 'Kondisi Drainase', color: '#8B5CF6' }
      ];
    }
  });
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#3B82F6');
  
  // Card detail modal state
  const [showCardDetailModal, setShowCardDetailModal] = useState(false);
  const [selectedCardType, setSelectedCardType] = useState(null);

  // Load data from localStorage on mount, or use initial data
  const [tableData, setTableData] = useState(() => {
    try {
      const savedData = localStorage.getItem('monitoringSPMData');
      return savedData ? JSON.parse(savedData) : INITIAL_TABLE_DATA;
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
      return INITIAL_TABLE_DATA;
    }
  });

  // Calculate KPI data dynamically from tableData
  const kpiData = {
    totalTemuan: tableData.length,
    totalPerbaikan: tableData.filter(item => item.realisasiTindakLanjut && item.realisasiTindakLanjut.trim() !== '' && item.realisasiTindakLanjut !== 'Belum dilakukan').length,
    belumSelesai: tableData.filter(item => !item.realisasiTindakLanjut || item.realisasiTindakLanjut.trim() === '' || item.realisasiTindakLanjut === 'Belum dilakukan').length,
    dokumentasiFoto: tableData.filter(item => item.foto && item.foto.trim() !== '').length + tableData.filter(item => item.fotoTindakLanjut && item.fotoTindakLanjut.trim() !== '').length
  };

  // Calculate status chart data dynamically from tableData
  const totalItems = tableData.length;
  const selesaiCount = tableData.filter(item => item.realisasiTindakLanjut && item.realisasiTindakLanjut.trim() !== '' && item.realisasiTindakLanjut !== 'Belum dilakukan' && item.tanggalTindakLanjut && item.tanggalTindakLanjut.trim() !== '').length;
  const progressCount = tableData.filter(item => item.realisasiTindakLanjut && item.realisasiTindakLanjut.trim() !== '' && item.realisasiTindakLanjut !== 'Belum dilakukan' && (!item.tanggalTindakLanjut || item.tanggalTindakLanjut.trim() === '')).length;
  const belumDikerjakanCount = tableData.filter(item => !item.realisasiTindakLanjut || item.realisasiTindakLanjut.trim() === '' || item.realisasiTindakLanjut === 'Belum dilakukan').length;

  // Calculate percentages for chart
  const selesaiPercent = totalItems > 0 ? (selesaiCount / totalItems) * 100 : 0;
  const progressPercent = totalItems > 0 ? (progressCount / totalItems) * 100 : 0;
  const belumPercent = totalItems > 0 ? (belumDikerjakanCount / totalItems) * 100 : 0;

  // Calculate stroke-dasharray values (circumference is ~100 for r=15.915)
  const selesaiStroke = `${selesaiPercent} ${100 - selesaiPercent}`;
  const progressStroke = `${progressPercent} ${100 - progressPercent}`;
  const belumStroke = `${belumPercent} ${100 - belumPercent}`;

  // Calculate stroke-dashoffset values
  const selesaiOffset = 25; // Start from top
  const progressOffset = 25 - selesaiPercent;
  const belumOffset = 25 - selesaiPercent - progressPercent;

  const statusChartData = [
    { name: 'Selesai', value: selesaiCount, color: '#10B981' },
    { name: 'Progress', value: progressCount, color: '#3B82F6' },
    { name: 'Belum Dikerjakan', value: belumDikerjakanCount, color: '#EF4444' }
  ];

  // Calculate photo gallery dynamically from tableData - include both foto and fotoTindakLanjut as separate entries
  const photoGallery = [];
  tableData.forEach((item) => {
    // Add initial foto if exists
    if (item.foto && item.foto.trim() !== '') {
      photoGallery.push({
        id: `foto-${item.id}`,
        lokasi: item.lokasi || item.km || 'Lokasi tidak diketahui',
        tanggal: item.target || 'Tanggal tidak diketahui',
        status: item.realisasiTindakLanjut && item.realisasiTindakLanjut.trim() !== '' && item.realisasiTindakLanjut !== 'Belum dilakukan' ? 'Selesai' : (item.realisasiTindakLanjut && item.realisasiTindakLanjut.trim() !== '' && item.realisasiTindakLanjut !== 'Belum dilakukan' && (!item.tanggalTindakLanjut || item.tanggalTindakLanjut.trim() === '') ? 'Progress' : 'Belum Dikerjakan'),
        image: item.foto,
        type: 'foto_awal'
      });
    }
    // Add foto tindak lanjut if exists
    if (item.fotoTindakLanjut && item.fotoTindakLanjut.trim() !== '') {
      photoGallery.push({
        id: `foto-tl-${item.id}`,
        lokasi: item.lokasi || item.km || 'Lokasi tidak diketahui',
        tanggal: item.tanggalTindakLanjut || item.target || 'Tanggal tidak diketahui',
        status: 'Selesai',
        image: item.fotoTindakLanjut,
        type: 'foto_tl'
      });
    }
  });

  const filteredData = tableData.filter(item => {
    const matchesSearch = !searchQuery || 
      item.lokasi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.jalur.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.km.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.keterangan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.rencanaTindakLanjut.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Selesai':
        return 'bg-[#10B981]/20 text-[#10B981]';
      case 'Progress':
        return 'bg-[#3B82F6]/20 text-[#3B82F6]';
      case 'Belum Dikerjakan':
        return 'bg-[#EF4444]/20 text-[#EF4444]';
      default:
        return 'bg-[#94A3B8]/20 text-[#94A3B8]';
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Selesai':
        return 'bg-[#10B981]';
      case 'Progress':
        return 'bg-[#3B82F6]';
      case 'Belum Dikerjakan':
        return 'bg-[#EF4444]';
        return 'bg-[#94A3B8]';
    }
  };

  // Simple table data - no grouping applied
  const tableDataToDisplay = paginatedData;

  const handleOpenAddModal = () => {
    setAddFormData({
      kategori: 'Kondisi Jalan Tol (Lubang)',
      groupId: groups[0]?.id || 1,
      lokasi: '',
      jalur: 'Jalur A',
      km: '',
      foto: null,
      keterangan: '',
      rencanaTindakLanjut: '',
      target: '',
      realisasiTindakLanjut: '',
      fotoTindakLanjut: null,
      tanggalTindakLanjut: ''
    });
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
  };

  const handleSaveAdd = () => {
    const newItem = {
      id: Date.now(),
      no: tableData.length + 1,
      ...addFormData
    };
    const newData = [newItem, ...tableData];
    setTableData(newData);
    setShowAddModal(false);
    
    // Persist to localStorage
    try {
      localStorage.setItem('monitoringSPMData', JSON.stringify(newData));
      console.log('Data saved to localStorage successfully');
    } catch (error) {
      console.error('Error saving data to localStorage:', error);
    }
  };

  const handleExportPDF = () => {
    // Create a printable HTML version of the table
    const printWindow = window.open('', '_blank');
    const printContent = `
      <html>
        <head>
          <title>Monitoring SPM Jalan Tol</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid black; padding: 8px; text-align: center; }
            th { background-color: #1E293B; color: white; }
            img { max-width: 100px; max-height: 80px; }
            .category-row { background-color: #334155; color: white; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1 style="text-align: center;">Monitoring SPM Jalan Tol</h1>
          <p style="text-align: center; margin-bottom: 20px;">Monitoring Temuan dan Status Perbaikan</p>
          <table>
            <thead>
              <tr>
                <th>NO</th>
                <th>LOKASI</th>
                <th>JALUR</th>
                <th>KM</th>
                <th>FOTO</th>
                <th>KETERANGAN</th>
                <th>RENCANA TINDAK LANJUT</th>
                <th>TARGET</th>
                <th>REALISASI TINDAK LANJUT</th>
                <th>FOTO TINDAK LANJUT</th>
                <th>TANGGAL TINDAK LANJUT</th>
              </tr>
            </thead>
            <tbody>
              ${filteredData.map(item => `
                <tr>
                  <td>${item.no}</td>
                  <td>${item.lokasi}</td>
                  <td>${item.jalur}</td>
                  <td>${item.km}</td>
                  <td>${item.foto ? `<img src="${item.foto}" alt="Foto" />` : '-'}</td>
                  <td style="text-align: left;">${item.keterangan}</td>
                  <td style="text-align: left;">${item.rencanaTindakLanjut}</td>
                  <td>${item.target}</td>
                  <td style="text-align: left;">${item.realisasiTindakLanjut}</td>
                  <td>${item.fotoTindakLanjut ? `<img src="${item.fotoTindakLanjut}" alt="Foto TL" />` : '-'}</td>
                  <td>${item.tanggalTindakLanjut || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExportExcel = () => {
    // Group data by category for export
    const groupedData = filteredData.reduce((acc, item) => {
      if (!acc[item.kategori]) {
        acc[item.kategori] = [];
      }
      acc[item.kategori].push(item);
      return acc;
    }, {});

    const flatData = Object.entries(groupedData).flatMap(([kategori, items]) => [
      { type: 'category', name: kategori },
      ...items
    ]);

    // Create HTML content that Excel can open
    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid black; padding: 8px; text-align: center; font-size: 11px; }
          th { background-color: #1E293B; color: white; font-weight: bold; }
          .category-row { background-color: #334155; color: white; font-weight: bold; }
          img { max-width: 100px; max-height: 80px; }
          .text-left { text-align: left; }
        </style>
      </head>
      <body>
        <h2 style="text-align: center; margin-bottom: 10px;">Monitoring SPM Jalan Tol</h2>
        <p style="text-align: center; margin-bottom: 20px; font-size: 12px;">Monitoring Temuan dan Status Perbaikan</p>
        <table>
          <thead>
            <tr>
              <th>NO</th>
              <th>LOKASI</th>
              <th>JALUR</th>
              <th>KM</th>
              <th>FOTO</th>
              <th>KETERANGAN</th>
              <th>RENCANA TINDAK LANJUT</th>
              <th>TARGET</th>
              <th>REALISASI TINDAK LANJUT</th>
              <th>FOTO TINDAK LANJUT</th>
              <th>TANGGAL TINDAK LANJUT</th>
            </tr>
          </thead>
          <tbody>
            ${flatData.map(item => {
              if (item.type === 'category') {
                return `<tr class="category-row"><td colspan="12">${item.name}</td></tr>`;
              }
              return `
                <tr>
                  <td>${item.no}</td>
                  <td>${item.lokasi}</td>
                  <td>${item.jalur}</td>
                  <td>${item.km}</td>
                  <td>${item.foto ? `<img src="${item.foto}" alt="Foto" />` : '-'}</td>
                  <td class="text-left">${item.keterangan}</td>
                  <td class="text-left">${item.rencanaTindakLanjut}</td>
                  <td>${item.target}</td>
                  <td class="text-left">${item.realisasiTindakLanjut}</td>
                  <td>${item.fotoTindakLanjut ? `<img src="${item.fotoTindakLanjut}" alt="Foto TL" />` : '-'}</td>
                  <td>${item.tanggalTindakLanjut || '-'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    // Create and download the HTML file (Excel can open HTML files)
    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `monitoring-spm-${new Date().toISOString().split('T')[0]}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRefresh = () => {
    if (window.confirm('Apakah Anda yakin ingin mereset semua data ke kondisi awal? Semua perubahan akan hilang.')) {
      setTableData(INITIAL_TABLE_DATA);
      setSearchQuery('');
      setCurrentPage(1);
      // Clear localStorage to reset to initial state
      try {
        localStorage.removeItem('monitoringSPMData');
        console.log('localStorage cleared successfully');
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
    }
  };

  const handleImportExcel = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx, .xls';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = event.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            
            console.log('Excel file loaded successfully');
            console.log('Number of sheets:', workbook.SheetNames.length);
            console.log('Sheet names:', workbook.SheetNames);
            
            let jsonData = [];
            let usedSheetName = '';
            
            // Try to read data from the first sheet that has data
            for (const sheetName of workbook.SheetNames) {
              const sheet = workbook.Sheets[sheetName];
              const sheetData = XLSX.utils.sheet_to_json(sheet);
              console.log(`Sheet "${sheetName}" has ${sheetData.length} rows`);
              
              if (sheetData.length > 0) {
                jsonData = sheetData;
                usedSheetName = sheetName;
                console.log(`Using sheet "${sheetName}" with ${sheetData.length} rows`);
                break;
              }
            }
            
            console.log('Raw JSON data:', jsonData);
            console.log('Number of rows:', jsonData.length);
            
            if (jsonData.length === 0) {
              alert('File Excel kosong atau tidak memiliki data. Pastikan file memiliki data di salah satu sheet.');
              return;
            }

            // Get the first row to see the column names
            console.log('Column names from first row:', Object.keys(jsonData[0]));
            
            // Also try reading as array to check structure
            const sheet = workbook.Sheets[usedSheetName];
            const arrayData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            console.log('Array format data:', arrayData);
            console.log('Array data length:', arrayData.length);

            // Helper function to get value from row with multiple possible keys
            const getValue = (row, possibleKeys) => {
              for (const key of possibleKeys) {
                if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
                  return row[key];
                }
              }
              return '';
            };

            // Map Excel data to table data structure with more flexible column matching
            const importedData = jsonData.map((row, index) => {
              const item = {
                id: Date.now() + index,
                kategori: getValue(row, ['KATEGORI', 'kategori', 'Kategori', 'Category', 'category']),
                no: getValue(row, ['NO', 'no', 'No', 'Nomor', 'nomor', 'Number', 'number']) || index + 1,
                lokasi: getValue(row, ['LOKASI', 'lokasi', 'Lokasi', 'Location', 'location']),
                jalur: getValue(row, ['JALUR', 'jalur', 'Jalur', 'Lane', 'lane', 'Jalur A', 'Jalur B', 'Jalur C']),
                km: getValue(row, ['KM', 'km', 'Km', 'Kilometer', 'kilometer']),
                foto: getValue(row, ['FOTO', 'foto', 'Foto', 'Photo', 'photo', 'Image', 'image']) || null,
                keterangan: getValue(row, ['KETERANGAN', 'keterangan', 'Keterangan', 'Description', 'description', 'Ket', 'ket']),
                rencanaTindakLanjut: getValue(row, ['RENCANA TINDAK LANJUT', 'rencana tindak lanjut', 'Rencana Tindak Lanjut', 'rencanaTindakLanjut', 'Rencana', 'rencana', 'Plan', 'plan']),
                target: getValue(row, ['TARGET', 'target', 'Target', 'Tanggal Target', 'tanggal target', 'Target Date', 'target date']),
                realisasiTindakLanjut: getValue(row, ['REALISASI TINDAK LANJUT', 'realisasi tindak lanjut', 'Realisasi Tindak Lanjut', 'realisasiTindakLanjut', 'Realisasi', 'realisasi', 'Realization', 'realization']),
                fotoTindakLanjut: getValue(row, ['FOTO TINDAK LANJUT', 'foto tindak lanjut', 'Foto Tindak Lanjut', 'fotoTindakLanjut', 'Foto TL', 'foto TL']) || null,
                tanggalTindakLanjut: getValue(row, ['TANGGAL TINDAK LANJUT', 'tanggal tindak lanjut', 'Tanggal Tindak Lanjut', 'tanggalTindakLanjut', 'Tanggal TL', 'tanggal TL', 'Tanggal Realisasi', 'tanggal realisasi'])
              };
              console.log(`Row ${index + 1} mapped:`, item);
              return item;
            });

            console.log('Imported data:', importedData);
            console.log('Number of imported rows:', importedData.length);

            // Update table data with imported data
            setTableData(importedData);
            
            // Persist to localStorage
            try {
              localStorage.setItem('monitoringSPMData', JSON.stringify(importedData));
              console.log('Imported data saved to localStorage successfully');
              alert(`Berhasil mengimpor ${importedData.length} data dari Excel dari sheet "${usedSheetName}".`);
            } catch (error) {
              console.error('Error saving imported data to localStorage:', error);
              alert(`Berhasil mengimpor ${importedData.length} data, namun gagal menyimpan ke localStorage.`);
            }
          } catch (error) {
            console.error('Error parsing Excel file:', error);
            alert('Gagal memproses file Excel. Pastikan format file benar. Error: ' + error.message);
          }
        };
        reader.readAsBinaryString(file);
      }
    };
    input.click();
  };

  // Export Excel for Monitoring SPM
  const handleExportExcelSPM = () => {
    try {
      const data = tableData;
      
      if (data.length === 0) {
        alert('Tidak ada data untuk diexport');
        return;
      }

      // Prepare data for Excel
      const excelData = data.map(item => ({
        'NO': item.no || '',
        'LOKASI': item.lokasi || '',
        'JALUR': item.jalur || '',
        'KM': item.km || '',
        'FOTO': item.foto || '',
        'KETERANGAN': item.keterangan || '',
        'RENCANA TINDAK LANJUT': item.rencanaTindakLanjut || '',
        'TARGET': item.target || '',
        'REALISASI TINDAK LANJUT': item.realisasiTindakLanjut || '',
        'FOTO TINDAK LANJUT': item.fotoTindakLanjut || '',
        'TANGGAL TINDAK LANJUT': item.tanggalTindakLanjut || ''
      }));

      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      ws['!cols'] = [
        { wch: 10 },  // NO
        { wch: 30 },  // LOKASI
        { wch: 15 },  // JALUR
        { wch: 15 },  // KM
        { wch: 40 },  // FOTO
        { wch: 50 },  // KETERANGAN
        { wch: 50 },  // RENCANA TINDAK LANJUT
        { wch: 15 },  // TARGET
        { wch: 50 },  // REALISASI TINDAK LANJUT
        { wch: 40 },  // FOTO TINDAK LANJUT
        { wch: 15 }   // TANGGAL TINDAK LANJUT
      ];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Monitoring SPM');

      // Add instruction sheet
      const instructionData = [
        { 'PETUNJUK UPLOAD EXCEL MONITORING SPM': '' },
        { '': '' },
        { '1. Download Template': 'Gunakan template yang tersedia untuk format yang benar' },
        { '2. Isi Data': 'Lengkapi semua kolom yang diperlukan' },
        { '3. NO': 'Nomor urut unik untuk setiap data' },
        { '4. LOKASI': 'Lokasi temuan (contoh: KM 102+500 - KM 103+000)' },
        { '5. JALUR': 'Jalur (contoh: Jalur A, Jalur B, Jalur C)' },
        { '6. KM': 'Kilometer (contoh: 102+500)' },
        { '7. FOTO': 'URL gambar, nama file, atau path file foto temuan' },
        { '8. KETERANGAN': 'Deskripsi detail tentang temuan' },
        { '9. RENCANA TINDAK LANJUT': 'Rencana perbaikan yang akan dilakukan' },
        { '10. TARGET': 'Tanggal target penyelesaian (format: YYYY-MM-DD)' },
        { '11. REALISASI TINDAK LANJUT': 'Deskripsi realisasi perbaikan' },
        { '12. FOTO TINDAK LANJUT': 'URL gambar, nama file, atau path file foto hasil perbaikan' },
        { '13. TANGGAL TINDAK LANJUT': 'Tanggal realisasi perbaikan (format: YYYY-MM-DD)' },
        { '': '' },
        { 'CATATAN PENTING': '' },
        { '-': 'Jangan ubah format header/kolom' },
        { '-': 'Data akan diupdate berdasarkan NO' },
        { '-': 'Jika NO sudah ada, data akan diupdate' },
        { '-': 'Jika NO baru, data akan ditambahkan' },
        { '-': 'Pastikan data valid sebelum upload' }
      ];
      const wsInstructions = XLSX.utils.json_to_sheet(instructionData);
      wsInstructions['!cols'] = [{ wch: 40 }, { wch: 60 }];
      XLSX.utils.book_append_sheet(wb, wsInstructions, 'Petunjuk Upload');

      // Generate and download
      XLSX.writeFile(wb, `monitoring-spm-${new Date().toISOString().split('T')[0]}.xlsx`);
      
      alert(`Data Monitoring SPM berhasil diexport ke Excel (${data.length} baris)`);
    } catch (error) {
      console.error('Export Excel error:', error);
      alert('Gagal mengexport data ke Excel: ' + error.message);
    }
  };

  // Download Template Excel for Monitoring SPM
  const handleDownloadTemplateSPM = () => {
    try {
      // Create template data with sample
      const templateData = [
        {
          'NO': 1,
          'LOKASI': 'KM 102+500 - KM 103+000',
          'JALUR': 'Jalur A',
          'KM': '102+500',
          'FOTO': 'https://example.com/foto1.jpg',
          'KETERANGAN': 'Terdapat lubang berukuran 30cm x 30cm',
          'RENCANA TINDAK LANJUT': 'Perbaikan dengan cold mix',
          'TARGET': '2026-01-30',
          'REALISASI TINDAK LANJUT': 'Perbaikan telah dilakukan',
          'FOTO TINDAK LANJUT': 'https://example.com/foto-tl1.jpg',
          'TANGGAL TINDAK LANJUT': '2026-01-28'
        },
        {
          'NO': 2,
          'LOKASI': 'KM 78+200 - KM 78+500',
          'JALUR': 'Jalur B',
          'KM': '78+200',
          'FOTO': 'https://example.com/foto2.jpg',
          'KETERANGAN': 'Marka jalur memudar',
          'RENCANA TINDAK LANJUT': 'Repainting marka',
          'TARGET': '2026-02-10',
          'REALISASI TINDAK LANJUT': '',
          'FOTO TINDAK LANJUT': '',
          'TANGGAL TINDAK LANJUT': ''
        }
      ];

      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(templateData);

      // Set column widths
      ws['!cols'] = [
        { wch: 10 },  // NO
        { wch: 30 },  // LOKASI
        { wch: 15 },  // JALUR
        { wch: 15 },  // KM
        { wch: 40 },  // FOTO
        { wch: 50 },  // KETERANGAN
        { wch: 50 },  // RENCANA TINDAK LANJUT
        { wch: 15 },  // TARGET
        { wch: 50 },  // REALISASI TINDAK LANJUT
        { wch: 40 },  // FOTO TINDAK LANJUT
        { wch: 15 }   // TANGGAL TINDAK LANJUT
      ];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Monitoring SPM');

      // Add instruction sheet
      const instructionData = [
        { 'PETUNJUK UPLOAD EXCEL MONITORING SPM': '' },
        { '': '' },
        { '1. Download Template': 'Gunakan template ini untuk format yang benar' },
        { '2. Isi Data': 'Lengkapi semua kolom yang diperlukan' },
        { '3. NO': 'Nomor urut unik untuk setiap data' },
        { '4. LOKASI': 'Lokasi temuan (contoh: KM 102+500 - KM 103+000)' },
        { '5. JALUR': 'Jalur (contoh: Jalur A, Jalur B, Jalur C)' },
        { '6. KM': 'Kilometer (contoh: 102+500)' },
        { '7. FOTO': 'URL gambar, nama file, atau path file foto temuan' },
        { '8. KETERANGAN': 'Deskripsi detail tentang temuan' },
        { '9. RENCANA TINDAK LANJUT': 'Rencana perbaikan yang akan dilakukan' },
        { '10. TARGET': 'Tanggal target penyelesaian (format: YYYY-MM-DD)' },
        { '11. REALISASI TINDAK LANJUT': 'Deskripsi realisasi perbaikan' },
        { '12. FOTO TINDAK LANJUT': 'URL gambar, nama file, atau path file foto hasil perbaikan' },
        { '13. TANGGAL TINDAK LANJUT': 'Tanggal realisasi perbaikan (format: YYYY-MM-DD)' },
        { '': '' },
        { 'CATATAN PENTING': '' },
        { '-': 'Jangan ubah format header/kolom' },
        { '-': 'Data akan diupdate berdasarkan NO' },
        { '-': 'Jika NO sudah ada, data akan diupdate' },
        { '-': 'Jika NO baru, data akan ditambahkan' },
        { '-': 'Pastikan data valid sebelum upload' },
        { '-': 'Hapus baris contoh ini sebelum upload data asli' }
      ];
      const wsInstructions = XLSX.utils.json_to_sheet(instructionData);
      wsInstructions['!cols'] = [{ wch: 40 }, { wch: 60 }];
      XLSX.utils.book_append_sheet(wb, wsInstructions, 'Petunjuk Upload');

      // Generate and download
      XLSX.writeFile(wb, `template-monitoring-spm.xlsx`);
      
      alert('Template berhasil didownload');
    } catch (error) {
      console.error('Download template error:', error);
      alert('Gagal mendownload template: ' + error.message);
    }
  };

  // Import Excel with update/insert logic for Monitoring SPM
  const handleImportExcelSPM = () => {
    if (!excelImportFile) {
      alert('Pilih file Excel untuk diimport');
      return;
    }

    try {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Read first sheet (skip instruction sheet)
          const sheetName = workbook.SheetNames.find(name => name !== 'Petunjuk Upload') || workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          if (jsonData.length === 0) {
            alert('File Excel kosong');
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

          // Get current table data
          const currentTableData = [...tableData];
          const existingNos = new Set(currentTableData.map(item => item.no));
          const newData = [...currentTableData];

          for (const row of jsonData) {
            try {
              const no = row['NO'] || row['no'] || row['No'];
              
              if (!no) {
                importResults.failed++;
                importResults.errors.push(`Baris tanpa NO: ${JSON.stringify(row)}`);
                continue;
              }

              const newItem = {
                id: Date.now() + Math.random(),
                kategori: row['KATEGORI'] || row['kategori'] || 'Kondisi Jalan Tol (Lubang)',
                no: no,
                lokasi: row['LOKASI'] || row['lokasi'] || '',
                jalur: row['JALUR'] || row['jalur'] || 'Jalur A',
                km: row['KM'] || row['km'] || '',
                foto: row['FOTO'] || row['foto'] || null,
                keterangan: row['KETERANGAN'] || row['keterangan'] || '',
                rencanaTindakLanjut: row['RENCANA TINDAK LANJUT'] || row['rencana tindak lanjut'] || row['rencanaTindakLanjut'] || '',
                target: row['TARGET'] || row['target'] || '',
                realisasiTindakLanjut: row['REALISASI TINDAK LANJUT'] || row['realisasi tindak lanjut'] || row['realisasiTindakLanjut'] || '',
                fotoTindakLanjut: row['FOTO TINDAK LANJUT'] || row['foto tindak lanjut'] || row['fotoTindakLanjut'] || null,
                tanggalTindakLanjut: row['TANGGAL TINDAK LANJUT'] || row['tanggal tindak lanjut'] || row['tanggalTindakLanjut'] || ''
              };

              // Log photo data for debugging
              if (newItem.foto) {
                console.log(`Row ${no} - Foto:`, newItem.foto);
              }
              if (newItem.fotoTindakLanjut) {
                console.log(`Row ${no} - Foto TL:`, newItem.fotoTindakLanjut);
              }

              if (existingNos.has(no)) {
                // Update existing
                const index = newData.findIndex(item => item.no === no);
                if (index !== -1) {
                  newData[index] = { ...newData[index], ...newItem };
                  importResults.updated++;
                }
              } else {
                // Insert new
                newData.push(newItem);
                existingNos.add(no);
                importResults.inserted++;
              }
              
              importResults.success++;
            } catch (error) {
              importResults.failed++;
              importResults.errors.push(`Error pada baris: ${JSON.stringify(row)} - ${error.message}`);
            }
          }

          // Update table data once after processing all rows
          setTableData(newData);
          
          // Persist to localStorage
          try {
            localStorage.setItem('monitoringSPMData', JSON.stringify(newData));
            console.log('Data saved to localStorage successfully after import');
          } catch (error) {
            console.error('Error saving data to localStorage after import:', error);
          }

          // Show results
          const message = `Import Excel selesai:\n✅ Berhasil: ${importResults.success}\n🔄 Update: ${importResults.updated}\n➕ Insert: ${importResults.inserted}\n❌ Gagal: ${importResults.failed}`;
          alert(message);
          
          if (importResults.errors.length > 0) {
            console.error('Import errors:', importResults.errors);
          }

          setExcelImportFile(null);
        } catch (error) {
          console.error('Error processing Excel file:', error);
          alert('Gagal memproses file Excel: ' + error.message);
        }
      };

      reader.onerror = () => {
        alert('Gagal membaca file Excel');
      };

      reader.readAsArrayBuffer(excelImportFile);
    } catch (error) {
      console.error('Import Excel error:', error);
      alert('Gagal mengimport file Excel: ' + error.message);
    }
  };

  const handleImageUpload = (field) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setAddFormData({ ...addFormData, [field]: event.target.result });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleEditImageUpload = (field) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setEditFormData({ ...editFormData, [field]: event.target.result });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item.id);
    setEditFormData({
      kategori: item.kategori,
      lokasi: item.lokasi,
      jalur: item.jalur,
      km: item.km,
      foto: item.foto,
      keterangan: item.keterangan,
      rencanaTindakLanjut: item.rencanaTindakLanjut,
      target: item.target,
      realisasiTindakLanjut: item.realisasiTindakLanjut,
      fotoTindakLanjut: item.fotoTindakLanjut,
      tanggalTindakLanjut: item.tanggalTindakLanjut
    });
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingItem(null);
  };

  const handleSaveEdit = () => {
    setTableData(prevData => {
      const newData = prevData.map(item => 
        item.id === editingItem ? { ...item, ...editFormData } : item
      );
      // Persist to localStorage
      try {
        localStorage.setItem('monitoringSPMData', JSON.stringify(newData));
        console.log('Data saved to localStorage successfully after edit');
      } catch (error) {
        console.error('Error saving data to localStorage after edit:', error);
      }
      return newData;
    });
    setShowEditModal(false);
    setEditingItem(null);
  };

  const handleRowUpload = (itemId, field) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setTableData(prevData => {
            const newData = prevData.map(item => 
              item.id === itemId ? { ...item, [field]: event.target.result } : item
            );
            // Persist to localStorage
            try {
              localStorage.setItem('monitoringSPMData', JSON.stringify(newData));
              console.log('Data saved to localStorage successfully after upload');
            } catch (error) {
              console.error('Error saving data to localStorage after upload:', error);
            }
            return newData;
          });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleDownloadPhoto = (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  };

  const handleDownloadRowData = (item) => {
    const dataStr = JSON.stringify(item, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `monitoring-spm-${item.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      const newCategories = [...categories, newCategory.trim()];
      setCategories(newCategories);
      setAddFormData({ ...addFormData, kategori: newCategory.trim() });
      setNewCategory('');
      setShowNewCategoryInput(false);
      // Persist categories to localStorage
      try {
        localStorage.setItem('monitoringSPMCategories', JSON.stringify(newCategories));
        console.log('Categories saved to localStorage successfully');
      } catch (error) {
        console.error('Error saving categories to localStorage:', error);
      }
    }
  };

  const handleAddEditCategory = () => {
    if (newEditCategory.trim() && !categories.includes(newEditCategory.trim())) {
      const newCategories = [...categories, newEditCategory.trim()];
      setCategories(newCategories);
      setEditFormData({ ...editFormData, kategori: newEditCategory.trim() });
      setNewEditCategory('');
      setShowEditCategoryInput(false);
      // Persist categories to localStorage
      try {
        localStorage.setItem('monitoringSPMCategories', JSON.stringify(newCategories));
        console.log('Categories saved to localStorage successfully after edit');
      } catch (error) {
        console.error('Error saving categories to localStorage after edit:', error);
      }
    }
  };

  const handleAddJalur = () => {
    if (newJalur.trim() && !jalurOptions.includes(newJalur.trim())) {
      const newJalurOptions = [...jalurOptions, newJalur.trim()];
      setJalurOptions(newJalurOptions);
      setAddFormData({ ...addFormData, jalur: newJalur.trim() });
      setNewJalur('');
      setShowNewJalurInput(false);
      // Persist jalur options to localStorage
      try {
        localStorage.setItem('monitoringSPMJalurOptions', JSON.stringify(newJalurOptions));
        console.log('Jalur options saved to localStorage successfully');
      } catch (error) {
        console.error('Error saving jalur options to localStorage:', error);
      }
    }
  };

  const handleAddEditJalur = () => {
    if (newEditJalur.trim() && !jalurOptions.includes(newEditJalur.trim())) {
      const newJalurOptions = [...jalurOptions, newEditJalur.trim()];
      setJalurOptions(newJalurOptions);
      setEditFormData({ ...editFormData, jalur: newEditJalur.trim() });
      setNewEditJalur('');
      setShowEditJalurInput(false);
      // Persist jalur options to localStorage
      try {
        localStorage.setItem('monitoringSPMJalurOptions', JSON.stringify(newJalurOptions));
        console.log('Jalur options saved to localStorage successfully after edit');
      } catch (error) {
        console.error('Error saving jalur options to localStorage after edit:', error);
      }
    }
  };

  const handleDeleteRow = (itemId) => {
    console.log('Deleting item with ID:', itemId);
    console.log('Current tableData length before delete:', tableData.length);
    if (window.confirm('Apakah Anda yakin ingin menghapus data ini?')) {
      setTableData(prevData => {
        const newData = prevData.filter(item => item.id !== itemId);
        console.log('New tableData length after delete:', newData.length);
        // Persist to localStorage
        try {
          localStorage.setItem('monitoringSPMData', JSON.stringify(newData));
          console.log('Data saved to localStorage successfully after delete');
        } catch (error) {
          console.error('Error saving data to localStorage after delete:', error);
        }
        return newData;
      });
    }
  };

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  // Persist groups to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('monitoringSPMGroups', JSON.stringify(groups));
    } catch (error) {
      console.error('Error saving groups to localStorage:', error);
    }
  }, [groups]);

  // Group CRUD functions
  const handleAddGroup = () => {
    if (!newGroupName.trim()) {
      alert('Nama grup tidak boleh kosong');
      return;
    }
    
    const newGroup = {
      id: Date.now(),
      name: newGroupName,
      color: newGroupColor
    };
    
    setGroups([...groups, newGroup]);
    setNewGroupName('');
    setNewGroupColor('#3B82F6');
    setShowGroupModal(false);
  };

  const handleEditGroup = (group) => {
    // Find the actual group from groups array using the name
    const actualGroup = groups.find(g => g.name === group.name);
    if (actualGroup) {
      setEditingGroup(actualGroup);
      setNewGroupName(actualGroup.name);
      setNewGroupColor(actualGroup.color);
      setShowGroupModal(true);
    }
  };

  const handleUpdateGroup = () => {
    if (!newGroupName.trim()) {
      alert('Nama grup tidak boleh kosong');
      return;
    }
    
    setGroups(groups.map(g => 
      g.id === editingGroup.id 
        ? { ...g, name: newGroupName, color: newGroupColor }
        : g
    ));
    
    // Update table data with new group name
    setTableData(tableData.map(item => 
      item.groupId === editingGroup.id 
        ? { ...item, groupName: newGroupName }
        : item
    ));
    
    setEditingGroup(null);
    setNewGroupName('');
    setNewGroupColor('#3B82F6');
    setShowGroupModal(false);
  };

  const handleDeleteGroup = (groupId) => {
    if (!confirm('Apakah Anda yakin ingin menghapus grup ini? Data dalam grup ini akan dihapus.')) {
      return;
    }
    
    setGroups(groups.filter(g => g.id !== groupId));
    
    // Remove data from this group
    setTableData(tableData.filter(item => item.groupId !== groupId));
  };

  const handleCloseGroupModal = () => {
    setShowGroupModal(false);
    setEditingGroup(null);
    setNewGroupName('');
    setNewGroupColor('#3B82F6');
  };

  // Card detail handlers
  const handleCardClick = (cardType) => {
    setSelectedCardType(cardType);
    setShowCardDetailModal(true);
  };

  const handleCloseCardDetailModal = () => {
    setShowCardDetailModal(false);
    setSelectedCardType(null);
  };

  const getCardDetailData = (cardType) => {
    switch (cardType) {
      case 'totalTemuan':
        return {
          title: 'Detail Total Temuan',
          description: 'Semua temuan yang tercatat dalam sistem',
          data: tableData
        };
      case 'totalPerbaikan':
        return {
          title: 'Detail Total Perbaikan',
          description: 'Semua perbaikan yang telah dilakukan',
          data: tableData.filter(item => item.realisasiTindakLanjut && item.realisasiTindakLanjut.trim() !== '' && item.realisasiTindakLanjut !== 'Belum dilakukan')
        };
      case 'belumSelesai':
        return {
          title: 'Detail Belum Selesai',
          description: 'Semua temuan yang belum diperbaiki',
          data: tableData.filter(item => !item.realisasiTindakLanjut || item.realisasiTindakLanjut.trim() === '' || item.realisasiTindakLanjut === 'Belum dilakukan')
        };
      case 'dokumentasiFoto':
        return {
          title: 'Detail Dokumentasi Foto',
          description: 'Semua dokumentasi foto temuan dan tindak lanjut',
          data: tableData.filter(item => (item.foto && item.foto.trim() !== '') || (item.fotoTindakLanjut && item.fotoTindakLanjut.trim() !== ''))
        };
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0B1120 0%, #0F172A 50%, #111827 100%)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3B82F6] mx-auto mb-4"></div>
          <p className="text-white font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto" style={{ background: 'linear-gradient(135deg, #0B1120 0%, #0F172A 50%, #111827 100%)' }}>
      <div className="flex flex-col p-4 lg:p-6 gap-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-card p-6 rounded-2xl"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Monitoring SPM Jalan Tol</h1>
              <p className="text-[#94A3B8] text-sm">Monitoring Temuan dan Status Perbaikan</p>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6]/10 hover:bg-[#3B82F6]/20 text-[#3B82F6] rounded-lg transition-all duration-200 border border-[#3B82F6]/20">
                <RefreshCw className="w-4 h-4" />
                <span className="text-sm font-medium">Refresh</span>
              </button>
              <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] rounded-lg transition-all duration-200 border border-[#EF4444]/20">
                <Download className="w-4 h-4" />
                <span className="text-sm font-medium">Export PDF</span>
              </button>
              <button onClick={handleExportExcelSPM} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors">
                <FileSpreadsheet className="w-4 h-4" />
                <span className="text-sm font-medium">Export Excel</span>
              </button>
              <button onClick={handleDownloadTemplateSPM} className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">Download Template</span>
              </button>
              <button 
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.xlsx,.xls';
                  input.onchange = (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setExcelImportFile(file);
                      console.log('File selected:', file.name);
                    }
                  };
                  input.click();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="text-sm font-medium">{excelImportFile ? excelImportFile.name : 'Import Excel'}</span>
              </button>
              {excelImportFile && (
                <button
                  onClick={() => {
                    console.log('Upload button clicked, file:', excelImportFile);
                    handleImportExcelSPM();
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-sm font-medium">Upload Excel</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {/* Card 1: Total Temuan */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleCardClick('totalTemuan')}
            className="glass-card glass-card-hover overflow-hidden group relative rounded-2xl cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative p-5 text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="p-3 rounded-xl bg-[#F59E0B] bg-opacity-20 backdrop-blur-sm shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
                </div>
                <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Total Temuan</p>
              </div>
              <motion.p 
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 100 }}
                className="text-3xl font-bold text-white tracking-tight"
              >
                {kpiData.totalTemuan}
              </motion.p>
            </div>
          </motion.div>

          {/* Card 2: Total Perbaikan */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleCardClick('totalPerbaikan')}
            className="glass-card glass-card-hover overflow-hidden group relative rounded-2xl cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative p-5 text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="p-3 rounded-xl bg-[#3B82F6] bg-opacity-20 backdrop-blur-sm shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Wrench className="w-5 h-5 text-[#3B82F6]" />
                </div>
                <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Total Perbaikan</p>
              </div>
              <motion.p 
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 100 }}
                className="text-3xl font-bold text-white tracking-tight"
              >
                {kpiData.totalPerbaikan}
              </motion.p>
            </div>
          </motion.div>

          {/* Card 3: Belum Selesai */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleCardClick('belumSelesai')}
            className="glass-card glass-card-hover overflow-hidden group relative rounded-2xl cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative p-5 text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="p-3 rounded-xl bg-[#EF4444] bg-opacity-20 backdrop-blur-sm shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <XCircle className="w-5 h-5 text-[#EF4444]" />
                </div>
                <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Belum Selesai</p>
              </div>
              <motion.p 
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 100 }}
                className="text-3xl font-bold text-[#EF4444] tracking-tight"
              >
                {kpiData.belumSelesai}
              </motion.p>
            </div>
          </motion.div>

          {/* Card 4: Dokumentasi Foto */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleCardClick('dokumentasiFoto')}
            className="glass-card glass-card-hover overflow-hidden group relative rounded-2xl cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative p-5 text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="p-3 rounded-xl bg-[#10B981] bg-opacity-20 backdrop-blur-sm shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Camera className="w-5 h-5 text-[#10B981]" />
                </div>
                <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Dokumentasi Foto</p>
              </div>
              <motion.p 
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 100 }}
                className="text-3xl font-bold text-white tracking-tight"
              >
                {kpiData.dokumentasiFoto}
              </motion.p>
            </div>
          </motion.div>
        </motion.div>

        {/* Chart and Photo Gallery */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Status Perbaikan Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-1 glass-card p-6 rounded-2xl"
          >
            <h2 className="text-lg font-semibold text-white mb-4">Status Perbaikan</h2>
            <div className="relative w-48 h-48 mx-auto mb-4">
              <svg viewBox="0 0 36 36" className="w-full h-full">
                <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#334155" strokeWidth="3"></circle>
                <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#10B981" strokeWidth="3" strokeDasharray={selesaiStroke} strokeDashoffset={selesaiOffset} className="transform -rotate-90"></circle>
                <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#3B82F6" strokeWidth="3" strokeDasharray={progressStroke} strokeDashoffset={progressOffset} className="transform -rotate-90"></circle>
                <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#EF4444" strokeWidth="3" strokeDasharray={belumStroke} strokeDashoffset={belumOffset} className="transform -rotate-90"></circle>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{totalItems}</p>
                  <p className="text-xs text-[#94A3B8]">Total</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {statusChartData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-sm text-[#94A3B8]">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Photo Gallery */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="lg:col-span-2 glass-card p-6 rounded-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Dokumentasi Foto</h2>
              <button className="text-sm text-[#3B82F6] hover:text-[#3B82F6]/80 font-medium">Lihat Semua</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {photoGallery.map((photo) => (
                <div key={photo.id} className="relative group cursor-pointer overflow-hidden rounded-xl" onClick={() => setSelectedPhoto(photo)}>
                  <div className="aspect-[3/2] bg-[#1E293B] rounded-xl overflow-hidden">
                    <img 
                      src={photo.image} 
                      alt={photo.lokasi}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        photo.type === 'foto_awal' 
                          ? 'bg-[#F59E0B] text-white' 
                          : 'bg-[#10B981] text-white'
                      }`}>
                        {photo.type === 'foto_awal' ? 'Foto Temuan' : 'Foto Tindak Lanjut'}
                      </span>
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${getStatusBadgeColor(photo.status)} text-white`}>
                        {photo.status}
                      </span>
                    </div>
                    <p className="text-white text-xs font-medium truncate">{photo.lokasi}</p>
                    <p className="text-[#94A3B8] text-xs">{photo.tanggal}</p>
                  </div>
                  <div className="absolute top-2 left-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                      photo.type === 'foto_awal' 
                        ? 'bg-[#F59E0B]/90 text-white' 
                        : 'bg-[#10B981]/90 text-white'
                    }`}>
                      {photo.type === 'foto_awal' ? 'Temuan' : 'TL'}
                    </span>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Eye className="w-8 h-8 text-white" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Table Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="glass-card rounded-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-white/10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <h2 className="text-lg font-semibold text-white">Monitoring SPM</h2>
              <div className="flex flex-wrap gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                  <input
                    type="text"
                    placeholder="Cari..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#3B82F6]/50 transition-all duration-200 w-64"
                  />
                </div>
                <button onClick={handleOpenAddModal} className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6] hover:bg-[#3B82F6]/80 text-white rounded-lg transition-all duration-200 border border-[#3B82F6]/20">
                  <Plus className="w-4 h-4" />
                  Tambah
                </button>
              </div>
            </div>
          </div>
          <div className="table-wrapper max-h-[70vh] overflow-auto border border-white/10 rounded-xl">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-[#1E293B]">
                <tr className="bg-[#1E293B] border border-black">
                  <th className="px-2 py-3 text-center text-xs font-bold text-white border border-black">NO</th>
                  <th className="px-2 py-3 text-center text-xs font-bold text-white border border-black">LOKASI</th>
                  <th className="px-2 py-3 text-center text-xs font-bold text-white border border-black">JALUR</th>
                  <th className="px-2 py-3 text-center text-xs font-bold text-white border border-black">KM</th>
                  <th className="px-2 py-3 text-center text-xs font-bold text-white border border-black">FOTO</th>
                  <th className="px-2 py-3 text-center text-xs font-bold text-white border border-black">KETERANGAN</th>
                  <th className="px-2 py-3 text-center text-xs font-bold text-white border border-black">RENCANA TINDAK LANJUT</th>
                  <th className="px-2 py-3 text-center text-xs font-bold text-white border border-black">TARGET</th>
                  <th className="px-2 py-3 text-center text-xs font-bold text-white border border-black">REALISASI TINDAK LANJUT</th>
                  <th className="px-2 py-3 text-center text-xs font-bold text-white border border-black">FOTO TINDAK LANJUT</th>
                  <th className="px-2 py-3 text-center text-xs font-bold text-white border border-black">TANGGAL TINDAK LANJUT</th>
                  <th className="px-2 py-3 text-center text-xs font-bold text-white border border-black">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {tableDataToDisplay.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors border border-black">
                      <td className="px-2 py-2 text-center text-sm text-white border border-black">{item.no}</td>
                      <td className="px-2 py-2 text-center text-sm text-[#94A3B8] border border-black">{item.lokasi}</td>
                      <td className="px-2 py-2 text-center text-sm text-[#94A3B8] border border-black">{item.jalur}</td>
                      <td className="px-2 py-2 text-center text-sm text-[#94A3B8] border border-black">{item.km}</td>
                      <td className="px-2 py-2 text-center border border-black">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <div className="flex items-center justify-center h-16">
                            {item.foto ? (
                              <img 
                                src={item.foto} 
                                alt="Foto" 
                                className="h-14 w-20 object-cover rounded cursor-pointer hover:scale-150 transition-transform"
                              />
                            ) : (
                              <span className="text-xs text-[#94A3B8]">-</span>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleRowUpload(item.id, 'foto')}
                              className="p-1 text-[#94A3B8] hover:text-[#3B82F6] hover:bg-[#3B82F6]/10 rounded transition-colors"
                              title="Upload Foto"
                            >
                              <Upload className="w-3 h-3" />
                            </button>
                            {item.foto && (
                              <button
                                onClick={() => handleDownloadPhoto(item.foto, `foto-${item.id}.jpg`)}
                                className="p-1 text-[#94A3B8] hover:text-[#10B981] hover:bg-[#10B981]/10 rounded transition-colors"
                                title="Download Foto"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-left text-sm text-[#94A3B8] border border-black max-w-xs">
                        <div className="whitespace-normal break-words">{item.keterangan}</div>
                      </td>
                      <td className="px-2 py-2 text-center text-sm text-[#94A3B8] border border-black max-w-xs">
                        <div className="whitespace-normal break-words">{item.rencanaTindakLanjut}</div>
                      </td>
                      <td className="px-2 py-2 text-center text-sm text-[#94A3B8] border border-black">{item.target}</td>
                      <td className="px-2 py-2 text-center text-sm text-[#94A3B8] border border-black max-w-xs">
                        <div className="whitespace-normal break-words">{item.realisasiTindakLanjut}</div>
                      </td>
                      <td className="px-2 py-2 text-center border border-black">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <div className="flex items-center justify-center h-16">
                            {item.fotoTindakLanjut ? (
                              <img 
                                src={item.fotoTindakLanjut} 
                                alt="Foto Tindak Lanjut" 
                                className="h-14 w-20 object-cover rounded cursor-pointer hover:scale-150 transition-transform"
                              />
                            ) : (
                              <span className="text-xs text-[#94A3B8]">-</span>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleRowUpload(item.id, 'fotoTindakLanjut')}
                              className="p-1 text-[#94A3B8] hover:text-[#3B82F6] hover:bg-[#3B82F6]/10 rounded transition-colors"
                              title="Upload Foto Tindak Lanjut"
                            >
                              <Upload className="w-3 h-3" />
                            </button>
                            {item.fotoTindakLanjut && (
                              <button
                                onClick={() => handleDownloadPhoto(item.fotoTindakLanjut, `foto-tindak-lanjut-${item.id}.jpg`)}
                                className="p-1 text-[#94A3B8] hover:text-[#10B981] hover:bg-[#10B981]/10 rounded transition-colors"
                                title="Download Foto Tindak Lanjut"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center text-sm text-[#94A3B8] border border-black">{item.tanggalTindakLanjut || '-'}</td>
                      <td className="px-2 py-2 text-center border border-black">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1 text-[#94A3B8] hover:text-[#3B82F6] hover:bg-[#3B82F6]/10 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadRowData(item)}
                            className="p-1 text-[#94A3B8] hover:text-[#10B981] hover:bg-[#10B981]/10 rounded transition-colors"
                            title="Download Data"
                          >
                            <FileDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRow(item.id)}
                            className="p-1 text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
            <div className="text-sm text-[#94A3B8]">
              Menampilkan {filteredData.length} data
            </div>
          </div>
        </motion.div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-2xl p-6 w-full max-w-2xl border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Tambah Data Monitoring SPM</h3>
              <button
                onClick={handleCloseAddModal}
                className="text-[#94A3B8] hover:text-white transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#94A3B8] mb-1">Group</label>
                <select
                  value={addFormData.groupId}
                  onChange={(e) => setAddFormData({ ...addFormData, groupId: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50"
                >
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94A3B8] mb-1">Kategori</label>
                {!showNewCategoryInput ? (
                  <div className="flex gap-2">
                    <select
                      value={addFormData.kategori}
                      onChange={(e) => setAddFormData({ ...addFormData, kategori: e.target.value })}
                      className="flex-1 px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50"
                    >
                      {categories.map((cat, index) => (
                        <option key={index} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewCategoryInput(true)}
                      className="px-3 py-2 bg-[#3B82F6]/10 hover:bg-[#3B82F6]/20 text-[#3B82F6] rounded-lg transition-colors border border-[#3B82F6]/20"
                      title="Tambah Kategori Baru"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Masukkan kategori baru"
                      className="flex-1 px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="px-3 py-2 bg-[#10B981]/10 hover:bg-[#10B981]/20 text-[#10B981] rounded-lg transition-colors border border-[#10B981]/20"
                      title="Simpan"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCategoryInput(false);
                        setNewCategory('');
                      }}
                      className="px-3 py-2 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] rounded-lg transition-colors border border-[#EF4444]/20"
                      title="Batal"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#94A3B8] mb-1">Lokasi</label>
                  <input
                    type="text"
                    value={addFormData.lokasi}
                    onChange={(e) => setAddFormData({ ...addFormData, lokasi: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50"
                    placeholder="Contoh: KM 102+500 - KM 103+000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94A3B8] mb-1">Jalur</label>
                  {!showNewJalurInput ? (
                    <div className="flex gap-2">
                      <select
                        value={addFormData.jalur}
                        onChange={(e) => setAddFormData({ ...addFormData, jalur: e.target.value })}
                        className="flex-1 px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50"
                      >
                        {jalurOptions.map((jalur, index) => (
                          <option key={index} value={jalur}>{jalur}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowNewJalurInput(true)}
                        className="px-3 py-2 bg-[#3B82F6]/10 hover:bg-[#3B82F6]/20 text-[#3B82F6] rounded-lg transition-colors border border-[#3B82F6]/20"
                        title="Tambah Jalur Baru"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newJalur}
                        onChange={(e) => setNewJalur(e.target.value)}
                        placeholder="Masukkan jalur baru"
                        className="flex-1 px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50"
                      />
                      <button
                        type="button"
                        onClick={handleAddJalur}
                        className="px-3 py-2 bg-[#10B981]/10 hover:bg-[#10B981]/20 text-[#10B981] rounded-lg transition-colors border border-[#10B981]/20"
                        title="Simpan"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewJalurInput(false);
                          setNewJalur('');
                        }}
                        className="px-3 py-2 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] rounded-lg transition-colors border border-[#EF4444]/20"
                        title="Batal"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#94A3B8] mb-1">KM</label>
                  <input
                    type="text"
                    value={addFormData.km}
                    onChange={(e) => setAddFormData({ ...addFormData, km: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50"
                    placeholder="Contoh: 102+500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94A3B8] mb-1">Foto</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleImageUpload('foto')}
                      className="flex-1 px-4 py-2 bg-[#3B82F6]/10 hover:bg-[#3B82F6]/20 text-[#3B82F6] rounded-lg transition-colors border border-[#3B82F6]/20"
                    >
                      Upload Foto
                    </button>
                    {addFormData.foto && (
                      <button
                        type="button"
                        onClick={() => setAddFormData({ ...addFormData, foto: null })}
                        className="px-3 py-2 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] rounded-lg transition-colors border border-[#EF4444]/20"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                  {addFormData.foto && (
                    <div className="mt-2">
                      <img src={addFormData.foto} alt="Preview" className="h-24 w-32 object-cover rounded" />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94A3B8] mb-1">Keterangan</label>
                <textarea
                  value={addFormData.keterangan}
                  onChange={(e) => setAddFormData({ ...addFormData, keterangan: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50"
                  rows={3}
                  placeholder="Deskripsi temuan..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94A3B8] mb-1">Rencana Tindak Lanjut</label>
                <textarea
                  value={addFormData.rencanaTindakLanjut}
                  onChange={(e) => setAddFormData({ ...addFormData, rencanaTindakLanjut: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50"
                  rows={2}
                  placeholder="Rencana perbaikan..."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#94A3B8] mb-1">Target</label>
                  <input
                    type="date"
                    value={addFormData.target}
                    onChange={(e) => setAddFormData({ ...addFormData, target: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94A3B8] mb-1">Foto Tindak Lanjut</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleImageUpload('fotoTindakLanjut')}
                      className="flex-1 px-4 py-2 bg-[#3B82F6]/10 hover:bg-[#3B82F6]/20 text-[#3B82F6] rounded-lg transition-colors border border-[#3B82F6]/20"
                    >
                      Upload Foto
                    </button>
                    {addFormData.fotoTindakLanjut && (
                      <button
                        type="button"
                        onClick={() => setAddFormData({ ...addFormData, fotoTindakLanjut: null })}
                        className="px-3 py-2 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] rounded-lg transition-colors border border-[#EF4444]/20"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                  {addFormData.fotoTindakLanjut && (
                    <div className="mt-2">
                      <img src={addFormData.fotoTindakLanjut} alt="Preview" className="h-24 w-32 object-cover rounded" />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94A3B8] mb-1">Realisasi Tindak Lanjut</label>
                <textarea
                  value={addFormData.realisasiTindakLanjut}
                  onChange={(e) => setAddFormData({ ...addFormData, realisasiTindakLanjut: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50"
                  rows={3}
                  placeholder="Hasil realisasi..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94A3B8] mb-1">Tanggal Tindak Lanjut</label>
                <input
                  type="date"
                  value={addFormData.tanggalTindakLanjut}
                  onChange={(e) => setAddFormData({ ...addFormData, tanggalTindakLanjut: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveAdd}
                className="flex-1 px-4 py-2 bg-[#3B82F6] hover:bg-[#3B82F6]/80 text-white rounded-lg transition-colors font-medium"
              >
                Simpan
              </button>
              <button
                onClick={handleCloseAddModal}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-medium"
              >
                Batal
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-2xl w-full max-w-[900px] border border-white/10 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Sticky Header */}
            <div className="p-6 border-b border-white/10 bg-[#1E293B] sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Edit Data Monitoring SPM</h3>
                <button
                  onClick={handleCloseEditModal}
                  className="text-[#94A3B8] hover:text-white transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#94A3B8] mb-1">Kategori</label>
                {!showEditCategoryInput ? (
                  <div className="flex gap-2">
                    <select
                      value={editFormData.kategori}
                      onChange={(e) => setEditFormData({ ...editFormData, kategori: e.target.value })}
                      className="flex-1 px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50"
                    >
                      {categories.length > 0 ? categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      )) : <option value="">Tambah kategori baru</option>}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowEditCategoryInput(true)}
                      className="px-3 py-2 bg-[#3B82F6]/10 hover:bg-[#3B82F6]/20 text-[#3B82F6] rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Baru
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newEditCategory}
                      onChange={(e) => setNewEditCategory(e.target.value)}
                      placeholder="Nama kategori baru"
                      className="flex-1 px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddEditCategory()}
                    />
                    <button
                      type="button"
                      onClick={handleAddEditCategory}
                      className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                    >
                      Simpan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditCategoryInput(false);
                        setNewEditCategory('');
                      }}
                      className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                    >
                      Batal
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94A3B8] mb-1">Lokasi</label>
                <input
                  type="text"
                  value={editFormData.lokasi}
                  onChange={(e) => setEditFormData({ ...editFormData, lokasi: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94A3B8] mb-1">Jalur</label>
                {!showEditJalurInput ? (
                  <div className="flex gap-2">
                    <select
                      value={editFormData.jalur}
                      onChange={(e) => setEditFormData({ ...editFormData, jalur: e.target.value })}
                      className="flex-1 px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50"
                    >
                      {jalurOptions.length > 0 ? jalurOptions.map(jalur => (
                        <option key={jalur} value={jalur}>{jalur}</option>
                      )) : <option value="">Tambah jalur baru</option>}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowEditJalurInput(true)}
                      className="px-3 py-2 bg-[#3B82F6]/10 hover:bg-[#3B82F6]/20 text-[#3B82F6] rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Baru
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newEditJalur}
                      onChange={(e) => setNewEditJalur(e.target.value)}
                      placeholder="Nama jalur baru"
                      className="flex-1 px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddEditJalur()}
                    />
                    <button
                      type="button"
                      onClick={handleAddEditJalur}
                      className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                    >
                      Simpan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditJalurInput(false);
                        setNewEditJalur('');
                      }}
                      className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                    >
                      Batal
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94A3B8] mb-1">KM</label>
                <input
                  type="text"
                  value={editFormData.km}
                  onChange={(e) => setEditFormData({ ...editFormData, km: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94A3B8] mb-1">Foto</label>
                <div className="flex gap-2">
                  {editFormData.foto ? (
                    <div className="relative">
                      <img 
                        src={editFormData.foto} 
                        alt="Foto" 
                        className="h-20 w-32 object-cover rounded cursor-pointer hover:scale-150 transition-transform"
                      />
                      <button
                        onClick={() => setEditFormData({ ...editFormData, foto: null })}
                        className="absolute top-0 right-0 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                      >
                        <XCircle className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEditImageUpload('foto')}
                      className="px-4 py-2 bg-[#3B82F6]/10 hover:bg-[#3B82F6]/20 text-[#3B82F6] rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Foto
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94A3B8] mb-1">Keterangan</label>
                <textarea
                  value={editFormData.keterangan}
                  onChange={(e) => setEditFormData({ ...editFormData, keterangan: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94A3B8] mb-1">Rencana Tindak Lanjut</label>
                <textarea
                  value={editFormData.rencanaTindakLanjut}
                  onChange={(e) => setEditFormData({ ...editFormData, rencanaTindakLanjut: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94A3B8] mb-1">Target</label>
                <input
                  type="date"
                  value={editFormData.target}
                  onChange={(e) => setEditFormData({ ...editFormData, target: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94A3B8] mb-1">Realisasi Tindak Lanjut</label>
                <textarea
                  value={editFormData.realisasiTindakLanjut}
                  onChange={(e) => setEditFormData({ ...editFormData, realisasiTindakLanjut: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94A3B8] mb-1">Foto Tindak Lanjut</label>
                <div className="flex gap-2">
                  {editFormData.fotoTindakLanjut ? (
                    <div className="relative">
                      <img 
                        src={editFormData.fotoTindakLanjut} 
                        alt="Foto Tindak Lanjut" 
                        className="h-20 w-32 object-cover rounded cursor-pointer hover:scale-150 transition-transform"
                      />
                      <button
                        onClick={() => setEditFormData({ ...editFormData, fotoTindakLanjut: null })}
                        className="absolute top-0 right-0 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                      >
                        <XCircle className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEditImageUpload('fotoTindakLanjut')}
                      className="px-4 py-2 bg-[#3B82F6]/10 hover:bg-[#3B82F6]/20 text-[#3B82F6] rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Foto TL
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94A3B8] mb-1">Tanggal Tindak Lanjut</label>
                <input
                  type="date"
                  value={editFormData.tanggalTindakLanjut}
                  onChange={(e) => setEditFormData({ ...editFormData, tanggalTindakLanjut: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50"
                />
              </div>
              </div>
            </div>
            
            {/* Sticky Footer */}
            <div className="p-6 border-t border-white/10 bg-[#1E293B] sticky bottom-0 z-10">
              <div className="flex gap-3">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-4 py-2 bg-[#3B82F6] hover:bg-[#3B82F6]/80 text-white rounded-lg transition-all duration-200 border border-[#3B82F6]/20"
                >
                  Simpan
                </button>
                <button
                  onClick={handleCloseEditModal}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Photo Lightbox Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative max-w-5xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
            >
              <XCircle className="w-6 h-6" />
            </button>
            <img 
              src={selectedPhoto.image} 
              alt={selectedPhoto.lokasi}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-b-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                  selectedPhoto.type === 'foto_awal' 
                    ? 'bg-[#F59E0B] text-white' 
                    : 'bg-[#10B981] text-white'
                }`}>
                  {selectedPhoto.type === 'foto_awal' ? 'Foto Temuan' : 'Foto Tindak Lanjut'}
                </span>
                <span className={`px-3 py-1 text-sm rounded-full ${getStatusBadgeColor(selectedPhoto.status)} text-white`}>
                  {selectedPhoto.status}
                </span>
              </div>
              <p className="text-white text-lg font-medium">{selectedPhoto.lokasi}</p>
              <p className="text-[#94A3B8] text-sm">{selectedPhoto.tanggal}</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Group Management Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-2xl p-6 w-full max-w-md border border-white/10 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                {editingGroup ? 'Edit Group' : 'Tambah Group'}
              </h3>
              <button
                onClick={handleCloseGroupModal}
                className="text-[#94A3B8] hover:text-white transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#94A3B8] mb-1">Nama Group</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Contoh: Kondisi Jalan Tol (Lubang)"
                  className="w-full px-4 py-2 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#3B82F6]/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94A3B8] mb-1">Warna</label>
                <div className="flex gap-2 flex-wrap">
                  {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewGroupColor(color)}
                      className={`w-10 h-10 rounded-full border-2 transition-all ${newGroupColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={editingGroup ? handleUpdateGroup : handleAddGroup}
                className="flex-1 px-4 py-2 bg-[#3B82F6] hover:bg-[#3B82F6]/80 text-white rounded-lg transition-all duration-200 border border-[#3B82F6]/20"
              >
                {editingGroup ? 'Update' : 'Simpan'}
              </button>
              <button
                onClick={handleCloseGroupModal}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Batal
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Card Detail Modal */}
      {showCardDetailModal && selectedCardType && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-2xl w-full max-w-[900px] border border-white/10 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Sticky Header */}
            <div className="p-6 border-b border-white/10 bg-[#1E293B] sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-white">{getCardDetailData(selectedCardType)?.title}</h3>
                  <p className="text-sm text-[#94A3B8] mt-1">{getCardDetailData(selectedCardType)?.description}</p>
                </div>
                <button
                  onClick={handleCloseCardDetailModal}
                  className="text-[#94A3B8] hover:text-white transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {getCardDetailData(selectedCardType)?.data && getCardDetailData(selectedCardType).data.length > 0 ? (
                <div className="space-y-3">
                  {getCardDetailData(selectedCardType).data.map((item, index) => (
                    <div key={item.id} className="p-4 bg-[#1E293B]/50 rounded-lg border border-white/10 hover:border-[#3B82F6]/30 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-semibold text-white">NO: {item.no}</span>
                            <span className="text-xs text-[#94A3B8]">|</span>
                            <span className="text-sm text-[#94A3B8]">{item.lokasi}</span>
                            <span className="text-xs text-[#94A3B8]">|</span>
                            <span className="text-sm text-[#94A3B8]">{item.jalur}</span>
                          </div>
                          <p className="text-sm text-[#94A3B8] mb-2">{item.keterangan}</p>
                          <div className="flex gap-2 flex-wrap">
                            {item.foto && (
                              <div className="relative">
                                <img src={item.foto} alt="Foto" className="h-16 w-24 object-cover rounded cursor-pointer hover:scale-150 transition-transform" onClick={() => setSelectedPhoto({ image: item.foto, lokasi: item.lokasi, tanggal: item.target || 'N/A', type: 'foto_awal', status: item.realisasiTindakLanjut ? 'Selesai' : 'Belum Dikerjakan' })} />
                              </div>
                            )}
                            {item.fotoTindakLanjut && (
                              <div className="relative">
                                <img src={item.fotoTindakLanjut} alt="Foto TL" className="h-16 w-24 object-cover rounded cursor-pointer hover:scale-150 transition-transform" onClick={() => setSelectedPhoto({ image: item.fotoTindakLanjut, lokasi: item.lokasi, tanggal: item.tanggalTindakLanjut || 'N/A', type: 'foto_tl', status: 'Selesai' })} />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {item.realisasiTindakLanjut && item.realisasiTindakLanjut.trim() !== '' && item.realisasiTindakLanjut !== 'Belum dilakukan' ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-[#10B981] text-white">Selesai</span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-[#EF4444] text-white">Belum Selesai</span>
                          )}
                          <p className="text-xs text-[#94A3B8] mt-1">{item.target || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-[#94A3B8]">Tidak ada data untuk ditampilkan</p>
                </div>
              )}
            </div>
            
            {/* Sticky Footer */}
            <div className="p-6 border-t border-white/10 bg-[#1E293B] sticky bottom-0 z-10">
              <div className="flex justify-end">
                <button
                  onClick={handleCloseCardDetailModal}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default MonitoringSPMWTR;
