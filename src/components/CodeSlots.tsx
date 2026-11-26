import React, { useEffect, useRef, useState } from 'react';

interface CodeSlotsProps {
  length?: number;
  value: string;
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
}

/**
 * Zero-lag animated 6-digit OTP verification slots inspired by @react-bits/CodeSlots-JS-CSS.
 * Uses pure GPU CSS transitions (no blur filters or layout-thrashing springs) for instant mobile typing.
 */
export const CodeSlots: React.FC<CodeSlotsProps> = React.memo(
  ({
    length = 6,
    value,
    onChange,
    onComplete,
    disabled = false,
    error = false,
    autoFocus = true,
  }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [focused, setFocused] = useState(false);

    const sanitized = value.replace(/\D/g, '').slice(0, length);
    const activeIdx = Math.min(sanitized.length, length - 1);

    useEffect(() => {
      if (autoFocus && !disabled) {
        inputRef.current?.focus();
      }
    }, [autoFocus, disabled]);

    const applyNextCode = (raw: string) => {
      const next = raw.replace(/\D/g, '').slice(0, length);
      if (next === sanitized) return;
      onChange(next);
      if (next.length === length && onComplete) {
        onComplete(next);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      applyNextCode(e.target.value);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text');
      if (pasted) {
        applyNextCode(pasted);
      }
    };

    return (
      <div
        onClick={() => !disabled && inputRef.current?.focus()}
        className={`relative flex w-full cursor-text items-center justify-center gap-2 sm:gap-2.5 ${
          error ? 'vl-shake' : ''
        }`}
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

          const borderClass = error
            ? 'border-rose-500/85'
            : isCurrent
              ? 'border-emerald-400 scale-105 shadow-[0_0_16px_rgba(16,185,129,0.45)]'
              : isFilled
                ? 'border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'border-white/15';

          return (
            <div
              key={idx}
              className={`relative flex h-[3.25rem] w-11 sm:w-12 items-center justify-center rounded-xl border bg-zinc-950/90 text-xl font-bold tracking-tight transition-transform duration-150 ${borderClass}`}
            >
              {char ? (
                <span className="text-emerald-300">{char}</span>
              ) : isCurrent ? (
                <span className="h-6 w-0.5 animate-pulse rounded-full bg-emerald-400" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
              )}

              <span
                className={`absolute bottom-1.5 h-0.5 w-6 rounded-full transition-opacity duration-150 ${
                  error ? 'bg-rose-500 opacity-100' : 'bg-emerald-400'
                } ${isCurrent ? 'opacity-100' : isFilled ? 'opacity-55' : 'opacity-0'}`}
              />
            </div>
          );
        })}
      </div>
    );
  }
);

CodeSlots.displayName = 'CodeSlots';

export default CodeSlots;
