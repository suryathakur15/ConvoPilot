/**
 * Fire-and-forget background jobs that run after every user message.
 * Called from both the REST controller and the socket handler so the
 * behaviour is identical regardless of which send path is used.
 */
import { aiService } from './ai.service.js';
import { conversationRepository } from '../repositories/conversation.repository.js';
import { emitToRoom } from '../sockets/emit.js';
import { SOCKET_EVENTS, SOCKET_ROOMS } from '../constants/socket.js';
import { SENTIMENT } from '../constants/ai.js';
import { logger } from '../utils/logger.js';
import { redis } from '../config/redis.js';
import { msgCountKey } from './message.service.js';

export const runPostMessageJobs = async (conversationId, content) => {
  // Intentionally not awaited at the call site — never blocks the response.
  // We fire auto-tag every message; sentiment only every 5th to keep AI costs down.
  autoTagConversation(conversationId, content);
  maybeSentiment(conversationId);
};

/**
 * Run sentiment analysis only on the 1st user message and every 5th after that.
 *
 * Counter source priority:
 *   1. Redis  — `conversation:{id}:msg_count`  (fast, already INCR'd by message.service)
 *   2. DB     — COUNT query fallback if Redis is unavailable
 *   3. Run anyway if both fail — never silently skip sentiment
 */
const maybeSentiment = async (conversationId) => {
  let count = null;

  // ── 1. Try Redis first ────────────────────────────────────────────────────
  try {
    const val = await redis.get(msgCountKey(conversationId));
    if (val !== null) count = parseInt(val, 10);
  } catch (err) {
    logger.warn('Redis msg_count GET failed, falling back to DB', { conversationId, error: err.message });
  }

  // ── 2. DB fallback ────────────────────────────────────────────────────────
  if (count === null) {
    try {
      const { rows } = await conversationRepository.getMessageCount(conversationId);
      count = parseInt(rows[0]?.count ?? '0', 10);
    } catch (err) {
      logger.warn('DB msg_count fallback also failed — running sentiment anyway', { conversationId, error: err.message });
    }
  }

  // ── 3. Decide whether to run ──────────────────────────────────────────────
  // count === null means both sources failed → run to be safe
  if (count === null || count === 1 || count % 5 === 0) {
    analyzeSentimentAndBroadcast(conversationId);
  }
};

const autoTagConversation = async (conversationId, content) => {
  try {
    const result = await aiService.autoTag(conversationId, content);
    if (!result?.data?.tags?.length) return;
    for (const tag of result.data.tags) {
      await conversationRepository.addTag(conversationId, tag);
    }
  } catch (err) {
    logger.warn('Auto-tag failed (non-fatal)', { conversationId, error: err.message });
  }
};

const analyzeSentimentAndBroadcast = async (conversationId) => {
  try {
    const result = await aiService.analyzeSentiment(conversationId);
    if (!result?.data) {
      logger.warn('Sentiment: no data returned from AI service', { conversationId });
      return;
    }

    const { sentiment, score, coaching } = result.data;

    logger.info('Sentiment result', {
      conversationId,
      sentiment,
      score,
      hasCoaching: !!coaching,
    });

    await conversationRepository.updateSentiment(conversationId, {
      sentiment: sentiment ?? SENTIMENT.NEUTRAL,
      score:     score    ?? 50,
      coaching:  coaching ?? '',
    });

    await emitToRoom(
      SOCKET_ROOMS.agents(),
      SOCKET_EVENTS.SENTIMENT_UPDATED,
      { conversationId, sentiment, score, coaching: coaching ?? '' },
    );

    logger.debug('Sentiment broadcast sent', { conversationId, sentiment, score });
  } catch (err) {
    logger.warn('Sentiment analysis failed (non-fatal)', { conversationId, error: err.message });
  }
};
