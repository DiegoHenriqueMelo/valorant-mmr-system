import { redisClient } from "../config/redis.js";
import { Player } from "../models/class/Player.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("queue.service");
const QUEUE_KEY = "match:waiting_queue";

export const getWaitingPlayers = async (): Promise<Player[]> => {
  const items = await redisClient.lRange(QUEUE_KEY, 0, -1);
  const players = items.map((item) => JSON.parse(item) as Player);
  logger.debug(`Waiting queue loaded from Redis`, { playersInQueue: players.length, redisKey: QUEUE_KEY });
  return players;
};

export const setWaitingPlayers = async (players: Player[]): Promise<void> => {
  await redisClient.del(QUEUE_KEY);
  if (players.length > 0) {
    await redisClient.rPush(QUEUE_KEY, players.map((p) => JSON.stringify(p)));
  }

  if (players.length === 0) {
    logger.info("Waiting queue cleared -- all players were matched");
  } else {
    logger.section("WAITING QUEUE UPDATED", {
      "Players persisted to Redis": players.length,
      "Redis key                 ": QUEUE_KEY,
    });
  }
};
