import React, { useId } from 'react';

interface GreenLoaderProps {
  scale?: number;
  label?: string;
  className?: string;
}

const STAR_PATH =
  'M63,37c-6.7-4-4-27-13-27s-6.3,23-13,27-27,4-27,13,20.3,9,27,13,4,27,13,27,6.3-23,13-27,27-4,27-13-20.3-9-27-13Z';

const PegtopSvg: React.FC<{ className: string; prefix: string }> = ({ className, prefix }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 100"
    aria-hidden="true"
  >
    <defs>
      <filter id={`${prefix}-shine`}>
        <feGaussianBlur stdDeviation={3} />
      </filter>
      <mask id={`${prefix}-mask`}>
        <path d={STAR_PATH} fill="white" />
      </mask>
      <radialGradient
        id={`${prefix}-g1`}
        cx={50}
        cy={66}
        fx={50}
        fy={66}
        r={30}
        gradientTransform="translate(0 35) scale(1 0.5)"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0%" stopColor="black" stopOpacity="0.3" />
        <stop offset="50%" stopColor="black" stopOpacity="0.1" />
        <stop offset="100%" stopColor="black" stopOpacity={0} />
      </radialGradient>
      <radialGradient
        id={`${prefix}-g2`}
        cx={55}
        cy={20}
        fx={55}
        fy={20}
        r={30}
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0%" stopColor="white" stopOpacity="0.35" />
        <stop offset="50%" stopColor="white" stopOpacity="0.12" />
        <stop offset="100%" stopColor="white" stopOpacity={0} />
      </radialGradient>
      <radialGradient id={`${prefix}-g3`} cx={85} cy={50} fx={85} fy={50} r={30} gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="white" stopOpacity="0.3" />
        <stop offset="50%" stopColor="white" stopOpacity="0.1" />
        <stop offset="100%" stopColor="white" stopOpacity={0} />
      </radialGradient>
      <radialGradient
        id={`${prefix}-g4`}
        cx={50}
        cy={58}
        fx={50}
        fy={58}
        r={60}
        gradientTransform="translate(0 47) scale(1 0.2)"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
      </radialGradient>
      <linearGradient id={`${prefix}-g5`} x1={50} y1={90} x2={50} y2={10} gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="black" stopOpacity="0.22" />
        <stop offset="40%" stopColor="black" stopOpacity={0} />
      </linearGradient>
    </defs>
    <g>
      <path d={STAR_PATH} fill="currentColor" />
      <path d={STAR_PATH} fill={`url(#${prefix}-g1)`} />
      <path
        d={STAR_PATH}
        fill="none"
        stroke="white"
        opacity="0.35"
        strokeWidth={3}
        filter={`url(#${prefix}-shine)`}
        mask={`url(#${prefix}-mask)`}
      />
      <path d={STAR_PATH} fill={`url(#${prefix}-g2)`} />
      <path d={STAR_PATH} fill={`url(#${prefix}-g3)`} />
      <path d={STAR_PATH} fill={`url(#${prefix}-g4)`} />
      <path d={STAR_PATH} fill={`url(#${prefix}-g5)`} />
    </g>
  </svg>
);

/**
 * Animated green 3-star pegtop loader matching user specification (emerald neon theme).
 */
export const GreenLoader: React.FC<GreenLoaderProps> = ({
  scale = 0.5,
  label,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const boxSize = Math.round(100 * scale);

  return (
    <div className={`inline-flex flex-col items-center justify-center gap-2 ${className}`}>
      <div
        className="relative flex items-center justify-center overflow-visible"
        style={{ width: `${boxSize}px`, height: `${boxSize}px` }}
      >
        <div
          className="vl-green-loader"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          <PegtopSvg className="pegtop-one" prefix={`${uid}-1`} />
          <PegtopSvg className="pegtop-two" prefix={`${uid}-2`} />
          <PegtopSvg className="pegtop-three" prefix={`${uid}-3`} />
        </div>
      </div>
      {label ? (
        <span className="text-xs font-medium tracking-wide text-emerald-300/90">{label}</span>
      ) : null}
    </div>
  );
};

export default GreenLoader;
