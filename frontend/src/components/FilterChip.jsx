import React from 'react';

/**
 * FilterChip - Modern filter chip with neon glow effect
 */
const FilterChip = ({ 
  label, 
  onClick, 
  isActive = false, 
  color = '#3B82F6', 
  icon = null,
  className = '',
  disabled = false
}) => {
  const getNeonRGB = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  };

  const neonRGB = getNeonRGB(color);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative overflow-hidden
        px-3 py-1.5 rounded-xl
        font-medium text-xs md:text-sm
        transition-all duration-300 ease-out
        transform hover:-translate-y-0.5 hover:scale-105
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        flex items-center gap-2
        ${isActive ? 'text-white' : 'text-gray-400'}
        ${className}
      `}
      style={{
        backgroundColor: isActive ? `${color}50` : 'rgba(17, 24, 39, 0.8)',
        border: isActive ? `1px solid ${color}` : '1px solid rgba(255,255,255,0.1)',
        boxShadow: isActive 
          ? `0 0 20px rgba(${neonRGB}, 0.4), 0 0 40px rgba(${neonRGB}, 0.2)` 
          : '0 4px 6px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Glow effect on hover */}
      <div 
        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, ${color}20 0%, transparent 70%)`
        }}
      />
      
      {/* Active pulse animation */}
      {isActive && (
        <div 
          className="absolute inset-0 animate-pulse pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, ${color}15 0%, transparent 70%)`,
            animationDuration: '2s'
          }}
        />
      )}
      
      {/* Icon */}
      {icon && (
        <span 
          className="relative z-10"
          dangerouslySetInnerHTML={{ __html: icon }}
          style={{ filter: isActive ? `drop-shadow(0 0 8px ${color})` : 'none' }}
        />
      )}
      
      {/* Label */}
      <span className="relative z-10">{label}</span>
      
      {/* Active indicator dot */}
      {isActive && (
        <div 
          className="relative z-10 w-1.5 h-1.5 rounded-full animate-pulse"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}`
          }}
        />
      )}
    </button>
  );
};

export default FilterChip;
