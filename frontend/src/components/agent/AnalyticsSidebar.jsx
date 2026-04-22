import React, { useEffect } from "react";
import { TrendingUp, Users, Clock, Zap } from "lucide-react";
import { useAnalyticsStore } from "@/store/analyticsStore.js";

/**
 * Stats bar under the main header.
 *
 * Only shows metrics that are NOT already visible in the inbox tabs
 * (Open / Snoozed / Closed counts live there).
 *
 * Reads from the shared analyticsStore — no extra API call.
 */
const STATS = [
  {
    key:    "new_today",
    icon:   TrendingUp,
    label:  "New today",
    color:  "text-emerald-700",
    bg:     "bg-emerald-50",
    border: "border-emerald-200",
    dot:    "bg-emerald-500",
  },
  {
    key:    "agents_online",
    icon:   Users,
    label:  "Agents online",
    color:  "text-violet-700",
    bg:     "bg-violet-50",
    border: "border-violet-200",
    dot:    "bg-violet-500",
  },
];

export default function AnalyticsSidebar() {
  const { overview, fetchOverview } = useAnalyticsStore();

  // Trigger fetch — the store debounces so this won't double-fetch
  useEffect(() => { fetchOverview(); }, []);

  if (!overview) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-200 flex-shrink-0">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1 flex-shrink-0">
        Live
      </span>

      {STATS.map(({ key, icon: Icon, label, color, bg, border, dot }) => {
        const value = overview[key];
        if (value == null) return null;
        return (
          <div
            key={key}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${bg} ${border} flex-shrink-0`}
          >
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
            <span className="text-[11px] text-slate-600 font-medium">{label}</span>
            <span className={`text-xs font-bold tabular-nums ${color}`}>
              {value}
            </span>
          </div>
        );
      })}

      {/* Separator + last updated hint */}
      <span className="ml-auto text-[10px] text-slate-300 font-medium flex-shrink-0 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        refreshes on tab switch
      </span>
    </div>
  );
}
