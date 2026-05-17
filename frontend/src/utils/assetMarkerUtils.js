import L from 'leaflet';

// ═══════════════════════════════════════════════════════════════
// CONDITION → COLOR MAPPING
// Warna marker mewakili KONDISI ASET
// ═══════════════════════════════════════════════════════════════
export const CONDITION_COLORS = {
  baik:               { color: '#22c55e', label: 'Baik',              glow: '0 0 8px rgba(34,197,94,0.7)' },
  sedang_diperbaiki:  { color: '#eab308', label: 'Dalam Perbaikan',   glow: '0 0 8px rgba(234,179,8,0.7)' },
  rusak_ringan:       { color: '#ef4444', label: 'Rusak',             glow: '0 0 8px rgba(239,68,68,0.7)' },
  rusak_berat:        { color: '#ef4444', label: 'Rusak',             glow: '0 0 8px rgba(239,68,68,0.7)' },
  selesai_diperbaiki: { color: '#3b82f6', label: 'Selesai Perbaikan', glow: '0 0 8px rgba(59,130,246,0.7)' },
};
const DEFAULT_CONDITION = { color: '#6b7280', label: 'Belum Dicek', glow: '0 0 6px rgba(107,114,128,0.5)' };

export const getConditionStyle = (status) => CONDITION_COLORS[status] || DEFAULT_CONDITION;

// Unique entries for the legend
export const CONDITION_LEGEND = [
  { key: 'baik',              color: '#22c55e', label: 'Baik' },
  { key: 'sedang_diperbaiki', color: '#eab308', label: 'Dalam Perbaikan' },
  { key: 'rusak',             color: '#ef4444', label: 'Rusak' },
  { key: 'selesai_diperbaiki',color: '#3b82f6', label: 'Selesai Perbaikan' },
];

// Filter helpers – each key maps to a matcher
export const CONDITION_FILTERS = [
  { key: 'baik',              label: 'Baik',              color: '#22c55e', match: (s) => s === 'baik' },
  { key: 'sedang_diperbaiki', label: 'Dalam Perbaikan',   color: '#eab308', match: (s) => s === 'sedang_diperbaiki' },
  { key: 'rusak',             label: 'Rusak',             color: '#ef4444', match: (s) => s === 'rusak_ringan' || s === 'rusak_berat' },
  { key: 'selesai_diperbaiki',label: 'Selesai Perbaikan', color: '#3b82f6', match: (s) => s === 'selesai_diperbaiki' },
];

// ═══════════════════════════════════════════════════════════════
// ASSET TYPE → SHAPE MAPPING
// Bentuk marker mewakili JENIS ASET
// ═══════════════════════════════════════════════════════════════
export const ASSET_TYPE_SHAPES = {
  PJU:         { shape: 'square',   label: 'PJU' },
  PANEL:       { shape: 'circle',   label: 'Panel' },
  CCTV:        { shape: 'triangle', label: 'CCTV' },
  SFO:         { shape: 'diamond',  label: 'SFO' },
  KWH:         { shape: 'hexagon',  label: 'KWH' },
  PERKERASAN:  { shape: 'star',     label: 'Perkerasan Jalan' },
  DRAINASE:    { shape: 'pentagon', label: 'Drainase' },
  GUARDRAIL:   { shape: 'capsule',  label: 'Guardrail' },
};
const DEFAULT_SHAPE = { shape: 'circle', label: 'Lainnya' };

export const normalizeAssetType = (categoryName) => {
  if (!categoryName) return null;
  const upper = categoryName.toUpperCase();
  if (upper.includes('PJU') || upper.includes('LAMPU'))  return 'PJU';
  if (upper.includes('PANEL'))                            return 'PANEL';
  if (upper.includes('CCTV') || upper.includes('PENGAWAS') || upper.includes('KAMERA')) return 'CCTV';
  if (upper.includes('SFO'))                              return 'SFO';
  if (upper.includes('KWH'))                              return 'KWH';
  if (upper.includes('PERKERASAN'))                       return 'PERKERASAN';
  if (upper.includes('DRAINASE'))                         return 'DRAINASE';
  if (upper.includes('GUARDRAIL') || upper.includes('GUARD')) return 'GUARDRAIL';
  if (upper.includes('RAMBU'))                            return 'RAMBU';
  return null;
};

export const getAssetShape = (categoryName) => {
  const type = normalizeAssetType(categoryName);
  return type && ASSET_TYPE_SHAPES[type] ? ASSET_TYPE_SHAPES[type] : DEFAULT_SHAPE;
};

// ═══════════════════════════════════════════════════════════════
// SVG SHAPE GENERATORS  (viewBox 0 0 28 28)
// ═══════════════════════════════════════════════════════════════
const shapeSVG = {
  square:   (f, s) => `<rect x="4" y="4" width="20" height="20" rx="3" fill="${f}" stroke="${s}" stroke-width="1.5"/>`,
  circle:   (f, s) => `<circle cx="14" cy="14" r="10" fill="${f}" stroke="${s}" stroke-width="1.5"/>`,
  triangle: (f, s) => `<polygon points="14,3 25,24 3,24" fill="${f}" stroke="${s}" stroke-width="1.5" stroke-linejoin="round"/>`,
  diamond:  (f, s) => `<polygon points="14,2 26,14 14,26 2,14" fill="${f}" stroke="${s}" stroke-width="1.5" stroke-linejoin="round"/>`,
  hexagon:  (f, s) => `<polygon points="14,2 24.5,8 24.5,20 14,26 3.5,20 3.5,8" fill="${f}" stroke="${s}" stroke-width="1.5" stroke-linejoin="round"/>`,
  star:     (f, s) => `<polygon points="14,2 17,10 25.4,10.3 18.8,15.5 21.1,23.7 14,19 6.9,23.7 9.2,15.5 2.6,10.3 11,10" fill="${f}" stroke="${s}" stroke-width="1" stroke-linejoin="round"/>`,
  pentagon: (f, s) => `<polygon points="14,2 25.4,10.3 21.1,23.7 6.9,23.7 2.6,10.3" fill="${f}" stroke="${s}" stroke-width="1.5" stroke-linejoin="round"/>`,
  capsule:  (f, s) => `<rect x="2" y="8" width="24" height="12" rx="6" fill="${f}" stroke="${s}" stroke-width="1.5"/>`,
};

export const createMarkerSVG = (shape, color, size = 28) => {
  const gen = shapeSVG[shape] || shapeSVG.circle;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 28 28">${gen(color, 'rgba(255,255,255,0.6)')}</svg>`;
};

// Small SVG for legend / filter buttons
export const createLegendSVG = (shape, color, size = 16) => {
  const gen = shapeSVG[shape] || shapeSVG.circle;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 28 28">${gen(color, 'rgba(255,255,255,0.35)')}</svg>`;
};

// ═══════════════════════════════════════════════════════════════
// LEAFLET divIcon FACTORY
// ═══════════════════════════════════════════════════════════════
export const createAssetIcon = (categoryName, conditionStatus, size = 28) => {
  const { shape } = getAssetShape(categoryName);
  const { color } = getConditionStyle(conditionStatus);
  const svg = createMarkerSVG(shape, color, size);

  let animClass = '';
  if (conditionStatus === 'rusak_ringan' || conditionStatus === 'rusak_berat') {
    animClass = 'neon-pulse-red';
  } else if (conditionStatus === 'sedang_diperbaiki') {
    animClass = 'neon-pulse-yellow';
  }

  const html = `<div class="asset-marker-icon ${animClass}" style="width:${size}px;height:${size}px;">${svg}</div>`;

  return L.divIcon({
    className: 'asset-marker-wrapper',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2)],
  });
};

// Highlighted / blink variant
export const createAssetIconHighlight = (categoryName, size = 36) => {
  const { shape } = getAssetShape(categoryName);
  const svg = createMarkerSVG(shape, '#f97316', size);
  const html = `<div class="asset-marker-icon neon-pulse-orange" style="width:${size}px;height:${size}px;">${svg}</div>`;
  return L.divIcon({
    className: 'asset-marker-wrapper',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2)],
  });
};

// ═══════════════════════════════════════════════════════════════
// MODERN POPUP HTML GENERATOR
// ═══════════════════════════════════════════════════════════════
export const createModernPopup = (asset, apiBase = '') => {
  const { color, label: condLabel } = getConditionStyle(asset.condition_status);
  const { label: typeLabel } = getAssetShape(asset.category_name);
  const date = asset.created_at
    ? new Date(asset.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '-';

  const photoSrc = asset.photo_after || asset.photo_before;
  const photoHtml = photoSrc
    ? `<img src="${apiBase}${photoSrc}" alt="${asset.name}" style="width:100%;height:80px;object-fit:cover;border-radius:8px;margin-top:10px;border:1px solid rgba(255,255,255,0.06);"/>`
    : '';

  return `
    <div style="min-width:230px;font-family:'Inter',sans-serif;padding:2px;">
      <h3 style="font-weight:700;font-size:14px;margin:0 0 10px;color:#fff;">${asset.name || 'N/A'}</h3>
      <div style="display:flex;flex-direction:column;gap:5px;font-size:11px;">
        <div style="display:flex;justify-content:space-between;"><span style="color:#9ca3af;">Jenis Aset</span><span style="font-weight:600;color:#e5e7eb;">${typeLabel}</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:#9ca3af;">Kategori</span><span style="font-weight:600;color:#e5e7eb;">${asset.category_name || '-'}</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:#9ca3af;">Kondisi</span><span style="font-weight:700;color:${color};">${condLabel}</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:#9ca3af;">Tanggal Inspeksi</span><span style="color:#e5e7eb;">${date}</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:#9ca3af;">STA</span><span style="color:#e5e7eb;">${asset.sta || '-'}</span></div>
      </div>
      ${photoHtml}
      <div style="margin-top:12px;text-align:center;">
        <span style="display:inline-block;padding:5px 14px;background:rgba(59,130,246,0.15);color:#60a5fa;border-radius:8px;font-size:10px;font-weight:600;letter-spacing:0.02em;">
          Detail Dashboard →
        </span>
      </div>
    </div>`;
};
