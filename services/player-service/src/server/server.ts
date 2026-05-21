import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import path from "path";
import { playerRoute } from "../routes/player.routes.js";
import { connectMongo } from "../config/database.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("server");

export const startServer = async () => {
  dotenv.config();
  await connectMongo();
  const PORT = Number(process.env.PLAYER_PORT);
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
        title: "Player Service",
        version: "1.0.0",
        description:
          "Serviço de gerenciamento de perfis de jogadores do sistema Valorant MMR. " +
          "Permite criar e consultar o perfil de um jogador (nickname, rank, agente favorito e região). " +
          "O rank é convertido em um rankScore (índice × 100) utilizado pelo MMR Service " +
          "no cálculo de pontuação das partidas.",
        contact: {
          name: "Suporte",
          email: "diegohenriquemelo14@gmail.com",
        },
      },
      servers: [
        {
          url: `http://localhost:${process.env.PLAYER_PORT ?? 3002}`,
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
      customSiteTitle: "Player Service - Documentação",
    }),
  );
  app.use(playerRoute);
  app.listen(PORT, () => {
    logger.info("------------------------------------------------------");
    logger.info(`  Player Service started successfully`);
    logger.info(`  API listening at  http://localhost:${PORT}`);
    logger.info(`  Swagger UI at     http://localhost:${PORT}/api-docs`);
    logger.info("------------------------------------------------------");
  });
};
