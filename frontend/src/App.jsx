import React, { useEffect, useState } from "react";
import { API_BASE } from "./config";

const DEFAULT_TIMEOUT = 2500; // ms

async function fetchJsonWithTimeout(url, timeout = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(id);
    if (err.name === "AbortError") throw new Error("Request timed out");
    throw err;
  }
}

function TopicsPanel() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const base = API_BASE || "";

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      const url = base ? `${base}/api/topics` : `/api/topics`;
      try {
        const data = await fetchJsonWithTimeout(url);
        if (!mounted) return;
        if (Array.isArray(data)) setTopics(data);
        else if (data && Array.isArray(data.topics)) setTopics(data.topics);
        else setTopics([]);
      } catch (err) {
        if (!mounted) return;
        setError(`Backend unreachable: ${err.message}`);
        setTopics([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [base]);

  if (loading) return <p>Loading backend topics…</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!topics || topics.length === 0) return <p>No topics returned from backend.</p>;

  return (
    <div style={{ marginTop: 12 }}>
      <h3>Backend topics</h3>
      <ul>
        {topics.map((t, i) => (
          <li key={t.id || i}>{t.topic || t.name || JSON.stringify(t)}</li>
        ))}
      </ul>
    </div>
  );
}

export default function App() {
  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>✅ MedPlat Frontend</h1>
      <p>Backend base: <code>{API_BASE || 'local (proxy or /api)'}</code></p>
      <DiagnosticsPanel />
      <TopicsPanel />
    </div>
  );
}

function DiagnosticsPanel() {
  const [health, setHealth] = useState(null);
  const [topicsCount, setTopicsCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const base = API_BASE || "";

  useEffect(() => {
    let mounted = true;
    async function runChecks() {
      setLoading(true);
      setHealth(null);
      setTopicsCount(null);
      try {
        const healthUrl = base ? `${base}/` : `/`;
        const topicsUrl = base ? `${base}/api/topics` : `/api/topics`;

        const [h, t] = await Promise.all([
          fetchJsonWithTimeout(healthUrl).catch(() => null),
          fetchJsonWithTimeout(topicsUrl).catch(() => null),
        ]);

        if (!mounted) return;
        setHealth(h ? (h.status || JSON.stringify(h)) : null);
        if (Array.isArray(t)) setTopicsCount(t.length);
        else if (t && Array.isArray(t.topics)) setTopicsCount(t.topics.length);
        else setTopicsCount(t ? 0 : null);
      } catch (err) {
        if (!mounted) return;
        setHealth(null);
        setTopicsCount(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    runChecks();
    return () => { mounted = false; };
  }, [base]);

  return (
    <div style={{ marginBottom: 12, padding: 8, border: '1px solid #eee', borderRadius: 6 }}>
      <h4>Diagnostics</h4>
      {loading && <div>Checking backend…</div>}
      {!loading && (
        <div>
          <div><strong>Health:</strong> {health === null ? <em>unreachable</em> : health}</div>
          <div><strong>Topics count:</strong> {topicsCount === null ? <em>unknown</em> : topicsCount}</div>
        </div>
      )}
    </div>
  );
}
