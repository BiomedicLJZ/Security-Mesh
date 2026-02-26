from pydantic import BaseModel


class IncidentOut(BaseModel):
    id: str
    trace_id: str
    category: str
    confidence: float
    lat: float | None
    lon: float | None
    citizen_id: str | None
    officer_id: str | None
    eta_seconds: int | None
    distance_meters: float | None
