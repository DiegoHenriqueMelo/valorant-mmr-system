import JWT from "jsonwebtoken";
import { createLogger } from "../utils/logger";

const logger = createLogger("auth.middleware");

export const createToken = async (
  role: string,
  id: string,
  ex: number,
): Promise<string | number> => {
  try {
    logger.debug(`Generating JWT token -- role: ${role}, expiresIn: ${ex}s`);
    const secret: string = String(process.env.JWT_SECRET);
    const token: string = JWT.sign({ idUser: id, roleUser: role }, secret, {
      expiresIn: ex,
    });
    logger.debug("JWT token generated successfully");
    return token;
  } catch (e) {
    logger.error("JWT token generation failed", { error: String(e) });
    return 500;
  }
};
