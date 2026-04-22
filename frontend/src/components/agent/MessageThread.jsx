import React, { useRef, useEffect, useState } from 'react';
import { Send, StickyNote, X, LockOpen, Sparkles } from 'lucide-react';
import { useConversationStore } from '@/store/conversationStore.js';
import { useUIStore } from '@/store/uiStore.js';
import { useAgentStore } from '@/store/agentStore.js';
import { messageAPI } from '@/services/message.js';
import { conversationAPI } from '@/services/conversation.js';
import { getSocket } from '@/hooks/useSocket.js';
import { SOCKET_EVENTS } from '@/constants/events.js';
import MessageBubble from './MessageBubble.jsx';
import TypingIndicator from './TypingIndicator.jsx';
import StatusBadge from '@/components/shared/StatusBadge.jsx';
import { PRIORITY_CONFIG } from '@/constants/tags.js';
import { getSentimentDisplay } from '@/constants/sentiment.js';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function MessageThread() {
  const { activeConversation, messages, messagesLoading, appendMessage, upsertConversation } = useConversationStore();
  const { currentAgent } = useAgentStore();
  const { typingUsers, aiPanelOpen, toggleAIPanel } = useUIStore();
  const [draft, setDraft] = useState('');
  const [noteMode, setNoteMode] = useState(false);
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimeout = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (activeConversation) { setNoteMode(false); setDraft(''); }
  }, [activeConversation?.id]);

  const handleTyping = (val) => {
    setDraft(val);
    const socket = getSocket();
    if (!activeConversation || !currentAgent) return;
    socket?.emit(SOCKET_EVENTS.TYPING_START, { conversationId: activeConversation.id, senderId: currentAgent.id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket?.emit(SOCKET_EVENTS.TYPING_STOP, { conversationId: activeConversation.id, senderId: currentAgent.id });
    }, 1500);
  };

  const send = async () => {
    if (!draft.trim() || !activeConversation || !currentAgent || sending) return;
    const content = draft.trim();
    setDraft('');
    setSending(true);
    try {
      const { data } = await messageAPI.send(activeConversation.id, {
        sender_type: 'agent',
        sender_id: currentAgent.id,
        content,
        message_type: noteMode ? 'note' : 'text',
      });
      appendMessage(data.data);
    } catch (_) {
      setDraft(content);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const closeConversation = async () => {
    if (!activeConversation || !currentAgent) return;
    try {
      await conversationAPI.updateStatus(activeConversation.id, { status: 'closed', actor_id: currentAgent.id });
      upsertConversation({ ...activeConversation, status: 'closed' });
      toast.success('Conversation closed');
    } catch (_) {}
  };

  const reopenConversation = async () => {
    if (!activeConversation || !currentAgent) return;
    try {
      await conversationAPI.updateStatus(activeConversation.id, { status: 'open', actor_id: currentAgent.id });
      upsertConversation({ ...activeConversation, status: 'open' });
      toast.success('Conversation reopened');
    } catch (_) {}
  };

  const typingCount = Object.keys(typingUsers).length;
  const priority = PRIORITY_CONFIG[activeConversation?.priority];

  // Sentiment pill in header (compact)
  const sentBand = activeConversation?.sentiment && activeConversation.sentiment !== 'unknown'
    ? getSentimentDisplay(activeConversation.sentiment, activeConversation.sentiment_score ?? 50)
    : null;

  if (!activeConversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center">
            <Send className="w-6 h-6 text-slate-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Select a conversation</p>
            <p className="text-xs text-slate-400 mt-1">Choose from the inbox to start responding</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-slate-200">

      {/* ── Thread header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 bg-white flex-shrink-0 gap-3">

        {/* Left: subject + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-bold text-slate-900 truncate">
              {activeConversation.subject || 'Untitled'}
            </h3>
            {/* Status badge — compact, no label clutter */}
            <StatusBadge status={activeConversation.status} />
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-500 truncate font-medium">
              {activeConversation.user_name}
              {activeConversation.user_email ? ` · ${activeConversation.user_email}` : ''}
            </p>
            {priority && (
              <span className={`text-[11px] font-bold flex-shrink-0 ${priority.color}`}>
                {priority.label}
              </span>
            )}
            {sentBand && (
              <span className={clsx(
                'inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md border flex-shrink-0',
                sentBand.badge
              )}>
                <span className={clsx('w-1.5 h-1.5 rounded-full', sentBand.dot)} />
                {sentBand.label}
              </span>
            )}
          </div>
        </div>

        {/* Right: AI Copilot button + Close/Reopen */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* AI Copilot toggle button */}
          <button
            onClick={toggleAIPanel}
            title={aiPanelOpen ? 'Close AI Copilot (⌘K)' : 'Open AI Copilot (⌘K)'}
            className={clsx(
              'flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all duration-200',
              aiPanelOpen
                ? 'ai-gradient text-white shadow-md shadow-indigo-200'
                : 'text-slate-500 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200'
            )}
          >
            <Sparkles className={clsx(
              'w-3.5 h-3.5 transition-transform duration-300',
              aiPanelOpen ? 'rotate-[20deg]' : 'group-hover:rotate-[20deg]'
            )} />
            <span className="hidden sm:inline">AI Copilot</span>
            {aiPanelOpen
              ? <span className="text-[10px] text-white/70 hidden sm:inline">ON</span>
              : <span className="text-[10px] text-slate-400 hidden lg:inline">⌘K</span>
            }
          </button>

          {/* Divider */}
          <div className="w-px h-5 bg-slate-200" />

          {/* Close / Reopen */}
          {activeConversation.status === 'closed' ? (
            <button
              onClick={reopenConversation}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
            >
              <LockOpen className="w-3 h-3" />
              Reopen
            </button>
          ) : (
            <button
              onClick={closeConversation}
              className="text-xs font-bold text-slate-600 border border-slate-200 hover:border-rose-200 hover:text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-all"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* ── Messages ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-slate-50">
        {messagesLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
              <Send className="w-5 h-5 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-500">No messages yet</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} currentAgentId={currentAgent?.id} />
          ))
        )}
        {typingCount > 0 && <TypingIndicator />}
        <div ref={endRef} />
      </div>

      {/* ── Compose ───────────────────────────────────────────── */}
      {activeConversation.status === 'closed' ? (
        /* Closed — collapsed hint bar */
        <div className="flex-shrink-0 bg-slate-50 border-t border-slate-200 px-5 py-3">
          <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
            <LockOpen className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Conversation closed — use <strong className="text-slate-600">Reopen</strong> in the header to continue messaging.</span>
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 bg-white border-t border-slate-200 p-4">
          {noteMode && (
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1">
                <StickyNote className="w-3 h-3 text-amber-600" />
                <span className="text-xs font-semibold text-amber-700">Internal note — hidden from customer</span>
              </div>
              <button onClick={() => setNoteMode(false)} className="ml-auto p-0.5 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className={clsx(
            'rounded-xl border transition-all',
            noteMode ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200 bg-white',
            'focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400'
          )}>
            <textarea
              ref={textareaRef}
              rows={3}
              value={draft}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={noteMode ? 'Write an internal note…' : 'Reply to customer… (↵ send, ⇧↵ newline)'}
              className="w-full resize-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none px-3.5 pt-3 pb-2 leading-5"
            />
            <div className="flex items-center justify-between px-3 pb-2.5">
              <button
                onClick={() => setNoteMode(!noteMode)}
                className={clsx(
                  'flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md transition-colors',
                  noteMode ? 'bg-amber-100 text-amber-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                )}
              >
                <StickyNote className="w-3 h-3" />
                Note
              </button>
              <button
                onClick={send}
                disabled={!draft.trim() || sending}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
              >
                <Send className="w-3 h-3" />
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
