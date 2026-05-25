import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const QUEUE_URL = __ENV.QUEUE_URL || 'http://localhost:3004';

const matchmakingErrors = new Rate('queue_matchmaking_errors');
const listErrors = new Rate('queue_list_errors');
const matchmakingDuration = new Trend('queue_matchmaking_duration', true);
const listDuration = new Trend('queue_list_duration', true);

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
      { duration: '30s', target: 250 },
      { duration: '1m', target: 250 },
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
    http_req_duration: ['p(95)<2000', 'p(99)<4000'],
    http_req_failed: ['rate<0.05'],
    queue_matchmaking_errors: ['rate<0.1'],
    queue_list_errors: ['rate<0.1'],
    queue_matchmaking_duration: ['p(95)<1500'],
    queue_list_duration: ['p(95)<600'],
  },
};

// Guarda IDs de partidas criadas para testar GET /:id e DELETE /:id
let createdMatchIds = [];

export default function () {
  // 1. Executar ciclo de matchmaking
  // Retorna 201 (partida criada) ou 202 (jogadores insuficientes) — ambos são sucesso
  group('GET /api/match — ciclo de matchmaking', () => {
    const res = http.get(`${QUEUE_URL}/api/match`);
    const ok = check(res, {
      'matchmaking → status 201 ou 202': (r) => r.status === 201 || r.status === 202,
      'matchmaking → body.statusCode presente': (r) => {
        try { return JSON.parse(r.body).statusCode !== undefined; } catch { return false; }
      },
    });
    matchmakingErrors.add(!ok);
    matchmakingDuration.add(res.timings.duration);

    // Salva o ID da partida se foi criada com sucesso
    if (res.status === 201) {
      try {
        const body = JSON.parse(res.body);
        if (body.matchId) createdMatchIds.push(body.matchId);
      } catch { /* sem matchId no body */ }
    }
  });

  sleep(0.3);

  // 2. Listar todas as partidas (endpoint público)
  let matchId = null;
  group('GET /api/match/all — listar partidas', () => {
    const res = http.get(`${QUEUE_URL}/api/match/all`);
    const ok = check(res, {
      'list matches → status 200': (r) => r.status === 200,
      'list matches → retorna array': (r) => {
        try { return Array.isArray(JSON.parse(r.body).matches); } catch { return false; }
      },
    });
    listErrors.add(!ok);
    listDuration.add(res.timings.duration);

    // Pega o ID da última partida criada para usar no próximo grupo
    if (ok) {
      try {
        const matches = JSON.parse(res.body).matches;
        if (matches && matches.length > 0) {
          matchId = matches[matches.length - 1]._id;
        }
      } catch { /* sem partidas */ }
    }
  });

  sleep(0.3);

  // 3. Buscar partida específica por ID (se existir alguma)
  if (matchId) {
    group('GET /api/match/:id — buscar partida por ID', () => {
      const res = http.get(`${QUEUE_URL}/api/match/${matchId}`);
      check(res, {
        'get match by id → status 200': (r) => r.status === 200,
        'get match by id → tem teamA e teamB': (r) => {
          try {
            const m = JSON.parse(r.body).match;
            return Array.isArray(m?.teamA) && Array.isArray(m?.teamB);
          } catch { return false; }
        },
      });
    });
    sleep(0.3);
  }

  sleep(1);
}

// Limpeza das partidas criadas durante o teste
export function teardown() {
  for (const id of createdMatchIds) {
    http.del(`${QUEUE_URL}/api/match/${id}`);
  }
}
