# MiniUptimeRobot

Simple uptime-watcher prototype with:
- FastAPI backend storing watches in SQLite (`api/`)
- React/Vite frontend to add and view watches (`frontend/`)
- Worker placeholder (`worker/`) for future periodic checks

## Run the API
```bash
cd api
python3 -m venv .venv && source .venv/bin/activate  # first time
pip install -r requirements.txt  # if present; otherwise pip install fastapi uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
SQLite file lives at `api/watches.db`. Key endpoints:
- `GET /watches` – list all watches
- `POST /watches` – add a watch `{ "url": "...", "interval": 300 }`
- `GET /watches/{id}` – fetch a single watch
- `POST /results` – update status/error/last_checked
- `GET /health`, `GET /ready` – basic probes

## Run the frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`. The app reads `VITE_API_BASE` if set; defaults to `http://localhost:8000`.

## Behavior
- The frontend shows interval, status, and last checked time.
- It periodically refreshes each watch by calling `GET /watches/{id}` when its interval elapses.

## Notes
- If you change the API port/host, set `VITE_API_BASE` accordingly (e.g., `http://127.0.0.1:8000`).
- CORS is enabled for `localhost:5173`/`127.0.0.1:5173` in the API.