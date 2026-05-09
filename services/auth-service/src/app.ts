import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import { authRoute } from "../routes/auth.routes.js";
import { connectMongo } from "../config/database.js";

dotenv.config();
const PORT = Number(process.env.PORT);
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
app.use(authRoute);
app.listen(Number(PORT), async () => {
  await connectMongo();

  console.log(`Servidor iniciano na porta ${PORT}`);
});
