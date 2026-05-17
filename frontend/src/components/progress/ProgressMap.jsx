import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Map as MapIcon } from 'lucide-react';

// Dark map tiles - CartoDB Dark Matter
const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIB = '&copy; OpenStreetMap &copy; CARTO';

// Section color mapping
const seksiColors = {
  'SEKSI 1A': '#06B6D4',
  'SEKSI 1B': '#8B5CF6',
  'SEKSI 1C': '#EC4899',
  'SEKSI 2A': '#F59E0B',
  'SEKSI 2B': '#10B981',
};

// Demo Becakayu route polyline (approximate coordinates for visualization)
const BECAKAYU_ROUTE = [
  [-6.1960, 106.9320], [-6.2000, 106.9350], [-6.2100, 106.9400],
  [-6.2200, 106.9420], [-6.2300, 106.9400], [-6.2400, 106.9380],
  [-6.2500, 106.9350], [-6.2600, 106.9300], [-6.2700, 106.9250],
];

const ProgressMap = () => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef([]);

  // Add CSS for neon glow animation
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .leaflet-interactive {
        filter:
          drop-shadow(0 0 4px currentColor)
          drop-shadow(0 0 10px currentColor)
          drop-shadow(0 0 18px currentColor);
      }
      @keyframes float-pulse {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
      }
      @keyframes neon-pulse {
        0%, 100% { opacity: 0.25; }
        50% { opacity: 0.4; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-6.2347, 106.9322],
      zoom: 13,
      zoomControl: false,
      scrollWheelZoom: true,
    });
    mapInstanceRef.current = map;

    // Dark tiles
    L.tileLayer(DARK_TILES, {
      attribution: TILE_ATTRIB,
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Custom zoom control (dark)
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Animated Becakayu route glow line
    const routePolyline = L.polyline(BECAKAYU_ROUTE, {
      color: '#06B6D4',
      weight: 4,
      opacity: 0.9,
      dashArray: '10, 10',
      lineCap: 'round',
    }).addTo(map);
    layersRef.current.push(routePolyline);

    // Glow effect - wider transparent line behind
    const glowLine = L.polyline(BECAKAYU_ROUTE, {
      color: '#06B6D4',
      weight: 12,
      opacity: 0.25,
      lineCap: 'round',
    }).addTo(map);
    glowLine.bringToBack();
    layersRef.current.push(glowLine);

    // Demo progress markers per seksi with new color scheme
    const seksiMarkers = [
      { pos: [-6.2100, 106.9400], name: 'Seksi 1A', persen: 94.3, color: seksiColors['SEKSI 1A'] },
      { pos: [-6.2250, 106.9410], name: 'Seksi 1B', persen: 99.8, color: seksiColors['SEKSI 1B'] },
      { pos: [-6.2350, 106.9390], name: 'Seksi 1C', persen: 100, color: seksiColors['SEKSI 1C'] },
      { pos: [-6.2500, 106.9350], name: 'Seksi 2A', persen: 100, color: seksiColors['SEKSI 2A'] },
      { pos: [-6.2650, 106.9280], name: 'Seksi 2B', persen: 68.1, color: seksiColors['SEKSI 2B'] },
    ];

    seksiMarkers.forEach(({ pos, name, persen, color }) => {
      const iconHtml = `
        <div style="
          width:32px;height:32px;border-radius:50%;
          background:${color};
          border:2px solid rgba(255,255,255,0.8);
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 0 12px ${color}80;
          font-size:9px;font-weight:700;color:white;
        ">${Math.round(persen)}</div>
      `;
      const icon = L.divIcon({
        className: 'progress-marker-wrapper',
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      });
      const marker = L.marker(pos, { icon }).addTo(map);
      marker.bindPopup(`
        <div style="min-width:180px;font-family:Inter,sans-serif;">
          <h4 style="margin:0 0 6px;font-size:13px;font-weight:700;color:#fff;">${name}</h4>
          <p style="margin:0;font-size:11px;color:#94a3b8;">Progress: <strong style="color:${color};">${persen.toFixed(2)}%</strong></p>
          <div style="height:4px;border-radius:2px;background:rgba(255,255,255,0.1);margin-top:8px;overflow:hidden;">
            <div style="height:100%;width:${persen}%;background:${color};border-radius:2px;"></div>
          </div>
        </div>
      `, { maxWidth: 220, className: 'progress-popup' });
      layersRef.current.push(marker);
    });

    // Fit bounds
    const bounds = L.latLngBounds(BECAKAYU_ROUTE);
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);



  return (
    <div
      className="rounded-2xl overflow-hidden relative"
      style={{
        background: 'rgba(17,24,39,0.6)',
        border: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <MapIcon className="w-4 h-4 text-cyan-400" />
            Sebaran Progress per Seksi
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Peta interaktif jalur Tol Becakayu dengan marker progress
          </p>
        </div>
      </div>

      {/* Map */}
      <div className="relative">
        <div
          ref={mapContainerRef}
          style={{ width: '100%', height: 420, background: '#0B1120' }}
        />

      </div>

      {/* Legend overlay */}
      <div
        className="absolute bottom-4 left-4 rounded-xl px-3 py-2.5 text-[10px]"
        style={{
          background: 'rgba(11,17,32,0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <p className="text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[9px]">Status Progress</p>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#22c55e' }} /> <span className="text-slate-300">Selesai (&gt;90%)</span></div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#eab308' }} /> <span className="text-slate-300">Proses (50-90%)</span></div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ef4444' }} /> <span className="text-slate-300">Belum (&lt;50%)</span></div>
        </div>
      </div>
    </div>
  );
};

export default ProgressMap;
