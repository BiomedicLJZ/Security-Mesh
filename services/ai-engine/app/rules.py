def classify_anomaly(telemetry_event: dict) -> tuple[str, float] | None:
    """
    Heurística mock (para clase):
    - Si emergency=true y audio_signature contiene 'gun' o 'shot' => alta confianza
    - Si panic_motion=true => media
    """
    p = telemetry_event.get("payload", {})
    signals = p.get("signals", {}) or {}
    emergency = bool(p.get("emergency", False))
    audio = (signals.get("audio_signature") or "").lower()
    panic = bool(signals.get("panic_motion", False))

    if emergency and any(k in audio for k in ["gun", "shot", "disparo"]):
        return ("acoustic_gunshot", 0.93)

    if emergency and panic:
        return ("panic_motion", 0.75)

    if emergency:
        return ("manual_emergency", 0.70)

    return None
