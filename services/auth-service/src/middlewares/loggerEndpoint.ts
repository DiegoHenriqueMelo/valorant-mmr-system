import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("http");

const SENSITIVE_FIELDS = new Set(["password", "passwordhash", "token", "secret", "apikey"]);

const maskBody = (body: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(body).map(([key, value]) => [
      key,
      SENSITIVE_FIELDS.has(key.toLowerCase()) ? "[REDACTED]" : value,
    ]),
  );

export const loggerEndpoint = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const startTime = Date.now();
  const requestId = randomUUID().split("-")[0];
  (req as any).requestId = requestId;

  logger.info(`Incoming request -- ${req.method} ${req.originalUrl}`, {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    contentType: req.get("content-type") ?? "none",
  });

  if (req.body && Object.keys(req.body).length > 0) {
    logger.debug("Request body received", { requestId, body: maskBody(req.body) });
  }

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const meta = { requestId, statusCode, duration: `${duration}ms` };

    if (statusCode >= 500) {
      logger.error(`Response sent -- ${req.method} ${req.originalUrl} ${statusCode} (${duration}ms)`, meta);
    } else if (statusCode >= 400) {
      logger.warn(`Response sent -- ${req.method} ${req.originalUrl} ${statusCode} (${duration}ms)`, meta);
    } else {
      logger.info(`Response sent -- ${req.method} ${req.originalUrl} ${statusCode} (${duration}ms)`, meta);
    }
  });

  next();
};
