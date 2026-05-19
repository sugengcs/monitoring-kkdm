import React from 'react';

/**
 * NeonSelect - Premium select dropdown with neon glow effect
 */
const NeonSelect = ({ 
  value, 
  onChange, 
  options = [], 
  color = '#3B82F6', 
  className = '',
  placeholder = 'Select option',
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
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`
          relative z-10
          appearance-none
          px-3 py-1.5 md:px-4 md:py-2
          bg-[#111827]/90
          border border-white/10
          rounded-xl
          text-white text-xs md:text-sm
          font-medium
          cursor-pointer
          transition-all duration-300 ease-out
          focus:outline-none
          hover:border-white/20
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        style={{
          boxShadow: `0 0 0 0 rgba(${neonRGB}, 0)`,
          transition: 'all 0.3s ease'
        }}
        onFocus={(e) => {
          e.target.style.borderColor = color;
          e.target.style.boxShadow = `0 0 20px rgba(${neonRGB}, 0.3)`;
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'rgba(255,255,255,0.1)';
          e.target.style.boxShadow = `0 0 0 0 rgba(${neonRGB}, 0)`;
        }}
      >
        {placeholder && value === '' && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option 
            key={option.value} 
            value={option.value}
            className="bg-[#111827] text-white"
          >
            {option.label}
          </option>
        ))}
      </select>
      
      {/* Custom arrow icon */}
      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
        <svg 
          className="w-4 h-4 text-gray-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M19 9l-7 7-7-7" 
          />
        </svg>
      </div>
    </div>
  );
};

export default NeonSelect;
