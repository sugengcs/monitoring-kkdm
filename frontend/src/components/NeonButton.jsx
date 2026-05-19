import React from 'react';

/**
 * NeonButton - Premium futuristic button with neon glow effect
 */
const NeonButton = ({ 
  children, 
  onClick, 
  isActive = false, 
  color = '#3B82F6', 
  className = '', 
  disabled = false,
  size = 'md',
  variant = 'solid'
}) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-xs md:text-sm',
    lg: 'px-4 py-2 text-sm md:text-base'
  };

  const getNeonRGB = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  };

  const neonRGB = getNeonRGB(color);

  const getBackgroundColor = () => {
    if (variant === 'outline') return 'transparent';
    if (variant === 'ghost') return isActive ? `${color}40` : 'rgba(17, 24, 39, 0.8)';
    return isActive ? `${color}60` : 'rgba(17, 24, 39, 0.8)';
  };

  const getBorderColor = () => {
    if (variant === 'outline' || variant === 'solid') {
      return isActive ? `1px solid ${color}` : '1px solid rgba(255,255,255,0.1)';
    }
    return 'none';
  };

  const getBoxShadow = () => {
    if (isActive) {
      return `0 0 20px rgba(${neonRGB}, 0.5)`;
    }
    return '0 4px 6px rgba(0, 0, 0, 0.3)';
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative overflow-hidden
        rounded-xl font-medium
        transition-all duration-300 ease-out
        transform hover:-translate-y-0.5 hover:scale-105
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        ${isActive ? 'text-white' : 'text-gray-300'}
        ${sizeClasses[size]}
        ${className}
      `}
      style={{
        backgroundColor: getBackgroundColor(),
        border: getBorderColor(),
        boxShadow: getBoxShadow()
      }}
    >
      {/* Glow effect on hover */}
      <div 
        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, ${color}20 0%, transparent 70%)`
        }}
      />
      
      {/* Content */}
      <span className="relative z-10">{children}</span>
      
      {/* Active glow animation */}
      {isActive && (
        <div 
          className="absolute inset-0 animate-pulse pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, ${color}15 0%, transparent 70%)`,
            animationDuration: '2s'
          }}
        />
      )}
    </button>
  );
};

export default NeonButton;
