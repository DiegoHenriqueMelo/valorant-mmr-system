import { Router, Request, Response } from "express";
import { loggerEndpoint } from "../middlewares/loggerEndpoint.js";
import * as playerController from "../controllers/player.controller.js";
import { tokenIsValid } from "../middlewares/auhtToken.js";

export const playerRoute: Router = Router();

/**
 * @openapi
 * /api/player:
 *  post:
 *    summary: Cria um novo jogador
 *    description: Cria um jogador
 *    tags:
 *      - Player
 *    security:
 *      - BearerAuth: []
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              nickname:
 *                type: string
 *                example: "Jogador1"
 *              rank:
 *                type: number
 *                example: 1
 *              agenteFavorito:
 *                type: number
 *                example: 10
 *              regiao:
 *                type: string
 *                example: "Américas"
 *    responses:
 *      201:
 *        description: "Jogador Criado"
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
 *                  example: "Criado com sucesso"
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
 *                  example: "Revise seus dados"
 */
playerRoute.post(
  "/api/player",
  loggerEndpoint,
  tokenIsValid,
  async (req: Request, res: Response) => {
    const body = { ...req.body, email: (req as any).user?.email };
    const result = await playerController.create(body);
    res.status(result[0]);
    res.send({ statusCode: result[0], message: result[1] });
  },
);

/**
 * @openapi
 * /api/player/me:
 *  get:
 *    summary: resgata informações sobre o player
 *    description: resgata informações sobre o player
 *    tags:
 *      - Player
 *    security:
 *      - BearerAuth: []
 *    responses:
 *      200:
 *        description: "Player encontrado"
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                statusCode:
 *                  type: number
 *                  example: 200
 *                token:
 *                  type: object
 *                  properties:
 *                    email:
 *                      type: string
 *                      example: "example@email.com"
 *                    nickname:
 *                      type: string
 *                      example: "Jogador1"
 *                    rank:
 *                      type: number
 *                      example: 200
 *                    agenteFavorito:
 *                      type: string
 *                      example: "Agente1"
 *                    ragiao:
 *                      type: string
 *                      example: "Regiao1"
 *      400:
 *        description: "Credenciais inválidas"
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
 *                  example: "Credenciais inválidas"
 */
playerRoute.get(
  "/api/player/me",
  loggerEndpoint,
  tokenIsValid,
  async (req: Request, res: Response) => {
    const body = { ...req.body, email: (req as any).user?.email };
    const result = await playerController.getPlayer(body);
    res.status(result[0]).json({ statusCode: result[0], player: result[1] });
  },
);
