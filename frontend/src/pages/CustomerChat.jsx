import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Send, Bot, Minimize2, MessageCircle, Wifi, WifiOff } from 'lucide-react';
import { io } from 'socket.io-client';
import { conversationAPI } from '@/services/conversation.js';
import { messageAPI } from '@/services/message.js';
import { userAPI } from '@/services/user.js';
import { SOCKET_EVENTS } from '@/constants/events.js';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// ─── Session helpers ──────────────────────────────────────────────────────────
const SESSION_KEY = 'convopilot_session';
const saveSession = (d) => { try { localStorage.setItem(SESSION_KEY, JSON.stringify(d)); } catch (_) {} };
const loadSession = () => { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (_) { return null; } };
const clearSession = () => { try { localStorage.removeItem(SESSION_KEY); } catch (_) {} };

// Own isolated socket for customer page
const createSocket = () =>
  io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 8,
    reconnectionDelay: 1000,
  });

// ─── Message bubble ───────────────────────────────────────────────────────────
function Bubble({ msg, currentUserId }) {
  const isMe = msg.sender_type === 'user' && msg.sender_id === currentUserId;
  return (
    <div className={clsx('flex gap-2 items-end animate-fade-in', isMe ? 'flex-row-reverse' : 'flex-row')}>
      {!isMe && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center flex-shrink-0 mb-0.5 shadow-sm">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div className={clsx('flex flex-col max-w-[78%]', isMe ? 'items-end' : 'items-start')}>
        <div className={clsx(
          'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm',
          isMe
            ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-br-sm'
            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm',
        )}>
          {msg.content}
        </div>
        <span className="text-xs text-slate-400 mt-1 px-1">
          {isMe ? 'You' : (msg.sender_name || 'Support')} ·{' '}
          {msg.created_at ? formatDistanceToNow(new Date(msg.created_at), { addSuffix: true }) : 'just now'}
        </span>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-end gap-2 animate-fade-in">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-sm">
        <Bot className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          {[0, 150, 300].map((d) => (
            <span key={d} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CustomerChat() {
  const [messages, setMessages]         = useState([]);
  const [conversation, setConversation] = useState(null);
  const [currentUser, setCurrentUser]   = useState(null);
  const [draft, setDraft]               = useState('');
  const [sending, setSending]           = useState(false);
  const [minimized, setMinimized]       = useState(false);
  const [started, setStarted]           = useState(false);
  const [connected, setConnected]       = useState(false);
  const [agentTyping, setAgentTyping]   = useState(false);
  const [form, setForm]                 = useState({ name: '', email: '', subject: '' });
  const [restoring, setRestoring]       = useState(true);

  const socketRef   = useRef(null);
  const endRef      = useRef(null);
  const typingTimer = useRef(null);

  useEffect(() => {
    if (!minimized) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, agentTyping, minimized]);

  // ── Setup socket for a conversation ──────────────────────────────────────
  const setupSocket = useCallback((conversationId, userId) => {
    socketRef.current?.disconnect();
    const socket = createSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit(SOCKET_EVENTS.JOIN_CONVERSATION, { conversationId });
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on(SOCKET_EVENTS.NEW_MESSAGE, (msg) => {
      if (msg.conversation_id !== conversationId) return;
      setMessages((prev) => {
        // Replace matching optimistic entry
        const optIdx = prev.findIndex(
          (m) => m.id?.startsWith('opt-') && m.content === msg.content && m.sender_id === msg.sender_id
        );
        if (optIdx !== -1) {
          const next = [...prev]; next[optIdx] = msg; return next;
        }
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on(SOCKET_EVENTS.TYPING_INDICATOR, ({ senderId, isTyping }) => {
      if (senderId === userId) return;
      setAgentTyping(isTyping);
      clearTimeout(typingTimer.current);
      if (isTyping) typingTimer.current = setTimeout(() => setAgentTyping(false), 4000);
    });
  }, []);

  // ── Restore session on mount ──────────────────────────────────────────────
  useEffect(() => {
    const restore = async () => {
      const session = loadSession();
      if (!session?.conversationId || !session?.userId) { setRestoring(false); return; }
      try {
        const [convRes, msgRes] = await Promise.all([
          conversationAPI.getById(session.conversationId),
          messageAPI.getByConversation(session.conversationId, { limit: 100 }),
        ]);
        const conv = convRes.data.data;
        if (conv.status === 'closed') { clearSession(); setRestoring(false); return; }
        setConversation(conv);
        setCurrentUser({ id: session.userId, name: session.userName, email: session.userEmail });
        setMessages((msgRes.data.data || []).filter((m) => m.message_type !== 'note'));
        setStarted(true);
        setupSocket(session.conversationId, session.userId);
      } catch (_) {
        clearSession();
      } finally {
        setRestoring(false);
      }
    };
    restore();
    return () => { socketRef.current?.disconnect(); clearTimeout(typingTimer.current); };
  }, [setupSocket]);

  // ── Start new conversation ────────────────────────────────────────────────
  const startConversation = async (e) => {
    e.preventDefault();
    try {
      const { data: u } = await userAPI.upsert({ name: form.name, email: form.email });
      const user = u.data;
      const { data: c } = await conversationAPI.create({
        user_id: user.id,
        subject: form.subject || `Chat from ${form.name}`,
        priority: 'medium',
      });
      const conv = c.data;
      saveSession({ userId: user.id, userName: user.name, userEmail: user.email, conversationId: conv.id });
      setCurrentUser(user);
      setConversation(conv);
      setMessages([]);
      setStarted(true);
      setupSocket(conv.id, user.id);
    } catch (_) {
      toast.error('Could not start conversation. Please try again.');
    }
  };

  // ── Send via API (reliable) + optimistic UI ───────────────────────────────
  const sendMessage = async () => {
    const content = draft.trim();
    if (!content || !conversation || !currentUser || sending) return;
    setDraft('');
    setSending(true);

    const optimistic = {
      id: `opt-${Date.now()}`,
      conversation_id: conversation.id,
      sender_type: 'user',
      sender_id: currentUser.id,
      sender_name: currentUser.name,
      content,
      message_type: 'text',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const { data } = await messageAPI.send(conversation.id, {
        sender_type: 'user',
        sender_id: currentUser.id,
        content,
        message_type: 'text',
      });
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? data.data : m)));
    } catch (_) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(content);
      toast.error('Failed to send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const endConversation = () => {
    clearSession();
    socketRef.current?.disconnect();
    setStarted(false); setConversation(null); setCurrentUser(null);
    setMessages([]); setForm({ name: '', email: '', subject: '' });
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-primary-50 to-violet-50 flex items-end justify-end p-6">

      {/* Minimized launcher */}
      {minimized && (
        <button
          onClick={() => setMinimized(false)}
          className="w-14 h-14 bg-gradient-to-br from-primary-500 to-violet-600 rounded-full shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform relative"
        >
          <MessageCircle className="w-6 h-6 text-white" />
          {messages.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold shadow">
              {messages.length > 9 ? '9+' : messages.length}
            </span>
          )}
        </button>
      )}

      {/* Chat widget */}
      {!minimized && (
        <div
          className="w-[390px] bg-white rounded-2xl shadow-2xl border border-slate-200/60 flex flex-col overflow-hidden"
          style={{ height: 600 }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-violet-600 px-4 py-3.5 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-primary-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">ConvoPilot Support</p>
                <div className="flex items-center gap-1.5">
                  {started ? (
                    connected
                      ? <><Wifi className="w-2.5 h-2.5 text-green-300" /><span className="text-xs text-white/70">Connected</span></>
                      : <><WifiOff className="w-2.5 h-2.5 text-amber-300" /><span className="text-xs text-white/70">Reconnecting…</span></>
                  ) : (
                    <span className="text-xs text-white/70">We're here to help · 24/7</span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={() => setMinimized(true)} className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors">
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          {restoring ? (
            <div className="flex-1 flex items-center justify-center bg-slate-50">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !started ? (

            /* Pre-chat form */
            <div className="flex-1 overflow-y-auto bg-slate-50/50">
              <div className="p-5 space-y-4">
                <div className="bg-gradient-to-br from-primary-50 to-violet-50 rounded-xl p-4 border border-primary-100/80">
                  <p className="text-sm font-semibold text-slate-800">👋 Hi there!</p>
                  <p className="text-xs text-slate-600 mt-1 leading-5">
                    Fill in your details below and we'll connect you with a support agent right away.
                  </p>
                </div>
                <form onSubmit={startConversation} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Your name</label>
                    <input className="input text-sm" placeholder="John Smith" value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Email address</label>
                    <input type="email" className="input text-sm" placeholder="john@example.com" value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                      What can we help with? <span className="font-normal text-slate-400">optional</span>
                    </label>
                    <input className="input text-sm" placeholder="Briefly describe your issue…" value={form.subject}
                      onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
                  </div>
                  <button type="submit" className="btn-primary w-full justify-center py-2.5 text-sm mt-1">
                    Start conversation →
                  </button>
                </form>
              </div>
            </div>

          ) : (

            /* Active chat */
            <>
              <div className="bg-white border-b border-slate-100 px-4 py-2 flex items-center justify-between flex-shrink-0">
                <p className="text-xs text-slate-500 truncate flex-1">{conversation?.subject}</p>
                <button onClick={endConversation} className="text-xs text-slate-400 hover:text-red-500 transition-colors ml-3 flex-shrink-0">
                  End chat
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/60">
                <div className="flex justify-center">
                  <span className="text-xs text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
                    {conversation?.created_at
                      ? formatDistanceToNow(new Date(conversation.created_at), { addSuffix: true })
                      : 'just now'} · Conversation started
                  </span>
                </div>
                {messages.map((msg) => <Bubble key={msg.id} msg={msg} currentUserId={currentUser?.id} />)}
                {agentTyping && <TypingDots />}
                <div ref={endRef} />
              </div>

              <div className="border-t border-slate-200 bg-white p-3 flex-shrink-0">
                <div className="flex gap-2 items-end bg-slate-50 rounded-xl border border-slate-200 p-2 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
                  <textarea
                    rows={2}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Type a message… (Enter to send)"
                    className="flex-1 resize-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none leading-5"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!draft.trim() || sending}
                    className="p-2 rounded-lg bg-gradient-to-br from-primary-500 to-violet-600 text-white hover:opacity-90 disabled:opacity-40 transition-all flex-shrink-0 shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-center text-xs text-slate-400 mt-2">Powered by ConvoPilot</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
