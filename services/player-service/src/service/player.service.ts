import { Character } from "../models/enums/character.js";
import { Rank } from "../models/enums/rank.js";
import { createLogger } from "../utils/logger.js";
import * as playerRepository from "../repositories/player.repository.js";

const logger = createLogger("player.services");

export const create = async (player: {
  nickname: string;
  rank: number;
  agenteFavorito: number;
  regiao: string;
  email: string;
}): Promise<[number, string]> => {
  try {
    logger.info("SERVICE STARTED");
    const allRanks = Object.values(Rank);
    const allCharacter = Object.values(Character);
    const realRank: string = String(allRanks[player.rank]);
    const realCharacter: string = String(allCharacter[player.agenteFavorito]);

    if (player.rank < 0 || player.rank > allRanks.length)
      throw new Error("Rank não existente");
    if (
      player.agenteFavorito < 0 ||
      player.agenteFavorito > allCharacter.length
    )
      throw new Error("Agente não existente");

    logger.info(`RANK: ${realRank}`);
    logger.info(`CHARACTER: ${realCharacter}`);

    const createPlayer = await playerRepository.create(
      player.nickname,
      realRank,
      realCharacter,
      player.regiao,
      player.email,
    );
    return[createPlayer[0], createPlayer[1]]
  } catch (e) {
    logger.error("SERVICE ERROR");
    logger.debug(`status: 500, message: ${String(e)}`);
    return [500, String(e)];
  } finally {
    logger.info("SERVICE COMPLETED");
  }
};
