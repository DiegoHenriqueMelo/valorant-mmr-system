import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const AUTH_URL = __ENV.AUTH_URL || 'http://localhost:3001';
const PLAYER_URL = __ENV.PLAYER_URL || 'http://localhost:3002';
const MMR_URL = __ENV.MMR_URL || 'http://localhost:3003';

const mmrRegisterErrors = new Rate('mmr_register_errors');
const mmrGetErrors = new Rate('mmr_get_errors');
const mmrRegisterDuration = new Trend('mmr_register_duration', true);
const leaderboardDuration = new Trend('mmr_leaderboard_duration', true);

const RANKS = [1, 4, 7, 10, 13, 16, 19, 22, 25];
const AGENTS = [0, 2, 5, 11, 13, 17, 19, 20, 22];
const REGIOES = ['Américas', 'Europa', 'Ásia-Pacífico'];
const RESULTADOS = ['VITÓRIA', 'Derrota', 'Derrota', 'VITÓRIA', 'VITÓRIA'];

const SCENARIOS = {
  smoke: {
    executor: 'constant-vus',
    vus: 1,
    duration: '30s',
  },
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m', target: 20 },
      { duration: '3m', target: 20 },
      { duration: '1m', target: 0 },
    ],
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 50 },
      { duration: '5m', target: 100 },
      { duration: '2m', target: 150 },
      { duration: '2m', target: 0 },
    ],
  },
  spike: {
    executor: 'ramping-vus',
    startVUs: 5,
    stages: [
      { duration: '10s', target: 5 },
      { duration: '30s', target: 150 },
      { duration: '1m', target: 150 },
      { duration: '30s', target: 5 },
    ],
  },
};

const scenario = __ENV.TEST_SCENARIO || 'smoke';

export const options = {
  scenarios: {
    [scenario]: SCENARIOS[scenario],
  },
  thresholds: {
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
    http_req_failed: ['rate<0.05'],
    mmr_register_errors: ['rate<0.1'],
    mmr_get_errors: ['rate<0.1'],
    mmr_register_duration: ['p(95)<1200'],
    mmr_leaderboard_duration: ['p(95)<600'],
  },
};

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomMatch() {
  // death nunca pode ser 0 (divisão por zero no cálculo de MMR)
  return {
    kill: randomInt(1, 30),
    death: randomInt(1, 20),
    result: randomItem(RESULTADOS),
  };
}

function uniqueUser() {
  const id = `vu${__VU}_i${__ITER}_${Date.now()}`;
  return {
    email: `mmrtest_${id}@valorant.test`,
    password: 'LoadTest@123',
    nickname: `MMRPlayer_${id}`.substring(0, 30),
    rank: randomItem(RANKS),
    agenteFavorito: randomItem(AGENTS),
    regiao: randomItem(REGIOES),
  };
}

function setupUserStack(user) {
  // 1. Registrar
  const regRes = http.post(
    `${AUTH_URL}/api/auth`,
    JSON.stringify({ email: user.email, password: user.password }),
    { headers: JSON_HEADERS }
  );
  if (regRes.status !== 201) return null;

  // 2. Login
  const loginRes = http.post(
    `${AUTH_URL}/api/auth/login`,
    JSON.stringify({ email: user.email, password: user.password }),
    { headers: JSON_HEADERS }
  );
  let token;
  try { token = JSON.parse(loginRes.body).token; } catch { return null; }
  if (!token) return null;

  const authHeaders = { ...JSON_HEADERS, Authorization: `Bearer ${token}` };

  // 3. Criar perfil de jogador (obrigatório antes de registrar MMR)
  const playerRes = http.post(
    `${PLAYER_URL}/api/player`,
    JSON.stringify({
      nickname: user.nickname,
      rank: user.rank,
      agenteFavorito: user.agenteFavorito,
      regiao: user.regiao,
    }),
    { headers: authHeaders }
  );
  if (playerRes.status !== 201) return null;

  return { token, authHeaders };
}

function cleanupUserStack(authHeaders) {
  http.del(`${PLAYER_URL}/api/player/me`, null, { headers: authHeaders });
  http.del(
    `${MMR_URL}/api/mmr`,
    null,
    { headers: authHeaders }
  );
  http.del(
    `${AUTH_URL}/api/auth`,
    JSON.stringify({ password: 'LoadTest@123' }),
    { headers: authHeaders }
  );
}

export default function () {
  const user = uniqueUser();

  const stack = setupUserStack(user);
  if (!stack) {
    sleep(1);
    return;
  }
  const { authHeaders } = stack;
  sleep(0.3);

  // 1. Registrar MMR com histórico inicial
  let mmrCreated = false;
  group('POST /api/mmr — registrar MMR', () => {
    const res = http.post(
      `${MMR_URL}/api/mmr`,
      JSON.stringify({
        historico: [randomMatch(), randomMatch(), randomMatch()],
      }),
      { headers: authHeaders }
    );
    const ok = check(res, {
      'register MMR → status 201': (r) => r.status === 201,
      'register MMR → body.statusCode === 201': (r) => {
        try { return JSON.parse(r.body).statusCode === 201; } catch { return false; }
      },
    });
    mmrRegisterErrors.add(!ok);
    mmrRegisterDuration.add(res.timings.duration);
    mmrCreated = ok;
  });

  if (!mmrCreated) {
    cleanupUserStack(authHeaders);
    sleep(1);
    return;
  }

  sleep(0.3);

  // 2. Consultar leaderboard (endpoint público)
  group('GET /api/mmr — leaderboard', () => {
    const res = http.get(`${MMR_URL}/api/mmr`);
    check(res, {
      'leaderboard → status 200': (r) => r.status === 200,
      'leaderboard → retorna array': (r) => {
        try { return Array.isArray(JSON.parse(r.body).mmrs); } catch { return false; }
      },
    });
    leaderboardDuration.add(res.timings.duration);
  });

  sleep(0.3);

  // 3. Consultar próprio MMR
  group('GET /api/mmr/me — meu MMR', () => {
    const res = http.get(`${MMR_URL}/api/mmr/me`, { headers: authHeaders });
    const ok = check(res, {
      'get my MMR → status 200': (r) => r.status === 200,
      'get my MMR → campo mmr presente': (r) => {
        try { return JSON.parse(r.body).mmr?.mmr !== undefined; } catch { return false; }
      },
    });
    mmrGetErrors.add(!ok);
  });

  sleep(0.3);

  // 4. Adicionar mais partidas ao histórico
  group('PUT /api/mmr — adicionar partidas', () => {
    const res = http.put(
      `${MMR_URL}/api/mmr`,
      JSON.stringify({
        historico: [randomMatch(), randomMatch()],
      }),
      { headers: authHeaders }
    );
    check(res, {
      'update MMR → status 200': (r) => r.status === 200,
    });
  });

  sleep(0.3);

  // 5. Deletar registro de MMR
  group('DELETE /api/mmr — deletar MMR', () => {
    const res = http.del(`${MMR_URL}/api/mmr`, null, { headers: authHeaders });
    check(res, {
      'delete MMR → status 200': (r) => r.status === 200,
    });
  });

  sleep(0.3);

  // Limpeza: deletar jogador e conta
  http.del(`${PLAYER_URL}/api/player/me`, null, { headers: authHeaders });
  http.del(
    `${AUTH_URL}/api/auth`,
    JSON.stringify({ password: user.password }),
    { headers: authHeaders }
  );

  sleep(1);
}
