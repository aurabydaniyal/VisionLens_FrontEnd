import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  ChevronRight,
  Crown,
  ExternalLink,
  Globe,
  History,
  KeyRound,
  Lock,
  LogOut,
  ShieldCheck,
  Sparkles,
  Trash2,
  User as UserIcon,
  Volume2,
  X,
} from 'lucide-react';
import {
  api,
  ApiClientError,
  HistoryItem,
  OutputLanguage,
  VoiceMode,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { speakText } from '../utils/tts';
import GreenLoader from '../components/GreenLoader';

const LANGUAGE_OPTIONS: { code: OutputLanguage; short: string; label: string; plusOnly: boolean }[] = [
  { code: 'en', short: 'EN', label: 'English', plusOnly: false },
  { code: 'ur', short: 'اردو', label: 'Urdu', plusOnly: true },
  { code: 'ar', short: 'عربي', label: 'Arabic', plusOnly: true },
  { code: 'tr', short: 'TR', label: 'Turkish', plusOnly: true },
  { code: 'zh', short: '中文', label: 'Chinese', plusOnly: true },
];

const VOICE_OPTIONS: { mode: VoiceMode; label: string }[] = [
  { mode: 'off', label: 'Off' },
  { mode: 'tap', label: 'Tap' },
  { mode: 'auto', label: 'Auto' },
];

function formatHistoryDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function friendlyHistoryLabel(rawType: string): string {
  const lower = (rawType || '').toLowerCase();
  if (lower.includes('summary')) return 'Summary';
  if (lower.includes('object')) return 'Object Scan';
  return 'Translation';
}

/**
 * Clean, professional, single-viewport non-scrollable mobile Settings page.
 * - Zero exposed internal data or open secret input bar on start.
 * - Tapping Plan opens the sleek Plan Popup (Lite Free | Plus Locked -> Secret Key | Pro Coming Soon).
 * - Tapping History opens a refined History Sheet Modal.
 */
export const SettingsPage: React.FC = () => {
  const { user, setUserProfile, logout } = useAuth();

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Modals
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [showPlusKeyInput, setShowPlusKeyInput] = useState(false);
  const [secretCode, setSecretCode] = useState('');
  const [planError, setPlanError] = useState('');

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!historyModalOpen) return;
    setHistoryLoading(true);
    void api
      .getHistory()
      .then((res) => setHistoryItems(res.items))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [historyModalOpen]);

  if (!user) return null;

  const isPlus = user.plan_tier === 'plus';

  const openPlanForUpgrade = (reason?: string) => {
    setPlanError(reason || '');
    setShowPlusKeyInput(!isPlus);
    setPlanModalOpen(true);
  };

  const handleLanguageSelect = async (lang: OutputLanguage, plusOnly: boolean) => {
    if (plusOnly && !isPlus) {
      openPlanForUpgrade('Unlock Plus to use all 5 output languages.');
      return;
    }
    if (lang === user.output_language) return;
    setBusy(true);
    try {
      const updated = await api.updateSettings({ output_language: lang });
      setUserProfile(updated);
      const opt = LANGUAGE_OPTIONS.find((o) => o.code === lang);
      setToast({ type: 'ok', text: `Language set to ${opt?.label || lang.toUpperCase()}` });
    } catch (err) {
      if (err instanceof ApiClientError) setToast({ type: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleVoiceMode = async (voiceMode: VoiceMode) => {
    if (voiceMode === user.voice_mode) return;
    setBusy(true);
    try {
      const updated = await api.updateSettings({ voice_mode: voiceMode });
      setUserProfile(updated);
    } finally {
      setBusy(false);
    }
  };

  const handleSpeakerToggle = async () => {
    setBusy(true);
    try {
      const updated = await api.updateSettings({ speaker_enabled: !user.speaker_enabled });
      setUserProfile(updated);
    } finally {
      setBusy(false);
    }
  };

  const handleActivatePlus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretCode.trim()) return;
    setBusy(true);
    setPlanError('');
    try {
      const updated = await api.upgradePlus(secretCode.trim());
      setUserProfile(updated);
      setSecretCode('');
      setShowPlusKeyInput(false);
      setPlanModalOpen(false);
      setToast({ type: 'ok', text: 'VisionLens Plus activated!' });
    } catch (err) {
      setPlanError(err instanceof ApiClientError ? err.message : 'Invalid secret key.');
    } finally {
      setBusy(false);
    }
  };

  const handleSwitchToLite = async () => {
    if (!isPlus) return;
    setBusy(true);
    setPlanError('');
    try {
      const updated = await api.downgradeLite();
      setUserProfile(updated);
      setPlanModalOpen(false);
      setToast({ type: 'ok', text: 'Switched to Lite plan.' });
    } catch (err) {
      if (err instanceof ApiClientError) setPlanError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    setBusy(true);
    try {
      await api.deleteAccount();
      await logout();
    } catch (err) {
      setDeleteModalOpen(false);
      setToast({
        type: 'err',
        text: err instanceof ApiClientError ? err.message : 'Could not delete account.',
      });
      setBusy(false);
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#04070a] px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
      {/* Subtle Top Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`absolute inset-x-4 top-[max(0.75rem,env(safe-area-inset-top))] z-40 mx-auto max-w-md rounded-2xl border px-3.5 py-2 text-center text-xs font-medium shadow-xl backdrop-blur-md ${
              toast.type === 'ok'
                ? 'border-emerald-400/40 bg-emerald-950/90 text-emerald-200'
                : 'border-rose-500/40 bg-rose-950/90 text-rose-200'
            }`}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Non-Scrollable Viewport-Fitted Layout */}
      <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col justify-between gap-2.5 sm:gap-3">
        {/* 1. Compact Header */}
        <header className="flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/lensy-logo.png"
              alt="Vision Lens"
              className="h-8 w-8 rounded-full border border-emerald-400/50 object-cover shadow-[0_0_14px_rgba(16,185,129,0.4)]"
            />
            <div>
              <h1 className="text-base font-extrabold leading-tight tracking-tight text-white">
                Settings
              </h1>
              <p className="text-[11px] text-zinc-500">Account &amp; Preferences</p>
            </div>
          </div>
          {busy && <GreenLoader scale={0.22} />}
        </header>

        {/* 2. Profile + Plan Group Card */}
        <section className="glass-card shrink-0 divide-y divide-white/[0.07] overflow-hidden rounded-3xl">
          {/* Account Info Row */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
              <UserIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{user.username}</p>
              <p className="truncate text-xs text-zinc-400">{user.email}</p>
            </div>
          </div>

          {/* Tappable Plan Selector Row (Opens Plan Popup — No Open Input Bar!) */}
          <button
            type="button"
            onClick={() => {
              setPlanError('');
              setShowPlusKeyInput(false);
              setPlanModalOpen(true);
            }}
            className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-white/[0.04] active:bg-white/[0.06]"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                <Crown className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Plan</p>
                <p className="text-[11px] text-zinc-400">
                  {isPlus ? 'Plus Active' : 'Lite • Free'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  isPlus
                    ? 'border-emerald-400/45 bg-emerald-500/20 text-emerald-300'
                    : 'border-white/12 bg-white/[0.06] text-zinc-300'
                }`}
              >
                {isPlus ? 'Plus' : 'Lite'}
              </span>
              <ChevronRight className="h-4 w-4 text-zinc-500" />
            </div>
          </button>
        </section>

        {/* 3. Preferences Card (Language + Voice + Saved History) */}
        <section className="glass-card shrink-0 divide-y divide-white/[0.07] overflow-hidden rounded-3xl">
          {/* Output Language Pill Strip */}
          <div className="px-4 py-3">
            <div className="mb-2 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-bold text-white">Output Language</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {LANGUAGE_OPTIONS.map((opt) => {
                const active = user.output_language === opt.code;
                const locked = opt.plusOnly && !isPlus;
                return (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => void handleLanguageSelect(opt.code, opt.plusOnly)}
                    className={`relative flex flex-col items-center justify-center rounded-xl border py-1.5 text-center transition ${
                      active
                        ? 'border-emerald-400/65 bg-emerald-500/20 text-white shadow-[0_0_12px_rgba(16,185,129,0.22)]'
                        : 'border-white/10 bg-zinc-950/70 text-zinc-300 hover:border-white/20'
                    }`}
                  >
                    {locked && (
                      <Lock className="absolute right-1 top-1 h-2.5 w-2.5 text-emerald-400/75" />
                    )}
                    <span className="text-[11px] font-bold leading-tight">{opt.short}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Voice & Speaker Segmented Control */}
          <div className="px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs font-bold text-white">Voice Output</span>
              </div>
              <button
                type="button"
                onClick={() => void handleSpeakerToggle()}
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold transition ${
                  user.speaker_enabled
                    ? 'border-emerald-400/45 bg-emerald-500/20 text-emerald-300'
                    : 'border-white/10 bg-zinc-900 text-zinc-400'
                }`}
              >
                Speaker {user.speaker_enabled ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-white/8 bg-zinc-950/80 p-1">
              {VOICE_OPTIONS.map((v) => {
                const active = user.voice_mode === v.mode;
                return (
                  <button
                    key={v.mode}
                    type="button"
                    onClick={() => void handleVoiceMode(v.mode)}
                    className={`rounded-xl py-1.5 text-xs font-semibold transition ${
                      active
                        ? 'bg-emerald-500/25 text-emerald-200 ring-1 ring-emerald-400/45'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Saved History Row (Opens Refined History Modal) */}
          <button
            type="button"
            onClick={() => setHistoryModalOpen(true)}
            className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-white/[0.04] active:bg-white/[0.06]"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                <History className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Saved History</p>
                <p className="text-[11px] text-zinc-400">View your bookmarked scans</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-500" />
          </button>
        </section>

        {/* 4. Account Actions */}
        <section className="grid shrink-0 grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void logout()}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/12 bg-white/[0.05] py-2.5 text-xs font-semibold text-zinc-200 transition hover:bg-white/10"
          >
            <LogOut className="h-3.5 w-3.5 text-emerald-400" />
            Sign Out
          </button>
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-rose-500/25 bg-rose-500/10 py-2.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Account
          </button>
        </section>

        {/* 5. Sleek Compact Brand Footer */}
        <footer className="glass-card relative shrink-0 overflow-hidden rounded-3xl border border-emerald-500/20 px-4 py-3 text-center">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-left">
              <img
                src="/lensy-logo.png"
                alt="Vision Lens"
                className="h-6 w-6 rounded-full border border-emerald-400/45 object-cover"
              />
              <div>
                <p className="bg-gradient-to-r from-white via-emerald-200 to-emerald-400 bg-clip-text text-xs font-extrabold text-transparent">
                  Vision Lens
                </p>
                <p className="text-[10px] text-zinc-500">See the World. Understand Everything.</p>
              </div>
            </div>
            <a
              href="https://m-daniyal.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/12 px-3 py-1 text-[11px] font-semibold text-emerald-300 transition hover:border-emerald-300 hover:bg-emerald-500/22"
            >
              <span>Developed By Daniyal</span>
              <ExternalLink className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </div>
        </footer>
      </div>

      {/* ================= PLAN SELECTOR POPUP MODAL ================= */}
      <AnimatePresence>
        {planModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPlanModalOpen(false)}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 backdrop-blur-md sm:items-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card relative w-full max-w-sm overflow-hidden rounded-3xl border border-emerald-500/30 p-5"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <h2 className="text-base font-bold text-white">Choose Your Plan</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setPlanModalOpen(false)}
                  className="rounded-full border border-white/10 bg-white/5 p-1.5 text-zinc-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2.5">
                {/* LITE — FREE */}
                <div
                  className={`rounded-2xl border p-3.5 transition ${
                    !isPlus
                      ? 'border-emerald-400/50 bg-emerald-500/12'
                      : 'border-white/10 bg-zinc-950/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">Lite</p>
                      <p className="text-[11px] text-zinc-400">
                        Everyday scanning &amp; English translation
                      </p>
                    </div>
                    {!isPlus ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                        <Check className="h-3 w-3" />
                        Free
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleSwitchToLite()}
                        className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-zinc-300 hover:bg-white/10"
                      >
                        Switch to Free
                      </button>
                    )}
                  </div>
                </div>

                {/* PLUS — LOCKED (Tap to reveal Secret Key input) */}
                <div
                  className={`rounded-2xl border p-3.5 transition ${
                    isPlus || showPlusKeyInput
                      ? 'border-emerald-400/55 bg-emerald-500/14 shadow-[0_0_24px_rgba(16,185,129,0.16)]'
                      : 'border-white/12 bg-zinc-950/75 hover:border-emerald-400/35'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!isPlus) {
                        setShowPlusKeyInput((v) => !v);
                        setPlanError('');
                      }
                    }}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <div>
                      <p className="text-sm font-bold text-white">Plus</p>
                      <p className="text-[11px] text-zinc-400">
                        All 5 languages, Lensy AI, photo &amp; document Q&amp;A
                      </p>
                    </div>
                    {isPlus ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/25 px-2.5 py-0.5 text-[10px] font-bold text-emerald-200">
                        <Check className="h-3 w-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                        <Lock className="h-3 w-3" />
                        Locked
                      </span>
                    )}
                  </button>

                  {/* Secret Key Input Revealed Only When User Taps Plus */}
                  <AnimatePresence initial={false}>
                    {!isPlus && showPlusKeyInput && (
                      <motion.form
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        onSubmit={handleActivatePlus}
                        className="mt-3 space-y-2.5 overflow-hidden border-t border-white/10 pt-3"
                      >
                        <div className="relative">
                          <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400/80" />
                          <input
                            type="password"
                            autoFocus
                            value={secretCode}
                            onChange={(e) => setSecretCode(e.target.value)}
                            placeholder="Enter secret key"
                            className="w-full rounded-xl border border-white/15 bg-zinc-950 py-2.5 pl-9 pr-3 text-sm text-white placeholder-zinc-500 focus:border-emerald-400 focus:outline-none"
                          />
                        </div>
                        {planError && <p className="text-[11px] text-rose-400">{planError}</p>}
                        <button
                          type="submit"
                          disabled={busy || !secretCode.trim()}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-2.5 text-xs font-bold text-zinc-950 shadow-[0_0_16px_rgba(16,185,129,0.35)] transition hover:brightness-110 disabled:opacity-50"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          {busy ? 'Activating...' : 'Activate Plus'}
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>

                {/* PRO — COMING SOON */}
                <div className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-zinc-950/50 p-3.5 opacity-70">
                  <div>
                    <p className="text-sm font-bold text-zinc-300">Pro</p>
                    <p className="text-[11px] text-zinc-500">Next-generation visual workspace</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-semibold text-zinc-400">
                    Coming Soon
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= SAVED HISTORY SHEET MODAL ================= */}
      <AnimatePresence>
        {historyModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setHistoryModalOpen(false)}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-3 backdrop-blur-md sm:items-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card flex max-h-[78dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-emerald-500/25"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-emerald-400" />
                  <h2 className="text-sm font-bold text-white">Saved History</h2>
                  <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                    {historyItems.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryModalOpen(false)}
                  className="rounded-full border border-white/10 bg-white/5 p-1.5 text-zinc-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4">
                {historyLoading ? (
                  <div className="flex justify-center py-8">
                    <GreenLoader scale={0.35} />
                  </div>
                ) : historyItems.length === 0 ? (
                  <div className="py-10 text-center">
                    <History className="mx-auto h-8 w-8 text-zinc-600" />
                    <p className="mt-2.5 text-sm font-semibold text-zinc-300">No saved items yet</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Toggle the bookmark icon on Home to keep your favorite translations.
                    </p>
                  </div>
                ) : (
                  historyItems.map((item) => {
                    const rtl = item.target_lang === 'ur' || item.target_lang === 'ar';
                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-white/[0.08] bg-zinc-950/75 p-3.5 transition hover:border-emerald-400/30"
                      >
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                              {friendlyHistoryLabel(item.item_type)}
                            </span>
                            <span className="text-[10px] font-medium uppercase text-zinc-500">
                              {item.target_lang}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-500">
                              {formatHistoryDate(item.created_at)}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                void speakText(
                                  item.translated_text,
                                  (item.target_lang as OutputLanguage) || 'en',
                                  true
                                )
                              }
                              aria-label="Speak saved item"
                              className="rounded-lg bg-white/5 p-1 text-emerald-300 hover:bg-emerald-500/20"
                            >
                              <Volume2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <p
                          dir={rtl ? 'rtl' : 'ltr'}
                          className={`text-sm font-medium leading-relaxed text-white ${
                            item.target_lang === 'ur'
                              ? 'lang-ur'
                              : item.target_lang === 'ar'
                              ? 'lang-ar'
                              : ''
                          }`}
                        >
                          {item.translated_text}
                        </p>
                        {item.source_text && item.source_text !== item.translated_text && (
                          <p className="mt-1.5 border-t border-white/[0.06] pt-1.5 text-[11px] text-zinc-400">
                            {item.source_text}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= DELETE ACCOUNT CONFIRM MODAL ================= */}
      <AnimatePresence>
        {deleteModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeleteModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full max-w-xs rounded-3xl border border-rose-500/30 p-5 text-center"
            >
              <Trash2 className="mx-auto h-7 w-7 text-rose-400" />
              <h3 className="mt-3 text-sm font-bold text-white">Delete Account?</h3>
              <p className="mt-1.5 text-xs text-zinc-400">
                This permanently removes your account, saved history, chats, and uploaded documents.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="rounded-xl border border-white/12 bg-white/5 py-2 text-xs font-semibold text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleDeleteAccount()}
                  className="rounded-xl bg-rose-600 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50"
                >
                  {busy ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsPage;
