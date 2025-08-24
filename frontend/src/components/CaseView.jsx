// ~/medplat/frontend/src/components/CaseView.jsx
import React, { useState, useEffect, useRef } from "react";
import Level2CaseLogic from "./Level2CaseLogic";
import { Save, Copy, Share2, FileDown } from "lucide-react";
import jsPDF from "jspdf";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://super-zebra-g46xvpxqjrv5cwqg4-8080.app.github.dev";

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

  // 🌍 location (auto + manual override)
  const [userLocation, setUserLocation] = useState("unspecified");
  const [manualRegion, setManualRegion] = useState("");

  const caseRef = useRef(null);

  // detect approximate location from IP
  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then((res) => res.json())
      .then((d) => {
        if (d?.country_name) setUserLocation(d.country_name);
        else if (d?.country) setUserLocation(d.country);
        else if (d?.ip) setUserLocation(`ip:${d.ip}`);
      })
      .catch(() => setUserLocation("unspecified"));
  }, []);

  // load categories
  useEffect(() => {
    fetch(`${API_BASE}/api/topics/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then((res) => res.json())
      .then((data) => setAreas((data.categories || []).sort()))
      .catch(() => setAreas([]));
  }, []);

  // load topics
  useEffect(() => {
    if (!area) return;
    fetch(`${API_BASE}/api/topics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ area }),
    })
      .then((res) => res.json())
      .then((data) => setTopics(data.topics || []))
      .catch(() => setTopics([]));
  }, [area]);

  const getLanguage = () => {
    if (lang !== "custom") return lang;
    return /^[a-z]{2}$/.test(customLang.trim()) ? customLang.trim() : "en";
  };

  const getEffectiveRegion = () => manualRegion || userLocation || "global";

  const generateCase = async () => {
    const chosenTopic = customTopic.trim() || topic;
    if (!chosenTopic) return alert("Please select or enter a topic");

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
          language: getLanguage(),
          model,
          gamify,
          userLocation: getEffectiveRegion(), // ✅ send final region
        }),
      });
      const data = await res.json();
      setCaseData(data?.aiReply?.json || data?.aiReply || {});
    } catch (err) {
      console.error("❌ Error generating case:", err);
    }
    setLoading(false);
  };

  const saveCase = async () => {
    if (!caseData) return;
    try {
      await fetch(`${API_BASE}/api/cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(caseData),
      });
      alert("✅ Case saved to My Cases");
    } catch {
      alert("⚠️ Failed to save case");
    }
  };

  const copyToClipboard = () => {
    if (!caseRef.current) return;
    navigator.clipboard.writeText(caseRef.current.innerText);
    alert("📋 Case copied to clipboard!");
  };

  const downloadPDF = () => {
    if (!caseRef.current) return;
    const doc = new jsPDF("p", "pt", "a4");
    doc.setFontSize(12);
    doc.text(doc.splitTextToSize(caseRef.current.innerText, 500), 40, 40);
    doc.save("case.pdf");
  };

  // ---------- Expert Panel Renderer ----------
  const renderPanelConsensus = (panel) => {
    if (!panel) return null;
    let parsed = panel;
    if (typeof panel === "string") {
      try {
        parsed = JSON.parse(panel);
      } catch {
        return <p>{panel}</p>;
      }
    }
    const members = Array.isArray(parsed?.Members) ? parsed.Members : [];
    const summary = parsed?.Consensus || parsed?.Summary;

    return (
      <div className="mt-4">
        <h3 className="text-lg font-semibold">👩‍⚕️ Expert Panel Consensus</h3>
        <div className="space-y-2 mt-2">
          {members.map((m, i) => (
            <div key={i} className="p-2 border rounded-lg bg-gray-50 shadow-sm">
              <p className="font-semibold">{m.Role || `Expert ${i + 1}`}:</p>
              <p className="text-sm whitespace-pre-line">{m.Comment || ""}</p>
            </div>
          ))}
        </div>
        {summary && (
          <div className="mt-3 p-3 border-l-4 border-blue-500 bg-blue-50 rounded">
            <p className="font-semibold">Final Consensus:</p>
            <p className="whitespace-pre-line">{summary}</p>
          </div>
        )}
      </div>
    );
  };

  // ---------- Narrative Renderer ----------
  const renderBookCase = (c) => {
    if (!c) return null;

    const fmtList = (obj) =>
      obj && typeof obj === "object"
        ? Object.entries(obj)
            .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
            .join(", ")
        : String(obj || "");

    const history = fmtList(c.Patient_History);
    const findings = fmtList(c.Objective_Findings);
    const investigations = fmtList(c.Paraclinical_Investigations);

    const differentials = Array.isArray(c.Differential_Diagnoses)
      ? c.Differential_Diagnoses.map((d) => {
          let str = d.Diagnosis || d;
          if (d.Why_Fits) str += ` — fits: ${d.Why_Fits}`;
          if (d.Why_Less_Likely) str += ` — less likely: ${d.Why_Less_Likely}`;
          if (d.Red_Flags)
            str += ` 🚩 (${Array.isArray(d.Red_Flags) ? d.Red_Flags.join(", ") : d.Red_Flags})`;
          return str;
        })
      : [];

    const management = fmtList(c.Management);
    const references = Array.isArray(c.Evidence_and_References)
      ? c.Evidence_and_References.map((r, i) => `[${i + 1}] ${r}`).join("\n")
      : String(c.Evidence_and_References || c.References || "");

    return (
      <div className="space-y-4 leading-relaxed" ref={caseRef}>
        <h2 className="text-xl font-semibold">📖 Case: {c.Topic}</h2>

        {/* 🌍 Guideline badge */}
        {c.meta?.region && (
          <p className="text-sm text-gray-600 italic">
            🌍 Guidelines applied: {c.meta.region}
          </p>
        )}

        {history && <p><b>History:</b> {history.replace(/, /g, ". ")}.</p>}

        {findings && (
          <p>
            <b>Examination:</b> On assessment, {findings.replace(/, /g, ". ")}.
            {c.Objective_Findings?.References && (
              <span className="block text-xs text-gray-500">
                📚 {c.Objective_Findings.References.join("; ")}
              </span>
            )}
          </p>
        )}

        {investigations && (
          <p>
            <b>Investigations:</b> {investigations.replace(/, /g, ". ")}.
            {c.Paraclinical_Investigations?.References && (
              <span className="block text-xs text-gray-500">
                📚 {c.Paraclinical_Investigations.References.join("; ")}
              </span>
            )}
          </p>
        )}

        {differentials.length > 0 && (
          <p>
            <b>Differential Diagnoses:</b>{" "}
            {differentials.map((d, i) => (
              <span key={i}>
                {d}
                {i < differentials.length - 1 ? "; " : ""}
              </span>
            ))}
            {c.Differential_Diagnoses?.References && (
              <span className="block text-xs text-gray-500">
                📚 {c.Differential_Diagnoses.References.join("; ")}
              </span>
            )}
          </p>
        )}

        {c.Provisional_Diagnosis?.Diagnosis && (
          <p>
            <b>Provisional Diagnosis:</b> {c.Provisional_Diagnosis.Diagnosis}
          </p>
        )}

        <p>
          <b>Final Diagnosis:</b>{" "}
          {c.Final_Diagnosis?.Diagnosis
            ? `The final diagnosis was ${c.Final_Diagnosis.Diagnosis}.`
            : "No confirmed final diagnosis."}
        </p>

        {management && (
          <p>
            <b>Management:</b> The treatment plan included: {management}.
            {c.Management?.References && (
              <span className="block text-xs text-gray-500">
                📚 {c.Management.References.join("; ")}
              </span>
            )}
          </p>
        )}

        {c.Expert_Panel_Consensus && renderPanelConsensus(c.Expert_Panel_Consensus)}

        {c.Conclusion?.Summary && <p><b>Conclusion:</b> {c.Conclusion.Summary}</p>}

        {references && (
          <p>
            <b>Global References:</b><br />
            <span className="whitespace-pre-line">{references}</span>
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">�� MedPlat Case Generator</h1>

      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        <select value={area} onChange={(e) => setArea(e.target.value)} className="border p-2 rounded">
          <option value="">Choose area</option>
          {areas.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <select value={topic} onChange={(e) => setTopic(e.target.value)} className="border p-2 rounded">
          <option value="">Choose topic</option>
          {topics.map((t) => (
            <option key={t.id} value={t.topic}>{t.topic}</option>
          ))}
        </select>

        <input type="text" value={customTopic} onChange={(e) => setCustomTopic(e.target.value)} placeholder="Custom search" className="border p-2 rounded w-64" />

        <select value={lang} onChange={(e) => setLang(e.target.value)} className="border p-2 rounded">
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
          <input type="text" value={customLang} onChange={(e) => setCustomLang(e.target.value)} placeholder="ISO code (e.g. fr)" className="border p-2 rounded" />
        )}

        <select value={model} onChange={(e) => setModel(e.target.value)} className="border p-2 rounded">
          <option value="gpt-4o-mini">GPT-4o-mini</option>
          <option value="gpt-4o">GPT-4o</option>
          <option value="gpt-4">GPT-4</option>
        </select>

        {/* ✅ Manual region override */}
        <select
          value={manualRegion}
          onChange={(e) => setManualRegion(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Auto ({userLocation})</option>
          <option value="Denmark">Denmark</option>
          <option value="United States">United States</option>
          <option value="United Kingdom">United Kingdom</option>
          <option value="Germany">Germany</option>
          <option value="WHO">WHO (global)</option>
        </select>

        <label className="flex items-center gap-1">
          <input type="checkbox" checked={gamify} onChange={(e) => setGamify(e.target.checked)} /> Gamify
        </label>

        <button onClick={generateCase} disabled={loading || (!topic && !customTopic)} className="bg-blue-600 text-white px-4 py-2 rounded">
          {loading ? "Generating..." : "Generate Case"}
        </button>
      </div>

      {/* Case rendering */}
      {caseData && gamify && <Level2CaseLogic caseData={caseData} />}
      {caseData && !gamify && renderBookCase(caseData)}

      {/* Actions */}
      {caseData && (
        <div className="flex gap-2 mt-4">
          <button onClick={saveCase} className="px-3 py-1 bg-green-200 rounded text-sm">
            <Save size={16} /> Save
          </button>
          <button onClick={copyToClipboard} className="px-3 py-1 bg-gray-200 rounded text-sm">
            <Copy size={16} /> Copy
          </button>
          <button onClick={downloadPDF} className="px-3 py-1 bg-gray-200 rounded text-sm">
            <FileDown size={16} /> PDF
          </button>
          <button onClick={() => alert("🔗 Share link feature coming soon!")} className="px-3 py-1 bg-gray-200 rounded text-sm">
            <Share2 size={16} /> Share
          </button>
        </div>
      )}
    </div>
  );
}
