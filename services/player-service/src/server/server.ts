import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
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
        title: "Vava Match",
        version: "1.0.0",
      },
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
    apis: ["./src/routes/**/*.ts", "./routes/**/*.ts"],
  });
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "Vava Macth - Documentação",
    }),
  );
  app.use(playerRoute);
  app.listen(Number(PORT), async () => {
    logger.info(`Servidor iniciado na porta: http://localhost:${PORT}`);
    logger.info(`SWAGGER iniciado na porta: http://localhost:${PORT}/api-docs`);
  });
};
