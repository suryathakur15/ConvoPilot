import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import Avatar from '@/components/shared/Avatar.jsx';
import clsx from 'clsx';
import { StickyNote } from 'lucide-react';

export default function MessageBubble({ message: m, currentAgentId }) {
  const isMe   = m.sender_type === 'agent' && m.sender_id === currentAgentId;
  const isNote = m.message_type === 'note';
  const isUser = m.sender_type === 'user';

  if (isNote) {
    return (
      <div className="flex justify-center animate-fade-in">
        <div className="max-w-[85%] bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <StickyNote className="w-3 h-3 text-amber-600" />
            <span className="text-xs font-bold text-amber-700">Internal Note · {m.sender_name}</span>
          </div>
          <p className="text-xs text-amber-900 leading-5">{m.content}</p>
          <p className="text-xs text-amber-400 mt-1">
            {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('flex gap-2.5 animate-fade-in', isMe ? 'flex-row-reverse' : 'flex-row')}>
      {!isMe && <Avatar name={m.sender_name || (isUser ? 'User' : 'Bot')} size="sm" />}

      <div className={clsx('flex flex-col max-w-[68%]', isMe ? 'items-end' : 'items-start')}>
        {/* Parent message context */}
        {m.parent_message && (
          <div className="text-xs text-slate-500 bg-white border border-slate-200 border-l-2 border-l-slate-400 px-2.5 py-1.5 rounded-lg mb-1 max-w-full truncate shadow-sm">
            ↩ {m.parent_message.content}
          </div>
        )}

        <div className={clsx(
          'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm',
          isMe
            ? 'bg-indigo-600 text-white rounded-br-sm'
            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm',
        )}>
          {m.content}
        </div>

        <div className={clsx('flex items-center gap-1.5 mt-1 px-0.5', isMe ? 'flex-row-reverse' : 'flex-row')}>
          <span className="text-xs font-medium text-slate-500">
            {m.sender_name || (isUser ? 'User' : 'Agent')}
          </span>
          <span className="text-xs text-slate-300">·</span>
          <span className="text-xs text-slate-400">
            {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  );
}
