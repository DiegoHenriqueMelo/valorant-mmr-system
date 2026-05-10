import bcrypt from "bcrypt";
import * as userRepository from "../../repositories/user.repository.js";
import { createToken } from "../middlewares/auth.middleware.js";
import dotenv from "dotenv";

export const register = async (user: {
  email: string;
  password: string;
}): Promise<[number, string]> => {
  try {
    const salt: number = 10;
    const passHased = bcrypt.hashSync(user.password, salt);
    const userInserted: [number, string] = await userRepository.insert(
      user.email,
      passHased,
      new Date(),
      new Date(),
    );
    return [userInserted[0], userInserted[1]];
  } catch (e) {
    return [500, String(e)];
  }
};

export const login = async (user: {
  email: string;
  password: string;
}): Promise<[number, string]> => {
  try {
    dotenv.config();

    const EX: number = Number(process.env.JWT_EXPIRES_IN);

    const [status, getUser] = await userRepository.findByEmail(user.email);

    if (status !== 200) throw new Error(getUser);

    const passIsValid = await bcrypt.compare(user.password, getUser.passwordHash);

    if (!passIsValid) throw new Error("Credenciais inválidas");

    const token = await createToken("player", getUser.email, EX);

    if (token === 500) throw new Error("Não foi possivel criar token");

    return [200, `Token: ${token}`];
  } catch (e) {
    return [500, String(e)];
  }
};
