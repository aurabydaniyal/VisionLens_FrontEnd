import React, { useId } from 'react';

interface GlassSurfaceProps {
  children: React.ReactNode;
  className?: string;
  borderRadius?: number;
  blur?: number;
  opacity?: number;
}

/**
 * Liquid-glass surface inspired by @react-bits/GlassSurface-JS-CSS.
 * Combines SVG subtle specular refraction, backdrop blur, and emerald edge highlights.
 */
export const GlassSurface: React.FC<GlassSurfaceProps> = ({
  children,
  className = '',
  borderRadius = 28,
  blur = 22,
  opacity = 0.78,
}) => {
  const filterId = useId().replace(/:/g, '');

  return (
    <div
      className={`glass-surface ${className}`}
      style={{
        borderRadius: `${borderRadius}px`,
        backdropFilter: `blur(${blur}px) saturate(185%)`,
        WebkitBackdropFilter: `blur(${blur}px) saturate(185%)`,
        backgroundColor: `rgba(7, 13, 15, ${opacity})`,
      }}
    >
      {/* Subtle chromatic refraction sheen SVG */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-35"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`gs-rim-${filterId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(52, 211, 153, 0.45)" />
            <stop offset="45%" stopColor="rgba(255, 255, 255, 0.14)" />
            <stop offset="100%" stopColor="rgba(16, 185, 129, 0.38)" />
          </linearGradient>
        </defs>
        <rect
          x="0.5"
          y="0.5"
          width="calc(100% - 1px)"
          height="calc(100% - 1px)"
          rx={borderRadius}
          ry={borderRadius}
          fill="none"
          stroke={`url(#gs-rim-${filterId})`}
          strokeWidth="1"
        />
      </svg>

      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
};

export default GlassSurface;
