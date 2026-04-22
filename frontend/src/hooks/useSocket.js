import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useConversationStore } from '@/store/conversationStore.js';
import { useUIStore } from '@/store/uiStore.js';
import { useAgentStore } from '@/store/agentStore.js';
import { SOCKET_EVENTS } from '@/constants/events.js';

let socketInstance = null;

export const getSocket = () => socketInstance;

export const useSocket = () => {
  const initialized = useRef(false);
  const appendMessage      = useConversationStore((s) => s.appendMessage);
  const upsertConversation = useConversationStore((s) => s.upsertConversation);
  const applysentiment     = useConversationStore((s) => s.applysentiment);
  const setTyping          = useUIStore((s) => s.setTyping);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // In Docker: nginx proxies /socket.io → backend. In local dev: direct to backend port.
    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
    socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Register this agent with the server so presence tracking works correctly.
    // This ensures the assignment service only picks actually-connected agents.
    socketInstance.on('connect', () => {
      const { currentAgent } = useAgentStore.getState();
      if (currentAgent?.id) {
        socketInstance.emit(SOCKET_EVENTS.AGENT_REGISTER, { agentId: currentAgent.id });
      }
    });

    socketInstance.on(SOCKET_EVENTS.NEW_MESSAGE, (message) => {
      appendMessage(message);
    });

    socketInstance.on(SOCKET_EVENTS.TYPING_INDICATOR, ({ senderId, isTyping }) => {
      setTyping(senderId, isTyping);
    });

    socketInstance.on(SOCKET_EVENTS.STATUS_CHANGED, ({ conversationId, status }) => {
      upsertConversation({ id: conversationId, status });
    });

    // Live sentiment — updates inbox dot + coaching nudge in AI panel
    socketInstance.on(SOCKET_EVENTS.SENTIMENT_UPDATED, (payload) => {
      applysentiment(payload);
    });

    // New conversation created (e.g. from customer portal) — push to agent inbox
    socketInstance.on(SOCKET_EVENTS.CONVERSATION_CREATED, (conversation) => {
      const { filters } = useConversationStore.getState();
      // Only add to inbox if it matches the current filter (usually 'open')
      if (!filters.status || filters.status === conversation.status) {
        upsertConversation(conversation);
      }
    });

    return () => {
      socketInstance?.disconnect();
      socketInstance = null;
      initialized.current = false;
    };
  }, []);

  return socketInstance;
};
