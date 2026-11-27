import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Camera,
  FileText,
  Menu,
  MessageSquare,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import {
  api,
  ApiClientError,
  ChatMessageOut,
  ChatSessionOut,
  DocumentOut,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { speakText } from '../utils/tts';
import GreenLoader from '../components/GreenLoader';
import TextGenerateEffect from '../components/TextGenerateEffect';

export interface LensyImageHandoff {
  blob: Blob;
  previewUrl: string;
  prompt: string;
}

interface LensyChatPageProps {
  initialSessionId?: string | null;
  onConsumeInitialSession?: () => void;
  initialImageHandoff?: LensyImageHandoff | null;
  onConsumeImageHandoff?: () => void;
}

const SUGGESTION_CHIPS = [
  'Who created Vision Lens?',
  'Compare Lite and Plus plans',
  'How does Vision Lens protect privacy?',
  'Summarize my uploaded documents',
];

export const LensyChatPage: React.FC<LensyChatPageProps> = ({
  initialSessionId,
  onConsumeInitialSession,
  initialImageHandoff,
  onConsumeImageHandoff,
}) => {
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSessionOut[]>([]);
  const [documents, setDocuments] = useState<DocumentOut[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageOut[]>([]);
  const [newestAssistantId, setNewestAssistantId] = useState<string | null>(null);

  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState<File | Blob | null>(null);
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [notice, setNotice] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handoffConsumedRef = useRef<boolean>(false);

  const outputLang = user?.output_language || 'en';
  const dir: 'ltr' | 'rtl' = outputLang === 'ur' || outputLang === 'ar' ? 'rtl' : 'ltr';
  const langClass = outputLang === 'ur' ? 'lang-ur' : outputLang === 'ar' ? 'lang-ar' : '';

  const loadSidebarData = useCallback(async () => {
    try {
      const [sessRes, docRes] = await Promise.all([api.listSessions(), api.listDocuments()]);
      setSessions(sessRes.sessions);
      setDocuments(docRes.documents);
    } catch {
      // Handled globally
    }
  }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    try {
      const res = await api.getSessionMessages(sessionId);
      setActiveSessionId(res.session.id);
      setMessages(res.messages);
      setNewestAssistantId(null);
      setDrawerOpen(false);
    } catch (err) {
      if (err instanceof ApiClientError) setNotice(err.message);
    }
  }, []);

  useEffect(() => {
    void loadSidebarData();
  }, [loadSidebarData]);

  useEffect(() => {
    if (initialSessionId) {
      void loadSession(initialSessionId);
      onConsumeInitialSession?.();
    }
  }, [initialSessionId, loadSession, onConsumeInitialSession]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const clearImageAttachment = useCallback(() => {
    setAttachedImage(null);
    setAttachedPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const sendMessageInternal = useCallback(
    async (
      textValue: string,
      imageOverride?: File | Blob | null,
      previewOverride?: string | null,
      sessionOverride?: string | null
    ) => {
      const img = imageOverride !== undefined ? imageOverride : attachedImage;
      const previewUrl = previewOverride !== undefined ? previewOverride : attachedPreview;
      const text = textValue.trim();
      if ((!text && !img) || sending) return;

      const finalMessage = text || 'Describe and explain this photo for me.';
      const tempUserId = `temp-u-${Date.now()}`;
      const optimisticMsg: ChatMessageOut = {
        id: tempUserId,
        role: 'user',
        content: finalMessage,
        attachment_meta: img
          ? { image_attached: true, local_preview: previewUrl || undefined }
          : null,
        created_at: new Date().toISOString(),
      };

      const targetSession = sessionOverride !== undefined ? sessionOverride : activeSessionId;
      setMessages((prev) => [...prev, optimisticMsg]);
      setInput('');
      setAttachedImage(null);
      setAttachedPreview(null);
      setSending(true);
      setNotice('');

      try {
        const res = await api.lensyChat(finalMessage, targetSession, img);
        const replyId = `ast-${Date.now()}`;
        setActiveSessionId(res.session_id);
        setNewestAssistantId(replyId);
        setMessages((prev) => [
          ...prev,
          {
            id: replyId,
            role: 'assistant',
            content: res.reply,
            attachment_meta: { sources: res.sources },
            created_at: new Date().toISOString(),
          },
        ]);
        void loadSidebarData();

        if (user && user.voice_mode === 'auto' && user.speaker_enabled) {
          void speakText(res.reply, outputLang, true);
        }
      } catch (err) {
        setNotice(err instanceof ApiClientError ? err.message : 'Lensy AI is temporarily busy.');
      } finally {
        setSending(false);
      }
    },
    [activeSessionId, attachedImage, attachedPreview, loadSidebarData, outputLang, sending, user]
  );

  // Automatic photo handoff from Home ("Yes, Ask Lensy") — attaches & sends immediately!
  useEffect(() => {
    if (!initialImageHandoff || handoffConsumedRef.current) return;
    handoffConsumedRef.current = true;
    const { blob, previewUrl, prompt } = initialImageHandoff;
    onConsumeImageHandoff?.();
    setActiveSessionId(null);
    setMessages([]);
    void sendMessageInternal(prompt, blob, previewUrl, null).finally(() => {
      handoffConsumedRef.current = false;
    });
  }, [initialImageHandoff, onConsumeImageHandoff, sendMessageInternal]);

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const lower = file.name.toLowerCase();
    const isDoc = lower.endsWith('.pdf') || lower.endsWith('.docx');

    if (isDoc) {
      setUploadingDoc(true);
      setNotice('');
      try {
        const uploaded = await api.uploadDocument(file);
        setDocuments((prev) => [uploaded, ...prev]);
        setNotice(`"${uploaded.filename}" is ready — ask Lensy anything about it.`);
      } catch (err) {
        setNotice(err instanceof ApiClientError ? err.message : 'Document upload failed.');
      } finally {
        setUploadingDoc(false);
      }
      return;
    }

    clearImageAttachment();
    setAttachedImage(file);
    setAttachedPreview(URL.createObjectURL(file));
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setNewestAssistantId(null);
    setDrawerOpen(false);
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSessionId === id) {
        handleNewChat();
      }
    } catch {
      // Ignore
    }
  };

  const handleDeleteDoc = async (docId: number) => {
    try {
      await api.deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch {
      // Ignore
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#04070a]">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileAttach}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.jpg,.jpeg,.png,.webp,image/*"
        onChange={handleFileAttach}
        className="hidden"
      />

      {/* Compact Top Header */}
      <header className="z-20 flex shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#05090d]/95 px-3.5 pb-2.5 pt-[max(0.65rem,env(safe-area-inset-top))] backdrop-blur-md">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open chats and documents"
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition hover:border-emerald-400/40 hover:text-white"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          <img
            src="/lensy-logo.png"
            alt="Lensy AI"
            className="h-6 w-6 rounded-full border border-emerald-400/50 object-cover shadow-[0_0_10px_rgba(16,185,129,0.45)]"
          />
          <span className="text-sm font-bold tracking-tight text-white">Lensy AI</span>
        </div>

        <button
          type="button"
          onClick={handleNewChat}
          aria-label="New chat"
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/15 text-emerald-300 transition hover:bg-emerald-500/25"
        >
          <Plus className="h-4 w-4" />
        </button>
      </header>

      {/* Slide-Over Workspace Drawer (Clean — Zero Technical Jargon) */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          >
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
              className="flex h-full w-[82%] max-w-xs flex-col border-r border-white/10 bg-[#070c11] p-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/8 pb-3">
                <div className="flex items-center gap-2">
                  <img src="/lensy-logo.png" alt="Lensy" className="h-6 w-6 rounded-full" />
                  <span className="text-sm font-bold text-white">Lensy</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleNewChat}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-2 text-xs font-bold text-zinc-950"
              >
                <Plus className="h-4 w-4" />
                New Chat
              </button>

              <div className="mt-4 flex-1 space-y-5 overflow-y-auto">
                <div>
                  <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    Recent Chats ({sessions.length})
                  </h3>
                  {sessions.length === 0 ? (
                    <p className="text-xs text-zinc-500">No recent chats yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {sessions.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => void loadSession(s.id)}
                          className={`group flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-xs transition ${
                            activeSessionId === s.id
                              ? 'border border-emerald-400/35 bg-emerald-500/15 text-emerald-200'
                              : 'border border-transparent bg-white/[0.03] text-zinc-300 hover:bg-white/8'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <MessageSquare className="h-3.5 w-3.5 shrink-0 text-emerald-400/75" />
                            <span className="truncate">{s.title}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => void handleDeleteSession(s.id, e)}
                            className="ml-2 text-zinc-500 opacity-70 hover:text-rose-400 group-hover:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      My Documents ({documents.length}/10)
                    </h3>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[11px] font-semibold text-emerald-400 hover:underline"
                    >
                      + Add File
                    </button>
                  </div>
                  {documents.length === 0 ? (
                    <p className="text-xs text-zinc-500">
                      Upload PDF or Word files to ask Lensy questions directly.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-zinc-300"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                            <span className="truncate font-medium">{doc.filename}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleDeleteDoc(doc.id)}
                            className="ml-2 text-zinc-500 hover:text-rose-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inner Conversation Area — ONLY messages scroll when thread grows; welcome fits 1 screen */}
      <main
        className={`min-h-0 flex-1 px-3.5 ${
          messages.length === 0
            ? 'flex items-center justify-center overflow-hidden'
            : 'vl-scroll-mask overflow-y-auto py-3'
        }`}
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
          {notice && (
            <div className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice('')}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {messages.length === 0 ? (
            /* Viewport-Fitted Non-Scrollable Welcome Hero (adapts to every phone size) */
            <div className="flex flex-col items-center justify-center text-center">
              <div className="relative flex h-16 w-16 items-center justify-center sm:h-20 sm:w-20">
                <span className="vl-signal-ring pointer-events-none absolute inset-0 rounded-full border border-emerald-400/55" />
                <span
                  className="vl-signal-ring pointer-events-none absolute inset-0 rounded-full border border-emerald-400/35"
                  style={{ animationDelay: '1.2s' }}
                />
                <img
                  src="/lensy-logo.png"
                  alt="Lensy AI"
                  className="relative z-10 h-14 w-14 rounded-full border-2 border-emerald-400/70 object-cover shadow-[0_0_20px_rgba(16,185,129,0.45)] sm:h-16 sm:w-16"
                />
              </div>

              <h2 className="mt-3 bg-gradient-to-r from-white via-emerald-200 to-emerald-400 bg-clip-text text-xl font-extrabold text-transparent sm:text-2xl">
                Hello, {user?.username || 'Explorer'}
              </h2>
              <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-zinc-400 sm:text-xs">
                Ask <strong className="text-emerald-300">Lensy AI</strong> anything — snap a photo, upload a PDF/Word file, or start a conversation.
              </p>

              <div className="mt-4 grid w-full grid-cols-2 gap-2">
                {SUGGESTION_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => void sendMessageInternal(chip)}
                    className="flex items-start gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left text-[11px] leading-snug text-zinc-200 transition hover:border-emerald-400/40 hover:bg-emerald-500/10"
                  >
                    <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
                    <span>{chip}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              const sources = Array.isArray(msg.attachment_meta?.sources)
                ? (msg.attachment_meta?.sources as string[])
                : [];
              const localPreview =
                typeof msg.attachment_meta?.local_preview === 'string'
                  ? msg.attachment_meta.local_preview
                  : null;
              const hadImage = Boolean(msg.attachment_meta?.image_attached);
              const animateWords = !isUser && msg.id === newestAssistantId;

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-start gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <img
                      src="/lensy-logo.png"
                      alt="Lensy AI"
                      className="mt-1 h-6 w-6 shrink-0 rounded-full border border-emerald-400/50 object-cover"
                    />
                  )}

                  <div
                    dir={isUser ? 'auto' : dir}
                    className={`max-w-[84%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      isUser
                        ? 'rounded-tr-sm border border-emerald-400/35 bg-gradient-to-br from-emerald-500/22 to-teal-600/18 text-white'
                        : `rounded-tl-sm border border-white/10 bg-zinc-900/85 text-zinc-100 ${langClass}`
                    }`}
                  >
                    {isUser && localPreview && (
                      <img
                        src={localPreview}
                        alt="Uploaded photo"
                        className="mb-2 max-h-40 w-auto rounded-xl border border-emerald-400/30 object-cover"
                      />
                    )}
                    {isUser && !localPreview && hadImage && (
                      <span className="mb-1.5 inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
                        <Camera className="h-2.5 w-2.5" />
                        Photo attached
                      </span>
                    )}

                    {animateWords ? (
                      <TextGenerateEffect
                        words={msg.content}
                        dir={dir}
                        lang={outputLang}
                        className="whitespace-pre-line"
                        stagger={0.018}
                      />
                    ) : (
                      <p className="whitespace-pre-line">{msg.content}</p>
                    )}

                    {!isUser && (
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/8 pt-1.5">
                        <div className="flex flex-wrap items-center gap-1">
                          {sources.map((src) => (
                            <span
                              key={src}
                              className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300"
                            >
                              {src}
                            </span>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => void speakText(msg.content, outputLang, true)}
                          aria-label="Speak response"
                          className="rounded-lg bg-white/5 p-1 text-zinc-400 hover:bg-emerald-500/20 hover:text-emerald-300"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}

          {(sending || uploadingDoc) && (
            <div className="flex items-center gap-2.5 px-1 py-1.5">
              <GreenLoader scale={0.28} />
              <span className="text-xs font-medium text-emerald-300/90">
                {uploadingDoc ? 'Reading document...' : 'Lensy is thinking...'}
              </span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* Docked Multimodal Prompt Bar — ALWAYS sits cleanly above BottomNav (Zero Overlap!) */}
      <div className="z-20 shrink-0 px-3 pb-2 pt-1.5">
        <div className="mx-auto w-full max-w-2xl">
          <div className="glass-card rounded-[24px] border border-emerald-500/30 p-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.65)]">
            {attachedPreview && (
              <div className="mb-1.5 flex items-center gap-2 px-2 pt-1">
                <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-emerald-400/40">
                  <img
                    src={attachedPreview}
                    alt="Attached preview"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={clearImageAttachment}
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/80 p-0.5 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <span className="text-xs text-emerald-300">Photo ready to send</span>
              </div>
            )}

            <div className="flex items-end gap-1">
              <button
                type="button"
                disabled={uploadingDoc || sending}
                onClick={() => fileInputRef.current?.click()}
                title="Attach PDF, Word, or Photo"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-zinc-300 transition hover:bg-white/10 hover:text-emerald-300 disabled:opacity-40"
              >
                <Paperclip className="h-4 w-4" />
              </button>

              <button
                type="button"
                disabled={uploadingDoc || sending}
                onClick={() => cameraInputRef.current?.click()}
                title="Capture Photo"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-zinc-300 transition hover:bg-white/10 hover:text-emerald-300 disabled:opacity-40"
              >
                <Camera className="h-4 w-4" />
              </button>

              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessageInternal(input);
                  }
                }}
                placeholder="Ask Lensy anything..."
                className="max-h-24 min-h-[36px] flex-1 resize-none bg-transparent py-2 text-sm text-white placeholder-zinc-500 focus:outline-none"
              />

              <button
                type="button"
                disabled={sending || (!input.trim() && !attachedImage)}
                onClick={() => void sendMessageInternal(input)}
                aria-label="Send message"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-zinc-950 shadow-[0_0_14px_rgba(16,185,129,0.4)] transition hover:brightness-110 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LensyChatPage;
