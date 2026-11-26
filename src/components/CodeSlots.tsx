import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface CodeSlotsProps {
  length?: number;
  value: string;
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
}

/**
 * Animated 6-digit OTP verification slots inspired by @react-bits/CodeSlots-JS-CSS.
 * Features neon emerald focus glow, spring digit pop-in, paste support, and error shake.
 */
export const CodeSlots: React.FC<CodeSlotsProps> = ({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  const sanitized = value.replace(/\D/g, '').slice(0, length);
  const activeIdx = Math.min(sanitized.length, length - 1);

  useEffect(() => {
    if (sanitized.length === length && onComplete) {
      onComplete(sanitized);
    }
  }, [sanitized, length, onComplete]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value.replace(/\D/g, '').slice(0, length);
    onChange(next);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pasted) {
      onChange(pasted);
    }
  };

  return (
    <motion.div
      animate={error ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
      transition={{ duration: 0.35 }}
      onClick={() => !disabled && inputRef.current?.focus()}
      className="relative flex w-full cursor-text items-center justify-center gap-2 sm:gap-2.5"
    >
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={length}
        value={sanitized}
        disabled={disabled}
        onChange={handleChange}
        onPaste={handlePaste}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label="6-digit OTP verification code"
        className="absolute inset-0 z-20 h-full w-full cursor-text opacity-0"
      />

      {Array.from({ length }).map((_, idx) => {
        const char = sanitized[idx] || '';
        const isCurrent = focused && idx === activeIdx && !disabled;
        const isFilled = Boolean(char);

        return (
          <motion.div
            key={idx}
            initial={false}
            animate={{
              scale: isCurrent ? 1.06 : 1,
              borderColor: error
                ? 'rgba(244, 63, 94, 0.85)'
                : isCurrent
                  ? 'rgba(52, 211, 153, 0.95)'
                  : isFilled
                    ? 'rgba(16, 185, 129, 0.55)'
                    : 'rgba(255, 255, 255, 0.14)',
            }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className={`relative flex h-13 w-11 sm:h-14 sm:w-12 items-center justify-center rounded-xl border bg-zinc-950/85 text-xl font-bold tracking-tight text-white shadow-inner backdrop-blur-md transition-shadow ${
              isCurrent
                ? 'shadow-[0_0_20px_rgba(16,185,129,0.45)]'
                : isFilled
                  ? 'shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                  : ''
            }`}
            style={{ height: '3.25rem' }}
          >
            <AnimatePresence mode="popLayout">
              {char ? (
                <motion.span
                  key={`${idx}-${char}`}
                  initial={{ opacity: 0, y: 8, scale: 0.65, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -8, scale: 0.65 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 26 }}
                  className="text-emerald-300"
                >
                  {char}
                </motion.span>
              ) : isCurrent ? (
                <motion.span
                  key={`caret-${idx}`}
                  animate={{ opacity: [1, 0.15, 1] }}
                  transition={{ duration: 0.9, repeat: Infinity }}
                  className="h-6 w-0.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]"
                />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
              )}
            </AnimatePresence>

            {/* Bottom neon slot underline indicator */}
            <motion.span
              animate={{
                scaleX: isCurrent || isFilled ? 1 : 0,
                opacity: isCurrent ? 1 : isFilled ? 0.55 : 0,
              }}
              className={`absolute bottom-1.5 h-0.5 w-6 rounded-full ${
                error ? 'bg-rose-500' : 'bg-emerald-400'
              }`}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default CodeSlots;
