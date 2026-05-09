import { User } from "../models/user.model.js";

export const insert = async (
  email: string,
  passHash: string,
  createdAt: Date,
  lastLogin: Date,
): Promise<[number, string]> => {
  try {
    const insertUser = await User.create({
      email,
      passwordHash: passHash,
      createdAt: createdAt,
      lastLogin: lastLogin,
    });
    return [201, "Criado com sucesso"];
  } catch (e) {
    const error: string = String(e);
    console.log(error);
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
  }
};

export const findByEmail = async (email: string): Promise<any> => {
  try {
    const getUser = await User.findOne({ email });
    if (!getUser) throw new Error("Credenciais Inválidas");
    return [200, getUser];
  } catch (e) {
    console.log(e);
    return [500, String(e)];
  }
};
