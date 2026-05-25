"""
Locust load test — Player Service (porta 3002)
Auth Service (porta 3001) é chamado via URL absoluta para setup.

Uso:
    locust -f player_service.py --host http://localhost:3002
    locust -f player_service.py --host http://localhost:3002 --headless -u 20 -r 2 -t 5m
"""
import time
import random
from locust import HttpUser, task, between

AUTH_URL = "http://localhost:3001"

RANKS = [1, 4, 7, 10, 13, 16, 19, 22, 25]
AGENTS = [0, 2, 5, 11, 13, 17, 19, 20, 22]
REGIOES = ["Américas", "Europa", "Ásia-Pacífico"]


def unique_id() -> str:
    return f"{int(time.time() * 1000)}_{random.randint(1000, 9999)}"


class PlayerUser(HttpUser):
    host = "http://localhost:3002"
    wait_time = between(0.5, 1.5)

    def _register_and_login(self, email: str, password: str) -> str | None:
        headers = {"Content-Type": "application/json"}

        with self.client.post(
            f"{AUTH_URL}/api/auth",
            json={"email": email, "password": password},
            headers=headers,
            catch_response=True,
            name="[setup] POST /api/auth",
        ) as r:
            if r.status_code != 201:
                r.failure(f"Setup register falhou: {r.status_code}")
                return None
            r.success()

        with self.client.post(
            f"{AUTH_URL}/api/auth/login",
            json={"email": email, "password": password},
            headers=headers,
            catch_response=True,
            name="[setup] POST /api/auth/login",
        ) as r:
            if r.status_code == 200:
                r.success()
                return r.json().get("token")
            r.failure(f"Setup login falhou: {r.status_code}")
            return None

    def _delete_account(self, token: str, password: str):
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        }
        self.client.delete(
            f"{AUTH_URL}/api/auth",
            json={"password": password},
            headers=headers,
            name="[cleanup] DELETE /api/auth",
        )

    @task
    def player_complete_flow(self):
        uid = unique_id()
        email = f"locust_pl_{uid}@valorant.test"
        password = "LoadTest@123"
        nickname = f"Player_{uid}"[:30]

        token = self._register_and_login(email, password)
        if not token:
            return

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        }

        # 1. Criar perfil de jogador
        with self.client.post(
            "/api/player",
            json={
                "nickname": nickname,
                "rank": random.choice(RANKS),
                "agenteFavorito": random.choice(AGENTS),
                "regiao": random.choice(REGIOES),
            },
            headers=headers,
            catch_response=True,
            name="POST /api/player",
        ) as r:
            if r.status_code == 201:
                r.success()
            else:
                r.failure(f"Esperado 201, recebido {r.status_code}")
                self._delete_account(token, password)
                return

        # 2. Listar todos os jogadores (público)
        with self.client.get(
            "/api/player",
            catch_response=True,
            name="GET /api/player",
        ) as r:
            if r.status_code == 200:
                r.success()
            else:
                r.failure(f"Esperado 200, recebido {r.status_code}")

        # 3. Buscar meu perfil
        with self.client.get(
            "/api/player/me",
            headers=headers,
            catch_response=True,
            name="GET /api/player/me",
        ) as r:
            if r.status_code == 200:
                r.success()
            else:
                r.failure(f"Esperado 200, recebido {r.status_code}")

        # 4. Atualizar perfil
        with self.client.put(
            "/api/player/me",
            json={
                "rank": random.choice(RANKS),
                "agenteFavorito": random.choice(AGENTS),
            },
            headers=headers,
            catch_response=True,
            name="PUT /api/player/me",
        ) as r:
            if r.status_code == 200:
                r.success()
            else:
                r.failure(f"Esperado 200, recebido {r.status_code}")

        # 5. Deletar perfil
        with self.client.delete(
            "/api/player/me",
            headers=headers,
            catch_response=True,
            name="DELETE /api/player/me",
        ) as r:
            if r.status_code == 200:
                r.success()
            else:
                r.failure(f"Esperado 200, recebido {r.status_code}")

        self._delete_account(token, password)
