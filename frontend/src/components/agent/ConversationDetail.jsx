import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  X,
  Sparkles,
  AlignLeft,
  Wand2,
  Clock,
  User,
  Copy,
  Check,
  Brain,
  Plus,
  Tag,
  AlertTriangle,
  Zap,
  TrendingUp,
  Shield,
  MessageCircle,
  Hash,
  UserPlus,
} from "lucide-react";
import { useConversationStore } from "@/store/conversationStore.js";
import { useUIStore } from "@/store/uiStore.js";
import { useAgentStore } from "@/store/agentStore.js";
import { useConversation } from "@/hooks/useConversation.js";
import { useAI } from "@/hooks/useAI.js";
import { conversationAPI } from "@/services/conversation.js";
import Avatar from "@/components/shared/Avatar.jsx";
import { formatDistanceToNow } from "date-fns";
import { PRIORITY_CONFIG, STATUS_CONFIG } from "@/constants/tags.js";
import { getSentimentDisplay, isFrustrated } from "@/constants/sentiment.js";
import clsx from "clsx";
import toast from "react-hot-toast";

// ── Icon map for audit actions ───────────────────────────────────────────────
const AUDIT_ICON = {
  "conversation.created": {
    icon: MessageCircle,
    color: "bg-indigo-500",
    ring: "ring-indigo-200",
  },
  "status.changed": {
    icon: Zap,
    color: "bg-amber-500",
    ring: "ring-amber-200",
  },
  "agent.assigned": {
    icon: User,
    color: "bg-green-500",
    ring: "ring-green-200",
  },
  "message.sent": {
    icon: MessageCircle,
    color: "bg-slate-400",
    ring: "ring-slate-200",
  },
};

const getAuditMeta = (action) =>
  AUDIT_ICON[action] || {
    icon: Clock,
    color: "bg-slate-400",
    ring: "ring-slate-200",
  };

const humanizeAction = (action) =>
  action.replace(/\./g, " › ").replace(/_/g, " ");

// ── AI Feature Card ───────────────────────────────────────────────────────────
// Each AI tool lives in a self-contained card with header, description, CTA, and result area.
function AICard({ icon, iconBg, title, description, action, children }) {
  return (
    <div className="border-b border-slate-100 last:border-0 p-3">
      {/* Card header */}
      <div className="flex items-start gap-2.5 mb-2.5">
        <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm", iconBg)}>
          {icon}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-xs font-bold text-slate-900 leading-none">{title}</p>
          <p className="text-[11px] text-slate-500 mt-1 leading-4">{description}</p>
        </div>
      </div>
      {/* Primary action button */}
      {action}
      {/* Result / expanded content */}
      {children}
    </div>
  );
}

// ── Coaching nudge ───────────────────────────────────────────────────────────
function CoachingNudge({ coaching, onDismiss }) {
  if (!coaching) return null;
  return (
    <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-3 animate-slide-up shadow-sm">
      <div className="flex items-start gap-2.5">
        <div className="w-6 h-6 rounded-lg bg-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
          <Brain className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-amber-800 mb-1 flex items-center gap-1">
            <span>Agent Coaching</span>
            <span className="text-[10px] bg-amber-200 text-amber-700 px-1 rounded font-semibold">
              LIVE
            </span>
          </p>
          <p className="text-xs text-amber-700 leading-4">{coaching}</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-amber-400 hover:text-amber-600 flex-shrink-0 transition-colors p-0.5"
          title="Dismiss"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ── Sentiment card ────────────────────────────────────────────────────────────
function SentimentCard({ conversation }) {
  const sentiment = conversation?.sentiment;
  const score = conversation?.sentiment_score ?? 50;
  if (!sentiment || sentiment === "unknown") return null;
  const band = getSentimentDisplay(sentiment, score);

  return (
    <div
      className={clsx("rounded-xl border p-3 space-y-2", band.bg, band.border)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{band.emoji}</span>
          <div>
            <p className={clsx("text-xs font-bold leading-none", band.text)}>
              {band.label}
            </p>
            <p
              className={clsx(
                "text-[10px] font-medium opacity-60 mt-0.5",
                band.text,
              )}
            >
              Customer sentiment
            </p>
          </div>
        </div>
        <div
          className={clsx(
            "text-lg font-black tabular-nums leading-none",
            band.text,
          )}
        >
          {score}
          <span className="text-[10px] font-medium opacity-50">/100</span>
        </div>
      </div>
      {/* Score bar */}
      <div className="h-2 rounded-full bg-black/10 overflow-hidden">
        <div
          className={clsx(
            "h-full rounded-full transition-all duration-700",
            band.bar,
          )}
          style={{ width: `${score}%` }}
        />
      </div>
      {conversation.sentiment_coaching && (
        <p className={clsx("text-[11px] leading-4 opacity-80", band.text)}>
          💡 {conversation.sentiment_coaching}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "ai", label: "Copilot", icon: Sparkles },
  { id: "info", label: "Details", icon: User },
  { id: "audit", label: "Activity", icon: Clock },
];

export default function ConversationDetail() {
  const {
    activeConversation,
    coachingNudge,
    dismissCoachingNudge,
    upsertConversation,
  } = useConversationStore();
  const { setAIPanel } = useUIStore();
  const currentAgent = useAgentStore((s) => s.currentAgent);
  const { fetchConversations } = useConversation();
  const {
    suggestion,
    summary,
    improved,
    draft,
    aiError,
    loading,
    suggestReply,
    summarize,
    improveTone,
    setSuggestion,
    setSummary,
    setImproved,
    setDraft,
    clearError,
  } = useAI();

  const [auditLog, setAuditLog] = useState([]);
  const [activeTab, setActiveTab] = useState("ai");
  const [copied, setCopied] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tagLoading, setTagLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [auditKey, setAuditKey] = useState(0); // bump to force audit refresh
  const tagInputRef = useRef(null);

  // ── Fetch audit log ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeConversation?.id) return;
    if (activeTab !== "audit") return;
    conversationAPI
      .getAuditLog(activeConversation.id)
      .then(({ data }) => setAuditLog(data.data))
      .catch(() => {});
  }, [activeConversation?.id, activeTab, auditKey]);

  // ── Tag management ──────────────────────────────────────────────────────
  const addTag = async (raw) => {
    const cleaned = raw.trim().toLowerCase().replace(/\s+/g, "-");
    if (!cleaned || !activeConversation) return;
    if ((activeConversation.tags || []).includes(cleaned)) {
      setTagInput("");
      return;
    }
    setTagLoading(true);
    try {
      await conversationAPI.addTag(activeConversation.id, cleaned);
      const updated = {
        ...activeConversation,
        tags: [...(activeConversation.tags || []), cleaned],
      };
      upsertConversation(updated);
      setTagInput("");
      setAuditKey((k) => k + 1); // refresh audit
    } catch (_) {
      toast.error("Failed to add tag");
    } finally {
      setTagLoading(false);
    }
  };

  const removeTag = async (tag) => {
    if (!activeConversation) return;
    try {
      await conversationAPI.removeTag(activeConversation.id, tag);
      const updated = {
        ...activeConversation,
        tags: (activeConversation.tags || []).filter((t) => t !== tag),
      };
      upsertConversation(updated);
      setAuditKey((k) => k + 1); // refresh audit
    } catch (_) {
      toast.error("Failed to remove tag");
    }
  };

  // ── Self-assign ─────────────────────────────────────────────────────────
  const handleSelfAssign = async () => {
    if (!activeConversation || assignLoading) return;
    setAssignLoading(true);
    try {
      const { data } = await conversationAPI.selfAssign(activeConversation.id);
      // Update the activeConversation agents list optimistically
      const newAgent = { ...data, role: "primary" };
      const updatedAgents = [
        ...(activeConversation.agents || []).filter((a) => a.role !== "primary"),
        newAgent,
      ];
      upsertConversation({
        ...activeConversation,
        agents: updatedAgents,
        primary_agent: data,
      });
      setAuditKey((k) => k + 1);
      // Refresh list so ticket moves out of Unassigned view if that's active
      fetchConversations();
      toast.success("Ticket assigned to you");
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Failed to assign ticket");
    } finally {
      setAssignLoading(false);
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImproveTone = async () => {
    if (!draft.trim()) return;
    const result = await improveTone(draft, activeConversation?.id);
    if (result) setImproved(result);
  };

  const activeCoaching =
    coachingNudge?.conversationId === activeConversation?.id &&
    isFrustrated(coachingNudge?.sentiment)
      ? coachingNudge.coaching
      : null;

  const priority = PRIORITY_CONFIG[activeConversation?.priority];
  const statusCfg = STATUS_CONFIG[activeConversation?.status];

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <aside className="w-full h-full flex flex-col bg-white border-l border-slate-200 overflow-hidden">
      {/* ── Panel header ─────────────────────────────────────────────────── */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200 flex-shrink-0 bg-gradient-to-r from-white to-indigo-50/30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 leading-none">
              AI Copilot
            </p>
            <p className="text-[10px] text-indigo-500 font-semibold mt-0.5">
              Powered by Con AI
            </p>
          </div>
        </div>
        <button
          onClick={() => setAIPanel(false)}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="px-3 pt-2.5 pb-2 border-b border-slate-100 flex-shrink-0">
        <div className="flex gap-0.5 bg-slate-100/80 rounded-xl p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={clsx(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold rounded-lg transition-all duration-200",
                activeTab === id
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-400 hover:text-slate-600",
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {/* ──────────────────────── AI TAB ─────────────────────────────── */}
        {activeTab === "ai" && (
          <div className="flex flex-col gap-0">

            {/* ── Coaching nudge (pinned at top) ──────────────────────── */}
            {activeCoaching && (
              <div className="p-3 border-b border-amber-100">
                <CoachingNudge coaching={activeCoaching} onDismiss={dismissCoachingNudge} />
              </div>
            )}

            {/* ── AI error banner ─────────────────────────────────────── */}
            {aiError && (
              <div className="mx-3 mt-3 flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 animate-fade-in">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-rose-700">AI Unavailable</p>
                  <p className="text-xs text-rose-600 leading-4 break-words mt-0.5">{aiError}</p>
                </div>
                <button onClick={clearError} className="text-rose-400 hover:text-rose-600 flex-shrink-0">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* ── CARD: Suggest Reply ─────────────────────────────────── */}
            <AICard
              icon={<Sparkles className="w-4 h-4 text-indigo-600" />}
              iconBg="bg-indigo-100"
              title="Suggest Reply"
              description="Generate a context-aware reply based on the conversation"
              action={
                suggestion ? null : (
                  <button
                    onClick={() => suggestReply(activeConversation.id)}
                    disabled={loading.reply}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 text-indigo-700 border border-indigo-200 hover:border-indigo-300 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"
                  >
                    {loading.reply ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                        Generating…
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Generate Reply
                      </>
                    )}
                  </button>
                )
              }
            >
              {suggestion && (
                <div className="mt-3 animate-slide-up">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-2">
                    <p className="text-xs text-slate-700 leading-5">{suggestion}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(suggestion)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold py-2 rounded-xl transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied!" : "Copy to clipboard"}
                    </button>
                    <button
                      onClick={() => setSuggestion("")}
                      className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </AICard>

            {/* ── CARD: Summarize ─────────────────────────────────────── */}
            <AICard
              icon={<AlignLeft className="w-4 h-4 text-violet-600" />}
              iconBg="bg-violet-100"
              title="Summarize"
              description="Get a concise TL;DR of the full conversation"
              action={
                summary ? null : (
                  <button
                    onClick={() => summarize(activeConversation.id)}
                    disabled={loading.summarize}
                    className="w-full flex items-center justify-center gap-2 bg-violet-50 hover:bg-violet-100 disabled:opacity-50 text-violet-700 border border-violet-200 hover:border-violet-300 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"
                  >
                    {loading.summarize ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                        Summarizing…
                      </>
                    ) : (
                      <>
                        <AlignLeft className="w-3.5 h-3.5" />
                        Summarize conversation
                      </>
                    )}
                  </button>
                )
              }
            >
              {summary && (
                <div className="mt-3 animate-slide-up">
                  <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 mb-2">
                    <p className="text-xs text-slate-700 leading-5 whitespace-pre-wrap">{summary}</p>
                  </div>
                  <button
                    onClick={() => setSummary("")}
                    className="w-full text-xs font-semibold text-slate-400 hover:text-slate-600 py-1.5 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                  >
                    Clear
                  </button>
                </div>
              )}
            </AICard>

            {/* ── CARD: Improve Tone ──────────────────────────────────── */}
            <AICard
              icon={<Wand2 className="w-4 h-4 text-emerald-600" />}
              iconBg="bg-emerald-100"
              title="Improve Tone"
              description="Paste a draft reply and get a polished, professional version"
            >
              <div className="mt-3 space-y-2">
                  <textarea
                    rows={3}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Paste your draft reply here…"
                    className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 resize-none leading-5"
                  />
                  <button
                    onClick={handleImproveTone}
                    disabled={!draft.trim() || loading.tone}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 text-emerald-700 border border-emerald-200 hover:border-emerald-300 text-xs font-bold py-2.5 rounded-xl transition-colors"
                  >
                    {loading.tone ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
                        Improving…
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3.5 h-3.5" />
                        Improve my tone
                      </>
                    )}
                  </button>
                  {improved && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 animate-slide-up">
                      <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-2">Improved version</p>
                      <p className="text-xs text-slate-700 leading-5 mb-3">{improved}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyToClipboard(improved)}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold py-2 rounded-xl transition-colors"
                        >
                          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copied ? "Copied!" : "Copy"}
                        </button>
                        <button
                          onClick={() => setImproved("")}
                          className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
            </AICard>

          </div>
        )}

        {/* ─────────────────────── DETAILS TAB ────────────────────────── */}
        {activeTab === "info" && activeConversation && (
          <div className="p-3 space-y-3">
            {/* ── Customer card ────────────────────────────────────── */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Customer
              </p>
              <div className="flex items-center gap-2.5">
                <Avatar name={activeConversation.user_name} size="md" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {activeConversation.user_name}
                  </p>
                  <p className="text-xs text-slate-500 font-medium truncate">
                    {activeConversation.user_email}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                    Opened{" "}
                    {formatDistanceToNow(
                      new Date(activeConversation.created_at),
                      { addSuffix: true },
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Status + Priority row ─────────────────────────── */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-2.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Status
                </p>
                <span
                  className={clsx(
                    "inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-lg w-full justify-center",
                    statusCfg?.color,
                  )}
                >
                  <span
                    className={clsx("w-1.5 h-1.5 rounded-full", statusCfg?.dot)}
                  />
                  {statusCfg?.label}
                </span>
              </div>
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-2.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Priority
                </p>
                <span
                  className={clsx(
                    "inline-flex items-center gap-1.5 text-xs font-bold w-full justify-center",
                    priority?.color || "text-slate-500",
                  )}
                >
                  <Shield className="w-3 h-3" />
                  {priority?.label || "—"}
                </span>
              </div>
            </div>

            {/* ── Sentiment card ────────────────────────────────── */}
            {activeConversation.sentiment &&
              activeConversation.sentiment !== "unknown" && (
                <SentimentCard conversation={activeConversation} />
              )}

            {/* ── Tags card ─────────────────────────────────────── */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <Hash className="w-3 h-3" /> Tags
              </p>

              {/* Scrollable tag row */}
              {(activeConversation.tags || []).length > 0 ? (
                <div className="flex gap-1.5 overflow-x-auto pb-1 mb-2 scrollbar-hide">
                  {(activeConversation.tags || []).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="opacity-50 hover:opacity-100 hover:text-rose-600 transition-opacity ml-0.5"
                        title="Remove tag"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 mb-2">No tags yet</p>
              )}

              {/* Add tag input */}
              <div className="flex gap-1.5">
                <input
                  ref={tagInputRef}
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag(tagInput);
                    }
                  }}
                  placeholder="Type a tag and press ↵"
                  maxLength={30}
                  className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                />
                <button
                  onClick={() => addTag(tagInput)}
                  disabled={!tagInput.trim() || tagLoading}
                  className="flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ── Assigned Agents ───────────────────────────────── */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <User className="w-3 h-3" /> Assigned Agents
              </p>
              {(activeConversation.agents || []).length > 0 ? (
                <div className="space-y-1.5">
                  {(activeConversation.agents || []).map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-2.5 bg-white rounded-lg px-2.5 py-2 border border-slate-200"
                    >
                      <Avatar name={a.name} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {a.name}
                        </p>
                        <p className="text-[10px] text-slate-400 capitalize font-semibold">
                          {a.role}
                        </p>
                      </div>
                      {a.role === "primary" && (
                        <span className="ml-auto text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded flex-shrink-0">
                          Primary
                        </span>
                      )}
                    </div>
                  ))}
                  {/* Allow re-assign to self if someone else is primary */}
                  {!(activeConversation.agents || []).find(
                    (a) => a.role === "primary" && String(a.id) === String(currentAgent?.id)
                  ) && (
                    <button
                      onClick={handleSelfAssign}
                      disabled={assignLoading}
                      className="w-full mt-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-dashed border-indigo-200 hover:border-indigo-300 rounded-lg transition-all disabled:opacity-50"
                    >
                      {assignLoading ? (
                        <div className="w-3.5 h-3.5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                      ) : (
                        <UserPlus className="w-3.5 h-3.5" />
                      )}
                      Take over as primary
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-400 py-1">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                      <User className="w-3 h-3" />
                    </div>
                    <p className="text-xs font-medium">Unassigned</p>
                  </div>
                  <button
                    onClick={handleSelfAssign}
                    disabled={assignLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {assignLoading ? (
                      <div className="w-3.5 h-3.5 border-2 border-indigo-300 border-t-white rounded-full animate-spin" />
                    ) : (
                      <UserPlus className="w-3.5 h-3.5" />
                    )}
                    Assign to me
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─────────────────────── ACTIVITY TAB ───────────────────────── */}
        {activeTab === "audit" && (
          <div className="p-3">
            {auditLog.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-slate-300" />
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  No activity yet
                </p>
              </div>
            ) : (
              <div className="space-y-0">
                {auditLog.map((entry, i) => {
                  const meta = getAuditMeta(entry.action);
                  const IconComp = meta.icon;
                  const isLast = i === auditLog.length - 1;
                  return (
                    <div key={entry.id} className="flex gap-3">
                      {/* Icon + connector line */}
                      <div className="flex flex-col items-center flex-shrink-0 w-6">
                        <div
                          className={clsx(
                            "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-white shadow-sm z-10",
                            meta.color,
                          )}
                        >
                          <IconComp className="w-3 h-3 text-white" />
                        </div>
                        {!isLast && (
                          <div className="w-px flex-1 bg-slate-200 my-1" />
                        )}
                      </div>

                      {/* Content */}
                      <div
                        className={clsx(
                          "pb-4 min-w-0 flex-1",
                          isLast && "pb-2",
                        )}
                      >
                        <p className="text-xs font-semibold text-slate-700 capitalize leading-tight">
                          {humanizeAction(entry.action)}
                        </p>
                        {entry.metadata &&
                          Object.keys(entry.metadata).length > 0 && (
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-4">
                              {entry.metadata.from && entry.metadata.to
                                ? `${entry.metadata.from} → ${entry.metadata.to}`
                                : JSON.stringify(entry.metadata)}
                            </p>
                          )}
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {formatDistanceToNow(new Date(entry.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
