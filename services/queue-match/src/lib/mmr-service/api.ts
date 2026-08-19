import { createLogger } from "../../utils/logger.js";
import dotenv from "dotenv";

const logger = createLogger("mmr-service.client");

export const getMMR = async (): Promise<
  [mmrs: { email: string; mmr: number }]
> => {
  dotenv.config();

  const url = `http://${process.env.MMR_HOST ?? "localhost"}:${process.env.MMR_PORT}/api/mmr`;

  logger.debug("Requesting MMR data from mmr-service", { endpoint: url });

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    logger.error("mmr-service responded with a non-OK status", { statusCode: response.status, endpoint: url });
    throw new Error(`Erro na requisição: ${response.status}`);
  }

  const data = await response.json();
  logger.debug("MMR data retrieved from mmr-service", { playerCount: Array.isArray(data.mmrs) ? data.mmrs.length : 0 });
  return data.mmrs;
};
