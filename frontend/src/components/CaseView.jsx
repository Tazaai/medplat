// ~/medplat/frontend/src/components/CaseView.jsx
import React, { useState, useEffect, useRef } from "react";
import Level2CaseLogic from "./Level2CaseLogic";
import { Save, Copy, Share2, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { API_BASE } from "../config"; // ✅ centralized

// ✅ helper to flatten GPT sections
function normalizeCaseData(raw) {
  if (!raw) return raw;
  const flattened = { ...raw };
  for (const key of Object.keys(raw)) {
    if (/^[IVXLC]+$/.test(key) && typeof raw[key] === "object") {
      Object.assign(flattened, raw[key]);
    }
  }
  return flattened;
}

// ✅ recursive renderer for objects/arrays
function renderContent(value) {
  if (!value) return <i>Not specified</i>;

  if (Array.isArray(value)) {
    return (
      <ul className="list-disc ml-6 space-y-1">
        {value.map((item, idx) => (
          <li key={idx}>{renderContent(item)}</li>
        ))}
      </ul>
    );
  }

  if (typeof value === "object") {
    return (
      <ul className="list-disc ml-6 space-y-1">
        {Object.entries(value).map(([k, v], idx) => (
          <li key={idx}>
            <strong>{k.replace(/_/g, " ")}:</strong> {renderContent(v)}
          </li>
        ))}
      </ul>
    );
  }

  return <span>{String(value)}</span>;
}

// ✅ subcomponent: single chart with local toggle
function ChartBlock({ chart }) {
  const [view, setView] = useState("graph");

  if (!chart) return null;

  return (
    <div className="space-y-2 border rounded p-2 bg-white shadow">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold">Chart</h4>
        <button
          onClick={() => setView(view === "graph" ? "table" : "graph")}
          className="px-2 py-1 bg-gray-200 rounded text-sm"
        >
          Switch to {view === "graph" ? "Table" : "Graph"}
        </button>
      </div>

      {view === "graph" && Array.isArray(chart) ? (
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="Time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="Value" stroke="#2563eb" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : typeof chart === "object" ? (
        <table className="table-auto border-collapse border border-gray-400 text-sm w-full">
          <tbody>
            {Object.entries(chart).map(([k, v], i) => (
              <tr key={i}>
                <td className="border px-2 py-1 font-semibold">{k}</td>
                <td className="border px-2 py-1">{String(v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>{String(chart)}</p>
      )}
    </div>
  );
}

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

  const [userLocation, setUserLocation] = useState("unspecified");
  const [manualRegion, setManualRegion] = useState("");

  const caseRef = useRef(null);

  // 🌍 detect location
  useEffect(() => {
    fetch(`${API_BASE}/api/location`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
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
          userLocation: getEffectiveRegion(),
        }),
      });
      const data = await res.json();
      setCaseData(normalizeCaseData(data?.aiReply?.json || data?.aiReply || {}));
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
  const renderPanel = (panel) => {
    if (!panel) return null;
    let parsed = panel;
    if (typeof panel === "string") {
      try {
        parsed = JSON.parse(panel);
      } catch {
        return <p>{panel}</p>;
      }
    }
    const members = Array.isArray(parsed?.Panel) ? parsed.Panel : [];
    const disagreements = parsed?.Disagreements || [];
    const consensus = parsed?.Final_Consensus;

    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold">👩‍⚕️ Expert Panel & Teaching</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          {members.map((m, i) => (
            <div key={i} className="p-3 border rounded bg-gray-50 shadow-sm">
              <p className="font-semibold">{m.Role}:</p>
              <div className="text-sm">{renderContent(m.Input || m.Comment)}</div>
            </div>
          ))}
        </div>

        {disagreements.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold">⚖️ Debates:</h4>
            <ul className="list-disc ml-6">
              {disagreements.map((d, i) => (
                <li key={i}>
                  <strong>{d.Issue}:</strong>{" "}
                  {d.Opinions?.map((op, j) => (
                    <span key={j}>
                      {op.Role}: {op.View}
                      {j < d.Opinions.length - 1 ? " | " : ""}
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          </div>
        )}

        {consensus && (
          <div className="mt-4 p-3 border-l-4 border-blue-600 bg-blue-50 rounded">
            <p className="font-semibold">Final Consensus:</p>
            <p>{consensus}</p>
          </div>
        )}
      </div>
    );
  };

  // ---------- Narrative Renderer ----------
  const renderBookCase = (c) => {
    if (!c) return null;

    const references = Array.isArray(c.Evidence_and_References)
      ? c.Evidence_and_References.map((r, i) =>
          r.startsWith("http") ? (
            <a
              key={i}
              href={r}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline"
            >
              [{i + 1}] {r}
            </a>
          ) : (
            <span key={i}>[{i + 1}] {r}</span>
          )
        )
      : String(c.Evidence_and_References || c.References || "");

    const chartArray = Array.isArray(c.Charts) ? c.Charts : c.Charts ? [c.Charts] : [];

    return (
      <div className="space-y-4 leading-relaxed" ref={caseRef}>
        <h2 className="text-xl font-semibold">📖 Case: {c.Topic}</h2>

        {c.meta?.region && (
          <p className="text-sm text-gray-600 italic">
            🌍 Guidelines applied: {c.meta.region}
          </p>
        )}

        {c.Patient_History && <div><h3>📜 History</h3>{renderContent(c.Patient_History)}</div>}
        {c.Objective_Findings && <div><h3>🩺 Examination</h3>{renderContent(c.Objective_Findings)}</div>}
        {c.Paraclinical_Investigations && <div><h3>🧪 Investigations</h3>{renderContent(c.Paraclinical_Investigations)}</div>}
        {c.Differential_Diagnoses && <div><h3>🔍 Differential Diagnoses</h3>{renderContent(c.Differential_Diagnoses)}</div>}
        {c.Provisional_Diagnosis?.Diagnosis && <p><b>Provisional Diagnosis:</b> {c.Provisional_Diagnosis.Diagnosis}</p>}
        <p><b>Final Diagnosis:</b> {c.Final_Diagnosis?.Diagnosis || "No confirmed final diagnosis."}</p>
        {c.Management && <div><h3>💊 Management</h3>{renderContent(c.Management)}</div>}
        {renderPanel(c.Expert_Panel_and_Teaching)}
        {chartArray.length > 0 && (
          <div>
            <h3>📊 Charts</h3>
            <div className="space-y-4">
              {chartArray.map((chart, idx) => (
                <ChartBlock key={idx} chart={chart} />
              ))}
            </div>
          </div>
        )}
        {c.Conclusion && <div><h3>📌 Conclusion</h3>{renderContent(c.Conclusion)}</div>}
        {references && <div><h3>📚 Global References</h3><div className="space-y-1">{references}</div></div>}
      </div>
    );
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">🩺 MedPlat Case Generator</h1>

      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* area */}
        <select value={area} onChange={(e) => setArea(e.target.value)} className="border p-2 rounded">
          <option value="">Choose area</option>
          {areas.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        {/* topic */}
        <select value={topic} onChange={(e) => setTopic(e.target.value)} className="border p-2 rounded">
          <option value="">Choose topic</option>
          {topics.map((t) => (
            <option key={t.id} value={t.topic}>{t.topic}</option>
          ))}
        </select>

        <input type="text" value={customTopic} onChange={(e) => setCustomTopic(e.target.value)} placeholder="Custom search" className="border p-2 rounded w-64" />

        {/* language */}
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

        {/* model */}
        <select value={model} onChange={(e) => setModel(e.target.value)} className="border p-2 rounded">
          <option value="gpt-4o-mini">GPT-4o-mini</option>
          <option value="gpt-4o">GPT-4o</option>
          <option value="gpt-4">GPT-4</option>
        </select>

        {/* region */}
        <select value={manualRegion} onChange={(e) => setManualRegion(e.target.value)} className="border p-2 rounded">
          <option value="">Auto ({userLocation})</option>
          <option value="Denmark">Denmark</option>
          <option value="United States">United States</option>
          <option value="United Kingdom">United Kingdom</option>
          <option value="Germany">Germany</option>
          <option value="WHO">WHO (global)</option>
        </select>

        {/* gamify */}
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
