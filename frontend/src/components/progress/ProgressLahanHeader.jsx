import { useState } from 'react';
import { Calendar, RefreshCw, Maximize2, Download, Upload, FileText } from 'lucide-react';

const ProgressLahanHeader = ({ onRefresh, onFullscreen, onExport, onUploadCSV }) => {
  const [fullscreen, setFullscreen] = useState(false);

  const handleFullscreen = () => {
    setFullscreen(!fullscreen);
    onFullscreen?.(!fullscreen);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      onUploadCSV?.(file);
    }
  };

  return (
    <div
      className="rounded-2xl p-5 mb-4"
      style={{
        background: 'linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(17,24,39,0.85) 100%)',
        border: '2px solid rgba(59,130,246,0.3)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 40px rgba(59,130,246,0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
      }}
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Title */}
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight" style={{ textShadow: '0 0 30px rgba(59,130,246,0.5)' }}>
            Progress Pengadaan Tanah
          </h1>
          <p className="text-sm text-cyan-400 font-medium mt-1" style={{ textShadow: '0 0 20px rgba(6,182,212,0.4)' }}>
            Jalan Tol Becakayu
          </p>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Action buttons */}
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
            />
            <button
              onClick={() => document.getElementById('csv-upload').click()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:scale-105 hover:shadow-lg hover:shadow-purple-500/40"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                boxShadow: '0 4px 16px rgba(139,92,246,0.4)',
              }}
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
          </div>

          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/40"
            style={{
              background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
              boxShadow: '0 4px 16px rgba(59,130,246,0.4)',
            }}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>

          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:scale-105 hover:shadow-lg hover:shadow-green-500/40"
            style={{
              background: 'linear-gradient(135deg, #22C55E, #16A34A)',
              boxShadow: '0 4px 16px rgba(34,197,94,0.4)',
            }}
          >
            <Download className="w-4 h-4" />
            Download
          </button>

          <button
            onClick={handleFullscreen}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:scale-105 hover:shadow-lg hover:shadow-orange-500/40"
            style={{
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              boxShadow: '0 4px 16px rgba(245,158,11,0.4)',
            }}
          >
            <Maximize2 className="w-4 h-4" />
            {fullscreen ? 'Exit' : 'Full'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProgressLahanHeader;
