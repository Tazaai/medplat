// ~/medplat/frontend/src/components/CaseView.jsx
import React, { useState, useEffect } from "react";
import Level2CaseLogic from "./Level2CaseLogic";
import {
  User,
  HeartPulse,
  FlaskRound,
  Stethoscope,
  Activity,
  ClipboardList,
  BookOpen,
  GraduationCap,
  CheckCircle2,
  FileText,
  Users,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  Timeline,
  Save,
  Globe,
} from "lucide-react";

const API_BASE = "https://super-zebra-g46xvpxqjrv5cwqg4-8080.app.github.dev";

// Dynamic role → icon
const roleIcons = {
  Student: "🧑‍🎓",
  JuniorDoctor: "🧑‍⚕️",
  GP: "👨‍⚕️",
  Emergency: "🏥",
  Specialist: "👩‍⚕️",
  Professor: "👨‍🏫",
  Researcher: "🔬",
};

// Assign roles based on specialty (dynamic)
function getPanelRoles(area) {
  if (!area) return ["Student", "JuniorDoctor", "Professor"];
  if (area.includes("Cardio")) return ["Cardiologist", "GP", "Emergency", "Professor"];
  if (area.includes("Neuro")) return ["Neurologist", "GP", "Researcher", "Professor"];
  if (area.includes("Infect")) return ["ID Specialist", "Microbiologist", "Emergency", "Researcher"];
  return ["Student", "GP", "Specialist", "Professor", "Researcher"];
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
  const [expandAll, setExpandAll] = useState(false);
  const [timelineMode, setTimelineMode] = useState(false);
  const [guidelineSource, setGuidelineSource] = useState("global");

  // load categories (areas) – sorted alphabetically
  useEffect(() => {
    fetch(`${API_BASE}/api/topics/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then((res) => res.json())
      .then((data) => {
        const cats = data.categories || [];
        setAreas(cats.sort((a, b) => a.localeCompare(b)));
      })
      .catch(() => setAreas([]));
  }, []);

  // load topics for selected area
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
          language: getLanguage(),
          model,
          gamify,
        }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();

      if (data?.aiReply?.json) {
        setCaseData(data.aiReply.json);
      } else if (data?.aiReply) {
        setCaseData(data.aiReply);
      } else {
        setCaseData({});
      }
    } catch (err) {
      console.error(err);
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
      alert("Case saved to My Cases ✅");
    } catch {
      alert("⚠️ Failed to save case");
    }
  };

  // ✅ Collapsible section
  const Section = ({ icon: Icon, title, children, defaultOpen = false }) => {
    const [open, setOpen] = useState(defaultOpen);
    useEffect(() => {
      setOpen(expandAll);
    }, [expandAll]);
    return (
      <div className="bg-white shadow rounded-2xl">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center justify-between w-full p-4 border-b"
        >
          <span className="flex items-center gap-2 font-bold text-lg">
            <Icon className="w-5 h-5 text-blue-600" /> {title}
          </span>
          <span className="text-gray-500">{open ? "−" : "+"}</span>
        </button>
        {open && <div className="p-4 text-sm space-y-2">{children}</div>}
      </div>
    );
  };

  // ✅ Consensus heatmap
  const ConsensusMeter = ({ agreements = 0, disagreements = 0 }) => {
    const total = agreements + disagreements;
    const percentAgree = total ? Math.round((agreements / total) * 100) : 0;
    return (
      <div className="w-full bg-gray-200 rounded h-3 overflow-hidden">
        <div
          className={`h-3 ${percentAgree > 70 ? "bg-green-500" : percentAgree > 40 ? "bg-yellow-500" : "bg-red-500"}`}
          style={{ width: `${percentAgree}%` }}
        ></div>
      </div>
    );
  };

  // ✅ References Tabs
  const ReferencesTabs = ({ refs }) => {
    const [tab, setTab] = useState("guidelines");
    if (!refs) return null;

    const grouped = {
      guidelines: refs.filter((r) => /NICE|WHO|guideline|Sundhedsstyrelsen/i.test(r)),
      research: refs.filter((r) => /PubMed|study|trial/i.test(r)),
      textbooks: refs.filter((r) => /Harrison|Oxford|book/i.test(r)),
      other: refs.filter(
        (r) => !/NICE|WHO|guideline|Sundhedsstyrelsen|PubMed|study|trial|Harrison|Oxford|book/i.test(r)
      ),
    };

    const categories = ["guidelines", "research", "textbooks", "other"];

    return (
      <div>
        <div className="flex gap-2 border-b pb-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setTab(c)}
              className={`px-3 py-1 rounded ${tab === c ? "bg-blue-600 text-white" : "bg-gray-200"}`}
            >
              {c}
            </button>
          ))}
        </div>
        <ul className="list-disc ml-5 mt-2">
          {grouped[tab].map((r, i) => (
            <li key={i}>
              {r.includes("http") ? (
                <a href={r} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                  {r}
                </a>
              ) : (
                r
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // ✅ Atypical presentations
  const AtypicalCards = ({ atypical }) => {
    if (!atypical) return null;
    const groups = {
      Elderly: "bg-gray-100",
      Pregnant: "bg-pink-100",
      Pediatric: "bg-blue-100",
      Immunocompromised: "bg-green-100",
    };
    return (
      <div className="grid gap-3">
        {Object.entries(atypical).map(([k, v]) => (
          <div key={k} className={`p-3 rounded ${groups[k] || "bg-gray-50"}`}>
            <b>{k}:</b> {v}
          </div>
        ))}
      </div>
    );
  };

  // ✅ Renderer
  const renderCase = (c) => {
    if (!c) return null;
    if (timelineMode) {
      return (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">🕒 Case Timeline</h2>
          <p>Patient arrives → History → Findings → Investigations → Differential → Management → Conclusion</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">📋 Case: {c.Topic}</h2>
          <div className="flex gap-2">
            <button onClick={() => setExpandAll(!expandAll)} className="px-3 py-1 bg-gray-200 rounded text-sm">
              {expandAll ? "Collapse All" : "Expand All"}
            </button>
            <button onClick={() => setTimelineMode(!timelineMode)} className="px-3 py-1 bg-gray-200 rounded text-sm">
              <Timeline size={16} /> {timelineMode ? "Section Mode" : "Timeline Mode"}
            </button>
            <button onClick={saveCase} className="px-3 py-1 bg-green-200 rounded text-sm">
              <Save size={16} /> Save
            </button>
            <button onClick={() => window.print()} className="px-3 py-1 bg-gray-200 rounded text-sm">
              🖨️ Export/Print
            </button>
          </div>
        </div>

        <Section icon={User} title="Patient History" defaultOpen>
          <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(c.Patient_History, null, 2)}</pre>
        </Section>

        <Section icon={Stethoscope} title="Objective Findings">
          <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(c.Objective_Findings, null, 2)}</pre>
        </Section>

        <Section icon={FlaskRound} title="Paraclinical Investigations">
          <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(c.Paraclinical_Investigations, null, 2)}</pre>
        </Section>

        <Section icon={ClipboardList} title="Differential Diagnoses">
          <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(c.Differential_Diagnoses, null, 2)}</pre>
        </Section>

        <Section icon={CheckCircle2} title="Final Diagnosis" defaultOpen>
          <p className="text-lg font-bold">{c.Final_Diagnosis?.Name}</p>
          <p className="italic">{c.Final_Diagnosis?.Reasoning}</p>
        </Section>

        <Section icon={Activity} title="Management">
          <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(c.Management, null, 2)}</pre>
          <p className="text-xs text-gray-500">Guideline Source: {guidelineSource}</p>
          <div className="flex gap-2 mt-2">
            {["local", "national", "regional", "global"].map((src) => (
              <button
                key={src}
                onClick={() => setGuidelineSource(src)}
                className={`px-2 py-1 rounded text-sm ${
                  guidelineSource === src ? "bg-blue-600 text-white" : "bg-gray-200"
                }`}
              >
                <Globe size={14} className="inline" /> {src}
              </button>
            ))}
          </div>
        </Section>

        <Section icon={Users} title="Teaching & Panel Debate">
          {c.Teaching_and_Reasoning_Panel?.Panel_Debate?.map((p, i) => (
            <div key={i} className="p-2 border rounded flex gap-2 items-start">
              <span className="text-xl">{roleIcons[p.Role] || "👤"}</span>
              <div>
                <p>
                  <b>{p.Role}:</b> {p.Comment}
                </p>
              </div>
            </div>
          ))}
          <ConsensusMeter
            agreements={c.Teaching_and_Reasoning_Panel?.Agreements?.length || 0}
            disagreements={c.Teaching_and_Reasoning_Panel?.Disagreements?.length || 0}
          />
        </Section>

        <Section icon={Lightbulb} title="Teaching Pearls & Mnemonics">
          <ul className="list-disc ml-5 text-blue-700">
            {c.Teaching_and_Reasoning_Panel?.Expert_Pearls && <li>{c.Teaching_and_Reasoning_Panel.Expert_Pearls}</li>}
            {c.Teaching_and_Reasoning_Panel?.Mnemonics && <li>{c.Teaching_and_Reasoning_Panel.Mnemonics}</li>}
          </ul>
        </Section>

        <Section icon={BookOpen} title="Conclusion" defaultOpen>
          <p className="text-green-700 font-semibold">{c.Conclusion?.Summary}</p>
          <p className="italic">{c.Conclusion?.Recommendation}</p>
        </Section>

        <Section icon={FileText} title="Evidence & References">
          <ReferencesTabs refs={c.Evidence_and_References?.References || []} />
        </Section>

        <Section icon={BookOpen} title="Atypical Presentations">
          <AtypicalCards atypical={c.Atypical_Presentations} />
        </Section>
      </div>
    );
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">🩺 MedPlat Case Generator</h1>

      {/* Controls */}
      <div className="flex flex-wrap gap-2">
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

        <input
          type="text"
          value={customTopic}
          onChange={(e) => setCustomTopic(e.target.value)}
          placeholder="Custom search (e.g. IBD in pregnancy)"
          className="border p-2 rounded w-64"
        />

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
          <input
            type="text"
            value={customLang}
            onChange={(e) => setCustomLang(e.target.value)}
            placeholder="ISO code (e.g. fr)"
            className="border p-2 rounded"
          />
        )}

        <select value={model} onChange={(e) => setModel(e.target.value)} className="border p-2 rounded">
          <option value="gpt-4o-mini">GPT-4o-mini (default)</option>
          <option value="gpt-4o">GPT-4o</option>
          <option value="gpt-4">GPT-4</option>
        </select>

        <label className="flex items-center gap-1">
          <input type="checkbox" checked={gamify} onChange={(e) => setGamify(e.target.checked)} />
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
      {caseData && gamify && <Level2CaseLogic caseData={case
