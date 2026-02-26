"""LLM/SLM-based anomaly evaluation for teaching purposes.

This module intentionally favors readability over compactness so students can
inspect each step in the chain/graph pipeline:

1) Normalize telemetry event into a model-friendly dict.
2) Build a constrained prompt that asks for strict JSON.
3) Run a LangGraph with explicit nodes.
4) Parse and validate the model output.
5) Return a tuple(category, confidence) compatible with the existing pipeline.

The graph supports two model backends:
- OpenAI-compatible chat models via ``langchain-openai``.
- Local Ollama models (often used as SLMs) via ``langchain-ollama``.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph


class EvaluationState(TypedDict):
    """State container used by LangGraph nodes."""

    telemetry_event: dict[str, Any]
    prompt_messages: list[Any]
    raw_model_output: str
    decision: dict[str, Any]


@dataclass
class EvaluatorConfig:
    """Runtime configuration loaded from environment variables."""

    provider: str = os.getenv("LLM_PROVIDER", "openai").lower()
    model_name: str = os.getenv("LLM_MODEL", "gpt-4o-mini")
    temperature: float = float(os.getenv("LLM_TEMPERATURE", "0.0"))


class LLMEvaluator:
    """Evaluate telemetry messages with a LangGraph pipeline."""

    def __init__(self, config: EvaluatorConfig | None = None):
        self.config = config or EvaluatorConfig()
        self.model = self._build_model()
        self.graph = self._build_graph()

    def _build_model(self):
        if self.config.provider == "ollama":
            from langchain_ollama import ChatOllama

            return ChatOllama(model=self.config.model_name, temperature=self.config.temperature)

        from langchain_openai import ChatOpenAI

        return ChatOpenAI(model=self.config.model_name, temperature=self.config.temperature)

    def _normalize_event(self, event: dict[str, Any]) -> dict[str, Any]:
        payload = event.get("payload", {}) or {}
        signals = payload.get("signals", {}) or {}
        return {
            "citizen_id": payload.get("citizen_id"),
            "lat": payload.get("lat"),
            "lon": payload.get("lon"),
            "emergency": bool(payload.get("emergency", False)),
            "audio_signature": signals.get("audio_signature"),
            "panic_motion": bool(signals.get("panic_motion", False)),
        }

    def _prompt_node(self, state: EvaluationState) -> EvaluationState:
        telemetry = self._normalize_event(state["telemetry_event"])

        system = SystemMessage(
            content=(
                "You are a safety incident classifier. "
                "Return ONLY compact JSON with keys: trigger:boolean, "
                "category:string, confidence:number(0..1), rationale:string."
            )
        )
        human = HumanMessage(
            content=(
                "Classify whether this telemetry requires escalation.\n"
                f"Telemetry: {json.dumps(telemetry, ensure_ascii=False)}\n"
                "Rules of thumb: gunshot-like sounds + emergency are very high confidence; "
                "panic motion + emergency is medium confidence; emergency alone is moderate."
            )
        )

        state["prompt_messages"] = [system, human]
        return state

    def _model_node(self, state: EvaluationState) -> EvaluationState:
        response = self.model.invoke(state["prompt_messages"])
        state["raw_model_output"] = str(response.content)
        return state

    def _parse_node(self, state: EvaluationState) -> EvaluationState:
        text = state.get("raw_model_output", "").strip()

        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            # Defensive fallback when model returns prose around JSON.
            start = text.find("{")
            end = text.rfind("}")
            if start >= 0 and end > start:
                parsed = json.loads(text[start : end + 1])
            else:
                parsed = {
                    "trigger": False,
                    "category": "unparseable_response",
                    "confidence": 0.0,
                    "rationale": text[:240],
                }

        parsed.setdefault("trigger", False)
        parsed.setdefault("category", "unknown")
        parsed.setdefault("confidence", 0.0)
        state["decision"] = parsed
        return state

    def _build_graph(self):
        graph = StateGraph(EvaluationState)
        graph.add_node("prompt", self._prompt_node)
        graph.add_node("model", self._model_node)
        graph.add_node("parse", self._parse_node)

        graph.add_edge(START, "prompt")
        graph.add_edge("prompt", "model")
        graph.add_edge("model", "parse")
        graph.add_edge("parse", END)

        return graph.compile()

    def evaluate(self, telemetry_event: dict[str, Any]) -> tuple[str, float] | None:
        initial_state: EvaluationState = {
            "telemetry_event": telemetry_event,
            "prompt_messages": [],
            "raw_model_output": "",
            "decision": {},
        }
        result = self.graph.invoke(initial_state)
        decision = result["decision"]

        if not bool(decision.get("trigger", False)):
            return None

        return (
            str(decision.get("category", "llm_detected_anomaly")),
            float(decision.get("confidence", 0.0)),
        )
