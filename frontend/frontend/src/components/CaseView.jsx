// ~/medplat/frontend/src/components/CaseView.jsx
import React, { useState, useEffect } from "react";
import Level2CaseLogic from "./Level2CaseLogic";

const API_BASE = import.meta.env.VITE_API_BASE || "https://medplat-backend-139218747785.europe-west1.run.app";

export default function CaseView() {
  const [area, setArea] = useState("");
  const [topics, setTopics] = useState([]);
  const [category, setCategory] = useState("");
  const [caseId, setCaseId] = useState("");
  const [lang, setLang] = useState("en");
  const [customLang, setCustomLang] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [caseData, setCaseData] = useState({ fullText: "" });
  const [loading, setLoading] = useState(false);
  const [useGamification, setUseGamification] = useState(false);

  useEffect(() => {
    if (!area) return;

    const areaToCollection = { "Medical Fields": "topics2" };
    const collection = areaToCollection[area];
    if (!collection) return;

    fetch(`${API_BASE}/api/topics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collection }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.topics)) {
          const enriched = data.topics.map((topic, i) => ({
            id: `case_${i + 1}`,
            topic: topic.topic,
            category: topic.category || area,
            subcategory: topic.subcategory || "",
          }));
          setTopics(enriched);
        } else {
          setTopics([]);
        }
      })
      .catch(() => setTopics([]));
  }, [area]);

  const getLanguage = () => {
    if (lang !== "custom") return lang;
    const trimmed = customLang.trim().toLowerCase();
    return /^[a-z]{2}$/.test(trimmed) ? trimmed : "en";
  };

  const safeTopics = Array.isArray(topics) ? topics : [];
  const filteredTopics = safeTopics.filter((t) => t.category === category);
  const categories = [...new Set(safeTopics.map((t) => t.category))];

  const selectedTopic = (() => {
    if (customTopic.trim()) return customTopic.trim();
    const match = filteredTopics.find((c) => c.id === caseId);
    return match?.topic?.trim() || "";
  })();

  const generateCase = async () => {
    if (!selectedTopic) {
      alert("Please select a valid case or enter a custom topic");
      return;
    }
    setLoading(true);
    setCaseData({ fullText: "" });
    try {
      const res = await fetch(`${API_BASE}/api/dialog`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: selectedTopic,
          language: getLanguage(),
          area,
          model,
        }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setCaseData({
        fullText:
          typeof data.aiReply === "string"
            ? data.aiReply
            : data.aiReply?.text || "⚠️ No case data",
      });
    } catch (err) {
      console.error(err);
      setCaseData({ fullText: "⚠️ Error generating case" });
    }
    setLoading(false);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">🧠 Generate Patient History</h1>

      <div className="mb-2">
        <label className="mr-2">Custom topic/disease:</label>
        <input
          value={customTopic}
          onChange={(e) => setCustomTopic(e.target.value)}
          placeholder="e.g. Sepsis"
          className="p-2 border rounded ml-2"
        />
      </div>

      <div className="mb-2">
        <label>Choose area:</label>
        <select
          value={area}
          onChange={(e) => {
            setArea(e.target.value);
            setCategory("");
            setCaseId("");
          }}
          className="p-2 rounded border ml-2"
        >
          <option value="">-- Select area --</option>
          <option value="Medical Fields">Medical Fields</option>
        </select>
      </div>

      <div className="mb-2">
        <label>Language:</label>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className="p-2 rounded border ml-2"
        >
          <option value="en">English</option>
          <option value="da">Danish</option>
          <option value="de">German</option>
          <option value="fr">French</option>
          <option value="es">Spanish</option>
          <option value="it">Italian</option>
          <option value="ar">Arabic</option>
          <option value="tr">Turkish</option>
          <option value="ur">Urdu</option>
          <option value="fa">Farsi</option>
          <option value="hi">Hindi</option>
          <option value="ru">Russian</option>
          <option value="zh">Chinese</option>
          <option value="custom">Other (custom code)</option>
        </select>
        {lang === "custom" && (
          <input
            value={customLang}
            onChange={(e) => setCustomLang(e.target.value)}
            placeholder="ISO code"
            className="p-2 border rounded ml-2"
          />
        )}
      </div>

      <div className="mb-2">
        <label>Model:</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="p-2 rounded border ml-2"
        >
          <option value="gpt-4o-mini">GPT-4o Mini (default)</option>
          <option value="gpt-4o">GPT-4o (advanced)</option>
          <option value="gpt-4">GPT-4 (expert mode)</option>
        </select>
      </div>

      <div className="mb-2">
        <label>
          <input
            type="checkbox"
            checked={useGamification}
            onChange={() => setUseGamification(!useGamification)}
            className="mr-2"
          />
          Enable gamification (interactive mode)
        </label>
      </div>

      {area && (
        <>
          <div className="mb-2">
            <label>Category:</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="p-2 rounded border ml-2"
            >
              <option value="">Select category</option>
              {categories.map((sc) => (
                <option key={sc}>{sc}</option>
              ))}
            </select>
          </div>

          <div className="mb-2">
            <label>Case:</label>
            <select
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              className="p-2 rounded border ml-2"
              disabled={!category}
            >
              <option value="">Select case</option>
              {filteredTopics.map((c) => (
                <option key={c.id} value={c.id}>
                  {typeof c.topic === "string" ? c.topic : JSON.stringify(c.topic)}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <button
        onClick={generateCase}
        disabled={!selectedTopic || loading}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {loading ? "Generating..." : "🔄 Generate History"}
      </button>

      {caseData.fullText &&
        (useGamification ? (
          <Level2CaseLogic
            text={caseData.fullText}      // ✅ only runs when we have text
            gamify={true}
            caseId={selectedTopic}
            model={model}
          />
        ) : (
          <div className="mt-4 whitespace-pre-line border p-4 bg-white rounded shadow">
            {caseData.fullText}
          </div>
        ))}
    </div>
  );
}
