import threading

from fastapi import FastAPI, HTTPException

from .consumer import run as consumer_run
from .db import get_conn, init_db
from .models import IncidentOut

app = FastAPI(title="SentinelMesh Core Service", version="0.1.0")


@app.on_event("startup")
def startup():
    init_db()
    t = threading.Thread(target=consumer_run, daemon=True)
    t.start()


@app.get("/health")
def health():
    return {"ok": True, "service": "core-service"}


@app.get("/v1/incidents/{incident_id}", response_model=IncidentOut)
def get_incident(incident_id: str):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
              SELECT id, trace_id, category, confidence, lat, lon, citizen_id, officer_id, eta_seconds, distance_meters
              FROM incidents WHERE id=%s
            """,
                (incident_id,),
            )
            row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="incident_not_found")

    return IncidentOut(
        id=row[0],
        trace_id=row[1],
        category=row[2],
        confidence=float(row[3]),
        lat=row[4],
        lon=row[5],
        citizen_id=row[6],
        officer_id=row[7],
        eta_seconds=row[8],
        distance_meters=row[9],
    )
