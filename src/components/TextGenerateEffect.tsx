import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface TextGenerateEffectProps {
  words: string;
  className?: string;
  dir?: 'ltr' | 'rtl';
  lang?: string;
  duration?: number;
  stagger?: number;
}

/**
 * Smooth word-by-word blur-to-sharp text reveal inspired by @aceternity/text-generate-effect-demo.
 * Supports LTR and RTL (Urdu Nastaliq & Arabic Cairo) seamlessly.
 */
export const TextGenerateEffect: React.FC<TextGenerateEffectProps> = ({
  words,
  className = '',
  dir = 'ltr',
  lang,
  duration = 0.32,
  stagger = 0.032,
}) => {
  const tokens = useMemo(() => {
    const clean = (words || '').trim();
    if (!clean) return [];
    // Cap animation stagger count cleanly for very long replies so reveal stays snappy
    const parts = clean.split(/(\s+)/);
    return parts;
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
        const delay = Math.min(currentWord * stagger, 1.2);
        return (
          <motion.span
            key={`w-${idx}-${token.slice(0, 6)}`}
            initial={{ opacity: 0, filter: 'blur(6px)', y: 3 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            transition={{ duration, delay, ease: 'easeOut' }}
            className="inline-block"
          >
            {token}
          </motion.span>
        );
      })}
    </div>
  );
};

export default TextGenerateEffect;
