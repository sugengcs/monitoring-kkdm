import { useMemo, useEffect, useState } from 'react';

const SEKSI_ORDER = ['Seksi 1A', 'Seksi 1B', 'Seksi 1C', 'Seksi 2A', 'Seksi 2B'];

// Unique colors for each Seksi
const SEKSI_COLORS = {
  'Seksi 1A': { color: '#06B6D4', gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)', glow: '#06B6D440' },
  'Seksi 1B': { color: '#8B5CF6', gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', glow: '#8B5CF640' },
  'Seksi 1C': { color: '#EC4899', gradient: 'linear-gradient(135deg, #EC4899, #DB2777)', glow: '#EC489940' },
  'Seksi 2A': { color: '#F59E0B', gradient: 'linear-gradient(135deg, #F59E0B, #D97706)', glow: '#F59E0B40' },
  'Seksi 2B': { color: '#10B981', gradient: 'linear-gradient(135deg, #10B981, #059669)', glow: '#10B98140' },
};

const ProgressSeksiCards = ({ lahanData }) => {
  const [animatedStats, setAnimatedStats] = useState({});
  const [visible, setVisible] = useState(false);

  const seksiStats = useMemo(() => {
    const groups = {};
    lahanData.forEach(item => {
      const seksi = item.lokasi || 'Tidak Diketahui';
      if (!groups[seksi]) {
        groups[seksi] = { kebutuhan: 0, realisasi: 0, sisa: 0, count: 0 };
      }
      const keb = parseFloat((item.kebutuhan || '0').toString().replace(/,/g, '')) || 0;
      const real = parseFloat((item.realisasi || '0').toString().replace(/,/g, '')) || 0;
      const sisa = parseFloat((item.sisa || '0').toString().replace(/,/g, '')) || 0;
      groups[seksi].kebutuhan += keb;
      groups[seksi].realisasi += real;
      groups[seksi].sisa += sisa;
      groups[seksi].count += 1;
    });

    // Return in fixed order
    return SEKSI_ORDER.map(name => {
      const stats = groups[name] || { kebutuhan: 0, realisasi: 0, sisa: 0, count: 0 };
      const persen = stats.kebutuhan > 0 ? (stats.realisasi / stats.kebutuhan) * 100 : 0;
      return {
        name,
        kebutuhan: stats.kebutuhan,
        realisasi: stats.realisasi,
        sisa: stats.sisa,
        count: stats.count,
        persen: Math.round(persen * 100) / 100,
      };
    });
  }, [lahanData]);

  // Animate values on mount or data change
  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, [lahanData]);

  useEffect(() => {
    if (!visible) return;

    const newAnimatedStats = {};
    const duration = 1000;
    const steps = 25;

    seksiStats.forEach((seksi, index) => {
      const targetPersen = seksi.persen;
      const delay = index * 100;
      let current = 0;
      const increment = targetPersen / steps;

      const timer = setTimeout(() => {
        const interval = setInterval(() => {
          current += increment;
          if (current >= targetPersen) {
            newAnimatedStats[seksi.name] = targetPersen;
            setAnimatedStats(prev => ({ ...prev, [seksi.name]: targetPersen }));
            clearInterval(interval);
          } else {
            newAnimatedStats[seksi.name] = current;
            setAnimatedStats(prev => ({ ...prev, [seksi.name]: current }));
          }
        }, duration / steps);
      }, delay);
    });

    return () => {
      seksiStats.forEach((seksi, index) => {
        clearTimeout(index * 100);
      });
    };
  }, [visible, seksiStats]);

  return (
    <div
      className="rounded-2xl p-5 flex-shrink-0"
      style={{
        background: 'rgba(17,24,39,0.6)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight">Progress per Seksi</h2>
          <p className="text-[10px] text-slate-500 mt-0.5">Realisasi pengadaan tanah tiap seksi</p>
        </div>
        <div className="h-6 w-px bg-gradient-to-b from-transparent via-slate-700 to-transparent"></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {seksiStats.map((seksi) => {
          const colors = SEKSI_COLORS[seksi.name] || { color: '#64748b', gradient: 'linear-gradient(135deg, #64748b, #475569)', glow: '#64748b40' };
          const animatedPersen = animatedStats[seksi.name] || 0;
          return (
            <div
              key={seksi.name}
              className="relative overflow-hidden rounded-xl p-4 group transition-all duration-500 hover:scale-105 hover:-translate-y-1"
              style={{
                background: 'linear-gradient(135deg, rgba(17,24,39,0.95) 0%, rgba(11,17,32,0.98) 100%)',
                border: `2px solid ${colors.color}30`,
                boxShadow: `0 0 20px ${colors.color}40, 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)`,
              }}
            >
              {/* Gradient glow background */}
              <div
                className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"
                style={{ background: colors.gradient }}
              />
              <div
                className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"
                style={{ background: colors.gradient }}
              />

              {/* Animated border glow */}
              <div
                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: `linear-gradient(45deg, ${colors.color}00, ${colors.color}40, ${colors.color}00)`,
                  animation: 'border-glow 2s ease-in-out infinite',
                }}
              />

              <div className="relative">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-bold text-white tracking-wide">{seksi.name}</h3>
                    <p className="text-[9px] text-slate-500 mt-0.5 font-medium">{seksi.count} data</p>
                  </div>
                  <div
                    className="px-2 py-1 rounded-lg"
                    style={{
                      background: `${colors.color}15`,
                      border: `1px solid ${colors.color}30`,
                    }}
                  >
                    <span
                      className="text-lg font-bold"
                      style={{ color: colors.color }}
                    >
                      {animatedPersen.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(animatedPersen, 100)}%`,
                      background: colors.gradient,
                      boxShadow: `0 0 16px ${colors.color}50`,
                    }}
                  />
                </div>

                {/* Stats */}
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Kebutuhan</span>
                    <span className="text-white font-semibold">{seksi.kebutuhan.toLocaleString('id-ID')} m²</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Realisasi</span>
                    <span className="font-semibold" style={{ color: colors.color }}>{seksi.realisasi.toLocaleString('id-ID')} m²</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressSeksiCards;
