import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Map, 
  Database, 
  AlertTriangle, 
  Wrench, 
  MapPinned,
  Video, 
  BarChart3, 
  Users, 
  Settings,
  LogOut,
  FileText,
  Activity
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';

const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'teknisi', 'karyawan', 'manager'] },
  { path: '/monitoring', icon: Map, label: 'Monitoring Aset', roles: ['admin', 'teknisi', 'manager'] },
  { path: '/monitoring-shms', icon: Activity, label: 'Monitoring SHMS', roles: ['admin', 'teknisi', 'manager'] },
  { path: '/assets', icon: Database, label: 'Data Aset', roles: ['admin', 'teknisi', 'manager'] },
  { path: '/reports', icon: AlertTriangle, label: 'Pelaporan', roles: ['admin', 'teknisi', 'karyawan', 'manager'] },
  { path: '/karyawan', icon: FileText, label: 'Buat Laporan', roles: ['karyawan'] },
  { path: '/repair-tracking', icon: Wrench, label: 'Status Perbaikan', roles: ['admin', 'teknisi'] },
  { path: '/progress-lahan', icon: MapPinned, label: 'Progress Lahan', roles: ['admin', 'teknisi', 'manager'] },
  { path: '/cctv', icon: Video, label: 'Monitoring CCTV', roles: ['admin', 'teknisi', 'manager'] },
  { path: '/analytics', icon: BarChart3, label: 'Analytics', roles: ['admin', 'manager'] },
  { path: '/users', icon: Users, label: 'User Management', roles: ['admin'] },
  { path: '/settings', icon: Settings, label: 'Settings', roles: ['admin'] },
  { path: '/logout', icon: LogOut, label: 'Logout', roles: ['admin', 'teknisi', 'karyawan', 'manager'], isLogout: true },
];

const Sidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const filteredMenuItems = menuItems.filter(item => 
    !item.roles || item.roles.includes(user?.role)
  );

  return (
    <aside className="w-64 bg-[#0F172A]/80 backdrop-blur-xl border-r border-white/6 flex flex-col">
      <div className="p-6 border-b border-white/6 text-center">
        <img
          src="/logo-kikdm.png"
          alt="PT KKDM"
          className="h-20 w-auto object-contain mx-auto"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          if (item.isLogout) {
            return (
              <button
                key={item.path}
                onClick={logout}
                className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-[#94A3B8] hover:bg-white/5 hover:text-white transition-all duration-200"
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          }
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                  isActive
                    ? 'bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20'
                    : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'
                )
              }
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
