import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.AUTH_URL || 'http://localhost:3001';

const registerErrors = new Rate('auth_register_errors');
const loginErrors = new Rate('auth_login_errors');
const registerDuration = new Trend('auth_register_duration', true);
const loginDuration = new Trend('auth_login_duration', true);

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
      { duration: '30s', target: 300 },
      { duration: '1m', target: 300 },
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
    auth_register_errors: ['rate<0.1'],
    auth_login_errors: ['rate<0.1'],
    auth_register_duration: ['p(95)<800'],
    auth_login_duration: ['p(95)<500'],
  },
};

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function uniqueUser() {
  return {
    email: `loadtest_vu${__VU}_i${__ITER}_${Date.now()}@valorant.test`,
    password: 'LoadTest@123',
  };
}

export default function () {
  const user = uniqueUser();

  // 1. Registro de conta
  let registered = false;
  group('POST /api/auth — register', () => {
    const res = http.post(
      `${BASE_URL}/api/auth`,
      JSON.stringify({ email: user.email, password: user.password }),
      { headers: JSON_HEADERS }
    );
    const ok = check(res, {
      'register → status 201': (r) => r.status === 201,
      'register → body.statusCode === 201': (r) => {
        try { return JSON.parse(r.body).statusCode === 201; } catch { return false; }
      },
    });
    registerErrors.add(!ok);
    registerDuration.add(res.timings.duration);
    registered = ok;
  });

  if (!registered) {
    sleep(1);
    return;
  }

  sleep(0.3);

  // 2. Login
  let token = null;
  group('POST /api/auth/login', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ email: user.email, password: user.password }),
      { headers: JSON_HEADERS }
    );
    const ok = check(res, {
      'login → status 200': (r) => r.status === 200,
      'login → token presente': (r) => {
        try { return !!JSON.parse(r.body).token; } catch { return false; }
      },
    });
    loginErrors.add(!ok);
    loginDuration.add(res.timings.duration);
    if (ok) token = JSON.parse(res.body).token;
  });

  if (!token) {
    sleep(1);
    return;
  }

  const authHeaders = { ...JSON_HEADERS, Authorization: `Bearer ${token}` };
  sleep(0.3);

  // 3. Listar usuários (endpoint autenticado)
  group('GET /api/auth — listar usuários', () => {
    const res = http.get(`${BASE_URL}/api/auth`, { headers: authHeaders });
    check(res, {
      'list users → status 200': (r) => r.status === 200,
      'list users → retorna array': (r) => {
        try { return Array.isArray(JSON.parse(r.body).users); } catch { return false; }
      },
    });
  });

  sleep(0.3);

  // 4. Atualizar senha
  const novasSenha = 'NewPass@456';
  group('PUT /api/auth/password — atualizar senha', () => {
    const res = http.put(
      `${BASE_URL}/api/auth/password`,
      JSON.stringify({ currentPassword: user.password, newPassword: novasSenha }),
      { headers: authHeaders }
    );
    check(res, {
      'update password → status 200': (r) => r.status === 200,
    });
    if (res.status === 200) user.password = novasSenha;
  });

  sleep(0.3);

  // 5. Deletar conta (limpeza)
  group('DELETE /api/auth — deletar conta', () => {
    const res = http.del(
      `${BASE_URL}/api/auth`,
      JSON.stringify({ password: user.password }),
      { headers: authHeaders }
    );
    check(res, {
      'delete account → status 200': (r) => r.status === 200,
    });
  });

  sleep(1);
}
