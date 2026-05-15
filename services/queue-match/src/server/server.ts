import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import { connectMongo } from "../config/database.js";
import { connectRedis } from "../../config/redis.js";
import { createLogger } from "../utils/logger.js";
import { matchRoute } from "../../routes/match.route.js";

const logger = createLogger("server");

export const startServer = async () => {
  dotenv.config();
  await connectMongo();
  await connectRedis();
  const PORT = Number(process.env.QUEUE_PORT);
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
  app.use(matchRoute);

  const swaggerSpec = swaggerJsdoc({
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Queue Match Service",
        version: "1.0.0",
        description:
          "Serviço responsável pela formação automática de partidas no sistema Valorant MMR. " +
          "Utiliza o MMR (Match Making Rating) de cada jogador para criar times equilibrados, " +
          "com uma fila de espera persistida no Redis para ciclos com jogadores insuficientes. " +
          "As partidas geradas são armazenadas no MongoDB.",
        contact: {
          name: "Suporte",
          email: "diegohenriquemelo14@gmail.com",
        },
      },
      servers: [
        {
          url: `http://localhost:${process.env.QUEUE_PORT ?? 3004}`,
          description: "Ambiente de desenvolvimento local",
        },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "Token JWT obtido no Auth Service. Formato: `Bearer <token>`",
          },
        },
      },
    },
    apis: ["./src/routes/**/*.ts", "./routes/**/*.ts"],
  });

  app.get("/api-docs.json", (_req, res) => res.json(swaggerSpec));
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "Queue Match - Documentação",
    }),
  );

  app.listen(PORT, () => {
    logger.info("------------------------------------------------------");
    logger.info(`  Queue Match Service started successfully`);
    logger.info(`  API listening at  http://localhost:${PORT}`);
    logger.info(`  Swagger UI at     http://localhost:${PORT}/api-docs`);
    logger.info("------------------------------------------------------");
  });
};
