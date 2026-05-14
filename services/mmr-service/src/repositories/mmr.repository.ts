import { MMR } from "../models/mmr.model.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("mmr.repository");

export const create = async (
  email: string,
  historico: [
    {
      kill: number;
      death: number;
      result: string;
      score: number;
    },
  ],
  mmr: number,
): Promise<[number, string]> => {
  try {
    logger.info("Inserting MMR record into the database", { mmrScore: mmr, matchCount: historico.length });
    await MMR.create({ email, historico, mmr });
    logger.info("MMR record created successfully");
    return [201, "Criado com sucesso"];
  } catch (e) {
    const error: string = String(e);
    const codErr: string = String(error.split(" ")[1]);
    if (codErr === "E11000") {
      logger.warn("Duplicate MMR entry detected -- record already exists for this user", { errorCode: codErr });
      return [400, `Erro: ${codErr}, Algúm usuraio já tem esses dados cadastrados`];
    }
    logger.error("Database write failed during MMR insertion", { error });
    return [400, "Dados inválidos, revise os dados"];
  } finally {
    logger.debug("MMR insert operation finished");
  }
};

export const getAll = async (): Promise<[number, any]> => {
  try {
    logger.info("Querying all MMR records from the database");
    const getPlayer = await MMR.find();
    if (!getPlayer) throw new Error("Credenciais Inválidas");
    logger.debug(`MMR records retrieved`, { count: getPlayer.length });
    return [200, getPlayer];
  } catch (e) {
    logger.error("Database query failed during MMR retrieval", { error: String(e) });
    return [500, String(e)];
  } finally {
    logger.debug("MMR getAll operation finished");
  }
};
