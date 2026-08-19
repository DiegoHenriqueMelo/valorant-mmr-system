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

export const getAll = async (): Promise<[number, any]> => {
  try {
    logger.info("Initiating user listing");
    const result = await authService.getAll();
    if (result[0] === 200) {
      logger.info("User listing completed successfully", { count: Array.isArray(result[1]) ? result[1].length : 0 });
    } else {
      logger.warn("User listing failed", { statusCode: result[0] });
    }
    return [result[0], result[1]];
  } catch (e) {
    logger.error("Unexpected error during user listing", { error: String(e) });
    return [500, String(e)];
  } finally {
    logger.debug("User listing handler finished");
  }
};

export const updatePassword = async (user: {
  email: string;
  currentPassword: string;
  newPassword: string;
}): Promise<[number, string]> => {
  try {
    logger.info("Initiating password update", { email: user.email });
    const result = await authService.updatePassword(user);
    if (result[0] === 200) {
      logger.info("Password updated successfully");
    } else {
      logger.warn("Password update rejected", { statusCode: result[0] });
    }
    return [result[0], result[1]];
  } catch (e) {
    logger.error("Unexpected error during password update", { error: String(e) });
    return [500, String(e)];
  } finally {
    logger.debug("Password update handler finished");
  }
};

export const deleteAccount = async (user: {
  email: string;
  password: string;
}): Promise<[number, string]> => {
  try {
    logger.info("Initiating account deletion", { email: user.email });
    const result = await authService.deleteAccount(user);
    if (result[0] === 200) {
      logger.info("Account deleted successfully");
    } else {
      logger.warn("Account deletion rejected", { statusCode: result[0] });
    }
    return [result[0], result[1]];
  } catch (e) {
    logger.error("Unexpected error during account deletion", { error: String(e) });
    return [500, String(e)];
  } finally {
    logger.debug("Account deletion handler finished");
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
