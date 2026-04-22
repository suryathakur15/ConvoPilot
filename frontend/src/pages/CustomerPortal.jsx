import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Send, Bot, ArrowLeft, Plus, Wifi, WifiOff,
  Clock, CheckCircle2, Circle, LogOut, Eye,
} from 'lucide-react';
import { io } from 'socket.io-client';
import { authAPI } from '@/services/auth.js';
import { conversationAPI } from '@/services/conversation.js';
import { messageAPI } from '@/services/message.js';
import { SOCKET_EVENTS } from '@/constants/events.js';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// ─── Socket factory ───────────────────────────────────────────────────────────
const createSocket = () =>
  io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 1000,
  });

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG = {
  open:    { label: 'Open',    icon: Circle,       color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  snoozed: { label: 'Snoozed', icon: Clock,        color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200' },
  closed:  { label: 'Closed',  icon: CheckCircle2, color: 'text-slate-500',   bg: 'bg-slate-100 border-slate-200' },
};

// ─── Message bubble ───────────────────────────────────────────────────────────
function Bubble({ msg, currentUserId }) {
  const isMe = msg.sender_type === 'user' && msg.sender_id === currentUserId;
  return (
    <div className={clsx('flex gap-2.5 items-end', isMe ? 'flex-row-reverse' : 'flex-row')}>
      {!isMe && (
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 mb-0.5 shadow-sm">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={clsx('flex flex-col max-w-[76%]', isMe ? 'items-end' : 'items-start')}>
        <div className={clsx(
          'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm',
          isMe
            ? 'bg-indigo-600 text-white rounded-br-sm'
            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm',
        )}>
          {msg.content}
        </div>
        <span className="text-xs text-slate-400 mt-1 px-1 font-medium">
          {isMe ? 'You' : (msg.sender_name || 'Support')} ·{' '}
          {msg.created_at ? formatDistanceToNow(new Date(msg.created_at), { addSuffix: true }) : 'just now'}
        </span>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-end gap-2.5">
      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          {[0, 150, 300].map((d) => (
            <span key={d} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Auth forms ───────────────────────────────────────────────────────────────
const AVATARS = ['🧑‍💻', '👩‍💼', '🧑‍🔧', '👨‍💼'];

function AuthForm({ onSuccess }) {
  const [tab, setTab]       = useState('login');
  const [form, setForm]     = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const fn   = tab === 'login' ? authAPI.login : authAPI.signup;
      const body = tab === 'login'
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password };
      const { data } = await fn(body);
      onSuccess(data.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex flex-col items-center justify-center p-5 relative overflow-hidden">

      {/* Decorative blobs */}
      <div className="absolute top-[-80px] right-[-80px] w-72 h-72 bg-emerald-200/40 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-60px] left-[-60px] w-64 h-64 bg-teal-200/40 rounded-full blur-[80px] pointer-events-none" />

      {/* Floating avatar strip */}
      <div className="flex items-center gap-2 mb-6">
        {AVATARS.map((a, i) => (
          <div key={i} className={clsx(
            'w-9 h-9 rounded-full bg-white border-2 border-white shadow-md flex items-center justify-center text-lg',
            i > 0 && '-ml-2'
          )}>{a}</div>
        ))}
        <div className="ml-2 text-sm text-slate-600 font-medium">
          <span className="font-bold text-slate-800">4,200+</span> happy customers
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-white border border-emerald-200 rounded-full px-4 py-1.5 shadow-sm mb-4">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-700">Support team online</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 leading-tight">
            {tab === 'login' ? 'Good to see you again 👋' : 'We\'re here to help 💬'}
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            {tab === 'login'
              ? 'Sign in to view your support tickets.'
              : 'Any email works — this is a demo. Just pick something and jump in.'}
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
          {/* Tab pills */}
          <div className="flex gap-1.5 p-3 bg-slate-50 border-b border-slate-100">
            {[{ id: 'login', label: '👤 Sign in' }, { id: 'signup', label: '✨ New here' }].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => { setTab(id); setError(''); }}
                className={clsx(
                  'flex-1 py-2 text-xs font-bold rounded-xl transition-all',
                  tab === id
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'text-slate-400 hover:text-slate-600'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="p-5 space-y-3.5">
            {tab === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Your name</label>
                <input
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 bg-slate-50 focus:bg-white transition-all"
                  placeholder="e.g. Alex Johnson"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Email address</label>
              <input
                type="email"
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 bg-slate-50 focus:bg-white transition-all"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Password</label>
              <input
                type="password"
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 bg-slate-50 focus:bg-white transition-all"
                placeholder={tab === 'signup' ? 'Choose any password (min 6 chars)' : '••••••••'}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
                minLength={6}
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 font-medium">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/25 mt-1 flex items-center justify-center gap-2"
            >
              {loading
                ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Please wait…</>
                : tab === 'login' ? '→ View my tickets' : '→ Start chatting'}
            </button>
          </form>
        </div>

        {/* Demo note */}
        <div className="mt-4 p-3 rounded-2xl bg-amber-50 border border-amber-200/60">
          <p className="text-[11px] text-amber-700 text-center leading-5">
            🎭 <strong>Demo environment</strong> — use any email & password. No real account needed. Just explore!
          </p>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          {tab === 'login'
            ? <><span>First time? </span><button onClick={() => setTab('signup')} className="text-emerald-600 font-semibold hover:text-emerald-700">Create an account →</button></>
            : <><span>Already signed up? </span><button onClick={() => setTab('login')} className="text-emerald-600 font-semibold hover:text-emerald-700">Sign in →</button></>
          }
        </p>
      </div>
    </div>
  );
}

// ─── Ticket list ──────────────────────────────────────────────────────────────
function TicketList({ user, onOpen, onNew, onLogout }) {
  const [tickets, setTickets]   = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await conversationAPI.getAll({ user_id: user.id, limit: 50 });
        setTickets(data.data || []);
      } catch (_) {
        toast.error('Could not load tickets');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user.id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Bot className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Support Portal</p>
            <p className="text-xs text-slate-500 font-medium">Hi, {user.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onNew}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            New ticket
          </button>
          <button
            onClick={onLogout}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h2 className="text-base font-bold text-slate-900 mb-4">Your tickets</h2>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center mx-auto mb-3">
              <Bot className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">No tickets yet</p>
            <p className="text-xs text-slate-400 mb-4">Start a conversation with our support team</p>
            <button
              onClick={onNew}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" /> Open a ticket
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => {
              const cfg = STATUS_CFG[t.status] || STATUS_CFG.open;
              const Icon = cfg.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => onOpen(t)}
                  className="w-full text-left bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md shadow-sm p-4 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-700 transition-colors">
                        {t.subject || 'Support ticket'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        Opened {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                        {t.message_count > 0 && ` · ${t.message_count} messages`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={clsx(
                        'flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border',
                        cfg.bg, cfg.color
                      )}>
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                      <Eye className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── New ticket form ──────────────────────────────────────────────────────────
function NewTicketForm({ user, onCreated, onBack }) {
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await conversationAPI.create({
        user_id: user.id,
        subject: subject.trim() || `Support request from ${user.name}`,
        priority: 'medium',
      });
      onCreated(data.data);
    } catch (_) {
      toast.error('Could not create ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3 shadow-sm">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <p className="text-sm font-bold text-slate-900">New ticket</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <p className="text-sm font-semibold text-slate-900 mb-1">👋 How can we help?</p>
          <p className="text-xs text-slate-500 mb-5">Describe your issue and our team will get back to you.</p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Subject</label>
              <input
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 focus:bg-white transition-all"
                placeholder="e.g. Payment not going through"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
            >
              {loading ? 'Opening…' : 'Open ticket →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Active conversation ──────────────────────────────────────────────────────
function ActiveConversation({ ticket, user, onBack }) {
  const [messages, setMessages]     = useState([]);
  const [draft, setDraft]           = useState('');
  const [sending, setSending]       = useState(false);
  const [connected, setConnected]   = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);
  const [loading, setLoading]       = useState(true);

  const socketRef   = useRef(null);
  const endRef      = useRef(null);
  const typingTimer = useRef(null);
  const isClosed    = ticket.status === 'closed';

  // Load messages + setup socket
  const setupSocket = useCallback((conversationId) => {
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
        const optIdx = prev.findIndex(
          (m) => m.id?.startsWith('opt-') && m.content === msg.content && m.sender_id === msg.sender_id
        );
        if (optIdx !== -1) { const next = [...prev]; next[optIdx] = msg; return next; }
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on(SOCKET_EVENTS.TYPING_INDICATOR, ({ senderId, isTyping }) => {
      if (senderId === user.id) return;
      setAgentTyping(isTyping);
      clearTimeout(typingTimer.current);
      if (isTyping) typingTimer.current = setTimeout(() => setAgentTyping(false), 4000);
    });
  }, [user.id]);

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await messageAPI.getByConversation(ticket.id, { limit: 100 });
        setMessages((data.data || []).filter((m) => m.message_type !== 'note'));
      } catch (_) {} finally {
        setLoading(false);
      }
    };
    init();
    setupSocket(ticket.id);
    return () => {
      socketRef.current?.disconnect();
      clearTimeout(typingTimer.current);
    };
  }, [ticket.id, setupSocket]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, agentTyping]);

  const sendMessage = async () => {
    const content = draft.trim();
    if (!content || sending || isClosed) return;
    setDraft('');
    setSending(true);
    const optimistic = {
      id: `opt-${Date.now()}`, conversation_id: ticket.id,
      sender_type: 'user', sender_id: user.id,
      content, message_type: 'text', created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const { data } = await messageAPI.send(ticket.id, {
        sender_type: 'user', sender_id: user.id, content, message_type: 'text',
      });
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? data.data : m));
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

  const cfg = STATUS_CFG[ticket.status] || STATUS_CFG.open;
  const Icon = cfg.icon;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3.5 flex items-center gap-3 shadow-sm flex-shrink-0">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{ticket.subject || 'Support ticket'}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={clsx('flex items-center gap-1 text-xs font-semibold', cfg.color)}>
              <Icon className="w-3 h-3" /> {cfg.label}
            </span>
            {!isClosed && (
              <>
                <span className="text-slate-300">·</span>
                {connected
                  ? <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium"><Wifi className="w-3 h-3" />Connected</span>
                  : <span className="flex items-center gap-1 text-xs text-amber-500 font-medium"><WifiOff className="w-3 h-3" />Reconnecting…</span>
                }
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400 font-medium">No messages yet. Say hello!</div>
        ) : (
          messages.map((msg) => <Bubble key={msg.id} msg={msg} currentUserId={user.id} />)
        )}
        {agentTyping && <TypingDots />}
        <div ref={endRef} />
      </div>

      {/* Compose or closed banner */}
      {isClosed ? (
        <div className="flex-shrink-0 bg-white border-t border-slate-200 px-4 py-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-center">
            <p className="text-sm font-semibold text-slate-500">This ticket is closed.</p>
            <p className="text-xs text-slate-400 mt-0.5">Open a new ticket if you need further help.</p>
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 bg-white border-t border-slate-200 p-3">
          <div className="flex gap-2.5 items-end bg-slate-50 rounded-xl border border-slate-200 p-2.5 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
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
              className="p-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors flex-shrink-0 shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-center text-xs text-slate-400 mt-2">Powered by ConvoPilot</p>
        </div>
      )}
    </div>
  );
}

// ─── Main portal ──────────────────────────────────────────────────────────────
export default function CustomerPortal() {
  const [user, setUser]       = useState(null);
  const [checking, setChecking] = useState(true);
  const [view, setView]       = useState('list');   // 'list' | 'new' | 'conversation'
  const [activeTicket, setActiveTicket] = useState(null);

  // Check existing session on mount
  useEffect(() => {
    authAPI.me()
      .then(({ data }) => setUser(data.data))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const handleLogout = async () => {
    try { await authAPI.logout(); } catch (_) {}
    setUser(null);
    setView('list');
    setActiveTicket(null);
  };

  const openTicket = (ticket) => { setActiveTicket(ticket); setView('conversation'); };
  const onCreated  = (ticket) => { setActiveTicket(ticket); setView('conversation'); };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <AuthForm onSuccess={setUser} />;

  if (view === 'conversation' && activeTicket) {
    return (
      <ActiveConversation
        ticket={activeTicket}
        user={user}
        onBack={() => setView('list')}
      />
    );
  }

  if (view === 'new') {
    return (
      <NewTicketForm
        user={user}
        onCreated={onCreated}
        onBack={() => setView('list')}
      />
    );
  }

  return (
    <TicketList
      user={user}
      onOpen={openTicket}
      onNew={() => setView('new')}
      onLogout={handleLogout}
    />
  );
}
