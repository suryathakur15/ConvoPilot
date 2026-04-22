import { create } from 'zustand';

export const useUIStore = create((set) => ({
  sidebarOpen: true,
  aiPanelOpen: false,
  typingUsers: {},

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleAIPanel: () => set((state) => ({ aiPanelOpen: !state.aiPanelOpen })),
  setAIPanel: (open) => set({ aiPanelOpen: open }),

  setTyping: (senderId, isTyping) => set((state) => {
    const typingUsers = { ...state.typingUsers };
    if (isTyping) typingUsers[senderId] = true;
    else delete typingUsers[senderId];
    return { typingUsers };
  }),

  clearTyping: () => set({ typingUsers: {} }),
}));
