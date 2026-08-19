import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import path from "path";
import { mmrRoute } from "../routes/mmr.route.js";
import { connectMongo } from "../config/database.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("server");

export const startServer = async () => {
  dotenv.config();
  await connectMongo();
  const PORT = Number(process.env.MMR_PORT);
  const app = express();
  const corsOptions = {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };

  app.use(cors(corsOptions));
  app.use(express.json());

  const swaggerSpec = swaggerJsdoc({
    definition: {
      openapi: "3.0.0",
      info: {
        title: "MMR Service",
        version: "1.0.0",
        description:
          "Serviço de gerenciamento de MMR (Match Making Rating) do sistema Valorant MMR. " +
          "Recebe o histórico de partidas dos jogadores, calcula o MMR com base em kills, mortes, " +
          "resultado e rank atual, e fornece o leaderboard consumido pelo Queue Match Service " +
          "para formação de partidas equilibradas.",
        contact: {
          name: "Suporte",
          email: "diegohenriquemelo14@gmail.com",
        },
      },
      servers: [
        {
          url: `http://localhost:${process.env.MMR_PORT ?? 3003}`,
          description: "Ambiente de desenvolvimento local",
        },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "Token JWT obtido no Auth Service (`POST /api/auth/login`). Formato: `Bearer <token>`",
          },
        },
      },
    },
    apis: [
      path.join(__dirname, "../routes/**/*.ts"),
      path.join(__dirname, "../routes/**/*.js"),
      path.join(process.cwd(), "src/routes/**/*.ts"),
      path.join(process.cwd(), "dist/routes/**/*.js"),
    ],
  });
  app.get("/api-docs.json", (_req, res) => res.json(swaggerSpec));
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "MMR Service - Documentação",
    }),
  );
  app.use(mmrRoute);
  app.listen(PORT, () => {
    logger.info("------------------------------------------------------");
    logger.info(`  MMR Service started successfully`);
    logger.info(`  API listening at  http://localhost:${PORT}`);
    logger.info(`  Swagger UI at     http://localhost:${PORT}/api-docs`);
    logger.info("------------------------------------------------------");
  });
};
