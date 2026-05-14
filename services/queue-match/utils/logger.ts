import winston from "winston";
import dotenv from "dotenv";
dotenv.config();

type LogMeta = Record<string, unknown>;

export const createLogger = (context?: string) => {
  const logFormat = winston.format.printf(
    ({ timestamp, level, message, stack, ...meta }) => {
      const contextStr = context ? `[${context}]` : "";
      const metaStr = Object.keys(meta).length
        ? ` | ${JSON.stringify(meta)}`
        : "";
      const stackStr = stack ? `\n${stack}` : "";

      return `${timestamp} ${level.toUpperCase()} ${contextStr} ${message}${metaStr}${stackStr}`;
    },
  );
  const logLevel =
    process.env.LOG_LEVEL ||
    (process.env.NODE_ENV === "production" ? "info" : "debug");

  const winstonInstance = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.errors({ stack: true }),
      winston.format.colorize({ all: true }),
      logFormat,
    ),
    transports: [
      new winston.transports.Console({}),
      new winston.transports.File({
        filename: "logs/error.log",
        level: "error",
      }),
      new winston.transports.File({
        filename: "logs/combined.log",
      }),
    ],
  });

  return {
    info: (message: string, meta?: LogMeta) =>
      winstonInstance.info(message, meta),

    error: (message: string, meta?: LogMeta) =>
      winstonInstance.error(message, meta),

    warn: (message: string, meta?: LogMeta) =>
      winstonInstance.warn(message, meta),

    debug: (message: string, meta?: LogMeta) =>
      winstonInstance.debug(message, meta),
  };
};
