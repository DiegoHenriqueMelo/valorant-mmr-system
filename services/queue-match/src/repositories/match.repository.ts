import { MatchModel } from "../models/match.model.js";
import { Match } from "../models/class/Match.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("match.repository");

export const create = async (matches: Match[]): Promise<[number, string]> => {
  try {
    logger.info("Persisting match records into the database", { matchCount: matches.length });
    await MatchModel.insertMany(matches);
    logger.info("Match records inserted successfully", { matchCount: matches.length });
    return [201, "Partida criada com sucesso"];
  } catch (e) {
    const error = String(e);
    if (error.includes("E11000")) {
      logger.warn("Duplicate match entry detected -- insertion skipped");
      return [400, "Partida duplicada"];
    }
    logger.error("Database write failed during match insertion", { error });
    return [500, "Erro interno do servidor!"];
  } finally {
    logger.debug("Match insert operation finished");
  }
};

export const getAll = async (): Promise<[number, any]> => {
  try {
    logger.info("Querying all match records from the database");
    const matches = await MatchModel.find().sort({ createdAt: -1 });
    logger.debug("Match records retrieved successfully", { count: matches.length });
    return [200, matches];
  } catch (e) {
    logger.error("Database query failed during match listing", { error: String(e) });
    return [500, String(e)];
  } finally {
    logger.debug("Match getAll operation finished");
  }
};

export const getById = async (id: string): Promise<[number, any]> => {
  try {
    logger.info("Querying match record by id", { id });
    const match = await MatchModel.findById(id);
    if (!match) {
      logger.warn("No match found for the provided id", { id });
      return [404, "Partida não encontrada"];
    }
    logger.debug("Match record retrieved successfully", { id });
    return [200, match];
  } catch (e) {
    logger.error("Database query failed during match lookup by id", { error: String(e) });
    return [500, String(e)];
  } finally {
    logger.debug("Match getById operation finished");
  }
};

export const deleteById = async (id: string): Promise<[number, string]> => {
  try {
    logger.info("Deleting match record from the database", { id });
    const deleted = await MatchModel.findByIdAndDelete(id);
    if (!deleted) {
      logger.warn("No match found to delete", { id });
      return [404, "Partida não encontrada"];
    }
    logger.info("Match record deleted successfully", { id });
    return [200, "Partida removida com sucesso"];
  } catch (e) {
    logger.error("Database write failed during match deletion", { error: String(e) });
    return [500, String(e)];
  } finally {
    logger.debug("Match delete operation finished");
  }
};
