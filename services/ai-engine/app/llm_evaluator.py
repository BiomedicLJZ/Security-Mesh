"""LangGraph-based anomaly evaluator with pluggable LLM/SLM providers.

Pipeline implemented in this module (intentionally explicit for teaching):
1. Normalize incoming telemetry into a compact model payload.
2. Build a strict prompt contract asking for JSON-only output.
3. Invoke a chat model through LangChain.
4. Parse/validate model output defensively.
5. Return `(category, confidence)` or `None` for no escalation.

Supported providers:
- `openai`  -> `langchain-openai` (`OPENAI_API_KEY`)
- `gemini`  -> `langchain-google-genai` (`GOOGLE_API_KEY`)
- `ollama`  -> `langchain-ollama` (local/runtime-hosted SLM)
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph


class EvaluationState(TypedDict):
    """State shared across LangGraph nodes."""

    telemetry_event: dict[str, Any]
    prompt_messages: list[Any]
    raw_model_output: str
    decision: dict[str, Any]


@dataclass
class EvaluatorConfig:
    """Runtime configuration for the evaluator."""

    provider: str = os.getenv("LLM_PROVIDER", "openai").lower()
    model_name: str = os.getenv("LLM_MODEL", "gpt-4o-mini")
    temperature: float = float(os.getenv("LLM_TEMPERATURE", "0.0"))


class LLMEvaluator:
    """Telemetry anomaly evaluator backed by a LangGraph workflow."""

    def __init__(self, config: EvaluatorConfig | None = None):
        self.config = config or EvaluatorConfig()
        self.model = self._build_model()
        self.graph = self._build_graph()

    def _build_model(self):
        provider = self.config.provider

        if provider == "ollama":
            from langchain_ollama import ChatOllama

            return ChatOllama(model=self.config.model_name, temperature=self.config.temperature)

        if provider in ("google", "gemini"):
            from langchain_google_genai import ChatGoogleGenerativeAI

            return ChatGoogleGenerativeAI(
                model=self.config.model_name,
                temperature=self.config.temperature,
            )

        if provider == "openai":
            from langchain_openai import ChatOpenAI

            return ChatOpenAI(model=self.config.model_name, temperature=self.config.temperature)

        raise ValueError(f"Unsupported LLM_PROVIDER='{provider}'. Use openai|gemini|ollama.")

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
                "You are a safety incident classifier for emergency telemetry. "
                "Return only compact JSON with keys: trigger:boolean, "
                "category:string, confidence:number(0..1), rationale:string."
            )
        )
        human = HumanMessage(
            content=(
                "Evaluate if this event should be escalated as anomaly.high_confidence.\n"
                f"Telemetry: {json.dumps(telemetry, ensure_ascii=False)}\n"
                "Heuristic prior: emergency+gunshot-like audio => very high confidence; "
                "emergency+panic motion => medium confidence; emergency alone => moderate confidence."
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
