import { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import Sidebar from '../components/progress/Sidebar';
import Header from '../components/progress/Header';
import KpiCards from '../components/progress/KpiCards';
import ProgressChart from '../components/progress/ProgressChart';
import ProgressTable from '../components/progress/ProgressTable';
import ProgressMap from '../components/progress/ProgressMap';
import NotificationPanel from '../components/progress/NotificationPanel';

const ProgressDashboard = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [lahanData, setLahanData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/progress-lahan');
      if (res.data.success) {
        const formatted = res.data.data.map(item => ({
          ...item,
          kebutuhan: item.kebutuhan ? item.kebutuhan.toLocaleString('en-US') : '0',
          realisasi: item.realisasi ? item.realisasi.toLocaleString('en-US') : '0',
          sisa: item.sisa ? item.sisa.toLocaleString('en-US') : '0',
        }));
        setLahanData(formatted);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      // Use demo data as fallback
      setLahanData([
        { lokasi: 'Seksi 1A', kebutuhan: '45,000', realisasi: '41,400', sisa: '3,600', keterangan: 'Hampir selesai' },
        { lokasi: 'Seksi 1B', kebutuhan: '52,000', realisasi: '40,560', sisa: '11,440', keterangan: 'Proses negosiasi' },
        { lokasi: 'Seksi 1C', kebutuhan: '38,000', realisasi: '17,100', sisa: '20,900', keterangan: 'Terhambat pembebasan' },
        { lokasi: 'Seksi 2A', kebutuhan: '60,000', realisasi: '52,800', sisa: '7,200', keterangan: 'Maju cepat' },
        { lokasi: 'Seksi 2B', kebutuhan: '48,000', realisasi: '29,760', sisa: '18,240', keterangan: 'Sedang berjalan' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const tk = lahanData.reduce((s, i) => s + (parseFloat((i.kebutuhan || '0').toString().replace(/,/g, '')) || 0), 0);
    const tr = lahanData.reduce((s, i) => s + (parseFloat((i.realisasi || '0').toString().replace(/,/g, '')) || 0), 0);
    const ts = lahanData.reduce((s, i) => s + (parseFloat((i.sisa || '0').toString().replace(/,/g, '')) || 0), 0);
    return {
      totalKebutuhan: tk,
      totalRealisasi: tr,
      totalSisa: ts,
      progressPersen: tk > 0 ? ((tr / tk) * 100) : 0,
      sisaPersen: tk > 0 ? ((ts / tk) * 100) : 0,
    };
  }, [lahanData]);

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0B1120 0%, #0F172A 50%, #111827 100%)' }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <div
        className="transition-all duration-300"
        style={{ marginLeft: collapsed ? '64px' : '240px' }}
      >
        <Header
          title="Dashboard Monitoring Progress Pengadaan Tanah"
          subtitle="Jalan Tol Becakayu — Real-time Command Center"
        />

        <main className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div
                className="w-10 h-10 rounded-full border-2 border-transparent animate-spin"
                style={{
                  borderTopColor: '#3B82F6',
                  borderRightColor: '#06B6D4',
                  boxShadow: '0 0 12px rgba(59,130,246,0.3)',
                }}
              />
              <span className="ml-3 text-sm text-slate-400">Memuat data dashboard...</span>
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              <KpiCards data={stats} lahanData={lahanData} />

              {/* Main grid: Chart + Map | Notifications */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Left column: Chart + Table */}
                <div className="xl:col-span-2 space-y-6">
                  <ProgressChart lahanData={lahanData} />
                  <ProgressMap />
                  <ProgressTable lahanData={lahanData} />
                </div>

                {/* Right column: Notifications + Quick Actions */}
                <div className="xl:col-span-1">
                  <NotificationPanel />
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default ProgressDashboard;
