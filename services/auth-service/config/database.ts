import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

export const connectMongo = async (): Promise<string> => {
  try {
    const uri: string = String(process.env.MONGO_URI);
    const mongo = mongoose;
    const result = await mongo.connect(uri);

    if (result.connections[0].port) {
      console.log(`Mongo conectado na porta ${result.connections[0].port}`);
    }
    return "Conected";
  } catch (e) {
    console.log(e);
    return "Não foi possivel conectar";
  }
};
