import winston from "winston";
import dotenv from "dotenv";
dotenv.config();

type LogMeta = Record<string, unknown>;

export const createLogger = (context?: string) => {
  const contextLabel = context ? `[${context}]` : "[app]";

  const buildFormat = (colorize: boolean) => {
    const transforms = [
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.errors({ stack: true }),
    ];
    if (colorize) transforms.push(winston.format.colorize({ all: true }));
    transforms.push(
      winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        const levelStr = colorize ? level.toUpperCase() : level.toUpperCase().padEnd(5);
        const metaStr = Object.keys(meta).length ? `  |  ${JSON.stringify(meta)}` : "";
        const stackStr = stack ? `\n  Stack: ${stack}` : "";
        return `${timestamp}  ${levelStr}  ${contextLabel.padEnd(24)}  ${message}${metaStr}${stackStr}`;
      }),
    );
    return winston.format.combine(...transforms);
  };

  const logLevel =
    process.env.LOG_LEVEL ||
    (process.env.NODE_ENV === "production" ? "info" : "debug");

  const winstonInstance = winston.createLogger({
    level: logLevel,
    transports: [
      new winston.transports.Console({ format: buildFormat(true) }),
      new winston.transports.File({ filename: "logs/error.log", level: "error", format: buildFormat(false) }),
      new winston.transports.File({ filename: "logs/combined.log", format: buildFormat(false) }),
    ],
  });

  return {
    info:  (message: string, meta?: LogMeta) => winstonInstance.info(message, meta),
    error: (message: string, meta?: LogMeta) => winstonInstance.error(message, meta),
    warn:  (message: string, meta?: LogMeta) => winstonInstance.warn(message, meta),
    debug: (message: string, meta?: LogMeta) => winstonInstance.debug(message, meta),
  };
};
