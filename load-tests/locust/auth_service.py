"""
Locust load test — Auth Service (porta 3001)

Uso:
    locust -f auth_service.py --host http://localhost:3001
    locust -f auth_service.py --host http://localhost:3001 --headless -u 20 -r 2 -t 5m
"""
import time
import random
from locust import HttpUser, task, between


def unique_id() -> str:
    return f"{int(time.time() * 1000)}_{random.randint(1000, 9999)}"


class AuthUser(HttpUser):
    host = "http://localhost:3001"
    wait_time = between(0.5, 1.5)

    @task
    def auth_complete_flow(self):
        uid = unique_id()
        email = f"locust_{uid}@valorant.test"
        password = "LoadTest@123"
        new_password = "NewPass@456"
        headers = {"Content-Type": "application/json"}

        # 1. Registrar
        with self.client.post(
            "/api/auth",
            json={"email": email, "password": password},
            headers=headers,
            catch_response=True,
            name="POST /api/auth",
        ) as r:
            if r.status_code == 201:
                r.success()
            else:
                r.failure(f"Esperado 201, recebido {r.status_code}: {r.text[:100]}")
                return

        # 2. Login
        token = None
        with self.client.post(
            "/api/auth/login",
            json={"email": email, "password": password},
            headers=headers,
            catch_response=True,
            name="POST /api/auth/login",
        ) as r:
            if r.status_code == 200:
                try:
                    token = r.json()["token"]
                    r.success()
                except Exception:
                    r.failure("Token não encontrado na resposta")
                    return
            else:
                r.failure(f"Esperado 200, recebido {r.status_code}")
                return

        auth_headers = {**headers, "Authorization": f"Bearer {token}"}

        # 3. Listar usuários
        with self.client.get(
            "/api/auth",
            headers=auth_headers,
            catch_response=True,
            name="GET /api/auth",
        ) as r:
            if r.status_code == 200:
                r.success()
            else:
                r.failure(f"Esperado 200, recebido {r.status_code}")

        # 4. Atualizar senha
        with self.client.put(
            "/api/auth/password",
            json={"currentPassword": password, "newPassword": new_password},
            headers=auth_headers,
            catch_response=True,
            name="PUT /api/auth/password",
        ) as r:
            if r.status_code == 200:
                r.success()
                password = new_password
            else:
                r.failure(f"Esperado 200, recebido {r.status_code}")

        # 5. Deletar conta (limpeza)
        with self.client.delete(
            "/api/auth",
            json={"password": password},
            headers=auth_headers,
            catch_response=True,
            name="DELETE /api/auth",
        ) as r:
            if r.status_code == 200:
                r.success()
            else:
                r.failure(f"Esperado 200, recebido {r.status_code}")
