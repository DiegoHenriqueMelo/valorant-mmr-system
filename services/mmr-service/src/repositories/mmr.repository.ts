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
    const insertMMR = await MMR.create({
      email,
      historico,
      mmr,
    });
    logger.debug(`INSSERT MMR: ${JSON.stringify(insertMMR, null, 2)}`);
    return [201, "Criado com sucesso"];
  } catch (e) {
    logger.error("REPOSITORY ERROR");
    logger.error(`ERROR: ${String(e)}`);
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
// export const getPlayer = async (email: string): Promise<[number, any]> => {
//   try {
//     logger.info("REPOSITORY STARTED");
//     const getPlayer = await MMR.findOne({ email });
//     if (!getPlayer) throw new Error("Credenciais Inválidas");
//     return [200, getPlayer];
//   } catch (e) {
//     logger.error("REPOSITORY ERROR");
//     logger.debug(`status: 500, message: ${String(e)}`);
//     return [500, String(e)];
//   } finally {
//     logger.info("REPOSITORY COMPLETED");
//   }
// };
