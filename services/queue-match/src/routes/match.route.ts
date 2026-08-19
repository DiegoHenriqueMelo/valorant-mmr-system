import { Router, Request, Response } from "express";
import { loggerEndpoint } from "../middlewares/loggerEndpoint.js";
import * as matchController from "../controllers/match.controller.js";
import client from "prom-client";

export const matchRoute: Router = Router();

const collectDefaultMetrics = client.collectDefaultMetrics;

collectDefaultMetrics();

/**
 * @openapi
 * tags:
 *   - name: Match
 *     description: >
 *       Gerenciamento do ciclo de criação de partidas.
 *       O serviço busca os dados de MMR de todos os jogadores, combina com a fila de espera
 *       persistida no Redis e, quando há jogadores suficientes (mínimo 10), forma partidas
 *       equilibradas divididas em dois times de 5. Jogadores que sobrarem são mantidos na
 *       fila de espera para o próximo ciclo.
 *
 * components:
 *   schemas:
 *     Player:
 *       type: object
 *       description: Representa um jogador dentro de uma partida.
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "jogador@exemplo.com"
 *         mmr:
 *           type: number
 *           description: Match Making Rating do jogador (pontuação de habilidade).
 *           example: 1350
 *
 *     Match:
 *       type: object
 *       description: Representa uma partida gerada pelo sistema de matchmaking.
 *       properties:
 *         teamA:
 *           type: array
 *           description: Time A — 5 jogadores com MMR médio mais baixo do grupo.
 *           items:
 *             $ref: "#/components/schemas/Player"
 *         teamB:
 *           type: array
 *           description: Time B — 5 jogadores com MMR médio mais alto do grupo.
 *           items:
 *             $ref: "#/components/schemas/Player"
 *         averageMMR:
 *           type: number
 *           description: Média de MMR dos 10 jogadores da partida (indica o nível geral da partida).
 *           example: 1425.6
 *
 *     ApiResponse:
 *       type: object
 *       properties:
 *         statusCode:
 *           type: integer
 *           description: Código HTTP da resposta.
 *         message:
 *           type: string
 *           description: Mensagem descritiva do resultado.
 *
 * /api/match:
 *   get:
 *     summary: Executa um ciclo de matchmaking
 *     description: >
 *       Inicia um ciclo completo de formação de partidas. O fluxo é:
 *
 *       1. Busca todos os jogadores e seus MMRs no **MMR Service**.
 *
 *       2. Recupera os jogadores que estavam aguardando da **fila de espera** (Redis).
 *
 *       3. Mescla as duas listas, evitando duplicatas por e-mail.
 *
 *       4. Se o total for menor que 10, todos são salvos na fila de espera e o ciclo é adiado
 *          (`202 Accepted`).
 *
 *       5. Com jogadores suficientes, ordena por MMR, agrupa em times de 5 e cria as partidas
 *          no banco de dados (`201 Created`). Jogadores que sobrarem voltam para a fila de espera.
 *     tags:
 *       - Match
 *     responses:
 *       201:
 *         description: >
 *           **Partida(s) criada(s) com sucesso.**
 *           Havia jogadores suficientes (≥ 10). As partidas foram formadas e salvas no banco de dados.
 *           Jogadores excedentes foram mantidos na fila de espera para o próximo ciclo.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 201
 *               message: "Partida criada com sucesso"
 *       202:
 *         description: >
 *           **Ciclo adiado — jogadores insuficientes.**
 *           Menos de 10 jogadores disponíveis no total. Todos foram salvos na fila de espera
 *           e o ciclo será concluído na próxima chamada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 202
 *               message: "Jogadores insuficientes. 7 jogador(es) na fila de espera."
 *       400:
 *         description: >
 *           **Partida duplicada detectada.**
 *           O banco de dados rejeitou a inserção por conflito de chave única (E11000).
 *           Isso indica que uma partida idêntica já foi registrada anteriormente.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 400
 *               message: "Partida duplicada"
 *       500:
 *         description: >
 *           **Erro interno.**
 *           Falha inesperada durante o ciclo de matchmaking — pode ser erro de conexão com
 *           o MMR Service, Redis ou MongoDB.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 500
 *               message: "Erro interno do servidor!"
 */
matchRoute.get(
  "/api/match",
  loggerEndpoint,
  async (_req: Request, res: Response) => {
    const result = await matchController.match();
    res.status(result[0]);
    res.send({ statusCode: result[0], message: result[1] });
  },
);

/**
 * @openapi
 * /api/match/all:
 *   get:
 *     summary: Lista todas as partidas criadas
 *     description: >
 *       Retorna o histórico completo de partidas criadas pelo sistema de matchmaking,
 *       ordenadas da mais recente para a mais antiga.
 *
 *       Não requer autenticação.
 *     tags:
 *       - Match
 *     responses:
 *       200:
 *         description: >
 *           **Lista retornada com sucesso.**
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 matches:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/Match"
 *       500:
 *         description: >
 *           **Erro interno.**
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 500
 *               message: "Erro interno do servidor"
 */
matchRoute.get(
  "/api/match/all",
  loggerEndpoint,
  async (_req: Request, res: Response) => {
    const result = await matchController.getAll();
    res.status(result[0]).json({ statusCode: result[0], matches: result[1] });
  },
);

/**
 * @openapi
 * /api/match/{id}:
 *   get:
 *     summary: Retorna uma partida específica pelo ID
 *     description: >
 *       Busca e retorna os dados completos de uma partida pelo seu identificador único (MongoDB ObjectId).
 *     tags:
 *       - Match
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da partida (MongoDB ObjectId).
 *         example: "664b1a2e3f4c5d6e7a8b9c0d"
 *     responses:
 *       200:
 *         description: >
 *           **Partida encontrada.**
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 match:
 *                   $ref: "#/components/schemas/Match"
 *       404:
 *         description: >
 *           **Partida não encontrada.**
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 404
 *               message: "Partida não encontrada"
 *       500:
 *         description: >
 *           **Erro interno.**
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 500
 *               message: "Erro interno do servidor"
 */
matchRoute.get(
  "/api/match/:id",
  loggerEndpoint,
  async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await matchController.getById(id);
    res.status(result[0]).json({ statusCode: result[0], match: result[1] });
  },
);

/**
 * @openapi
 * /api/match/{id}:
 *   delete:
 *     summary: Remove uma partida pelo ID
 *     description: >
 *       Exclui permanentemente uma partida do banco de dados pelo seu identificador único.
 *
 *       **Atenção:** esta operação é irreversível.
 *     tags:
 *       - Match
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da partida (MongoDB ObjectId).
 *         example: "664b1a2e3f4c5d6e7a8b9c0d"
 *     responses:
 *       200:
 *         description: >
 *           **Partida removida com sucesso.**
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 200
 *               message: "Partida removida com sucesso"
 *       404:
 *         description: >
 *           **Partida não encontrada.**
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 404
 *               message: "Partida não encontrada"
 *       500:
 *         description: >
 *           **Erro interno.**
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 500
 *               message: "Erro interno do servidor"
 */
matchRoute.delete(
  "/api/match/:id",
  loggerEndpoint,
  async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await matchController.deleteById(id);
    res.status(result[0]).json({ statusCode: result[0], message: result[1] });
  },
);

matchRoute.get("/api/metrics", async (_req: Request, res: Response) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

