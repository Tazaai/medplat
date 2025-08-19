import React, { useState, useEffect } from "react";
import GeneratedCase from "./GeneratedCase";
import Level2CaseLogic from "./Level2CaseLogic";

const API_BASE = "https://medplat-backend-139218747785.europe-west1.run.app";

export default function CaseView() {
  const [area, setArea] = useState("EM");
  const [topics, setTopics] = useState([]);
  const [category, setCategory] = useState("");
  const [caseId, setCaseId] = useState("");
  const [lang, setLang] = useState("en");
  const [customLang, setCustomLang] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [caseData, setCaseData] = useState({ fullText: "" });
  const [loading, setLoading] = useState(false);
  const [showFullCase, setShowFullCase] = useState(false);
  const [useGamification, setUseGamification] = useState(true);
  const [level, setLevel] = useState(1);

  useEffect(() => {
    const selectedArea = area === "EM" ? "Emergency Medicine" : "Other Specialties";
    fetch(`${API_BASE}/api/topics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ area: selectedArea })
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data?.topics)) {
          const enriched = data.topics.map((topic, i) => ({
            id: `case_${i + 1}`,
            topic: topic.topic,
            category: topic.category || selectedArea,
            subcategory: topic.subcategory || ""
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

  const emTopics = safeTopics.filter(t => t.category === "Emergency Medicine");
  const emCategories = [...new Set(emTopics.map(t => t.subcategory))].filter(Boolean);
  const emCases = emTopics.filter(t => t.subcategory === category);

  const specTopics = safeTopics.filter(t => t.category !== "Emergency Medicine");
  const specCategories = [...new Set(specTopics.map(t => t.category))].filter(Boolean);
  const specCases = specTopics.filter(t => t.category === category);

  const selectedTopic =
    customTopic ||
    (area === "EM"
      ? emCases.find(c => c.id === caseId)?.topic
      : specCases.find(c => c.id === caseId)?.topic) || "";

  const generateCase = async () => {
    if (!selectedTopic) {
      alert("Please select a valid case or enter a custom topic");
      return;
    }

    setLoading(true);
    setCaseData({ fullText: "" });
    setShowFullCase(!useGamification);

    try {
      const res = await fetch(`${API_BASE}/api/dialog`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: selectedTopic,
          language: getLanguage(),
          area: area === "EM" ? "Emergency Medicine" : "Other Specialties"
        })
      });

      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      const parsed = typeof data.aiReply === "string" ? JSON.parse(data.aiReply || "{}") : data.aiReply;
      setCaseData({ fullText: parsed?.text || parsed || "⚠️ No data returned" });
    } catch (err) {
      console.error(err);
      setCaseData({ fullText: "⚠️ Error generating case." });
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
          onChange={e => setCustomTopic(e.target.value)}
          placeholder="e.g. Sepsis"
          className="p-2 border rounded ml-2"
        />
      </div>

      <div className="mb-2">
        <label>Area:</label>
        <select
          value={area}
          onChange={e => {
            setArea(e.target.value);
            setCategory("");
            setCaseId("");
          }}
          className="p-2 rounded border ml-2"
        >
          <option value="EM">Emergency Medicine</option>
          <option value="specials">Other Specialties</option>
        </select>
      </div>

      <div className="mb-2">
        <label>Language:</label>
        <select value={lang} onChange={e => setLang(e.target.value)} className="p-2 rounded border ml-2">
          {[{ value: "en", label: "English" },
            { value: "da", label: "Dansk" },
            { value: "fa", label: "Farsi" },
            { value: "ar", label: "Arabic" },
            { value: "ur", label: "Urdu" },
            { value: "es", label: "Spanish" },
            { value: "de", label: "German" },
            { value: "custom", label: "Other language..." }
          ].map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {lang === "custom" && (
          <input
            value={customLang}
            onChange={e => setCustomLang(e.target.value)}
            placeholder="ISO code"
            className="p-2 border rounded ml-2"
          />
        )}
      </div>

      <div className="mb-2">
        <label>
          <input
            type="checkbox"
            checked={useGamification}
            onChange={() => setUseGamification(!useGamification)}
            className="mr-2"
          />
          Enable gamification (progressive reveal)
        </label>
      </div>

      <div className="mb-2">
        <label>Level:</label>
        <select
          value={level}
          onChange={e => setLevel(Number(e.target.value))}
          className="p-2 rounded border ml-2"
        >
          <option value={1}>Level 1 (Basic Reasoning)</option>
          <option value={2}>Level 2 (Advanced Logic)</option>
          <option value={3}>Level 3 (Challenge Mode 🔒)</option>
        </select>
      </div>

      {(area === "EM" || area === "specials") && (
        <>
          <div className="mb-2">
            <label>{area === "EM" ? "Subcategory:" : "Category:"}</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="p-2 rounded border ml-2"
            >
              <option value="">Select {area === "EM" ? "subcategory" : "category"}</option>
              {(area === "EM" ? emCategories : specCategories).map(sc => (
                <option key={sc}>{sc}</option>
              ))}
            </select>
          </div>

          <div className="mb-2">
            <label>Case:</label>
            <select
              value={caseId}
              onChange={e => setCaseId(e.target.value)}
              className="p-2 rounded border ml-2"
              disabled={!category}
            >
              <option value="">Select case</option>
              {(area === "EM" ? emCases : specCases).map(c => (
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

      {caseData.fullText && level === 1 && (
        <GeneratedCase
          text={caseData.fullText}
          language={getLanguage()}
          gamify={useGamification}
          showFull={showFullCase}
          onShowFull={() => setShowFullCase(true)}
        />
      )}

      {caseData.fullText && level === 2 && (
        useGamification ? (
          <Level2CaseLogic text={caseData.fullText} />
        ) : (
          <div className="mt-6 whitespace-pre-wrap leading-relaxed p-4 border rounded bg-gray-50">
            {caseData.fullText}
          </div>
        )
      )}

      {caseData.fullText && level === 3 && (
        useGamification ? (
          <div className="mt-4 p-4 border rounded bg-yellow-100 text-yellow-900">
            🧠 Level 3 Challenge Mode is coming soon...
          </div>
        ) : (
          <div className="mt-6 whitespace-pre-wrap leading-relaxed p-4 border rounded bg-gray-50">
            {caseData.fullText}
          </div>
        )
      )}
    </div>
  );
}
