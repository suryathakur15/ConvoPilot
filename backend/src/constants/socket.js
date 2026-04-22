export const SOCKET_EVENTS = {
  // Client → Server
  JOIN_CONVERSATION: 'join_conversation',
  LEAVE_CONVERSATION: 'leave_conversation',
  SEND_MESSAGE: 'send_message',
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  AGENT_REGISTER: 'agent_register',

  // Server → Client
  NEW_MESSAGE:           'new_message',
  AGENT_JOINED:          'agent_joined',
  STATUS_CHANGED:        'status_changed',
  TYPING_INDICATOR:      'typing_indicator',
  CONVERSATION_ASSIGNED: 'conversation_assigned',
  AI_SUGGESTION_READY:   'ai_suggestion_ready',
  SENTIMENT_UPDATED:     'sentiment_updated',
  CONVERSATION_CREATED:  'conversation_created',
  ERROR: 'socket_error',
};

export const SOCKET_ROOMS = {
  conversation: (id) => `conversation:${id}`,
  agents: () => 'agents',
};
