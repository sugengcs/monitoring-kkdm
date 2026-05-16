import { useState, useMemo } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Download, FileText } from 'lucide-react';

const AssetTable = ({ assets, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState('no');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const columns = [
    { key: 'no', label: 'No' },
    { key: 'name', label: 'Nama Aset' },
    { key: 'category', label: 'Jenis Aset' },
    { key: 'location', label: 'Lokasi' },
    { key: 'status', label: 'Status Kondisi' },
    { key: 'date', label: 'Tanggal Update' },
    { key: 'technician', label: 'Teknisi/Petugas' },
    { key: 'notes', label: 'Keterangan' },
  ];

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column) => {
    if (sortColumn !== column) return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-blue-400" />
      : <ArrowDown className="w-4 h-4 text-blue-400" />;
  };

  const filteredAndSortedAssets = useMemo(() => {
    let filtered = assets;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(asset =>
        asset.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      if (sortColumn === 'no') {
        aVal = parseInt(aVal);
        bVal = parseInt(bVal);
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [assets, searchTerm, sortColumn, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedAssets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAssets = filteredAndSortedAssets.slice(startIndex, endIndex);

  const handleExportExcel = () => {
    const csv = [
      columns.map(c => c.label).join(','),
      ...filteredAndSortedAssets.map(asset => [
        asset.no,
        `"${asset.name}"`,
        `"${asset.category}"`,
        `"${asset.location}"`,
        `"${asset.status}"`,
        `"${asset.date}"`,
        `"${asset.technician}"`,
        `"${asset.notes}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data-aset.csv';
    a.click();
  };

  const handleExportPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Export */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari aset..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/30 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 rounded-xl transition-colors"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0F172A]/50 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#1E293B]/50 border-b border-white/5">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    onClick={() => handleSort(column.key)}
                    className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white hover:bg-white/5 transition-all duration-200"
                  >
                    <div className="flex items-center gap-2">
                      {column.label}
                      {getSortIcon(column.key)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentAssets.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-400">
                    Tidak ada data ditemukan
                  </td>
                </tr>
              ) : (
                currentAssets.map((asset, index) => (
                  <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-all duration-200 group">
                    <td className="px-5 py-3.5 text-sm text-gray-300">{asset.no}</td>
                    <td className="px-5 py-3.5 text-sm text-white font-medium">{asset.name}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-300">{asset.category}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-300">{asset.location}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border shadow-sm ${
                        asset.status === 'Baik' ? 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20 shadow-[#22C55E]/10' :
                        asset.status === 'Rusak' ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20 shadow-[#EF4444]/10' :
                        asset.status === 'Perbaikan' || asset.status === 'Dalam Perbaikan' ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20 shadow-[#F59E0B]/10' :
                        asset.status === 'Selesai' ? 'bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/20 shadow-[#8B5CF6]/10' :
                        'bg-gray-500/10 text-gray-400 border-gray-500/20'
                      }`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-300">{asset.date}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-300">{asset.technician}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-300">{asset.notes}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Menampilkan {startIndex + 1} - {Math.min(endIndex, filteredAndSortedAssets.length)} dari {filteredAndSortedAssets.length} data
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
            >
              Sebelumnya
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-4 py-2 rounded-xl transition-colors ${
                  currentPage === page
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800/50 hover:bg-gray-700/50 text-white'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetTable;
