import { useState, useEffect } from 'react';
import { Calendar, Wrench, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, Bell } from 'lucide-react';
import api from '../utils/api';

const RepairReportSummary = ({ onSedangPerbaikanClick, onSelesaiClick, onBelumSelesaiClick, reports }) => {
  const [data, setData] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  // Calculate totals from reports prop if provided (for consistency with dashboard)
  const calculateTotalsFromReports = (reportsData, dateFilterStart, dateFilterEnd) => {
    if (!reportsData || !Array.isArray(reportsData)) return null;

    // Apply date filter if provided
    let filteredReports = reportsData;
    if (dateFilterStart || dateFilterEnd) {
      filteredReports = reportsData.filter(report => {
        if (!report.reported_at) return false;
        const reportDate = new Date(report.reported_at).toISOString().split('T')[0];
        if (dateFilterStart && reportDate < dateFilterStart) return false;
        if (dateFilterEnd && reportDate > dateFilterEnd) return false;
        return true;
      });
    }

    const total = filteredReports.length;
    const totalSelesai = filteredReports.filter(r => r.status === 'selesai').length;
    // Match Dashboard filter: only pending and diproses count as "belum selesai"
    const totalSisa = filteredReports.filter(r => r.status === 'pending' || r.status === 'diproses').length;
    return {
      total,
      total_selesai: totalSelesai,
      total_sisa: totalSisa
    };
  };

  // Use reports prop if available, otherwise fetch from API
  useEffect(() => {
    if (reports && Array.isArray(reports)) {
      // Apply date filter to reports
      let filteredReports = reports;
      if (startDate || endDate) {
        filteredReports = reports.filter(report => {
          if (!report.reported_at) return false;
          const reportDate = new Date(report.reported_at).toISOString().split('T')[0];
          if (startDate && reportDate < startDate) return false;
          if (endDate && reportDate > endDate) return false;
          return true;
        });
      }

      // Group by date for table display
      const groupedData = {};
      filteredReports.forEach(report => {
        if (!report.reported_at) return;
        const date = new Date(report.reported_at).toISOString().split('T')[0];
        if (!groupedData[date]) {
          groupedData[date] = {
            tanggal: date,
            total: 0,
            perbaikan: 0,
            selesai: 0,
            sisa: 0
          };
        }
        groupedData[date].total++;
        if (report.status === 'selesai') {
          groupedData[date].selesai++;
        } else if (report.status === 'pending' || report.status === 'diproses') {
          groupedData[date].sisa++;
        }
        if (report.status === 'diproses' || report.status === 'dalam_perbaikan') {
          groupedData[date].perbaikan++;
        }
      });

      const tableData = Object.values(groupedData).sort((a, b) => b.tanggal.localeCompare(a.tanggal));
      setData(tableData);

      const calculatedTotals = calculateTotalsFromReports(reports, startDate, endDate);
      setTotals(calculatedTotals);
      setLoading(false);
      console.log('[RepairReportSummary] Using reports prop with filter:', { startDate, endDate, totals: calculatedTotals, tableDataCount: tableData.length });
    }
  }, [reports, startDate, endDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reports/summary', {
        params: {
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          page: currentPage,
          limit: 10
        }
      });
      console.log('[RepairReportSummary] API Response:', response.data);
      console.log('[RepairReportSummary] Totals:', response.data.totals);
      setData(response.data.data);
      setTotals(response.data.totals);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('[RepairReportSummary] Error fetching repair report summary:', error);
    } finally {
      setLoading(false);
    }
  };

  // Only fetch from API if reports prop is not provided
  useEffect(() => {
    if (!reports) {
      fetchData();
    }
  }, [startDate, endDate, currentPage, reports]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const SummaryCard = ({ title, value, icon: Icon, color, bgColor, onClick }) => (
    <div 
      className="glass-card glass-card-hover overflow-hidden group cursor-pointer"
      onClick={onClick}
    >
      <div className={`absolute inset-0 ${bgColor} opacity-10 group-hover:opacity-20 transition-opacity duration-300`} />
      <div className="relative p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#94A3B8] text-xs font-medium uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold text-white mt-1 tracking-tight">{value || 0}</p>
          </div>
          <div className={`p-2.5 rounded-xl ${bgColor} bg-opacity-20 backdrop-blur-sm`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Main Card */}
      <div className="glass-card p-4 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-sm font-bold text-white tracking-tight">Rekapan Laporan Perbaikan</h2>
          
          {/* Date Filters */}
          <div className="flex gap-2">
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-3 py-1.5 bg-[#111827] border border-white/6 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 focus:border-[#3B82F6]/50"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-3 py-1.5 bg-[#111827] border border-white/6 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 focus:border-[#3B82F6]/50"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 bg-[#1F2937] hover:bg-[#374151] text-white rounded-xl text-xs transition-all duration-200"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1 min-h-0">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[#94A3B8] border-b border-white/6">
                <th className="pb-3 font-medium">Tanggal</th>
                <th className="pb-3 font-medium">Total</th>
                <th className="pb-3 font-medium">Perbaikan</th>
                <th className="pb-3 font-medium">Selesai</th>
                <th className="pb-3 font-medium">Sisa</th>
              </tr>
            </thead>
            <tbody className="text-[#E5E7EB]">
              {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <tr key={index} className="border-b border-white/6">
                    <td className="py-2"><div className="h-3 bg-[#1F2937] rounded w-24 animate-pulse"></div></td>
                    <td className="py-2"><div className="h-3 bg-[#1F2937] rounded w-12 animate-pulse"></div></td>
                    <td className="py-2"><div className="h-3 bg-[#1F2937] rounded w-12 animate-pulse"></div></td>
                    <td className="py-2"><div className="h-3 bg-[#1F2937] rounded w-12 animate-pulse"></div></td>
                    <td className="py-2"><div className="h-3 bg-[#1F2937] rounded w-12 animate-pulse"></div></td>
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center">
                    <Bell className="w-8 h-8 mx-auto mb-2 text-[#94A3B8]" />
                    <p className="text-[#94A3B8] text-xs">Tidak ada data laporan</p>
                  </td>
                </tr>
              ) : (
                data.map((item, index) => (
                  <tr key={index} className="border-b border-white/6 hover:bg-white/5 transition-colors">
                    <td className="py-2 font-medium">{formatDate(item.tanggal)}</td>
                    <td className="py-2">
                      <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-[#374151] text-white">
                        {item.total}
                      </span>
                    </td>
                    <td className="py-2">
                      <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-[#F59E0B]/20 text-[#F59E0B]">
                        {item.perbaikan}
                      </span>
                    </td>
                    <td className="py-2">
                      <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-[#22C55E]/20 text-[#22C55E]">
                        {item.selesai}
                      </span>
                    </td>
                    <td className="py-2">
                      <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-[#EF4444]/20 text-[#EF4444]">
                        {item.sisa}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/6">
            <p className="text-xs text-[#94A3B8]">
              {pagination.page} / {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={pagination.page === 1}
                className="px-3 py-1.5 bg-[#111827] hover:bg-[#1F2937] text-white rounded-xl text-xs transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1.5 bg-[#111827] hover:bg-[#1F2937] text-white rounded-xl text-xs transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RepairReportSummary;
