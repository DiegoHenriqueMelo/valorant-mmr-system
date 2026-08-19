import mongoose from "mongoose";
import dotenv from "dotenv";
import { createLogger } from "../utils/logger.js";
dotenv.config();

const logger = createLogger("database");

export const connectMongo = async (): Promise<string> => {
  try {
    logger.info("Connecting to MongoDB...");
    const uri: string = String(process.env.PLAYER_MONGO_URI);
    const result = await mongoose.connect(uri);
    const conn = result.connections[0];
    logger.info(`MongoDB connected -- host: ${conn.host}, port: ${conn.port}, db: ${conn.name}`);
    return "Connected";
  } catch (e) {
    logger.error("MongoDB connection failed", { error: String(e) });
    return "Connection failed";
  }
};
