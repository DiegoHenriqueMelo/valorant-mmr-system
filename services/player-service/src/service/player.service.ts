import { Character } from "../models/enums/character.js";
import { Rank } from "../models/enums/rank.js";
import { createLogger } from "../utils/logger.js";
import * as playerRepository from "../repositories/player.repository.js";

const logger = createLogger("player.service");

export const create = async (player: {
  nickname: string;
  rank: number;
  agenteFavorito: number;
  regiao: string;
  email: string;
}): Promise<[number, string]> => {
  try {
    logger.info("Starting player profile creation flow");
    const allRanks = Object.values(Rank);
    const allCharacters = Object.values(Character);

    if (player.rank < 0 || player.rank >= allRanks.length) {
      logger.warn("Player creation rejected -- invalid rank index provided", { rankIndex: player.rank, maxIndex: allRanks.length - 1 });
      throw new Error("Rank não existente");
    }
    if (player.agenteFavorito < 0 || player.agenteFavorito >= allCharacters.length) {
      logger.warn("Player creation rejected -- invalid agent index provided", { agentIndex: player.agenteFavorito, maxIndex: allCharacters.length - 1 });
      throw new Error("Agente não existente");
    }

    const realRank: string = String(allRanks[player.rank]);
    const realCharacter: string = String(allCharacters[player.agenteFavorito]);

    logger.debug("Player data resolved", { rank: realRank, agent: realCharacter, region: player.regiao });

    const createPlayer = await playerRepository.create(
      player.nickname,
      realRank,
      realCharacter,
      player.regiao,
      player.email,
    );

    if (createPlayer[0] === 201) {
      logger.info("Player profile persisted successfully");
    }

    return [createPlayer[0], createPlayer[1]];
  } catch (e) {
    logger.error("Player profile creation failed", { error: String(e) });
    return [500, String(e)];
  }
};

export const login = async (email: string): Promise<[number, any]> => {
  try {
    logger.info("Fetching player profile for authentication context");

    const [status, getPlayer] = await playerRepository.getPlayer(email);

    if (status !== 200) {
      logger.warn("Player profile not found", { statusCode: status });
      throw new Error(getPlayer);
    }

    const rankScore: number = Number(Rank[getPlayer.rank] * 100);
    logger.debug("Rank score computed", { rank: getPlayer.rank, rankScore });

    const bodyFormatted = {
      email: getPlayer.email,
      nickname: getPlayer.nickname,
      rank: rankScore,
      agenteFavorito: getPlayer.agenteFavorito,
      regiao: getPlayer.regiao,
    };

    logger.info("Player profile retrieved and formatted successfully");
    return [200, bodyFormatted];
  } catch (e) {
    logger.error("Player profile retrieval failed", { error: String(e) });
    return [500, String(e)];
  }
};
