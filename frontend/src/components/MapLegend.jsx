import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ASSET_TYPE_SHAPES, CONDITION_LEGEND, createLegendSVG, normalizeAssetType } from '../utils/assetMarkerUtils';

const MapLegend = ({ assets = [], className = '' }) => {
  const [collapsed, setCollapsed] = useState(true);

  // Determine which asset types actually exist in the data
  const existingTypes = useMemo(() => {
    const types = new Set();
    assets.forEach(asset => {
      const type = normalizeAssetType(asset.category_name);
      if (type && ASSET_TYPE_SHAPES[type]) types.add(type);
    });
    return Array.from(types);
  }, [assets]);

  // Only show legend entries for types that exist
  const shapeEntries = existingTypes.map(key => [key, ASSET_TYPE_SHAPES[key]]);

  return (
    <div className={`absolute bottom-4 right-4 z-10 ${className}`}
      style={{ pointerEvents: 'auto' }}
    >
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '14px',
          padding: collapsed ? '8px 14px' : '14px 18px',
          minWidth: '190px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between cursor-pointer select-none"
          onClick={() => setCollapsed(!collapsed)}
          style={{ gap: '12px' }}
        >
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#e5e7eb',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            Legenda
          </span>
          {collapsed
            ? <ChevronUp size={14} color="#9ca3af" />
            : <ChevronDown size={14} color="#9ca3af" />}
        </div>

        {!collapsed && (
          <div style={{ marginTop: '12px' }}>
            {/* Jenis Aset — filtered by existing types */}
            <div style={{ marginBottom: '12px' }}>
              <p style={{
                fontSize: '9px',
                fontWeight: 600,
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '6px',
              }}>
                Jenis Aset — Bentuk
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {shapeEntries.length > 0 ? shapeEntries.map(([key, { shape, label }]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span dangerouslySetInnerHTML={{ __html: createLegendSVG(shape, '#94a3b8', 16) }} />
                    <span style={{ fontSize: '10px', color: '#d1d5db', fontWeight: 500 }}>{label}</span>
                  </div>
                )) : (
                  <span style={{ fontSize: '10px', color: '#6b7280' }}>Tidak ada aset</span>
                )}
              </div>
            </div>

            {/* Separator */}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '8px 0' }} />

            {/* Kondisi */}
            <div>
              <p style={{
                fontSize: '9px',
                fontWeight: 600,
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '6px',
              }}>
                Kondisi — Warna
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {CONDITION_LEGEND.map(({ key, color, label }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: color,
                      flexShrink: 0,
                    }} />
                    <span style={{ fontSize: '10px', color: '#d1d5db', fontWeight: 500 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapLegend;
