import os
import uuid
from datetime import datetime, timezone

from .db import get_conn
from .grpc_client import get_dispatch_stub, request_route
from .kafka_client import build_consumer, build_producer

KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "redpanda:9092")
TOPIC_ANOMALY = os.getenv("TOPIC_ANOMALY", "anomaly.high_confidence.v1")
TOPIC_DISPATCH = os.getenv("TOPIC_DISPATCH", "dispatch.route_assigned.v1")

consumer = build_consumer(KAFKA_BOOTSTRAP, TOPIC_ANOMALY, group_id="core-service-v1")
producer = build_producer(KAFKA_BOOTSTRAP)


def upsert_incident(incident: dict):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
              INSERT INTO incidents (id, trace_id, category, confidence, lat, lon, citizen_id, created_at,
                                     officer_id, eta_seconds, distance_meters)
              VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
              ON CONFLICT (id) DO UPDATE SET
                officer_id=EXCLUDED.officer_id,
                eta_seconds=EXCLUDED.eta_seconds,
                distance_meters=EXCLUDED.distance_meters
            """,
                (
                    incident["id"],
                    incident["trace_id"],
                    incident["category"],
                    incident["confidence"],
                    incident["lat"],
                    incident["lon"],
                    incident["citizen_id"],
                    incident["created_at"],
                    incident.get("officer_id"),
                    incident.get("eta_seconds"),
                    incident.get("distance_meters"),
                ),
            )
        conn.commit()


def run():
    stub = get_dispatch_stub()
    print(f"[core-service] consuming {TOPIC_ANOMALY} -> writing Postgres + calling gRPC dispatch")

    for msg in consumer:
        ev = msg.value
        trace_id = ev.get("trace_id", str(uuid.uuid4()))
        p = ev.get("payload", {}) or {}

        incident_id = str(uuid.uuid4())
        lat = float(p.get("lat") or 0.0)
        lon = float(p.get("lon") or 0.0)

        officer_id = "officer-001"
        officer_lat, officer_lon = lat + 0.01, lon + 0.01

        resp = request_route(
            stub,
            incident_id=incident_id,
            incident_lat=lat,
            incident_lon=lon,
            officer_id=officer_id,
            officer_lat=officer_lat,
            officer_lon=officer_lon,
        )

        incident = {
            "id": incident_id,
            "trace_id": trace_id,
            "category": p.get("category", "unknown"),
            "confidence": float(p.get("confidence") or 0.0),
            "lat": lat,
            "lon": lon,
            "citizen_id": p.get("citizen_id"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "officer_id": resp.officer_id,
            "eta_seconds": int(resp.eta_seconds),
            "distance_meters": float(resp.distance_meters),
        }

        upsert_incident(incident)

        dispatch_event = {
            "event_id": str(uuid.uuid4()),
            "event_type": "dispatch.route_assigned",
            "schema_version": "v1",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "source": "core-service",
            "trace_id": trace_id,
            "payload": {
                "incident_id": incident_id,
                "officer_id": resp.officer_id,
                "eta_seconds": int(resp.eta_seconds),
                "distance_meters": float(resp.distance_meters),
            },
        }

        producer.send(TOPIC_DISPATCH, key=incident_id, value=dispatch_event)
        producer.flush(timeout=5)

        print(f"[core-service] trace={trace_id} incident={incident_id} saved + dispatch assigned")
