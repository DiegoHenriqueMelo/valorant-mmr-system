import { createLogger } from "../../utils/logger.js";
import dotenv from "dotenv";

const logger = createLogger("get rank");

export const getMMR = async (): Promise<
  [mmrs: { email: string; mmr: number }]
> => {
  dotenv.config();

  const URL: string =
    "http://localhost:" + String(process.env.MMR_PORT) + "/api/mmr";

  const response = await fetch(URL, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Erro na requisição: ${response.status}`);
  }

  const data = await response.json();
  logger.info(`Dados Resgatados: ${data}`);
  return data.mmrs;
};
