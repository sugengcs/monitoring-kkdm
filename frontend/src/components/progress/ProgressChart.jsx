import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="rounded-xl p-3 text-xs"
      style={{
        background: 'rgba(15,23,42,0.95)',
        border: '1px solid rgba(59,130,246,0.25)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <p className="font-bold text-white mb-1">{d.name}</p>
      <p className="text-cyan-400">Progress: <strong>{d.persen.toFixed(2)}%</strong></p>
      <p className="text-slate-400">Kebutuhan: {d.kebutuhan.toLocaleString('id-ID')} m²</p>
      <p className="text-slate-400">Realisasi: {d.realisasi.toLocaleString('id-ID')} m²</p>
    </div>
  );
};

const ProgressChart = ({ lahanData }) => {
  const chartData = useMemo(() => {
    const groups = {};
    lahanData.forEach(item => {
      const seksi = item.lokasi || 'Tidak Diketahui';
      if (!groups[seksi]) groups[seksi] = { kebutuhan: 0, realisasi: 0 };
      groups[seksi].kebutuhan += parseFloat((item.kebutuhan || '0').toString().replace(/,/g, '')) || 0;
      groups[seksi].realisasi += parseFloat((item.realisasi || '0').toString().replace(/,/g, '')) || 0;
    });
    return Object.entries(groups)
      .map(([name, stats]) => ({
        name,
        persen: stats.kebutuhan > 0 ? (stats.realisasi / stats.kebutuhan) * 100 : 0,
        kebutuhan: stats.kebutuhan,
        realisasi: stats.realisasi,
      }))
      .sort((a, b) => b.persen - a.persen);
  }, [lahanData]);

  const getBarColor = (val) => {
    if (val >= 90) return '#22c55e';
    if (val >= 50) return '#eab308';
    return '#ef4444';
  };

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'rgba(17,24,39,0.6)',
        border: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <h2 className="text-sm font-bold text-white mb-1 tracking-tight">Grafik Monitoring Progres Per Seksi</h2>
      <p className="text-[11px] text-slate-500 mb-4">Realisasi pengadaan tanah tiap seksi</p>
      <div className="w-full" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              unit="%"
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.06)' }} />
            <Bar dataKey="persen" radius={[6, 6, 0, 0]} maxBarSize={36}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.persen)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ProgressChart;
