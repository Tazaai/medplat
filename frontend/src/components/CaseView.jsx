// ~/medplat/frontend/src/components/CaseView.jsx
import React, { useState, useEffect, useRef } from "react";
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
import ECGModule from "./ECGModule"; // Phase 8: ECG Mastery Module
import ECGMentorPlan from "./ECGMentorPlan"; // Phase 9: AI ECG Study Plan
import CurriculumECG from "./CurriculumECG"; // Phase 10: Curriculum Builder
import ECGExamMode from "./ECGExamMode"; // Phase 11: Certification Mode
import AdminECGAnalytics from "./AdminECGAnalytics"; // Phase 12: Analytics & Admin
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
  const [activeTab, setActiveTab] = useState("case");
  const [userUid, setUserUid] = useState("demo_user_001"); // TODO: Get from auth context
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    return localStorage.getItem('medplat_language') || 'en';
  });

  // Phase 9: Listen for tab switch events from child components (e.g., ECGModule)
  useEffect(() => {
    const handleTabSwitch = (event) => {
      if (event.detail) {
        setActiveTab(event.detail);
      }
    };
    
    window.addEventListener('switchToTab', handleTabSwitch);
    return () => window.removeEventListener('switchToTab', handleTabSwitch);
  }, []);

  // 🌍 detect location
  useEffect(() => {
    fetch(`${API_BASE}/api/location`)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText || 'HTTP error');
        return res.json();
      })
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
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText || 'HTTP error');
        return res.json();
      })
      .then((data) => setAreas((data.categories || []).sort()))
      .catch(() => setAreas([]));
  }, []);

  // load topics (use the read-only advanced search endpoint)
  useEffect(() => {
    if (!area) return;
    fetch(`${API_BASE}/api/topics/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ area }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText || 'HTTP error');
        return res.json();
      })
      .then((data) => setTopics(data.topics || []))
      .catch(() => setTopics([]));
  }, [area]);

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
    if (!chosenTopic) return alert("Please select or enter a topic");

    console.log(`🔍 DEBUG: generateCase called with gamify=${gamify}`);
    setLoading(true);
    setCaseData(null);
    
    try {
      // 🎯 OPTIMIZATION: If gamify mode, use direct MCQ generation (faster, cheaper - 1 API call instead of 2)
      if (gamify) {
        console.log("🎮 Direct gamification mode - generating MCQs directly");
        const res = await fetch(`${API_BASE}/api/gamify-direct`, {
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
        if (!res.ok) throw new Error(res.statusText || 'Quiz generation failed');
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
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">🩺 MedPlat Case Generator</h1>
        <LanguageSelector 
          currentLanguage={currentLanguage} 
          onLanguageChange={setCurrentLanguage} 
        />
      </div>

      {/* Phase 4: Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-300 mb-4">
        <button
          onClick={() => setActiveTab("case")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "case"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          📋 Case Generator
        </button>
        <button
          onClick={() => setActiveTab("mentor")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "mentor"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          🧠 AI Mentor
        </button>
        <button
          onClick={() => setActiveTab("curriculum")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "curriculum"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          📚 Curriculum
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "analytics"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          📊 Analytics
        </button>
        <button
          onClick={() => setActiveTab("mentor_hub")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "mentor_hub"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          🌍 Mentor Hub
        </button>
        <button
          onClick={() => setActiveTab("certifications")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "certifications"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          🏆 Certifications
        </button>
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "leaderboard"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          🥇 Leaderboard
        </button>
        <button
          onClick={() => setActiveTab("exam_prep")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "exam_prep"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          📝 Exam Prep
        </button>
        <button
          onClick={() => setActiveTab("admin_analytics")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "admin_analytics"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          📈 Admin
        </button>
        <button
          onClick={() => setActiveTab("social")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "social"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          👥 Social
        </button>
        <button
          onClick={() => setActiveTab("reasoning")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "reasoning"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          🧠 Reasoning
        </button>
        <button
          onClick={() => setActiveTab("ecg")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "ecg"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          📊 ECG Mastery
        </button>
        <button
          onClick={() => setActiveTab("ecg_mentor")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "ecg_mentor"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          🧠 ECG Study Plan
        </button>
        <button
          onClick={() => setActiveTab("curriculum_ecg")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "curriculum_ecg"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          📚 ECG Curriculum
        </button>
        <button
          onClick={() => setActiveTab("ecg_exam")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "ecg_exam"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          🎓 ECG Certification
        </button>
        <button
          onClick={() => setActiveTab("ecg_analytics")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "ecg_analytics"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          📊 ECG Analytics
        </button>
      </div>

      {/* Show Mentor Tab when active */}
      {activeTab === "mentor" && (
        <MentorTab uid={userUid} currentTopic={topic || "General"} />
      )}

      {/* Show Curriculum Tab when active */}
      {activeTab === "curriculum" && (
        <CurriculumTab uid={userUid} currentTopic={topic || "General"} />
      )}

      {/* Show Analytics Dashboard when active (admin-only) */}
      {activeTab === "analytics" && (
        <AnalyticsDashboard user={{ uid: userUid }} />
      )}

      {/* Show Global Mentor Hub when active (Phase 5) */}
      {activeTab === "mentor_hub" && (
        <GlobalMentorHub user={{ uid: userUid }} />
      )}

      {/* Show Certifications Tab when active (Phase 6 M1) */}
      {activeTab === "certifications" && (
        <CertificationTab uid={userUid} />
      )}

      {/* Show Leaderboard Tab when active (Phase 6 M2) */}
      {activeTab === "leaderboard" && (
        <LeaderboardTab uid={userUid} />
      )}

      {/* Show Exam Prep Tab when active (Phase 6 M3) */}
      {activeTab === "exam_prep" && (
        <ExamPrepTab uid={userUid} />
      )}

      {/* Show Admin Analytics Dashboard when active (Phase 6 M4) */}
      {activeTab === "admin_analytics" && (
        <AnalyticsDashboardTab uid={userUid} isAdmin={true} />
      )}

      {/* Show Social Tab when active (Phase 6 M5) */}
      {activeTab === "social" && (
        <SocialTab uid={userUid} />
      )}

      {/* Show ECG Module when active (Phase 8) */}
      {activeTab === "ecg" && (
        <ECGModule />
      )}

      {/* Show ECG Mentor Plan when active (Phase 9) */}
      {activeTab === "ecg_mentor" && (
        <ECGMentorPlan />
      )}

      {/* Show ECG Curriculum when active (Phase 10) */}
      {activeTab === "curriculum_ecg" && (
        <CurriculumECG />
      )}

      {/* Show ECG Exam Mode when active (Phase 11) */}
      {activeTab === "ecg_exam" && (
        <ECGExamMode />
      )}

      {/* Show ECG Analytics when active (Phase 12) */}
      {activeTab === "ecg_analytics" && (
        <AdminECGAnalytics />
      )}

      {/* Show Reasoning Tab when active (Phase 7 M1) */}
      {activeTab === "reasoning" && (
        <ReasoningTab caseData={caseData} />
      )}

      {/* Case Generator Content (show only when case tab is active) */}
      {activeTab === "case" && (
        <>
          {/* Controls */}
          <div className="flex flex-wrap gap-2 items-center">
        {/* Custom search banner */}
        {customTopic.trim() && (
          <div className="w-full bg-blue-50 border-l-4 border-blue-500 p-3 rounded mb-2">
            <p className="text-sm text-blue-800">
              🔍 <strong>Custom search active</strong> — area and topic selectors disabled
            </p>
          </div>
        )}

        {/* area */}
        <select 
          value={area} 
          onChange={(e) => setArea(e.target.value)} 
          className="border p-2 rounded"
          disabled={customTopic.trim().length > 0}
          style={customTopic.trim() ? {opacity: 0.5, cursor: 'not-allowed'} : {}}
        >
          <option value="">Choose area</option>
          {areas.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        {/* topic */}
        <select 
          value={topic} 
          onChange={(e) => setTopic(e.target.value)} 
          className="border p-2 rounded"
          disabled={customTopic.trim().length > 0}
          style={customTopic.trim() ? {opacity: 0.5, cursor: 'not-allowed'} : {}}
        >
          <option value="">Choose topic</option>
            {topics.map((t) => (
              <option key={t.id || t.topic} value={t.topic}>{t.topic}</option>
            ))}
        </select>

        <input 
          type="text" 
          value={customTopic} 
          onChange={(e) => setCustomTopic(e.target.value)} 
          placeholder="Custom search (e.g., 'IBD and pregnancy')" 
          className="border p-2 rounded w-80" 
        />

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

        <button type="button" onClick={generateCase} disabled={loading || (!topic && !customTopic)} className="bg-blue-600 text-white px-4 py-2 rounded">
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
