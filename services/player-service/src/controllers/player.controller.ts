import * as playerService from "../service/player.service.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("player.controller");

export const create = async (player: {
  nickname: string;
  rank: number;
  agenteFavorito: number;
  regiao: string;
  email: string;
}): Promise<[number, string]> => {
  try {
    logger.info("CONTROLLER STARTED");
    logger.debug(`REQ BODY: ${JSON.stringify(player, null, 2)}`)
    const result = await playerService.create(player);
    return [result[0], result[1]];
  } catch (e) {
    logger.error("CONTROLLER ERROR");
    logger.debug(`status: 500, message: ${String(e)}`);
    return [500, String(e)];
  } finally {
    logger.info("CONTROLLER COMPLETED");
  }
};

// export const login = async (user: {
//   email: string;
//   password: string;
// }): Promise<[number, string]> => {
//   try {
//     logger.info("CONTROLLER STARTED");
//     const result = await authService.login(user);
//     return [result[0], result[1]];
//   } catch (e) {
//     logger.error("CONTROLLER ERROR");
//     logger.debug(`status: 500, message: ${String(e)}`);
//     return [500, String(e)];
//   } finally {
//     logger.info("CONTROLLER COMPLETED");
//   }
// };
