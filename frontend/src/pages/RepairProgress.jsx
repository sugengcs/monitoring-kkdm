import { useEffect, useState } from 'react';
import api from '../utils/api';
import { CheckCircle, Clock, AlertCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';

const RepairProgress = () => {
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ status: '', progress_percentage: '', notes: '' });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchMaintenance();
  }, [filter]);

  const fetchMaintenance = async () => {
    try {
      const response = await api.get('/maintenance', { params: { status: filter } });
      setMaintenance(response.data.data);
    } catch (error) {
      console.error('Error fetching maintenance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setEditForm({
      status: item.status || '',
      progress_percentage: item.progress_percentage || '',
      notes: item.notes || ''
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    setUpdating(true);
    try {
      await api.put(`/maintenance/${editingItem.id}`, editForm);
      toast.success('Progress updated successfully');
      setEditingItem(null);
      setEditForm({ status: '', progress_percentage: '', notes: '' });
      fetchMaintenance();
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error('Failed to update progress');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'selesai': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'on_progress': return <Clock className="w-5 h-5 text-blue-400" />;
      default: return <AlertCircle className="w-5 h-5 text-yellow-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Progress Perbaikan</h1>
          <p className="text-gray-400 mt-1">Monitoring progres pekerjaan perbaikan</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Semua Status</option>
          <option value="pending">Pending</option>
          <option value="on_progress">On Progress</option>
          <option value="selesai">Selesai</option>
        </select>
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : maintenance.length === 0 ? (
          <div className="col-span-3 text-center text-gray-400 py-8">
            Tidak ada data perbaikan
          </div>
        ) : (
          maintenance.map((item) => (
            <div key={item.id} className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{item.asset_name || 'Unknown Asset'}</h3>
                  <p className="text-sm text-gray-400 mt-1">{item.report_number}</p>
                </div>
                {getStatusIcon(item.status)}
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Progress</span>
                  <span className="text-white font-medium">{item.progress_percentage}%</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${item.progress_percentage}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Tim:</span>
                  <span className="text-white">{item.repair_team_name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className="text-white capitalize">{item.status.replace('_', ' ')}</span>
                </div>
                {item.notes && (
                  <div className="pt-2 border-t border-gray-700">
                    <p className="text-gray-400 text-xs mb-1">Catatan:</p>
                    <p className="text-gray-300">{item.notes}</p>
                  </div>
                )}
              </div>

              {item.status !== 'selesai' && (
                <button 
                  onClick={() => handleEdit(item)}
                  className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                >
                  Update Progress
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Update Progress</h2>
              <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Progress Percentage (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editForm.progress_percentage}
                  onChange={(e) => setEditForm({ ...editForm, progress_percentage: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="pending">Pending</option>
                  <option value="on_progress">On Progress</option>
                  <option value="selesai">Selesai</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Catatan
                </label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepairProgress;
