import React, { useCallback, useEffect, useState } from 'react';
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

/**
 * Isolated 1-second OTP countdown component so ticks NEVER re-render AuthPage or CodeSlots inputs!
 */
const OtpCountdownBar: React.FC<{
  expiresAtMs: number;
  busy: boolean;
  onResend: () => void;
}> = React.memo(({ expiresAtMs, busy, onResend }) => {
  const [remaining, setRemaining] = useState<number>(() =>
    Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000))
  );

  useEffect(() => {
    const tick = () => {
      const next = Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000));
      setRemaining(next);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAtMs]);

  return (
    <div className="flex items-center justify-between rounded-xl border border-white/8 bg-zinc-950/75 px-3.5 py-2.5 text-xs">
      <span className="text-zinc-400">
        {remaining > 0 ? (
          <>
            Expires in{' '}
            <span className="font-mono font-bold text-emerald-300">
              00:{String(remaining).padStart(2, '0')}
            </span>
          </>
        ) : (
          <span className="text-amber-300">Code expired — request a new OTP</span>
        )}
      </span>
      <button
        type="button"
        disabled={remaining > 0 || busy}
        onClick={onResend}
        className="inline-flex items-center gap-1 font-semibold text-emerald-400 transition hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Resend
      </button>
    </div>
  );
});

OtpCountdownBar.displayName = 'OtpCountdownBar';

export const AuthPage: React.FC = () => {
  const { loginWithToken } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');

  // Login / OTP state
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpExpiresAtMs, setOtpExpiresAtMs] = useState(0);
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

  const handleRequestOtp = useCallback(
    async (e?: React.FormEvent) => {
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
        setOtpExpiresAtMs(Date.now() + (res.expires_in_seconds || 40) * 1000);
        setDevOtpHint(res.dev_otp);
        setSuccessMsg('6-digit verification code sent to your email.');
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : 'Unable to send OTP.');
      } finally {
        setBusy(false);
      }
    },
    [email]
  );

  const handleVerifyOtp = useCallback(
    async (codeOverride?: string) => {
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
        window.setTimeout(() => setOtpErrorShake(false), 380);
        setError(err instanceof ApiClientError ? err.message : 'Invalid or expired OTP.');
      } finally {
        setBusy(false);
      }
    },
    [busy, email, loginWithToken, otp]
  );

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
    <div className="relative flex h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-[#04070a] px-4 py-3">
      {/* Lightweight pure-CSS GPU neon backdrop (zero WebGL typing lag) */}
      <NeonAmbientCanvas />

      <div className="glass-card relative z-10 mt-6 w-full max-w-[390px] overflow-visible rounded-[28px] border border-emerald-500/30 px-5 pb-5 pt-12 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_32px_rgba(16,185,129,0.14)] sm:px-6 sm:pb-6 sm:pt-14">
        {/* Top-Center Lensy Bot Logo with Pure-CSS GPU Signal Waves */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2">
          <div className="relative flex h-20 w-20 items-center justify-center">
            <span className="vl-signal-ring pointer-events-none absolute inset-0 rounded-full border border-emerald-400/70" />
            <span
              className="vl-signal-ring pointer-events-none absolute inset-0 rounded-full border border-emerald-400/55"
              style={{ animationDelay: '0.85s' }}
            />
            <span
              className="vl-signal-ring pointer-events-none absolute inset-0 rounded-full border border-emerald-400/40"
              style={{ animationDelay: '1.7s' }}
            />
            <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full border-2 border-emerald-400/75 bg-zinc-950 p-1 shadow-[0_0_24px_rgba(16,185,129,0.55)]">
              <img
                src="/lensy-logo.png"
                alt="Vision Lens"
                className="h-full w-full rounded-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Brand Headline */}
        <div className="text-center">
          <h1 className="bg-gradient-to-r from-white via-emerald-200 to-emerald-400 bg-clip-text text-xl font-extrabold tracking-tight text-transparent sm:text-2xl">
            Vision Lens
          </h1>
          <p className="mt-0.5 text-[11px] font-medium text-zinc-400">
            See the World. Understand Everything.
          </p>
        </div>

        {/* Snappy Glassy Mode Switcher Tabs */}
        <div className="mt-4 grid grid-cols-2 rounded-2xl border border-white/10 bg-zinc-950/80 p-1">
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
                className={`rounded-xl py-2.5 text-xs font-semibold tracking-wide transition-colors duration-150 ${
                  active
                    ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-zinc-950 shadow-[0_0_14px_rgba(16,185,129,0.4)]'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            );
          })}
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
            {error}
          </div>
        )}
        {successMsg && !error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        {mode === 'login' ? (
          <div className="mt-5">
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
                      className="w-full rounded-xl border border-white/12 bg-zinc-950/90 py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-3.5 text-sm font-bold text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.35)] transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
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
                  <span className="truncate text-zinc-400">
                    Code sent to <strong className="text-zinc-200">{email}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp('');
                    }}
                    className="ml-2 shrink-0 text-emerald-400 hover:underline"
                  >
                    Change
                  </button>
                </div>

                {/* Zero-Lag 6-Slot CodeSlots OTP Input */}
                <div className="py-2">
                  <CodeSlots
                    value={otp}
                    onChange={setOtp}
                    onComplete={(code) => void handleVerifyOtp(code)}
                    disabled={busy}
                    error={otpErrorShake}
                    autoFocus
                  />
                </div>

                {devOtpHint && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-center text-xs text-emerald-200">
                    Dev OTP: <strong className="font-mono tracking-widest">{devOtpHint}</strong>
                  </div>
                )}

                {/* Isolated 40s Countdown & Resend Row */}
                <OtpCountdownBar
                  expiresAtMs={otpExpiresAtMs}
                  busy={busy}
                  onResend={() => void handleRequestOtp()}
                />

                <button
                  type="button"
                  disabled={busy || otp.length !== 6}
                  onClick={() => void handleVerifyOtp()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-3.5 text-sm font-bold text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.35)] transition hover:brightness-110 disabled:opacity-50"
                >
                  {busy ? (
                    <GreenLoader scale={0.22} />
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Verify &amp; Sign In
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleRegister} className="mt-5 space-y-3.5">
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
                  className="w-full rounded-xl border border-white/12 bg-zinc-950/90 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
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
                  className="w-full rounded-xl border border-white/12 bg-zinc-950/90 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
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
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-3.5 text-sm font-bold text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.35)] transition hover:brightness-110 disabled:opacity-60"
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
          </form>
        )}

        <p className="mt-3.5 text-center text-[10px] text-zinc-500">
          Private • Passwordless sign-in
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
