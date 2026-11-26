import React from 'react';

interface NeonAmbientCanvasProps {
  className?: string;
}

/**
 * Zero-JS-overhead GPU-composited neon emerald ambient backdrop.
 * Avoids heavy continuous WebGL re-blurring behind glass cards so mobile typing stays 60fps.
 */
export const NeonAmbientCanvas: React.FC<NeonAmbientCanvasProps> = React.memo(({ className = '' }) => (
  <div
    aria-hidden="true"
    className={`pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#04070a] ${className}`}
  >
    {/* Soft static radial neon emerald field */}
    <div
      className="vl-ambient-orb absolute -left-24 top-10 h-72 w-72 rounded-full opacity-25"
      style={{
        background: 'radial-gradient(circle, rgba(16,185,129,0.55) 0%, rgba(16,185,129,0) 70%)',
      }}
    />
    <div
      className="vl-ambient-orb absolute -right-24 bottom-12 h-80 w-80 rounded-full opacity-20"
      style={{
        animationDelay: '-6s',
        background: 'radial-gradient(circle, rgba(20,184,166,0.5) 0%, rgba(20,184,166,0) 70%)',
      }}
    />
    {/* Subtle emerald micro-grid */}
    <div
      className="absolute inset-0 opacity-[0.07]"
      style={{
        backgroundImage:
          'radial-gradient(rgba(52, 211, 153, 0.7) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    />
  </div>
));

NeonAmbientCanvas.displayName = 'NeonAmbientCanvas';

export default NeonAmbientCanvas;
