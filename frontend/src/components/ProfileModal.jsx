import { useState } from 'react';
import { X, User, Mail, Phone, Clock, Shield, Edit, Camera } from 'lucide-react';
import api from '../utils/api';

const ProfileModal = ({ isOpen, onClose, user }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > maxSize) {
      setError('Ukuran file maksimal 2MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Format file harus jpeg, jpg, png, gif, atau webp');
      return;
    }

    setError('');
    setUploading(true);

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const response = await api.post('/users/upload-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      alert('Foto profil berhasil diupload');
      // Close modal and trigger profile update instead of page reload
      onClose();
      // Optionally trigger a profile update callback if provided
      if (onProfileUpdate) {
        onProfileUpdate();
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      setError('Gagal mengupload foto profil');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl shadow-blue-900/20 w-full max-w-lg transform transition-all duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <h2 className="text-xl font-semibold text-white">Informasi Profil</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700/50 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Profile Photo */}
          <div className="flex items-center justify-center">
            <div className="relative">
              {user?.profile_photo ? (
                <img 
                  src={`http://localhost:5000${user.profile_photo}`} 
                  alt="Profile" 
                  className="w-24 h-24 rounded-full object-cover border-4 border-blue-500"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-12 h-12 text-white" />
                </div>
              )}
              <label className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors cursor-pointer">
                <Camera className="w-4 h-4 text-white" />
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
          
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm text-center">
              {error}
            </div>
          )}
          
          {uploading && (
            <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3 text-blue-400 text-sm text-center">
              Mengupload foto...
            </div>
          )}

          <p className="text-xs text-gray-500 text-center">Maksimal 2MB (JPEG, JPG, PNG, GIF, WEBP)</p>
          
          {/* User Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
              <div className="p-3 bg-blue-600/20 rounded-xl">
                <User className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Nama User</p>
                <p className="text-white font-medium">{user?.full_name || user?.name || 'Administrator'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
              <div className="p-3 bg-purple-600/20 rounded-xl">
                <Shield className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Role</p>
                <p className="text-white font-medium">{user?.role || 'Administrator'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
              <div className="p-3 bg-green-600/20 rounded-xl">
                <Mail className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p className="text-white font-medium">{user?.email || 'admin@becakayu.com'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
              <div className="p-3 bg-yellow-600/20 rounded-xl">
                <Phone className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Nomor Telepon</p>
                <p className="text-white font-medium">{user?.phone || '+62 812 3456 7890'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
              <div className="p-3 bg-cyan-600/20 rounded-xl">
                <Clock className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Terakhir Login</p>
                <p className="text-white font-medium">{user?.lastLogin || '14 Mei 2026, 18:45'}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-700/50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
