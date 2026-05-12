import * as mmrRepository from "../repositories/mmr.repository.js";
import { createToken } from "../middlewares/auth.middleware.js";
import dotenv from "dotenv";
import { createLogger } from "../utils/logger.js";
import { getRank } from "../lib/player-service/api.js";

const logger = createLogger("auth.services");

export const register = async (mmr: {
  email: string;
  historico: [
    {
      kill: number;
      death: number;
      result: string;
      score: number;
    },
  ];
  token: string;
}): Promise<[number, string]> => {
  try {
    logger.info("SERVICE STARTED");

    let winRate: number = 0;
    let mmrFinal: number = 0;

    const score: number = await getRank(mmr.token);

    mmr.historico.forEach((play) => {
      play.result.toUpperCase() === "VITÓRIA" ? winRate++ : winRate--;
      mmrFinal = Number(Math.round(play.kill / play.death + score));
      play.score = mmrFinal;
    });
    mmrFinal = Number(Math.round((mmrFinal + winRate) / 3));

    const result = await mmrRepository.create(
      mmr.email,
      mmr.historico,
      mmrFinal,
    );
    return [result[0], result[1]];
  } catch (e) {
    logger.error("SERVICE ERROR");
    logger.debug(`status: 500, message: ${String(e)}`);
    return [500, String(e)];
  } finally {
    logger.info("SERVICE COMPLETED");
  }
};

// export const login = async (user: {
//   email: string;
//   password: string;
// }): Promise<[number, string]> => {
//   try {
//     logger.info("SERVICE STARTED");
//     dotenv.config();

//     const EX: number = Number(process.env.JWT_EXPIRES_IN);

//     const [status, getUser] = await userRepository.findByEmail(user.email);

//     if (status !== 200) throw new Error(getUser);

//     logger.debug("VALIDATING PASSWORD");
//     const passIsValid = await bcrypt.compare(
//       user.password,
//       getUser.passwordHash,
//     );

//     if (!passIsValid) {
//       logger.debug("FAILED TO VALIDATING PASSWORD");
//       throw new Error("Credenciais inválidas");
//     }

//     logger.info("GENERATING TOKEN");
//     const token = await createToken("player", getUser.email, EX);

//     if (token === 500) {
//       logger.debug("FAILED TO GENERATING TOKEN");
//       throw new Error("Não foi possivel criar token");
//     }

//     return [200, `Token: ${token}`];
//   } catch (e) {
//     return [500, String(e)];
//   } finally {
//   }
// };
