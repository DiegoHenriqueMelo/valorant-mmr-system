import { createLogger } from "../../utils/logger.js";
import dotenv from "dotenv";

const logger = createLogger("player-service.client");

export const getRank = async (token: string): Promise<number> => {
  dotenv.config();

  const url = `http://${process.env.PLAYER_HOST ?? "localhost"}:${process.env.PLAYER_PORT}/api/player/me`;

  logger.debug("Requesting player rank from player-service", { endpoint: url });

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    logger.error("player-service responded with a non-OK status", { statusCode: response.status });
    throw new Error(`Erro na requisição: ${response.status}`);
  }

  const data = await response.json();
  const rank: number = data.player.rank;

  logger.debug("Player rank score retrieved from player-service", { rankScore: rank });
  return rank;
};
