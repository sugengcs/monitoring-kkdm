import React from 'react';

/**
 * GlowCard - Premium card with neon glow and glassmorphism effect
 */
const GlowCard = ({ 
  children, 
  color = '#3B82F6', 
  className = '',
  onClick = null,
  hoverable = true,
  glowPosition = 'bottom'
}) => {
  const getNeonRGB = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  };

  const neonRGB = getNeonRGB(color);

  const glowPositionStyles = {
    bottom: 'bottom-0 left-0 right-0 h-1',
    top: 'top-0 left-0 right-0 h-1',
    left: 'left-0 top-0 bottom-0 w-1',
    right: 'right-0 top-0 bottom-0 w-1'
  };

  const cardStyle = {
    background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: `
      0 8px 32px rgba(0, 0, 0, 0.4),
      0 0 40px rgba(${neonRGB}, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.05)
    `
  };

  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl
        transition-all duration-300 ease-out
        ${hoverable ? 'hover:-translate-y-1 hover:shadow-2xl' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      style={cardStyle}
    >
      {/* Neon glow line */}
      <div 
        className={`absolute ${glowPositionStyles[glowPosition]} transition-all duration-300`}
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          boxShadow: `0 0 20px ${color}, 0 0 40px ${color}`
        }}
      />
      
      {/* Subtle background glow */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, ${color}10 0%, transparent 70%)`
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Hover glow effect */}
      {hoverable && (
        <div 
          className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, ${color}15 0%, transparent 70%)`
          }}
        />
      )}
    </div>
  );
};

export default GlowCard;
