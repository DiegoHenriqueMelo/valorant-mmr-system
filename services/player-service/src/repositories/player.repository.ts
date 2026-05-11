import { Player } from "../models/player.model.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("auth.repository");

export const create = async (
  nickname: string,
  rank: string,
  agenteFavorito: string,
  regiao: string,
  email: string,
): Promise<[number, string]> => {
  try {
    logger.info("REPOSITORY STARTED");
    logger.debug(`PLAYER: ${nickname}`)
    logger.debug(`RANK: ${rank}`)
    logger.debug(`AGENTE: ${agenteFavorito}`)
    logger.debug(`REGIAO: ${regiao}`)
    logger.debug(`EMAIL: ${email}`)

    const insertUser = await Player.create({
      email,
      nickname,
      rank,
      agenteFavorito,
      regiao,
    });
    logger.debug(`INSSERT USER: ${JSON.stringify(insertUser, null, 2)}`)
    return [201, "Criado com sucesso"];
  } catch (e) {
    logger.error("REPOSITORY ERROR");
    logger.error(`ERROR: ${String(e)}`)
    const error: string = String(e);
    const codErr: string = String(error.split(" ")[1]);
    if (codErr === "E11000")
      return [
        400,
        `Erro: ${codErr}, Algúm usuraio já tem esses dados cadastrados`,
      ];
    if (codErr !== "E11000") {
      return [400, "Dados inválidos, revise os dados"];
    } else {
      return [500, "Erro interno do servidor!"];
    }
  } finally {
    logger.info("REPOSITORY COMPLETED");
  }
};
