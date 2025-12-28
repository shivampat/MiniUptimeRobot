import React, { useEffect, useMemo, useState } from 'react';

const INTERVAL_OPTIONS = [
  { label: 'Every minute', value: 60 },
  { label: 'Every 5 minutes', value: 300 },
  { label: 'Every 15 minutes', value: 900 },
  { label: 'Every hour', value: 3600 },
];

const API_BASE = '/api';
const REFRESH_TICK_MS = 5000;

const formatLastChecked = (value) => {
  if (!value) return 'Never checked';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Never checked';
  return date.toLocaleString();
};

const isValidUrl = (url) => {
  try {
    // eslint-disable-next-line no-new
    new URL(url);
    return true;
  } catch (err) {
    return false;
  }
};

export default function App() {
  const [url, setUrl] = useState('');
  const [intervalSec, setIntervalSec] = useState(INTERVAL_OPTIONS[0].value);
  const [watches, setWatches] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const sortedWatches = useMemo(
    () => [...watches].sort((a, b) => a.addedAt - b.addedAt),
    [watches]
  );

  const mapApiWatch = (record) => ({
    id: record.id,
    url: record.url,
    intervalSec: Number(record.interval ?? record.intervalSec ?? intervalSec),
    addedAt: record.added_at ? Number(record.added_at) * 1000 : Date.now(),
    status: record.status ?? 'pending',
    lastChecked: record.last_checked
      ? Number(record.last_checked) * 1000
      : null,
    error: record.error ?? null,
  });

  const loadWatches = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/watches`);
      if (!res.ok) {
        throw new Error('API returned an error while loading watches.');
      }
      const data = await res.json();
      setWatches(Array.isArray(data) ? data.map(mapApiWatch) : []);
    } catch (err) {
      setError(err.message || 'Failed to load watches from the API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      setError('Please enter a URL.');
      return;
    }
    if (!isValidUrl(trimmed)) {
      setError('Please enter a valid URL (https://example.com).');
      return;
    }

    const exists = watches.some(
      (watch) => watch.url.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setError('This URL is already being watched.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = { url: trimmed, interval: Number(intervalSec) };
      const res = await fetch(`${API_BASE}/watches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to add watch.');
      }
      const body = await res.json();
      const added = mapApiWatch(body.watch ? body.watch : body);
      setWatches((prev) => [...prev, added]);
      setUrl('');
    } catch (err) {
      setError(err.message || 'Failed to add watch.');
    } finally {
      setSaving(false);
    }
  };

  const refreshWatch = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/watches/${id}`);
      if (!res.ok) throw new Error('Failed to refresh watch');
      const data = await res.json();
      const mapped = mapApiWatch(data);
      setWatches((prev) =>
        prev.map((watch) => (watch.id === id ? mapped : watch))
      );
    } catch (err) {
      // Optional: surface in UI later
      console.error(err);
    }
  };

  useEffect(() => {
    const inFlight = new Set();
    const tick = () => {
      const now = Date.now();
      watches.forEach((watch) => {
        if (!watch?.id) return;
        const last = watch.lastChecked ?? watch.addedAt ?? 0;
        const due = now - last >= watch.intervalSec * 1000;
        if (due && !inFlight.has(watch.id)) {
          inFlight.add(watch.id);
          refreshWatch(watch.id).finally(() => inFlight.delete(watch.id));
        }
      });
    };
    const timer = setInterval(tick, REFRESH_TICK_MS);
    return () => clearInterval(timer);
    // We intentionally exclude refreshWatch from deps to avoid re-creating interval
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watches]);

  return (
    <div className="app">
      <header>
        <h1>Mini Uptime Robot</h1>
        <p>Add URLs to watch at a chosen interval.</p>
      </header>

      <section className="panel">
        <h2>Add URL</h2>
        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span>URL</span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              required
            />
          </label>

          <label className="field">
            <span>Check interval</span>
            <select
              value={intervalSec}
              onChange={(e) => setIntervalSec(Number(e.target.value))}
            >
              {INTERVAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {error ? <p className="error">{error}</p> : null}

          <button type="submit" disabled={saving}>
            {saving ? 'Adding…' : 'Add watch'}
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Watched URLs</h2>
        {loading ? (
          <p className="muted">Loading watches…</p>
        ) : sortedWatches.length === 0 ? (
          <p className="muted">No URLs yet. Add one to start watching.</p>
        ) : (
          <ul className="list">
            {sortedWatches.map((watch) => (
              <li key={watch.id || watch.url} className="list-item">
                <div className="url">{watch.url}</div>
                <div className="meta">
                  Interval: {watch.intervalSec / 60} min
                  {' · '}
                  Status: {watch.status || 'pending'}
                  {' · '}
                  Last checked: {formatLastChecked(watch.lastChecked)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

