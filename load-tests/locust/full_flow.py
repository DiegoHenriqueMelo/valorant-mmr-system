"""
Locust load test — Fluxo completo (todos os 4 serviços)
Simula a jornada completa do jogador: cadastro → login → perfil → MMR → matchmaking.

Uso:
    locust -f full_flow.py
    locust -f full_flow.py --headless -u 10 -r 1 -t 10m
    locust -f full_flow.py --headless -u 50 -r 5 -t 15m  (stress)

Variáveis de ambiente opcionais:
    AUTH_URL    (default: http://localhost:3001)
    PLAYER_URL  (default: http://localhost:3002)
    MMR_URL     (default: http://localhost:3003)
    QUEUE_URL   (default: http://localhost:3004)
"""
import os
import time
import random
from locust import HttpUser, task, between, events

AUTH_URL = os.getenv("AUTH_URL", "http://localhost:3001")
PLAYER_URL = os.getenv("PLAYER_URL", "http://localhost:3002")
MMR_URL = os.getenv("MMR_URL", "http://localhost:3003")
QUEUE_URL = os.getenv("QUEUE_URL", "http://localhost:3004")

RANKS = [1, 4, 7, 10, 13, 16, 19, 22, 25]
AGENTS = [0, 2, 5, 11, 13, 17, 19, 20, 22]
REGIOES = ["Américas", "Europa", "Ásia-Pacífico"]
RESULTADOS = ["VITÓRIA", "Derrota"]


def unique_id() -> str:
    return f"{int(time.time() * 1000)}_{random.randint(1000, 9999)}"


def random_match() -> dict:
    return {
        "kill": random.randint(1, 30),
        "death": random.randint(1, 20),  # nunca 0
        "result": random.choice(RESULTADOS),
    }


class FullFlowUser(HttpUser):
    # O host não importa aqui — usamos URLs absolutas em todas as chamadas
    host = AUTH_URL
    wait_time = between(0.5, 1.5)

    @task
    def full_player_journey(self):
        uid = unique_id()
        email = f"locust_full_{uid}@valorant.test"
        password = "LoadTest@123"
        nickname = f"FlowP_{uid}"[:30]
        headers = {"Content-Type": "application/json"}

        # ── ETAPA 1: Cadastro ────────────────────────────────────────────────
        with self.client.post(
            f"{AUTH_URL}/api/auth",
            json={"email": email, "password": password},
            headers=headers,
            catch_response=True,
            name="1 POST /api/auth",
        ) as r:
            if r.status_code == 201:
                r.success()
            else:
                r.failure(f"Cadastro falhou: {r.status_code}")
                return

        # ── ETAPA 2: Login ───────────────────────────────────────────────────
        token = None
        with self.client.post(
            f"{AUTH_URL}/api/auth/login",
            json={"email": email, "password": password},
            headers=headers,
            catch_response=True,
            name="2 POST /api/auth/login",
        ) as r:
            if r.status_code == 200:
                token = r.json().get("token")
                r.success()
            else:
                r.failure(f"Login falhou: {r.status_code}")
                return

        if not token:
            return

        auth_headers = {**headers, "Authorization": f"Bearer {token}"}

        # ── ETAPA 3: Criar perfil de jogador ─────────────────────────────────
        with self.client.post(
            f"{PLAYER_URL}/api/player",
            json={
                "nickname": nickname,
                "rank": random.choice(RANKS),
                "agenteFavorito": random.choice(AGENTS),
                "regiao": random.choice(REGIOES),
            },
            headers=auth_headers,
            catch_response=True,
            name="3 POST /api/player",
        ) as r:
            if r.status_code == 201:
                r.success()
            else:
                r.failure(f"Criar perfil falhou: {r.status_code}")
                self._cleanup_auth(auth_headers, password)
                return

        # ── ETAPA 4: Registrar MMR ────────────────────────────────────────────
        with self.client.post(
            f"{MMR_URL}/api/mmr",
            json={"historico": [random_match(), random_match(), random_match()]},
            headers=auth_headers,
            catch_response=True,
            name="4 POST /api/mmr",
        ) as r:
            if r.status_code == 201:
                r.success()
            else:
                r.failure(f"Registrar MMR falhou: {r.status_code}")
                self._cleanup_player(auth_headers)
                self._cleanup_auth(auth_headers, password)
                return

        # ── ETAPA 5: Consultar leaderboard ───────────────────────────────────
        with self.client.get(
            f"{MMR_URL}/api/mmr",
            catch_response=True,
            name="5 GET /api/mmr (leaderboard)",
        ) as r:
            if r.status_code == 200:
                r.success()
            else:
                r.failure(f"Leaderboard falhou: {r.status_code}")

        # ── ETAPA 6: Atualizar MMR ────────────────────────────────────────────
        with self.client.put(
            f"{MMR_URL}/api/mmr",
            json={"historico": [random_match(), random_match()]},
            headers=auth_headers,
            catch_response=True,
            name="6 PUT /api/mmr",
        ) as r:
            if r.status_code == 200:
                r.success()
            else:
                r.failure(f"Update MMR falhou: {r.status_code}")

        # ── ETAPA 7: Ciclo de matchmaking ─────────────────────────────────────
        with self.client.get(
            f"{QUEUE_URL}/api/match",
            catch_response=True,
            name="7 GET /api/match (matchmaking)",
        ) as r:
            # 201 = partida criada | 202 = jogadores insuficientes (ambos OK)
            if r.status_code in (201, 202):
                r.success()
            else:
                r.failure(f"Matchmaking falhou: {r.status_code}")

        # ── ETAPA 8: Listar partidas ──────────────────────────────────────────
        with self.client.get(
            f"{QUEUE_URL}/api/match/all",
            catch_response=True,
            name="8 GET /api/match/all",
        ) as r:
            if r.status_code == 200:
                r.success()
            else:
                r.failure(f"Listar partidas falhou: {r.status_code}")

        # ── ETAPA 9: Limpeza ──────────────────────────────────────────────────
        self.client.delete(
            f"{MMR_URL}/api/mmr",
            headers=auth_headers,
            name="9 DELETE /api/mmr",
        )
        self._cleanup_player(auth_headers)
        self._cleanup_auth(auth_headers, password)

    def _cleanup_player(self, auth_headers: dict):
        self.client.delete(
            f"{PLAYER_URL}/api/player/me",
            headers=auth_headers,
            name="[cleanup] DELETE /api/player/me",
        )

    def _cleanup_auth(self, auth_headers: dict, password: str):
        self.client.delete(
            f"{AUTH_URL}/api/auth",
            json={"password": password},
            headers=auth_headers,
            name="[cleanup] DELETE /api/auth",
        )
