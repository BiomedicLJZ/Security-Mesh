import os

import psycopg2


def dsn() -> str:
    host = os.getenv("POSTGRES_HOST", "postgres")
    port = os.getenv("POSTGRES_PORT", "5432")
    db = os.getenv("POSTGRES_DB", "sentinelmesh")
    user = os.getenv("POSTGRES_USER", "sentinel")
    pw = os.getenv("POSTGRES_PASSWORD", "sentinel")
    return f"host={host} port={port} dbname={db} user={user} password={pw}"


def get_conn():
    return psycopg2.connect(dsn())


def init_db():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
            CREATE TABLE IF NOT EXISTS incidents (
              id TEXT PRIMARY KEY,
              trace_id TEXT NOT NULL,
              category TEXT NOT NULL,
              confidence DOUBLE PRECISION NOT NULL,
              lat DOUBLE PRECISION,
              lon DOUBLE PRECISION,
              citizen_id TEXT,
              created_at TIMESTAMPTZ NOT NULL,
              officer_id TEXT,
              eta_seconds INT,
              distance_meters DOUBLE PRECISION
            );
            """
            )
        conn.commit()
