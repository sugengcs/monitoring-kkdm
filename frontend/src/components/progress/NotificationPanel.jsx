import { AlertTriangle, Info, Download, FileUp, Map as MapIcon, FileSpreadsheet } from 'lucide-react';

const NotificationPanel = () => {
  const notifications = [
    { icon: AlertTriangle, title: 'Seksi 1C tertinggal', desc: 'Progress di bawah 50%, perlu perhatian khusus', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    { icon: Info, title: 'Update data mingguan', desc: 'Data progress lahan telah diupdate otomatis', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    { icon: AlertTriangle, title: 'Target Q3 2026', desc: 'Realisasi harus mencapai 85% akhir September', color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
  ];

  return (
    <div className="space-y-4">
      {/* Notifications */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: 'rgba(17,24,39,0.6)',
          border: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <h2 className="text-sm font-bold text-white mb-1 tracking-tight">Notifikasi & Peringatan</h2>
        <p className="text-[11px] text-slate-500 mb-4">Pemberitahuan sistem otomatis</p>
        <div className="space-y-3">
          {notifications.map((n, i) => {
            const Icon = n.icon;
            return (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl group transition-all"
                style={{ background: n.bg, border: `1px solid ${n.color}25` }}
              >
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${n.color}20` }}
                >
                  <Icon className="w-4 h-4" style={{ color: n.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white">{n.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{n.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: 'rgba(17,24,39,0.6)',
          border: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <h2 className="text-sm font-bold text-white mb-1 tracking-tight">Quick Actions</h2>
        <p className="text-[11px] text-slate-500 mb-4">Aksi cepat dashboard</p>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: 'Download Report', icon: Download, gradient: 'linear-gradient(135deg, #22c55e, #16a34a)' },
            { label: 'Upload CSV', icon: FileUp, gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
            { label: 'Lihat Peta', icon: MapIcon, gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)' },
            { label: 'Export Data', icon: FileSpreadsheet, gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 hover:scale-105"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)';
                  e.currentTarget.style.background = 'rgba(59,130,246,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: action.gradient, boxShadow: `0 4px 12px ${action.gradient.includes('22c55e') ? 'rgba(34,197,94,0.3)' : action.gradient.includes('3b82f6') ? 'rgba(59,130,246,0.3)' : action.gradient.includes('06b6d4') ? 'rgba(6,182,212,0.3)' : 'rgba(139,92,246,0.3)'}` }}
                >
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-[10px] font-medium text-slate-300">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;
