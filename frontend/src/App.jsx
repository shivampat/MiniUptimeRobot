import React, { useMemo, useState } from 'react';

const INTERVAL_OPTIONS = [
  { label: 'Every minute', value: 60 },
  { label: 'Every 5 minutes', value: 300 },
  { label: 'Every 15 minutes', value: 900 },
  { label: 'Every hour', value: 3600 },
];

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

  const sortedWatches = useMemo(
    () => [...watches].sort((a, b) => a.addedAt - b.addedAt),
    [watches]
  );

  const handleSubmit = (event) => {
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

    setWatches((prev) => [
      ...prev,
      { url: trimmed, intervalSec: Number(intervalSec), addedAt: Date.now() },
    ]);
    setUrl('');
    setError('');
  };

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

          <button type="submit">Add watch</button>
        </form>
      </section>

      <section className="panel">
        <h2>Watched URLs</h2>
        {sortedWatches.length === 0 ? (
          <p className="muted">No URLs yet. Add one to start watching.</p>
        ) : (
          <ul className="list">
            {sortedWatches.map((watch) => (
              <li key={watch.url} className="list-item">
                <div className="url">{watch.url}</div>
                <div className="meta">
                  Interval: {watch.intervalSec / 60} min
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

