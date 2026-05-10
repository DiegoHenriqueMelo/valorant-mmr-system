import { Router, Request, Response } from "express";
import * as authController from "../controllers/auth.controller.js";

export const authRoute: Router = Router();

/**
 * @openapi
 * /api/auth:
 *  post:
 *    summary: Cria um novo usuario
 *    description: Cria um usuario
 *    tags:
 *      - Auth
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              email:
 *                type: string
 *                example: "example@email.com"
 *              password:
 *                type: string
 *                example: "12345"
 *    responses:
 *      201:
 *        description: "Usuario Criado"
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
 *                  example: "Algum usuario ja tem esses dados cadastrados"
 */
authRoute.post("/api/auth", async (req: Request, res: Response) => {
  const body = req.body;
  const result = await authController.register(body);
  res.status(result[0]);
  res.send({ statusCode: result[0], message: result[1] });
});

/**
 * @openapi
 * /api/auth/login:
 *  post:
 *    summary: login no sistema
 *    description: login no sistema
 *    tags:
 *      - Auth
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              email:
 *                type: string
 *                example: "example@email.com"
 *              password:
 *                type: string
 *                example: "12345"
 *    responses:
 *      200:
 *        description: "Login realizado"
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
 *                  example: "Login Realizado"
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
authRoute.post("/api/auth/login", async (req: Request, res: Response) => {
  const body = req.body;
  const result = await authController.login(body);
  res.status(result[0]).json({ statusCode: result[0], token: result[1] });
});
