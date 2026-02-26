"""AI engine worker.

Didactic objective:
- Consume telemetry events from Kafka.
- Decide if an anomaly should be escalated.
- Publish anomaly events to another topic.

The evaluator strategy is runtime-configurable:
- heuristic: deterministic Python rules (default).
- langgraph: LLM/SLM-based classifier through LangChain + LangGraph.
"""

import os
import uuid
from datetime import datetime, timezone

from .kafka_client import build_consumer, build_producer
from .rules import classify_anomaly

KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "redpanda:9092")
TOPIC_TELEMETRY = os.getenv("TOPIC_TELEMETRY", "telemetry.raw.v1")
TOPIC_ANOMALY = os.getenv("TOPIC_ANOMALY", "anomaly.high_confidence.v1")
AI_EVALUATOR_MODE = os.getenv("AI_EVALUATOR_MODE", "heuristic").lower()

consumer = build_consumer(KAFKA_BOOTSTRAP, TOPIC_TELEMETRY, group_id="ai-engine-v1")
producer = build_producer(KAFKA_BOOTSTRAP)


def build_evaluator():
    """Return a callable(event)->tuple[str,float]|None depending on mode."""
    if AI_EVALUATOR_MODE != "langgraph":
        print("[ai-engine] evaluator=heuristic")
        return classify_anomaly

    try:
        from .llm_evaluator import LLMEvaluator

        evaluator = LLMEvaluator()
        print("[ai-engine] evaluator=langgraph")
        return evaluator.evaluate
    except Exception as exc:  # fallback keeps the service operational for class demos
        print(f"[ai-engine] evaluator=langgraph unavailable ({exc}), falling back to heuristic")
        return classify_anomaly


def main():
    evaluator = build_evaluator()
    print(f"[ai-engine] consuming {TOPIC_TELEMETRY} -> producing {TOPIC_ANOMALY}")

    for msg in consumer:
        event = msg.value
        trace_id = event.get("trace_id", str(uuid.uuid4()))
        p = event.get("payload", {})
        citizen_id = p.get("citizen_id", "unknown")

        decision = evaluator(event)
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
