import { useCallback } from "react";
import { useConversationStore } from "@/store/conversationStore.js";
import { useAnalyticsStore } from "@/store/analyticsStore.js";
import { conversationAPI } from "@/services/conversation.js";
import { messageAPI } from "@/services/message.js";
import { getSocket } from "./useSocket.js";
import { SOCKET_EVENTS } from "@/constants/events.js";
import toast from "react-hot-toast";

const PAGE_SIZE = 20;

export const useConversation = () => {
  const {
    conversations,
    activeConversation,
    messages,
    loading,
    messagesLoading,
    pagination,
    setConversations,
    appendConversations,
    setPagination,
    setActiveConversation,
    setMessages,
    setLoading,
    setMessagesLoading,
    upsertConversation,
    filters,
  } = useConversationStore();

  const invalidateAnalytics = useAnalyticsStore((s) => s.invalidate);

  /**
   * Fetch page 1 of conversations for the current filters.
   * Replaces the list (used on filter change or manual refresh).
   */
  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const currentFilters = useConversationStore.getState().filters;
      const params = {
        ...Object.fromEntries(Object.entries(currentFilters).filter(([, v]) => v)),
        page: 1,
        limit: PAGE_SIZE,
      };
      const { data } = await conversationAPI.getAll(params);
      setConversations(data.data);
      setPagination(data.pagination ?? { page: 1, total: data.data.length, totalPages: 1, hasNext: false });
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Append the next page to the existing list.
   * Called by the "Load more" button.
   */
  const loadMore = useCallback(async () => {
    const { pagination: pg, filters: f, loading: l } = useConversationStore.getState();
    if (l || !pg.hasNext) return;

    setLoading(true);
    try {
      const params = {
        ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)),
        page: pg.page + 1,
        limit: PAGE_SIZE,
      };
      const { data } = await conversationAPI.getAll(params);
      appendConversations(data.data);
      setPagination(data.pagination ?? pg);
    } finally {
      setLoading(false);
    }
  }, []);

  const openConversation = useCallback(
    async (conversation) => {
      // Already open — don't re-fetch or re-join the room
      if (conversation.id === activeConversation?.id) return;

      const socket = getSocket();
      if (activeConversation) {
        socket?.emit(SOCKET_EVENTS.LEAVE_CONVERSATION, {
          conversationId: activeConversation.id,
        });
      }
      // Set lightweight version immediately so UI renders without waiting
      setActiveConversation(conversation);
      socket?.emit(SOCKET_EVENTS.JOIN_CONVERSATION, {
        conversationId: conversation.id,
      });

      // Load full detail (agents, tags, sentiment) + messages in parallel
      setMessagesLoading(true);
      try {
        const [{ data: detail }, { data: msgs }] = await Promise.all([
          conversationAPI.getById(conversation.id),
          messageAPI.getByConversation(conversation.id, { limit: 50 }),
        ]);
        setActiveConversation(detail.data);
        upsertConversation(detail.data);
        setMessages(msgs.data);
      } finally {
        setMessagesLoading(false);
      }
    },
    [activeConversation],
  );

  const updateStatus = useCallback(async (conversationId, status, actorId = null) => {
    const { data } = await conversationAPI.updateStatus(conversationId, {
      status,
      actor_id: actorId,
    });
    upsertConversation(data.data);
    invalidateAnalytics(); // counts changed — next fetch will be fresh
    toast.success(`Conversation marked as ${status}`);
    return data.data;
  }, []);

  return {
    conversations,
    activeConversation,
    messages,
    loading,
    messagesLoading,
    pagination,
    fetchConversations,
    loadMore,
    openConversation,
    updateStatus,
  };
};
