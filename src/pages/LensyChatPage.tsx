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

interface LensyChatPageProps {
  initialSessionId?: string | null;
  onConsumeInitialSession?: () => void;
}

const SUGGESTION_CHIPS = [
  'Who created VisionLens V1?',
  'Compare Lite vs Plus features',
  'How does VisionLens protect my privacy?',
  'Summarize my uploaded documents',
];

export const LensyChatPage: React.FC<LensyChatPageProps> = ({
  initialSessionId,
  onConsumeInitialSession,
}) => {
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSessionOut[]>([]);
  const [documents, setDocuments] = useState<DocumentOut[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageOut[]>([]);
  const [newestAssistantId, setNewestAssistantId] = useState<string | null>(null);

  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [notice, setNotice] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const outputLang = user?.output_language || 'en';
  const dir: 'ltr' | 'rtl' = outputLang === 'ur' || outputLang === 'ar' ? 'rtl' : 'ltr';
  const langClass = outputLang === 'ur' ? 'lang-ur' : outputLang === 'ar' ? 'lang-ar' : '';

  const loadSidebarData = useCallback(async () => {
    try {
      const [sessRes, docRes] = await Promise.all([api.listSessions(), api.listDocuments()]);
      setSessions(sessRes.sessions);
      setDocuments(docRes.documents);
    } catch {
      // Handled by global interceptors
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

  const clearImageAttachment = () => {
    setAttachedImage(null);
    setAttachedPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

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
        setNotice(`Indexed "${uploaded.filename}" (${uploaded.chunk_count} chunks) into private RAG.`);
      } catch (err) {
        setNotice(err instanceof ApiClientError ? err.message : 'Document upload failed.');
      } finally {
        setUploadingDoc(false);
      }
      return;
    }

    // Image attachment for multimodal Lensy prompt
    clearImageAttachment();
    setAttachedImage(file);
    setAttachedPreview(URL.createObjectURL(file));
  };

  const handleSend = async (promptOverride?: string) => {
    const text = (promptOverride ?? input).trim();
    if ((!text && !attachedImage) || sending) return;

    const finalMessage = text || 'Describe and analyze this image for me.';
    const tempUserId = `temp-u-${Date.now()}`;
    const optimisticMsg: ChatMessageOut = {
      id: tempUserId,
      role: 'user',
      content: finalMessage,
      attachment_meta: attachedImage ? { image_attached: true } : null,
      created_at: new Date().toISOString(),
    };

    const imageToSend = attachedImage;
    setMessages((prev) => [...prev, optimisticMsg]);
    setInput('');
    clearImageAttachment();
    setSending(true);
    setNotice('');

    try {
      const res = await api.lensyChat(finalMessage, activeSessionId, imageToSend);
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
      {/* Hidden Multimodal Inputs */}
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

      {/* Top Gemini-style Header with Lensy Logo + Vision Lens Branding */}
      <header className="z-20 flex items-center justify-between border-b border-white/8 bg-[#05090d]/90 px-4 pb-3 pt-[max(0.85rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open sessions and documents"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition hover:border-emerald-400/40 hover:text-white"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          <img
            src="/lensy-logo.png"
            alt="Lensy AI"
            className="h-7 w-7 rounded-full border border-emerald-400/50 object-cover shadow-[0_0_12px_rgba(16,185,129,0.5)]"
          />
          <div className="leading-tight">
            <span className="text-sm font-bold text-white">Lensy AI</span>
            <span className="ml-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
              Vision Lens
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleNewChat}
          aria-label="New conversation"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/15 text-emerald-300 transition hover:bg-emerald-500/25"
        >
          <Plus className="h-4 w-4" />
        </button>
      </header>

      {/* Slide-Over Drawer: 30-Day Sessions & Private RAG Documents */}
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
              transition={{ type: 'spring', stiffness: 360, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="flex h-full w-[82%] max-w-xs flex-col border-r border-white/10 bg-[#070c11] p-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/8">
                <div className="flex items-center gap-2">
                  <img src="/lensy-logo.png" alt="Lensy" className="h-7 w-7 rounded-full" />
                  <span className="text-sm font-bold text-white">Lensy Workspace</span>
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
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-2.5 text-xs font-bold text-zinc-950"
              >
                <Plus className="h-4 w-4" />
                New Lensy Chat
              </button>

              {/* 30-Day Sessions */}
              <div className="mt-5 flex-1 overflow-y-auto space-y-5">
                <div>
                  <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    30-Day Conversations ({sessions.length})
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

                {/* Private Uploaded RAG Documents */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      Private RAG Docs ({documents.length}/10)
                    </h3>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[11px] font-semibold text-emerald-400 hover:underline"
                    >
                      + Upload
                    </button>
                  </div>
                  {documents.length === 0 ? (
                    <p className="text-xs text-zinc-500">
                      Upload PDF or DOCX files (max 10 MB, 25 pages) to ask Lensy questions.
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
                            <div className="truncate">
                              <p className="truncate font-medium">{doc.filename}</p>
                              <p className="text-[10px] text-zinc-500">{doc.chunk_count} chunks</p>
                            </div>
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

      {/* Main Chat Conversation Stream */}
      <main className="flex-1 overflow-y-auto px-4 pb-44 pt-4">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          {notice && (
            <div className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-200">
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice('')}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {messages.length === 0 ? (
            /* Gemini-Style Centered Lensy Welcome Hero */
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="relative flex h-24 w-24 items-center justify-center">
                {[0, 0.9].map((delay) => (
                  <motion.span
                    key={delay}
                    initial={{ scale: 0.9, opacity: 0.6 }}
                    animate={{ scale: 1.85, opacity: 0 }}
                    transition={{ duration: 2.5, repeat: Infinity, delay, ease: 'easeOut' }}
                    className="pointer-events-none absolute inset-0 rounded-full border border-emerald-400/55"
                  />
                ))}
                <img
                  src="/lensy-logo.png"
                  alt="Lensy AI"
                  className="relative z-10 h-20 w-20 rounded-full border-2 border-emerald-400/70 object-cover shadow-[0_0_30px_rgba(16,185,129,0.5)]"
                />
              </div>

              <h2 className="mt-5 bg-gradient-to-r from-white via-emerald-200 to-emerald-400 bg-clip-text text-2xl font-extrabold text-transparent">
                Hello, {user?.username || 'Explorer'}
              </h2>
              <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-zinc-400">
                I&apos;m <strong className="text-emerald-300">Lensy AI</strong>. Snap a photo, attach a PDF/Word file, or ask me anything in your active language.
              </p>

              <div className="mt-6 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTION_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => void handleSend(chip)}
                    className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-left text-xs text-zinc-200 transition hover:border-emerald-400/40 hover:bg-emerald-500/10"
                  >
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    <span>{chip}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message Thread */
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              const sources = Array.isArray(msg.attachment_meta?.sources)
                ? (msg.attachment_meta?.sources as string[])
                : [];
              const animateWords = !isUser && msg.id === newestAssistantId;

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <img
                      src="/lensy-logo.png"
                      alt="Lensy AI"
                      className="mt-1 h-7 w-7 shrink-0 rounded-full border border-emerald-400/50 object-cover shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                    />
                  )}

                  <div
                    dir={isUser ? 'auto' : dir}
                    className={`max-w-[84%] rounded-3xl px-4 py-3 text-sm leading-relaxed ${
                      isUser
                        ? 'rounded-tr-md bg-gradient-to-br from-emerald-500/25 to-teal-600/20 border border-emerald-400/35 text-white'
                        : `rounded-tl-md border border-white/10 bg-zinc-900/80 text-zinc-100 ${langClass}`
                    }`}
                  >
                    {animateWords ? (
                      <TextGenerateEffect
                        words={msg.content}
                        dir={dir}
                        lang={outputLang}
                        className="whitespace-pre-line"
                        stagger={0.02}
                      />
                    ) : (
                      <p className="whitespace-pre-line">{msg.content}</p>
                    )}

                    {!isUser && (
                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-white/8 pt-2">
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
                          className="rounded-lg bg-white/5 p-1.5 text-zinc-400 hover:bg-emerald-500/20 hover:text-emerald-300"
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

          {/* GreenLoader Thinking Indicator */}
          {(sending || uploadingDoc) && (
            <div className="flex items-center gap-3 px-2 py-2">
              <GreenLoader scale={0.34} />
              <span className="text-xs font-medium text-emerald-300/90">
                {uploadingDoc ? 'Indexing document into pgvector...' : 'Lensy AI is thinking...'}
              </span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* Gemini-Style Floating Multimodal Prompt Bar (above GlassSurface BottomNav) */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[5.45rem] z-30 mx-auto w-full max-w-2xl px-3">
        <div className="pointer-events-auto glass-card rounded-3xl border border-emerald-500/30 p-2 shadow-[0_14px_40px_rgba(0,0,0,0.75)]">
          {attachedPreview && (
            <div className="mb-2 flex items-center gap-2 px-2 pt-1">
              <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-emerald-400/40">
                <img src={attachedPreview} alt="Attached preview" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={clearImageAttachment}
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/80 p-0.5 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <span className="text-xs text-emerald-300">Image ready for Lensy Vision</span>
            </div>
          )}

          <div className="flex items-end gap-1.5">
            {/* Attach PDF / DOCX / Image */}
            <button
              type="button"
              disabled={uploadingDoc || sending}
              onClick={() => fileInputRef.current?.click()}
              title="Attach PDF, Word, or Image"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-zinc-300 transition hover:bg-white/10 hover:text-emerald-300 disabled:opacity-40"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            {/* Capture Image directly with Camera */}
            <button
              type="button"
              disabled={uploadingDoc || sending}
              onClick={() => cameraInputRef.current?.click()}
              title="Capture Image for Lensy"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-zinc-300 transition hover:bg-white/10 hover:text-emerald-300 disabled:opacity-40"
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
                  void handleSend();
                }
              }}
              placeholder="Ask Lensy anything..."
              className="max-h-28 min-h-[40px] flex-1 resize-none bg-transparent py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none"
            />

            <button
              type="button"
              disabled={sending || (!input.trim() && !attachedImage)}
              onClick={() => void handleSend()}
              aria-label="Send message"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-zinc-950 shadow-[0_0_16px_rgba(16,185,129,0.45)] transition hover:brightness-110 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LensyChatPage;
