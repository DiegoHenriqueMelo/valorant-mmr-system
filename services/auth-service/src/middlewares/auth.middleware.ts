import JWT from "jsonwebtoken";
import { createLogger } from "../utils/logger";

const logger = createLogger("middleware JWT");

export const createToken = async (
  role: string,
  id: string,
  ex: number,
): Promise<string | number> => {
  try {
    logger.info("CREATE TOKEN STARTED");
    const secret: string = String(process.env.JWT_SECRET);
    const token: string = JWT.sign({ idUSer: id, roleUser: role }, secret, {
      expiresIn: ex,
    });
    return token;
  } catch (e) {
    logger.error("CREATE TOKEN ERROR");
    logger.debug(`status: 500, message: ${String(e)}`);
    return 500;
  } finally {
    logger.info("CREATE TOKEN COMPLETED");
  }
};
