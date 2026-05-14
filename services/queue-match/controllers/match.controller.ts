import * as matchService from "../services/match.service.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("match.controller");

export const match = async (): Promise<[number, string]> => {
  try {
    logger.info("CONTROLLER STARTED");
    const result = await matchService.match();
    return [result[0], result[1]];
  } catch (e) {
    logger.error("CONTROLLER ERROR");
    logger.debug(`status: 500, message: ${String(e)}`);
    return [500, String(e)];
  } finally {
    logger.info("CONTROLLER COMPLETED");
  }
};

// export const getAll = async (): Promise<[number, any]> => {
//   try {
//     logger.info("CONTROLLER STARTED");
//     const result = await mmrService.getAll();
//     return [result[0], result[1]];
//   } catch (e) {
//     logger.error("CONTROLLER ERROR");
//     logger.debug(`status: 500, message: ${String(e)}`);
//     return [500, String(e)];
//   } finally {
//     logger.info("CONTROLLER COMPLETED");
//   }
// };
