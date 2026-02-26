import os
import uuid
from datetime import datetime, timezone

from .kafka_client import build_consumer, build_producer
from .rules import classify_anomaly

KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "redpanda:9092")
TOPIC_TELEMETRY = os.getenv("TOPIC_TELEMETRY", "telemetry.raw.v1")
TOPIC_ANOMALY = os.getenv("TOPIC_ANOMALY", "anomaly.high_confidence.v1")

consumer = build_consumer(KAFKA_BOOTSTRAP, TOPIC_TELEMETRY, group_id="ai-engine-v1")
producer = build_producer(KAFKA_BOOTSTRAP)


def main():
    print(f"[ai-engine] consuming {TOPIC_TELEMETRY} -> producing {TOPIC_ANOMALY}")
    for msg in consumer:
        event = msg.value
        trace_id = event.get("trace_id", str(uuid.uuid4()))
        p = event.get("payload", {})
        citizen_id = p.get("citizen_id", "unknown")

        decision = classify_anomaly(event)
        if not decision:
            print(f"[ai-engine] trace={trace_id} citizen={citizen_id} -> no anomaly")
            continue

        category, confidence = decision
        anomaly = {
            "event_id": str(uuid.uuid4()),
            "event_type": "anomaly.high_confidence",
            "schema_version": "v1",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "source": "ai-engine",
            "trace_id": trace_id,
            "payload": {
                "category": category,
                "confidence": confidence,
                "lat": p.get("lat"),
                "lon": p.get("lon"),
                "citizen_id": citizen_id,
                "evidence_refs": [],
            },
        }

        producer.send(TOPIC_ANOMALY, key=citizen_id, value=anomaly)
        producer.flush(timeout=5)
        print(f"[ai-engine] trace={trace_id} -> published anomaly ({category}, {confidence})")


if __name__ == "__main__":
    main()
