import { Request, Response, NextFunction } from "express";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("LoggerEndpoint")

export const loggerEndpoint = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const startTime = Date.now();

  logger.info(`→ ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });

  if (req.body && Object.keys(req.body).length > 0) {
    logger.debug("Request body", { body: req.body });
  }

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    if (statusCode >= 500) {
      logger.error(`← ${req.method} ${req.originalUrl} ${statusCode}`, {
        statusCode,
        duration: `${duration}ms`,
      });
    } else if (statusCode >= 400) {
      logger.warn(`← ${req.method} ${req.originalUrl} ${statusCode}`, {
        statusCode,
        duration: `${duration}ms`,
      });
    } else {
      logger.info(`← ${req.method} ${req.originalUrl} ${statusCode}`, {
        statusCode,
        duration: `${duration}ms`,
      });
    }
  });
  next();
};
