# Load Tests — Valorant MMR System

Testes de carga com **k6**, **Artillery**, **Locust** e **JMeter** para os 4 microserviços do sistema.

---

## Pré-requisitos: subir os serviços

```bash
# Na raiz do projeto
docker compose up -d
```

---

## Estrutura

```
load-tests/
├── k6/
│   ├── auth-service.test.js
│   ├── player-service.test.js
│   ├── mmr-service.test.js
│   ├── queue-match.test.js
│   └── full-flow.test.js
├── artillery/
│   ├── helpers.js
│   ├── auth-service.yml
│   ├── player-service.yml
│   ├── mmr-service.yml
│   ├── queue-match.yml
│   └── full-flow.yml
├── locust/
│   ├── auth_service.py
│   ├── player_service.py
│   └── full_flow.py
└── jmeter/
    └── auth-service.jmx
```

---

## k6

### Instalação

```powershell
# Windows (Chocolatey)
choco install k6

# Windows (winget)
winget install k6 --source winget
```

```bash
# macOS
brew install k6

# Ubuntu/Debian
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

### Cenários disponíveis

| `TEST_SCENARIO` | VUs | Duração | Objetivo |
|---|---|---|---|
| `smoke` (padrão) | 1 | 30s | Verificar funcionamento básico |
| `load` | Até 20 | ~5min | Simular carga normal |
| `stress` | Até 200 | ~11min | Encontrar o ponto de ruptura |
| `spike` | Pico de 300 | ~2min | Testar resiliência a picos súbitos |

### Execução

```bash
# Smoke (padrão)
k6 run load-tests/k6/auth-service.test.js

# Load test
k6 run -e TEST_SCENARIO=load load-tests/k6/player-service.test.js

# Stress test
k6 run -e TEST_SCENARIO=stress load-tests/k6/mmr-service.test.js

# Spike test
k6 run -e TEST_SCENARIO=spike load-tests/k6/queue-match.test.js

# Fluxo completo
k6 run -e TEST_SCENARIO=load load-tests/k6/full-flow.test.js

# Salvar resultado
k6 run --out json=load-tests/results/resultado.json \
  -e TEST_SCENARIO=load load-tests/k6/auth-service.test.js
```

---

## Artillery

### Instalação

```bash
pnpm add -g artillery
# Verificar
artillery version
```

### Execução

```bash
# Rodar com todas as fases (smoke → warmup → load → rampdown)
artillery run load-tests/artillery/auth-service.yml
artillery run load-tests/artillery/player-service.yml
artillery run load-tests/artillery/mmr-service.yml
artillery run load-tests/artillery/queue-match.yml
artillery run load-tests/artillery/full-flow.yml

# Rodar só smoke (30s, 1 req/s) via override
artillery run --overrides '{"config":{"phases":[{"duration":30,"arrivalRate":1}]}}' \
  load-tests/artillery/auth-service.yml

# Stress: override para alto volume
artillery run --overrides '{"config":{"phases":[{"duration":300,"arrivalRate":30}]}}' \
  load-tests/artillery/auth-service.yml

# Salvar relatório HTML
artillery run --output load-tests/results/artillery-auth.json load-tests/artillery/auth-service.yml
artillery report load-tests/results/artillery-auth.json
```

### URLs customizadas

As fases e URLs podem ser sobrescritas via `--overrides` ou editando os arquivos `.yml`.

---

## Locust

### Instalação

```bash
pip install locust
# ou
pip3 install locust

# Verificar
locust --version
```

### Execução

```bash
# Modo interativo (abre UI em http://localhost:8089)
locust -f load-tests/locust/auth_service.py

# Headless — smoke (1 usuário, 30s)
locust -f load-tests/locust/auth_service.py \
  --headless -u 1 -r 1 -t 30s

# Headless — load (20 usuários, 5min)
locust -f load-tests/locust/player_service.py \
  --headless -u 20 -r 2 -t 5m

# Headless — stress (100 usuários, 10min)
locust -f load-tests/locust/full_flow.py \
  --headless -u 100 -r 10 -t 10m

# Headless — spike (500 usuários em 30s)
locust -f load-tests/locust/full_flow.py \
  --headless -u 500 -r 50 -t 2m

# Salvar relatório CSV
locust -f load-tests/locust/auth_service.py \
  --headless -u 20 -r 2 -t 5m \
  --csv=load-tests/results/locust-auth

# URLs customizadas (via variável de ambiente)
AUTH_URL=http://192.168.1.10:3001 \
PLAYER_URL=http://192.168.1.10:3002 \
MMR_URL=http://192.168.1.10:3003 \
QUEUE_URL=http://192.168.1.10:3004 \
locust -f load-tests/locust/full_flow.py --headless -u 20 -r 2 -t 5m
```

### Parâmetros principais

| Flag | Descrição |
|---|---|
| `-u N` | Número máximo de usuários simultâneos |
| `-r N` | Usuários por segundo a adicionar (spawn rate) |
| `-t Xm` | Duração total do teste |
| `--headless` | Sem UI, só terminal |
| `--csv=PATH` | Salva resultados em CSV |

---

## JMeter

### Instalação

1. Baixe o JMeter em https://jmeter.apache.org/download_jmeter.cgi
2. Extraia e adicione `bin/` ao PATH
3. Verifique: `jmeter --version`

### Execução

```bash
# Modo GUI (para editar/visualizar o teste)
jmeter -t load-tests/jmeter/auth-service.jmx

# Modo headless — Load Test (Thread Group "Load Test" habilitado por padrão)
jmeter -n \
  -t load-tests/jmeter/auth-service.jmx \
  -l load-tests/results/jmeter-auth-results.jtl \
  -e -o load-tests/results/jmeter-auth-report/

# Sobrescrever host/porta via CLI
jmeter -n \
  -t load-tests/jmeter/auth-service.jmx \
  -JAUTH_HOST=192.168.1.10 \
  -JAUTH_PORT=3001 \
  -l load-tests/results/jmeter-auth-results.jtl

# Gerar relatório HTML a partir do .jtl
jmeter -g load-tests/results/jmeter-auth-results.jtl \
  -o load-tests/results/jmeter-auth-report/
```

### Thread Groups no arquivo .jmx

O arquivo `auth-service.jmx` contém 2 Thread Groups:
- **Load Test (20 usuários)** — habilitado por padrão (60s ramp, 5min duração)
- **Stress Test (100 usuários)** — desabilitado por padrão; habilite na GUI para stress

---

## Comparativo das ferramentas

| Característica | k6 | Artillery | Locust | JMeter |
|---|---|---|---|---|
| Linguagem | JavaScript | YAML + JS | Python | XML + Groovy |
| Interface | Terminal | Terminal | Web UI + Terminal | GUI + Terminal |
| Scenarios múltiplos | ✅ via `--env` | ✅ via `phases` | ✅ via flags | ✅ via Thread Groups |
| Relatório HTML | Plugin | ✅ built-in | ✅ built-in | ✅ built-in |
| Curva de aprendizado | Baixa | Baixa | Baixa | Alta |

---

## Thresholds de qualidade

| Métrica | Aceitável | Crítico |
|---|---|---|
| Tempo de resposta p(95) | < 1000ms | > 2000ms |
| Tempo de resposta p(99) | < 2000ms | > 4000ms |
| Taxa de erros | < 5% | > 10% |
| Throughput | > 100 req/s | < 50 req/s |
