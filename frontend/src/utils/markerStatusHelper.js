// Constants for asset status colors and animations
export const ASSET_STATUS_CONFIG = {
  BAIK: {
    status: 'baik',
    label: 'Baik',
    color: '#22c55e',
    animationClass: null,
    blinkColor: null
  },
  RUSAK_RINGAN: {
    status: 'rusak_ringan',
    label: 'Rusak Ringan',
    color: '#ef4444',
    animationClass: 'marker-status-damage',
    blinkColor: '#ef4444'
  },
  RUSAK_BERAT: {
    status: 'rusak_berat',
    label: 'Rusak Berat',
    color: '#ef4444',
    animationClass: 'marker-status-damage',
    blinkColor: '#ef4444'
  },
  PERBAIKAN: {
    status: 'sedang_diperbaiki',
    label: 'Sedang Diperbaiki',
    color: '#3b82f6',
    animationClass: 'marker-status-repair',
    blinkColor: '#3b82f6'
  },
  SELESAI_PERBAIKAN: {
    status: 'selesai_diperbaiki',
    label: 'Selesai Perbaikan',
    color: '#22c55e',
    animationClass: null,
    blinkColor: null
  }
};

// Get status config from condition status
export const getStatusConfig = (conditionStatus) => {
  if (!conditionStatus) return ASSET_STATUS_CONFIG.BAIK;
  
  const status = conditionStatus.toLowerCase();
  if (status === 'baik') return ASSET_STATUS_CONFIG.BAIK;
  if (status === 'rusak_ringan') return ASSET_STATUS_CONFIG.RUSAK_RINGAN;
  if (status === 'rusak_berat') return ASSET_STATUS_CONFIG.RUSAK_BERAT;
  if (status === 'sedang_diperbaiki') return ASSET_STATUS_CONFIG.PERBAIKAN;
  if (status === 'selesai_diperbaiki') return ASSET_STATUS_CONFIG.SELESAI_PERBAIKAN;
  
  return ASSET_STATUS_CONFIG.BAIK;
};

// Check if status requires animation
export const requiresAnimation = (conditionStatus) => {
  const config = getStatusConfig(conditionStatus);
  return config.animationClass !== null;
};

// Get animation class for status
export const getAnimationClass = (conditionStatus) => {
  const config = getStatusConfig(conditionStatus);
  return config.animationClass;
};

// Get blink color for status
export const getBlinkColor = (conditionStatus) => {
  const config = getStatusConfig(conditionStatus);
  return config.blinkColor;
};

// Check if status is damage (requires red blinking)
export const isDamageStatus = (conditionStatus) => {
  const status = conditionStatus?.toLowerCase();
  return status === 'rusak_ringan' || status === 'rusak_berat';
};

// Check if status is repair (requires blue blinking)
export const isRepairStatus = (conditionStatus) => {
  const status = conditionStatus?.toLowerCase();
  return status === 'sedang_diperbaiki';
};

// Check if status is normal (no animation)
export const isNormalStatus = (conditionStatus) => {
  const status = conditionStatus?.toLowerCase();
  return status === 'baik' || status === 'selesai_diperbaiki';
};
