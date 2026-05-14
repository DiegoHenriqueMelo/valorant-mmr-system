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
