import { createClient, RedisClientType } from "redis";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("redis");

export const redisClient: RedisClientType = createClient({
  username: "default",
  password: String(process.env.REDIS_PASS),
  socket: {
    host: String(process.env.REDIS_HOST),
    port: Number(process.env.REDIS_PORT),
  },
});

redisClient.on("error", (err: Error & { errors?: Error[] }) => {
  const causes = err.errors?.map((e) => e.message) ?? [];
  logger.error("Redis client encountered an error", {
    error: err.message || String(err),
    ...(causes.length > 0 && { causes }),
  });
});

redisClient.on("reconnecting", () =>
  logger.warn("Redis client is attempting to reconnect"),
);

export const connectRedis = async (): Promise<void> => {
  logger.info("Connecting to Redis...");
  await redisClient.connect();
  logger.info(`Redis connected -- url: ${process.env.REDIS_URL ?? "default"}`);
};
