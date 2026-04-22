import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { redisSub } from '../config/redis.js';
import { registerConversationHandlers } from './conversation.handlers.js';
import { SOCKET_ROOMS, SOCKET_EVENTS } from '../constants/socket.js';
import { agentRepository } from '../repositories/agent.repository.js';
import { logger } from '../utils/logger.js';

// Track how many sockets each agent has open (for multi-tab support)
const agentSocketCount = new Map(); // agentId → Set of socketIds

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: env.server.corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  redisSub.subscribe('socket:broadcast', (err) => {
    if (err) logger.error('Redis subscribe error', { error: err.message });
  });

  redisSub.on('message', (channel, message) => {
    if (channel !== 'socket:broadcast') return;
    try {
      const { room, event, data } = JSON.parse(message);
      io.to(room).emit(event, data);
    } catch (err) {
      logger.error('Socket broadcast parse error', { error: err.message });
    }
  });

  io.on('connection', (socket) => {
    logger.debug('Socket connected', { id: socket.id });

    // Every connected client joins the global agents broadcast room so they
    // receive real-time sentiment updates without needing explicit subscription.
    socket.join(SOCKET_ROOMS.agents());

    registerConversationHandlers(io, socket);

    // Agent presence — emitted by agent dashboard on connect
    socket.on(SOCKET_EVENTS.AGENT_REGISTER, async ({ agentId }) => {
      if (!agentId) return;
      socket.data.agentId = agentId;

      if (!agentSocketCount.has(agentId)) agentSocketCount.set(agentId, new Set());
      agentSocketCount.get(agentId).add(socket.id);

      try {
        await agentRepository.updateStatus(agentId, 'online');
        logger.debug('Agent came online', { agentId });
      } catch (err) {
        logger.warn('Failed to set agent online', { agentId, error: err.message });
      }
    });

    socket.on('disconnect', async (reason) => {
      logger.debug('Socket disconnected', { id: socket.id, reason });

      const agentId = socket.data.agentId;
      if (!agentId) return;

      const sockets = agentSocketCount.get(agentId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          agentSocketCount.delete(agentId);
          try {
            await agentRepository.updateStatus(agentId, 'offline');
            logger.debug('Agent went offline', { agentId });
          } catch (err) {
            logger.warn('Failed to set agent offline', { agentId, error: err.message });
          }
        }
      }
    });

    socket.on('error', (err) => {
      logger.error('Socket error', { id: socket.id, error: err.message });
    });
  });

  logger.info('Socket.io initialized');
  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};
