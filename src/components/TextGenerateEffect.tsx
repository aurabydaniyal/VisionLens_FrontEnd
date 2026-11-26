import React, { useMemo } from 'react';

interface TextGenerateEffectProps {
  words: string;
  className?: string;
  dir?: 'ltr' | 'rtl';
  lang?: string;
  stagger?: number;
}

/**
 * Lightweight GPU-composited word-by-word reveal inspired by @aceternity/text-generate-effect-demo.
 * Uses pure CSS transform/opacity keyframes (no blur filters or per-word JS timers) for smooth 60fps mobile rendering.
 */
export const TextGenerateEffect: React.FC<TextGenerateEffectProps> = React.memo(
  ({ words, className = '', dir = 'ltr', lang, stagger = 0.022 }) => {
    const tokens = useMemo(() => {
      const clean = (words || '').trim();
      if (!clean) return [];
      return clean.split(/(\s+)/);
    }, [words]);

    const langClass = lang === 'ur' ? 'lang-ur' : lang === 'ar' ? 'lang-ar' : '';
    let wordIndex = 0;

    return (
      <div dir={dir} className={`${langClass} ${className}`}>
        {tokens.map((token, idx) => {
          if (/^\s+$/.test(token)) {
            return <React.Fragment key={`sp-${idx}`}>{token}</React.Fragment>;
          }
          const currentWord = wordIndex++;
          // Cap total reveal duration cleanly so long replies stay snappy
          const delay = Math.min(currentWord * stagger, 0.75);
          return (
            <span
              key={`w-${idx}`}
              className="vl-word-reveal"
              style={{ animationDelay: `${delay.toFixed(3)}s` }}
            >
              {token}
            </span>
          );
        })}
      </div>
    );
  }
);

TextGenerateEffect.displayName = 'TextGenerateEffect';

export default TextGenerateEffect;
