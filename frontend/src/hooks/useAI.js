import { useState, useEffect, useCallback } from 'react';
import { aiAPI } from '@/services/ai.js';
import { useConversationStore } from '@/store/conversationStore.js';
import toast from 'react-hot-toast';

const extractMessage = (err) =>
  err?.response?.data?.error?.message || err?.message || 'AI unavailable';

/**
 * useAI — manages AI feature state per conversation.
 *
 * Results (suggestion, summary, improved, draft) are stored in the global
 * aiCache keyed by conversationId. Switching away and back restores the last
 * result — no need to re-generate. Clearing the result removes it from cache.
 * Cache is in-memory only (session-scoped) so a page refresh always starts fresh.
 */
export const useAI = () => {
  const { activeConversation, setAICache } = useConversationStore();
  const convId = activeConversation?.id ?? null;

  // Read the cached state for the current conversation (or empty defaults)
  const cached = useConversationStore(
    (s) => (convId ? (s.aiCache[convId] ?? {}) : {})
  );

  const suggestion = cached.suggestion ?? '';
  const summary    = cached.summary    ?? '';
  const improved   = cached.improved   ?? '';
  const draft      = cached.draft      ?? '';

  const [aiError, setAIError] = useState('');
  const [loading, setLoading] = useState({ reply: false, summarize: false, tone: false });

  // Clear error when switching conversations
  useEffect(() => { setAIError(''); }, [convId]);

  // ── Cache writers ──────────────────────────────────────────────────────
  const setSuggestion = useCallback((v) => convId && setAICache(convId, { suggestion: v }), [convId, setAICache]);
  const setSummary    = useCallback((v) => convId && setAICache(convId, { summary: v }),    [convId, setAICache]);
  const setImproved   = useCallback((v) => convId && setAICache(convId, { improved: v }),   [convId, setAICache]);
  const setDraft      = useCallback((v) => convId && setAICache(convId, { draft: v }),      [convId, setAICache]);
  const clearError    = () => setAIError('');

  // ── AI actions ─────────────────────────────────────────────────────────
  const suggestReply = async (conversationId) => {
    setLoading((l) => ({ ...l, reply: true }));
    setAIError('');
    try {
      const { data } = await aiAPI.suggestReply(conversationId);
      setSuggestion(data.data.suggestion);
    } catch (err) {
      const msg = extractMessage(err);
      setAIError(msg);
      toast.error(msg, { duration: 5000 });
    } finally {
      setLoading((l) => ({ ...l, reply: false }));
    }
  };

  const summarize = async (conversationId) => {
    setLoading((l) => ({ ...l, summarize: true }));
    setAIError('');
    try {
      const { data } = await aiAPI.summarize(conversationId);
      setSummary(data.data.summary);
    } catch (err) {
      const msg = extractMessage(err);
      setAIError(msg);
      toast.error(msg, { duration: 5000 });
    } finally {
      setLoading((l) => ({ ...l, summarize: false }));
    }
  };

  const improveTone = async (draftText, conversationId = null) => {
    setLoading((l) => ({ ...l, tone: true }));
    setAIError('');
    try {
      const { data } = await aiAPI.improveTone(draftText, conversationId);
      const result = data.data.improved;
      setImproved(result);
      return result;
    } catch (err) {
      const msg = extractMessage(err);
      setAIError(msg);
      toast.error(msg, { duration: 5000 });
    } finally {
      setLoading((l) => ({ ...l, tone: false }));
    }
  };

  return {
    // State (reads from per-conversation cache)
    suggestion, summary, improved, draft, aiError, loading,
    // Setters
    setSuggestion, setSummary, setImproved, setDraft, clearError,
    // Actions
    suggestReply, summarize, improveTone,
  };
};
