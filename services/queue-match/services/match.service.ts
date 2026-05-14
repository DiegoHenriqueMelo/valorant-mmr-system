import { MatchBuilder } from "../models/class/Match.js";
import { getMMR } from "../lib/mmr-service/api.js";
import { Player } from "../models/class/Player.js";
import * as matchRepository from "../repositories/match.repository.js";
import * as queueService from "./queue.service.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("match.services");
const MATCH_SIZE = 10;

export const match = async (): Promise<[number, string]> => {
  try {
    logger.info("SERVICE STARTED");

    const [mmrData, waitingPlayers] = await Promise.all([
      getMMR(),
      queueService.getWaitingPlayers(),
    ]);

    const waitingEmails = new Set(waitingPlayers.map((p) => p.email));
    const newPlayers = mmrData
      .filter(({ email }) => !waitingEmails.has(email))
      .map(({ email, mmr }) => new Player(email, mmr));

    // waiting players têm prioridade (estão na fila há mais tempo)
    const allPlayers = [...waitingPlayers, ...newPlayers];

    if (allPlayers.length < MATCH_SIZE) {
      await queueService.setWaitingPlayers(allPlayers);
      logger.info(`Jogadores insuficientes: ${allPlayers.length}/${MATCH_SIZE}`);
      return [202, `Jogadores insuficientes. ${allPlayers.length} jogador(es) na fila de espera.`];
    }

    // ordena por MMR para que os leftover sejam os de maior MMR (mais difíceis de parear)
    const sorted = [...allPlayers].sort((a, b) => a.mmr - b.mmr);
    const matchableCount = Math.floor(sorted.length / MATCH_SIZE) * MATCH_SIZE;
    const toMatch = sorted.slice(0, matchableCount);
    const leftover = sorted.slice(matchableCount);

    const matches = new MatchBuilder(toMatch).build();
    const result = await matchRepository.create(matches);

    await queueService.setWaitingPlayers(leftover);

    if (leftover.length > 0) {
      logger.info(`${leftover.length} jogador(es) na fila de espera para o próximo ciclo`);
    }

    return result;
  } catch (e) {
    logger.error("SERVICE ERROR");
    logger.debug(`status: 500, message: ${String(e)}`);
    return [500, String(e)];
  } finally {
    logger.info("SERVICE COMPLETED");
  }
};
