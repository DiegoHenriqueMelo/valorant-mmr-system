import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import path from "path";
import { authRoute } from "../routes/auth.routes.js";
import { connectMongo } from "../config/database.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("server");

export const startServer = async () => {
  dotenv.config();
  await connectMongo();
  const PORT = Number(process.env.AUTH_PORT);
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
        title: "Auth Service",
        version: "1.0.0",
        description:
          "Serviço de autenticação do sistema Valorant MMR. " +
          "Responsável pelo cadastro de usuários e geração de tokens JWT utilizados " +
          "para autenticar requisições nos demais serviços (Player Service, MMR Service). " +
          "As senhas são armazenadas com hash bcrypt (10 rounds) — nunca em texto puro.",
        contact: {
          name: "Suporte",
          email: "diegohenriquemelo14@gmail.com",
        },
      },
      servers: [
        {
          url: `http://localhost:${process.env.AUTH_PORT ?? 3001}`,
          description: "Ambiente de desenvolvimento local",
        },
      ],
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
      customSiteTitle: "Auth Service - Documentação",
    }),
  );
  app.use(authRoute);
  app.listen(PORT, () => {
    logger.info("------------------------------------------------------");
    logger.info(`  Auth Service started successfully`);
    logger.info(`  API listening at  http://localhost:${PORT}`);
    logger.info(`  Swagger UI at     http://localhost:${PORT}/api-docs`);
    logger.info("------------------------------------------------------");
  });
};
