// ~/medplat/frontend/src/components/CaseView.jsx
import React, { useState, useEffect, useRef } from "react";
import CategoryCard from "./CategoryCard";
import TopicCard from "./TopicCard";
import Level2CaseLogic from "./Level2CaseLogic";
import CaseDisplay from "./CaseDisplay";
import ProfessionalCaseDisplay from "./ProfessionalCaseDisplay";
import ConferencePanel from "./ConferencePanel";
import MentorTab from "./MentorTab"; // Phase 4 M2: AI Mentor
import CurriculumTab from "./CurriculumTab"; // Phase 4 M3: Curriculum Builder
import AnalyticsDashboard from "./AnalyticsDashboard"; // Phase 4 M4: Analytics & Optimization
import GlobalMentorHub from "./GlobalMentorHub"; // Phase 5: Global AI Mentor Network
import CertificationTab from "./CertificationTab"; // Phase 6 M1: Certification
import LeaderboardTab from "./LeaderboardTab"; // Phase 6 M2: Leaderboard
import ExamPrepTab from "./ExamPrepTab"; // Phase 6 M3: Exam Prep
import AnalyticsDashboardTab from "./AnalyticsDashboardTab"; // Phase 6 M4: Analytics
import SocialTab from "./SocialTab"; // Phase 6 M5: Social Features
import ReasoningTab from "./ReasoningTab"; // Phase 7 M1: AI Reasoning Engine
import LanguageSelector from "./LanguageSelector"; // Phase 7 M2: Multi-Language
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
  // treat null/undefined/empty-string as not specified, but allow 0/false
  if (value == null || value === "") return <i>Not specified</i>;

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
          type="button"
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
  const [step, setStep] = useState(0); // 0: category, 1: topic, 2: controls

  // Category color/icon map (customize as needed)
  const categoryMeta = {
    "Infectious Diseases": { color: "#34d399", icon: "🦠", description: "Infections, outbreaks, and antimicrobials" },
    "Public Health": { color: "#60a5fa", icon: "🌍", description: "Population health, prevention, policy" },
    "Psychiatry": { color: "#f472b6", icon: "🧠", description: "Mental health, wellness, psychiatry" },
    "Radiology": { color: "#a78bfa", icon: "🩻", description: "Imaging, diagnostics, radiology" },
    "Addiction Medicine": { color: "#fbbf24", icon: "💊", description: "Addiction, substance use, harm reduction" },
    "Endocrinology": { color: "#f59e42", icon: "🦋", description: "Hormones, metabolism, endocrinology" },
    "Education": { color: "#38bdf8", icon: "📚", description: "Medical education, teaching, simulation" },
    "Telemedicine": { color: "#818cf8", icon: "💻", description: "Virtual care, telehealth, digital health" },
  };
  const [lang, setLang] = useState("en");
  const [customLang, setCustomLang] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [gamify, setGamify] = useState(true); // Default to gamification mode (faster, cheaper)
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(false);

  const [userLocation, setUserLocation] = useState("unspecified");
  const [manualRegion, setManualRegion] = useState("");
  const [customRegion, setCustomRegion] = useState("");

  const caseRef = useRef(null);

  // Phase 4 M2/M3/M4: Multi-tab state (case | mentor | curriculum | analytics)
  const validTabs = ["case", "mentor", "curriculum", "analytics", "mentor_hub", "certifications", "leaderboard", "exam_prep", "admin_analytics", "social", "reasoning"];
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('medplat_active_tab');
    return validTabs.includes(saved) ? saved : "case";
  });
  const [userUid, setUserUid] = useState("demo_user_001"); // TODO: Get from auth context
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    return localStorage.getItem('medplat_language') || 'en';
  });

  // Listen for tab switch events from child components
  useEffect(() => {
    const handleTabSwitch = (event) => {
      if (event.detail && validTabs.includes(event.detail)) {
        setActiveTab(event.detail);
        localStorage.setItem('medplat_active_tab', event.detail);
      }
    };
    
    window.addEventListener('switchToTab', handleTabSwitch);
    return () => window.removeEventListener('switchToTab', handleTabSwitch);
  }, [validTabs]);

  // Save tab state changes
  useEffect(() => {
    if (validTabs.includes(activeTab)) {
      localStorage.setItem('medplat_active_tab', activeTab);
    }
  }, [activeTab, validTabs]);


  // 🌍 detect location - DISABLED (API not available)
  useEffect(() => {
    // fetch(`${API_BASE}/api/location`)
    //   .then((res) => {
    //     if (!res.ok) throw new Error(res.statusText || 'HTTP error');
    //     return res.json();
    //   })
    //   .then((d) => {
    //     if (d?.country_name) setUserLocation(d.country_name);
    //     else if (d?.country) setUserLocation(d.country);
    //     else if (d?.ip) setUserLocation(`ip:${d.ip}`);
    //   })
    //   .catch(() => setUserLocation("unspecified"));
    setUserLocation("unspecified"); // Default fallback
  }, []);


  // load categories (GET, always sorted, hide placeholders, refresh on area/topic change)
  useEffect(() => {
    fetch(`${API_BASE}/api/topics2/categories`)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText || 'HTTP error');
        return res.json();
      })
      .then((data) => {
        const cats = (data.categories || [])
          .filter(cat => !/placeholder/i.test(cat))
          .sort((a, b) => a.localeCompare(b));
        setAreas(cats);
      })
      .catch(() => setAreas([]));
  }, [area, topic]);

  // load topics (POST, with { category })
  useEffect(() => {
    if (!area) return;
    fetch(`${API_BASE}/api/topics2/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: area }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText || 'HTTP error');
        return res.json();
      })
      .then((data) => setTopics(data.topics || []))
      .catch(() => setTopics([]));
  }, [area]);

  // UI handlers for new card-based flow
  const handleCategorySelect = (cat) => {
    setArea(cat);
    setStep(1);
    setTopic("");
  };
  const handleTopicSelect = (t) => {
    setTopic(t);
    setStep(2);
  };
  const handleBack = () => {
    if (step === 2) setStep(1);
    else if (step === 1) setStep(0);
  };

  const getLanguage = () => {
    if (lang !== "custom") return lang;
    return /^[a-z]{2}$/.test(customLang.trim()) ? customLang.trim() : "en";
  };

  const getEffectiveRegion = () => {
    if (manualRegion === "custom") {
      return customRegion.trim() || "global";
    }
    return manualRegion || userLocation || "global";
  };

  const generateCase = async () => {
    const chosenTopic = customTopic.trim() || topic;
    if (!chosenTopic) {
      alert("Please select or enter a topic");
      return;
    }

    console.info(`🎯 Case generation: gamify=${gamify}`);
    setLoading(true);
    setCaseData(null);
    
    try {
      // 🎯 OPTIMIZATION: If gamify mode, use direct MCQ generation (faster, cheaper - 1 API call instead of 2)
      if (gamify) {
        console.log("🎮 Direct gamification mode - generating MCQs directly");
        
        // Add timeout and abort controller
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        const res = await fetch(`${API_BASE}/api/gamify-direct`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            topic: chosenTopic,
            language: getLanguage(),
            region: getEffectiveRegion(),
            level: "intermediate",
            model,
          }),
        });
        
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText || 'Quiz generation failed'}`);
        }
        
        const data = await res.json();
        console.log("✅ Direct gamification response:", data);
        
        if (!data || !data.ok || !data.mcqs) {
          console.error("❌ No MCQ data in response:", data);
          throw new Error("Backend returned empty quiz data");
        }
        
        // Create minimal case structure to hold the MCQs
        const gamificationCase = {
          meta: {
            topic: chosenTopic,
            language: getLanguage(),
            region: getEffectiveRegion(),
            level: "intermediate",
            model,
            generation_type: 'direct_gamification',
          },
          mcqs: data.mcqs,
          // Minimal case structure for compatibility
          presentation: `Interactive Quiz: ${chosenTopic}`,
          diagnosis: chosenTopic,
        };
        
        console.log("✅ Gamification case created:", gamificationCase);
        setCaseData(gamificationCase);
      } else {
        // 📋 Normal case generation (without gamification)
        console.log("📋 Normal case mode - generating full case");
        const res = await fetch(`${API_BASE}/api/cases`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: chosenTopic,
            language: getLanguage(),
            region: getEffectiveRegion(),
            level: "intermediate",
            model,
          }),
        });
        if (!res.ok) throw new Error(res.statusText || 'Case generation failed');
        const data = await res.json();
        console.log("✅ Case generation response:", data);
        
        if (!data || !data.case) {
          console.error("❌ No case data in response:", data);
          throw new Error("Backend returned empty case data");
        }
        
        const normalizedCase = normalizeCaseData(data.case);
        console.log("✅ Normalized case:", normalizedCase);
        setCaseData(normalizedCase);
      }
      
      // ✅ Internal panel review happens automatically during case generation (invisible to user)
        
    } catch (err) {
      console.error("❌ Error generating content:", err);
      alert(`Failed to generate ${gamify ? 'quiz' : 'case'}: ${err.message}`);
    }
    setLoading(false);
  };

  const saveCase = async () => {
    if (!caseData) return;
    try {
      const res = await fetch(`${API_BASE}/api/cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(caseData),
      });
      if (!res.ok) throw new Error('Save failed');
      alert("✅ Case saved to My Cases");
    } catch {
      alert("⚠️ Failed to save case");
    }
  };

  const copyToClipboard = async () => {
    if (!caseRef.current) return;
    try {
      await navigator.clipboard.writeText(caseRef.current.innerText);
      alert("📋 Case copied to clipboard!");
    } catch (err) {
      console.warn('Clipboard write failed:', err);
      alert('⚠️ Failed to copy to clipboard');
    }
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

  /**
   * 🧭 @copilot: Dynamic Guidelines & Education Framework
   * 
   * See: docs/COPILOT_GUIDE.md for complete implementation guide
   * 
   * Core Principles:
   * 1) Dynamic guideline cascade: local → national → regional → international
   * 2) User-adaptive content: Medical students → USMLE → Doctors (all levels)
   * 3) Tier-based feedback: 🟢 Learner, 🔵 Skilled, 🟣 Expert (no numeric scores)
   * 4) Template-driven, NO hardcoding: Use ${topic}, ${region}, ${language}
   * 
   * Current Status (Phase 2 Complete):
   * ✅ Expert panel MCQ generation with risk scoring (CHA₂DS₂-VASc, TIMI, CURB-65)
   * ✅ DOI citations (ESC 2023, AHA/ACC 2022)
   * ✅ Adaptive feedback based on performance
   * ✅ Progress bars and guideline badges
   * ✅ Multi-step scenarios and imaging pitfalls
   * 
   * Next Phase (Dynamic Guidelines):
   * - Implement hierarchical guideline registry (backend/routes/guidelines_api.mjs)
   * - Add GuidelinePanel component with collapsible cards
   * - Integrate tier-based scoring display (replace percentage with emoji tiers)
   * - Add streak tracking and motivational micro-feedback
   * 
   * Implementation Pattern:
   * - Backend: Fetch guidelines based on user region → return cascade array
   * - Frontend: Display "Load Guidelines" button → show local/national/regional/global sources
   * - Validation: Ensure all citations exist in registry, no fabricated references
   * 
   * Target Experience:
   * - Duolingo engagement (streaks, achievements, motivational bursts)
   * - UpToDate credibility (collapsible evidence cards, direct DOI links)
   * - Global inclusivity (Danish student sees Sundhedsstyrelsen, US doctor sees AHA/ACC)
   */

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
        
        {/* Conference Panel Enhancement */}
        <ConferencePanel caseData={c} />
        
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
    <div className="max-w-6xl mx-auto pt-8 px-2 fade-in">
      <h2 className="font-bold text-3xl mb-4 text-center">Case Generator</h2>
      <div className="mb-8 text-center text-gray-500">Select a category to begin</div>

      {/* Step 0: Category grid */}
      {step === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
          {areas.map((cat) => (
            <CategoryCard
              key={cat}
              title={cat}
              description={categoryMeta[cat]?.description || ""}
              icon={categoryMeta[cat]?.icon || "📚"}
              color={categoryMeta[cat]?.color || "#60a5fa"}
              onClick={() => handleCategorySelect(cat)}
              selected={area === cat}
            />
          ))}
        </div>
      )}

      {/* Step 1: Topic grid */}
      {step === 1 && (
        <>
          <button className="mb-4 text-blue-500 hover:underline" onClick={handleBack}>&larr; Back to categories</button>
          <div className="font-bold text-xl mb-2 text-center">{area}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 mb-8">
            {topics.map((t) => (
              <TopicCard
                key={t.topic}
                title={t.topic}
                description={t.keywords?.join(", ") || ""}
                icon={categoryMeta[area]?.icon || "📚"}
                color={categoryMeta[area]?.color || "#60a5fa"}
                onClick={() => handleTopicSelect(t.topic)}
                selected={topic === t.topic}
              />
            ))}
          </div>
        </>
      )}

      {/* Step 2: Controls and case generation (existing UI) */}
      {step === 2 && (
        <>
          <button className="mb-4 text-blue-500 hover:underline" onClick={handleBack}>&larr; Back to topics</button>
          {/* ...existing controls and case generation UI... */}
          <div className="flex flex-wrap gap-2 items-center">
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
              <option value="Canada">Canada</option>
              <option value="Australia">Australia</option>
              <option value="WHO">WHO (global)</option>
              <option value="custom">Other…</option>
            </select>
            {manualRegion === "custom" && (
              <input 
                type="text" 
                value={customRegion} 
                onChange={(e) => setCustomRegion(e.target.value)} 
                placeholder="Country name (e.g. Sweden)" 
                className="border p-2 rounded" 
              />
            )}

            {/* gamify */}
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={gamify} onChange={(e) => setGamify(e.target.checked)} /> Gamify
            </label>

            <button type="button" onClick={generateCase} disabled={loading || (!topic && !customTopic)} className="bg-blue-600 text-white px-4 py-2 rounded-xl shadow-md hover:bg-blue-700 transition">
              {loading ? (gamify ? "Generating Quiz..." : "Generating Case...") : (gamify ? "Generate Quiz" : "Generate Case")}
            </button>
          </div>

          {/* Loading message with educational context */}
          {loading && (
            <div className="flex flex-col items-center justify-center mt-10 text-gray-600">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              <p className="mt-3 text-sm font-semibold text-blue-800">
                {gamify ? "🎮 Generating 12 interactive quiz questions..." : "📋 Generating professor-level case..."}
              </p>
              <p className="mt-1 text-xs text-blue-600">
                {gamify 
                  ? "✨ Expert-crafted clinical reasoning questions with guideline citations"
                  : "✨ Expert panel review in progress — high-quality cases may take 1-2 minutes"
                }
              </p>
              <p className="mt-1 text-xs text-gray-500 italic">
                {gamify
                  ? "Faster generation: direct quiz mode optimized for speed"
                  : "Quality over speed: guideline validation, reference verification, multi-expert consensus"
                }
              </p>
            </div>
          )}

          {/* Case rendering */}
          {caseData && gamify && <Level2CaseLogic caseData={caseData} />}
          {caseData && !gamify && <ProfessionalCaseDisplay caseData={caseData} />}

          {/* Actions */}
          {caseData && (
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={saveCase} className="px-3 py-1 bg-green-200 rounded text-sm">
                <Save size={16} /> Save
              </button>
              <button type="button" onClick={copyToClipboard} className="px-3 py-1 bg-gray-200 rounded text-sm">
                <Copy size={16} /> Copy
              </button>
              <button type="button" onClick={downloadPDF} className="px-3 py-1 bg-gray-200 rounded text-sm">
                <FileDown size={16} /> PDF
              </button>
              <button type="button" onClick={() => alert("🔗 Share link feature coming soon!")} className="px-3 py-1 bg-gray-200 rounded text-sm">
                <Share2 size={16} /> Share
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
