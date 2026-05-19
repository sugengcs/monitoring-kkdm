import { useEffect, useState } from 'react';
import { Target, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';

const KpiCardHorizontal = ({ title, value, subtitle, icon: Icon, color, gradient, delay }) => {
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const numericValue = parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
  const isPercentage = value.includes('%');

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay === 0 ? 50 : delay);
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
      className="flex items-center gap-4 p-4 rounded-xl transition-all duration-500 flex-shrink-0"
      style={{
        background: 'linear-gradient(135deg, rgba(17,24,39,0.7) 0%, rgba(11,17,32,0.85) 100%)',
        border: `1px solid ${color}20`,
        backdropFilter: 'blur(16px)',
        boxShadow: hovered ? `0 8px 32px ${color}30` : '0 4px 16px rgba(0,0,0,0.2)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(-20px)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Icon */}
      <div
        className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300"
        style={{
          background: gradient,
          boxShadow: hovered ? `0 0 24px ${color}50` : `0 0 16px ${color}40`,
          transform: hovered ? 'scale(1.1)' : 'scale(1)',
        }}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">{title}</p>
        <div
          className="inline-block px-3 py-1 rounded-lg mb-0.5"
          style={{
            background: `${color}15`,
            border: `1px solid ${color}30`,
          }}
        >
          <span
            className="text-xl font-bold"
            style={{ color: color }}
          >
            {displayValue}
          </span>
        </div>
        <p className="text-[10px] text-slate-600">{subtitle}</p>
      </div>

      {/* Progress bar */}
      <div className="flex-shrink-0 w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: visible ? `${Math.min((numericValue / (isPercentage ? 100 : 250000)) * 100, 100)}%` : '0%',
            background: gradient,
            boxShadow: `0 0 8px ${color}60`,
          }}
        />
      </div>
    </div>
  );
};

const KpiCardsHorizontal = ({ data }) => {
  const { totalKebutuhan, totalRealisasi, totalSisa, progressPersen, sisaPersen } = data;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCardHorizontal
        title="TOTAL KEBUTUHAN"
        value={`${totalKebutuhan} m²`}
        subtitle=""
        icon={Target}
        color="#22C55E"
        gradient="linear-gradient(135deg, #22C55E, #16A34A)"
        delay={0}
      />
      <KpiCardHorizontal
        title="TOTAL REALISASI"
        value={`${totalRealisasi} m²`}
  subtitle=""     
        icon={CheckCircle2}
        color="#06B6D4"
        gradient="linear-gradient(135deg, #06B6D4, #0891B2)"
        delay={0}
      />
      <KpiCardHorizontal
        title="PROGRESS"
        value={`${progressPersen.toFixed(2)}%`}
        subtitle={`${totalRealisasi.toLocaleString('id-ID')} dari ${totalKebutuhan.toLocaleString('id-ID')} m²`}
        icon={TrendingUp}
        color="#3B82F6"
        gradient="linear-gradient(135deg, #3B82F6, #2563EB)"
        delay={300}
      />
      <KpiCardHorizontal
        title="SISA BELUM BEBAS"
        value={`${sisaPersen.toFixed(2)}%`}
        subtitle={`${totalSisa.toLocaleString('id-ID')} m² dari total kebutuhan`}
        icon={AlertTriangle}
        color="#EF4444"
        gradient="linear-gradient(135deg, #EF4444, #DC2626)"
        delay={300}
      />
    </div>
  );
};

export default KpiCardsHorizontal;
