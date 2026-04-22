import React, { useState, useEffect, useRef } from "react";
import { Search, RefreshCw, ChevronDown, UserCheck, Inbox, Users, Check } from "lucide-react";
import clsx from "clsx";
import { useConversationStore } from "@/store/conversationStore.js";
import { useAnalyticsStore } from "@/store/analyticsStore.js";
import { useAgentStore } from "@/store/agentStore.js";
import { useConversation } from "@/hooks/useConversation.js";
import ConversationItem from "./ConversationItem.jsx";

const TABS = [
  { label: "Open",    value: "open",    activeColor: "bg-indigo-600 text-white" },
  { label: "Snoozed", value: "snoozed", activeColor: "bg-amber-500 text-white"  },
  { label: "Closed",  value: "closed",  activeColor: "bg-slate-600 text-white"  },
];

// ── View options ──────────────────────────────────────────────────────────────
const VIEW_ALL         = "all";
const VIEW_MINE        = "mine";
const VIEW_UNASSIGNED  = "unassigned";

const VIEW_CONFIG = {
  [VIEW_ALL]: {
    label:       "All conversations",
    short:       "All",
    icon:        Users,
    description: "Every ticket in this status",
    assigned_to: null,
  },
  [VIEW_MINE]: {
    label:       "My conversations",
    short:       "Mine",
    icon:        UserCheck,
    description: "Tickets assigned to you",
    assigned_to: null, // resolved to currentAgent.id at runtime
  },
  [VIEW_UNASSIGNED]: {
    label:       "Unassigned",
    short:       "Unassigned",
    icon:        Inbox,
    description: "No agent assigned yet",
    assigned_to: "unassigned",
  },
};

// ── View dropdown ─────────────────────────────────────────────────────────────
function ViewDropdown({ view, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const cfg = VIEW_CONFIG[view];
  const Icon = cfg.icon;

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-lg text-xs font-semibold",
          "border transition-all",
          open
            ? "bg-white border-slate-300 shadow-sm text-slate-800"
            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300"
        )}
      >
        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{cfg.short}</span>
        <ChevronDown className={clsx("w-3 h-3 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl border border-slate-200 shadow-lg shadow-slate-100 py-1 z-30">
          <p className="px-3 pt-1.5 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            View
          </p>
          {Object.entries(VIEW_CONFIG).map(([key, opt]) => {
            const OptIcon = opt.icon;
            const active  = view === key;
            return (
              <button
                key={key}
                onClick={() => { onChange(key); setOpen(false); }}
                className={clsx(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                  active ? "bg-indigo-50" : "hover:bg-slate-50"
                )}
              >
                <div className={clsx(
                  "w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0",
                  active ? "bg-indigo-100" : "bg-slate-100"
                )}>
                  <OptIcon className={clsx("w-3.5 h-3.5", active ? "text-indigo-600" : "text-slate-500")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={clsx("text-xs font-semibold leading-none", active ? "text-indigo-700" : "text-slate-700")}>
                    {opt.label}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-none">{opt.description}</p>
                </div>
                {active && <Check className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ConversationList() {
  const { conversations, loading, filters, pagination, setFilters } = useConversationStore();
  const { fetchConversations, loadMore, openConversation, activeConversation } = useConversation();
  const { overview, fetchOverview } = useAnalyticsStore();
  const currentAgent = useAgentStore((s) => s.currentAgent);
  const [search, setSearch] = useState("");

  // Derive current view from store filter
  const view = !filters.assigned_to
    ? VIEW_ALL
    : filters.assigned_to === "unassigned"
      ? VIEW_UNASSIGNED
      : VIEW_MINE;

  const onViewChange = (newView) => {
    const cfg = VIEW_CONFIG[newView];
    const assigned_to =
      newView === VIEW_MINE ? (currentAgent?.id ?? null) : cfg.assigned_to;
    setFilters({ assigned_to });
    setSearch("");
  };

  useEffect(() => { fetchOverview(); }, []);
  useEffect(() => { fetchConversations(); }, [filters.status, filters.assigned_to]);

  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.subject?.toLowerCase().includes(q) ||
      c.user_name?.toLowerCase().includes(q)
    );
  });

  const countFor = (status) => {
    if (!overview) return null;
    const map = {
      open:    overview.open_conversations,
      snoozed: overview.snoozed_conversations,
      closed:  overview.closed_conversations,
    };
    const v = map[status];
    return v != null ? v : null;
  };

  const isSearching  = search.trim().length > 0;
  const showLoadMore = !isSearching && pagination.hasNext && !loading;
  const shownCount   = isSearching ? filtered.length : conversations.length;
  const totalCount   = isSearching ? filtered.length : (pagination.total ?? conversations.length);

  const emptyIcon  = view === VIEW_MINE ? UserCheck : view === VIEW_UNASSIGNED ? Inbox : Search;
  const emptyTitle = isSearching ? "No results"
    : view === VIEW_MINE       ? "No assigned tickets"
    : view === VIEW_UNASSIGNED ? "No unassigned tickets"
    : "All caught up!";
  const emptyBody  = isSearching ? `Nothing matched "${search}"`
    : view === VIEW_MINE       ? "You have no assigned tickets in this view"
    : view === VIEW_UNASSIGNED ? "Every ticket in this view has an owner"
    : `No ${filters.status} conversations`;

  return (
    <aside className="w-full h-full flex flex-col bg-white border-r border-slate-200 overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">Inbox</h2>
            {!isSearching && pagination.total > 0 && (
              <span className="text-[10px] font-medium text-slate-400 tabular-nums">
                {shownCount} / {totalCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <ViewDropdown view={view} onChange={onViewChange} />
            <button
              onClick={fetchConversations}
              disabled={loading}
              title="Refresh"
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white border border-transparent focus:border-indigo-300 transition-all"
            placeholder="Search by name or subject…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* ── Status tabs ─────────────────────────────────────────────────── */}
      <div className="px-2 pt-2 pb-1.5 flex-shrink-0">
        <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
          {TABS.map((tab) => {
            const active = filters.status === tab.value;
            const count  = view === VIEW_ALL ? countFor(tab.value) : null;
            return (
              <button
                key={tab.value}
                onClick={() => { setFilters({ status: tab.value }); setSearch(""); }}
                className={clsx(
                  "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-1 rounded-lg text-xs font-bold transition-all duration-200",
                  active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {tab.label}
                {count != null && (
                  <span className={clsx(
                    "text-[10px] font-bold min-w-[18px] h-4 flex items-center justify-center rounded-full px-1 tabular-nums transition-colors",
                    active ? tab.activeColor : "bg-slate-200 text-slate-500"
                  )}>
                    {count > 999 ? "999+" : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── List ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-2">
        {loading && conversations.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 px-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              {React.createElement(emptyIcon, { className: "w-5 h-5 text-slate-400" })}
            </div>
            <p className="text-sm font-medium text-slate-500">{emptyTitle}</p>
            <p className="text-xs text-slate-400 text-center">{emptyBody}</p>
          </div>
        ) : (
          <>
            <div className="space-y-1.5 px-2 pt-1.5">
              {filtered.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={activeConversation?.id === conv.id}
                  onClick={() => openConversation(conv)}
                />
              ))}
            </div>

            {showLoadMore && (
              <div className="px-2 pt-3 pb-1">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  Load more
                  <span className="text-slate-400">({totalCount - shownCount} remaining)</span>
                </button>
              </div>
            )}

            {loading && conversations.length > 0 && (
              <div className="flex items-center justify-center py-4">
                <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!isSearching && !pagination.hasNext && conversations.length > 0 && totalCount > 0 && (
              <p className="text-center text-[10px] text-slate-300 font-medium py-3 tabular-nums">
                All {totalCount} conversations loaded
              </p>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
