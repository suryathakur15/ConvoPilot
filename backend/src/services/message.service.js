import { messageRepository } from '../repositories/message.repository.js';
import { conversationRepository } from '../repositories/conversation.repository.js';
import { getPagination, buildPaginationMeta } from '../utils/pagination.js';
import { MESSAGE_TYPE } from '../constants/message.js';
import { emitToRoom } from '../sockets/emit.js';
import { SOCKET_EVENTS, SOCKET_ROOMS } from '../constants/socket.js';
import { redis } from '../config/redis.js';
import { logger } from '../utils/logger.js';

export const msgCountKey = (conversationId) => `conversation:${conversationId}:msg_count`;

export const messageService = {
  getByConversation: async (conversationId, queryParams) => {
    const { page, limit, offset } = getPagination(queryParams);
    const include_notes = queryParams.include_notes !== 'false';

    const [{ rows }, { rows: countRows }] = await Promise.all([
      messageRepository.findByConversation({ conversation_id: conversationId, limit, offset, include_notes }),
      messageRepository.count(conversationId),
    ]);

    return {
      messages: rows,
      pagination: buildPaginationMeta(parseInt(countRows[0].count), page, limit),
    };
  },

  send: async ({ conversation_id, sender_type, sender_id, content, message_type, parent_message_id }) => {
    const { rows: convRows } = await conversationRepository.findById(conversation_id);
    if (!convRows[0]) throw Object.assign(new Error('Conversation not found'), { status: 404 });
    if (convRows[0].status === 'closed') {
      throw Object.assign(new Error('Cannot send message to a closed conversation'), { status: 409 });
    }

    if (parent_message_id) {
      const { rows: parentRows } = await messageRepository.findById(parent_message_id);
      if (!parentRows[0] || parentRows[0].conversation_id !== conversation_id) {
        throw Object.assign(new Error('Parent message not found in this conversation'), { status: 404 });
      }
    }

    const { rows } = await messageRepository.create({
      conversation_id,
      sender_type,
      sender_id,
      content,
      message_type,
      parent_message_id,
    });

    // Touch conversation updated_at so it bubbles to top of list
    await conversationRepository.updateStatus(conversation_id, convRows[0].status, convRows[0].snoozed_until);

    const message = rows[0];

    // Increment the Redis user-message counter used by the sentiment throttle.
    // Fire-and-forget — a Redis hiccup must never fail the message send.
    if (sender_type === 'user') {
      redis.incr(msgCountKey(conversation_id)).catch((err) =>
        logger.warn('Redis msg_count incr failed (non-fatal)', { conversation_id, error: err.message })
      );
    }

    // Broadcast immediately so every connected client (REST or socket path) sees
    // the new message in real-time without waiting for a socket SEND_MESSAGE event.
    await emitToRoom(
      SOCKET_ROOMS.conversation(conversation_id),
      SOCKET_EVENTS.NEW_MESSAGE,
      message,
    );

    return message;
  },

  getContextMessages: async (conversationId, limit = 20) => {
    const { rows } = await messageRepository.getContextMessages(conversationId, limit);
    return rows.reverse();
  },
};
