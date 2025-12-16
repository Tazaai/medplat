// ~/medplat/frontend/src/components/CaseView.jsx
import React, { useState, useEffect, useRef } from "react";
const STAGE_B_ENDPOINTS = new Set(["expert_panel", "teaching", "evidence", "stability", "risk", "consistency"]);
const STAGE_B_UNAVAILABLE_NOTE = "On-demand expansion currently unavailable for this case.";
import CategoryCard from "./CategoryCard";
import TopicCard from "./TopicCard";
import Level2CaseLogic from "./Level2CaseLogic";
import CaseDisplay from "./CaseDisplay";
import UniversalCaseDisplay from "./UniversalCaseDisplay";
import SimulationMode from "./SimulationMode"; // Hybrid Gamification v2.0
import XPBar from "./XPBar"; // Hybrid Gamification v2.0
import LevelBadge from "./LevelBadge"; // Hybrid Gamification v2.0
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
import { useAuth } from "../contexts/AuthContext"; // ✅ Auth context
import { Save, Copy, Share2, FileDown, Brain } from "lucide-react";
import jsPDF from "jspdf";
import { API_BASE } from "../config"; // ✅ centralized
import { safeFetchQuiz } from "../utils/safeFetch"; // Phase 7: Safe fetch with timeout and retry

  // ✅ helper to normalize case data from backend to frontend format (Universal System)
function normalizeCaseData(raw) {
  if (!raw) return raw;
  
  // Universal system returns clean structure - just ensure all fields are present
  return {
    // Meta information
    meta: {
      topic: raw.meta?.topic || raw.topic || "",
      category: raw.meta?.category || raw.category || "",
      age: raw.meta?.age || raw.age || "",
      sex: raw.meta?.sex || raw.sex || "",
      setting: raw.meta?.setting || raw.setting || "",
      region_guideline_source: raw.meta?.region_guideline_source || raw.meta?.region_used || raw.region || "",
    },
    // Core case fields (universal structure)
    history: raw.history || "",
    physical_exam: raw.physical_exam || "",
    paraclinical: raw.paraclinical || { labs: "", imaging: "" },
    differential_diagnoses: Array.isArray(raw.differential_diagnoses) ? raw.differential_diagnoses : [],
    final_diagnosis: raw.final_diagnosis || "",
    management: raw.management || { initial: "", definitive: "", escalation: "", disposition: "" },
    red_flags: Array.isArray(raw.red_flags) ? raw.red_flags : [],
    key_points: Array.isArray(raw.key_points) ? raw.key_points : [],
    expert_conference: raw.expert_conference || raw.expertConference || "",
    guidelines: raw.guidelines || {},
    mcqs: Array.isArray(raw.mcqs) ? raw.mcqs : [],
    // Teaching mode structured fields
    key_concepts: Array.isArray(raw.key_concepts) ? raw.key_concepts : (raw.key_concepts ? [raw.key_concepts] : []),
    clinical_pearls: Array.isArray(raw.clinical_pearls) ? raw.clinical_pearls : (raw.clinical_pearls ? [raw.clinical_pearls] : []),
    common_pitfalls: Array.isArray(raw.common_pitfalls) ? raw.common_pitfalls : (raw.common_pitfalls ? [raw.common_pitfalls] : []),
    teaching: raw.teaching || (raw.key_concepts || raw.clinical_pearls || raw.common_pitfalls ? 'structured' : ''),
    // Deep Evidence Mode
    deepEvidence: raw.deepEvidence || "",
    // Legacy compatibility fields (for backward compatibility)
    ...raw,
  };
}

// Removed: Old renderContent function - now using UniversalCaseDisplay component

// Removed: ChartBlock component - no longer used with universal case display

export default function CaseView() {
  const [areas, setAreas] = useState([]);
  const [area, setArea] = useState("");
  const [topics, setTopics] = useState([]);
  const [topic, setTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [step, setStep] = useState(0); // 0: category, 1: topic, 2: controls
  const [selectedModel, setSelectedModel] = useState("Lite"); // Default model

  // Category color/icon map (customize as needed)
  const categoryMeta = {
    "Infectious Diseases": { color: "#34d399", icon: "🦠", description: "Infections, outbreaks, and antimicrobials" },
    "Psychiatry": { color: "#f472b6", icon: "🧠", description: "Mental health, wellness, psychiatry" },
    "Radiology": { color: "#a78bfa", icon: "🩻", description: "Imaging, diagnostics, radiology" },
    "Addiction Medicine": { color: "#fbbf24", icon: "💊", description: "Addiction, substance use, harm reduction" },
    "Endocrinology": { color: "#f59e42", icon: "🦋", description: "Hormones, metabolism, endocrinology" },
    "Education": { color: "#38bdf8", icon: "📚", description: "Medical education, teaching, simulation" },
    "Telemedicine": { color: "#818cf8", icon: "💻", description: "Virtual care, telehealth, digital health" },
    "Nutrition": { color: "#10b981", icon: "🥗", description: "Clinical nutrition in hospital and outpatient care" },
    "Weight Loss": { color: "#f59e0b", icon: "⚖️", description: "Assessment and management of overweight and obesity" },
    "Arterial Gas": { color: "#ef4444", icon: "🩸", description: "Arterial blood gas, acid–base and capnography" },
  };
  const [lang, setLang] = useState("en");
  const [customLang, setCustomLang] = useState("");
  const [model, setModel] = useState("Lite");
  const [caseMode, setCaseMode] = useState("classic"); // Hybrid Gamification v2.0: classic | gamified | simulation
  // Derive gamify from caseMode (no separate checkbox)
  const gamify = caseMode === "gamified" || caseMode === "simulation";
  const [caseData, setCaseData] = useState(null);
  const [caseId, setCaseId] = useState(null); // Store caseId for expand operations
  const [loading, setLoading] = useState(false);
  const [expanding, setExpanding] = useState(false);
  const [stageBWarnings, setStageBWarnings] = useState({});

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
  // ✅ Get user from auth context (with error handling)
  let userUid = null;
  try {
    const auth = useAuth();
    userUid = auth?.uid || null;
  } catch (err) {
    console.warn('Auth context not available:', err);
    userUid = null;
  }
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


  // load categories - ✅ DYNAMIC-ONLY: POST-only (always sorted, hide placeholders, refresh on area/topic change)
  useEffect(() => {
    fetch(`${API_BASE}/api/topics2/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    })
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText || 'HTTP error');
        return res.json();
      })
      .then((data) => {
        // Backend returns categories as an object { "Category Name": [...] }
        // Extract category names (keys) from the object
        let categories = [];
        if (data.categories) {
          if (Array.isArray(data.categories)) {
            // If it's already an array, use it
            categories = data.categories;
          } else if (typeof data.categories === 'object' && data.categories !== null) {
            // If it's an object, extract the keys (category names)
            categories = Object.keys(data.categories);
            console.log('✅ Extracted categories from object:', categories.length, 'categories');
          }
        }
        // Fallback: Extract from topics array if categories not available
        if (!categories.length && data.topics && Array.isArray(data.topics)) {
          categories = [...new Set(data.topics.map(t => t.category).filter(Boolean))];
          console.log('✅ Extracted categories from topics array:', categories.length, 'categories');
        }
        const cats = categories
          .filter(cat => !/placeholder/i.test(cat))
          .filter(cat => cat !== 'Public Health') // Remove deprecated category
          .sort((a, b) => a.localeCompare(b));
        console.log('✅ Final categories to display:', cats.length, cats.slice(0, 5));
        setAreas(cats);
      })
      .catch(() => setAreas([]));
  }, [area, topic]);

  // load topics (POST, with { category }) - ✅ FIXED: Use /api/topics2/search
  useEffect(() => {
    if (!area) {
      setTopics([]);
      return;
    }
    fetch(`${API_BASE}/api/topics2/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: area }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText || 'HTTP error');
        return res.json();
      })
      .then((data) => {
        // Defensive: Ensure we always set an array
        let topicsArray = [];
        if (data && Array.isArray(data.topics)) {
          topicsArray = data.topics;
        } else if (data && Array.isArray(data)) {
          topicsArray = data;
        } else if (data && data.topics && Array.isArray(data.topics)) {
          topicsArray = data.topics;
        } else {
          console.warn('Unexpected topics response format:', data);
          topicsArray = [];
        }
        // Additional safety: filter out any invalid entries
        topicsArray = topicsArray.filter(t => t && (t.id || t.topic));
        setTopics(topicsArray);
      })
      .catch((err) => {
        console.error('Error loading topics:', err);
        setTopics([]);
      });
  }, [area]);

  // UI handlers for new card-based flow
  const handleCategorySelect = (cat) => {
    setArea(cat);
    setStep(1);
    setTopic("");
  };
  const handleTopicSelect = (t) => {
    // Mutual exclusion: clear custom topic when selecting predefined topic
    setTopic(t);
    setCustomTopic("");
    setStep(2);
  };
  const handleCustomTopicSelect = (searchValue) => {
    // Check if it matches an existing topic first
    if (Array.isArray(topics) && topics.length > 0) {
      const matchedTopic = topics.find(t => {
        const topicTitle = (t.topic || "").toLowerCase();
        const topicId = (t.id || "").toLowerCase();
        const searchLower = searchValue.toLowerCase();
        return topicTitle === searchLower || topicId === searchLower;
      });
      if (matchedTopic) {
        // Use existing topic (mutual exclusion: clear custom, set topic)
        setTopic(matchedTopic.id || matchedTopic.topic);
        setCustomTopic("");
        setStep(2);
        return;
      }
    }
    // If no match, use as free-text topic (mutual exclusion: clear topic, set custom)
    setTopic("");
    setCustomTopic(searchValue);
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
    if (manualRegion === "auto" || manualRegion === "") {
      return "auto";
    }
    // Map full country names to region codes for backend
    const regionMap = {
      "Denmark": "dk",
      "United States": "us",
      "United Kingdom": "uk",
      "Germany": "de",
      "Canada": "ca",
      "Australia": "au",
      "WHO": "global"
    };
    const regionCode = regionMap[manualRegion] || manualRegion || userLocation || "auto";
    return regionCode;
  };

  // Compute effective topic: custom topic takes precedence over selected topic
  const effectiveTopic = customTopic.trim() || topic;

  const hasText = (value) => typeof value === "string" && value.trim().length > 0;

  const hasExpertConference =
    hasText(caseData?.expertConference) || hasText(caseData?.expert_conference);
  const hasTeaching =
    hasText(caseData?.teaching) ||
    (Array.isArray(caseData?.key_concepts) && caseData.key_concepts.length > 0) ||
    (Array.isArray(caseData?.clinical_pearls) && caseData.clinical_pearls.length > 0) ||
    (Array.isArray(caseData?.common_pitfalls) && caseData.common_pitfalls.length > 0);
  const hasDeepEvidence = hasText(caseData?.deepEvidence);
  const hasStability = hasText(caseData?.stability);
  const hasRisk = hasText(caseData?.risk);
  const hasConsistency = hasText(caseData?.consistency);
  const stageBUnavailable = Object.values(stageBWarnings).some(Boolean);

  const applyExpandedCase = (payload) => {
    const isSuccess = payload?.success || payload?.ok;
    const updatedCase = payload?.data || payload?.case;
    if (isSuccess && updatedCase) {
      setCaseData(normalizeCaseData(updatedCase));
    }
  };

  const expandSection = async (endpoint) => {
    if (!caseId || expanding || loading) return;
    const isStageB = STAGE_B_ENDPOINTS.has(endpoint);
    if (isStageB) {
      setStageBWarnings((prev) => ({ ...prev, [endpoint]: "" }));
    }
    setExpanding(true);
    try {
      const res = await safeFetchQuiz(`${API_BASE}/api/case/expand/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to expand ${endpoint}`);
      }
      const data = await res.json();
      const updatedCase = data?.data || data?.case;
      const expandedSuccess = data?.success || data?.ok;
      const expansionReady = expandedSuccess && !!updatedCase;
      if (isStageB) {
        setStageBWarnings((prev) => ({ ...prev, [endpoint]: expansionReady ? "" : STAGE_B_UNAVAILABLE_NOTE }));
      }
      applyExpandedCase(data);
    } catch (err) {
      console.error(`Failed to expand ${endpoint}:`, err);
      if (isStageB) {
        setStageBWarnings((prev) => ({ ...prev, [endpoint]: STAGE_B_UNAVAILABLE_NOTE }));
      } else {
        alert(`Failed to expand ${endpoint}: ${err.message || err}`);
      }
    } finally {
      setExpanding(false);
    }
  };
  
  const generateCase = async () => {
    if (!effectiveTopic) {
      alert("Please select or enter a topic");
      return;
    }

    console.info(`🎯 Case generation: gamify=${gamify}`);
    setLoading(true);
    setCaseData(null);
    setStageBWarnings({});
    
    try {
      // 🎯 OPTIMIZATION: If gamify mode, use direct MCQ generation (faster, cheaper - 1 API call instead of 2)
      if (gamify) {
        console.log("🎮 Direct gamification mode - generating MCQs directly");
        
        // Phase 7: Use safe fetch with 180-second (3-minute) timeout and retry logic
        const res = await safeFetchQuiz(`${API_BASE}/api/gamify-direct`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: effectiveTopic,
            language: getLanguage(),
            region: getEffectiveRegion(),
            level: "intermediate",
            model: selectedModel,
          }),
        });
        
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
            topic: effectiveTopic,
            language: getLanguage(),
            region: getEffectiveRegion(),
            level: "intermediate",
            model,
            generation_type: 'direct_gamification',
          },
          mcqs: data.mcqs,
          // Minimal case structure for compatibility
          presentation: `Interactive Quiz: ${effectiveTopic}`,
          diagnosis: effectiveTopic,
        };
        
        console.log("✅ Gamification case created:", gamificationCase);
        setCaseData(gamificationCase);
      } else {
        // 📋 Classic Mode: Use new multi-step pipeline (/api/case/*)
        console.log("📋 Classic Mode - using new multi-step pipeline");
        
        // Step 1: Initialize case
        const initRes = await safeFetchQuiz(`${API_BASE}/api/case/init`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: effectiveTopic,
            category: area || 'General Practice',
            lang: getLanguage(),
            region: getEffectiveRegion(),
            model: selectedModel,
          }),
        });
        
        if (!initRes.ok) {
          throw new Error(`HTTP ${initRes.status}: Failed to initialize case`);
        }
        
        const initData = await initRes.json();
        // Support both new format (success) and old format (ok) for backward compatibility
        const isSuccess = initData.success || initData.ok;
        const caseId = initData.caseId || initData.data?.caseId;
        const caseData = initData.data || initData.case;
        
        if (!isSuccess || !caseId) {
          throw new Error(initData.error || "Failed to initialize case");
        }
        
        const newCaseId = caseId;
        setCaseId(newCaseId); // Store caseId for expand operations
        let currentCase = caseData;
        console.log("✅ Case initialized:", newCaseId);
        
        // Step 2: Generate history
        const historyRes = await safeFetchQuiz(`${API_BASE}/api/case/history`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseId: newCaseId, model: selectedModel }),
        });
        
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          // Support both new format (success + data) and old format (ok + case)
          const isSuccess = historyData.success || historyData.ok;
          if (isSuccess) {
            currentCase = historyData.data || historyData.case || currentCase;
            console.log("✅ History generated");
          }
        }
        
        // Step 3: Generate physical exam
        const examRes = await safeFetchQuiz(`${API_BASE}/api/case/exam`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseId: newCaseId, model: selectedModel }),
        });
        
        if (examRes.ok) {
          const examData = await examRes.json();
          // Support both new format (success + data) and old format (ok + case)
          const isSuccess = examData.success || examData.ok;
          if (isSuccess) {
            currentCase = examData.data || examData.case || currentCase;
            console.log("✅ Physical exam generated");
          }
        }
        
        // Step 4: Generate paraclinical (labs + imaging)
        const paraclinicalRes = await safeFetchQuiz(`${API_BASE}/api/case/paraclinical`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseId: newCaseId, model: selectedModel }),
        });

        if (!paraclinicalRes.ok) {
          throw new Error(`HTTP ${paraclinicalRes.status}: Failed to generate paraclinical`);
        }
        
        if (paraclinicalRes.ok) {
          const paraclinicalData = await paraclinicalRes.json();
          const isSuccess = paraclinicalData.success || paraclinicalData.ok;
          const paraclinicalSource = paraclinicalData.data || paraclinicalData.case || paraclinicalData;
          const resolvedParaclinical = paraclinicalSource?.paraclinical
            || (paraclinicalSource && (paraclinicalSource.labs || paraclinicalSource.imaging)
              ? {
                  labs: paraclinicalSource.labs,
                  imaging: paraclinicalSource.imaging
                }
              : null);

          if (isSuccess && resolvedParaclinical) {
            currentCase = {
              ...currentCase,
              paraclinical: resolvedParaclinical
            };
            console.log("Paraclinical generated");
          } else if (isSuccess && !resolvedParaclinical) {
            console.log("Paraclinical generated but payload empty");
          }
        }

        // Stage B expansions are user-triggered only; management is generated in Stage A.
        if (false) {
        // Step 5: Generate management (legacy - should not run automatically)
        const managementRes = await safeFetchQuiz(`${API_BASE}/api/case/expand/management`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseId: newCaseId }),
        });
        
        if (managementRes.ok) {
          const managementData = await managementRes.json();
          if (managementData.ok) {
            currentCase = managementData.case;
            console.log("✅ Management generated");
          }
        }
        }
        
        // Normalize the case data structure
        const normalizedCase = normalizeCaseData(currentCase);
        console.log("✅ Classic Mode case complete:", normalizedCase);
        setCaseData(normalizedCase);
      }
      
      // ✅ Internal panel review happens automatically during case generation (invisible to user)
        
    } catch (err) {
      console.error("❌ Error generating content:", err);
      
      // Phase 7: Better error messages for abort/timeout
      let errorMessage = err.message;
      if (err.name === 'AbortError') {
        errorMessage = 'Request timed out after 3 minutes. The server may be processing a complex case. Please try again.';
      } else if (err.message?.includes('signal is aborted')) {
        errorMessage = 'Request was cancelled. Please try again.';
      }
      
      alert(`Failed to generate ${gamify ? 'quiz' : 'case'}: ${errorMessage}`);
    }
    setLoading(false);
  };

  const saveCase = async () => {
    if (!caseData) return;
    try {
      const res = await fetch(`${API_BASE}/api/cases/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(caseData),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Save failed');
      alert("Case saved");
    } catch (err) {
      console.warn('Save failed:', err);
      alert("Failed to save case");
    }
  };

  const copyToClipboard = async () => {
    if (!caseRef.current) return;
    try {
      await navigator.clipboard.writeText(caseRef.current.innerText);
      alert("Case copied to clipboard!");
    } catch (err) {
      console.warn('Clipboard write failed:', err);
      alert('Failed to copy to clipboard');
    }
  };

  const downloadPDF = () => {
    if (!caseRef.current) return;
    const doc = new jsPDF("p", "pt", "a4");
    doc.setFontSize(12);
    doc.text(doc.splitTextToSize(caseRef.current.innerText, 500), 40, 40);
    doc.save("case.pdf");
  };

  // Removed: Old renderPanel function - expert conference now handled by UniversalCaseDisplay

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

  // Removed: Old renderBookCase function - now using UniversalCaseDisplay component

  return (
    <div className="max-w-6xl mx-auto pt-8 px-2 fade-in">
      {/* Hybrid Gamification v2.0: Global XP Bar */}
      <div className="mb-4 flex justify-end">
        <XPBar />
      </div>
      
      {/* Modern Clinical Case Lab heading with AI brain icon */}
      <div className="mb-6 text-center">
        <h2 className="font-bold text-4xl mb-2 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent inline-flex items-center gap-3">
          <Brain className="w-8 h-8 text-purple-600" />
          MedPlat Expert Reasoning Engine
        </h2>
        {/* Text labels */}
        <div className="mb-2 text-center text-gray-500 text-sm">
          Classic Case • MCQs and Certification • Interactive Simulation
        </div>
        {/* Subtitle only shown when no category is selected */}
        {step === 0 && !loading && (
          <div className="mb-6 text-center text-gray-600 text-lg">
            Select a category to begin
          </div>
        )}
        {/* Loading message shown on any step when loading */}
        {loading && (
          <div className="mb-6 text-center text-gray-600 text-lg">
            Generating case…
          </div>
        )}
      </div>

      {/* Step 0: Category grid */}
      {step === 0 && (
        <>
          {/* Custom topic search - moved to start page */}
          <div className="mb-8 max-w-2xl mx-auto">
            <input
              type="text"
              value={customTopic}
              onChange={(e) => {
                const value = e.target.value;
                // Mutual exclusion: if typing in custom topic, clear selected topic
                if (value.trim()) {
                  setTopic("");
                }
                setCustomTopic(value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customTopic.trim()) {
                  handleCustomTopicSelect(customTopic.trim());
                }
              }}
              placeholder="Search for a condition (e.g. NSTEMI, DKA, meningitis)…"
              className="w-full border-2 border-gray-300 p-4 rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
            />
            {customTopic.trim() && (
              <button
                onClick={() => handleCustomTopicSelect(customTopic.trim())}
                className="mt-3 w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-all font-semibold"
              >
                Use "{customTopic.trim()}" as topic
              </button>
            )}
          </div>
          
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
        </>
      )}

      {/* Step 1: Topic grid */}
      {step === 1 && (
        <>
          <button className="mb-4 text-blue-500 hover:underline flex items-center gap-1" onClick={handleBack}>
            <span>&larr;</span> Back to category
          </button>
          <div className="font-bold text-xl mb-2 text-center">{area}</div>
          
          {/* Defensive: Ensure topics is an array before mapping */}
          {Array.isArray(topics) && topics.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 mb-8">
              {topics.map((t, index) => {
                // Defensive: Skip invalid entries
                if (!t || (!t.id && !t.topic)) {
                  console.warn('Skipping invalid topic entry:', t);
                  return null;
                }
                
                // Handle keywords - can be object { topic: "..." } or array
                let description = "";
                if (t.keywords) {
                  if (Array.isArray(t.keywords)) {
                    description = t.keywords.join(", ");
                  } else if (typeof t.keywords === "object" && t.keywords.topic) {
                    description = t.keywords.topic;
                  } else if (typeof t.keywords === "string") {
                    description = t.keywords;
                  }
                }
                
                const topicId = t.id || t.topic;
                const topicTitle = t.topic || "Untitled Topic";
                const topicKey = topicId || `topic-${index}`;
                
                return (
                  <TopicCard
                    key={topicKey}
                    title={topicTitle}
                    description={description}
                    icon={categoryMeta[area]?.icon || "📚"}
                    color={categoryMeta[area]?.color || "#60a5fa"}
                    onClick={() => !customTopic.trim() && handleTopicSelect(topicId)}
                    selected={topic === topicId}
                    disabled={!!customTopic.trim()}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {topics === null || topics === undefined ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  <p>Loading topics...</p>
                </div>
              ) : (
                <p>No topics found for this category.</p>
              )}
            </div>
          )}
        </>
      )}

      {/* Step 2: Controls and case generation (existing UI) */}
      {step === 2 && (
        <>
          <button className="mb-4 text-blue-500 hover:underline flex items-center gap-1" onClick={handleBack}>
            <span>&larr;</span> Back to topics
          </button>
          {/* Controls toolbar - pill-style */}
          <div className={`flex flex-wrap gap-3 items-center justify-center mb-6 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* Language dropdown - pill style */}
            <div className="relative">
              <select 
                value={lang} 
                onChange={(e) => setLang(e.target.value)} 
                className="appearance-none bg-blue-50 text-blue-700 border border-blue-300 px-4 py-2 rounded-full text-sm font-medium cursor-pointer hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
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
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <svg className="h-4 w-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {lang === "custom" && (
              <input 
                type="text" 
                value={customLang} 
                onChange={(e) => setCustomLang(e.target.value)} 
                placeholder="ISO code (e.g. fr)" 
                className="border border-blue-300 px-4 py-2 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                disabled={loading}
              />
            )}

            {/* Country dropdown - pill style */}
            <div className="relative">
              <select 
                value={manualRegion} 
                onChange={(e) => setManualRegion(e.target.value)} 
                className="appearance-none bg-gray-50 text-gray-700 border border-gray-300 px-4 py-2 rounded-full text-sm font-medium cursor-pointer hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                <option value="">Country</option>
                <option value="auto">Auto (unspecified)</option>
                <option value="Denmark">Denmark (dk)</option>
                <option value="United States">United States (us)</option>
                <option value="United Kingdom">United Kingdom (uk)</option>
                <option value="Germany">Germany (de)</option>
                <option value="Canada">Canada (ca)</option>
                <option value="Australia">Australia (au)</option>
                <option value="WHO">WHO (global)</option>
                <option value="custom">Other…</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <svg className="h-4 w-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {manualRegion === "custom" && (
              <input 
                type="text" 
                value={customRegion} 
                onChange={(e) => setCustomRegion(e.target.value)} 
                placeholder="Country name (e.g. Sweden)" 
                className="border border-gray-300 px-4 py-2 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                disabled={loading}
              />
            )}

            {/* Mode selector - pill style */}
            <div className="relative">
              <select 
                value={caseMode} 
                onChange={(e) => setCaseMode(e.target.value)} 
                className="appearance-none bg-purple-50 text-purple-700 border border-purple-300 px-4 py-2 rounded-full text-sm font-medium cursor-pointer hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                <option value="classic">Classic Mode</option>
                <option value="gamified">Gamified Mode</option>
                <option value="simulation">Simulation Mode</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <svg className="h-4 w-4 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Model selector - pill style */}
            <div className="relative">
              <select 
                value={selectedModel} 
                onChange={(e) => setSelectedModel(e.target.value)} 
                className="appearance-none bg-green-50 text-green-700 border border-green-300 px-4 py-2 rounded-full text-sm font-medium cursor-pointer hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
                title="Select AI model tier"
              >
                <option value="Lite">Lite</option>
                <option value="Flash">Flash</option>
                <option value="Pro">Pro</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <svg className="h-4 w-4 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

          </div>

          {/* Modern AI-style loading indicator */}
          {loading && (
            <div className="flex flex-col items-center justify-center mt-12 mb-12">
              {/* Animated gradient card */}
              <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-2xl shadow-lg p-8 mb-6 max-w-md w-full">
                {/* Pulsing dots */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                </div>
                
                {/* Animated gradient bar */}
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
                  <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 rounded-full animate-shimmer" style={{
                    width: '100%',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2s ease-in-out infinite'
                  }}></div>
                </div>
                
                {/* Loading text */}
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-800 mb-2">
                    Generating the best possible case…
                  </p>
                  <p className="text-sm text-gray-500">
                    High-quality cases can take up to 5 minutes.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Add shimmer animation style */}
          <style>{`
            @keyframes shimmer {
              0% { background-position: -200% 0; }
              100% { background-position: 200% 0; }
            }
            .animate-shimmer {
              animation: shimmer 2s ease-in-out infinite;
            }
          `}</style>

          {/* Hybrid Gamification v2.0: Conditional rendering based on mode */}
          {caseData && caseMode === "simulation" && (
            <SimulationMode caseData={caseData} />
          )}
          {caseData && caseMode === "gamified" && (
            <>
              {caseData.mcqs && Array.isArray(caseData.mcqs) && caseData.mcqs.length > 0 ? (
                <Level2CaseLogic caseData={caseData} gamify={true} />
              ) : (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-yellow-800">Gamified mode selected but no MCQs available. Try generating again or use Classic mode.</p>
                </div>
              )}
            </>
          )}
          {caseData && caseMode === "classic" && (
            <div className="flex flex-col">
              {/* On-demand action buttons (one-click, no toggles) */}
              {caseId && (
                <>
                  <div className="flex gap-2 mt-4 mb-4 max-w-3xl mx-auto px-6 justify-center flex-wrap" style={{ order: 3 }}>
                    {!hasExpertConference && (
                      <button
                        type="button"
                        onClick={() => expandSection("expert_panel")}
                        disabled={expanding || loading || Boolean(stageBWarnings.expert_panel)}
                        className="px-3 py-1 bg-blue-200 rounded text-sm"
                      >
                        Expert Conference
                      </button>
                    )}

                    {!hasTeaching && (
                      <button
                        type="button"
                        onClick={() => expandSection("teaching")}
                        disabled={expanding || loading || Boolean(stageBWarnings.teaching)}
                        className="px-3 py-1 bg-purple-200 rounded text-sm"
                      >
                        Teaching Mode
                      </button>
                    )}

                    {!hasDeepEvidence && (
                      <button
                        type="button"
                        onClick={() => expandSection("evidence")}
                        disabled={expanding || loading || Boolean(stageBWarnings.evidence)}
                        className="px-3 py-1 bg-indigo-200 rounded text-sm"
                      >
                        Deep Evidence
                      </button>
                    )}

                    {!hasStability && (
                      <button
                        type="button"
                        onClick={() => expandSection("stability")}
                        disabled={expanding || loading || Boolean(stageBWarnings.stability)}
                        className="px-3 py-1 bg-yellow-200 rounded text-sm"
                      >
                        Stability
                      </button>
                    )}

                    {!hasRisk && (
                      <button
                        type="button"
                        onClick={() => expandSection("risk")}
                        disabled={expanding || loading || Boolean(stageBWarnings.risk)}
                        className="px-3 py-1 bg-red-200 rounded text-sm"
                      >
                        Risk
                      </button>
                    )}

                    {!hasConsistency && (
                      <button
                        type="button"
                        onClick={() => expandSection("consistency")}
                        disabled={expanding || loading || Boolean(stageBWarnings.consistency)}
                        className="px-3 py-1 bg-gray-200 rounded text-sm"
                      >
                        Consistency
                      </button>
                    )}
                  </div>
                  {stageBUnavailable && (
                    <div className="text-center text-sm text-yellow-800 mt-2">
                      {STAGE_B_UNAVAILABLE_NOTE}
                    </div>
                  )}
                </>
              )}

              {/* Legacy toggle UI (disabled) */}
              {false && caseId && (
                <div className="flex gap-2 mt-4 mb-4 max-w-3xl mx-auto px-6 justify-center flex-wrap" style={{ order: 3 }}>
                  {/* Expert Conference Toggle */}
                  <button
                    type="button"
                    onClick={async () => {
                      // If data doesn't exist, load it first
                      if (!caseData.expertConference && !caseData.expert_conference && caseId && !expanding) {
                        setExpanding(true);
                        try {
                          const res = await safeFetchQuiz(`${API_BASE}/api/case/expand/expert_panel`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ caseId }),
                          });
                          if (res.ok) {
                            const data = await res.json();
                            const isSuccess = data.success || data.ok;
                            const newCaseData = data.data || data.case;
                            if (isSuccess && newCaseData) {
                              const normalizedCase = normalizeCaseData(newCaseData);
                              setCaseData(normalizedCase);
                            }
                          }
                        } catch (err) {
                          console.error("Failed to expand expert conference:", err);
                          alert(`Failed to expand expert conference: ${err.message}`);
                        } finally {
                          setExpanding(false);
                        }
                      }
                      // Toggle visibility
                      setShowExpert(isProd ? true : !showExpert);
                    }}
                    disabled={expanding || loading}
                    className={`px-3 py-1 rounded text-sm transition-all ${
                      showExpert 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-blue-200 text-blue-700 hover:bg-blue-300'
                    }`}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem',
                      border: 'none',
                      cursor: (expanding || loading) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontWeight: '500',
                      opacity: (expanding || loading) ? 0.6 : 1
                    }}
                  >
                    {isProd ? 'Expert Conference' : (showExpert ? 'Hide Expert Conference' : 'Show Expert Conference')}
                  </button>
                  
                  {/* Teaching Mode Toggle */}
                  <button
                    type="button"
                    onClick={async () => {
                      // If data doesn't exist, load it first
                      if (!caseData.teaching && !caseData.key_concepts?.length && !caseData.clinical_pearls?.length && !caseData.common_pitfalls?.length && caseId && !expanding) {
                        setExpanding(true);
                        try {
                          const res = await safeFetchQuiz(`${API_BASE}/api/case/expand/teaching`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ caseId }),
                          });
                          if (res.ok) {
                            const data = await res.json();
                            const isSuccess = data.success || data.ok;
                            const newCaseData = data.data || data.case;
                            if (isSuccess && newCaseData) {
                              const normalizedCase = normalizeCaseData(newCaseData);
                              setCaseData(normalizedCase);
                            }
                          }
                        } catch (err) {
                          console.error("Failed to expand teaching:", err);
                          alert(`Failed to expand teaching: ${err.message}`);
                        } finally {
                          setExpanding(false);
                        }
                      }
                      // Toggle visibility
                      setShowTeaching(isProd ? true : !showTeaching);
                    }}
                    disabled={expanding || loading}
                    className={`px-3 py-1 rounded text-sm transition-all ${
                      showTeaching 
                        ? 'bg-green-600 text-white' 
                        : 'bg-green-200 text-green-700 hover:bg-green-300'
                    }`}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem',
                      border: 'none',
                      cursor: (expanding || loading) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontWeight: '500',
                      opacity: (expanding || loading) ? 0.6 : 1
                    }}
                  >
                    {isProd ? 'Teaching Mode' : (showTeaching ? 'Hide Teaching Mode' : 'Show Teaching Mode')}
                  </button>
                  
                  {/* Deep Evidence Mode Toggle */}
                  <button
                    type="button"
                    onClick={async () => {
                      // If data doesn't exist, load it first
                      if (!caseData.deepEvidence && caseId && !expanding) {
                        setExpanding(true);
                        try {
                          const res = await safeFetchQuiz(`${API_BASE}/api/case/expand/evidence`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ caseId }),
                          });
                          if (res.ok) {
                            const data = await res.json();
                            const isSuccess = data.success || data.ok;
                            const newCaseData = data.data || data.case;
                            if (isSuccess && newCaseData) {
                              const normalizedCase = normalizeCaseData(newCaseData);
                              setCaseData(normalizedCase);
                            }
                          }
                        } catch (err) {
                          console.error("Failed to expand deep evidence:", err);
                          alert(`Failed to expand deep evidence: ${err.message}`);
                        } finally {
                          setExpanding(false);
                        }
                      }
                      // Toggle visibility
                      setShowDeepEvidence(isProd ? true : !showDeepEvidence);
                    }}
                    disabled={expanding || loading}
                    className={`px-3 py-1 rounded text-sm transition-all ${
                      showDeepEvidence 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-indigo-200 text-indigo-700 hover:bg-indigo-300'
                    }`}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem',
                      border: 'none',
                      cursor: (expanding || loading) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontWeight: '500',
                      opacity: (expanding || loading) ? 0.6 : 1
                    }}
                  >
                    {isProd ? 'Deep Evidence' : (showDeepEvidence ? 'Hide Deep Evidence' : 'Show Deep Evidence')}
                  </button>
                  
                  {/* Stability Toggle */}
                  <button
                    type="button"
                    onClick={async () => {
                      // If data doesn't exist, load it first
                      if (!caseData.stability && caseId && !expanding) {
                        setExpanding(true);
                        try {
                          const res = await safeFetchQuiz(`${API_BASE}/api/case/expand/stability`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ caseId }),
                          });
                          if (res.ok) {
                            const data = await res.json();
                            const isSuccess = data.success || data.ok;
                            const newCaseData = data.data || data.case;
                            if (isSuccess && newCaseData) {
                              const normalizedCase = normalizeCaseData(newCaseData);
                              setCaseData(normalizedCase);
                            }
                          }
                        } catch (err) {
                          console.error("Failed to expand stability:", err);
                          alert(`Failed to expand stability: ${err.message}`);
                        } finally {
                          setExpanding(false);
                        }
                      }
                      // Toggle visibility
                      setShowStability(isProd ? true : !showStability);
                    }}
                    disabled={expanding || loading}
                    className={`px-3 py-1 rounded text-sm transition-all ${
                      showStability 
                        ? 'bg-yellow-600 text-white' 
                        : 'bg-yellow-200 text-yellow-700 hover:bg-yellow-300'
                    }`}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem',
                      border: 'none',
                      cursor: (expanding || loading) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontWeight: '500',
                      opacity: (expanding || loading) ? 0.6 : 1
                    }}
                  >
                    {isProd ? 'Stability' : (showStability ? 'Hide Stability' : 'Show Stability')}
                  </button>
                  
                  {/* Risk Toggle */}
                  <button
                    type="button"
                    onClick={async () => {
                      // If data doesn't exist, load it first
                      if (!caseData.risk && caseId && !expanding) {
                        setExpanding(true);
                        try {
                          const res = await safeFetchQuiz(`${API_BASE}/api/case/expand/risk`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ caseId }),
                          });
                          if (res.ok) {
                            const data = await res.json();
                            const isSuccess = data.success || data.ok;
                            const newCaseData = data.data || data.case;
                            if (isSuccess && newCaseData) {
                              const normalizedCase = normalizeCaseData(newCaseData);
                              setCaseData(normalizedCase);
                            }
                          }
                        } catch (err) {
                          console.error("Failed to expand risk:", err);
                          alert(`Failed to expand risk: ${err.message}`);
                        } finally {
                          setExpanding(false);
                        }
                      }
                      // Toggle visibility
                      setShowRisk(isProd ? true : !showRisk);
                    }}
                    disabled={expanding || loading}
                    className={`px-3 py-1 rounded text-sm transition-all ${
                      showRisk 
                        ? 'bg-red-600 text-white' 
                        : 'bg-red-200 text-red-700 hover:bg-red-300'
                    }`}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem',
                      border: 'none',
                      cursor: (expanding || loading) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontWeight: '500',
                      opacity: (expanding || loading) ? 0.6 : 1
                    }}
                  >
                    {isProd ? 'Risk' : (showRisk ? 'Hide Risk' : 'Show Risk')}
                  </button>
                  
                  {/* Consistency Toggle */}
                  <button
                    type="button"
                    onClick={async () => {
                      // If data doesn't exist, load it first
                      if (!caseData.consistency && caseId && !expanding) {
                        setExpanding(true);
                        try {
                          const res = await safeFetchQuiz(`${API_BASE}/api/case/expand/consistency`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ caseId }),
                          });
                          if (res.ok) {
                            const data = await res.json();
                            const isSuccess = data.success || data.ok;
                            const newCaseData = data.data || data.case;
                            if (isSuccess && newCaseData) {
                              const normalizedCase = normalizeCaseData(newCaseData);
                              setCaseData(normalizedCase);
                            }
                          }
                        } catch (err) {
                          console.error("Failed to expand consistency:", err);
                          alert(`Failed to expand consistency: ${err.message}`);
                        } finally {
                          setExpanding(false);
                        }
                      }
                      // Toggle visibility
                      setShowConsistency(isProd ? true : !showConsistency);
                    }}
                    disabled={expanding || loading}
                    className={`px-3 py-1 rounded text-sm transition-all ${
                      showConsistency 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-purple-200 text-purple-700 hover:bg-purple-300'
                    }`}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem',
                      border: 'none',
                      cursor: (expanding || loading) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontWeight: '500',
                      opacity: (expanding || loading) ? 0.6 : 1
                    }}
                  >
                    {isProd ? 'Consistency' : (showConsistency ? 'Hide Consistency' : 'Show Consistency')}
                  </button>
                </div>
              )}
              
              {/* Conditionally render UniversalCaseDisplay with visibility toggles */}
              <div style={{ order: 1 }}>
                <UniversalCaseDisplay 
                  caseData={caseData} 
                  showExpert={hasExpertConference}
                  showTeaching={hasTeaching}
                  showDeepEvidence={hasDeepEvidence}
                  showStability={hasStability}
                  showRisk={hasRisk}
                  showConsistency={hasConsistency}
                />
              </div>
              
              {/* Back to topics button at bottom of case view */}
              <div className="mt-8 mb-4 text-center" style={{ order: 5 }}>
                <button 
                  className="text-blue-500 hover:underline flex items-center gap-1 mx-auto"
                  onClick={handleBack}
                >
                  <span>&larr;</span> Back to topics
                </button>
              </div>
              
              {/* Old expand buttons - REMOVED (replaced with toggle buttons above) */}
              {false && caseId && (
                <div className="flex gap-2 mt-4 max-w-3xl mx-auto px-6 justify-center flex-wrap">
                  {!caseData.pathophysiology && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!caseId || expanding) return;
                        setExpanding(true);
                        try {
                          const res = await safeFetchQuiz(`${API_BASE}/api/case/expand/expert_panel`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ caseId }),
                          });
                          if (res.ok) {
                            const data = await res.json();
                            // Support both new format (success + data) and old format (ok + case)
                            const isSuccess = data.success || data.ok;
                            const caseData = data.data || data.case;
                            if (isSuccess && caseData) {
                              const normalizedCase = normalizeCaseData(caseData);
                              setCaseData(normalizedCase);
                              console.log("✅ Expert Conference expanded", data.cached ? "(cached)" : "");
                            }
                          }
                        } catch (err) {
                          console.error("Failed to expand expert conference:", err);
                          alert(`Failed to expand expert conference: ${err.message}`);
                        } finally {
                          setExpanding(false);
                        }
                      }}
                      disabled={expanding || loading}
                      className="px-3 py-1 bg-blue-200 rounded text-sm"
                      style={{
                        padding: '0.5rem 0.75rem',
                        backgroundColor: '#dbeafe',
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem',
                        border: 'none',
                        cursor: (expanding || loading) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontWeight: '500',
                        color: '#1e40af',
                        opacity: (expanding || loading) ? 0.6 : 1
                      }}
                    >
                      👥 Show Expert Conference
                    </button>
                  )}
                  {!caseData.teaching && !caseData.key_concepts?.length && !caseData.clinical_pearls?.length && !caseData.common_pitfalls?.length && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!caseId || expanding) return;
                        setExpanding(true);
                        try {
                          const res = await safeFetchQuiz(`${API_BASE}/api/case/expand/teaching`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ caseId }),
                          });
                          if (res.ok) {
                            const data = await res.json();
                            // Support both new format (success + data) and old format (ok + case)
                            const isSuccess = data.success || data.ok;
                            const caseData = data.data || data.case;
                            if (isSuccess && caseData) {
                              const normalizedCase = normalizeCaseData(caseData);
                              setCaseData(normalizedCase);
                              console.log("✅ Teaching Mode expanded", data.cached ? "(cached)" : "");
                            }
                          }
                        } catch (err) {
                          console.error("Failed to expand teaching:", err);
                          alert(`Failed to expand teaching: ${err.message}`);
                        } finally {
                          setExpanding(false);
                        }
                      }}
                      disabled={expanding || loading}
                      className="px-3 py-1 bg-green-200 rounded text-sm"
                      style={{
                        padding: '0.5rem 0.75rem',
                        backgroundColor: '#d1fae5',
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem',
                        border: 'none',
                        cursor: (expanding || loading) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontWeight: '500',
                        color: '#065f46',
                        opacity: (expanding || loading) ? 0.6 : 1
                      }}
                    >
                      🎓 Teaching Mode
                    </button>
                  )}
                  {!caseData.deepEvidence && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!caseId || expanding) return;
                        setExpanding(true);
                        try {
                          const res = await safeFetchQuiz(`${API_BASE}/api/case/expand/evidence`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ caseId }),
                          });
                          if (res.ok) {
                            const data = await res.json();
                            // Support both new format (success + data) and old format (ok + case)
                            const isSuccess = data.success || data.ok;
                            const caseData = data.data || data.case;
                            if (isSuccess && caseData) {
                              const normalizedCase = normalizeCaseData(caseData);
                              setCaseData(normalizedCase);
                              console.log("✅ Deep Evidence Mode expanded", data.cached ? "(cached)" : "");
                            }
                          }
                        } catch (err) {
                          console.error("Failed to expand deep evidence:", err);
                          alert(`Failed to expand deep evidence: ${err.message}`);
                        } finally {
                          setExpanding(false);
                        }
                      }}
                      disabled={expanding || loading}
                      className="px-3 py-1 bg-indigo-200 rounded text-sm"
                      style={{
                        padding: '0.5rem 0.75rem',
                        backgroundColor: '#e0e7ff',
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem',
                        border: 'none',
                        cursor: (expanding || loading) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontWeight: '500',
                        color: '#312e81',
                        opacity: (expanding || loading) ? 0.6 : 1
                      }}
                    >
                      🔍 Deep Evidence Mode
                    </button>
                  )}
                  {!caseData.stability && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!caseId || expanding) return;
                        setExpanding(true);
                        try {
                          const res = await safeFetchQuiz(`${API_BASE}/api/case/expand/stability`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ caseId }),
                          });
                          if (res.ok) {
                            const data = await res.json();
                            // Support both new format (success + data) and old format (ok + case)
                            const isSuccess = data.success || data.ok;
                            const caseData = data.data || data.case;
                            if (isSuccess && caseData) {
                              const normalizedCase = normalizeCaseData(caseData);
                              setCaseData(normalizedCase);
                              console.log("✅ Stability expanded", data.cached ? "(cached)" : "");
                            }
                          }
                        } catch (err) {
                          console.error("Failed to expand stability:", err);
                          alert(`Failed to expand stability: ${err.message}`);
                        } finally {
                          setExpanding(false);
                        }
                      }}
                      disabled={expanding || loading}
                      className="px-3 py-1 bg-yellow-200 rounded text-sm"
                      style={{
                        padding: '0.5rem 0.75rem',
                        backgroundColor: '#fef3c7',
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem',
                        border: 'none',
                        cursor: (expanding || loading) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontWeight: '500',
                        color: '#78350f',
                        opacity: (expanding || loading) ? 0.6 : 1
                      }}
                    >
                      ⚖️ Stability
                    </button>
                  )}
                  {!caseData.risk && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!caseId || expanding) return;
                        setExpanding(true);
                        try {
                          const res = await safeFetchQuiz(`${API_BASE}/api/case/expand/risk`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ caseId }),
                          });
                          if (res.ok) {
                            const data = await res.json();
                            // Support both new format (success + data) and old format (ok + case)
                            const isSuccess = data.success || data.ok;
                            const caseData = data.data || data.case;
                            if (isSuccess && caseData) {
                              const normalizedCase = normalizeCaseData(caseData);
                              setCaseData(normalizedCase);
                              console.log("✅ Risk expanded", data.cached ? "(cached)" : "");
                            }
                          }
                        } catch (err) {
                          console.error("Failed to expand risk:", err);
                          alert(`Failed to expand risk: ${err.message}`);
                        } finally {
                          setExpanding(false);
                        }
                      }}
                      disabled={expanding || loading}
                      className="px-3 py-1 bg-red-200 rounded text-sm"
                      style={{
                        padding: '0.5rem 0.75rem',
                        backgroundColor: '#fee2e2',
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem',
                        border: 'none',
                        cursor: (expanding || loading) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontWeight: '500',
                        color: '#991b1b',
                        opacity: (expanding || loading) ? 0.6 : 1
                      }}
                    >
                      ⚠️ Risk
                    </button>
                  )}
                  {!caseData.consistency && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!caseId || expanding) return;
                        setExpanding(true);
                        try {
                          const res = await safeFetchQuiz(`${API_BASE}/api/case/expand/consistency`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ caseId }),
                          });
                          if (res.ok) {
                            const data = await res.json();
                            // Support both new format (success + data) and old format (ok + case)
                            const isSuccess = data.success || data.ok;
                            const caseData = data.data || data.case;
                            if (isSuccess && caseData) {
                              const normalizedCase = normalizeCaseData(caseData);
                              setCaseData(normalizedCase);
                              console.log("✅ Consistency expanded", data.cached ? "(cached)" : "");
                            }
                          }
                        } catch (err) {
                          console.error("Failed to expand consistency:", err);
                          alert(`Failed to expand consistency: ${err.message}`);
                        } finally {
                          setExpanding(false);
                        }
                      }}
                      disabled={expanding || loading}
                      className="px-3 py-1 bg-gray-200 rounded text-sm"
                      style={{
                        padding: '0.5rem 0.75rem',
                        backgroundColor: '#e5e7eb',
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem',
                        border: 'none',
                        cursor: (expanding || loading) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontWeight: '500',
                        color: '#374151',
                        opacity: (expanding || loading) ? 0.6 : 1
                      }}
                    >
                      ✓ Consistency
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions (end-of-page only) */}
          <div className="flex gap-2 mt-4 max-w-3xl mx-auto px-6" style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', maxWidth: '48rem', marginLeft: 'auto', marginRight: 'auto', padding: '0 1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={generateCase}
              disabled={loading || !effectiveTopic}
              className="bg-blue-600 text-white px-6 py-2 rounded-full text-sm font-medium shadow-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
            >
              {loading
                ? (caseMode === "simulation" ? "Generating Simulation..." : caseMode === "gamified" ? "Generating Quiz..." : "Generating Case...")
                : (caseMode === "simulation" ? "Generate Simulation" : caseMode === "gamified" ? "Generate Quiz" : "Generate Case")}
            </button>

            {caseData && (
              <>
                <button type="button" onClick={saveCase} className="px-3 py-1 bg-green-200 rounded text-sm" style={{ padding: '0.5rem 0.75rem', backgroundColor: '#bbf7d0', borderRadius: '0.25rem', fontSize: '0.875rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: '500', color: '#166534' }}>
                  <Save size={16} /> Save
                </button>
                <button type="button" onClick={copyToClipboard} className="px-3 py-1 bg-gray-200 rounded text-sm" style={{ padding: '0.5rem 0.75rem', backgroundColor: '#e5e7eb', borderRadius: '0.25rem', fontSize: '0.875rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: '500', color: '#374151' }}>
                  <Copy size={16} /> Copy
                </button>
                <button type="button" onClick={downloadPDF} className="px-3 py-1 bg-gray-200 rounded text-sm" style={{ padding: '0.5rem 0.75rem', backgroundColor: '#e5e7eb', borderRadius: '0.25rem', fontSize: '0.875rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: '500', color: '#374151' }}>
                  <FileDown size={16} /> PDF
                </button>
                <button type="button" onClick={() => alert("Share link feature coming soon!")} className="px-3 py-1 bg-gray-200 rounded text-sm" style={{ padding: '0.5rem 0.75rem', backgroundColor: '#e5e7eb', borderRadius: '0.25rem', fontSize: '0.875rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: '500', color: '#374151' }}>
                  <Share2 size={16} /> Share
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
