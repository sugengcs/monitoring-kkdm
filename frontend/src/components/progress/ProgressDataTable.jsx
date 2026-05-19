import { useState, useMemo } from 'react';
import { Search, Filter, Download, Edit2, Trash2, ChevronLeft, ChevronRight, Save, X } from 'lucide-react';

const ProgressDataTable = ({ lahanData, onEdit, onDelete, editingItem, editForm, onEditSave, onEditCancel }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState('no');
  const [sortDirection, setSortDirection] = useState('asc');
  const itemsPerPage = 10;

  const filteredData = useMemo(() => {
    return lahanData.filter(item =>
      item.lokasi?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.keterangan?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [lahanData, searchQuery]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'kebutuhan' || sortField === 'realisasi' || sortField === 'sisa') {
        aVal = parseFloat(aVal?.toString().replace(/,/g, '')) || 0;
        bVal = parseFloat(bVal?.toString().replace(/,/g, '')) || 0;
      } else if (sortField === 'progress') {
        const kebA = parseFloat(a.kebutuhan?.toString().replace(/,/g, '')) || 0;
        const realA = parseFloat(a.realisasi?.toString().replace(/,/g, '')) || 0;
        const kebB = parseFloat(b.kebutuhan?.toString().replace(/,/g, '')) || 0;
        const realB = parseFloat(b.realisasi?.toString().replace(/,/g, '')) || 0;
        aVal = kebA > 0 ? (realA / kebA) * 100 : 0;
        bVal = kebB > 0 ? (realB / kebB) * 100 : 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 95) return '#22c55e';
    if (progress >= 70) return '#eab308';
    return '#ef4444';
  };

  const handleExportCSV = () => {
    const headers = ['No', 'Lokasi', 'Kebutuhan (m²)', 'Realisasi (m²)', 'Sisa (m²)', 'Keterangan'];
    const rows = sortedData.map(item => [
      item.no,
      item.lokasi,
      item.kebutuhan,
      item.realisasi,
      item.sisa,
      item.keterangan,
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

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col min-h-0"
      style={{
        background: 'linear-gradient(135deg, rgba(17,24,39,0.8) 0%, rgba(11,17,32,0.9) 100%)',
        border: '2px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 40px rgba(59,130,246,0.1)',
      }}
    >
      {/* Table header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 pb-0 flex-shrink-0">
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight" style={{ textShadow: '0 0 20px rgba(59,130,246,0.3)' }}>Tabel Data Progress</h2>
          <p className="text-[10px] text-slate-400 mt-0.5">Detail data progress lahan</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="pl-8 pr-3 py-1.5 rounded-lg text-xs text-white bg-white/5 border border-white/10 focus:outline-none focus:border-cyan-500/50 focus:shadow-lg focus:shadow-cyan-500/20 w-40 transition-all"
              style={{ backdropFilter: 'blur(8px)' }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto p-3 flex-1 min-h-0">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '2px solid rgba(59,130,246,0.2)', background: 'rgba(59,130,246,0.05)' }}>
              {[
                { field: 'no', label: 'No' },
                { field: 'lokasi', label: 'Lokasi' },
                { field: 'kebutuhan', label: 'Kebutuhan' },
                { field: 'realisasi', label: 'Realisasi' },
                { field: 'sisa', label: 'Sisa' },
                { field: 'progress', label: 'Progress' },
                { field: 'keterangan', label: 'Keterangan' },
              ].map((col) => (
                <th
                  key={col.field}
                  onClick={() => handleSort(col.field)}
                  className="text-left text-slate-300 font-semibold px-2 py-2 uppercase tracking-wider text-[10px] cursor-pointer hover:text-white hover:bg-cyan-500/10 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortField === col.field && (
                      <span className="text-cyan-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
              <th className="text-center text-slate-300 font-semibold px-2 py-2 uppercase tracking-wider text-[10px]">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-4 text-slate-500 text-xs">Tidak ada data</td>
              </tr>
            ) : (
              paginatedData.map((item, idx) => {
                const keb = parseFloat((item.kebutuhan || '0').toString().replace(/,/g, '')) || 0;
                const real = parseFloat((item.realisasi || '0').toString().replace(/,/g, '')) || 0;
                const progress = keb > 0 ? (real / keb) * 100 : 0;
                const progressColor = getProgressColor(progress);
                const isEditing = editingItem === startIndex + idx;
                const actualIndex = startIndex + idx;

                return (
                  <tr
                    key={idx}
                    className="transition-all duration-300"
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isEditing) {
                        e.currentTarget.style.background = 'rgba(59,130,246,0.08)';
                        e.currentTarget.style.boxShadow = '0 0 20px rgba(59,130,246,0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isEditing) {
                        e.currentTarget.style.background = idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    <td className="px-2 py-1.5 text-slate-400 font-medium text-[10px]">{item.no}</td>
                    <td className="px-2 py-1.5">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.lokasi || ''}
                          onChange={(e) => onEdit?.(item, actualIndex, { ...editForm, lokasi: e.target.value })}
                          className="w-full px-2 py-1 rounded-lg text-[10px] text-white bg-white/10 border border-white/20 focus:outline-none focus:border-cyan-500 transition-all"
                        />
                      ) : (
                        <span className="text-white font-semibold text-[10px]">{item.lokasi}</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.kebutuhan || ''}
                          onChange={(e) => onEdit?.(item, actualIndex, { ...editForm, kebutuhan: e.target.value })}
                          className="w-full px-2 py-1 rounded-lg text-[10px] text-white bg-white/10 border border-white/20 focus:outline-none focus:border-cyan-500 font-mono transition-all"
                        />
                      ) : (
                        <span className="text-slate-300 font-mono text-[10px]">{item.kebutuhan} m²</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.realisasi || ''}
                          onChange={(e) => onEdit?.(item, actualIndex, { ...editForm, realisasi: e.target.value })}
                          className="w-full px-2 py-1 rounded-lg text-[10px] text-white bg-white/10 border border-white/20 focus:outline-none focus:border-cyan-500 font-mono transition-all"
                        />
                      ) : (
                        <span className="text-cyan-400 font-mono font-semibold text-[10px]">{item.realisasi} m²</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.sisa || ''}
                          onChange={(e) => onEdit?.(item, actualIndex, { ...editForm, sisa: e.target.value })}
                          className="w-full px-2 py-1 rounded-lg text-[10px] text-white bg-white/10 border border-white/20 focus:outline-none focus:border-cyan-500 font-mono transition-all"
                        />
                      ) : (
                        <span className="text-slate-300 font-mono text-[10px]">{item.sisa} m²</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {isEditing ? (
                        <span className="text-slate-500 text-[9px] italic">Auto-calculated</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(progress, 100)}%`, background: progressColor }}
                            />
                          </div>
                          <span className="text-white font-bold w-10 text-right text-[10px]">{progress.toFixed(1)}%</span>
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.keterangan || ''}
                          onChange={(e) => onEdit?.(item, actualIndex, { ...editForm, keterangan: e.target.value })}
                          className="w-full px-2 py-1 rounded-lg text-[10px] text-white bg-white/10 border border-white/20 focus:outline-none focus:border-cyan-500 transition-all"
                        />
                      ) : (
                        <span className="text-slate-500 text-[9px]">{item.keterangan}</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => onEditSave?.(actualIndex)}
                              className="p-1 rounded-lg text-green-400 hover:bg-green-500/20 transition-all hover:scale-110"
                            >
                              <Save className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => onEditCancel?.()}
                              className="p-1 rounded-lg text-red-400 hover:bg-red-500/20 transition-all hover:scale-110"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => onEdit?.(item, actualIndex)}
                              className="p-1 rounded-lg text-cyan-400 hover:bg-cyan-500/20 transition-all hover:scale-110"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => onDelete?.(item, actualIndex)}
                              className="p-1 rounded-lg text-red-400 hover:bg-red-500/20 transition-all hover:scale-110"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {/* Sum Row */}
          <tfoot>
            <tr style={{ 
              background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(6,182,212,0.1) 100%)',
              borderTop: '2px solid rgba(59,130,246,0.3)',
              borderBottom: '2px solid rgba(59,130,246,0.3)'
            }}>
              <td className="px-2 py-2 font-bold text-cyan-400 text-[10px]">TOTAL</td>
              <td className="px-2 py-2"></td>
              <td className="px-2 py-2">
                <span className="text-white font-bold text-[10px]">{sortedData.reduce((sum, item) => {
                  const val = typeof item.kebutuhan === 'string' ? parseFloat(item.kebutuhan.replace(/,/g, '').replace(/\./g, '')) : Number(item.kebutuhan);
                  return sum + (isNaN(val) ? 0 : val);
                }, 0).toLocaleString('id-ID')} m²</span>
              </td>
              <td className="px-2 py-2">
                <span className="text-white font-bold text-[10px]">{sortedData.reduce((sum, item) => {
                  const val = typeof item.realisasi === 'string' ? parseFloat(item.realisasi.replace(/,/g, '').replace(/\./g, '')) : Number(item.realisasi);
                  return sum + (isNaN(val) ? 0 : val);
                }, 0).toLocaleString('id-ID')} m²</span>
              </td>
              <td className="px-2 py-2">
                <span className="text-white font-bold text-[10px]">{sortedData.reduce((sum, item) => {
                  const val = typeof item.sisa === 'string' ? parseFloat(item.sisa.replace(/,/g, '').replace(/\./g, '')) : Number(item.sisa);
                  return sum + (isNaN(val) ? 0 : val);
                }, 0).toLocaleString('id-ID')} m²</span>
              </td>
              <td className="px-2 py-2">
                <span className="text-white font-bold text-[10px]">
                  {(() => {
                    const totalKebutuhan = sortedData.reduce((sum, item) => {
                      const val = typeof item.kebutuhan === 'string' ? parseFloat(item.kebutuhan.replace(/,/g, '').replace(/\./g, '')) : Number(item.kebutuhan);
                      return sum + (isNaN(val) ? 0 : val);
                    }, 0);
                    const totalRealisasi = sortedData.reduce((sum, item) => {
                      const val = typeof item.realisasi === 'string' ? parseFloat(item.realisasi.replace(/,/g, '').replace(/\./g, '')) : Number(item.realisasi);
                      return sum + (isNaN(val) ? 0 : val);
                    }, 0);
                    return totalKebutuhan > 0 ? ((totalRealisasi / totalKebutuhan) * 100).toFixed(2) : '0.00';
                  })()}%
                </span>
              </td>
              <td className="px-2 py-2"></td>
              <td className="px-2 py-2"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-white/06 flex-shrink-0">
        <p className="text-[9px] text-slate-500">
          Menampilkan {sortedData.length > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + itemsPerPage, sortedData.length)} dari {sortedData.length} data
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded-lg text-white bg-white/5 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-white/10 disabled:hover:bg-white/5"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-6 h-6 rounded-lg text-[10px] font-semibold transition-all ${
                  currentPage === pageNum
                    ? 'text-white bg-cyan-500 shadow-lg shadow-cyan-500/30'
                    : 'text-slate-400 bg-white/5 hover:bg-white/10 border border-white/10'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded-lg text-white bg-white/5 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-white/10 disabled:hover:bg-white/5"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProgressDataTable;
