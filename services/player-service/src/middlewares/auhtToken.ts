import JWT from "jsonwebtoken";
import dotenv from "dotenv";
import { Request, Response, NextFunction } from "express";
import { createLogger } from "../utils/logger.js";
dotenv.config();

const logger = createLogger("auth token");

interface TokenPayload {
  idUser: string;
  roleUser: string;
  iat: number;
  exp: number;
}

export const tokenIsValid = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    logger.info("AUTH TOKEN STARTED");

    const authHeader = req.headers["authorization"];

    if (!authHeader) {
      logger.warn("Token não fornecido no header Autorization");
      res.status(400).json({
        statusCode: 401,
        message: "Token não forneciso",
      });
      return;
    }
    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      logger.warn("Formato do token inválido");
      res.status(401).json({
        statusCode: 401,
        messageSistem: "Formato do token inválido. Use: Bearer <token>",
      });
      return;
    }

    const token = parts[1];
    const secret: string = String(process.env.JWT_SECRET);

    logger.info("Validando token...");

    const decoded = (await JWT.verify(token, secret)) as TokenPayload;
    const email = String(decoded.idUser);

    if (!decoded) {
      logger.warn("Não foi possivel decodificar");
      res.status(401).json({
        statusCode: 401,
        messageSistem: "Não foi possivel decodificar",
      });
      return;
    }

    logger.debug(`DECODED: ${JSON.stringify(decoded, null, 2)}`);
    logger.debug(`EMAIL: ${email}`);

    if (!decoded.idUser == undefined) {
      logger.warn("Não foi possivel decodificar");
      res.status(401).json({
        statusCode: 401,
        messageSistem: "Não foi possivel decodificar",
      });
    }

    logger.info(`Autenticação bem-sucedida - User Email: ${decoded.idUser}`);
    (req as any).user = {
      email: decoded.idUser,
    };

    next();
  } catch (error) {
    if (error instanceof JWT.TokenExpiredError) {
      logger.error("Token expirado");
      res.status(401).json({
        statusCode: 401,
        messageSistem: "Token expirado. Faça login novamente",
        body: null,
      });
      return;
    }

    if (error instanceof JWT.JsonWebTokenError) {
      logger.error("Token inválido");
      res.status(401).json({
        statusCode: 401,
        messageSistem: "Token inválido",
        body: null,
      });
      return;
    }

    logger.error("Erro na validação do token:", error);
    res.status(500).json({
      statusCode: 500,
      messageSistem: "Erro interno na autenticação",
      body: null,
    });
  }
};
