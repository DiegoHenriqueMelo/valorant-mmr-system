import JWT from "jsonwebtoken";
import { createLogger } from "../utils/logger.js";
import { Request, Response, NextFunction } from "express";

const logger = createLogger("middleware JWT");

interface TokenPayload {
  idUser: string;
  roleUser: string;
  iat: number;
  exp: number;
}

export const createToken = async (
  role: string,
  id: string,
  ex: number,
): Promise<string | number> => {
  try {
    logger.info("CREATE TOKEN STARTED");
    const secret: string = String(process.env.JWT_SECRET);
    const token: string = JWT.sign({ idUser: id, roleUser: role }, secret, {
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
      res.status(401).json({
        statusCode: 401,
        message: "Token não fornecido",
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
    (req as any).mmr = {
      email: decoded.idUser,
      token: token,
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
