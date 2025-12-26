import time
import sqlite3
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

DB_PATH = "watches.db"

def get_db():
    db = sqlite3.connect(DB_PATH, check_same_thread=False)
    db.row_factory = sqlite3.Row
    return db

def init_tables(db: sqlite3.Connection):
    db.execute("""
        CREATE TABLE IF NOT EXISTS watches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT NOT NULL,
            status TEXT,
            error TEXT,
            interval INTEGER NOT NULL,
            last_checked INTEGER,
            added_at INTEGER NOT NULL
        )
    """)
    db.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    db = get_db()
    init_tables(db)
    db.close()
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class WatchCreate(BaseModel):
    url: str
    interval: int

class WatchResult(BaseModel):
    id: int
    status: int
    error: str | None = None

@app.post("/watches")
def add_watch(watch: WatchCreate):
    db = get_db()
    cursor = db.execute(
        "INSERT INTO watches (url, interval, added_at) VALUES (?, ?, ?)",
        (watch.url, watch.interval, int(time.time())),
    )
    db.commit()
    return {
        "id": cursor.lastrowid,
        "url": watch.url,
        "interval": watch.interval,
    }

@app.get("/watches")
def get_watches():
    db = get_db()
    rows = db.execute("SELECT * FROM watches").fetchall()
    return [dict(row) for row in rows]

@app.get("/watches/{watch_id}")
def get_watch(watch_id: int):
    db = get_db()
    row = db.execute("SELECT * FROM watches WHERE id = ?", (watch_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Watch not found")
    return dict(row)

@app.get("/watches/{watch_id}")
def get_watch(watch_id: int):
    db = get_db()
    row = db.execute("SELECT * FROM watches WHERE id = ?", (watch_id,)).fetchone()
    return dict(row)

@app.post("/results")
def update_watch_result(result: WatchResult):
    db = get_db()
    db.execute(
        """
        UPDATE watches
        SET
            status = ?,
            error = ?,
            last_checked = ?
        WHERE id = ?
        """,
        (
            result.status,
            result.error,
            int(time.time()),
            result.id,
        ),
    )
    db.commit()
    return {"ok": True}


@app.get("/health")
def health():
    return {"ok": True}

@app.get("/ready")
def ready():
    return {"ready": True}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
