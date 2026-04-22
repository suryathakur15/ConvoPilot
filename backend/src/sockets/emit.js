import { redisPub } from '../config/redis.js';

export const emitToRoom = async (room, event, data) => {
  await redisPub.publish('socket:broadcast', JSON.stringify({ room, event, data }));
};
