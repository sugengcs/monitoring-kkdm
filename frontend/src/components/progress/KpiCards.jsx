import { useEffect, useState, useRef } from 'react';
import { Target, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';

const KpiCard = ({ title, value, subtitle, icon: Icon, gradient, glowColor, delay }) => {
  const [visible, setVisible] = useState(false);
  const [count, setCount] = useState(0);
  const targetRef = useRef(null);
  const numericValue = parseFloat(value.replace(/[^0-9.]/g, '')) || 0;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!visible) return;
    const duration = 1200;
    const steps = 30;
    const increment = numericValue / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= numericValue) {
        setCount(numericValue);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [visible, numericValue]);

  const displayValue = value.includes('%')
    ? `${count.toFixed(2)}%`
    : `${Math.round(count).toLocaleString('id-ID')} m²`;

  return (
    <div
      ref={targetRef}
      className="relative overflow-hidden rounded-2xl p-5 group cursor-default"
      style={{
        background: 'rgba(17,24,39,0.6)',
        border: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: `all 0.6s ease ${delay}ms`,
      }}
    >
      {/* Glow background */}
      <div
        className="absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-20 group-hover:opacity-30 transition-opacity duration-500"
        style={{ background: gradient }}
      />

      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">{title}</p>
          <p className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            {displayValue}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">{subtitle}</p>
        </div>
        <div
          className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
          style={{
            background: `${glowColor}20`,
            border: `1px solid ${glowColor}40`,
            boxShadow: `0 0 16px ${glowColor}30`,
          }}
        >
          <Icon className="w-5 h-5" style={{ color: glowColor }} />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="mt-4 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: visible ? `${Math.min((numericValue / (title.includes('Progress') ? 100 : 200000)) * 100, 100)}%` : '0%',
            background: gradient,
            transition: 'width 1.2s ease-out',
            boxShadow: `0 0 8px ${glowColor}50`,
          }}
        />
      </div>
    </div>
  );
};

const KpiCards = ({ data }) => {
  const { totalKebutuhan, totalRealisasi, progressPersen, sisaPersen } = data;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        title="Total Kebutuhan"
        subtitle={`${totalRealisasi.toLocaleString('id-ID')} dari ${totalKebutuhan.toLocaleString('id-ID')} m²`}
        icon={Target}
        gradient="linear-gradient(90deg, #22C55E, #16A34A)"
        glowColor="#22C55E"
        delay={0}
      />
      <KpiCard
        title="Total Realisasi"
        value={`${totalRealisasi.toLocaleString('id-ID')} m²`}
        subtitle="Luas tanah terbebas"
        icon={CheckCircle2}
        gradient="linear-gradient(90deg, #06B6D4, #0891B2)"
        glowColor="#06B6D4"
        delay={100}
      />
      <KpiCard
        title="Progress"
        value={`${progressPersen}%`}
        subtitle={`${totalRealisasi.toLocaleString('id-ID')} dari ${totalKebutuhan.toLocaleString('id-ID')} m²`}
        icon={TrendingUp}
        gradient="linear-gradient(90deg, #3B82F6, #2563EB)"
        glowColor="#3B82F6"
        delay={200}
      />
      <KpiCard
        title="Sisa Belum Bebas"
        value={`${sisaPersen}%`}
        subtitle="Luas tanah tersisa"
        icon={AlertTriangle}
        gradient="linear-gradient(90deg, #EF4444, #DC2626)"
        glowColor="#EF4444"
        delay={300}
      />
    </div>
  );
};

export default KpiCards;
