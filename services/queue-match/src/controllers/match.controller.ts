import * as matchService from "../services/match.service.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("match.controller");

export const getAll = async (): Promise<[number, any]> => {
  try {
    logger.info("Match listing request received -- delegating to match service");
    const result = await matchService.getAll();
    if (result[0] === 200) {
      logger.info("Match listing completed successfully", { count: Array.isArray(result[1]) ? result[1].length : 0 });
    } else {
      logger.warn("Match listing returned unexpected status", { statusCode: result[0] });
    }
    return [result[0], result[1]];
  } catch (e) {
    logger.error("Unexpected error during match listing", { error: String(e) });
    return [500, String(e)];
  }
};

export const getById = async (id: string): Promise<[number, any]> => {
  try {
    logger.info("Match retrieval by id request received", { id });
    const result = await matchService.getById(id);
    if (result[0] === 200) {
      logger.info("Match retrieved successfully", { id });
    } else {
      logger.warn("Match retrieval failed", { statusCode: result[0], id });
    }
    return [result[0], result[1]];
  } catch (e) {
    logger.error("Unexpected error during match retrieval by id", { error: String(e) });
    return [500, String(e)];
  }
};

export const deleteById = async (id: string): Promise<[number, string]> => {
  try {
    logger.info("Match deletion request received", { id });
    const result = await matchService.deleteById(id);
    if (result[0] === 200) {
      logger.info("Match deleted successfully", { id });
    } else {
      logger.warn("Match deletion returned unexpected status", { statusCode: result[0], id });
    }
    return [result[0], result[1]];
  } catch (e) {
    logger.error("Unexpected error during match deletion", { error: String(e) });
    return [500, String(e)];
  }
};

export const match = async (): Promise<[number, string]> => {
  try {
    logger.info("Match generation request received -- delegating to match service");
    const result = await matchService.match();
    if (result[0] === 201) {
      logger.info("Match generation completed successfully");
    } else if (result[0] === 202) {
      logger.info("Match generation deferred -- insufficient players in queue");
    } else {
      logger.warn("Match generation returned unexpected status", { statusCode: result[0] });
    }
    return [result[0], result[1]];
  } catch (e) {
    logger.error("Unexpected error during match generation", { error: String(e) });
    return [500, String(e)];
  }
};
