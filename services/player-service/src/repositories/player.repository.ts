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

export const getAll = async (): Promise<[number, any]> => {
  try {
    logger.info("Querying all player records from the database");
    const players = await Player.find();
    logger.debug("Player records retrieved successfully", { count: players.length });
    return [200, players];
  } catch (e) {
    logger.error("Database query failed during player listing", { error: String(e) });
    return [500, String(e)];
  } finally {
    logger.debug("Player getAll operation finished");
  }
};

export const updatePlayer = async (
  email: string,
  data: { nickname?: string; rank?: string; agenteFavorito?: string; regiao?: string },
): Promise<[number, any]> => {
  try {
    logger.info("Updating player record in the database", { email });
    const updated = await Player.findOneAndUpdate({ email }, data, { new: true });
    if (!updated) {
      logger.warn("No player found to update", { email });
      return [404, "Jogador não encontrado"];
    }
    logger.info("Player record updated successfully", { email });
    return [200, updated];
  } catch (e) {
    const error = String(e);
    const codErr = String(error.split(" ")[1]);
    if (codErr === "E11000") {
      logger.warn("Duplicate entry detected during player update", { errorCode: codErr });
      return [400, `Erro: ${codErr}, Algúm usuraio já tem esses dados cadastrados`];
    }
    logger.error("Database write failed during player update", { error });
    return [500, String(e)];
  } finally {
    logger.debug("Player update operation finished");
  }
};

export const deletePlayer = async (email: string): Promise<[number, string]> => {
  try {
    logger.info("Deleting player record from the database", { email });
    const deleted = await Player.findOneAndDelete({ email });
    if (!deleted) {
      logger.warn("No player found to delete", { email });
      return [404, "Jogador não encontrado"];
    }
    logger.info("Player record deleted successfully", { email });
    return [200, "Perfil removido com sucesso"];
  } catch (e) {
    logger.error("Database write failed during player deletion", { error: String(e) });
    return [500, String(e)];
  } finally {
    logger.debug("Player delete operation finished");
  }
};
