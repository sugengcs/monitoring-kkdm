import { useState } from 'react';
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
  Activity,
  Menu,
  X
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

const Sidebar = ({ isOpen, onToggle }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const filteredMenuItems = menuItems.filter(item => 
    !item.roles || item.roles.includes(user?.role)
  );

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={onToggle}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#0F172A] border border-white/10 rounded-lg text-white"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 bg-[#0F172A]/95 backdrop-blur-xl border-r border-white/10 flex flex-col transition-transform duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        "w-60"
      )}>
        <div className="p-5 border-b border-white/5">
          <img
            src="/logo-kikdm.png"
            alt="PT KKDM"
            className="h-16 w-auto object-contain mx-auto"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            if (item.isLogout) {
              return (
                <button
                  key={item.path}
                  onClick={logout}
                  className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-[#94A3B8] hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 group"
                >
                  <Icon className="w-4.5 h-4.5 group-hover:scale-110 transition-transform duration-200" />
                  <span className="font-medium text-sm">{item.label}</span>
                </button>
              );
            }
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => onToggle(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group',
                    isActive
                      ? 'bg-gradient-to-r from-[#3B82F6]/20 to-[#3B82F6]/5 text-[#3B82F6] border border-[#3B82F6]/20 shadow-lg shadow-[#3B82F6]/10'
                      : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'
                  )
                }
              >
                <Icon className="w-4.5 h-4.5 group-hover:scale-110 transition-transform duration-200" />
                <span className="font-medium text-sm">{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#3B82F6] shadow-lg shadow-[#3B82F6]/50" />
                )}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
