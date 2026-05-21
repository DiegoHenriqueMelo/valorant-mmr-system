import { Router, Request, Response } from "express";
import { loggerEndpoint } from "../middlewares/loggerEndpoint.js";
import * as authController from "../controllers/auth.controller.js";
import { tokenIsValid } from "../middlewares/auth.middleware.js";
import client from "prom-client";

const collectDefaultMetrics = client.collectDefaultMetrics;

collectDefaultMetrics();

export const authRoute: Router = Router();

/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: >
 *       Autenticação e cadastro de usuários.
 *       O registro criptografa a senha com bcrypt (10 rounds) antes de persistir no banco.
 *       O login valida as credenciais e retorna um **JWT** utilizado como Bearer Token
 *       nos demais serviços (Player Service, MMR Service).
 *
 * components:
 *   schemas:
 *     AuthRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: E-mail único do usuário.
 *           example: "jogador@exemplo.com"
 *         password:
 *           type: string
 *           format: password
 *           description: Senha em texto puro (será criptografada pelo servidor).
 *           example: "minhaSenha123"
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
 *     UpdatePasswordRequest:
 *       type: object
 *       required:
 *         - currentPassword
 *         - newPassword
 *       properties:
 *         currentPassword:
 *           type: string
 *           format: password
 *           description: Senha atual do usuário para confirmação.
 *           example: "minhaSenha123"
 *         newPassword:
 *           type: string
 *           format: password
 *           description: Nova senha que substituirá a atual.
 *           example: "novaSenha456"
 *
 *     DeleteAccountRequest:
 *       type: object
 *       required:
 *         - password
 *       properties:
 *         password:
 *           type: string
 *           format: password
 *           description: Senha do usuário para confirmar a exclusão da conta.
 *           example: "minhaSenha123"
 *
 *     UserRecord:
 *       type: object
 *       description: Registro de usuário sem dados sensíveis.
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "jogador@exemplo.com"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 *         lastLogin:
 *           type: string
 *           format: date-time
 *           example: "2024-05-10T08:00:00.000Z"
 *
 *     LoginResponse:
 *       type: object
 *       properties:
 *         statusCode:
 *           type: integer
 *           example: 200
 *         token:
 *           type: string
 *           description: >
 *             JWT gerado para o usuário. Deve ser enviado como
 *             `Authorization: Bearer <token>` nas requisições autenticadas.
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *
 * /api/auth:
 *   post:
 *     summary: Cadastra um novo usuário
 *     description: >
 *       Cria uma nova conta no sistema. O campo `email` deve ser único.
 *       A senha é criptografada com **bcrypt (10 rounds)** antes de ser armazenada —
 *       nunca é persistida em texto puro.
 *
 *       Após o cadastro, realize o login em `POST /api/auth/login` para obter o token JWT.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/AuthRequest"
 *     responses:
 *       201:
 *         description: >
 *           **Usuário criado com sucesso.**
 *           Conta registrada e senha armazenada de forma segura.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 201
 *               message: "Criado com sucesso"
 *       400:
 *         description: >
 *           **E-mail já cadastrado.**
 *           Já existe um usuário com esse e-mail no banco de dados.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 400
 *               message: "Algum usuario ja tem esses dados cadastrados"
 *       500:
 *         description: >
 *           **Erro interno.**
 *           Falha inesperada — pode ser erro de banco de dados ou de criptografia da senha.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 500
 *               message: "Não foi possivel criptografar senha"
 */
authRoute.post(
  "/api/auth",
  loggerEndpoint,
  async (req: Request, res: Response) => {
    const body = req.body;
    const result = await authController.register(body);
    res.status(result[0]);
    res.send({ statusCode: result[0], message: result[1] });
  },
);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Autentica um usuário e retorna o JWT
 *     description: >
 *       Valida as credenciais do usuário e, em caso de sucesso, retorna um **JWT**
 *       que deve ser usado como `Bearer Token` nos endpoints protegidos dos outros serviços.
 *
 *       O token possui validade configurada pela variável de ambiente `JWT_EXPIRES_IN` (em segundos).
 *
 *       **Como usar o token:**
 *       Copie o valor do campo `token` e inclua no header das próximas requisições:
 *       ```
 *       Authorization: Bearer <token>
 *       ```
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/AuthRequest"
 *     responses:
 *       200:
 *         description: >
 *           **Login realizado com sucesso.**
 *           Use o token retornado como Bearer Token nos demais serviços.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/LoginResponse"
 *             example:
 *               statusCode: 200
 *               token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImpvZ2Fkb3JAZXhlbXBsby5jb20iLCJpYXQiOjE3MTYwMDAwMDB9.abc123"
 *       500:
 *         description: >
 *           **Credenciais inválidas ou erro interno.**
 *           O usuário não foi encontrado, a senha está incorreta, ou ocorreu uma falha
 *           ao gerar o token JWT.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/LoginResponse"
 *             examples:
 *               credenciaisInvalidas:
 *                 summary: Senha incorreta
 *                 value:
 *                   statusCode: 500
 *                   token: "Credenciais inválidas"
 *               usuarioNaoEncontrado:
 *                 summary: Usuário não encontrado
 *                 value:
 *                   statusCode: 500
 *                   token: "Usuário não encontrado"
 */
/**
 * @openapi
 * /api/auth:
 *   get:
 *     summary: Lista todos os usuários cadastrados
 *     description: >
 *       Retorna a lista de todas as contas de usuário registradas no sistema.
 *       O campo `passwordHash` é omitido da resposta por segurança.
 *
 *       Requer autenticação via Bearer Token.
 *     tags:
 *       - Auth
 *     security:
 *       - BearerAuth: []
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
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/UserRecord"
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 500
 *               message: "Erro interno do servidor"
 */
authRoute.get(
  "/api/auth",
  loggerEndpoint,
  tokenIsValid,
  async (_req: Request, res: Response) => {
    const result = await authController.getAll();
    res.status(result[0]).json({ statusCode: result[0], users: result[1] });
  },
);

/**
 * @openapi
 * /api/auth/password:
 *   put:
 *     summary: Atualiza a senha do usuário autenticado
 *     description: >
 *       Permite que o usuário autenticado altere sua própria senha.
 *       A senha atual deve ser informada para confirmação antes de definir a nova.
 *
 *       O e-mail é extraído automaticamente do Bearer Token.
 *     tags:
 *       - Auth
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/UpdatePasswordRequest"
 *     responses:
 *       200:
 *         description: >
 *           **Senha atualizada com sucesso.**
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 200
 *               message: "Senha atualizada com sucesso"
 *       401:
 *         description: >
 *           **Token inválido ou senha atual incorreta.**
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             examples:
 *               tokenInvalido:
 *                 summary: Token ausente ou expirado
 *                 value:
 *                   statusCode: 401
 *                   message: "Token inválido"
 *               senhaErrada:
 *                 summary: Senha atual incorreta
 *                 value:
 *                   statusCode: 401
 *                   message: "Senha atual inválida"
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
authRoute.put(
  "/api/auth/password",
  loggerEndpoint,
  tokenIsValid,
  async (req: Request, res: Response) => {
    const body = { ...req.body, email: (req as any).user?.email };
    const result = await authController.updatePassword(body);
    res.status(result[0]).json({ statusCode: result[0], message: result[1] });
  },
);

/**
 * @openapi
 * /api/auth:
 *   delete:
 *     summary: Remove a conta do usuário autenticado
 *     description: >
 *       Exclui permanentemente a conta do usuário autenticado.
 *       A senha deve ser informada no body para confirmar a exclusão.
 *
 *       O e-mail é extraído automaticamente do Bearer Token.
 *
 *       **Atenção:** esta operação é irreversível. Todos os dados da conta serão removidos.
 *     tags:
 *       - Auth
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/DeleteAccountRequest"
 *     responses:
 *       200:
 *         description: >
 *           **Conta removida com sucesso.**
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             example:
 *               statusCode: 200
 *               message: "Conta removida com sucesso"
 *       401:
 *         description: >
 *           **Token inválido ou senha incorreta.**
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *             examples:
 *               tokenInvalido:
 *                 summary: Token ausente ou expirado
 *                 value:
 *                   statusCode: 401
 *                   message: "Token inválido"
 *               credenciaisInvalidas:
 *                 summary: Senha incorreta
 *                 value:
 *                   statusCode: 401
 *                   message: "Credenciais inválidas"
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
authRoute.delete(
  "/api/auth",
  loggerEndpoint,
  tokenIsValid,
  async (req: Request, res: Response) => {
    const body = { ...req.body, email: (req as any).user?.email };
    const result = await authController.deleteAccount(body);
    res.status(result[0]).json({ statusCode: result[0], message: result[1] });
  },
);

authRoute.post(
  "/api/auth/login",
  loggerEndpoint,
  async (req: Request, res: Response) => {
    const body = req.body;
    const result = await authController.login(body);
    res.status(result[0]).json({ statusCode: result[0], token: result[1] });
  },
);

authRoute.get("/api/metrics", async (req: Request, res: Response) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});
