import { create } from 'zustand';

export const useConversationStore = create((set, get) => ({
  conversations:     [],
  activeConversation: null,
  messages:          [],
  loading:           false,
  messagesLoading:   false,
  filters:           { status: 'open', priority: null, assigned_to: null },
  pagination:        { page: 1, total: 0, totalPages: 1, hasNext: false },

  // Latest coaching nudge — { conversationId, coaching, sentiment } | null
  // Populated automatically when a frustrated sentiment arrives via socket.
  coachingNudge: null,

  setConversations: (conversations) => set({ conversations }),
  appendConversations: (more) => set((state) => ({
    conversations: [...state.conversations, ...more.filter(
      (c) => !state.conversations.find((e) => e.id === c.id)
    )],
  })),
  setPagination: (pagination) => set({ pagination }),

  upsertConversation: (conv) => set((state) => {
    const exists = state.conversations.find((c) => c.id === conv.id);
    // Keep activeConversation in sync so the detail panel reflects changes immediately
    // (tag add/remove, status changes, etc.) without requiring a full re-fetch.
    const updatedActive =
      state.activeConversation?.id === conv.id
        ? { ...state.activeConversation, ...conv }
        : state.activeConversation;

    if (exists) {
      return {
        conversations: state.conversations.map((c) =>
          c.id === conv.id ? { ...c, ...conv } : c
        ),
        activeConversation: updatedActive,
      };
    }
    return { conversations: [conv, ...state.conversations], activeConversation: updatedActive };
  }),

  /**
   * Called by the socket listener when sentiment_updated arrives.
   * Updates the in-memory conversation object so the inbox dot refreshes,
   * and sets coachingNudge if the sentiment is frustrated.
   */
  applysentiment: ({ conversationId, sentiment, score, coaching }) => {
    set((state) => {
      // Use string coercion so integer IDs from DB match string IDs from socket payloads
      const idStr = String(conversationId);
      const updatedConversations = state.conversations.map((c) =>
        String(c.id) === idStr
          ? { ...c, sentiment, sentiment_score: score, sentiment_coaching: coaching }
          : c
      );

      // Keep activeConversation in sync
      const updatedActive =
        String(state.activeConversation?.id) === idStr
          ? { ...state.activeConversation, sentiment, sentiment_score: score, sentiment_coaching: coaching }
          : state.activeConversation;

      // Surface coaching nudge for any upset score (frustrated category) with a tip.
      // Score ≤ 44 corresponds to the three upset bands.
      const isUpset = sentiment === 'frustrated' || score <= 44;
      const coachingNudge =
        isUpset && coaching
          ? { conversationId, coaching, sentiment, score }
          : state.coachingNudge?.conversationId === conversationId
            ? null  // clear if same convo recovered to neutral/happy
            : state.coachingNudge;

      return {
        conversations:     updatedConversations,
        activeConversation: updatedActive,
        coachingNudge,
      };
    });
  },

  dismissCoachingNudge: () => set({ coachingNudge: null }),

  setActiveConversation: (conversation) =>
    set({ activeConversation: conversation, messages: [] }),

  setMessages: (messages) => set({ messages }),

  appendMessage: (message) => set((state) => {
    if (state.messages.find((m) => m.id === message.id)) return {};
    return { messages: [...state.messages, message] };
  }),

  setLoading:         (loading)         => set({ loading }),
  setMessagesLoading: (messagesLoading) => set({ messagesLoading }),
  setFilters:         (filters)         => set((state) => ({ filters: { ...state.filters, ...filters } })),

  // ── Per-conversation AI result cache ───────────────────────────────────
  // Shape: { [conversationId]: { suggestion, summary, improved, draft } }
  // Lives for the session only — stale results are fine here because agents
  // know when they generated them. We don't persist across refreshes because
  // a new session should start fresh (conversation may have new messages).
  aiCache: {},

  setAICache: (conversationId, patch) =>
    set((state) => ({
      aiCache: {
        ...state.aiCache,
        [conversationId]: { ...(state.aiCache[conversationId] ?? {}), ...patch },
      },
    })),

  getAICache: (conversationId) =>
    useConversationStore.getState().aiCache[conversationId] ?? {},
}));
