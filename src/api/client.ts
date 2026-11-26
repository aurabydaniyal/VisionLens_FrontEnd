/**
 * Thin-client API wrapper for VisionLens V1 FastAPI backend.
 * Handles 5-day JWT attachment, 401 session expiration, 403 Plus-lock & 429 Lite Quota interceptors.
 */

export type PlanTier = 'lite' | 'plus';
export type OutputLanguage = 'en' | 'ur' | 'ar' | 'tr' | 'zh';
export type VoiceMode = 'off' | 'tap' | 'auto';
export type TextDirection = 'ltr' | 'rtl';

export interface QuotaInfo {
  used_seconds: number;
  limit_seconds: number;
  unlimited: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  country: string;
  gender: string;
  plan_tier: PlanTier;
  output_language: OutputLanguage;
  voice_mode: VoiceMode;
  speaker_enabled: boolean;
  quota: QuotaInfo;
  retention_days: number;
}

export interface VisionTextItem {
  id: string;
  bbox: [number, number, number, number];
  source_text: string;
  detected_lang: string;
  detected_lang_name: string;
  confidence: number;
  alternatives: { lang: string; score: number }[];
  translated_text: string;
  direction: TextDirection;
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface FrameProcessResponse {
  cache_hit: boolean;
  output_language: OutputLanguage;
  direction: TextDirection;
  is_long_text: boolean;
  full_source_text: string;
  full_translated_text: string;
  notice?: string | null;
  pagination: PaginationMeta;
  items: VisionTextItem[];
  actions_available: string[];
  quota: QuotaInfo;
}

export interface TapIdentifyResponse {
  status: 'identified' | 'uncertain';
  source_engine: string;
  label?: string | null;
  raw_class?: string | null;
  categories: string[];
  confidence?: number | null;
  bbox?: [number, number, number, number] | null;
  message?: string | null;
  direction: TextDirection;
  more_info_available: boolean;
  upgrade_required: boolean;
  quota?: QuotaInfo | null;
}

export interface HistoryItem {
  id: string;
  item_type: string;
  source_text?: string | null;
  translated_text: string;
  detected_lang?: string | null;
  target_lang: string;
  created_at: string;
  expires_at: string;
}

export interface DocumentOut {
  id: number;
  filename: string;
  file_type: string;
  chunk_count: number;
  created_at: string;
  expires_at?: string | null;
}

export interface ChatSessionOut {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface ChatMessageOut {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachment_meta?: Record<string, unknown> | null;
  created_at: string;
}

export interface MoreInfoHandoffResponse {
  session_id: string;
  user_message: ChatMessageOut;
  assistant_message: ChatMessageOut;
  direction: TextDirection;
  sources: string[];
}

export class ApiClientError extends Error {
  status: number;
  code: string;
  upgradeRequired: boolean;
  retryAfter?: number;

  constructor(
    status: number,
    detail: string,
    code = 'API_ERROR',
    upgradeRequired = false,
    retryAfter?: number
  ) {
    super(detail);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.upgradeRequired = upgradeRequired;
    this.retryAfter = retryAfter;
  }
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:7860').replace(/\/+$/, '');
const TOKEN_KEY = 'visionlens_jwt_token';

type InterceptorListeners = {
  onUnauthorized?: () => void;
  onUpgradeRequired?: (detail: string, code: string) => void;
  onQuotaExceeded?: (detail: string, retryAfter?: number) => void;
};

let listeners: InterceptorListeners = {};

export function registerApiInterceptors(next: InterceptorListeners): void {
  listeners = { ...listeners, ...next };
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage restriction errors in private browsing
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { skipAuth?: boolean; expectBlob?: boolean } = {}
): Promise<T> {
  const { skipAuth, expectBlob, headers: rawHeaders, ...rest } = options;
  const headers = new Headers(rawHeaders || {});

  if (!skipAuth) {
    const token = getStoredToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  if (rest.body && !(rest.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers,
    });
  } catch {
    throw new ApiClientError(
      0,
      'Unable to reach VisionLens server. Please check your connection.',
      'NETWORK_ERROR'
    );
  }

  if (!response.ok) {
    let detail = 'Request failed. Please try again.';
    let code = 'API_ERROR';
    let upgradeRequired = false;
    try {
      const errBody = await response.json();
      if (typeof errBody?.detail === 'string') detail = errBody.detail;
      if (typeof errBody?.code === 'string') code = errBody.code;
      if (typeof errBody?.upgrade_required === 'boolean') upgradeRequired = errBody.upgrade_required;
    } catch {
      // Non-JSON error body
    }

    const retryHeader = response.headers.get('Retry-After');
    const retryAfter = retryHeader ? Number.parseInt(retryHeader, 10) : undefined;

    if (response.status === 401 && !skipAuth) {
      setStoredToken(null);
      listeners.onUnauthorized?.();
    } else if (response.status === 403 && upgradeRequired) {
      listeners.onUpgradeRequired?.(detail, code);
    } else if (response.status === 429 && code === 'LITE_QUOTA_EXCEEDED') {
      listeners.onQuotaExceeded?.(detail, retryAfter);
    }

    throw new ApiClientError(response.status, detail, code, upgradeRequired, retryAfter);
  }

  if (expectBlob) {
    return (await response.blob()) as unknown as T;
  }

  return (await response.json()) as T;
}

export const api = {
  // --- Auth ---
  register: (payload: { country: string; gender: string; username: string; email: string }) =>
    request<{ message: string; email: string }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
    }),

  requestOtp: (email: string) =>
    request<{ message: string; expires_in_seconds: number; dev_otp: string | null }>(
      '/api/v1/auth/login/request-otp',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
        skipAuth: true,
      }
    ),

  verifyOtp: (email: string, otp: string) =>
    request<{ access_token: string; token_type: string; expires_in_days: number; user: UserProfile }>(
      '/api/v1/auth/login/verify-otp',
      {
        method: 'POST',
        body: JSON.stringify({ email, otp }),
        skipAuth: true,
      }
    ),

  getMe: () => request<UserProfile>('/api/v1/auth/me'),

  logout: () => request<{ message: string }>('/api/v1/auth/logout', { method: 'POST' }),

  // --- User Settings & Subscription ---
  updateSettings: (payload: {
    output_language?: OutputLanguage;
    voice_mode?: VoiceMode;
    speaker_enabled?: boolean;
  }) =>
    request<UserProfile>('/api/v1/user/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  upgradePlus: (secret_code: string) =>
    request<UserProfile>('/api/v1/user/upgrade-plus', {
      method: 'POST',
      body: JSON.stringify({ secret_code }),
    }),

  downgradeLite: () =>
    request<UserProfile>('/api/v1/user/downgrade-lite', { method: 'POST' }),

  getHistory: () =>
    request<{ items: HistoryItem[]; retention_days: number }>('/api/v1/user/history'),

  deleteAccount: () =>
    request<{ message: string }>('/api/v1/user/account', { method: 'DELETE' }),

  // --- Vision & Voice ---
  processFrame: (file: Blob, page = 1, pageSize = 3, saveToHistory = false) => {
    const form = new FormData();
    form.append('file', file, 'frame.jpg');
    form.append('page', String(page));
    form.append('page_size', String(pageSize));
    form.append('save_to_history', String(saveToHistory));
    return request<FrameProcessResponse>('/api/v1/vision/process-frame', {
      method: 'POST',
      body: form,
    });
  },

  tapIdentify: (file: Blob, tapX: number, tapY: number) => {
    const form = new FormData();
    form.append('file', file, 'tap.jpg');
    form.append('tap_x', String(tapX));
    form.append('tap_y', String(tapY));
    return request<TapIdentifyResponse>('/api/v1/vision/tap-identify', {
      method: 'POST',
      body: form,
    });
  },

  textAction: (action: 'translate_full' | 'summarize', text: string) =>
    request<{
      action: 'translate_full' | 'summarize';
      result_text: string;
      output_language: OutputLanguage;
      direction: TextDirection;
    }>('/api/v1/vision/text-action', {
      method: 'POST',
      body: JSON.stringify({ action, text }),
    }),

  synthesizeTts: (text: string, language: OutputLanguage) =>
    request<Blob>('/api/v1/vision/tts', {
      method: 'POST',
      body: JSON.stringify({ text, language }),
      expectBlob: true,
    }),

  // --- Lensy AI & RAG (Plus Only) ---
  moreInfoHandoff: (payload: {
    context_type: 'text' | 'object';
    source_text: string;
    translated_text?: string;
    detected_lang?: string;
    session_id?: string;
  }) =>
    request<MoreInfoHandoffResponse>('/api/v1/lensy/more-info-handoff', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  uploadDocument: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<DocumentOut>('/api/v1/lensy/documents/upload', {
      method: 'POST',
      body: form,
    });
  },

  listDocuments: () =>
    request<{ documents: DocumentOut[]; max_documents: number }>('/api/v1/lensy/documents'),

  deleteDocument: (docId: number) =>
    request<{ message: string }>(`/api/v1/lensy/documents/${docId}`, { method: 'DELETE' }),

  listSessions: () => request<{ sessions: ChatSessionOut[] }>('/api/v1/lensy/sessions'),

  getSessionMessages: (sessionId: string) =>
    request<{ session: ChatSessionOut; messages: ChatMessageOut[]; direction: TextDirection }>(
      `/api/v1/lensy/sessions/${sessionId}/messages`
    ),

  deleteSession: (sessionId: string) =>
    request<{ message: string }>(`/api/v1/lensy/sessions/${sessionId}`, { method: 'DELETE' }),

  lensyChat: (message: string, sessionId?: string | null, image?: File | Blob | null) => {
    const form = new FormData();
    form.append('message', message);
    if (sessionId) form.append('session_id', sessionId);
    if (image) {
      const filename = image instanceof File ? image.name : 'capture.jpg';
      form.append('image', image, filename);
    }
    return request<{
      session_id: string;
      reply: string;
      direction: TextDirection;
      sources: string[];
    }>('/api/v1/lensy/chat', {
      method: 'POST',
      body: form,
    });
  },
};
