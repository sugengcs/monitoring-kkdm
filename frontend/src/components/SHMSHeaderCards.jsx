import { Activity, Cpu, Radio, BarChart3 } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color, gradient }) => (
  <div className="glass-card p-4 flex items-center gap-4 hover:shadow-lg hover:shadow-[#3B82F6]/20 transition-all duration-300 hover:scale-[1.02]">
    <div className={`p-3 rounded-xl ${color} ${gradient}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div className="flex-1">
      <p className="text-xs text-gray-400 mb-1">{title}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  </div>
);

const SHMSHeaderCards = ({ stats }) => {
  return (
    <div className="flex-shrink-0 grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        title="Total Sensor"
        value={stats?.totalSensor || '24'}
        icon={Activity}
        color="bg-[#3B82F6]"
        gradient="gradient-primary"
      />
      <StatCard
        title="Sensor Online"
        value={stats?.sensorOnline || '20'}
        icon={Cpu}
        color="bg-[#22C55E]"
        gradient="gradient-success"
      />
      <StatCard
        title="Sensor Offline"
        value={stats?.sensorOffline || '4'}
        icon={Radio}
        color="bg-[#EF4444]"
        gradient="gradient-danger"
      />
      <StatCard
        title="Alert Aktif"
        value={stats?.alertAktif || '2'}
        icon={BarChart3}
        color="bg-[#F59E0B]"
        gradient="gradient-warning"
      />
    </div>
  );
};

export default SHMSHeaderCards;
