import { SOCKET_EVENTS, SOCKET_ROOMS } from '../constants/socket.js';
import { messageService } from '../services/message.service.js';
import { runPostMessageJobs } from '../services/messageJobs.js';
import { emitToRoom } from './emit.js';
import { logger } from '../utils/logger.js';

export const registerConversationHandlers = (io, socket) => {
  socket.on(SOCKET_EVENTS.JOIN_CONVERSATION, ({ conversationId }) => {
    if (!conversationId) return;
    const room = SOCKET_ROOMS.conversation(conversationId);
    socket.join(room);
    logger.debug('Socket joined room', { socketId: socket.id, room });
  });

  socket.on(SOCKET_EVENTS.LEAVE_CONVERSATION, ({ conversationId }) => {
    const room = SOCKET_ROOMS.conversation(conversationId);
    socket.leave(room);
  });

  socket.on(SOCKET_EVENTS.SEND_MESSAGE, async (payload) => {
    const { conversationId, content, senderType, senderId, messageType, parentMessageId } = payload;

    if (!conversationId || !content || !senderType || !senderId) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Missing required message fields' });
      return;
    }

    try {
      const message = await messageService.send({
        conversation_id: conversationId,
        sender_type: senderType,
        sender_id: senderId,
        content,
        message_type: messageType ?? 'text',
        parent_message_id: parentMessageId ?? null,
      });

      // messageService.send() already emitted NEW_MESSAGE via Redis pub/sub.
      // Fire AI background jobs for user messages (non-blocking).
      if (senderType === 'user') {
        runPostMessageJobs(conversationId, content);
      }
    } catch (err) {
      logger.error('Socket send_message error', { error: err.message });
      socket.emit(SOCKET_EVENTS.ERROR, { message: err.message });
    }
  });

  socket.on(SOCKET_EVENTS.TYPING_START, async ({ conversationId, senderId }) => {
    if (!conversationId || !senderId) return;
    const room = SOCKET_ROOMS.conversation(conversationId);
    await emitToRoom(room, SOCKET_EVENTS.TYPING_INDICATOR, { senderId, isTyping: true });
  });

  socket.on(SOCKET_EVENTS.TYPING_STOP, async ({ conversationId, senderId }) => {
    if (!conversationId || !senderId) return;
    const room = SOCKET_ROOMS.conversation(conversationId);
    await emitToRoom(room, SOCKET_EVENTS.TYPING_INDICATOR, { senderId, isTyping: false });
  });
};

