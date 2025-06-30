import React, { useState, useEffect } from "react";

const API_BASE = "https://medplat-backend-139218747785.europe-west1.run.app";

export default function CaseView() {
  const [area, setArea] = useState("EM");
  const [topics, setTopics] = useState([]);
  const [category, setCategory] = useState("");
  const [caseId, setCaseId] = useState("");
  const [niveau, setNiveau] = useState("kompleks");
  const [lang, setLang] = useState("da");
  const [customLang, setCustomLang] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [caseData, setCaseData] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/topics?area=${area}`)
      .then(res => res.json())
      .then(data => setTopics(Array.isArray(data) ? data : []))
      .catch(() => setTopics([]));
  }, [area]);

  const safeTopics = Array.isArray(topics) ? topics : [];

  const emTopics = safeTopics.filter(t => t.category === "Emergency Medicine");
  const emCategories = [...new Set(emTopics.map(t => t.subcategory))].filter(Boolean);
  const emCases = emTopics.filter(t => t.subcategory === category).map(t => ({ id: t.id, topic: t.topic }));
  const specTopics = safeTopics.filter(t => t.category !== "Emergency Medicine");
  const specCategories = [...new Set(specTopics.map(t => t.category))].filter(Boolean);
  const specCases = specTopics.filter(t => t.category === category).map(t => ({ id: t.id, topic: t.topic }));

  const languageOptions = [
    { value: "da", label: "Dansk" },
    { value: "en", label: "English" },
    { value: "fa", label: "Farsi" },
    { value: "ar", label: "Arabic" },
    { value: "ur", label: "Urdu" },
    { value: "es", label: "Spanish" },
    { value: "de", label: "German" },
    { value: "custom", label: "Other language..." }
  ];

  const getLanguage = () => {
    if (lang !== "custom") return lang;
    const trimmed = customLang.trim().toLowerCase();
    return /^[a-z]{2}$/.test(trimmed) ? trimmed : "en";
  };

  const selectedTopic = customTopic || (area === "EM"
    ? emCases.find(c => c.id === caseId)?.topic
    : specCases.find(c => c.id === caseId)?.topic) || "";

  const generateCase = async () => {
    if (!selectedTopic) {
      alert("Please select a valid case or enter a custom topic");
      return;
    }

    setLoading(true);
    setCaseData({});
    try {
      const res = await fetch(`${API_BASE}/api/dialog`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: selectedTopic,
          niveau: niveau,
          lang: getLanguage()
        }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      const parsed = typeof data.aiReply === "string" ? JSON.parse(data.aiReply) : data.aiReply;
      setCaseData(parsed || {});
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">🧠 Generate Patient History</h1>
      <div className="mb-2">
        <label className="mr-2">Custom topic/disease:</label>
        <input value={customTopic} onChange={e => setCustomTopic(e.target.value)}
          placeholder="e.g. Sepsis" className="p-2 border rounded ml-2" />
      </div>
      <div className="mb-2">
        <label>Område:</label>
        <select value={area} onChange={e => { setArea(e.target.value); setCategory(""); setCaseId(""); }}
          className="p-2 rounded border ml-2">
          <option value="EM">Emergency Medicine</option>
          <option value="specials">Other Specialties</option>
        </select>
      </div>
      <div className="mb-2">
        <label>Language:</label>
        <select value={lang} onChange={e => setLang(e.target.value)} className="p-2 rounded border ml-2">
          {languageOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        {lang === "custom" && (
          <input value={customLang} onChange={e => setCustomLang(e.target.value)}
            placeholder="ISO code" className="p-2 border rounded ml-2" />
        )}
      </div>
      {area === "EM" && <>
        <div className="mb-2">
          <label>Subkategori:</label>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="p-2 rounded border ml-2">
            <option value="">Vælg subkategori</option>
            {emCategories.map(sc => <option key={sc}>{sc}</option>)}
          </select>
        </div>
        <div className="mb-2">
          <label>Case:</label>
          <select value={caseId} onChange={e => setCaseId(e.target.value)}
            className="p-2 rounded border ml-2" disabled={!category}>
            <option value="">Vælg case</option>
            {emCases.map(c => <option key={c.id} value={c.id}>{c.topic}</option>)}
          </select>
        </div>
      </>}
      {area === "specials" && <>
        <div className="mb-2">
          <label>Kategori:</label>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="p-2 rounded border ml-2">
            <option value="">Vælg kategori</option>
            {specCategories.map(sc => <option key={sc}>{sc}</option>)}
          </select>
        </div>
        <div className="mb-2">
          <label>Case:</label>
          <select value={caseId} onChange={e => setCaseId(e.target.value)}
            className="p-2 rounded border ml-2" disabled={!category}>
            <option value="">Vælg case</option>
            {specCases.map(c => <option key={c.id} value={c.id}>{c.topic}</option>)}
          </select>
        </div>
      </>}
      <div className="mb-2">
        <label>Niveau:</label>
        <select value={niveau} onChange={e => setNiveau(e.target.value)}
          className="p-2 rounded border ml-2">
          <option value="kompleks">Complex</option>
          <option value="simpel">Simple</option>
        </select>
      </div>
      <button onClick={generateCase} disabled={!selectedTopic || loading}
        className="bg-blue-600 text-white px-4 py-2 rounded">
        {loading ? "Generating..." : "🔄 Generate History"}
      </button>
      {caseData.history && (
        <div className="mt-4 bg-gray-100 p-4 rounded whitespace-pre-wrap">
          <h2>Anamnese</h2><p>{caseData.history}</p>
          <h2>Objective</h2><p>{caseData.objective}</p>
          <h2>Paraclinic</h2><ul>{caseData.paraclinic?.map((it,i)=><li key={i}>{it}</li>)}</ul>
          <h2>Differential Diagnoser</h2><ul>{caseData.diff_diag?.map((it,i)=><li key={i}>{it}</li>)}</ul>
          <h2>Diagnose</h2><p>{caseData.diagnose}</p>
          <h2>Behandling</h2><p>{caseData.treatment}</p>
          <h2>Konklusion</h2><p>{caseData.conclusion}</p>
        </div>
      )}
    </div>
  );
}
