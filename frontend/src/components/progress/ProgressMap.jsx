import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Upload, Map as MapIcon, Layers } from 'lucide-react';
import * as toGeoJSON from '@mapbox/togeojson';

// Dark map tiles - CartoDB Dark Matter
const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIB = '&copy; OpenStreetMap &copy; CARTO';

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
  const [kmzLoaded, setKmzLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);

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

    // Demo progress markers per seksi
    const seksiMarkers = [
      { pos: [-6.2100, 106.9400], name: 'Seksi 1A', persen: 92, color: '#22c55e' },
      { pos: [-6.2250, 106.9410], name: 'Seksi 1B', persen: 78, color: '#eab308' },
      { pos: [-6.2350, 106.9390], name: 'Seksi 1C', persen: 45, color: '#ef4444' },
      { pos: [-6.2500, 106.9350], name: 'Seksi 2A', persen: 88, color: '#22c55e' },
      { pos: [-6.2650, 106.9280], name: 'Seksi 2B', persen: 62, color: '#eab308' },
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

  // KMZ / KML file upload handler
  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);

    try {
      const text = await file.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'text/xml');
      const geojson = toGeoJSON.kml(xml);

      // Clear previous KMZ layers
      layersRef.current.forEach(layer => {
        if (layer._isKmzLayer) mapInstanceRef.current.removeLayer(layer);
      });
      layersRef.current = layersRef.current.filter(l => !l._isKmzLayer);

      // Add GeoJSON to map
      if (geojson && geojson.features) {
        const layer = L.geoJSON(geojson, {
          style: (feature) => {
            if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
              return { color: '#06B6D4', weight: 3, opacity: 0.9 };
            }
            return { color: '#3B82F6', weight: 2, fillColor: '#3B82F6', fillOpacity: 0.4 };
          },
          pointToLayer: (feature, latlng) => {
            return L.circleMarker(latlng, {
              radius: 6,
              fillColor: '#3B82F6',
              color: '#fff',
              weight: 1.5,
              opacity: 1,
              fillOpacity: 0.8,
            });
          },
          onEachFeature: (feature, layer) => {
            const name = feature.properties?.name || 'Unnamed';
            layer.bindPopup(`<div style="font-size:12px;color:#fff;"><strong>${name}</strong></div>`);
          },
        }).addTo(mapInstanceRef.current);
        layer._isKmzLayer = true;
        layersRef.current.push(layer);

        mapInstanceRef.current.fitBounds(layer.getBounds(), { padding: [60, 60] });
        setKmzLoaded(true);
      }
    } catch (err) {
      console.error('KML parse error:', err);
      alert('Gagal memuat file. Pastikan format KML/KMZ valid.\nUntuk KMZ, extract file .kml terlebih dahulu.');
    } finally {
      setUploading(false);
    }
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
        <div className="flex items-center gap-2">
          {kmzLoaded && (
            <span className="text-[10px] px-2 py-1 rounded-md bg-green-500/15 text-green-400 border border-green-500/30">
              KMZ Loaded
            </span>
          )}
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white cursor-pointer transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
              boxShadow: '0 0 12px rgba(59,130,246,0.3)',
            }}
          >
            <Upload className="w-3.5 h-3.5" />
            {uploading ? 'Loading...' : 'Upload KML'}
            <input type="file" accept=".kml,.kmz" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </div>

      {/* Map */}
      <div
        ref={mapContainerRef}
        style={{ width: '100%', height: 420, background: '#0B1120' }}
      />

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
