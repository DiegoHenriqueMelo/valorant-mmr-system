import JWT from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
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

export const tokenIsValid = (req: Request, res: Response, next: NextFunction) => {
  dotenv.config();
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warn("Token missing or malformed authorization header");
      return res.status(401).json({ statusCode: 401, message: "Token inválido" });
    }
    const token = authHeader.split(" ")[1];
    const decoded: any = JWT.verify(token, String(process.env.JWT_SECRET));
    (req as any).user = { email: decoded.idUser };
    next();
  } catch (e: any) {
    if (e.name === "TokenExpiredError") {
      logger.warn("Token validation failed -- token has expired");
      return res.status(401).json({ statusCode: 401, message: "Token expirado" });
    }
    logger.warn("Token validation failed -- invalid token", { error: String(e) });
    return res.status(401).json({ statusCode: 401, message: "Token inválido" });
  }
};
