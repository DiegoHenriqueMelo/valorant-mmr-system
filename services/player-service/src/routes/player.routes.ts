import { Router, Request, Response } from "express";
import { loggerEndpoint } from "../middlewares/loggerEndpoint.js";
import * as playerController from "../controllers/player.controller.js";
import { tokenIsValid } from "../middlewares/auhtToken.js";
import client from "prom-client";

export const playerRoute: Router = Router();

const collectDefaultMetrics = client.collectDefaultMetrics;

collectDefaultMetrics();

/**
 * @openapi
 * tags:
 *   - name: Player
 *     description: >
 *       Gerenciamento de perfis de jogadores.
 *       Cada usuário autenticado pode criar um único perfil de jogador com nickname,
 *       rank e agente favorito. O perfil é vinculado ao e-mail extraído do JWT.
 *
 *       O **rank** e o **agente favorito** são informados como índices numéricos:
 *
 *       **Ranks disponíveis (campo `rank`):**
 *       | Índice | Rank |
 *       |--------|------|
 *       | 1 | Ferro 1 | 2 | Ferro 2 | 3 | Ferro 3 |
 *       | 4 | Bronze 1 | 5 | Bronze 2 | 6 | Bronze 3 |
 *       | 7 | Prata 1 | 8 | Prata 2 | 9 | Prata 3 |
 *       | 10 | Ouro 1 | 11 | Ouro 2 | 12 | Ouro 3 |
 *       | 13 | Platina 1 | 14 | Platina 2 | 15 | Platina 3 |
 *       | 16 | Diamante 1 | 17 | Diamante 2 | 18 | Diamante 3 |
 *       | 19 | Ascendente 1 | 20 | Ascendente 2 | 21 | Ascendente 3 |
 *       | 22 | Imortal 1 | 23 | Imortal 2 | 24 | Imortal 3 |
 *       | 25 | Radiante |
 *
 *       **Agentes disponíveis (campo `agenteFavorito`):**
 *       0=Astra, 1=Breach, 2=Brimstone, 3=Chamber, 4=Clove, 5=Cypher, 6=Deadlock,
 *       7=Fade, 8=Gekko, 9=Harbor, 10=Iso, 11=Jett, 12=Kayo, 13=Killjoy, 14=Miks,
 *       15=Neon, 16=Omen, 17=Phoenix, 18=Raze, 19=Reyna, 20=Sage, 21=Skye, 22=Sova,
 *       23=Tejo, 24=Veto, 25=Viper, 26=Vyse, 27=Waylay, 28=Yoru
 *
 * components:
 *   schemas:
 *     PlayerCreateRequest:
 *       type: object
 *       required:
 *         - nickname
 *         - rank
 *         - agenteFavorito
 *         - regiao
 *       properties:
 *         nickname:
 *           type: string
 *           description: Nome de exibição único do jogador.
 *           example: "ShadowHunter"
 *         rank:
 *           type: integer
 *           minimum: 1
 *           maximum: 25
 *           description: Índice do rank (1=Ferro1 ... 25=Radiante).
 *           example: 16
 *         agenteFavorito:
 *           type: integer
 *           minimum: 0
 *           maximum: 28
 *           description: Índice do agente favorito (0=Astra ... 28=Yoru).
 *           example: 11
 *         regiao:
 *           type: string
 *           description: Região do servidor onde o jogador joga.
 *           example: "Américas"
 *
 *     PlayerProfile:
 *       type: object
 *       description: Perfil completo do jogador.
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "jogador@exemplo.com"
 *         nickname:
 *           type: string
 *           example: "ShadowHunter"
 *         rank:
 *           type: string
 *           description: Nome do rank resolvido a partir do índice.
 *           example: "Diamante1"
 *         agenteFavorito:
 *           type: string
 *           description: Nome do agente resolvido a partir do índice.
 *           example: "Jett"
 *         regiao:
 *           type: string
 *           example: "Américas"
 *         rankScore:
 *           type: number
 *           description: Pontuação numérica do rank (índice × 100), usada no cálculo do MMR.
 *           example: 1600
 *
 *     ApiResponse:
 *       type: object
 *       properties:
 *         statusCode:
 *           type: integer
 *         message:
 *           type: string
 *
 * /api/player:
 *   post:
 *     summary: Cria o perfil do jogador autenticado
 *     description: >
 *       Cria um perfil de jogador vinculado ao usuário autenticado.
 *       O **e-mail é extraído automaticamente do Bearer Token** — não é necessário
 *       informá-lo no body.
 *
 *       Cada usuário pode ter apenas um perfil. `nickname` e `email` devem ser únicos no banco.
 *
 *       O `rankScore` gerado (índice × 100) será utilizado pelo **MMR Service**
 *       no cálculo de pontuação das partidas.
 *     tags:
 *       - Player
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/PlayerCreateRequest"
 *           example:
 *             nickname: "ShadowHunter"
 *             rank: 16
 *             agenteFavorito: 11
 *             regiao: "Américas"
 *     responses:
 *       201:
 *         description: >
 *           **Perfil criado com sucesso.**
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 201
 *               message: "Criado com sucesso"
 *       400:
 *         description: >
 *           **Nickname ou e-mail já cadastrado.**
 *           Conflito de chave única no banco de dados (E11000).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 400
 *               message: "Algum usuario ja tem esses dados cadastrados"
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
 *       500:
 *         description: >
 *           **Erro interno.**
 *           Índice de rank ou agente fora do intervalo válido, ou falha no banco de dados.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 500
 *               message: "Erro interno do servidor"
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
 *   get:
 *     summary: Retorna o perfil do jogador autenticado
 *     description: >
 *       Retorna os dados do perfil do jogador vinculado ao usuário autenticado.
 *       O **e-mail é extraído automaticamente do Bearer Token**.
 *
 *       Este endpoint também é consumido internamente pelo **MMR Service** para
 *       obter o `rankScore` necessário ao cálculo do MMR.
 *
 *       O `rankScore` retornado equivale ao índice do rank multiplicado por 100
 *       (ex.: Diamante1 = índice 16 → rankScore = 1600).
 *     tags:
 *       - Player
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: >
 *           **Perfil encontrado.**
 *           Retorna os dados completos do jogador incluindo o `rankScore` calculado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 player:
 *                   $ref: "#/components/schemas/PlayerProfile"
 *             example:
 *               statusCode: 200
 *               player:
 *                 email: "jogador@exemplo.com"
 *                 nickname: "ShadowHunter"
 *                 rank: "Diamante1"
 *                 agenteFavorito: "Jett"
 *                 regiao: "Américas"
 *                 rankScore: 1600
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
 *       500:
 *         description: >
 *           **Jogador não encontrado ou erro interno.**
 *           O usuário está autenticado mas não possui um perfil de jogador criado,
 *           ou ocorreu uma falha no banco de dados.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 500
 *               message: "Jogador não encontrado"
 */
/**
 * @openapi
 * /api/player:
 *   get:
 *     summary: Lista todos os perfis de jogadores
 *     description: >
 *       Retorna a lista completa de todos os perfis de jogadores cadastrados no sistema.
 *       Endpoint público — não requer autenticação.
 *     tags:
 *       - Player
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
 *                 players:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/PlayerProfile"
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
playerRoute.get(
  "/api/player",
  loggerEndpoint,
  async (_req: Request, res: Response) => {
    const result = await playerController.getAll();
    res.status(result[0]).json({ statusCode: result[0], players: result[1] });
  },
);

/**
 * @openapi
 * /api/player/me:
 *   put:
 *     summary: Atualiza o perfil do jogador autenticado
 *     description: >
 *       Atualiza um ou mais campos do perfil do jogador autenticado.
 *       Todos os campos são opcionais — informe apenas os que deseja alterar.
 *
 *       O e-mail é extraído automaticamente do Bearer Token.
 *
 *       O `rank` e o `agenteFavorito` continuam sendo informados como índices numéricos
 *       (mesmas tabelas do POST /api/player).
 *     tags:
 *       - Player
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nickname:
 *                 type: string
 *                 description: Novo nickname único do jogador.
 *                 example: "NovaNickname"
 *               rank:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 25
 *                 description: Novo índice de rank (1=Ferro1 ... 25=Radiante).
 *                 example: 20
 *               agenteFavorito:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 28
 *                 description: Novo índice do agente favorito (0=Astra ... 28=Yoru).
 *                 example: 18
 *               regiao:
 *                 type: string
 *                 description: Nova região do servidor.
 *                 example: "Europa"
 *           example:
 *             rank: 20
 *             agenteFavorito: 18
 *     responses:
 *       200:
 *         description: >
 *           **Perfil atualizado com sucesso.**
 *           Retorna o perfil completo com os dados atualizados.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 player:
 *                   $ref: "#/components/schemas/PlayerProfile"
 *       400:
 *         description: >
 *           **Conflito de nickname.**
 *           O novo nickname já está em uso por outro jogador.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 400
 *               message: "Algum usuario ja tem esses dados cadastrados"
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
 *           **Jogador não encontrado.**
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 404
 *               message: "Jogador não encontrado"
 *       500:
 *         description: >
 *           **Erro interno.**
 *           Índice de rank ou agente fora do intervalo válido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 500
 *               message: "Rank não existente"
 */
playerRoute.put(
  "/api/player/me",
  loggerEndpoint,
  tokenIsValid,
  async (req: Request, res: Response) => {
    const body = { ...req.body, email: (req as any).user?.email };
    const result = await playerController.updatePlayer(body);
    res.status(result[0]).json({ statusCode: result[0], player: result[1] });
  },
);

/**
 * @openapi
 * /api/player/me:
 *   delete:
 *     summary: Remove o perfil do jogador autenticado
 *     description: >
 *       Exclui permanentemente o perfil do jogador vinculado ao usuário autenticado.
 *       O e-mail é extraído automaticamente do Bearer Token.
 *
 *       **Atenção:** esta operação é irreversível. O perfil será removido do banco de dados.
 *     tags:
 *       - Player
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: >
 *           **Perfil removido com sucesso.**
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 200
 *               message: "Perfil removido com sucesso"
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
 *           **Jogador não encontrado.**
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 404
 *               message: "Jogador não encontrado"
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
playerRoute.delete(
  "/api/player/me",
  loggerEndpoint,
  tokenIsValid,
  async (req: Request, res: Response) => {
    const body = { email: (req as any).user?.email };
    const result = await playerController.deletePlayer(body);
    res.status(result[0]).json({ statusCode: result[0], message: result[1] });
  },
);

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

playerRoute.get("/api/metrics", async (_req: Request, res: Response) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});
