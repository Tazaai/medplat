import React, { useEffect, useState } from "react";
import { API_BASE } from "./config";

function TopicsPanel() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const base = API_BASE || '';
    const url = base ? `${base}/api/topics` : `/api/topics`;
    setLoading(true);
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        // try to handle different shapes: { topics: [...] } or array
        if (Array.isArray(data)) setTopics(data);
        else if (data && Array.isArray(data.topics)) setTopics(data.topics);
        else setTopics([]);
      })
      .catch((err) => {
        console.debug("Topics fetch error", err);
        setError("Backend unreachable or returned invalid data");
      })
      .finally(() => setLoading(false));
  }, []);

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
      <p>Backend base: <code>{API_BASE}</code></p>
      <DiagnosticsPanel />
      <TopicsPanel />
    </div>
  );
}

function DiagnosticsPanel() {
  const [health, setHealth] = useState(null);
  const [topicsCount, setTopicsCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const base = API_BASE || '';

  useEffect(() => {
    let mounted = true;
    async function runChecks() {
      setLoading(true);
      try {
        const healthUrl = base ? `${base}/` : `/`;
        const topicsUrl = base ? `${base}/api/topics` : `/api/topics`;

        const [hRes, tRes] = await Promise.all([
          fetch(healthUrl).then(r => r.json()).catch(() => null),
          fetch(topicsUrl).then(r => r.json()).catch(() => null),
        ]);

        if (!mounted) return;
        setHealth(hRes ? (hRes.status || JSON.stringify(hRes)) : null);
        if (Array.isArray(tRes)) setTopicsCount(tRes.length);
        else if (tRes && Array.isArray(tRes.topics)) setTopicsCount(tRes.topics.length);
        else setTopicsCount(tRes ? 0 : null);
      } catch (e) {
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
