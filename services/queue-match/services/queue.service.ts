import { redisClient } from "../config/redis.js";
import { Player } from "../models/class/Player.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("queue.service");
const QUEUE_KEY = "match:waiting_queue";

export const getWaitingPlayers = async (): Promise<Player[]> => {
  const items = await redisClient.lRange(QUEUE_KEY, 0, -1);
  return items.map((item) => JSON.parse(item) as Player);
};

export const setWaitingPlayers = async (players: Player[]): Promise<void> => {
  await redisClient.del(QUEUE_KEY);
  if (players.length > 0) {
    await redisClient.rPush(QUEUE_KEY, players.map((p) => JSON.stringify(p)));
  }
  logger.info(`Fila de espera: ${players.length} jogador(es)`);
};
