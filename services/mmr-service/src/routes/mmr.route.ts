import { Router, Request, Response } from "express";
import { loggerEndpoint } from "../middlewares/loggerEndpoint.js";
import * as mmrController from "../controllers/mmr.controller.js";
import { tokenIsValid } from "../middlewares/auth.middleware.js";
import client from "prom-client";

export const mmrRoute: Router = Router();

const collectDefaultMetrics = client.collectDefaultMetrics;

collectDefaultMetrics();

/**
 * @openapi
 * tags:
 *   - name: MMR
 *     description: >
 *       Gerenciamento do MMR (Match Making Rating) dos jogadores.
 *       O MMR determina o nível de habilidade de cada jogador e é usado pelo
 *       Queue Match Service para formar partidas equilibradas.
 *
 *       **Fórmula de cálculo do MMR:**
 *       Para cada partida no histórico:
 *       - `score = round(kills / deaths + rankScore)` — onde `rankScore` é o índice do rank × 100 (obtido do Player Service)
 *       - `winRate`: incrementa +1 por vitória (`"VITÓRIA"`), -1 por derrota
 *
 *       MMR final: `round((lastMatchScore + winRate) / 3)`
 *
 * components:
 *   schemas:
 *     MatchRecord:
 *       type: object
 *       required:
 *         - kill
 *         - death
 *         - result
 *       properties:
 *         kill:
 *           type: integer
 *           description: Número de abates na partida.
 *           example: 20
 *         death:
 *           type: integer
 *           description: Número de mortes na partida. Não pode ser 0 (divisão por zero).
 *           example: 8
 *         result:
 *           type: string
 *           description: Resultado da partida. Use exatamente `"VITÓRIA"` para vitória (case-insensitive), qualquer outro valor conta como derrota.
 *           example: "VITÓRIA"
 *
 *     MmrRegisterRequest:
 *       type: object
 *       required:
 *         - historico
 *       properties:
 *         historico:
 *           oneOf:
 *             - $ref: "#/components/schemas/MatchRecord"
 *             - type: array
 *               items:
 *                 $ref: "#/components/schemas/MatchRecord"
 *           description: >
 *             Histórico de partidas a registrar. Pode ser um único objeto
 *             ou um array de partidas.
 *
 *     MmrEntry:
 *       type: object
 *       description: Entrada de MMR de um jogador no leaderboard.
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "jogador@exemplo.com"
 *         mmr:
 *           type: number
 *           description: MMR calculado do jogador.
 *           example: 1425
 *
 *     ApiResponse:
 *       type: object
 *       properties:
 *         statusCode:
 *           type: integer
 *         message:
 *           type: string
 *
 * /api/mmr:
 *   post:
 *     summary: Registra partida e recalcula o MMR do jogador
 *     description: >
 *       Registra uma ou mais partidas no histórico do jogador autenticado e recalcula seu MMR.
 *
 *       O e-mail do jogador é extraído automaticamente do **Bearer Token** — não é necessário
 *       informá-lo no corpo da requisição.
 *
 *       O `rankScore` é buscado automaticamente no **Player Service** usando o mesmo token.
 *       Certifique-se de que o perfil do jogador já foi criado via `POST /api/player`
 *       antes de chamar este endpoint.
 *
 *       **Atenção:** o campo `death` não pode ser `0` (causaria divisão por zero no cálculo).
 *     tags:
 *       - MMR
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/MmrRegisterRequest"
 *           examples:
 *             umaPartida:
 *               summary: Registro de uma partida
 *               value:
 *                 historico:
 *                   kill: 20
 *                   death: 8
 *                   result: "VITÓRIA"
 *             multipasPartidas:
 *               summary: Registro de múltiplas partidas
 *               value:
 *                 historico:
 *                   - kill: 20
 *                     death: 8
 *                     result: "VITÓRIA"
 *                   - kill: 5
 *                     death: 15
 *                     result: "Derrota"
 *     responses:
 *       201:
 *         description: >
 *           **MMR registrado com sucesso.**
 *           O histórico foi salvo e o MMR do jogador foi recalculado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 201
 *               message: "MMR adicionado"
 *       400:
 *         description: >
 *           **Registro duplicado.**
 *           Já existe um registro de MMR para este jogador com os mesmos dados (conflito E11000).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 400
 *               message: "Usuario duplicado"
 *       401:
 *         description: >
 *           **Token ausente ou inválido.**
 *           O Bearer Token não foi fornecido ou expirou.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 401
 *               message: "Token inválido"
 *       500:
 *         description: >
 *           **Erro interno.**
 *           Falha no cálculo do MMR, na comunicação com o Player Service ou na persistência no banco.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 500
 *               message: "Erro interno do servidor"
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
 *   get:
 *     summary: Retorna o leaderboard de MMR de todos os jogadores
 *     description: >
 *       Retorna a lista de todos os jogadores com seus respectivos MMRs.
 *       Este endpoint é utilizado internamente pelo **Queue Match Service** para
 *       buscar os dados necessários à formação de partidas equilibradas.
 *
 *       Não requer autenticação — a consulta é pública.
 *     tags:
 *       - MMR
 *     responses:
 *       200:
 *         description: >
 *           **Leaderboard retornado com sucesso.**
 *           Lista com e-mail e MMR de todos os jogadores cadastrados.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 mmrs:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/MmrEntry"
 *             example:
 *               statusCode: 200
 *               mmrs:
 *                 - email: "jogador1@exemplo.com"
 *                   mmr: 1520
 *                 - email: "jogador2@exemplo.com"
 *                   mmr: 980
 *       500:
 *         description: >
 *           **Erro interno.**
 *           Falha ao consultar o banco de dados.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 500
 *               message: "Erro interno do servidor"
 */
mmrRoute.get(
  "/api/mmr",
  loggerEndpoint,
  async (_req: Request, res: Response) => {
    const result = await mmrController.getAll();
    res.status(result[0]).json({ statusCode: result[0], mmrs: result[1] });
  },
);

/**
 * @openapi
 * /api/mmr/me:
 *   get:
 *     summary: Retorna o MMR detalhado do jogador autenticado
 *     description: >
 *       Retorna o registro completo de MMR do jogador autenticado, incluindo
 *       o histórico de partidas e o MMR calculado.
 *
 *       O e-mail é extraído automaticamente do Bearer Token.
 *     tags:
 *       - MMR
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: >
 *           **Registro de MMR encontrado.**
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 mmr:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       format: email
 *                       example: "jogador@exemplo.com"
 *                     mmr:
 *                       type: number
 *                       example: 1425
 *                     historico:
 *                       type: array
 *                       items:
 *                         $ref: "#/components/schemas/MatchRecord"
 *       401:
 *         description: >
 *           **Token ausente ou inválido.**
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 401
 *               message: "Token inválido"
 *       404:
 *         description: >
 *           **Registro de MMR não encontrado.**
 *           O jogador ainda não possui MMR registrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 404
 *               message: "Registro de MMR não encontrado"
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
mmrRoute.get(
  "/api/mmr/me",
  loggerEndpoint,
  tokenIsValid,
  async (req: Request, res: Response) => {
    const email = (req as any).mmr?.email;
    const result = await mmrController.getByEmail(email);
    res.status(result[0]).json({ statusCode: result[0], mmr: result[1] });
  },
);

/**
 * @openapi
 * /api/mmr:
 *   put:
 *     summary: Adiciona partidas ao histórico e recalcula o MMR
 *     description: >
 *       Acrescenta novas partidas ao histórico existente do jogador e recalcula o MMR.
 *       Diferente do POST, não cria um novo registro — atualiza o existente.
 *
 *       O e-mail e token são extraídos automaticamente do Bearer Token.
 *
 *       O jogador deve possuir um perfil no **Player Service** e um registro de MMR já existente
 *       (criado via `POST /api/mmr`) para usar este endpoint.
 *     tags:
 *       - MMR
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/MmrRegisterRequest"
 *           examples:
 *             umaPartida:
 *               summary: Atualização com uma partida
 *               value:
 *                 historico:
 *                   kill: 18
 *                   death: 6
 *                   result: "VITÓRIA"
 *             multipasPartidas:
 *               summary: Atualização com múltiplas partidas
 *               value:
 *                 historico:
 *                   - kill: 18
 *                     death: 6
 *                     result: "VITÓRIA"
 *                   - kill: 3
 *                     death: 12
 *                     result: "Derrota"
 *     responses:
 *       200:
 *         description: >
 *           **MMR atualizado com sucesso.**
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 200
 *               message: "MMR atualizado com sucesso"
 *       401:
 *         description: >
 *           **Token ausente ou inválido.**
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 401
 *               message: "Token inválido"
 *       404:
 *         description: >
 *           **Registro de MMR não encontrado.**
 *           Use `POST /api/mmr` para criar o registro antes de atualizar.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 404
 *               message: "Registro de MMR não encontrado"
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
mmrRoute.put(
  "/api/mmr",
  loggerEndpoint,
  tokenIsValid,
  async (req: Request, res: Response) => {
    const historico = Array.isArray(req.body.historico) ? req.body.historico : [req.body.historico];
    const body = { ...req.body, historico, token: (req as any).mmr?.token, email: (req as any).mmr?.email };
    const result = await mmrController.updateMMR(body);
    res.status(result[0]).json({ statusCode: result[0], message: result[1] });
  },
);

/**
 * @openapi
 * /api/mmr:
 *   delete:
 *     summary: Remove o registro de MMR do jogador autenticado
 *     description: >
 *       Exclui permanentemente o registro de MMR do jogador autenticado,
 *       incluindo todo o histórico de partidas.
 *
 *       O e-mail é extraído automaticamente do Bearer Token.
 *
 *       **Atenção:** esta operação é irreversível.
 *     tags:
 *       - MMR
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: >
 *           **Registro de MMR removido com sucesso.**
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 200
 *               message: "Registro de MMR removido com sucesso"
 *       401:
 *         description: >
 *           **Token ausente ou inválido.**
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 401
 *               message: "Token inválido"
 *       404:
 *         description: >
 *           **Registro de MMR não encontrado.**
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 404
 *               message: "Registro de MMR não encontrado"
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
mmrRoute.delete(
  "/api/mmr",
  loggerEndpoint,
  tokenIsValid,
  async (req: Request, res: Response) => {
    const email = (req as any).mmr?.email;
    const result = await mmrController.deleteMMR(email);
    res.status(result[0]).json({ statusCode: result[0], message: result[1] });
  },
);

mmrRoute.get("/api/metrics", async (_req: Request, res: Response) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});
