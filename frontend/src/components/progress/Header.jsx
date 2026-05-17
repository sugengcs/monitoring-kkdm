import { useEffect, useState } from 'react';
import { Bell, Calendar, User } from 'lucide-react';

const Header = ({ title, subtitle }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const dateStr = now.toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  return (
    <header
      className="flex items-center justify-between px-6 h-16 sticky top-0 z-30"
      style={{
        background: 'linear-gradient(180deg, rgba(11,17,32,0.95) 0%, rgba(11,17,32,0.85) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(59,130,246,0.12)',
      }}
    >
      {/* Title */}
      <div>
        <h1 className="text-lg font-bold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-5">
        {/* Realtime date */}
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-cyan-400" />
          <span>{dateStr}</span>
          <span className="text-cyan-400 font-mono">{timeStr}</span>
        </div>

        {/* Notification */}
        <button className="relative p-2 rounded-xl hover:bg-white/5 transition-colors">
          <Bell className="w-5 h-5 text-slate-300" />
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ background: '#EF4444', boxShadow: '0 0 6px #EF4444' }}
          />
        </button>

        {/* Profile */}
        <div className="flex items-center gap-2.5 pl-4 border-l border-white/10">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
              boxShadow: '0 0 10px rgba(59,130,246,0.4)',
            }}
          >
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-white leading-tight">Admin</p>
            <p className="text-[10px] text-cyan-400">Superuser</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
