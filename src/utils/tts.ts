/**
 * Multi-locale Voice TTS controller:
 * 1. Primary: Browser Web Speech API (`speechSynthesis`) when matching locale voice exists
 * 2. Fallback: VisionLens backend `/api/v1/vision/tts` (`edge-tts` MP3 stream)
 */

import { api, OutputLanguage } from '../api/client';

const LOCALE_MAP: Record<OutputLanguage, string[]> = {
  en: ['en-US', 'en-GB', 'en'],
  ur: ['ur-PK', 'ur-IN', 'ur'],
  ar: ['ar-SA', 'ar-EG', 'ar'],
  tr: ['tr-TR', 'tr'],
  zh: ['zh-CN', 'zh-TW', 'zh'],
};

let activeAudio: HTMLAudioElement | null = null;
let activeObjectUrl: string | null = null;

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore synthesis cancel errors
    }
  }
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = null;
  }
}

function findBrowserVoice(lang: OutputLanguage): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const targets = LOCALE_MAP[lang] || ['en-US'];

  for (const prefix of targets) {
    const exact = voices.find((v) => v.lang.toLowerCase() === prefix.toLowerCase());
    if (exact) return exact;
    const partial = voices.find((v) =>
      v.lang.toLowerCase().startsWith(prefix.toLowerCase().split('-')[0])
    );
    if (partial) return partial;
  }
  return null;
}

export async function speakText(
  text: string,
  language: OutputLanguage,
  speakerEnabled = true
): Promise<void> {
  const cleaned = (text || '').trim();
  if (!cleaned || !speakerEnabled) return;

  stopSpeaking();

  // Prefer native browser voice if an exact locale voice is installed
  const voice = findBrowserVoice(language);
  if (voice && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      const utter = new SpeechSynthesisUtterance(cleaned);
      utter.voice = voice;
      utter.lang = voice.lang;
      utter.rate = 0.98;
      window.speechSynthesis.speak(utter);
      return;
    } catch {
      // Fall through to backend edge-tts
    }
  }

  // Server-side edge-tts MP3 fallback (especially valuable for Urdu/Arabic/Turkish/Chinese)
  try {
    const mp3Blob = await api.synthesizeTts(cleaned.slice(0, 1500), language);
    const url = URL.createObjectURL(mp3Blob);
    activeObjectUrl = url;
    const audio = new Audio(url);
    activeAudio = audio;
    audio.onended = () => {
      if (activeObjectUrl === url) {
        URL.revokeObjectURL(url);
        activeObjectUrl = null;
      }
    };
    await audio.play();
  } catch {
    // Silent graceful fallback if audio autoplay blocked or offline
  }
}
