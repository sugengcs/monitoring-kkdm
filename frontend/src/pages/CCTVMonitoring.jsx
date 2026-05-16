import { useEffect, useState } from 'react';
import api from '../utils/api';
import { Video, VideoOff, AlertCircle, MoreVertical } from 'lucide-react';

const CCTVMonitoring = () => {
  const [cctvs, setCctvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDropdown, setOpenDropdown] = useState(null);

  useEffect(() => {
    fetchCCTVs();
  }, []);

  const fetchCCTVs = async () => {
    try {
      const response = await api.get('/assets');
      const allAssets = response.data.data || [];
      
      // Filter assets by category CCTV or related categories (matching Monitoring Map logic)
      const cameraAssets = allAssets.filter(asset => {
        const category = (asset.category || '').toLowerCase();
        const name = (asset.name || '').toLowerCase();
        const type = (asset.type || '').toLowerCase();
        
        // Match Monitoring Map logic: CCTV, PENGAWAS, KAMERA, KML IMPORT, KML-IMPORT
        return category.includes('cctv') || 
               category.includes('pengawas') ||
               category.includes('kamera') ||
               category.includes('kml') ||
               category.includes('import') ||
               category === '6' ||
               name.includes('kamera') ||
               name.includes('cctv') ||
               name.includes('camera') ||
               name.includes('pengawas') ||
               type.includes('kamera') ||
               type.includes('cctv') ||
               type.includes('camera') ||
               type.includes('pengawas');
      });
      
      setCctvs(cameraAssets);
    } catch (error) {
      console.error('Error fetching CCTVs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Monitoring CCTV</h1>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          className="bg-gray-800 border border-gray-700 rounded-xl p-6 relative cursor-pointer hover:border-gray-600 transition-colors"
          onClick={() => setOpenDropdown(openDropdown === 'total' ? null : 'total')}
        >
          {openDropdown === 'total' && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
              <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
                Lihat Detail
              </button>
              <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
                Export Data
              </button>
            </div>
          )}
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-lg">
              <Video className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total CCTV</p>
              <p className="text-2xl font-bold text-white">{cctvs.length}</p>
            </div>
          </div>
        </div>
        <div 
          className="bg-gray-800 border border-gray-700 rounded-xl p-6 relative cursor-pointer hover:border-gray-600 transition-colors"
          onClick={() => setOpenDropdown(openDropdown === 'online' ? null : 'online')}
        >
          {openDropdown === 'online' && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
              <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
                Lihat Detail
              </button>
              <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
                Filter Online
              </button>
            </div>
          )}
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-600 rounded-lg">
              <Video className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Online</p>
              <p className="text-2xl font-bold text-white">{cctvs.filter(c => c.condition_status === 'online').length}</p>
            </div>
          </div>
        </div>
        <div 
          className="bg-gray-800 border border-gray-700 rounded-xl p-6 relative cursor-pointer hover:border-gray-600 transition-colors"
          onClick={() => setOpenDropdown(openDropdown === 'offline' ? null : 'offline')}
        >
          {openDropdown === 'offline' && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
              <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
                Lihat Detail
              </button>
              <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
                Filter Offline
              </button>
            </div>
          )}
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-600 rounded-lg">
              <VideoOff className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Offline</p>
              <p className="text-2xl font-bold text-white">{cctvs.filter(c => c.condition_status !== 'online').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* CCTV Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-4 flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : cctvs.length === 0 ? (
          <div className="col-span-4 text-center text-gray-400 py-8">
            Tidak ada data CCTV
          </div>
        ) : (
          cctvs.map((cctv) => (
            <div key={cctv.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
              <div className="relative aspect-video bg-gray-900">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Video className="w-16 h-16 text-gray-600" />
                </div>
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 rounded flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${cctv.condition_status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-white text-xs">{cctv.condition_status}</span>
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 rounded text-white text-xs">
                  {cctv.sta || 'Unknown'}
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-white font-medium">{cctv.name}</h3>
                <p className="text-sm text-gray-400 mt-1">{cctv.ruas}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    cctv.condition_status === 'online' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {cctv.condition_status === 'online' ? 'Online' : 'Offline'}
                  </span>
                  <button className="text-blue-400 hover:text-blue-300 text-sm">
                    Lihat Stream
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CCTVMonitoring;
