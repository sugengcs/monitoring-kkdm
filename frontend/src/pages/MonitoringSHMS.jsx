import { useState, useEffect } from 'react';
import { ExternalLink, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import SHMSHeaderCards from '../components/SHMSHeaderCards';
import SHMSFrame from '../components/SHMSFrame';

const MonitoringSHMS = () => {
  const [stats] = useState({
    totalSensor: '0',
    sensorOnline: '0',
    sensorOffline: '0',
    alertAktif: '0'
  });
  const [isConnected, setIsConnected] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Check connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('http://shms.risen.id/#/login?redirect=%2F', { mode: 'no-cors' });
        setIsConnected(true);
      } catch (error) {
        setIsConnected(false);
      }
    };

    checkConnection();
    const connectionInterval = setInterval(checkConnection, 30000);

    return () => clearInterval(connectionInterval);
  }, []);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleOpenFullPage = () => {
    window.open('http://shms.risen.id/#/login?redirect=%2F', '_blank');
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#081225] animate-fade-in">
      {/* Header */}
      <div className="flex-shrink-0 bg-[#081225]/80 backdrop-blur-xl px-6 py-4 border-b border-white/6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Monitoring SHMS</h1>
            <p className="text-sm text-[#94A3B8] mt-1">Monitoring Structural Health Monitoring System</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Connection Status */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0F172A]/90 backdrop-blur-sm border border-white/10">
              {isConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-[#22C55E]" />
                  <span className="text-xs text-[#22C55E] font-medium">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-[#EF4444]" />
                  <span className="text-xs text-[#EF4444] font-medium">Disconnected</span>
                </>
              )}
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl text-sm transition-all duration-200 shadow-lg shadow-[#3B82F6]/20"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={handleOpenFullPage}
              className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl text-sm transition-all duration-200 shadow-lg shadow-[#3B82F6]/20 hover:shadow-[#3B82F6]/40"
            >
              <ExternalLink className="w-4 h-4" />
              Open Full Page
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden p-5 gap-5">
        {/* Statistics Cards */}
        <SHMSHeaderCards stats={stats} />

        {/* Iframe Container */}
        <SHMSFrame url="http://shms.risen.id/#/login?redirect=%2F" refreshKey={refreshKey} />
      </div>
    </div>
  );
};

export default MonitoringSHMS;
