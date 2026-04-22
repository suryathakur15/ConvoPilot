import { create } from 'zustand';
import { analyticsAPI } from '@/services/analytics.js';

/**
 * Shared analytics store — fetched once on app mount, read by any component.
 * Prevents the ConversationList + AnalyticsSidebar from each making their own
 * identical /analytics/overview call.
 */
export const useAnalyticsStore = create((set, get) => ({
  overview: null,     // { open_conversations, snoozed_conversations, closed_conversations, new_today, agents_online }
  loading:  false,
  lastFetchAt: null,

  fetchOverview: async () => {
    // Debounce: don't re-fetch if we already have data from the last 60 seconds
    const { lastFetchAt, loading } = get();
    if (loading) return;
    if (lastFetchAt && Date.now() - lastFetchAt < 60_000) return;

    set({ loading: true });
    try {
      const { data } = await analyticsAPI.overview();
      set({ overview: data.data, lastFetchAt: Date.now() });
    } catch (_) {
      // non-critical — UI degrades gracefully
    } finally {
      set({ loading: false });
    }
  },

  // Called after status changes so counts stay current
  invalidate: () => set({ lastFetchAt: null }),
}));
