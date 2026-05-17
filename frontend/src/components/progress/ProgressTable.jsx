import { useMemo } from 'react';

const getStatusBadge = (persen) => {
  if (persen >= 90) return { label: 'Selesai', bg: 'rgba(34,197,94,0.15)', color: '#22c55e', border: 'rgba(34,197,94,0.3)' };
  if (persen >= 50) return { label: 'Proses', bg: 'rgba(234,179,8,0.15)', color: '#eab308', border: 'rgba(234,179,8,0.3)' };
  return { label: 'Belum', bg: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' };
};

const ProgressTable = ({ lahanData }) => {
  const rows = useMemo(() => {
    const groups = {};
    lahanData.forEach(item => {
      const seksi = item.lokasi || 'Tidak Diketahui';
      if (!groups[seksi]) groups[seksi] = { kebutuhan: 0, realisasi: 0, sisa: 0, count: 0 };
      groups[seksi].kebutuhan += parseFloat((item.kebutuhan || '0').toString().replace(/,/g, '')) || 0;
      groups[seksi].realisasi += parseFloat((item.realisasi || '0').toString().replace(/,/g, '')) || 0;
      groups[seksi].sisa += parseFloat((item.sisa || '0').toString().replace(/,/g, '')) || 0;
      groups[seksi].count += 1;
    });
    return Object.entries(groups)
      .map(([name, s]) => {
        const persen = s.kebutuhan > 0 ? (s.realisasi / s.kebutuhan) * 100 : 0;
        return { name, ...s, persen };
      })
      .sort((a, b) => b.persen - a.persen);
  }, [lahanData]);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(17,24,39,0.6)',
        border: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="p-5 pb-0">
        <h2 className="text-sm font-bold text-white tracking-tight">Tabel Ringkasan Progress</h2>
        <p className="text-[11px] text-slate-500 mt-0.5 mb-4">Ringkasan data pengadaan tanah per seksi</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <th className="text-left text-slate-400 font-semibold px-5 py-3 uppercase tracking-wider">Seksi</th>
              <th className="text-right text-slate-400 font-semibold px-5 py-3 uppercase tracking-wider">Kebutuhan</th>
              <th className="text-right text-slate-400 font-semibold px-5 py-3 uppercase tracking-wider">Realisasi</th>
              <th className="text-right text-slate-400 font-semibold px-5 py-3 uppercase tracking-wider">Progress</th>
              <th className="text-center text-slate-400 font-semibold px-5 py-3 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const badge = getStatusBadge(row.persen);
              const barColor = row.persen >= 90 ? '#22c55e' : row.persen >= 50 ? '#eab308' : '#ef4444';
              return (
                <tr
                  key={row.name}
                  className="group transition-colors"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.04)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td className="px-5 py-3">
                    <p className="text-white font-medium">{row.name}</p>
                    <p className="text-[10px] text-slate-500">{row.count} data</p>
                  </td>
                  <td className="px-5 py-3 text-right text-slate-300 font-mono">{row.kebutuhan.toLocaleString('id-ID')} m²</td>
                  <td className="px-5 py-3 text-right text-cyan-400 font-mono">{row.realisasi.toLocaleString('id-ID')} m²</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(row.persen, 100)}%`,
                            background: barColor,
                            boxShadow: `0 0 6px ${barColor}60`,
                            transition: 'width 1s ease-out',
                          }}
                        />
                      </div>
                      <span className="text-white font-bold w-16 text-right">{row.persen.toFixed(2)}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold"
                      style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                    >
                      {badge.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProgressTable;
