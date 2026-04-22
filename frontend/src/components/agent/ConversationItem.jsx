import React, { useRef, useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import Avatar from '@/components/shared/Avatar.jsx';
import { TAG_CONFIG } from '@/constants/tags.js';
import { getSentimentDisplay } from '@/constants/sentiment.js';
import clsx from 'clsx';

// ── Priority accent — left border + header chip ──────────────────────────────
const PRIORITY_CONFIG = {
  high:   { border: 'border-l-red-500',   chip: 'bg-red-100 text-red-700',    dot: 'bg-red-500',   label: 'High'   },
  medium: { border: 'border-l-amber-400', chip: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400', label: 'Med'    },
  low:    { border: 'border-l-slate-300', chip: 'bg-slate-100 text-slate-500', dot: 'bg-slate-300', label: 'Low'    },
};

// ── Horizontal tag scroller ───────────────────────────────────────────────────
// Shows all tags in a scroll row. A "+N more" badge appears when they overflow.
function TagScroller({ tags }) {
  const scrollRef = useRef(null);
  const [overflow, setOverflow] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Count how many chips are partially clipped (right edge past scroll container)
    const check = () => {
      const containerRight = el.getBoundingClientRect().right;
      const chips = el.querySelectorAll('[data-tag-chip]');
      let hidden = 0;
      chips.forEach((chip) => {
        if (chip.getBoundingClientRect().right > containerRight + 4) hidden++;
      });
      setOverflow(hidden);
    };

    check();
    el.addEventListener('scroll', check);
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', check); ro.disconnect(); };
  }, [tags]);

  if (!tags?.length) return null;

  return (
    <div className="relative flex items-center min-w-0">
      {/* Scrollable tag strip */}
      <div
        ref={scrollRef}
        className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1 min-w-0"
        style={{ maskImage: overflow > 0 ? 'linear-gradient(to right, black 70%, transparent 100%)' : 'none' }}
      >
        {tags.map((tag) => {
          const cfg = TAG_CONFIG?.[tag] || { label: tag, color: 'bg-slate-100 text-slate-600' };
          return (
            <span
              key={tag}
              data-tag-chip
              className={clsx(
                'inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0 leading-none',
                cfg.color
              )}
            >
              {cfg.label || tag}
            </span>
          );
        })}
      </div>

      {/* Overflow count badge — always in view */}
      {overflow > 0 && (
        <span className="ml-1 flex-shrink-0 text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md leading-none">
          +{overflow}
        </span>
      )}
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────
export default function ConversationItem({ conversation: c, isActive, onClick }) {
  const timeAgo = formatDistanceToNow(
    new Date(c.last_message_at || c.created_at), { addSuffix: true }
  );

  const priority   = PRIORITY_CONFIG[c.priority];
  const band       = getSentimentDisplay(c.sentiment, c.sentiment_score);
  const showSent   = c.sentiment && c.sentiment !== 'unknown';
  const hasTags    = (c.tags || []).length > 0;
  const showBottom = showSent || hasTags || c.primary_agent;

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left rounded-xl transition-all duration-150 group overflow-hidden',
        // Priority accent always owns the left border — never overridden
        'border-l-4',
        priority?.border || 'border-l-slate-200',
        // Active: indigo right border + tinted bg + outer ring
        // Idle:   plain white card with subtle shadow
        isActive
          ? 'bg-indigo-50 border border-indigo-200 border-r-4 border-r-indigo-500 shadow-md shadow-indigo-100'
          : 'bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 hover:bg-slate-50/50'
      )}
    >
      {/* ── Top section: avatar + name + priority chip + time ─────────────── */}
      <div className="flex items-start gap-2.5 px-3 pt-3 pb-2.5">
        <Avatar name={c.user_name || 'U'} size="sm" />

        <div className="flex-1 min-w-0">
          {/* Row 1: name + priority chip + time */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={clsx(
              'text-xs font-extrabold truncate flex-1 min-w-0',
              isActive ? 'text-indigo-900' : 'text-slate-900'
            )}>
              {c.user_name || 'Unknown'}
            </span>

            {/* Priority chip — compact, beside name */}
            {priority && (
              <span className={clsx(
                'inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0',
                priority.chip
              )}>
                <span className={clsx('w-1.5 h-1.5 rounded-full', priority.dot)} />
                {priority.label}
              </span>
            )}

            <span className="text-[10px] text-slate-400 font-medium tabular-nums flex-shrink-0">
              {timeAgo}
            </span>
          </div>

          {/* Row 2: subject */}
          <p className={clsx(
            'text-[11px] truncate leading-4 font-medium',
            isActive ? 'text-indigo-700' : 'text-slate-500'
          )}>
            {c.subject || 'No subject'}
          </p>
        </div>
      </div>

      {/* ── Divider ─────────────────────────────────────────────────────────── */}
      {showBottom && (
        <div className={clsx(
          'mx-3 border-t',
          isActive ? 'border-indigo-100' : 'border-slate-100'
        )} />
      )}

      {/* ── Bottom section: sentiment | tags | agent ──────────────────────── */}
      {showBottom && (
        <div className="flex items-center gap-2 px-3 py-2 min-w-0">

          {/* ZONE 1 — Sentiment: emoji + short label. Only non-neutral, non-unknown */}
          {showSent ? (
            <div className={clsx(
              'inline-flex items-center gap-1 flex-shrink-0 rounded-lg px-2 py-1 border',
              band.badge,
              band.pulse && 'animate-pulse'
            )}>
              <span className="text-sm leading-none">{band.emoji}</span>
              <span className={clsx('text-[10px] font-bold leading-none', band.text)}>
                {band.label}
              </span>
              {c.sentiment_score != null && (
                <span className={clsx('text-[9px] font-semibold opacity-60 tabular-nums', band.text)}>
                  {c.sentiment_score}
                </span>
              )}
            </div>
          ) : (
            /* Placeholder so tags always align right when sentiment absent */
            <div className="flex-shrink-0 w-0" />
          )}

          {/* ZONE 2 — Tags: horizontal scrollable strip */}
          {hasTags && (
            <div className="flex-1 min-w-0 overflow-hidden">
              <TagScroller tags={c.tags || []} />
            </div>
          )}

          {/* ZONE 3 — Assigned agent: always at far right */}
          {c.primary_agent && (
            <div
              className="flex-shrink-0 ml-auto"
              title={c.primary_agent.name}
            >
              <Avatar name={c.primary_agent.name} size="xs" />
            </div>
          )}
        </div>
      )}
    </button>
  );
}
