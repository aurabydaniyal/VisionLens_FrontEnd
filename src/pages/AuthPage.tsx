import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Globe,
  Mail,
  RefreshCw,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';
import { api, ApiClientError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import CodeSlots from '../components/CodeSlots';
import GreenLoader from '../components/GreenLoader';
import NeonAmbientCanvas from '../components/NeonAmbientCanvas';

type AuthMode = 'login' | 'register';

const COUNTRIES = [
  'Pakistan',
  'United Arab Emirates',
  'Saudi Arabia',
  'Turkey',
  'China',
  'United Kingdom',
  'United States',
  'Canada',
  'Germany',
  'Other',
];

const GENDERS = ['Male', 'Female', 'Prefer not to say'];

export const AuthPage: React.FC = () => {
  const { loginWithToken } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');

  // Login / OTP state
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  // Registration state
  const [username, setUsername] = useState('');
  const [country, setCountry] = useState('Pakistan');
  const [gender, setGender] = useState('Male');

  // UI feedback
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [otpErrorShake, setOtpErrorShake] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your registered email address.');
      return;
    }
    setBusy(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await api.requestOtp(cleanEmail);
      setOtpSent(true);
      setOtp('');
      setCountdown(res.expires_in_seconds || 40);
      setDevOtpHint(res.dev_otp);
      setSuccessMsg('6-digit verification code sent to your email.');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to send OTP.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (codeOverride?: string) => {
    const code = (codeOverride ?? otp).trim();
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setError('');
    setOtpErrorShake(false);
    try {
      const res = await api.verifyOtp(email.trim().toLowerCase(), code);
      loginWithToken(res.access_token, res.user);
    } catch (err) {
      setOtpErrorShake(true);
      window.setTimeout(() => setOtpErrorShake(false), 500);
      setError(err instanceof ApiClientError ? err.message : 'Invalid or expired OTP.');
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!username.trim() || !cleanEmail) {
      setError('Please complete all required fields.');
      return;
    }
    setBusy(true);
    setError('');
    setSuccessMsg('');
    try {
      await api.register({
        country,
        gender,
        username: username.trim(),
        email: cleanEmail,
      });
      setMode('login');
      setOtpSent(false);
      setSuccessMsg('Account created! Request your 40-second Email OTP below to sign in.');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Registration failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#04070a] px-4 py-8">
      {/* Three.js WebGL neon emerald ambient canvas */}
      <NeonAmbientCanvas intensity={1.1} />

      {/* Radial neon emerald aura behind card */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/18 blur-[120px]"
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="glass-card relative z-10 w-full max-w-[410px] overflow-visible rounded-[32px] border border-emerald-500/30 px-6 pb-7 pt-16 shadow-[0_24px_80px_rgba(0,0,0,0.8),0_0_40px_rgba(16,185,129,0.16)]"
      >
        {/* Top-Center Lensy Bot Logo with Animated Expanding Circular Signal Waves */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2">
          <div className="relative flex h-24 w-24 items-center justify-center">
            {[0, 0.7, 1.4].map((delay) => (
              <motion.span
                key={delay}
                initial={{ scale: 0.88, opacity: 0.75 }}
                animate={{ scale: 2.05, opacity: 0 }}
                transition={{
                  duration: 2.4,
                  repeat: Infinity,
                  delay,
                  ease: 'easeOut',
                }}
                className="pointer-events-none absolute inset-0 rounded-full border border-emerald-400/70 shadow-[0_0_16px_rgba(16,185,129,0.5)]"
              />
            ))}
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full border-2 border-emerald-400/75 bg-zinc-950 p-1 shadow-[0_0_32px_rgba(16,185,129,0.6)]"
            >
              <img
                src="/lensy-logo.png"
                alt="Vision Lens Lensy Bot"
                className="h-full w-full rounded-full object-cover"
              />
            </motion.div>
          </div>
        </div>

        {/* Brand Headline */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2">
            <h1 className="bg-gradient-to-r from-white via-emerald-200 to-emerald-400 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">
              Vision Lens
            </h1>
            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
              V1
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-zinc-400">
            See the World. Understand Everything.
          </p>
        </div>

        {/* Glassy Mode Switcher Tabs */}
        <div className="mt-6 grid grid-cols-2 rounded-2xl border border-white/10 bg-zinc-950/75 p-1">
          {(['login', 'register'] as const).map((tab) => {
            const active = mode === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setMode(tab);
                  setError('');
                  setSuccessMsg('');
                }}
                className={`relative rounded-xl py-2.5 text-xs font-semibold tracking-wide transition-colors ${
                  active ? 'text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="auth-tab-pill"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_18px_rgba(16,185,129,0.45)]"
                  />
                )}
                <span className="relative z-10">{tab === 'login' ? 'Sign In' : 'Create Account'}</span>
              </button>
            );
          })}
        </div>

        {/* Status Messages */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key="err"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200"
            >
              {error}
            </motion.div>
          )}
          {successMsg && !error && (
            <motion.div
              key="ok"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-200"
            >
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Body */}
        <AnimatePresence mode="wait">
          {mode === 'login' ? (
            <motion.div
              key="login-panel"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.22 }}
              className="mt-5"
            >
              {!otpSent ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400/75" />
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-xl border border-white/12 bg-zinc-950/85 py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-3.5 text-sm font-bold text-zinc-950 shadow-[0_0_24px_rgba(16,185,129,0.4)] transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
                  >
                    {busy ? (
                      <GreenLoader scale={0.22} />
                    ) : (
                      <>
                        Send 40s Verification Code
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">
                      Code sent to <strong className="text-zinc-200">{email}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtp('');
                        setCountdown(0);
                      }}
                      className="text-emerald-400 hover:underline"
                    >
                      Change
                    </button>
                  </div>

                  {/* Animated 6-Slot CodeSlots OTP Input */}
                  <div className="py-2">
                    <CodeSlots
                      value={otp}
                      onChange={setOtp}
                      onComplete={(code) => void handleVerifyOtp(code)}
                      disabled={busy}
                      error={otpErrorShake}
                    />
                  </div>

                  {devOtpHint && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-center text-xs text-emerald-200">
                      Dev OTP: <strong className="font-mono tracking-widest">{devOtpHint}</strong>
                    </div>
                  )}

                  {/* 40s Countdown & Resend Row */}
                  <div className="flex items-center justify-between rounded-xl border border-white/8 bg-zinc-950/70 px-3.5 py-2.5 text-xs">
                    <span className="text-zinc-400">
                      {countdown > 0 ? (
                        <>
                          Expires in{' '}
                          <span className="font-mono font-bold text-emerald-300">
                            00:{String(countdown).padStart(2, '0')}
                          </span>
                        </>
                      ) : (
                        <span className="text-amber-300">Code expired — request a new OTP</span>
                      )}
                    </span>
                    <button
                      type="button"
                      disabled={countdown > 0 || busy}
                      onClick={() => void handleRequestOtp()}
                      className="inline-flex items-center gap-1 font-semibold text-emerald-400 transition hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Resend
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={busy || otp.length !== 6}
                    onClick={() => void handleVerifyOtp()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-3.5 text-sm font-bold text-zinc-950 shadow-[0_0_24px_rgba(16,185,129,0.4)] transition hover:brightness-110 disabled:opacity-50"
                  >
                    {busy ? (
                      <GreenLoader scale={0.22} />
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        Verify & Sign In
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.form
              key="register-panel"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.22 }}
              onSubmit={handleRegister}
              className="mt-5 space-y-3.5"
            >
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-300">Username</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400/75" />
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={80}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Muhammad Daniyal"
                    className="w-full rounded-xl border border-white/12 bg-zinc-950/85 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-300">
                  Email Address <span className="text-zinc-500">(1 email = 1 account)</span>
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400/75" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-white/12 bg-zinc-950/85 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-300">Country</label>
                  <div className="relative">
                    <Globe className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-emerald-400/75" />
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-white/12 bg-zinc-950/90 py-2.5 pl-9 pr-3 text-xs text-white focus:border-emerald-400 focus:outline-none"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c} className="bg-zinc-950">
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-300">Gender</label>
                  <div className="relative">
                    <Users className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-emerald-400/75" />
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-white/12 bg-zinc-950/90 py-2.5 pl-9 pr-3 text-xs text-white focus:border-emerald-400 focus:outline-none"
                    >
                      {GENDERS.map((g) => (
                        <option key={g} value={g} className="bg-zinc-950">
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-3.5 text-sm font-bold text-zinc-950 shadow-[0_0_24px_rgba(16,185,129,0.4)] transition hover:brightness-110 disabled:opacity-60"
              >
                {busy ? (
                  <GreenLoader scale={0.22} />
                ) : (
                  <>
                    Create Free Lite Account
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <p className="mt-5 text-center text-[11px] text-zinc-500">
          Zero static camera storage • Passwordless 5-day encrypted session
        </p>
      </motion.div>
    </div>
  );
};

export default AuthPage;
