import * as mmrService from "../services/mmr.service.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("mmr.controller");

export const register = async (mmr: {
  email: string;
  historico: [
    {
      kill: number;
      death: number;
      result: string;
      score: number;
    },
  ];
  token: string;
}): Promise<[number, string]> => {
  try {
    logger.info("Initiating MMR registration", { matchHistoryCount: mmr.historico.length });
    const result = await mmrService.register(mmr);
    if (result[0] === 201) {
      logger.info("MMR registration completed successfully");
    } else {
      logger.warn("MMR registration rejected", { statusCode: result[0] });
    }
    return [result[0], result[1]];
  } catch (e) {
    logger.error("Unexpected error during MMR registration", { error: String(e) });
    return [500, String(e)];
  }
};

export const getAll = async (): Promise<[number, any]> => {
  try {
    logger.info("Initiating MMR leaderboard retrieval");
    const result = await mmrService.getAll();
    if (result[0] === 200) {
      logger.info("MMR leaderboard retrieved successfully", { count: Array.isArray(result[1]) ? result[1].length : 0 });
    } else {
      logger.warn("MMR leaderboard retrieval failed", { statusCode: result[0] });
    }
    return [result[0], result[1]];
  } catch (e) {
    logger.error("Unexpected error during MMR leaderboard retrieval", { error: String(e) });
    return [500, String(e)];
  }
};
