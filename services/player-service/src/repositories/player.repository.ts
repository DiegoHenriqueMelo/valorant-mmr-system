import { Player } from "../models/player.model.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("player.repository");

export const create = async (
  nickname: string,
  rank: string,
  agenteFavorito: string,
  regiao: string,
  email: string,
): Promise<[number, string]> => {
  try {
    logger.info("Inserting new player record into the database", { nickname, rank, agent: agenteFavorito, region: regiao });
    await Player.create({ email, nickname, rank, agenteFavorito, regiao });
    logger.info("Player record created successfully");
    return [201, "Criado com sucesso"];
  } catch (e) {
    const error: string = String(e);
    const codErr: string = String(error.split(" ")[1]);
    if (codErr === "E11000") {
      logger.warn("Duplicate entry detected -- player already exists for this account", { errorCode: codErr });
      return [400, `Erro: ${codErr}, Algúm usuraio já tem esses dados cadastrados`];
    }
    logger.error("Database write failed during player insertion", { error });
    return [400, "Dados inválidos, revise os dados"];
  } finally {
    logger.debug("Player insert operation finished");
  }
};

export const getPlayer = async (email: string): Promise<[number, any]> => {
  try {
    logger.info("Querying player record by email identifier");
    const getPlayer = await Player.findOne({ email });
    if (!getPlayer) {
      logger.warn("No player profile found for the provided email identifier");
      throw new Error("Credenciais Inválidas");
    }
    logger.debug("Player record retrieved successfully");
    return [200, getPlayer];
  } catch (e) {
    logger.error("Database query failed during player lookup", { error: String(e) });
    return [500, String(e)];
  } finally {
    logger.debug("Player lookup operation finished");
  }
};
