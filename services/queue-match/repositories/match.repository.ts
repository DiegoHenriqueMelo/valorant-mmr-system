import { MatchModel } from "../models/match.model.js";
import { Match } from "../models/class/Match.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("match.repository");

export const create = async (matches: Match[]): Promise<[number, string]> => {
  try {
    await MatchModel.insertMany(matches);
    logger.debug(`Partidas inseridas: ${matches.length}`);
    return [201, "Partida criada com sucesso"];
  } catch (e) {
    logger.error("REPOSITORY ERROR");
    logger.error(`ERROR: ${String(e)}`);
    const error = String(e);
    if (error.includes("E11000")) return [400, "Partida duplicada"];
    return [500, "Erro interno do servidor!"];
  } finally {
    logger.info("REPOSITORY COMPLETED");
  }
};
