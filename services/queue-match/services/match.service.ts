import { MatchBuilder } from "../models/class/Match.js";
import { getMMR } from "../lib/mmr-service/api.js";
import { Player } from "../models/class/Player.js";
import * as matchRepository from "../repositories/match.repository.js";
import * as queueService from "./queue.service.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("match.service");
const MATCH_SIZE = 10;

export const match = async (): Promise<[number, string]> => {
  try {
    logger.section("MATCH CYCLE STARTED");

    logger.info("Fetching MMR data and waiting queue in parallel");
    const [mmrData, waitingPlayers] = await Promise.all([
      getMMR(),
      queueService.getWaitingPlayers(),
    ]);

    const waitingEmails = new Set(waitingPlayers.map((p) => p.email));
    const newPlayers = mmrData
      .filter(({ email }) => !waitingEmails.has(email))
      .map(({ email, mmr }) => new Player(email, mmr));

    const allPlayers = [...waitingPlayers, ...newPlayers];

    logger.section("QUEUE EVALUATION", {
      "Players retrieved from MMR service": mmrData.length,
      "Players already in waiting queue  ": waitingPlayers.length,
      "New players eligible for matching  ": newPlayers.length,
      "Total candidates                   ": allPlayers.length,
      "Required for a full match          ": MATCH_SIZE,
    });

    if (allPlayers.length < MATCH_SIZE) {
      await queueService.setWaitingPlayers(allPlayers);

      logger.section("MATCH CYCLE DEFERRED -- INSUFFICIENT PLAYERS", {
        "Players in queue  ": allPlayers.length,
        "Required          ": MATCH_SIZE,
        "Still missing     ": MATCH_SIZE - allPlayers.length,
      });

      return [202, `Jogadores insuficientes. ${allPlayers.length} jogador(es) na fila de espera.`];
    }

    const sorted = [...allPlayers].sort((a, b) => a.mmr - b.mmr);
    const matchableCount = Math.floor(sorted.length / MATCH_SIZE) * MATCH_SIZE;
    const toMatch = sorted.slice(0, matchableCount);
    const leftover = sorted.slice(matchableCount);

    logger.info("Building matches from eligible players", { matchesCount: toMatch.length / MATCH_SIZE, leftoverCount: leftover.length });

    const matches = new MatchBuilder(toMatch).build();
    const result = await matchRepository.create(matches);

    await queueService.setWaitingPlayers(leftover);

    logger.section("MATCH CYCLE COMPLETED", {
      "Matches created       ": matches.length,
      "Players matched       ": toMatch.length,
      "Leftover (next cycle) ": leftover.length,
    });

    return result;
  } catch (e) {
    logger.error("Match cycle failed with an unhandled exception", { error: String(e) });
    return [500, String(e)];
  }
};
