import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileText,
  Languages,
  Lock,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import {
  FrameProcessResponse,
  OutputLanguage,
  PlanTier,
  VisionTextItem,
} from '../api/client';
import TextGenerateEffect from './TextGenerateEffect';

interface StackOverlayProps {
  result: FrameProcessResponse | null;
  planTier: PlanTier;
  outputLanguage: OutputLanguage;
  actionLoading: 'translate_full' | 'summarize' | 'more_info' | null;
  actionOutput: { title: string; text: string; direction: 'ltr' | 'rtl' } | null;
  onPageChange: (nextPage: number) => void;
  onSpeak: (text: string) => void;
  onTextAction: (action: 'translate_full' | 'summarize') => void;
  onMoreInfo: (sourceText: string, translatedText: string, detectedLang: string) => void;
  onDismiss?: () => void;
}

/**
 * Refined Hybrid Camera Overlay + Layered Stack Card Deck + Smooth Pagination & Actions.
 * Sits cleanly above the flex BottomNav dock — never overlaps or clips on any mobile screen.
 */
export const StackOverlay: React.FC<StackOverlayProps> = ({
  result,
  planTier,
  outputLanguage,
  actionLoading,
  actionOutput,
  onPageChange,
  onSpeak,
  onTextAction,
  onMoreInfo,
  onDismiss,
}) => {
  const [expanded, setExpanded] = useState(true);

  if (!result) return null;

  const { pagination, items, direction, notice } = result;
  const isRtl = direction === 'rtl';
  const hasMultiplePages = pagination.total_pages > 1;
  const langClass =
    outputLanguage === 'ur' ? 'lang-ur' : outputLanguage === 'ar' ? 'lang-ar' : '';

  return (
    <>
      {/* Subtle Live Floating Translation Tags on Viewfinder */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        <AnimatePresence>
          {items.map((item: VisionTextItem) => {
            const [bx, by, bw] = item.bbox;
            const leftPct = Math.max(4, Math.min(64, bx * 100));
            const topPct = Math.max(13, Math.min(46, by * 100));
            const widthPct = Math.max(28, Math.min(82, bw * 100));

            return (
              <motion.div
                key={`${item.id}-${pagination.page}`}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.18 }}
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  maxWidth: `${widthPct}%`,
                }}
                dir={item.direction}
                className={`pointer-events-auto absolute rounded-xl border border-emerald-400/45 bg-zinc-950/82 px-2.5 py-1 text-[11px] font-medium text-emerald-100 shadow-[0_6px_20px_rgba(0,0,0,0.65)] backdrop-blur-md ${langClass}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSpeak(item.translated_text);
                }}
              >
                <span className="line-clamp-2">{item.translated_text}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Layered Stack Card Deck Container */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="pointer-events-auto absolute inset-x-0 bottom-2.5 z-30 mx-auto w-full max-w-md px-3"
      >
        <div className="relative">
          {/* Tactile Stacked-Card Depth Layers when multiple pages exist */}
          {expanded && hasMultiplePages && (
            <>
              <div className="pointer-events-none absolute inset-x-5 -top-2.5 h-4 rounded-t-2xl border border-emerald-400/15 bg-zinc-900/55" />
              <div className="pointer-events-none absolute inset-x-2.5 -top-1.5 h-3.5 rounded-t-2xl border border-emerald-400/25 bg-zinc-900/80" />
            </>
          )}

          <div className="glass-card relative overflow-hidden rounded-[24px] border border-emerald-500/30 shadow-[0_18px_48px_rgba(0,0,0,0.75)]">
            {/* Compact Header Bar */}
            <div className="flex items-center justify-between px-3.5 py-2">
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="flex flex-1 items-center gap-2 text-left"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span className="text-xs font-bold tracking-wide text-white">
                  Translations
                </span>
                {pagination.total_items > 0 && (
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                    {pagination.total_items}
                  </span>
                )}
                {hasMultiplePages && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    {pagination.page} / {pagination.total_pages}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setExpanded((prev) => !prev)}
                  aria-label={expanded ? 'Collapse translations' : 'Expand translations'}
                  className="rounded-full p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                >
                  {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </button>
                {onDismiss && (
                  <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Close translations"
                    className="rounded-full p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden border-t border-white/[0.08]"
                >
                  <div className="px-3 pb-2.5 pt-2">
                    {notice && (
                      <div
                        dir={direction}
                        className={`mb-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-200 ${langClass}`}
                      >
                        {notice}
                      </div>
                    )}

                    {/* Compact Scroll-Safe Stack Cards Area */}
                    <div className="max-h-[28dvh] space-y-1.5 overflow-y-auto pr-0.5">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={`stack-page-${pagination.page}-${items.map((i) => i.id).join('-')}`}
                          initial={{ opacity: 0, x: isRtl ? -18 : 18 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: isRtl ? 18 : -18 }}
                          transition={{ duration: 0.16 }}
                          className="space-y-1.5"
                        >
                          {items.map((item, idx) => (
                            <div
                              key={item.id}
                              className="group rounded-2xl border border-white/[0.08] bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 px-3 py-2 transition hover:border-emerald-400/35"
                            >
                              <div className="mb-1 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-[9px] font-bold text-emerald-300">
                                    {(pagination.page - 1) * pagination.page_size + idx + 1}
                                  </span>
                                  <span className="text-[10px] font-semibold text-emerald-300/90">
                                    {item.detected_lang_name}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => onSpeak(item.translated_text)}
                                  aria-label="Speak translation"
                                  className="rounded-lg border border-white/10 bg-white/5 p-1 text-emerald-300 transition hover:bg-emerald-500/20"
                                >
                                  <Volume2 className="h-3 w-3" />
                                </button>
                              </div>

                              <TextGenerateEffect
                                words={item.translated_text}
                                dir={item.direction}
                                lang={outputLanguage}
                                className="text-[13px] font-medium leading-snug text-white"
                                stagger={0.02}
                              />
                              {item.source_text !== item.translated_text && (
                                <p className="mt-1 line-clamp-2 text-[11px] text-zinc-400">
                                  {item.source_text}
                                </p>
                              )}
                            </div>
                          ))}
                        </motion.div>
                      </AnimatePresence>

                      {/* Action Output Card (Full Translation / Summary) */}
                      {actionOutput && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-2xl border border-emerald-400/35 bg-emerald-950/40 p-2.5"
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                              {actionOutput.title}
                            </span>
                            <button
                              type="button"
                              onClick={() => onSpeak(actionOutput.text)}
                              className="rounded-lg bg-emerald-500/20 p-1 text-emerald-300 hover:bg-emerald-500/30"
                            >
                              <Volume2 className="h-3 w-3" />
                            </button>
                          </div>
                          <TextGenerateEffect
                            words={actionOutput.text}
                            dir={actionOutput.direction}
                            lang={outputLanguage}
                            className="whitespace-pre-line text-xs leading-relaxed text-zinc-100"
                          />
                        </motion.div>
                      )}
                    </div>

                    {/* Sleek Stack Card Pagination Bar */}
                    {hasMultiplePages && (
                      <div className="mt-2 flex items-center justify-between rounded-2xl border border-white/[0.07] bg-zinc-950/75 px-2 py-1.5">
                        <button
                          type="button"
                          disabled={pagination.page <= 1}
                          onClick={() => onPageChange(pagination.page - 1)}
                          className="inline-flex items-center gap-0.5 rounded-xl px-2 py-1 text-[11px] font-semibold text-zinc-200 transition hover:bg-white/10 disabled:opacity-30"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          Prev
                        </button>

                        {/* Smooth Interactive Stack Dots */}
                        <div className="flex items-center gap-1.5">
                          {Array.from({ length: Math.min(pagination.total_pages, 7) }).map((_, idx) => {
                            const p = idx + 1;
                            const active = p === pagination.page;
                            return (
                              <button
                                key={p}
                                type="button"
                                onClick={() => onPageChange(p)}
                                aria-label={`Page ${p}`}
                                className={`h-2 rounded-full transition-all duration-200 ${
                                  active
                                    ? 'w-6 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.65)]'
                                    : 'w-2 bg-white/20 hover:bg-white/40'
                                }`}
                              />
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          disabled={pagination.page >= pagination.total_pages}
                          onClick={() => onPageChange(pagination.page + 1)}
                          className="inline-flex items-center gap-0.5 rounded-xl px-2 py-1 text-[11px] font-semibold text-zinc-200 transition hover:bg-white/10 disabled:opacity-30"
                        >
                          Next
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Clean 3-Action Strip */}
                    {items.length > 0 && (
                      <div className="mt-2 grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          disabled={actionLoading !== null}
                          onClick={() => onTextAction('translate_full')}
                          className="inline-flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/[0.05] px-2 py-1.5 text-[11px] font-semibold text-zinc-200 transition hover:border-emerald-400/35 hover:bg-emerald-500/12 disabled:opacity-50"
                        >
                          <Languages className="h-3.5 w-3.5 text-emerald-400" />
                          {actionLoading === 'translate_full' ? '...' : 'Full Text'}
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading !== null}
                          onClick={() => onTextAction('summarize')}
                          className="inline-flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/[0.05] px-2 py-1.5 text-[11px] font-semibold text-zinc-200 transition hover:border-emerald-400/35 hover:bg-emerald-500/12 disabled:opacity-50"
                        >
                          <FileText className="h-3.5 w-3.5 text-emerald-400" />
                          {actionLoading === 'summarize' ? '...' : 'Summarize'}
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading !== null}
                          onClick={() =>
                            onMoreInfo(
                              result.full_source_text,
                              result.full_translated_text,
                              items[0]?.detected_lang || 'unknown'
                            )
                          }
                          className="inline-flex items-center justify-center gap-1 rounded-xl border border-emerald-400/35 bg-emerald-500/16 px-2 py-1.5 text-[11px] font-semibold text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-50"
                        >
                          {planTier === 'lite' ? (
                            <Lock className="h-3 w-3 text-emerald-300" />
                          ) : (
                            <Sparkles className="h-3 w-3 text-emerald-300" />
                          )}
                          {actionLoading === 'more_info' ? '...' : 'More Info'}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default StackOverlay;
