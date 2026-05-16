import { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit, Trash2, Shield, X, Eye } from 'lucide-react';

const getRoleBadge = (role) => {
  const roleConfig = {
    admin: { color: 'bg-red-500/20 text-red-400', label: 'Admin' },
    teknisi: { color: 'bg-blue-500/20 text-blue-400', label: 'Teknisi' },
    karyawan: { color: 'bg-green-500/20 text-green-400', label: 'Karyawan' },
    manager: { color: 'bg-purple-500/20 text-purple-400', label: 'Manager' }
  };
  return roleConfig[role] || { color: 'bg-gray-500/20 text-gray-400', label: role };
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'karyawan',
    phone: ''
  });
  const [editingUserId, setEditingUserId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [viewedPassword, setViewedPassword] = useState('');
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchUsers();
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      full_name: '',
      role: 'karyawan',
      phone: ''
    });
    setEditingUserId(null);
    setIsEditMode(false);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', formData);
      setShowModal(false);
      resetForm();
      fetchUsers();
      alert('User berhasil ditambahkan');
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Gagal menambahkan user');
    }
  };

  const handleEditClick = (user) => {
    setEditingUserId(user.id);
    setIsEditMode(true);
    setFormData({
      username: user.username,
      password: '', // Password kosong saat edit
      full_name: user.full_name,
      role: user.role,
      phone: user.phone || ''
    });
    setShowModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      // Hanya kirim field yang perlu diupdate
      const updateData = {
        full_name: formData.full_name,
        role: formData.role,
        phone: formData.phone
      };
      
      // Jika password diisi, update password juga
      if (formData.password.trim()) {
        updateData.password = formData.password;
      }

      await api.put(`/users/${editingUserId}`, updateData);
      setShowModal(false);
      resetForm();
      fetchUsers();
      alert('User berhasil diupdate');
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Gagal mengupdate user');
    }
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleShowPassword = async (userId, username) => {
    try {
      const response = await api.get(`/users/${userId}/password`);
      setViewedPassword(response.data.data.password);
      setShowPasswordModal(true);
    } catch (error) {
      console.error('Error fetching password:', error);
      alert('Gagal mengambil password');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Apakah Anda yakin ingin menghapus user ini?')) return;
    
    try {
      await api.delete(`/users/${userId}`);
      fetchUsers();
      alert('User berhasil dihapus');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Gagal menghapus user');
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Akses ditolak. Halaman ini hanya untuk admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-gray-400 mt-1">Kelola pengguna sistem</p>
        </div>
        <button 
          onClick={handleOpenCreateModal}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Tambah User
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                <th className="px-6 py-4">Username</th>
                <th className="px-6 py-4">Nama Lengkap</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Password</th>
                <th className="px-6 py-4">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                    Tidak ada user
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-700/50 hover:bg-gray-700/50">
                    <td className="px-6 py-4 font-medium">{user.username}</td>
                    <td className="px-6 py-4">{user.full_name}</td>
                    <td className="px-6 py-4">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role).color}`}>
                        {getRoleBadge(user.role).label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleShowPassword(user.id, user.username)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        Lihat
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEditClick(user)}
                          className="p-2 hover:bg-gray-600 rounded-lg transition-colors text-blue-400" 
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {parseInt(user.id) !== parseInt(currentUser.id) && (
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 hover:bg-gray-600 rounded-lg transition-colors text-red-400" 
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {isEditMode ? 'Edit User' : 'Tambah User Baru'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={isEditMode ? handleUpdateUser : handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Username {isEditMode ? '' : '*'}
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  required={!isEditMode}
                  readOnly={isEditMode}
                  disabled={isEditMode}
                  className={`w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
                {isEditMode && (
                  <p className="text-xs text-gray-500 mt-1">Username tidak dapat diubah</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  required
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password {isEditMode ? '(Kosongkan jika tidak ingin mengubah)' : '*'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required={!isEditMode}
                  placeholder={isEditMode ? 'Biarkan kosong jika tidak ingin mengubah' : ''}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  required
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="karyawan">Karyawan</option>
                  <option value="teknisi">Teknisi</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {isEditMode ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Show Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Password User</h2>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-400 mb-2">Password:</p>
              <p className="text-2xl font-mono text-white break-all">{viewedPassword}</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(viewedPassword);
                alert('Password berhasil disalin');
              }}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Salin Password
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
