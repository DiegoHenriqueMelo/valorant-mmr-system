import { Router, Request, Response } from "express";
import { loggerEndpoint } from "../middlewares/loggerEndpoint.js";
import * as matchController from "../controllers/match.controller.js";

export const matchRoute: Router = Router();

/**
 * @openapi
 * /api/match:
 *  get:
 *    summary: gera uma nova partida com base no mmr
 *    description: gera uma nova partida com base no mmr
 *    tags:
 *      - Match
 *    responses:
 *      201:
 *        description: "Partida criada"
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
 *                  example: "Partida Criada"
 *      400:
 *        description: "Jogadores insuficientes"
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
 *                  example: "Jogadores insuficientes"
 */
matchRoute.get(
  "/api/match",
  loggerEndpoint,
  async (req: Request, res: Response) => {
    const result = await matchController.match();
    res.status(result[0]);
    res.send({ statusCode: result[0], message: result[1] });
  },
);

// /**
//  * @openapi
//  * /api/mmr:
//  *  get:
//  *    summary: Resgata todos os mmr's
//  *    description: Resgata todos os mmr's
//  *    tags:
//  *      - MMR
//  *    responses:
//  *      200:
//  *        description: "Dados resgatados"
//  *        content:
//  *          application/json:
//  *            schema:
//  *              type: object
//  *              properties:
//  *                statusCode:
//  *                  type: number
//  *                  example: 200
//  *                token:
//  *                  type: string
//  *                  example: "Dados resgatados"
//  *      400:
//  *        description: "Dados não encontrados"
//  *        content:
//  *          application/json:
//  *            schema:
//  *              type: object
//  *              properties:
//  *                statusCode:
//  *                  type: number
//  *                  example: 400
//  *                message:
//  *                  type: string
//  *                  example: "Dados não encontrados"
//  */
// mmrRoute.get(
//   "/api/mmr",
//   loggerEndpoint,
//   async (req: Request, res: Response) => {
//     const result = await mmrController.getAll();
//     res.status(result[0]).json({ statusCode: result[0], mmrs: result[1] });
//   },
// );
