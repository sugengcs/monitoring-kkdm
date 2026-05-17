import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  Activity,
  Database,
  FileText,
  BarChart3,
  Video,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Globe,
} from 'lucide-react';

const menuItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/progress-dashboard' },
  { label: 'Monitoring Aset', icon: Map, path: '/monitoring' },
  { label: 'Monitoring SHMS', icon: Activity, path: '/monitoring-shms' },
  { label: 'Data Aset', icon: Database, path: '/assets' },
  { label: 'Pelaporan', icon: FileText, path: '/reports' },
  { label: 'Progress Lahan', icon: BarChart3, path: '/progress-lahan' },
  { label: 'Monitoring CCTV', icon: Video, path: '/cctv' },
  { label: 'Analytics', icon: Globe, path: '/analytics' },
  { label: 'User Management', icon: Users, path: '/users' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

const Sidebar = ({ collapsed, setCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside
      className={`fixed left-0 top-0 h-screen z-40 flex flex-col transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
      style={{
        background: 'linear-gradient(180deg, #0B1120 0%, #0F172A 100%)',
        borderRight: '1px solid rgba(59,130,246,0.15)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.4), inset -1px 0 0 rgba(59,130,246,0.08)',
      }}
    >
      {/* Logo area */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/5">
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
            boxShadow: '0 0 12px rgba(59,130,246,0.4)',
          }}
        >
          <Globe className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-white tracking-tight truncate">Becakayu</p>
            <p className="text-[9px] text-cyan-400 font-medium tracking-wider uppercase">Command Center</p>
          </div>
        )}
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 0 8px rgba(59,130,246,0.5)',
        }}
      >
        {collapsed ? <ChevronRight className="w-3 h-3 text-white" /> : <ChevronLeft className="w-3 h-3 text-white" />}
      </button>

      {/* Menu */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              style={{
                background: isActive
                  ? 'linear-gradient(90deg, rgba(59,130,246,0.2) 0%, rgba(6,182,212,0.1) 100%)'
                  : 'transparent',
                border: isActive ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
              }}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`flex-shrink-0 w-5 h-5 transition-all duration-200 ${
                  isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-300'
                }`}
                style={{
                  filter: isActive ? 'drop-shadow(0 0 4px rgba(6,182,212,0.6))' : 'none',
                }}
              />
              {!collapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-white/5">
          <p className="text-[10px] text-slate-500 text-center">WebGIS Monitoring Tol Becakayu</p>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
