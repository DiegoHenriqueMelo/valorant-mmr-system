import { createLogger } from "../../utils/logger.js";
import dotenv from "dotenv";

const logger = createLogger("get rank");

export const getRank = async (token: string): Promise<number> => {
  dotenv.config();

  const URL: string =
    "http://localhost:" + String(process.env.PLAYER_PORT) + "/api/player/me";

  const response = await fetch(URL, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Erro na requisição: ${response.status}`);
  }

  const data = await response.json();
  const rank: number = data.player.rank;
  
  logger.info(`Rank resgatado: ${rank}`);
  return rank;
};
