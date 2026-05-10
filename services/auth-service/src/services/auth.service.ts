import bcrypt from "bcrypt";
import * as userRepository from "../repositories/user.repository.js";
import { createToken } from "../middlewares/auth.middleware.js";
import dotenv from "dotenv";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("auth.services");

export const register = async (user: {
  email: string;
  password: string;
}): Promise<[number, string]> => {
  try {
    logger.info("SERVICE STARTED");
    const salt: number = 10;
    logger.debug("ENCRYPTING PASSWORD");
    const passHased = bcrypt.hashSync(user.password, salt);
    if (!passHased) {
      logger.debug("FAILED TO ENCRYPT PASSWORD");
      throw new Error("Não foi possivel criptografar senha");
    }
    const userInserted: [number, string] = await userRepository.insert(
      user.email,
      passHased,
      new Date(),
      new Date(),
    );
    return [userInserted[0], userInserted[1]];
  } catch (e) {
    logger.error("SERVICE ERROR");
    logger.debug(`status: 500, message: ${String(e)}`);
    return [500, String(e)];
  } finally {
    logger.info("SERVICE COMPLETED");
  }
};

export const login = async (user: {
  email: string;
  password: string;
}): Promise<[number, string]> => {
  try {
    logger.info("SERVICE STARTED");
    dotenv.config();

    const EX: number = Number(process.env.JWT_EXPIRES_IN);

    const [status, getUser] = await userRepository.findByEmail(user.email);

    if (status !== 200) throw new Error(getUser);

    logger.debug("VALIDATING PASSWORD");
    const passIsValid = await bcrypt.compare(
      user.password,
      getUser.passwordHash,
    );

    if (!passIsValid) {
      logger.debug("FAILED TO VALIDATING PASSWORD");
      throw new Error("Credenciais inválidas");
    }

    logger.info("GENERATING TOKEN");
    const token = await createToken("player", getUser.email, EX);

    if (token === 500) {
      logger.debug("FAILED TO GENERATING TOKEN");
      throw new Error("Não foi possivel criar token");
    }

    return [200, `Token: ${token}`];
  } catch (e) {
    return [500, String(e)];
  } finally {
  }
};
