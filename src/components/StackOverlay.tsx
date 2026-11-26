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
}

/**
 * Hybrid Camera Overlay + Smooth Stack Pagination (3/page) + Breadcrumb Pills + Swipe-Up Tray.
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
}) => {
  const [expanded, setExpanded] = useState(true);

  if (!result) return null;

  const { pagination, items, direction, notice } = result;
  const isRtl = direction === 'rtl';
  const langClass =
    outputLanguage === 'ur' ? 'lang-ur' : outputLanguage === 'ar' ? 'lang-ar' : '';

  return (
    <>
      {/* Live Camera Viewport Floating Translation Cards (anchored to normalized bbox) */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        <AnimatePresence>
          {items.map((item: VisionTextItem) => {
            const [bx, by, bw] = item.bbox;
            const leftPct = Math.max(4, Math.min(68, bx * 100));
            const topPct = Math.max(12, Math.min(58, by * 100));
            const widthPct = Math.max(28, Math.min(88, bw * 100));

            return (
              <motion.div
                key={`${item.id}-${pagination.page}`}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.22 }}
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  maxWidth: `${widthPct}%`,
                }}
                dir={item.direction}
                className={`pointer-events-auto absolute rounded-xl border border-emerald-400/45 bg-zinc-950/80 px-2.5 py-1.5 text-xs font-medium text-emerald-100 shadow-[0_6px_24px_rgba(0,0,0,0.65)] backdrop-blur-md ${langClass}`}
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

      {/* Swipe-Up Glass Results Tray with Smooth Stack Pagination & Breadcrumbs */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="pointer-events-auto absolute inset-x-0 bottom-[5.5rem] z-30 mx-auto w-full max-w-lg px-3"
      >
        <div className="glass-card overflow-hidden rounded-3xl border border-emerald-500/25 shadow-2xl">
          {/* Drag / Collapse Handle + Breadcrumb Header */}
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="flex w-full items-center justify-between px-4 py-2.5 text-left"
          >
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              <span className="text-xs font-semibold tracking-wide text-zinc-200">
                Scan Results
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                {pagination.total_items} blocks
              </span>
              {result.cache_hit && (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  Instant Cache
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              {pagination.total_pages > 1 && (
                <span className="text-[11px] font-medium text-emerald-300">
                  {pagination.page} / {pagination.total_pages}
                </span>
              )}
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </div>
          </button>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden border-t border-white/8"
              >
                <div className="max-h-[38vh] space-y-2.5 overflow-y-auto px-3.5 py-3">
                  {notice && (
                    <div
                      dir={direction}
                      className={`rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 ${langClass}`}
                    >
                      {notice}
                    </div>
                  )}

                  {/* Paginated Stack Cards (3 per page) */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`page-${pagination.page}-${items.map((i) => i.id).join('-')}`}
                      initial={{ opacity: 0, x: isRtl ? -16 : 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: isRtl ? 16 : -16 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2"
                    >
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-white/8 bg-zinc-900/70 p-3 transition hover:border-emerald-500/35"
                        >
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                              {item.detected_lang_name} ({Math.round(item.confidence * 100)}%)
                            </span>
                            <button
                              type="button"
                              onClick={() => onSpeak(item.translated_text)}
                              aria-label="Speak translation"
                              className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-emerald-300 transition hover:bg-emerald-500/20"
                            >
                              <Volume2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <TextGenerateEffect
                            words={item.translated_text}
                            dir={item.direction}
                            lang={outputLanguage}
                            className="text-sm font-medium text-white"
                            stagger={0.025}
                          />
                          {item.source_text !== item.translated_text && (
                            <p className="mt-1 text-[11px] text-zinc-400">{item.source_text}</p>
                          )}
                        </div>
                      ))}
                    </motion.div>
                  </AnimatePresence>

                  {/* Action Output Card (Translate Full / Summarize) */}
                  {actionOutput && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-emerald-400/35 bg-emerald-950/35 p-3"
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                          {actionOutput.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => onSpeak(actionOutput.text)}
                          className="rounded-lg bg-emerald-500/20 p-1 text-emerald-300 hover:bg-emerald-500/30"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
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

                  {/* Smooth Breadcrumb / Stack Pagination Controls */}
                  {pagination.total_pages > 1 && (
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        disabled={pagination.page <= 1}
                        onClick={() => onPageChange(pagination.page - 1)}
                        className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-white/10 disabled:opacity-35"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        Prev
                      </button>

                      {/* Animated Breadcrumb Page Pills */}
                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: pagination.total_pages }).map((_, idx) => {
                          const p = idx + 1;
                          const active = p === pagination.page;
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => onPageChange(p)}
                              aria-label={`Page ${p}`}
                              className={`h-6 min-w-[24px] rounded-full px-2 text-[11px] font-semibold transition-all ${
                                active
                                  ? 'bg-emerald-400 text-zinc-950 shadow-[0_0_12px_rgba(52,211,153,0.6)]'
                                  : 'bg-white/8 text-zinc-400 hover:bg-white/15 hover:text-white'
                              }`}
                            >
                              {p}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        disabled={pagination.page >= pagination.total_pages}
                        onClick={() => onPageChange(pagination.page + 1)}
                        className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-white/10 disabled:opacity-35"
                      >
                        Next
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Quick Actions Row */}
                  {items.length > 0 && (
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <button
                        type="button"
                        disabled={actionLoading !== null}
                        onClick={() => onTextAction('translate_full')}
                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-[11px] font-medium text-zinc-200 transition hover:border-emerald-400/30 hover:bg-emerald-500/10 disabled:opacity-50"
                      >
                        <Languages className="h-3.5 w-3.5 text-emerald-400" />
                        {actionLoading === 'translate_full' ? '...' : 'Full Text'}
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading !== null}
                        onClick={() => onTextAction('summarize')}
                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-[11px] font-medium text-zinc-200 transition hover:border-emerald-400/30 hover:bg-emerald-500/10 disabled:opacity-50"
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
                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-2 py-2 text-[11px] font-semibold text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-50"
                      >
                        {planTier === 'lite' ? (
                          <Lock className="h-3 w-3 text-emerald-300" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
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
      </motion.div>
    </>
  );
};

export default StackOverlay;
