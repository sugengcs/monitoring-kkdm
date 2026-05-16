import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Video, VideoOff, Maximize, RefreshCw, Volume2, VolumeX, X, Clock } from 'lucide-react';

const CCTVPlayer = ({ name, streamUrl, onFullscreen, onRefresh, onStatusChange }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const containerRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading, online, offline
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timestamp, setTimestamp] = useState(new Date());
  const [errorCount, setErrorCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef(null);

  // Update timestamp every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimestamp(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Report status changes to parent
  useEffect(() => {
    if (onStatusChange && (status === 'online' || status === 'offline')) {
      onStatusChange(status);
    }
  }, [status, onStatusChange]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const currentRef = containerRef.current;
    if (!currentRef) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
        });
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    observerRef.current.observe(currentRef);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // HLS Player initialization
  useEffect(() => {
    if (!isVisible || !streamUrl) return;

    const video = videoRef.current;
    if (!video) return;

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setStatus('loading');

    // Check for native HLS support (Safari)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play()
          .then(() => {
            setStatus('online');
            setErrorCount(0);
          })
          .catch((error) => {
            console.error('Autoplay failed:', error);
            setStatus('offline');
          });
      }, { once: true });

      video.addEventListener('error', () => {
        setStatus('offline');
        setErrorCount(prev => prev + 1);
      });

      return () => {
        video.src = '';
      };
    }

    // Use HLS.js for other browsers
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });

      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play()
          .then(() => {
            setStatus('online');
            setErrorCount(0);
          })
          .catch((error) => {
            console.error('Autoplay failed:', error);
            setStatus('offline');
          });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              console.error('Fatal error, cannot recover');
              setStatus('offline');
              setErrorCount(prev => prev + 1);
              break;
          }
        }
      });

      return () => {
        hls.destroy();
      };
    } else {
      // Fallback for browsers without HLS support
      console.error('HLS not supported');
      setStatus('offline');
    }
  }, [streamUrl, isVisible]);

  // Auto-reconnect logic
  useEffect(() => {
    if (status === 'offline' && errorCount < 3 && isVisible) {
      const timer = setTimeout(() => {
        console.log('Attempting to reconnect...');
        if (hlsRef.current) {
          hlsRef.current.startLoad();
        }
      }, 5000); // Retry after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [status, errorCount, isVisible]);

  // Pause video when not visible to save resources
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isVisible) {
      video.pause();
    } else if (status === 'online') {
      video.play().catch(console.error);
    }
  }, [isVisible, status]);

  const handleToggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleFullscreen = () => {
    if (onFullscreen) {
      onFullscreen();
    }
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
    setErrorCount(0);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div ref={containerRef} className="relative bg-gray-900 rounded-xl overflow-hidden group">
      {/* Video Container */}
      <div className="relative aspect-video bg-black">
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        )}

        {status === 'offline' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
            <VideoOff className="w-16 h-16 text-red-500 mb-2" />
            <p className="text-red-400 font-medium">Offline</p>
            <p className="text-gray-500 text-sm mt-1">Stream tidak tersedia</p>
            <button
              onClick={handleRefresh}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        )}

        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          muted={isMuted}
          playsInline
          autoPlay
        />

        {/* Status Indicator */}
        <div className="absolute top-3 left-3 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className={`text-xs font-medium ${status === 'online' ? 'text-green-400' : 'text-red-400'}`}>
            {status === 'online' ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        {/* Timestamp */}
        {status === 'online' && (
          <div className="absolute top-3 right-3 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-medium text-white">{formatTime(timestamp)}</span>
          </div>
        )}

        {/* Controls Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleMute}
                className="p-2 bg-black/60 backdrop-blur-sm hover:bg-black/80 rounded-lg transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-white" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </button>
              <span className="text-white text-sm font-medium">{name}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="p-2 bg-black/60 backdrop-blur-sm hover:bg-black/80 rounded-lg transition-colors"
                title="Refresh Stream"
              >
                <RefreshCw className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={handleFullscreen}
                className="p-2 bg-black/60 backdrop-blur-sm hover:bg-black/80 rounded-lg transition-colors"
                title="Fullscreen"
              >
                <Maximize className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Glow effect for online status */}
        {status === 'online' && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-green-500/5 animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
};

export default CCTVPlayer;
