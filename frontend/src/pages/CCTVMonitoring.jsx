import { useEffect, useState, useRef } from 'react';
import CCTVPlayer from '../components/CCTVPlayer';
import { Video, VideoOff, Maximize2, X } from 'lucide-react';

const CCTVMonitoring = () => {
  const [cctvs, setCctvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCCTV, setSelectedCCTV] = useState(null);
  const [cctvStatuses, setCctvStatuses] = useState({});

  // CCTV data provided by user
  const cctvData = [
    {
      id: 1,
      name: "On Ramp Cassablanca",
      streamUrl: "https://cctv.kkdm.co.id/api/cctv/1/35/index.m3u8"
    },
    {
      id: 2,
      name: "On Ramp Wiyoto Wiyono",
      streamUrl: "https://cctv.kkdm.co.id/api/cctv/1/39/index.m3u8"
    },
    {
      id: 3,
      name: "Loop Gembrong",
      streamUrl: "https://cctv.kkdm.co.id/api/cctv/1/37/index.m3u8"
    },
    {
      id: 4,
      name: "KM 01+300 A",
      streamUrl: "https://cctv.kkdm.co.id/api/cctv/1/36/index.m3u8"
    },
    {
      id: 5,
      name: "KM 02+000 A",
      streamUrl: "https://cctv.kkdm.co.id/api/cctv/1/3/index.m3u8"
    },
    {
      id: 6,
      name: "On Ramp Cipinang",
      streamUrl: "https://cctv.kkdm.co.id/api/cctv/1/47/index.m3u8"
    },
    {
      id: 7,
      name: "KM 11+000 A",
      streamUrl: "https://cctv.kkdm.co.id/api/cctv/1/5/index.m3u8"
    },
    {
      id: 8,
      name: "KM 15+000 A",
      streamUrl: "https://cctv.kkdm.co.id/api/cctv/1/50/index.m3u8"
    },
    {
      id: 9,
      name: "GT Marga Jaya",
      streamUrl: "https://cctv.kkdm.co.id/api/cctv/3/42/index.m3u8"
    },
    {
      id: 10,
      name: "Simpang Marga Jaya",
      streamUrl: "https://cctv.kkdm.co.id/api/cctv/3/43/index.m3u8"
    }
  ];

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setCctvs(cctvData);
      setLoading(false);
    }, 1000);
  }, []);

  const handleStatusChange = (cctvId, status) => {
    setCctvStatuses(prev => ({
      ...prev,
      [cctvId]: status
    }));
  };

  const handleFullscreen = (cctv) => {
    setSelectedCCTV(cctv);
  };

  const handleCloseFullscreen = () => {
    setSelectedCCTV(null);
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Monitoring CCTV</h1>
          <p className="text-gray-400 mt-1">Live stream CCTV jalan tol Becakayu</p>
        </div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl flex items-center gap-2 transition-all duration-200 shadow-lg shadow-[#3B82F6]/20"
        >
          <Maximize2 className="w-4 h-4" />
          Refresh All
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="flex items-center gap-4 relative">
            <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/30">
              <Video className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total CCTV</p>
              <p className="text-3xl font-bold text-white">{cctvs.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl" />
          <div className="flex items-center gap-4 relative">
            <div className="p-3 bg-green-600 rounded-xl shadow-lg shadow-green-500/30">
              <Video className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Online</p>
              <p className="text-3xl font-bold text-green-400">{Object.values(cctvStatuses).filter(s => s === 'online').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl" />
          <div className="flex items-center gap-4 relative">
            <div className="p-3 bg-red-600 rounded-xl shadow-lg shadow-red-500/30">
              <VideoOff className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Offline</p>
              <p className="text-3xl font-bold text-red-400">{Object.values(cctvStatuses).filter(s => s === 'offline').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* CCTV Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-full flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : cctvs.length === 0 ? (
          <div className="col-span-full text-center text-gray-400 py-8">
            Tidak ada data CCTV
          </div>
        ) : (
          cctvs.map((cctv) => (
            <div key={cctv.id} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden hover:border-gray-600 transition-all duration-300">
              <CCTVPlayer
                name={cctv.name}
                streamUrl={cctv.streamUrl}
                onFullscreen={() => handleFullscreen(cctv)}
                onRefresh={handleRefresh}
                onStatusChange={(status) => handleStatusChange(cctv.id, status)}
              />
              <div className="p-4 border-t border-gray-700/50">
                <h3 className="text-white font-medium">{cctv.name}</h3>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-gray-400">HLS Stream</span>
                  <button
                    onClick={() => handleFullscreen(cctv)}
                    className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 transition-colors"
                  >
                    <Maximize2 className="w-3 h-3" />
                    Fullscreen
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Fullscreen Modal */}
      {selectedCCTV && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="w-full max-w-6xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-xl font-bold">{selectedCCTV.name}</h2>
              <button
                onClick={handleCloseFullscreen}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            <div className="bg-gray-900 rounded-xl overflow-hidden">
              <CCTVPlayer
                name={selectedCCTV.name}
                streamUrl={selectedCCTV.streamUrl}
                onFullscreen={handleCloseFullscreen}
                onRefresh={handleRefresh}
                onStatusChange={(status) => handleStatusChange(selectedCCTV.id, status)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CCTVMonitoring;
