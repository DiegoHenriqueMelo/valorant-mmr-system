import * as mmrRepository from "../repositories/mmr.repository.js";
import { createToken } from "../middlewares/auth.middleware.js";
import dotenv from "dotenv";
import { createLogger } from "../utils/logger.js";
import { getRank } from "../lib/player-service/api.js";

const logger = createLogger("mmr.service");

export const register = async (mmr: {
  email: string;
  historico: [
    {
      kill: number;
      death: number;
      result: string;
      score: number;
    },
  ];
  token: string;
}): Promise<[number, string]> => {
  try {
    logger.info("Starting MMR calculation", { matchCount: mmr.historico.length });

    let winRate: number = 0;
    let mmrFinal: number = 0;

    logger.debug("Fetching player rank score from player-service");
    const score: number = await getRank(mmr.token);
    logger.debug(`Player rank score retrieved`, { rankScore: score });

    mmr.historico.forEach((play) => {
      const isVictory = play.result.toUpperCase() === "VITÓRIA";
      isVictory ? winRate++ : winRate--;
      mmrFinal = Number(Math.round(play.kill / play.death + score));
      play.score = mmrFinal;
    });
    mmrFinal = Number(Math.round((mmrFinal + winRate) / 3));

    logger.debug("MMR calculation completed", { winRate, mmrFinal });

    const result = await mmrRepository.create(mmr.email, mmr.historico, mmrFinal);
    return [result[0], result[1]];
  } catch (e) {
    logger.error("MMR calculation or persistence failed", { error: String(e) });
    return [500, String(e)];
  }
};

export const getAll = async (): Promise<[number, any]> => {
  try {
    logger.info("Fetching all MMR records for leaderboard");
    const [status, getUser] = await mmrRepository.getAll();

    if (status !== 200) {
      logger.warn("Repository returned an error status", { statusCode: status });
      throw new Error(getUser);
    }

    const result = [];
    getUser.forEach((player) => {
      result.push({ email: player.email, mmr: player.mmr });
    });

    logger.info(`Leaderboard built successfully`, { totalPlayers: result.length });
    return [200, result];
  } catch (e) {
    logger.error("Failed to retrieve MMR leaderboard", { error: String(e) });
    return [500, String(e)];
  }
};
