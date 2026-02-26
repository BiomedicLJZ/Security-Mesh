# SentinelMesh — Starter Kit (Walking Skeleton)

Starter kit local para un flujo **gateway → Kafka/Redpanda → AI engine → core-service → gRPC dispatch → Postgres** con contratos versionados.

## Estructura

- `contracts/events`: JSON Schemas versionados para eventos.
- `contracts/proto`: contrato gRPC.
- `contracts/openapi`: OpenAPI mínimo para gateway/core.
- `infra/docker-compose.yml`: stack local con Redpanda, Postgres y servicios.
- `services/*`: microservicios Python runnable.

## Quickstart

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

## Probar flujo end-to-end

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

## Siguientes pasos sugeridos

- Propagación explícita de `trace_id` por headers + logs JSON.
- Idempotencia por `event_id` en `core-service`.
- DLQ para errores de consumo.
- Dashboard SSE/WebSocket.
- Adapter de vector store (Milvus) y storage.
