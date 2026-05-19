import { useState, useEffect } from 'react';
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
  X,
  DollarSign,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  FileCheck
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
  { path: '/anggaran-pemeliharaan', icon: DollarSign, label: 'Anggaran Pemeliharaan', roles: ['admin', 'teknisi', 'manager'] },
  { path: '/monitoring-spm-wtr', icon: FileText, label: 'Monitoring SPM WTR', roles: ['admin', 'teknisi', 'manager'] },
  { path: '/progress-lahan', icon: MapPinned, label: 'Progress Lahan', roles: ['admin', 'teknisi', 'manager'] },
  { path: '/cctv', icon: Video, label: 'Monitoring CCTV', roles: ['admin', 'teknisi', 'manager'] },
  { path: '/analytics', icon: BarChart3, label: 'Analytics', roles: ['admin', 'manager'] },
  { path: '/users', icon: Users, label: 'User Management', roles: ['admin'] },
  { path: '/settings', icon: Settings, label: 'Settings', roles: ['admin'] },
  { path: '/logout', icon: LogOut, label: 'Logout', roles: ['admin', 'teknisi', 'karyawan', 'manager'], isLogout: true },
];

const Sidebar = ({ isOpen, onToggle, isMobile }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const filteredMenuItems = menuItems.filter(item => 
    !item.roles || item.roles.includes(user?.role)
  );

  return (
    <>
      {/* Mobile Hamburger Button - Only show on mobile */}
      {isMobile && (
        <button
          onClick={onToggle}
          className="fixed top-4 left-4 z-50 p-2 bg-[#0F172A] border border-white/10 rounded-lg text-white shadow-lg"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 bg-[#0F172A]/95 backdrop-blur-xl border-r border-white/10 flex flex-col transition-all duration-300",
        isMobile ? (isOpen ? "translate-x-0 w-64" : "-translate-x-full w-64") : "lg:translate-x-0 w-60",
        !isMobile && "lg:static"
      )}>
        {/* Logo Section */}
        <div className="p-3 sm:p-5 border-b border-white/5">
          <img
            src="/logo-kikdm.png"
            alt="PT KKDM"
            className="h-12 sm:h-16 w-auto object-contain mx-auto"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 sm:p-3 space-y-1 overflow-y-auto">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            if (item.isLogout) {
              return (
                <button
                  key={item.path}
                  onClick={logout}
                  className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 w-full rounded-lg text-[#94A3B8] hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 group"
                >
                  <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  <span className="font-medium text-xs sm:text-sm">{item.label}</span>
                </button>
              );
            }
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => isMobile && onToggle(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-all duration-200 group',
                    isActive
                      ? 'bg-gradient-to-r from-[#3B82F6]/20 to-[#3B82F6]/5 text-[#3B82F6] border border-[#3B82F6]/20 shadow-lg shadow-[#3B82F6]/10'
                      : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'
                  )
                }
              >
                <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                <span className="font-medium text-xs sm:text-sm">{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#3B82F6] shadow-lg shadow-[#3B82F6]/50" />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Info - Compact on mobile */}
        <div className="p-3 sm:p-5 border-t border-white/5">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center text-white font-bold text-sm sm:text-base">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-xs sm:text-sm truncate">{user?.username || 'User'}</p>
              <p className="text-[#94A3B8] text-[10px] sm:text-xs capitalize">{user?.role || 'Role'}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
