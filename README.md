# SentinelMesh — Technical Teaching Skeleton

SentinelMesh is a compact distributed-systems reference project designed for classroom use.
It demonstrates a production-style event flow:

`gateway (HTTP) -> Kafka/Redpanda -> ai-engine (inference) -> core-service (state/orchestration) -> dispatch-service (gRPC) -> Postgres`

## 1) System topology and module responsibilities

### 1.1 `services/gateway` (ingress API)
- **Purpose:** accept citizen emergency reports over HTTP.
- **Main module:** `app/main.py`
  - validates request body with Pydantic;
  - generates `trace_id` + `event_id`;
  - publishes `telemetry.raw.v1` to Kafka.
- **Support module:** `app/kafka_client.py` (producer setup).

### 1.2 `services/ai-engine` (classification worker)
- **Purpose:** consume telemetry and decide whether to emit high-confidence anomaly events.
- **Main module:** `app/main.py`
  - consumes `telemetry.raw.v1`;
  - runs selected evaluator strategy;
  - publishes `anomaly.high_confidence.v1`.
- **Strategies:**
  - `app/rules.py` -> deterministic baseline rules.
  - `app/llm_evaluator.py` -> LangGraph pipeline over LLM/SLM.
- **Support module:** `app/kafka_client.py` (consumer + producer setup).

### 1.3 `services/core-service` (domain orchestrator)
- **Purpose:** persist incidents, call dispatch planner, emit route assignment events.
- **Main modules:**
  - `app/consumer.py`: consumes anomalies, persists incident, calls gRPC dispatch, publishes dispatch event.
  - `app/main.py`: read API (`GET /v1/incidents/{incident_id}`).
  - `app/db.py`: PostgreSQL connection and schema bootstrap.
  - `app/grpc_client.py`: typed gRPC client.

### 1.4 `services/dispatch-service` (gRPC computation)
- **Purpose:** route/ETA microservice contract.
- **Main module:** `app/server.py` (implements `GetInterceptRoute`).
- **Generated modules:** `dispatch_pb2.py`, `dispatch_pb2_grpc.py` from `contracts/proto/dispatch.proto`.

### 1.5 `infra/docker-compose.yml` (runtime graph)
- Redpanda broker
- Topic bootstrap job (`kafka-init`)
- PostgreSQL database
- Four business services

---

## 2) Contracts-first development model

### 2.1 Event contracts
- `contracts/events/telemetry.raw.v1.json`
- `contracts/events/anomaly.high_confidence.v1.json`
- `contracts/events/dispatch.route_assigned.v1.json`

### 2.2 RPC contract
- `contracts/proto/dispatch.proto`

### 2.3 HTTP contracts
- `contracts/openapi/gateway.yaml`
- `contracts/openapi/core.yaml`

### 2.4 Change protocol to teach students
1. Update contract first.
2. Update producers.
3. Update consumers.
4. Regenerate gRPC stubs if proto changed.
5. Verify end-to-end behavior.

---

## 3) Local setup

```bash
cp .env.example .env
cd infra
docker compose up --build
```

Optional: regenerate gRPC stubs manually.

---

## 4) End-to-end smoke test

### 4.1 Publish telemetry through gateway
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

### 4.2 Retrieve resulting incident
```bash
curl http://localhost:8002/v1/incidents/<INCIDENT_ID>
```

Use service logs to correlate by `trace_id`.

---

## 5) LangGraph evaluator integration (OpenAI, Gemini, Ollama)

`ai-engine` evaluator is runtime-selectable:
- `AI_EVALUATOR_MODE=heuristic` (default, deterministic rules)
- `AI_EVALUATOR_MODE=langgraph` (LLM/SLM evaluation)

### 5.1 LangGraph node design (`services/ai-engine/app/llm_evaluator.py`)
1. `prompt` node: normalize event + construct strict JSON-output prompt.
2. `model` node: invoke selected chat provider.
3. `parse` node: parse JSON and apply safe defaults.

This keeps model-dependent behavior isolated behind one interface:
`evaluate(event) -> (category, confidence) | None`

### 5.2 Provider configuration

#### OpenAI
```bash
AI_EVALUATOR_MODE=langgraph
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
LLM_TEMPERATURE=0.0
OPENAI_API_KEY=...
```

#### Google Gemini (recommended low-cost/free-tier option)
```bash
AI_EVALUATOR_MODE=langgraph
LLM_PROVIDER=gemini
LLM_MODEL=gemini-1.5-flash
LLM_TEMPERATURE=0.0
GOOGLE_API_KEY=...
```

#### Ollama (local SLM)
```bash
AI_EVALUATOR_MODE=langgraph
LLM_PROVIDER=ollama
LLM_MODEL=llama3.2:3b
LLM_TEMPERATURE=0.0
```

> Note: Gemini/OpenAI require valid API keys; Ollama requires reachable local runtime from container.

---

## 6) Teaching-focused engineering backlog

1. Add schema validation at runtime for consumed events.
2. Add idempotency table keyed by `event_id` in `core-service`.
3. Add DLQ and replay worker for failed messages.
4. Add structured JSON logs + metrics (`processing_latency_ms`, `error_count`).
5. Compare `heuristic` vs `langgraph` by precision/latency/cost.
