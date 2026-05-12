import { Router, Request, Response } from "express";
import { loggerEndpoint } from "../middlewares/loggerEndpoint.js";
import * as mmrController from "../controllers/mmr.controller.js";
import { tokenIsValid } from "../middlewares/auth.middleware.js";

export const mmrRoute: Router = Router();

/**
 * @openapi
 * /api/mmr:
 *  post:
 *    summary: gera um novo registro de partida
 *    description: gera um novo registro de partida
 *    tags:
 *      - MMR
 *    security:
 *      - BearerAuth: []
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              historico:
 *                type: object
 *                properties:
 *                  kill:
 *                    type: number
 *                    example: 15
 *                  death:
 *                    type: number
 *                    example: 10
 *                  assistance:
 *                    type: number
 *                    example: 12
 *                  result:
 *                    type: string
 *                    example: "Vitória" 
 *    responses:
 *      201:
 *        description: "MMR adicionado"
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                statusCode:
 *                  type: number
 *                  example: 201
 *                message:
 *                  type: string
 *                  example: "MMR adicionado"
 *      400:
 *        description: "Dados inválidos"
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                statusCode:
 *                  type: number
 *                  example: 400
 *                message:
 *                  type: string
 *                  example: "Dados inválidos"
 */
mmrRoute.post(
  "/api/mmr",
  loggerEndpoint,
  tokenIsValid,
  async (req: Request, res: Response) => {
    const historico = Array.isArray(req.body.historico) ? req.body.historico : [req.body.historico];
    const body = { ...req.body, historico, token: (req as any).mmr?.token, email: (req as any).mmr?.email };
    const result = await mmrController.register(body);
    res.status(result[0]);
    res.send({ statusCode: result[0], message: result[1] });
  },
);

/**
 * @openapi
 * /api/mmr:
 *  get:
 *    summary: Resgata todos os mmr's
 *    description: Resgata todos os mmr's
 *    tags:
 *      - MMR
 *    responses:
 *      200:
 *        description: "Dados resgatados"
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                statusCode:
 *                  type: number
 *                  example: 200
 *                token:
 *                  type: string
 *                  example: "Dados resgatados"
 *      400:
 *        description: "Dados não encontrados"
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                statusCode:
 *                  type: number
 *                  example: 400
 *                message:
 *                  type: string
 *                  example: "Dados não encontrados"
 */
mmrRoute.get(
  "/api/mmr",
  loggerEndpoint,
  async (req: Request, res: Response) => {
    const result = await mmrController.getAll();
    res.status(result[0]).json({ statusCode: result[0], mmrs: result[1] });
  },
);
