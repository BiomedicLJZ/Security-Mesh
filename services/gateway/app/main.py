import os
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI
from pydantic import BaseModel, Field

from .kafka_client import build_producer

KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "redpanda:9092")
TOPIC_TELEMETRY = os.getenv("TOPIC_TELEMETRY", "telemetry.raw.v1")

producer = build_producer(KAFKA_BOOTSTRAP)
app = FastAPI(title="SentinelMesh Gateway", version="0.1.0")


class EmergencyReport(BaseModel):
    citizen_id: str = Field(..., examples=["citizen-001"])
    lat: float = Field(..., examples=[20.6736])
    lon: float = Field(..., examples=[-103.344])
    emergency: bool = True
    audio_signature: str | None = Field(None, examples=["gunshot_like"])
    panic_motion: bool = False


@app.get("/health")
def health():
    return {"ok": True, "service": "gateway"}


@app.post("/v1/emergency/report")
def report(req: EmergencyReport):
    trace_id = str(uuid.uuid4())
    event = {
        "event_id": str(uuid.uuid4()),
        "event_type": "telemetry.raw",
        "schema_version": "v1",
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "source": "gateway",
        "trace_id": trace_id,
        "payload": {
            "citizen_id": req.citizen_id,
            "lat": req.lat,
            "lon": req.lon,
            "emergency": req.emergency,
            "signals": {
                "audio_signature": req.audio_signature,
                "panic_motion": req.panic_motion,
            },
        },
    }

    producer.send(TOPIC_TELEMETRY, key=req.citizen_id, value=event)
    producer.flush(timeout=5)

    return {
        "accepted": True,
        "trace_id": trace_id,
        "published_topic": TOPIC_TELEMETRY,
        "event_id": event["event_id"],
    }
