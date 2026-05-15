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

export const getAll = async (): Promise<[number, any]> => {
  try {
    logger.info("Fetching all player profiles");
    const [status, players] = await playerRepository.getAll();
    if (status !== 200) {
      logger.warn("Repository returned an error during player listing", { statusCode: status });
      throw new Error(players);
    }
    const result = players.map((p: any) => ({
      email: p.email,
      nickname: p.nickname,
      rank: p.rank,
      agenteFavorito: p.agenteFavorito,
      regiao: p.regiao,
    }));
    logger.info("Player listing completed successfully", { totalPlayers: result.length });
    return [200, result];
  } catch (e) {
    logger.error("Player listing failed", { error: String(e) });
    return [500, String(e)];
  }
};

export const updatePlayer = async (player: {
  email: string;
  rank?: number;
  agenteFavorito?: number;
  regiao?: string;
  nickname?: string;
}): Promise<[number, any]> => {
  try {
    logger.info("Starting player profile update flow", { email: player.email });
    const allRanks = Object.values(Rank);
    const allCharacters = Object.values(Character);

    const updateData: { nickname?: string; rank?: string; agenteFavorito?: string; regiao?: string } = {};

    if (player.rank !== undefined) {
      if (player.rank < 0 || player.rank >= allRanks.length) {
        logger.warn("Player update rejected -- invalid rank index", { rankIndex: player.rank });
        throw new Error("Rank não existente");
      }
      updateData.rank = String(allRanks[player.rank]);
    }

    if (player.agenteFavorito !== undefined) {
      if (player.agenteFavorito < 0 || player.agenteFavorito >= allCharacters.length) {
        logger.warn("Player update rejected -- invalid agent index", { agentIndex: player.agenteFavorito });
        throw new Error("Agente não existente");
      }
      updateData.agenteFavorito = String(allCharacters[player.agenteFavorito]);
    }

    if (player.regiao !== undefined) updateData.regiao = player.regiao;
    if (player.nickname !== undefined) updateData.nickname = player.nickname;

    logger.debug("Player update data resolved", updateData);

    const [status, updated] = await playerRepository.updatePlayer(player.email, updateData);
    if (status === 200) {
      logger.info("Player profile updated successfully", { email: player.email });
    } else {
      logger.warn("Player update rejected by repository", { statusCode: status });
    }
    return [status, updated];
  } catch (e) {
    logger.error("Player profile update failed", { error: String(e) });
    return [500, String(e)];
  }
};

export const deletePlayer = async (email: string): Promise<[number, string]> => {
  try {
    logger.info("Starting player profile deletion flow", { email });
    const [status, message] = await playerRepository.deletePlayer(email);
    if (status === 200) {
      logger.info("Player profile deleted successfully", { email });
    } else {
      logger.warn("Player deletion rejected by repository", { statusCode: status });
    }
    return [status, message];
  } catch (e) {
    logger.error("Player profile deletion failed", { error: String(e) });
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
