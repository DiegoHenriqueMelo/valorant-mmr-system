import * as authService from "../services/auth.service.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("auth.controller");

export const register = async (user: {
  email: string;
  password: string;
}): Promise<[number, string]> => {
  try {
    logger.info("CONTROLLER STARTED");
    const result = await authService.register(user);
    return [result[0], result[1]];
  } catch (e) {
    logger.error("CONTROLLER ERROR");
    logger.debug(`status: 500, message: ${String(e)}`);
    return [500, String(e)];
  } finally {
    logger.info("CONTROLLER COMPLETED");
  }
};

export const login = async (user: {
  email: string;
  password: string;
}): Promise<[number, string]> => {
  try {
    logger.info("CONTROLLER STARTED");
    const result = await authService.login(user);
    return [result[0], result[1]];
  } catch (e) {
    logger.error("CONTROLLER ERROR");
    logger.debug(`status: 500, message: ${String(e)}`);
    return [500, String(e)];
  } finally {
    logger.info("CONTROLLER COMPLETED");
  }
};
