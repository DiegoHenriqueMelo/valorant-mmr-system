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
    logger.info("Inserting new user record into the database");
    await User.create({
      email,
      passwordHash: passHash,
      createdAt,
      lastLogin,
    });
    logger.info("User record created successfully");
    return [201, "Criado com sucesso"];
  } catch (e) {
    const error: string = String(e);
    const codErr: string = String(error.split(" ")[1]);
    if (codErr === "E11000") {
      logger.warn("Duplicate entry detected -- user already exists", { errorCode: codErr });
      return [400, `Erro: ${codErr}, Algúm usuraio já tem esses dados cadastrados`];
    }
    logger.error("Database write failed during user insertion", { error });
    return [400, "Dados inválidos, revise os dados"];
  } finally {
    logger.debug("User insert operation finished");
  }
};

export const findByEmail = async (email: string): Promise<any> => {
  try {
    logger.info("Querying user record by email identifier");
    const getUser = await User.findOne({ email });
    if (!getUser) {
      logger.warn("No user found for the provided email identifier");
      throw new Error("Credenciais Inválidas");
    }
    logger.debug("User record retrieved successfully");
    return [200, getUser];
  } catch (e) {
    logger.error("Database query failed during user lookup", { error: String(e) });
    return [500, String(e)];
  } finally {
    logger.debug("User lookup operation finished");
  }
};

export const findAll = async (): Promise<[number, any]> => {
  try {
    logger.info("Querying all user records from the database");
    const users = await User.find({}, { passwordHash: 0 });
    logger.debug("User records retrieved successfully", { count: users.length });
    return [200, users];
  } catch (e) {
    logger.error("Database query failed during user listing", { error: String(e) });
    return [500, String(e)];
  } finally {
    logger.debug("User findAll operation finished");
  }
};

export const updatePassword = async (email: string, newHash: string): Promise<[number, string]> => {
  try {
    logger.info("Updating password hash for user", { email });
    const updated = await User.findOneAndUpdate({ email }, { passwordHash: newHash });
    if (!updated) {
      logger.warn("No user found to update password", { email });
      return [404, "Usuário não encontrado"];
    }
    logger.info("Password updated successfully", { email });
    return [200, "Senha atualizada com sucesso"];
  } catch (e) {
    logger.error("Database write failed during password update", { error: String(e) });
    return [500, String(e)];
  } finally {
    logger.debug("Password update operation finished");
  }
};

export const deleteByEmail = async (email: string): Promise<[number, string]> => {
  try {
    logger.info("Deleting user record from the database", { email });
    const deleted = await User.findOneAndDelete({ email });
    if (!deleted) {
      logger.warn("No user found to delete", { email });
      return [404, "Usuário não encontrado"];
    }
    logger.info("User record deleted successfully", { email });
    return [200, "Conta removida com sucesso"];
  } catch (e) {
    logger.error("Database write failed during user deletion", { error: String(e) });
    return [500, String(e)];
  } finally {
    logger.debug("User delete operation finished");
  }
};
