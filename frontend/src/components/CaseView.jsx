// ~/medplat/frontend/src/components/CaseView.jsx
import React, { useState, useEffect } from "react";
import Level2CaseLogic from "./Level2CaseLogic";

const API_BASE = "https://super-zebra-g46xvpxqjrv5cwqg4-8080.app.github.dev";

export default function CaseView() {
  const [areas, setAreas] = useState([]);
  const [area, setArea] = useState("");
  const [topics, setTopics] = useState([]);
  const [topic, setTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [lang, setLang] = useState("en");
  const [customLang, setCustomLang] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [gamify, setGamify] = useState(false);
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(false);

  // load categories (areas) – not tied to lang anymore
  useEffect(() => {
    fetch(`${API_BASE}/api/topics/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}), // no lang → keep stable
    })
      .then((res) => res.json())
      .then((data) => setAreas(data.categories || []))
      .catch(() => setAreas([]));
  }, []);

  // load topics for selected area – not tied to lang anymore
  useEffect(() => {
    if (!area) return;
    fetch(`${API_BASE}/api/topics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ area }), // no lang → stable IDs
    })
      .then((res) => res.json())
      .then((data) => setTopics(data.topics || []))
      .catch(() => setTopics([]));
  }, [area]);

  const getLanguage = () => {
    if (lang !== "custom") return lang;
    const trimmed = customLang.trim().toLowerCase();
    return /^[a-z]{2}$/.test(trimmed) ? trimmed : "en";
  };

  const generateCase = async () => {
    const chosenTopic = customTopic.trim() || topic;
    if (!chosenTopic) {
      alert("Please select or enter a topic");
      return;
    }
    setLoading(true);
    setCaseData(null);
    try {
      const res = await fetch(`${API_BASE}/api/dialog`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          area,
          topic,
          customSearch: customTopic,
          language: getLanguage(), // ✅ lang only affects case gen
          model,
          gamify,
        }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setCaseData(data.case || data.aiReply || {});
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">🩺 MedPlat Case Generator</h1>

      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Choose area</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Choose topic</option>
          {topics.map((t) => (
            <option key={t.id} value={t.topic}>
              {t.topic}
            </option>
          ))}
        </select>

        {/* ✅ Custom Topic Search */}
        <input
          type="text"
          value={customTopic}
          onChange={(e) => setCustomTopic(e.target.value)}
          placeholder="Custom search (e.g. IBD in pregnancy)"
          className="border p-2 rounded w-64"
        />

        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="en">English</option>
          <option value="da">Dansk</option>
          <option value="fa">Farsi</option>
          <option value="ar">Arabic</option>
          <option value="ur">Urdu</option>
          <option value="es">Spanish</option>
          <option value="de">German</option>
          <option value="custom">Other…</option>
        </select>
        {lang === "custom" && (
          <input
            type="text"
            value={customLang}
            onChange={(e) => setCustomLang(e.target.value)}
            placeholder="ISO code (e.g. fr)"
            className="border p-2 rounded"
          />
        )}

        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="gpt-4o-mini">GPT-4o-mini (default)</option>
          <option value="gpt-4o">GPT-4o</option>
          <option value="gpt-4">GPT-4</option>
        </select>

        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={gamify}
            onChange={(e) => setGamify(e.target.checked)}
          />
          Gamify
        </label>

        <button
          onClick={generateCase}
          disabled={loading || (!topic && !customTopic)}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {loading ? "Generating..." : "Generate Case"}
        </button>
      </div>

      {/* Case rendering */}
      {caseData && gamify && (
        <Level2CaseLogic caseData={caseData} caseId={customTopic || topic} />
      )}

      {caseData && !gamify && (
        <pre className="bg-gray-100 p-4 rounded whitespace-pre-wrap text-sm">
          {JSON.stringify(caseData, null, 2)}
        </pre>
      )}
    </div>
  );
}
