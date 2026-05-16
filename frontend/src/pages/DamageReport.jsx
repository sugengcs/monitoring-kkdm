import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const DamageReport = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await api.get('/reports');
      setReports(response.data.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (report) => {
    if (!window.confirm(`Hapus laporan ${report.report_number}? Data yang dihapus tidak dapat dikembalikan.`)) return;
    try {
      setDeletingId(report.id);
      await api.delete(`/reports/${report.id}`);
      toast.success('Laporan berhasil dihapus');
      setReports(prev => prev.filter(r => r.id !== report.id));
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error(error.response?.data?.message || 'Gagal menghapus laporan');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Pelaporan Kerusakan</h1>
        <p className="text-gray-400 mt-1">Laporkan kerusakan aset jalan tol</p>
      </div>

      {/* Reports List */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                <th className="px-6 py-4">No. Laporan</th>
                <th className="px-6 py-4">Deskripsi</th>
                <th className="px-6 py-4">Tingkat Kerusakan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Tanggal</th>
                {isAdmin && <th className="px-6 py-4 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-6 py-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-6 py-8 text-center text-gray-400">
                    Belum ada laporan kerusakan
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="border-b border-gray-700/50 hover:bg-gray-700/50">
                    <td className="px-6 py-4 font-medium">{report.report_number}</td>
                    <td className="px-6 py-4">{report.description}</td>
                    <td className="px-6 py-4 capitalize">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        report.damage_level === 'ringan' ? 'bg-yellow-500/20 text-yellow-400' :
                        report.damage_level === 'sedang' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {report.damage_level}
                      </span>
                    </td>
                    <td className="px-6 py-4 capitalize">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        report.status === 'selesai' ? 'bg-green-500/20 text-green-400' :
                        report.status === 'on_progress' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {report.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">{new Date(report.reported_at).toLocaleDateString('id-ID')}</td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleDelete(report)}
                          disabled={deletingId === report.id}
                          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Hapus laporan"
                        >
                          {deletingId === report.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </td>
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

export default DamageReport;
