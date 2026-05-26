import React from 'react';

export default function Logo({ className = '', size = 'md', variant = 'horizontal', animated = true }) {
  // Sizes mapping for SVG
  const svgSizes = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  // Text sizes mapping
  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-5xl'
  };

  const taglineSizes = {
    sm: 'text-[8px] tracking-[0.2em]',
    md: 'text-[10px] tracking-[0.25em]',
    lg: 'text-xs tracking-[0.3em]',
    xl: 'text-sm tracking-[0.35em]'
  };

  const isIcon = variant === 'iconOnly';
  const isVertical = variant === 'vertical';

  return (
    <div className={`flex ${isVertical ? 'flex-col items-center text-center' : 'items-center gap-3'} ${className}`}>
      {/* SVG Icon */}
      <div className={`relative ${svgSizes[size]} select-none flex-shrink-0`}>
        {/* Glow backdrop */}
        <div className="absolute inset-0 bg-gradient-to-r from-alert-red to-info rounded-full blur-md opacity-25 scale-95" />
        
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full relative z-10 filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.4)]"
        >
          <defs>
            <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF1744" />
              <stop offset="100%" stopColor="#00B0FF" />
            </linearGradient>
            <linearGradient id="crossGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF1744" />
              <stop offset="50%" stopColor="#D32F2F" />
              <stop offset="100%" stopColor="#FF1744" />
            </linearGradient>
          </defs>

          {/* Hexagonal Shield Boundary */}
          <path 
            d="M50 8 L85 24 V58 C85 75 70 88 50 92 C30 88 15 75 15 58 V24 Z" 
            stroke="url(#shieldGrad)" 
            strokeWidth="3.5" 
            fill="rgba(5, 5, 5, 0.75)" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />

          {/* Medical Cross Graphic in Background */}
          <path 
            d="M42 30 H58 V42 H70 V58 H58 V70 H42 V58 H30 V42 H42 Z" 
            fill="url(#crossGrad)" 
            fillOpacity="0.25"
            stroke="url(#shieldGrad)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className={animated ? "animate-pulse" : ""}
          />

          {/* ECG Pulse Wave Line */}
          <path 
            d="M22 50 H38 L43 32 L49 68 L54 44 L59 50 H78" 
            stroke="#FFFFFF" 
            strokeWidth="4" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            style={{
              strokeDasharray: '120',
              strokeDashoffset: animated ? '0' : '0',
              animation: animated ? 'dash 2.5s linear infinite' : 'none'
            }}
          />

          {/* ECG Pulse Glowing dot */}
          <circle 
            cx="78" 
            cy="50" 
            r="3.5" 
            fill="#00E676" 
            className={animated ? "animate-ping origin-center" : ""} 
            style={{ transformOrigin: '78px 50px' }}
          />
          <circle 
            cx="78" 
            cy="50" 
            r="2.5" 
            fill="#00E676"
          />
        </svg>

        {/* Embedded Style for keyframe dash animation */}
        {animated && (
          <style>{`
            @keyframes dash {
              0% {
                stroke-dashoffset: 240;
              }
              100% {
                stroke-dashoffset: 0;
              }
            }
          `}</style>
        )}
      </div>

      {/* Text Branding */}
      {!isIcon && (
        <div className={`flex flex-col select-none ${isVertical ? 'mt-4 items-center' : 'items-start'}`}>
          <div className={`${textSizes[size]} tracking-tight font-outfit leading-none flex items-center`}>
            <span className="font-extrabold text-white">Crisis</span>
            <span className="font-light bg-gradient-to-r from-alert-red to-info bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(255,23,68,0.25)]">Sync</span>
          </div>
          {isVertical && (
            <span className={`text-text-secondary ${taglineSizes[size]} font-semibold uppercase mt-1.5`}>
              Emergency Response System
            </span>
          )}
        </div>
      )}
    </div>
  );
}
