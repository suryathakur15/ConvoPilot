import { create } from 'zustand';

export const useAgentStore = create((set) => ({
  agents: [],
  currentAgent: null,

  setAgents: (agents) => set({ agents }),
  setCurrentAgent: (agent) => set({ currentAgent: agent }),

  updateAgentStatus: (id, status) => set((state) => ({
    agents: state.agents.map((a) => a.id === id ? { ...a, status } : a),
    currentAgent: state.currentAgent?.id === id
      ? { ...state.currentAgent, status }
      : state.currentAgent,
  })),
}));
