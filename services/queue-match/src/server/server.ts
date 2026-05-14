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
        title: "Queue Match",
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
