import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bookmark,
  Camera,
  CameraOff,
  Crosshair,
  ImagePlus,
  Lock,
  Pause,
  Play,
  Radio,
  RefreshCw,
  ScanText,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  api,
  ApiClientError,
  FrameProcessResponse,
  TapIdentifyResponse,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { captureResizedBlob, evaluateVideoFrame } from '../utils/frameGate';
import { speakText, stopSpeaking } from '../utils/tts';
import GreenLoader from '../components/GreenLoader';
import StackOverlay from '../components/StackOverlay';
import TextGenerateEffect from '../components/TextGenerateEffect';

type CameraState =
  | 'initializing'
  | 'streaming'
  | 'frozen'
  | 'permission_denied'
  | 'camera_unavailable'
  | 'reconnecting';

interface HomeCameraPageProps {
  onOpenLensySession: (sessionId: string) => void;
  onAskLensyWithImage: (blob: Blob, prompt: string) => void;
}

const LANG_LABELS: Record<string, string> = {
  en: 'EN',
  ur: 'اردو',
  ar: 'العربية',
  tr: 'TR',
  zh: '中文',
};

export const HomeCameraPage: React.FC<HomeCameraPageProps> = ({
  onOpenLensySession,
  onAskLensyWithImage,
}) => {
  const { user, setUserProfile, updateQuota, openUpgradeModal } = useAuth();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastFrameBlobRef = useRef<Blob | null>(null);
  const lastDHashRef = useRef<string>('');
  const processingRef = useRef<boolean>(false);

  const [cameraState, setCameraState] = useState<CameraState>('initializing');
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null);
  const [autoScan, setAutoScan] = useState<boolean>(false);
  const [saveToHistory, setSaveToHistory] = useState<boolean>(false);
  const [scanning, setScanning] = useState<boolean>(false);
  const [frameResult, setFrameResult] = useState<FrameProcessResponse | null>(null);
  const [tapResult, setTapResult] = useState<TapIdentifyResponse | null>(null);
  const [tapRipple, setTapRipple] = useState<{ x: number; y: number } | null>(null);
  const [actionLoading, setActionLoading] = useState<
    'translate_full' | 'summarize' | 'more_info' | null
  >(null);
  const [actionOutput, setActionOutput] = useState<{
    title: string;
    text: string;
    direction: 'ltr' | 'rtl';
  } | null>(null);
  const [statusBanner, setStatusBanner] = useState<string>('');

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setUploadedPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setCameraState('initializing');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState('camera_unavailable');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState('streaming');
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setCameraState('permission_denied');
      } else {
        setCameraState('camera_unavailable');
      }
    }
  }, [stopCamera]);

  useEffect(() => {
    void startCamera();
    return () => {
      stopCamera();
      stopSpeaking();
    };
  }, [startCamera, stopCamera]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        setAutoScan(false);
        stopSpeaking();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const runFrameScan = useCallback(
    async (blob: Blob, page = 1) => {
      if (!user || processingRef.current) return;
      processingRef.current = true;
      setScanning(true);
      setStatusBanner('');
      setActionOutput(null);
      try {
        lastFrameBlobRef.current = blob;
        const res = await api.processFrame(blob, page, 3, saveToHistory);
        setFrameResult(res);
        updateQuota(res.quota);

        if (res.items.length > 0 && user.voice_mode === 'auto' && user.speaker_enabled) {
          void speakText(res.full_translated_text, res.output_language, true);
        }
      } catch (err) {
        if (err instanceof ApiClientError) {
          setStatusBanner(err.message);
        }
      } finally {
        setScanning(false);
        processingRef.current = false;
      }
    },
    [saveToHistory, updateQuota, user]
  );

  // Smart Auto-Scan interval gated by client-side sharpness & scene-change detection
  useEffect(() => {
    if (!autoScan || cameraState !== 'streaming') return;
    const id = window.setInterval(async () => {
      if (document.hidden || processingRef.current || !videoRef.current) return;
      try {
        const gate = await evaluateVideoFrame(videoRef.current, lastDHashRef.current, false);
        if (!gate.passed || !gate.blob) return;
        lastDHashRef.current = gate.dhash;
        await runFrameScan(gate.blob, 1);
      } catch {
        // Ignore transient capture issues
      }
    }, 2600);
    return () => window.clearInterval(id);
  }, [autoScan, cameraState, runFrameScan]);

  const handleManualScan = async () => {
    setTapResult(null);
    if (uploadedPreviewUrl && lastFrameBlobRef.current) {
      await runFrameScan(lastFrameBlobRef.current, 1);
      return;
    }
    if (!videoRef.current || (cameraState !== 'streaming' && cameraState !== 'frozen')) {
      fileInputRef.current?.click();
      return;
    }
    try {
      const gate = await evaluateVideoFrame(videoRef.current, lastDHashRef.current, true);
      if (gate.blob) {
        lastDHashRef.current = gate.dhash;
        await runFrameScan(gate.blob, 1);
      }
    } catch {
      setStatusBanner('Could not capture frame. Try uploading an image.');
    }
  };

  const handleToggleFreeze = () => {
    if (!videoRef.current) return;
    if (cameraState === 'streaming') {
      videoRef.current.pause();
      setAutoScan(false);
      setCameraState('frozen');
    } else if (cameraState === 'frozen') {
      void videoRef.current.play();
      setCameraState('streaming');
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    stopCamera();
    setAutoScan(false);
    setTapResult(null);
    setFrameResult(null);
    setActionOutput(null);

    const url = URL.createObjectURL(file);
    setUploadedPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setCameraState('frozen');

    const img = new Image();
    img.onload = async () => {
      try {
        const blob = await captureResizedBlob(img);
        lastFrameBlobRef.current = blob;
        await runFrameScan(blob, 1);
      } catch {
        lastFrameBlobRef.current = file;
        await runFrameScan(file, 1);
      }
    };
    img.src = url;
  };

  const handleViewportTap = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!user || scanning) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const tapX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const tapY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    setTapRipple({ x: tapX * 100, y: tapY * 100 });
    window.setTimeout(() => setTapRipple(null), 850);

    let frameBlob: Blob | null = lastFrameBlobRef.current;
    if (!uploadedPreviewUrl && videoRef.current && (cameraState === 'streaming' || cameraState === 'frozen')) {
      try {
        frameBlob = await captureResizedBlob(videoRef.current);
        lastFrameBlobRef.current = frameBlob;
      } catch {
        frameBlob = null;
      }
    }
    if (!frameBlob) return;

    setScanning(true);
    setStatusBanner('');
    try {
      const res = await api.tapIdentify(frameBlob, tapX, tapY);
      setTapResult(res);
      if (res.quota) updateQuota(res.quota);

      if (res.status === 'identified' && res.label && user.voice_mode === 'auto' && user.speaker_enabled) {
        void speakText(res.label, user.output_language, true);
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setStatusBanner(err.message);
      }
    } finally {
      setScanning(false);
    }
  };

  /**
   * When an object isn't recognized and the user taps "Yes, Ask Lensy",
   * automatically grab the current/tapped frame and hand it straight to Lensy Vision!
   */
  const handleAskLensyCapturedFrame = async () => {
    if (!user) return;
    if (user.plan_tier === 'lite') {
      openUpgradeModal('Ask Lensy visual identification is available on VisionLens Plus.', false);
      return;
    }

    let blobToSend = lastFrameBlobRef.current;
    if (!blobToSend && videoRef.current && (cameraState === 'streaming' || cameraState === 'frozen')) {
      try {
        blobToSend = await captureResizedBlob(videoRef.current);
        lastFrameBlobRef.current = blobToSend;
      } catch {
        blobToSend = null;
      }
    }

    if (!blobToSend) {
      setStatusBanner('No image frame available yet. Capture or upload a photo first.');
      return;
    }

    setTapResult(null);
    onAskLensyWithImage(
      blobToSend,
      'Please identify and explain the main object in this captured photo.'
    );
  };

  const handlePageChange = async (nextPage: number) => {
    if (!lastFrameBlobRef.current) return;
    await runFrameScan(lastFrameBlobRef.current, nextPage);
  };

  const handleTextAction = async (action: 'translate_full' | 'summarize') => {
    if (!frameResult?.full_source_text) return;
    setActionLoading(action);
    try {
      const res = await api.textAction(action, frameResult.full_source_text);
      setActionOutput({
        title: action === 'summarize' ? 'Summary' : 'Full Translation',
        text: res.result_text,
        direction: res.direction,
      });
      if (user && user.voice_mode === 'auto' && user.speaker_enabled) {
        void speakText(res.result_text, res.output_language, true);
      }
    } catch (err) {
      if (err instanceof ApiClientError) setStatusBanner(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMoreInfo = async (
    contextType: 'text' | 'object',
    sourceText: string,
    translatedText: string,
    detectedLang = 'unknown'
  ) => {
    if (!user) return;
    if (user.plan_tier === 'lite') {
      openUpgradeModal('More Info with Lensy AI is available on VisionLens Plus.', false);
      return;
    }
    setActionLoading('more_info');
    try {
      const res = await api.moreInfoHandoff({
        context_type: contextType,
        source_text: sourceText,
        translated_text: translatedText,
        detected_lang: detectedLang,
      });
      onOpenLensySession(res.session_id);
    } catch (err) {
      if (err instanceof ApiClientError) setStatusBanner(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleSpeaker = async () => {
    if (!user) return;
    const next = !user.speaker_enabled;
    if (!next) stopSpeaking();
    try {
      const updated = await api.updateSettings({ speaker_enabled: next });
      setUserProfile(updated);
    } catch {
      // Ignore transient toggle error
    }
  };

  const quotaRemainingSec = user
    ? Math.max(0, user.quota.limit_seconds - user.quota.used_seconds)
    : 600;
  const quotaMins = Math.floor(quotaRemainingSec / 60);
  const quotaSecs = quotaRemainingSec % 60;

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#04070a]">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        capture="environment"
        onChange={handleUploadImage}
        className="hidden"
      />

      {/* Compact Top Overlay Header */}
      <header className="pointer-events-auto absolute inset-x-0 top-0 z-30 flex items-center justify-between bg-gradient-to-b from-black/85 via-black/45 to-transparent px-3.5 pb-5 pt-[max(0.65rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-400/50 bg-zinc-950 p-0.5 shadow-[0_0_14px_rgba(16,185,129,0.4)]">
            <img
              src="/lensy-logo.png"
              alt="Vision Lens"
              className="h-full w-full rounded-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-[13px] font-extrabold leading-tight tracking-tight text-white">
              Vision Lens
            </h1>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span
                className={`font-semibold uppercase tracking-wider ${
                  user?.plan_tier === 'plus' ? 'text-emerald-300' : 'text-zinc-400'
                }`}
              >
                {user?.plan_tier === 'plus' ? 'Plus' : 'Lite'}
              </span>
              {user?.plan_tier === 'lite' && (
                <span className="rounded bg-white/10 px-1.5 font-mono text-[10px] text-emerald-300">
                  {String(quotaMins).padStart(2, '0')}:{String(quotaSecs).padStart(2, '0')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="rounded-full border border-emerald-400/35 bg-zinc-950/75 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 backdrop-blur-md">
            {LANG_LABELS[user?.output_language || 'en']}
          </span>
          <button
            type="button"
            onClick={handleToggleSpeaker}
            aria-label={user?.speaker_enabled ? 'Mute speaker' : 'Enable speaker'}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-zinc-950/75 text-zinc-200 backdrop-blur-md transition hover:border-emerald-400/50"
          >
            {user?.speaker_enabled ? (
              <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <VolumeX className="h-3.5 w-3.5 text-zinc-500" />
            )}
          </button>
        </div>
      </header>

      {/* Main Live Camera / Uploaded Photo Viewport (Tap anywhere to identify object) */}
      <div
        onClick={handleViewportTap}
        className="relative flex min-h-0 flex-1 cursor-crosshair items-center justify-center overflow-hidden bg-zinc-950"
      >
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`h-full w-full object-cover ${uploadedPreviewUrl ? 'hidden' : 'block'}`}
        />

        {uploadedPreviewUrl && (
          <img
            src={uploadedPreviewUrl}
            alt="Captured scene"
            className="h-full w-full bg-black object-contain"
          />
        )}

        {/* Subtle Corner Reticle Guides */}
        {(cameraState === 'streaming' || cameraState === 'frozen') && (
          <div className="pointer-events-none absolute inset-5 sm:inset-8">
            <span className="absolute left-0 top-10 h-5 w-5 rounded-tl-xl border-l-2 border-t-2 border-emerald-400/50" />
            <span className="absolute right-0 top-10 h-5 w-5 rounded-tr-xl border-r-2 border-t-2 border-emerald-400/50" />
            <span className="absolute bottom-10 left-0 h-5 w-5 rounded-bl-xl border-b-2 border-l-2 border-emerald-400/50" />
            <span className="absolute bottom-10 right-0 h-5 w-5 rounded-br-xl border-b-2 border-r-2 border-emerald-400/50" />
          </div>
        )}

        {/* Tap Target Ripple */}
        <AnimatePresence>
          {tapRipple && (
            <motion.div
              initial={{ scale: 0.4, opacity: 1 }}
              animate={{ scale: 2.3, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              style={{ left: `${tapRipple.x}%`, top: `${tapRipple.y}%` }}
              className="pointer-events-none absolute z-20 -ml-6 -mt-6 h-12 w-12 rounded-full border-2 border-emerald-400 shadow-[0_0_18px_#34d399]"
            />
          )}
        </AnimatePresence>

        {/* Detected Object Bounding Box */}
        {tapResult?.status === 'identified' && tapResult.bbox && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              left: `${tapResult.bbox[0] * 100}%`,
              top: `${tapResult.bbox[1] * 100}%`,
              width: `${tapResult.bbox[2] * 100}%`,
              height: `${tapResult.bbox[3] * 100}%`,
            }}
            className="pointer-events-none absolute z-20 rounded-2xl border-2 border-emerald-400 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.45)]"
          />
        )}

        {/* Camera Initializing State */}
        {cameraState === 'initializing' && !uploadedPreviewUrl && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#04070a]/90">
            <GreenLoader scale={0.5} label="Starting camera..." />
          </div>
        )}

        {/* Camera Recovery / Upload Card */}
        {(cameraState === 'permission_denied' || cameraState === 'camera_unavailable') &&
          !uploadedPreviewUrl && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="glass-card relative z-20 mx-4 max-w-xs rounded-3xl border border-emerald-500/30 p-5 text-center"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
                <CameraOff className="h-6 w-6" />
              </div>
              <h2 className="mt-3 text-sm font-bold text-white">
                {cameraState === 'permission_denied'
                  ? 'Camera Permission Needed'
                  : 'No Live Camera Detected'}
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                {cameraState === 'permission_denied'
                  ? 'Allow camera access for live scanning, or upload any photo below.'
                  : 'Choose a photo from your device for instant translation, object identification, and Lensy AI.'}
              </p>

              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-2.5 text-xs font-bold text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.35)] transition hover:brightness-110"
                >
                  <ImagePlus className="h-4 w-4" />
                  Capture / Upload Photo
                </button>
                <button
                  type="button"
                  onClick={() => void startCamera()}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry Camera
                </button>
              </div>
            </div>
          )}

        {/* Active Scanning Indicator (Clean — Zero Technical Details) */}
        <AnimatePresence>
          {scanning && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="pointer-events-none absolute top-16 z-30 flex items-center gap-2 rounded-full border border-emerald-400/40 bg-zinc-950/90 px-3.5 py-1 shadow-[0_0_20px_rgba(16,185,129,0.35)] backdrop-blur-md"
            >
              <GreenLoader scale={0.2} />
              <span className="text-xs font-semibold text-emerald-200">Scanning...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status / Error Banner */}
        <AnimatePresence>
          {statusBanner && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-16 z-30 mx-4 flex max-w-sm items-center gap-2 rounded-2xl border border-rose-500/35 bg-zinc-950/92 px-3.5 py-2 text-xs text-rose-200 backdrop-blur-md"
            >
              <span className="flex-1">{statusBanner}</span>
              <button type="button" onClick={() => setStatusBanner('')}>
                <X className="h-3.5 w-3.5 text-zinc-400" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tap-to-Identify Result Card (ZERO Model Names + Ask Lensy Option when Unrecognized) */}
        <AnimatePresence>
          {tapResult && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card absolute inset-x-3 top-[4.5rem] z-30 mx-auto max-w-sm rounded-3xl border border-emerald-400/40 p-3.5 shadow-2xl"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Crosshair className="h-4 w-4 text-emerald-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                    {tapResult.status === 'identified' ? 'Object Identified' : 'Not Recognized'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setTapResult(null)}
                  className="rounded-full p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {tapResult.status === 'identified' && tapResult.label ? (
                <div className="mt-2">
                  <div className="flex items-center justify-between gap-2">
                    <TextGenerateEffect
                      words={tapResult.label}
                      dir={tapResult.direction}
                      lang={user?.output_language}
                      className="text-base font-bold text-white"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        user && void speakText(tapResult.label || '', user.output_language, true)
                      }
                      className="rounded-xl border border-emerald-400/30 bg-emerald-500/15 p-1.5 text-emerald-300 hover:bg-emerald-500/25"
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                  </div>

                  {tapResult.categories.length > 0 && (
                    <div
                      dir={tapResult.direction}
                      className="mt-1.5 flex flex-wrap items-center gap-1.5"
                    >
                      {tapResult.categories.map((cat) => (
                        <span
                          key={cat}
                          className="rounded-full border border-white/12 bg-white/8 px-2.5 py-0.5 text-[11px] text-zinc-200"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={actionLoading === 'more_info'}
                    onClick={() =>
                      void handleMoreInfo(
                        'object',
                        tapResult.raw_class || tapResult.label || '',
                        tapResult.label || '',
                        user?.output_language || 'en'
                      )
                    }
                    className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/18 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/28"
                  >
                    {user?.plan_tier === 'lite' ? (
                      <Lock className="h-3.5 w-3.5" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {actionLoading === 'more_info' ? 'Opening Lensy...' : 'More Info with Lensy'}
                  </button>
                </div>
              ) : (
                /* Unrecognized Object -> Offer "Ask Lensy?" instant frame capture & auto-send */
                <div className="mt-2 space-y-2.5">
                  <p className="text-xs leading-relaxed text-zinc-300">
                    Couldn&apos;t clearly identify this object. Would you like to ask{' '}
                    <strong className="text-emerald-300">Lensy AI</strong>?
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => void handleAskLensyCapturedFrame()}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-3 py-2 text-xs font-bold text-zinc-950 shadow-[0_0_16px_rgba(16,185,129,0.35)] transition hover:brightness-110"
                    >
                      {user?.plan_tier === 'lite' ? (
                        <Lock className="h-3.5 w-3.5" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      Yes, Ask Lensy
                    </button>
                    <button
                      type="button"
                      onClick={() => setTapResult(null)}
                      className="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-white/10"
                    >
                      No Thanks
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Layered Stack Card Deck + Pagination */}
        <StackOverlay
          result={frameResult}
          planTier={user?.plan_tier || 'lite'}
          outputLanguage={user?.output_language || 'en'}
          actionLoading={actionLoading}
          actionOutput={actionOutput}
          onPageChange={(p) => void handlePageChange(p)}
          onSpeak={(text) => user && void speakText(text, user.output_language, true)}
          onTextAction={(act) => void handleTextAction(act)}
          onMoreInfo={(src, trans, lang) => void handleMoreInfo('text', src, trans, lang)}
          onDismiss={() => {
            setFrameResult(null);
            setActionOutput(null);
          }}
        />

        {/* Compact Right-Edge Floating Camera Controls */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-2.5 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-2"
        >
          <button
            type="button"
            onClick={() => void handleManualScan()}
            disabled={scanning}
            title="Scan Text"
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-emerald-300 bg-emerald-500 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.6)] transition active:scale-95 disabled:opacity-60"
          >
            <ScanText className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setAutoScan((p) => !p)}
            disabled={cameraState !== 'streaming'}
            title="Auto-Scan"
            className={`flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md transition disabled:opacity-35 ${
              autoScan
                ? 'border-emerald-400 bg-emerald-500/25 text-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.5)]'
                : 'border-white/15 bg-zinc-950/75 text-zinc-300'
            }`}
          >
            <Radio className={`h-4 w-4 ${autoScan ? 'animate-pulse' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleToggleFreeze}
            disabled={
              Boolean(uploadedPreviewUrl) ||
              (cameraState !== 'streaming' && cameraState !== 'frozen')
            }
            title={cameraState === 'frozen' ? 'Resume Camera' : 'Freeze Frame'}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-zinc-950/75 text-zinc-200 backdrop-blur-md transition hover:border-emerald-400/50 disabled:opacity-35"
          >
            {cameraState === 'frozen' ? (
              <Play className="h-4 w-4 text-emerald-400" />
            ) : (
              <Pause className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Upload Photo"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-zinc-950/75 text-zinc-200 backdrop-blur-md transition hover:border-emerald-400/50"
          >
            <ImagePlus className="h-4 w-4" />
          </button>

          {uploadedPreviewUrl && (
            <button
              type="button"
              onClick={() => void startCamera()}
              title="Back to Live Camera"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/20 text-emerald-300 backdrop-blur-md"
            >
              <Camera className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setSaveToHistory((p) => !p)}
            title="Save Scans to History"
            className={`flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md transition ${
              saveToHistory
                ? 'border-emerald-400 bg-emerald-500/25 text-emerald-300'
                : 'border-white/15 bg-zinc-950/75 text-zinc-400'
            }`}
          >
            <Bookmark className="h-4 w-4" />
          </button>
        </div>

        {/* Clean Bottom Tap Hint Pill (Never Overlaps BottomNav) */}
        {!frameResult && !tapResult && (cameraState === 'streaming' || uploadedPreviewUrl) && (
          <div className="pointer-events-none absolute bottom-3 z-20 rounded-full border border-white/10 bg-zinc-950/72 px-3.5 py-1 text-[11px] font-medium text-zinc-300 backdrop-blur-md">
            Tap any object to identify • Tap Scan to translate
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeCameraPage;
