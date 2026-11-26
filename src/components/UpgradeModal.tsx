import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, KeyRound, ShieldCheck, Sparkles, X } from 'lucide-react';
import { api, ApiClientError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import GreenLoader from './GreenLoader';

interface UpgradeModalProps {
  onGoToSettings?: () => void;
}

/**
 * Plus Unlock Modal triggered whenever a Lite user taps a Plus-only feature or hits the 10-min daily quota.
 * Strictly passkey-based (no payment gateways / Stripe in V1).
 */
export const UpgradeModal: React.FC<UpgradeModalProps> = ({ onGoToSettings }) => {
  const { upgradePrompt, closeUpgradeModal, setUserProfile } = useAuth();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const updated = await api.upgradePlus(code.trim());
      setUserProfile(updated);
      setCode('');
      closeUpgradeModal();
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : 'Unable to verify Plus access code.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {upgradePrompt.open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 backdrop-blur-md sm:items-center"
          onClick={closeUpgradeModal}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card relative w-full max-w-md overflow-hidden rounded-3xl border border-emerald-500/30 p-6"
          >
            {/* Top emerald glow bar */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />

            <button
              type="button"
              onClick={closeUpgradeModal}
              aria-label="Close modal"
              className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/5 p-1.5 text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/15 shadow-[0_0_24px_rgba(16,185,129,0.35)]">
                <img src="/lensy-logo.png" alt="Lensy AI" className="h-9 w-9 rounded-full object-cover" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                  <Sparkles className="h-3 w-3" />
                  {upgradePrompt.isQuota ? 'Daily Lite Limit Reached' : 'VisionLens Plus'}
                </span>
                <h3 className="mt-1 text-lg font-bold text-white">Unlock Full Plus Experience</h3>
              </div>
            </div>

            {upgradePrompt.reason && (
              <p className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-2.5 text-xs leading-relaxed text-amber-200">
                {upgradePrompt.reason}
              </p>
            )}

            <ul className="mt-4 space-y-2 text-xs text-zinc-300">
              {[
                'All 5 output languages (English, Urdu RTL, Arabic RTL, Turkish, Chinese)',
                'Full Lensy AI multimodal chat, More Info handoff & 30-day memory',
                'Upload PDF, Word & Images (up to 10 docs) for private RAG Q&A',
                'Silent AI Vision fallback on Tap-to-Identify & no daily timer',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <form onSubmit={handleUnlock} className="mt-5 space-y-3">
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400/70" />
                <input
                  type="password"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter VisionLens Plus passkey"
                  className="w-full rounded-xl border border-white/12 bg-zinc-950/85 py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                />
              </div>

              {error && <p className="text-xs text-rose-400">{error}</p>}

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={submitting || !code.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-sm font-semibold text-zinc-950 shadow-[0_0_24px_rgba(16,185,129,0.4)] transition hover:brightness-110 disabled:opacity-50"
                >
                  {submitting ? (
                    <GreenLoader scale={0.22} />
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Activate Plus
                    </>
                  )}
                </button>
                {onGoToSettings && (
                  <button
                    type="button"
                    onClick={() => {
                      closeUpgradeModal();
                      onGoToSettings();
                    }}
                    className="rounded-xl border border-white/12 bg-white/5 px-3.5 py-3 text-xs font-medium text-zinc-300 hover:bg-white/10"
                  >
                    Settings
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpgradeModal;
