import * as mmrRepository from "../repositories/mmr.repository.js";
import { createToken } from "../middlewares/auth.middleware.js";
import dotenv from "dotenv";
import { createLogger } from "../utils/logger.js";
import { getRank } from "../lib/player-service/api.js";

const logger = createLogger("auth.services");

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
    logger.info("SERVICE STARTED");

    let winRate: number = 0;
    let mmrFinal: number = 0;

    const score: number = await getRank(mmr.token);

    mmr.historico.forEach((play) => {
      play.result.toUpperCase() === "VITÓRIA" ? winRate++ : winRate--;
      mmrFinal = Number(Math.round(play.kill / play.death + score));
      play.score = mmrFinal;
    });
    mmrFinal = Number(Math.round((mmrFinal + winRate) / 3));

    const result = await mmrRepository.create(
      mmr.email,
      mmr.historico,
      mmrFinal,
    );
    return [result[0], result[1]];
  } catch (e) {
    logger.error("SERVICE ERROR");
    logger.debug(`status: 500, message: ${String(e)}`);
    return [500, String(e)];
  } finally {
    logger.info("SERVICE COMPLETED");
  }
};

export const getAll = async (): Promise<[number, any]> => {
  try {
    logger.info("SERVICE STARTED");
    const [status, getUser] = await mmrRepository.getAll();

    if (status !== 200) throw new Error(getUser);

    const result = [];

    getUser.forEach((player) => {
      const user = [player.email, player.mmr];
      result.push(user);
    });

    return [200, result];
  } catch (e) {
    return [500, String(e)];
  } finally {
  }
};
