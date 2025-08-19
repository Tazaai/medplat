// ~/medplat/frontend/src/components/useLevel2CaseEngine.js
import { useEffect, useMemo, useState } from "react";
import { db, auth } from "../firebaseConfig";
import { collection, addDoc, Timestamp } from "firebase/firestore";

// ✅ Point to your current Cloud Run URL
const API_BASE = import.meta.env.VITE_API_BASE || "https://medplat-backend-139218747785.europe-west1.run.app";

// ---------- small utils ----------
function shuffle(a) {
  const arr = [...(a || [])];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function cleanHistory(s = "") {
  let h = String(s).trim();
  h = h.replace(/^"?patient history"?\s*\{?/i, "");
  h = h.replace(/^\{|\}$/g, "");
  h = h.replace(/"(\w[^"]*)"\s*:\s*/g, "");
  h = h.replace(/[,;]\s*/g, ". ");
  h = h.replace(/\s{2,}/g, " ").trim();
  return h;
}

function deriveShortHistory(text = "") {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const usable = lines.filter((l) => !/^"?patient history"?\s*\{?/i.test(l));
  const hit =
    usable.find((l) => /^i+\./i.test(l)) ||
    usable.find((l) => /history|presentation|complaint/i.test(l)) ||
    usable.slice(0, 2).join(" ");
  return cleanHistory(hit || "");
}

function clampTo12(items = []) {
  if (items.length === 12) return items;
  if (items.length > 12) return items.slice(0, 12);
  const pad = Array.from({ length: 12 - items.length }, (_, k) => ({
    index: items.length + k,
    section: "extra",
    prompt: "Additional review question (placeholder)",
    paragraph: "",
    choices: [
      { text: "—", score: 0 },
      { text: "—", score: 0 },
      { text: "—", score: 0 },
      { text: "—", score: 0 }
    ],
    answerIndex: 0,
    rationalePanel: [],
    references: []
  }));
  return [...items, ...pad];
}

function reorderForGating(items = []) {
  // enforce: Q1–Q3 no diagnosis/differential/management
  const earlyBan = new Set(["diagnosis", "differential", "management", "therapy", "treatment"]);
  const early = [], mid = [];
  items.forEach((q) => {
    const sec = (q.section || "").toLowerCase();
    if (early.length < 3) {
      if (earlyBan.has(sec)) mid.push(q);
      else early.push(q);
    } else {
      mid.push(q);
    }
  });
  return [...early, ...mid];
}

// ---------- shared engine hook ----------
export default function useLevel2CaseEngine({
  text = "",
  gamify = true,
  caseId = "unknown_case",
  model = "gpt-4o-mini",
  autostartQuiz = true,
  hideHistoryIntro = true,
  locale = "DK"
}) {
  const [shortHistory, setShortHistory] = useState("");
  const [mcqs, setMcqs] = useState([]);
  const [stepIndex, setStepIndex] = useState(-1);
  const [answered, setAnswered] = useState(false);
  const [chosenIdx, setChosenIdx] = useState(null);
  const [selections, setSelections] = useState([]); // {choiceIdx, score}
  const [loading, setLoading] = useState(true);
  const [reviewMode, setReviewMode] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [questionStart, setQuestionStart] = useState(null);
  const [timePerQuestion, setTimePerQuestion] = useState([]);

  const userId = auth.currentUser?.uid || "anonymous";

  // Fetch MCQs
  useEffect(() => {
    if (!gamify || !String(text).trim()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const fetchMCQs = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/gamify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text, model, caseId, userId, locale, request: { targetCount: 12 }
          })
        });

        // ✅ Handle non-200s cleanly (avoid parsing HTML error as JSON)
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} on /api/gamify`);
        }

        const data = await res.json();

        const hist = cleanHistory(data.shortHistory || deriveShortHistory(text));
        let list = Array.isArray(data.mcqs) ? data.mcqs : [];

        // normalize each item
        list = list.map((q, i) => ({
          ...q,
          index: q.index ?? i,
          section: q.section || "",
          prompt: q.prompt || q.question || "",
          paragraph: q.paragraph || q.context || "",
          choices: shuffle(
            (q.choices || []).map((c) =>
              typeof c === "string" ? { text: c, score: 0 } : c
            )
          ),
          answerIndex: typeof q.answerIndex === "number" ? q.answerIndex : undefined,
          rationalePanel: Array.isArray(q.rationalePanel) ? q.rationalePanel : [],
          references: Array.isArray(q.references) ? q.references : []
        }));

        list = reorderForGating(list);
        list = clampTo12(list);

        if (!cancelled) {
          setShortHistory(hist || "");
          setMcqs(list);
          setStartedAt(Date.now());
          if (hideHistoryIntro && autostartQuiz) {
            setStepIndex(0);
            setQuestionStart(Date.now());
          } else {
            setStepIndex(-1);
          }
        }
      } catch (e) {
        console.error("MCQ fetch failed:", e);
        if (!cancelled) {
          setShortHistory(deriveShortHistory(text));
          setMcqs([]);
          setStepIndex(-1);
        }
      } finally {
        !cancelled && setLoading(false);
      }
    };
    fetchMCQs();
    return () => { cancelled = true; };
  }, [text, gamify, caseId, model, userId, locale, autostartQuiz, hideHistoryIntro]);

  // Derived totals
  const runningTotal = useMemo(
    () => selections.reduce((a, b) => a + (b?.score ?? 0), 0),
    [selections]
  );
  const totalScore = runningTotal;
  const maxScore = useMemo(() => (mcqs.length || 0) * 3 || 1, [mcqs.length]);
  const pct = useMemo(() => Math.round((totalScore / maxScore) * 100), [totalScore, maxScore]);

  // Actions
  const beginQuiz = () => { setStepIndex(0); setQuestionStart(Date.now()); };

  const handleChoice = (idx) => {
    if (answered) return;
    setChosenIdx(idx);
    setAnswered(true);
    // log selection immediately (no explanations mid-quiz)
    const q = mcqs[stepIndex];
    const chosen = q?.choices?.[idx];
    const score = chosen?.score ?? 0;
    setSelections((s) => [...s, { choiceIdx: idx, score }]);
    addDoc(collection(db, "user_scores"), {
      userId, caseId, level: 2, step: stepIndex,
      selected: chosen?.text || "", score, model, locale,
      timestamp: Timestamp.now()
    }).catch(() => {});
  };

  const handleNext = () => {
    if (!answered) return;
    const now = Date.now();
    const ms = questionStart ? now - questionStart : 0;
    setTimePerQuestion((t) => [...t, ms]);
    setAnswered(false);
    setChosenIdx(null);

    if (stepIndex + 1 >= mcqs.length) {
      setReviewMode(true);
      addDoc(collection(db, "user_scores"), {
        userId, caseId, level: 2,
        totalScore,
        maxScore,
        percent: pct,
        model, locale,
        timePerQuestion: [...timePerQuestion, ms],
        startedAt: startedAt ? new Date(startedAt).toISOString() : null,
        finishedAt: new Date().toISOString(),
        timestamp: Timestamp.now(),
        summary: "Level 2 completed"
      }).catch(() => {});
    } else {
      setStepIndex((i) => i + 1);
      setQuestionStart(Date.now());
    }
  };

  // Current question
  const q = mcqs[stepIndex] || null;

  return {
    // state
    loading, gamify, shortHistory, mcqs,
    stepIndex, answered, chosenIdx, selections,
    reviewMode, startedAt, questionStart, timePerQuestion,
    // computed
    runningTotal, totalScore, maxScore, pct, q,
    // actions
    beginQuiz, handleChoice, handleNext,
  };
}
