import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  Clock,
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

const LANGUAGE_OPTIONS: { code: OutputLanguage; label: string; native: string; plusOnly: boolean }[] = [
  { code: 'en', label: 'English', native: 'English', plusOnly: false },
  { code: 'ur', label: 'Urdu', native: 'اردو (RTL)', plusOnly: true },
  { code: 'ar', label: 'Arabic', native: 'العربية (RTL)', plusOnly: true },
  { code: 'tr', label: 'Turkish', native: 'Türkçe', plusOnly: true },
  { code: 'zh', label: 'Chinese', native: '中文', plusOnly: true },
];

const VOICE_OPTIONS: { mode: VoiceMode; label: string; desc: string }[] = [
  { mode: 'off', label: 'Off', desc: 'Silent visual mode' },
  { mode: 'tap', label: 'Tap to Speak', desc: 'Speak when tapped' },
  { mode: 'auto', label: 'Automatic', desc: 'Auto-read results' },
];

export const SettingsPage: React.FC = () => {
  const { user, setUserProfile, logout, openUpgradeModal } = useAuth();

  const [secretCode, setSecretCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!showHistory) return;
    void api
      .getHistory()
      .then((res) => setHistoryItems(res.items))
      .catch(() => {});
  }, [showHistory]);

  if (!user) return null;

  const isPlus = user.plan_tier === 'plus';
  const quotaPct = isPlus
    ? 100
    : Math.min(100, Math.round((user.quota.used_seconds / Math.max(1, user.quota.limit_seconds)) * 100));

  const handleLanguageSelect = async (lang: OutputLanguage, plusOnly: boolean) => {
    if (plusOnly && !isPlus) {
      openUpgradeModal('Non-English output languages require VisionLens Plus.', false);
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const updated = await api.updateSettings({ output_language: lang });
      setUserProfile(updated);
      setFeedback({ type: 'ok', text: `Output language updated to ${lang.toUpperCase()}.` });
    } catch (err) {
      if (err instanceof ApiClientError) {
        setFeedback({ type: 'err', text: err.message });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleVoiceMode = async (voiceMode: VoiceMode) => {
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

  const handleUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretCode.trim()) return;
    setBusy(true);
    setFeedback(null);
    try {
      const updated = await api.upgradePlus(secretCode.trim());
      setUserProfile(updated);
      setSecretCode('');
      setFeedback({ type: 'ok', text: 'Welcome to VisionLens Plus! All 5 languages & Lensy AI unlocked.' });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof ApiClientError ? err.message : 'Invalid Plus secret code.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDowngrade = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const updated = await api.downgradeLite();
      setUserProfile(updated);
      setFeedback({ type: 'ok', text: 'Switched back to Lite plan (English output).' });
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
      setFeedback({
        type: 'err',
        text: err instanceof ApiClientError ? err.message : 'Could not delete account.',
      });
      setBusy(false);
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-[#04070a] px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="mx-auto w-full max-w-lg space-y-4">
        {/* Top Headline & Breadcrumb */}
        <header className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <img
              src="/lensy-logo.png"
              alt="Vision Lens"
              className="h-10 w-10 rounded-full border border-emerald-400/50 object-cover shadow-[0_0_16px_rgba(16,185,129,0.45)]"
            />
            <div>
              <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                <span>Vision Lens</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-emerald-300">Settings</span>
              </div>
              <h1 className="text-lg font-extrabold tracking-tight text-white">Account & Controls</h1>
            </div>
          </div>
          {busy && <GreenLoader scale={0.25} />}
        </header>

        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border px-4 py-2.5 text-xs ${
              feedback.type === 'ok'
                ? 'border-emerald-400/35 bg-emerald-500/12 text-emerald-200'
                : 'border-rose-500/35 bg-rose-500/12 text-rose-200'
            }`}
          >
            {feedback.text}
          </motion.div>
        )}

        {/* Profile & Active Tier Card */}
        <section className="glass-card rounded-3xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
                <UserIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">{user.username}</h2>
                <p className="text-xs text-zinc-400">{user.email}</p>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  {user.country} • {user.gender}
                </p>
              </div>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                isPlus
                  ? 'border-emerald-400/45 bg-emerald-500/20 text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.3)]'
                  : 'border-white/15 bg-white/5 text-zinc-300'
              }`}
            >
              {user.plan_tier}
            </span>
          </div>

          {/* Daily Camera Quota & Retention Meter */}
          <div className="mt-4 rounded-2xl border border-white/8 bg-zinc-950/70 p-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-zinc-300">
                <Clock className="h-3.5 w-3.5 text-emerald-400" />
                Daily Camera Processing
              </span>
              <span className="font-mono font-semibold text-emerald-300">
                {isPlus
                  ? 'Unlimited'
                  : `${Math.floor(user.quota.used_seconds / 60)}m ${user.quota.used_seconds % 60}s / 10m`}
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${quotaPct}%` }}
                transition={{ duration: 0.5 }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-300 shadow-[0_0_10px_#10b981]"
              />
            </div>
            <p className="mt-2 text-[11px] text-zinc-500">
              Data retention: <strong className="text-zinc-300">{user.retention_days} days</strong> •
              Live frames are processed strictly in RAM and never stored.
            </p>
          </div>
        </section>

        {/* Output Language Selector */}
        <section className="glass-card rounded-3xl p-4">
          <div className="mb-3 flex items-center gap-2">
            <Globe className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Output Language</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {LANGUAGE_OPTIONS.map((opt) => {
              const active = user.output_language === opt.code;
              const locked = opt.plusOnly && !isPlus;
              return (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => void handleLanguageSelect(opt.code, opt.plusOnly)}
                  className={`flex flex-col items-start rounded-2xl border px-3 py-2.5 text-left transition ${
                    active
                      ? 'border-emerald-400/60 bg-emerald-500/20 text-white shadow-[0_0_16px_rgba(16,185,129,0.25)]'
                      : 'border-white/10 bg-zinc-950/65 text-zinc-300 hover:border-white/20'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-xs font-semibold">{opt.label}</span>
                    {locked && <Lock className="h-3 w-3 text-emerald-400/75" />}
                  </div>
                  <span className="mt-0.5 text-[11px] text-zinc-400">{opt.native}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Voice Mode & Speaker Controls */}
        <section className="glass-card rounded-3xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">Voice & TTS Output</h2>
            </div>
            <button
              type="button"
              onClick={() => void handleSpeakerToggle()}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                user.speaker_enabled
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                  : 'bg-zinc-800 text-zinc-400 border border-white/10'
              }`}
            >
              Speaker: {user.speaker_enabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {VOICE_OPTIONS.map((v) => {
              const active = user.voice_mode === v.mode;
              return (
                <button
                  key={v.mode}
                  type="button"
                  onClick={() => void handleVoiceMode(v.mode)}
                  className={`rounded-2xl border p-2.5 text-center transition ${
                    active
                      ? 'border-emerald-400/60 bg-emerald-500/20 text-white'
                      : 'border-white/10 bg-zinc-950/65 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <p className="text-xs font-semibold">{v.label}</p>
                  <p className="mt-0.5 text-[10px] opacity-75">{v.desc}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Subscription Control: Lite <-> Plus Passkey & Pro V2 Locked */}
        <section className="glass-card rounded-3xl p-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Plan & Access</h2>
          </div>

          {!isPlus ? (
            <form onSubmit={handleUpgrade} className="space-y-3">
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400/75" />
                <input
                  type="password"
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value)}
                  placeholder="Enter VisionLens Plus secret passkey"
                  className="w-full rounded-xl border border-white/12 bg-zinc-950/85 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-emerald-400 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={busy || !secretCode.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-2.5 text-xs font-bold text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.35)] transition hover:brightness-110 disabled:opacity-50"
              >
                <ShieldCheck className="h-4 w-4" />
                Unlock VisionLens Plus
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3">
              <div>
                <p className="text-xs font-bold text-emerald-200">VisionLens Plus Active</p>
                <p className="text-[11px] text-zinc-400">All 5 languages, Lensy AI & 30d retention</p>
              </div>
              <button
                type="button"
                onClick={() => void handleDowngrade()}
                className="rounded-xl border border-white/15 bg-zinc-950/80 px-3 py-1.5 text-[11px] font-semibold text-zinc-300 hover:bg-white/10"
              >
                Switch to Lite
              </button>
            </div>
          )}

          {/* Pro Plan (V2 Locked) */}
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/8 bg-zinc-950/50 px-3.5 py-2.5 opacity-75">
            <div>
              <p className="text-xs font-semibold text-zinc-300">VisionLens Pro (V2)</p>
              <p className="text-[11px] text-zinc-500">MCP Web & Research Tools — Upcoming V2</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-zinc-400">
              <Lock className="h-3 w-3" />
              Locked
            </span>
          </div>
        </section>

        {/* Saved History Accordion */}
        <section className="glass-card rounded-3xl p-4">
          <button
            type="button"
            onClick={() => setShowHistory((p) => !p)}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-bold text-white">Saved Scan History</span>
            </div>
            <span className="text-xs text-emerald-300">{showHistory ? 'Hide' : 'View'}</span>
          </button>

          {showHistory && (
            <div className="mt-3 space-y-2">
              {historyItems.length === 0 ? (
                <p className="text-xs text-zinc-500">
                  No saved items yet. Enable the bookmark icon on Home to save scans.
                </p>
              ) : (
                historyItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/8 bg-zinc-950/70 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider text-emerald-400">
                        {item.item_type} • {item.target_lang.toUpperCase()}
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
                        className="text-zinc-400 hover:text-emerald-300"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p
                      dir={item.target_lang === 'ur' || item.target_lang === 'ar' ? 'rtl' : 'ltr'}
                      className="mt-1 font-medium text-white"
                    >
                      {item.translated_text}
                    </p>
                    {item.source_text && (
                      <p className="mt-1 text-[11px] text-zinc-500">{item.source_text}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* Session & Danger Zone */}
        <section className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => void logout()}
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/5 py-3 text-xs font-semibold text-zinc-200 transition hover:bg-white/10"
          >
            <LogOut className="h-4 w-4 text-emerald-400" />
            Sign Out
          </button>

          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center justify-center gap-2 rounded-2xl border border-rose-500/25 bg-rose-500/10 py-3 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
            >
              <Trash2 className="h-4 w-4" />
              Delete Account
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleDeleteAccount()}
              className="flex items-center justify-center gap-2 rounded-2xl bg-rose-600 py-3 text-xs font-bold text-white"
            >
              Confirm Delete
            </button>
          )}
        </section>

        {/* Beautiful Vision Lens Brand Footer with Developer Link */}
        <footer className="glass-card relative overflow-hidden rounded-3xl border border-emerald-500/25 px-5 py-6 text-center">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent" />
          <div className="flex items-center justify-center gap-2">
            <img
              src="/lensy-logo.png"
              alt="Vision Lens"
              className="h-7 w-7 rounded-full border border-emerald-400/50 object-cover"
            />
            <span className="bg-gradient-to-r from-white via-emerald-200 to-emerald-400 bg-clip-text text-base font-extrabold tracking-tight text-transparent">
              Vision Lens
            </span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-400">
            See the World. Understand Everything.
          </p>
          <div className="mt-3 flex items-center justify-center">
            <a
              href="https://m-daniyal.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-500/12 px-4 py-1.5 text-xs font-semibold text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.2)] transition hover:border-emerald-300 hover:bg-emerald-500/25 hover:text-emerald-200"
            >
              <span>Developed By Daniyal</span>
              <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </div>
          <p className="mt-3 text-[10px] text-zinc-600">
            VisionLens V1 • Core Team: Muhammad Daniyal, Qasim Ali &amp; Zunair Majeed
          </p>
        </footer>
      </div>
    </div>
  );
};

export default SettingsPage;
