import React, { useCallback, useEffect, useRef, useState } from 'react';
import ConversationList    from '@/components/agent/ConversationList.jsx';
import MessageThread       from '@/components/agent/MessageThread.jsx';
import ConversationDetail  from '@/components/agent/ConversationDetail.jsx';
import AgentHeader         from '@/components/agent/AgentHeader.jsx';
import AnalyticsSidebar    from '@/components/agent/AnalyticsSidebar.jsx';
import ResizeHandle        from '@/components/shared/ResizeHandle.jsx';
import { useSocket }       from '@/hooks/useSocket.js';
import { useConversation } from '@/hooks/useConversation.js';
import { useAgentStore }   from '@/store/agentStore.js';
import { useUIStore }      from '@/store/uiStore.js';
import { agentAPI }        from '@/services/agent.js';

// ── panel width constraints (px) ─────────────────────────────────────────────
const INBOX_MIN  = 200;
const INBOX_MAX  = 520;
const DETAIL_MIN = 220;
const DETAIL_MAX = 480;

const INBOX_DEFAULT  = 300;
const DETAIL_DEFAULT = 280;

export default function AgentDashboard() {
  useSocket();
  const { fetchConversations, activeConversation } = useConversation();
  const { setAgents, setCurrentAgent } = useAgentStore();
  const { aiPanelOpen }                = useUIStore();
  const [bootReady, setBootReady]      = useState(false);

  // Panel widths
  const [inboxW,  setInboxW]  = useState(INBOX_DEFAULT);
  const [detailW, setDetailW] = useState(DETAIL_DEFAULT);

  // Stable drag callbacks (use refs for bounds to avoid stale closures)
  const inboxWRef  = useRef(inboxW);
  const detailWRef = useRef(detailW);
  useEffect(() => { inboxWRef.current  = inboxW;  }, [inboxW]);
  useEffect(() => { detailWRef.current = detailW; }, [detailW]);

  const handleInboxDrag = useCallback((dx) => {
    setInboxW((w) => Math.min(INBOX_MAX, Math.max(INBOX_MIN, w + dx)));
  }, []);

  const handleDetailDrag = useCallback((dx) => {
    // dragging the right handle: pulling left (negative dx) makes detail wider
    setDetailW((w) => Math.min(DETAIL_MAX, Math.max(DETAIL_MIN, w - dx)));
  }, []);

  useEffect(() => {
    const boot = async () => {
      try {
        // Restore session — if the agent has a valid cookie, this returns their profile.
        // Importing here to avoid a circular dep at the module level.
        const { agentAuthAPI } = await import('@/services/agentAuth.js');
        const { data: meData } = await agentAuthAPI.me();
        setCurrentAgent(meData.data);
      } catch {
        // No valid session → send to login
        window.location.replace('/agent-login');
        return;
      }
      // Load all agents (for the store) and conversations in parallel
      const { data } = await agentAPI.getAll();
      setAgents(data.data);
      await fetchConversations();
      setBootReady(true);
    };
    boot();
  }, []);

  if (!bootReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading ConvoPilot…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden">
      <AgentHeader />
      <AnalyticsSidebar />

      {/* ── Main workspace ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Inbox panel */}
        <div
          className="flex-shrink-0 flex flex-col min-h-0 overflow-hidden"
          style={{ width: inboxW }}
        >
          <ConversationList />
        </div>

        {/* Divider: inbox ↔ chat */}
        <ResizeHandle onDrag={handleInboxDrag} />

        {/* Chat + detail wrapper */}
        <div className="flex flex-1 min-w-0 min-h-0 overflow-hidden">

          {/* Message thread — takes remaining space */}
          <div className="flex flex-1 min-w-0 min-h-0 overflow-hidden">
            <MessageThread />
          </div>

          {/* Divider: chat ↔ AI panel (only when panel is open) */}
          {aiPanelOpen && activeConversation && (
            <>
              <ResizeHandle onDrag={handleDetailDrag} />

              {/* AI / Details panel */}
              <div
                className="flex-shrink-0 min-h-0 overflow-hidden"
                style={{ width: detailW }}
              >
                <ConversationDetail />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
