import * as playerService from "../service/player.service.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("player.controller");

export const create = async (player: {
  nickname: string;
  rank: number;
  agenteFavorito: number;
  regiao: string;
  email: string;
}): Promise<[number, string]> => {
  try {
    logger.info("Initiating player profile creation", { region: player.regiao });
    const result = await playerService.create(player);
    if (result[0] === 201) {
      logger.info("Player profile created successfully");
    } else {
      logger.warn("Player profile creation rejected", { statusCode: result[0] });
    }
    return [result[0], result[1]];
  } catch (e) {
    logger.error("Unexpected error during player profile creation", { error: String(e) });
    return [500, String(e)];
  }
};

export const getPlayer = async (player: { email: string }): Promise<[number, any]> => {
  try {
    logger.info("Initiating player profile retrieval");
    const result = await playerService.login(player.email);
    if (result[0] === 200) {
      logger.info("Player profile retrieved successfully");
    } else {
      logger.warn("Player profile retrieval failed", { statusCode: result[0] });
    }
    return [result[0], result[1]];
  } catch (e) {
    logger.error("Unexpected error during player profile retrieval", { error: String(e) });
    return [500, String(e)];
  }
};
