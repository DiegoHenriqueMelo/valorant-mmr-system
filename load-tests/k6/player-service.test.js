import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const AUTH_URL = __ENV.AUTH_URL || 'http://localhost:3001';
const PLAYER_URL = __ENV.PLAYER_URL || 'http://localhost:3002';

const createErrors = new Rate('player_create_errors');
const getMeErrors = new Rate('player_get_me_errors');
const createDuration = new Trend('player_create_duration', true);
const listDuration = new Trend('player_list_duration', true);

// Ranks disponíveis: 1 (Ferro1) até 25 (Radiante)
const RANKS = [1, 4, 7, 10, 13, 16, 19, 22, 25];
// Agentes disponíveis: 0 (Astra) até 28 (Yoru)
const AGENTS = [0, 2, 5, 11, 13, 17, 19, 20, 22, 25];
const REGIOES = ['Américas', 'Europa', 'Ásia-Pacífico'];

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
      { duration: '2m', target: 200 },
      { duration: '2m', target: 0 },
    ],
  },
  spike: {
    executor: 'ramping-vus',
    startVUs: 5,
    stages: [
      { duration: '10s', target: 5 },
      { duration: '30s', target: 200 },
      { duration: '1m', target: 200 },
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
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.05'],
    player_create_errors: ['rate<0.1'],
    player_get_me_errors: ['rate<0.1'],
    player_create_duration: ['p(95)<800'],
    player_list_duration: ['p(95)<500'],
  },
};

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function uniqueUser() {
  const id = `vu${__VU}_i${__ITER}_${Date.now()}`;
  return {
    email: `loadtest_${id}@valorant.test`,
    password: 'LoadTest@123',
    nickname: `Player_${id}`.substring(0, 30),
    rank: randomItem(RANKS),
    agenteFavorito: randomItem(AGENTS),
    regiao: randomItem(REGIOES),
  };
}

function registerAndLogin(user) {
  const res = http.post(
    `${AUTH_URL}/api/auth`,
    JSON.stringify({ email: user.email, password: user.password }),
    { headers: JSON_HEADERS }
  );
  if (res.status !== 201) return null;

  const loginRes = http.post(
    `${AUTH_URL}/api/auth/login`,
    JSON.stringify({ email: user.email, password: user.password }),
    { headers: JSON_HEADERS }
  );
  try {
    return JSON.parse(loginRes.body).token || null;
  } catch {
    return null;
  }
}

function deleteAccount(token) {
  const authHeaders = { ...JSON_HEADERS, Authorization: `Bearer ${token}` };
  http.del(
    `${AUTH_URL}/api/auth`,
    JSON.stringify({ password: 'LoadTest@123' }),
    { headers: authHeaders }
  );
}

export default function () {
  const user = uniqueUser();

  // Setup: registrar e fazer login no auth-service
  const token = registerAndLogin(user);
  if (!token) {
    sleep(1);
    return;
  }

  const authHeaders = { ...JSON_HEADERS, Authorization: `Bearer ${token}` };
  sleep(0.2);

  // 1. Criar perfil de jogador
  let playerCreated = false;
  group('POST /api/player — criar perfil', () => {
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
    const ok = check(res, {
      'create player → status 201': (r) => r.status === 201,
      'create player → body.statusCode === 201': (r) => {
        try { return JSON.parse(r.body).statusCode === 201; } catch { return false; }
      },
    });
    createErrors.add(!ok);
    createDuration.add(res.timings.duration);
    playerCreated = ok;
  });

  if (!playerCreated) {
    deleteAccount(token);
    sleep(1);
    return;
  }

  sleep(0.3);

  // 2. Listar todos os jogadores (endpoint público)
  group('GET /api/player — listar todos', () => {
    const res = http.get(`${PLAYER_URL}/api/player`);
    check(res, {
      'list players → status 200': (r) => r.status === 200,
      'list players → retorna array': (r) => {
        try { return Array.isArray(JSON.parse(r.body).players); } catch { return false; }
      },
    });
    listDuration.add(res.timings.duration);
  });

  sleep(0.3);

  // 3. Buscar próprio perfil
  group('GET /api/player/me — buscar meu perfil', () => {
    const res = http.get(`${PLAYER_URL}/api/player/me`, { headers: authHeaders });
    const ok = check(res, {
      'get me → status 200': (r) => r.status === 200,
      'get me → tem nickname': (r) => {
        try { return !!JSON.parse(r.body).player?.nickname; } catch { return false; }
      },
    });
    getMeErrors.add(!ok);
  });

  sleep(0.3);

  // 4. Atualizar perfil
  group('PUT /api/player/me — atualizar perfil', () => {
    const novoRank = randomItem(RANKS);
    const res = http.put(
      `${PLAYER_URL}/api/player/me`,
      JSON.stringify({ rank: novoRank, agenteFavorito: randomItem(AGENTS) }),
      { headers: authHeaders }
    );
    check(res, {
      'update player → status 200': (r) => r.status === 200,
    });
  });

  sleep(0.3);

  // 5. Deletar perfil de jogador
  group('DELETE /api/player/me — deletar perfil', () => {
    const res = http.del(`${PLAYER_URL}/api/player/me`, null, { headers: authHeaders });
    check(res, {
      'delete player → status 200': (r) => r.status === 200,
    });
  });

  sleep(0.3);

  // Limpeza: deletar conta
  deleteAccount(token);

  sleep(1);
}
