import { useState, useRef } from 'react';
import { ExternalLink, Loader2, WifiOff } from 'lucide-react';

const SHMSFrame = ({ url, refreshKey }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const iframeRef = useRef(null);

  const handleIframeLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleOpenNewTab = () => {
    window.open(url, '_blank');
  };

  return (
    <div className="flex-1 relative">
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0b1220] rounded-2xl z-10">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-[#3B82F6] animate-spin mx-auto mb-4" />
            <p className="text-white">Loading SHMS Dashboard...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0b1220] rounded-2xl z-10">
          <div className="text-center max-w-md">
            <WifiOff className="w-16 h-16 text-[#EF4444] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Failed to Load SHMS Dashboard</h2>
            <p className="text-gray-400 mb-4">
              The SHMS dashboard cannot be displayed due to security restrictions (X-Frame-Options/CSP).
            </p>
            <button
              onClick={handleOpenNewTab}
              className="flex items-center gap-2 px-6 py-3 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-lg shadow-[#3B82F6]/20 mx-auto"
            >
              <ExternalLink className="w-4 h-4" />
              Buka SHMS di Tab Baru
            </button>
          </div>
        </div>
      )}

      {/* Iframe */}
      <iframe
        key={refreshKey}
        ref={iframeRef}
        src={url}
        className="w-full rounded-2xl border-2 border-white/10"
        style={{
          height: 'calc(100vh - 280px)',
          background: '#0b1220'
        }}
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        title="SHMS Dashboard"
        allowFullScreen
        referrerPolicy="no-referrer"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-top-navigation allow-downloads"
      />
    </div>
  );
};

export default SHMSFrame;
