import { User } from "../models/user.model.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("auth.repository");

export const insert = async (
  email: string,
  passHash: string,
  createdAt: Date,
  lastLogin: Date,
): Promise<[number, string]> => {
  try {
    logger.info("REPOSITORY STARTED");
    const insertUser = await User.create({
      email,
      passwordHash: passHash,
      createdAt: createdAt,
      lastLogin: lastLogin,
    });
    return [201, "Criado com sucesso"];
  } catch (e) {
    logger.error("REPOSITORY ERROR");
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

export const findByEmail = async (email: string): Promise<any> => {
  try {
    logger.info("REPOSITORY STARTED");
    const getUser = await User.findOne({ email });
    if (!getUser) throw new Error("Credenciais Inválidas");
    return [200, getUser];
  } catch (e) {
    logger.error("REPOSITORY ERROR");
    logger.debug(`status: 500, message: ${String(e)}`);
    return [500, String(e)];
  } finally {
    logger.info("REPOSITORY COMPLETED");
  }
};
