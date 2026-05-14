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
