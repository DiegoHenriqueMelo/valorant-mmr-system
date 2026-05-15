import bcrypt from "bcrypt";
import * as userRepository from "../repositories/user.repository.js";
import { createToken } from "../middlewares/auth.middleware.js";
import dotenv from "dotenv";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("auth.service");

export const register = async (user: {
  email: string;
  password: string;
}): Promise<[number, string]> => {
  try {
    logger.info("Starting user registration flow");
    const BCRYPT_ROUNDS = 10;
    logger.debug(`Hashing password with bcrypt (rounds: ${BCRYPT_ROUNDS})`);
    const passHased = bcrypt.hashSync(user.password, BCRYPT_ROUNDS);
    if (!passHased) {
      logger.error("bcrypt returned a falsy value -- password hashing failed");
      throw new Error("Não foi possivel criptografar senha");
    }
    logger.debug("Password hashed successfully");
    const userInserted: [number, string] = await userRepository.insert(
      user.email,
      passHased,
      new Date(),
      new Date(),
    );
    if (userInserted[0] === 201) {
      logger.info("User registration completed successfully");
    } else {
      logger.warn("User registration rejected by repository", { statusCode: userInserted[0] });
    }
    return [userInserted[0], userInserted[1]];
  } catch (e) {
    logger.error("User registration failed", { error: String(e) });
    return [500, String(e)];
  }
};

export const getAll = async (): Promise<[number, any]> => {
  try {
    logger.info("Fetching all user accounts");
    const [status, users] = await userRepository.findAll();
    if (status !== 200) {
      logger.warn("Repository returned an error during user listing", { statusCode: status });
      throw new Error(users);
    }
    logger.info("User listing completed successfully", { count: users.length });
    return [200, users];
  } catch (e) {
    logger.error("Failed to retrieve user list", { error: String(e) });
    return [500, String(e)];
  }
};

export const updatePassword = async (user: {
  email: string;
  currentPassword: string;
  newPassword: string;
}): Promise<[number, string]> => {
  try {
    logger.info("Starting password update flow", { email: user.email });
    const BCRYPT_ROUNDS = 10;

    const [status, getUser] = await userRepository.findByEmail(user.email);
    if (status !== 200) {
      logger.warn("Password update failed -- user not found", { statusCode: status });
      throw new Error(getUser);
    }

    logger.debug("Validating current password before update");
    const passIsValid = await bcrypt.compare(user.currentPassword, getUser.passwordHash);
    if (!passIsValid) {
      logger.warn("Password update rejected -- current password mismatch");
      return [401, "Senha atual inválida"];
    }

    logger.debug("Hashing new password");
    const newHash = bcrypt.hashSync(user.newPassword, BCRYPT_ROUNDS);
    if (!newHash) {
      logger.error("bcrypt returned a falsy value during password update");
      throw new Error("Não foi possivel criptografar nova senha");
    }

    const [updateStatus, updateMessage] = await userRepository.updatePassword(user.email, newHash);
    if (updateStatus === 200) {
      logger.info("Password updated successfully", { email: user.email });
    } else {
      logger.warn("Password update rejected by repository", { statusCode: updateStatus });
    }
    return [updateStatus, updateMessage];
  } catch (e) {
    logger.error("Password update failed", { error: String(e) });
    return [500, String(e)];
  }
};

export const deleteAccount = async (user: {
  email: string;
  password: string;
}): Promise<[number, string]> => {
  try {
    logger.info("Starting account deletion flow", { email: user.email });

    const [status, getUser] = await userRepository.findByEmail(user.email);
    if (status !== 200) {
      logger.warn("Account deletion failed -- user not found", { statusCode: status });
      throw new Error(getUser);
    }

    logger.debug("Validating password before account deletion");
    const passIsValid = await bcrypt.compare(user.password, getUser.passwordHash);
    if (!passIsValid) {
      logger.warn("Account deletion rejected -- password mismatch");
      return [401, "Credenciais inválidas"];
    }

    const [deleteStatus, deleteMessage] = await userRepository.deleteByEmail(user.email);
    if (deleteStatus === 200) {
      logger.info("Account deleted successfully", { email: user.email });
    } else {
      logger.warn("Account deletion rejected by repository", { statusCode: deleteStatus });
    }
    return [deleteStatus, deleteMessage];
  } catch (e) {
    logger.error("Account deletion failed", { error: String(e) });
    return [500, String(e)];
  }
};

export const login = async (user: {
  email: string;
  password: string;
}): Promise<[number, string]> => {
  try {
    logger.info("Starting user authentication flow");
    dotenv.config();

    const EX: number = Number(process.env.JWT_EXPIRES_IN);

    const [status, getUser] = await userRepository.findByEmail(user.email);

    if (status !== 200) {
      logger.warn("Authentication failed -- user not found or repository error", { statusCode: status });
      throw new Error(getUser);
    }

    logger.debug("Validating password against stored hash");
    const passIsValid = await bcrypt.compare(user.password, getUser.passwordHash);

    if (!passIsValid) {
      logger.warn("Authentication failed -- password mismatch");
      throw new Error("Credenciais inválidas");
    }

    logger.debug("Password validated -- generating JWT token");
    const token = await createToken("player", getUser.email, EX);

    if (token === 500) {
      logger.error("JWT token generation returned an error status");
      throw new Error("Não foi possivel criar token");
    }

    logger.info("User authenticated successfully -- token issued");
    return [200, String(token)];
  } catch (e) {
    logger.error("User authentication failed", { error: String(e) });
    return [500, String(e)];
  }
};
