import mongoose from "mongoose";
import dotenv from "dotenv";
import { createLogger } from "../utils/logger.js";
dotenv.config();

const logger = createLogger("mongoose");

export const connectMongo = async (): Promise<string> => {
  try {
    logger.info("CONNECTING TO THE MONGOOSE");
    const uri: string = String(process.env.MATCH_MONGO_URI);
    const mongo = mongoose;
    const result = await mongo.connect(uri);

    if (result.connections[0].port) {
      logger.info(`Mongo conectado na porta ${result.connections[0].port}`);
    }
    return "Conected";
  } catch (e) {
    logger.error(String(e));
    return "Não foi possivel conectar";
  }
};
