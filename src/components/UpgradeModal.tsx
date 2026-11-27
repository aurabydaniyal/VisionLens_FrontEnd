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
 * Clean Plus Unlock Modal triggered whenever a Lite user accesses a Plus feature or hits daily limit.
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
        err instanceof ApiClientError ? err.message : 'Unable to verify Plus access key.'
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
            initial={{ opacity: 0, y: 36, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card relative w-full max-w-sm overflow-hidden rounded-3xl border border-emerald-500/30 p-5"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />

            <button
              type="button"
              onClick={closeUpgradeModal}
              aria-label="Close modal"
              className="absolute right-3.5 top-3.5 rounded-full border border-white/10 bg-white/5 p-1.5 text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/15 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <img src="/lensy-logo.png" alt="Vision Lens" className="h-8 w-8 rounded-full object-cover" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                  <Sparkles className="h-2.5 w-2.5" />
                  {upgradePrompt.isQuota ? 'Daily Limit Reached' : 'VisionLens Plus'}
                </span>
                <h3 className="mt-0.5 text-base font-bold text-white">Unlock VisionLens Plus</h3>
              </div>
            </div>

            {upgradePrompt.reason && (
              <p className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-200">
                {upgradePrompt.reason}
              </p>
            )}

            <ul className="mt-3.5 space-y-2 text-xs text-zinc-300">
              {[
                'All 5 output languages (English, Urdu, Arabic, Turkish, Chinese)',
                'Full Lensy AI assistant with photo Q&A and instant Ask Lensy',
                'Upload PDF, Word & image files to ask Lensy questions',
                'Unlimited daily scanning & extended saved history',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <form onSubmit={handleUnlock} className="mt-4 space-y-2.5">
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400/70" />
                <input
                  type="password"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter secret key"
                  className="w-full rounded-xl border border-white/12 bg-zinc-950/85 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                />
              </div>

              {error && <p className="text-xs text-rose-400">{error}</p>}

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={submitting || !code.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-2.5 text-sm font-bold text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.35)] transition hover:brightness-110 disabled:opacity-50"
                >
                  {submitting ? (
                    <GreenLoader scale={0.2} />
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
                    className="rounded-xl border border-white/12 bg-white/5 px-3 py-2.5 text-xs font-medium text-zinc-300 hover:bg-white/10"
                  >
                    Plans
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
