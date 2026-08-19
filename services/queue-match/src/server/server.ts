import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import path from "path";
import { matchRoute } from "../routes/match.route.js";
import { connectMongo } from "../config/database.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("server");

export const startServer = async () => {
  dotenv.config();
  await connectMongo();
  const PORT = Number(process.env.MMR_MATCH);
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
      customSiteTitle: "Vava Macth - Documentação",
    }),
  );
  app.use(matchRoute);
  app.listen(Number(PORT), async () => {
    logger.info(`Servidor iniciado na porta: http://localhost:${PORT}`);
    logger.info(`SWAGGER iniciado na porta: http://localhost:${PORT}/api-docs`);
  });
};
