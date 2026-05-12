import * as mmrService from "../services/mmr.service.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("auth.controller");

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
    logger.info("CONTROLLER STARTED");
    const result = await mmrService.register(mmr);
    return [result[0], result[1]];
  } catch (e) {
    logger.error("CONTROLLER ERROR");
    logger.debug(`status: 500, message: ${String(e)}`);
    return [500, String(e)];
  } finally {
    logger.info("CONTROLLER COMPLETED");
  }
};

export const getAll = async (): Promise<[number, any]> => {
  try {
    logger.info("CONTROLLER STARTED");
    const result = await mmrService.getAll();
    return [result[0], result[1]];
  } catch (e) {
    logger.error("CONTROLLER ERROR");
    logger.debug(`status: 500, message: ${String(e)}`);
    return [500, String(e)];
  } finally {
    logger.info("CONTROLLER COMPLETED");
  }
};
