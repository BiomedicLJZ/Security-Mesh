# SentinelMesh — Didactic Starter Kit (Walking Skeleton)

Starter kit local para enseñar un flujo real de software distribuido:

**gateway → Kafka/Redpanda → AI engine → core-service → gRPC dispatch → Postgres**.

El objetivo no es solo “que corra”, sino que el estudiante entienda:
- Diseño por contratos.
- Integración síncrona (HTTP/gRPC) y asíncrona (Kafka).
- Trazabilidad (`trace_id`) de punta a punta.
- Evolución de servicios sin romper consumidores.

---

## 1) Arquitectura por nodos (qué hace cada módulo)

### Nodo A — `services/gateway`
**Rol:** API pública de entrada (FastAPI).

**Módulos:**
- `app/main.py`: endpoint `/v1/emergency/report`, construye el evento `telemetry.raw.v1`.
- `app/kafka_client.py`: productor Kafka reutilizable.

**Conceptos didácticos:**
- Validación de entrada con Pydantic.
- Diferencia entre respuesta HTTP “accepted” y procesamiento real eventual.

### Nodo B — `services/ai-engine`
**Rol:** Consumidor de telemetría y clasificador de anomalías.

**Módulos:**
- `app/main.py`: loop de consumo/publicación.
- `app/rules.py`: heurísticas determinísticas (baseline pedagógico).
- `app/llm_evaluator.py`: integración LangChain + LangGraph para clasificación con LLM/SLM.
- `app/kafka_client.py`: consumidor/productor Kafka.

**Conceptos didácticos:**
- Estrategias de inferencia intercambiables (`heuristic` vs `langgraph`).
- Diseño con fallback para no romper servicio por errores de IA.

### Nodo C — `services/core-service`
**Rol:** Orquestador de dominio + persistencia + llamada gRPC.

**Módulos:**
- `app/main.py`: API de consulta de incidentes.
- `app/consumer.py`: consume `anomaly.high_confidence.v1`, guarda incidente y publica asignación.
- `app/db.py`: conexión e inicialización de tabla.
- `app/grpc_client.py`: cliente gRPC a `dispatch-service`.
- `app/models.py`: contratos de salida del API.

**Conceptos didácticos:**
- Persistencia y eventual consistency.
- Upsert como base para idempotencia.

### Nodo D — `services/dispatch-service`
**Rol:** microservicio gRPC para cálculo de ruta/ETA.

**Módulos:**
- `app/server.py`: implementación gRPC.
- `app/dispatch_pb2*.py`: stubs generados desde proto.

**Conceptos didácticos:**
- Contrato fuerte con Protobuf.
- Integración de servicios por RPC tipado.

### Nodos de infraestructura — `infra/docker-compose.yml`
- `redpanda`: broker Kafka compatible.
- `kafka-init`: crea topics requeridos.
- `postgres`: persistencia relacional.
- Servicios de negocio (`gateway`, `ai-engine`, `core-service`, `dispatch-service`).

---

## 2) Contratos y versionado

- `contracts/events/*.json`: JSON Schemas de eventos.
- `contracts/proto/dispatch.proto`: contrato gRPC.
- `contracts/openapi/*.yaml`: contratos HTTP mínimos.

**Regla de oro para clase:**
1. Primero cambia contrato.
2. Luego adapta productor.
3. Luego adapta consumidor.
4. Finalmente agrega tests/validaciones.

---

## 3) Quickstart

1. (Opcional) copia variables:

```bash
cp .env.example .env
```

2. Genera stubs gRPC (ya vienen generados, pero puedes regenerarlos):

### Dispatch service

```bash
docker run --rm -v "$PWD:/ws" -w /ws python:3.12-slim bash -lc \
  "pip install grpcio-tools==1.66.1 && \
   python -m grpc_tools.protoc \
   -I contracts/proto \
   --python_out=services/dispatch-service/app \
   --grpc_python_out=services/dispatch-service/app \
   contracts/proto/dispatch.proto"
```

### Core service

```bash
docker run --rm -v "$PWD:/ws" -w /ws python:3.12-slim bash -lc \
  "pip install grpcio-tools==1.66.1 && \
   python -m grpc_tools.protoc \
   -I contracts/proto \
   --python_out=services/core-service/app \
   --grpc_python_out=services/core-service/app \
   contracts/proto/dispatch.proto"
```

3. Levanta todo:

```bash
cd infra
docker compose up --build
```

---

## 4) Probar flujo end-to-end

1. Enviar reporte:

```bash
curl -X POST http://localhost:8001/v1/emergency/report \
  -H "Content-Type: application/json" \
  -d '{
    "citizen_id": "citizen-001",
    "lat": 20.6736,
    "lon": -103.344,
    "emergency": true,
    "audio_signature": "gunshot_like",
    "panic_motion": false
  }'
```

2. Revisar logs (`gateway`, `ai-engine`, `core-service`) para ubicar `incident_id`.

3. Consultar incidente:

```bash
curl http://localhost:8002/v1/incidents/<INCIDENT_ID>
```

---

## 5) Integración LLM/SLM con LangChain + LangGraph (nuevo)

El `ai-engine` ahora soporta dos estrategias:

- `AI_EVALUATOR_MODE=heuristic` (por defecto): reglas en Python (`rules.py`).
- `AI_EVALUATOR_MODE=langgraph`: ejecuta un grafo con nodos de prompt → modelo → parseo.

### 5.1 Configuración OpenAI (LLM)

En `.env`:

```bash
AI_EVALUATOR_MODE=langgraph
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
LLM_TEMPERATURE=0.0
OPENAI_API_KEY=...
```

### 5.2 Configuración Ollama (SLM local)

En `.env`:

```bash
AI_EVALUATOR_MODE=langgraph
LLM_PROVIDER=ollama
LLM_MODEL=llama3.2:3b
LLM_TEMPERATURE=0.0
```

> Nota: para `ollama`, debes tener runtime/modelo accesible desde el contenedor.

### 5.3 Qué enseñar con esta integración

- Cómo encapsular IA detrás de una interfaz estable (`evaluate(event)`).
- Por qué usar salida JSON estricta para hacer sistemas robustos.
- Fallback a heurística si falla el proveedor/modelo.

---

## 6) Ruta didáctica sugerida para estudiantes

1. **Sprint 1:** entender contratos y pipeline E2E.
2. **Sprint 2:** agregar validación de esquemas en runtime.
3. **Sprint 3:** idempotencia por `event_id` + DLQ.
4. **Sprint 4:** observabilidad (logs estructurados + métricas).
5. **Sprint 5:** experimentar `heuristic` vs `langgraph` y comparar precisión/costo/latencia.

---

## 7) Próximos pasos de ingeniería

- Propagación explícita de `trace_id` por headers + logs JSON.
- Idempotencia completa por `event_id` en `core-service`.
- DLQ para errores de consumo y job de replay.
- Dashboard SSE/WebSocket para incidentes.
- Adapter de vector store (Milvus) y storage de evidencia.
- Tests de contrato automatizados en CI.
