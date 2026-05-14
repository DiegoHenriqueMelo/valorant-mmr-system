import * as matchService from "../services/match.service.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("match.controller");

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
