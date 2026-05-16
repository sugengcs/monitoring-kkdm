import { useState } from 'react';
import { X, ExternalLink, Copy, Check } from 'lucide-react';

const LoginHelperModal = ({ isOpen, onClose, username, password }) => {
  const [copiedUsername, setCopiedUsername] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'username') {
      setCopiedUsername(true);
      setTimeout(() => setCopiedUsername(false), 2000);
    } else {
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0F172A] rounded-2xl border border-white/10 max-w-md w-full p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Login Helper SHMS</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instructions */}
        <div className="mb-6">
          <p className="text-gray-300 text-sm mb-2">
            Gunakan kredensial berikut untuk login ke SHMS:
          </p>
          <div className="bg-[#1E293B] rounded-lg p-4 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-gray-400 mb-1">Username</p>
                <p className="text-white font-mono">{username}</p>
              </div>
              <button
                onClick={() => copyToClipboard(username, 'username')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Copy username"
              >
                {copiedUsername ? (
                  <Check className="w-4 h-4 text-[#22C55E]" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Password</p>
                <p className="text-white font-mono">••••••••</p>
              </div>
              <button
                onClick={() => copyToClipboard(password, 'password')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Copy password"
              >
                {copiedPassword ? (
                  <Check className="w-4 h-4 text-[#22C55E]" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-[#FEF3C7]/10 border border-[#F59E0B]/30 rounded-lg p-4 mb-6">
          <p className="text-[#F59E0B] text-xs">
            ⚠️ Jangan bagikan kredensial ini kepada orang lain. Kredensial ini bersifat rahasia.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => window.open('http://shms.risen.id', '_blank')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-lg shadow-[#3B82F6]/20"
          >
            <ExternalLink className="w-4 h-4" />
            Buka SHMS
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-[#1E293B] hover:bg-[#334155] text-white rounded-xl text-sm font-medium transition-all duration-200 border border-white/10"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginHelperModal;
