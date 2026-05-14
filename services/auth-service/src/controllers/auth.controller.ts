import * as authService from "../services/auth.service.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("auth.controller");

export const register = async (user: {
  email: string;
  password: string;
}): Promise<[number, string]> => {
  try {
    logger.info("Initiating user registration");
    const result = await authService.register(user);
    return [result[0], result[1]];
  } catch (e) {
    logger.error("Unexpected error during user registration", { error: String(e) });
    return [500, String(e)];
  } finally {
    logger.debug("User registration handler finished");
  }
};

export const login = async (user: {
  email: string;
  password: string;
}): Promise<[number, string]> => {
  try {
    logger.info("Initiating user authentication");
    const result = await authService.login(user);
    return [result[0], result[1]];
  } catch (e) {
    logger.error("Unexpected error during user authentication", { error: String(e) });
    return [500, String(e)];
  } finally {
    logger.debug("User authentication handler finished");
  }
};
