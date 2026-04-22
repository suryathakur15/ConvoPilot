import React, { useEffect } from "react";
import { Bot, LogOut } from "lucide-react";
import { useAgentStore } from "@/store/agentStore.js";
import { useUIStore } from "@/store/uiStore.js";
import { useConversationStore } from "@/store/conversationStore.js";
import { agentAPI } from "@/services/agent.js";
import { agentAuthAPI } from "@/services/agentAuth.js";
import { AGENT_STATUS_CONFIG } from "@/constants/tags.js";
import Avatar from "@/components/shared/Avatar.jsx";

const STATUS_CYCLE = ["online", "busy", "offline"];

const STATUS_LABEL = {
  online:  "Online",
  busy:    "Busy",
  offline: "Offline",
};

export default function AgentHeader() {
  const { currentAgent, updateAgentStatus } = useAgentStore();
  const { toggleAIPanel } = useUIStore();
  const { conversations } = useConversationStore();

  const openCount = conversations.filter((c) => c.status === "open").length;
  const statusCfg = AGENT_STATUS_CONFIG[currentAgent?.status || "offline"];

  // ⌘K / Ctrl+K toggles AI panel from anywhere in the app
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggleAIPanel();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleAIPanel]);

  const cycleStatus = async () => {
    if (!currentAgent) return;
    const next =
      STATUS_CYCLE[
        (STATUS_CYCLE.indexOf(currentAgent.status) + 1) % STATUS_CYCLE.length
      ];
    try {
      await agentAPI.updateStatus(currentAgent.id, next);
      updateAgentStatus(currentAgent.id, next);
    } catch (_) {}
  };

  return (
    <header className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 flex-shrink-0 z-20">
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-bold text-slate-900 text-sm tracking-tight">
          ConvoPilot
        </span>
        {openCount > 0 && (
          <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-md tabular-nums">
            {openCount} open
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {/* Agent status — click to cycle */}
        <button
          onClick={cycleStatus}
          title="Click to change status"
          className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <Avatar name={currentAgent?.name || "A"} size="sm" />
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${statusCfg?.dot}`} />
            <span className="text-xs font-medium text-slate-700">
              {currentAgent?.name?.split(" ")[0]}
            </span>
            <span className={`text-[10px] font-semibold ${statusCfg?.color || 'text-slate-400'} hidden sm:inline`}>
              · {STATUS_LABEL[currentAgent?.status] || "Offline"}
            </span>
          </div>
        </button>

        {/* Logout */}
        <button
          onClick={async () => {
            try { await agentAuthAPI.logout(); } catch {}
            window.location.replace('/agent-login');
          }}
          title="Sign out"
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
