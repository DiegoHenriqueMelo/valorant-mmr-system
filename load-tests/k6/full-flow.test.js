/**
 * Teste de fluxo completo — simula a jornada real de um jogador:
 *   1. Cadastro no auth-service
 *   2. Login e obtenção do JWT
 *   3. Criação de perfil no player-service
 *   4. Registro de partidas e cálculo de MMR no mmr-service
 *   5. Consulta ao leaderboard
 *   6. Adição de novas partidas (update MMR)
 *   7. Trigger do ciclo de matchmaking no queue-match
 *   8. Listagem das partidas criadas
 *   9. Limpeza (delete MMR → delete player → delete conta)
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const AUTH_URL = __ENV.AUTH_URL || 'http://localhost:3001';
const PLAYER_URL = __ENV.PLAYER_URL || 'http://localhost:3002';
const MMR_URL = __ENV.MMR_URL || 'http://localhost:3003';
const QUEUE_URL = __ENV.QUEUE_URL || 'http://localhost:3004';

const flowErrors = new Rate('flow_errors');
const fullFlowDuration = new Trend('full_flow_duration', true);
const completedFlows = new Counter('completed_flows');

const RANKS = [1, 4, 7, 10, 13, 16, 19, 22, 25];
const AGENTS = [0, 2, 5, 11, 13, 17, 19, 20, 22];
const REGIOES = ['Américas', 'Europa', 'Ásia-Pacífico'];
const RESULTADOS = ['VITÓRIA', 'Derrota'];

const SCENARIOS = {
  smoke: {
    executor: 'constant-vus',
    vus: 1,
    duration: '1m',
  },
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 10 },
      { duration: '5m', target: 10 },
      { duration: '2m', target: 0 },
    ],
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 20 },
      { duration: '5m', target: 50 },
      { duration: '3m', target: 80 },
      { duration: '2m', target: 0 },
    ],
  },
  spike: {
    executor: 'ramping-vus',
    startVUs: 2,
    stages: [
      { duration: '10s', target: 2 },
      { duration: '30s', target: 100 },
      { duration: '2m', target: 100 },
      { duration: '30s', target: 2 },
    ],
  },
};

const scenario = __ENV.TEST_SCENARIO || 'smoke';

export const options = {
  scenarios: {
    [scenario]: SCENARIOS[scenario],
  },
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<4000'],
    http_req_failed: ['rate<0.05'],
    flow_errors: ['rate<0.1'],
    full_flow_duration: ['p(95)<5000'],
  },
};

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomMatch() {
  return {
    kill: randomInt(1, 30),
    death: randomInt(1, 20), // nunca 0 — divisão por zero no cálculo de MMR
    result: randomItem(RESULTADOS),
  };
}

export default function () {
  const startTime = Date.now();
  const id = `vu${__VU}_i${__ITER}_${Date.now()}`;

  const user = {
    email: `flow_${id}@valorant.test`,
    password: 'FlowTest@123',
    nickname: `FlowP_${id}`.substring(0, 30),
    rank: randomItem(RANKS),
    agenteFavorito: randomItem(AGENTS),
    regiao: randomItem(REGIOES),
  };

  let token = null;

  // ── ETAPA 1: Cadastro ───────────────────────────────────────────────────────
  let step1Ok = false;
  group('1 — POST /api/auth (cadastro)', () => {
    const res = http.post(
      `${AUTH_URL}/api/auth`,
      JSON.stringify({ email: user.email, password: user.password }),
      { headers: JSON_HEADERS }
    );
    step1Ok = check(res, {
      'cadastro → 201': (r) => r.status === 201,
    });
    if (!step1Ok) flowErrors.add(1);
  });

  if (!step1Ok) { sleep(1); return; }
  sleep(0.2);

  // ── ETAPA 2: Login ──────────────────────────────────────────────────────────
  let step2Ok = false;
  group('2 — POST /api/auth/login', () => {
    const res = http.post(
      `${AUTH_URL}/api/auth/login`,
      JSON.stringify({ email: user.email, password: user.password }),
      { headers: JSON_HEADERS }
    );
    step2Ok = check(res, {
      'login → 200': (r) => r.status === 200,
      'login → token presente': (r) => {
        try { return !!JSON.parse(r.body).token; } catch { return false; }
      },
    });
    if (step2Ok) token = JSON.parse(res.body).token;
    if (!step2Ok) flowErrors.add(1);
  });

  if (!step2Ok || !token) { sleep(1); return; }

  const authHeaders = { ...JSON_HEADERS, Authorization: `Bearer ${token}` };
  sleep(0.2);

  // ── ETAPA 3: Criar perfil de jogador ────────────────────────────────────────
  let step3Ok = false;
  group('3 — POST /api/player (criar perfil)', () => {
    const res = http.post(
      `${PLAYER_URL}/api/player`,
      JSON.stringify({
        nickname: user.nickname,
        rank: user.rank,
        agenteFavorito: user.agenteFavorito,
        regiao: user.regiao,
      }),
      { headers: authHeaders }
    );
    step3Ok = check(res, {
      'criar perfil → 201': (r) => r.status === 201,
    });
    if (!step3Ok) flowErrors.add(1);
  });

  if (!step3Ok) {
    http.del(`${AUTH_URL}/api/auth`, JSON.stringify({ password: user.password }), { headers: authHeaders });
    sleep(1);
    return;
  }
  sleep(0.2);

  // ── ETAPA 4: Registrar MMR com histórico inicial ────────────────────────────
  let step4Ok = false;
  group('4 — POST /api/mmr (registrar MMR)', () => {
    const res = http.post(
      `${MMR_URL}/api/mmr`,
      JSON.stringify({ historico: [randomMatch(), randomMatch(), randomMatch()] }),
      { headers: authHeaders }
    );
    step4Ok = check(res, {
      'registrar MMR → 201': (r) => r.status === 201,
    });
    if (!step4Ok) flowErrors.add(1);
  });

  if (!step4Ok) {
    http.del(`${PLAYER_URL}/api/player/me`, null, { headers: authHeaders });
    http.del(`${AUTH_URL}/api/auth`, JSON.stringify({ password: user.password }), { headers: authHeaders });
    sleep(1);
    return;
  }
  sleep(0.2);

  // ── ETAPA 5: Consultar leaderboard ─────────────────────────────────────────
  group('5 — GET /api/mmr (leaderboard)', () => {
    const res = http.get(`${MMR_URL}/api/mmr`);
    check(res, {
      'leaderboard → 200': (r) => r.status === 200,
      'leaderboard → array de MMRs': (r) => {
        try { return Array.isArray(JSON.parse(r.body).mmrs); } catch { return false; }
      },
    });
  });

  sleep(0.2);

  // ── ETAPA 6: Atualizar MMR com novas partidas ───────────────────────────────
  group('6 — PUT /api/mmr (adicionar partidas)', () => {
    const res = http.put(
      `${MMR_URL}/api/mmr`,
      JSON.stringify({ historico: [randomMatch(), randomMatch()] }),
      { headers: authHeaders }
    );
    check(res, {
      'update MMR → 200': (r) => r.status === 200,
    });
  });

  sleep(0.2);

  // ── ETAPA 7: Ciclo de matchmaking ───────────────────────────────────────────
  group('7 — GET /api/match (matchmaking)', () => {
    const res = http.get(`${QUEUE_URL}/api/match`);
    check(res, {
      // 201 = partida criada; 202 = jogadores insuficientes (ambos são resposta válida)
      'matchmaking → 201 ou 202': (r) => r.status === 201 || r.status === 202,
    });
  });

  sleep(0.2);

  // ── ETAPA 8: Listar partidas ────────────────────────────────────────────────
  group('8 — GET /api/match/all (listar partidas)', () => {
    const res = http.get(`${QUEUE_URL}/api/match/all`);
    check(res, {
      'listar partidas → 200': (r) => r.status === 200,
    });
  });

  sleep(0.2);

  // ── ETAPA 9: Limpeza completa ───────────────────────────────────────────────
  group('9 — Limpeza (delete MMR + player + conta)', () => {
    const r1 = http.del(`${MMR_URL}/api/mmr`, null, { headers: authHeaders });
    const r2 = http.del(`${PLAYER_URL}/api/player/me`, null, { headers: authHeaders });
    const r3 = http.del(
      `${AUTH_URL}/api/auth`,
      JSON.stringify({ password: user.password }),
      { headers: authHeaders }
    );
    check(r1, { 'delete MMR → 200': (r) => r.status === 200 });
    check(r2, { 'delete player → 200': (r) => r.status === 200 });
    check(r3, { 'delete conta → 200': (r) => r.status === 200 });
  });

  // Registrar duração total do fluxo completo
  const elapsed = Date.now() - startTime;
  fullFlowDuration.add(elapsed);
  completedFlows.add(1);

  sleep(1);
}
