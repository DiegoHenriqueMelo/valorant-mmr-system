import { createClient } from "redis";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("redis");

export const redisClient = createClient({ url: process.env.REDIS_URL });

redisClient.on("error", (err) => logger.error(`Redis error: ${err}`));

export const connectRedis = async (): Promise<void> => {
  await redisClient.connect();
  logger.info("Redis conectado");
};
