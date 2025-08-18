// ~/medplat/frontend/src/components/useLevel2CaseEngine.js
import { useState, useEffect } from "react";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://medplat-backend-139218747785.europe-west1.run.app";

// Robust JSON guard
async function getJsonOrThrow(res) {
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0,200)}`);
  if (!ct.includes("application/json"))
    throw new Error(`Expected JSON, got ${ct}. Body: ${text.slice(0,200)}`);
  return JSON.parse(text);
}

function normalizeLang(locale) {
  if (!locale) return "en";
  const s = String(locale).trim().toLowerCase();
  if (s === "dk") return "da";
  if (s.length > 2 && s.includes("-")) return s; // e.g., en-GB
  return s.slice(0, 2);
}

export default function useLevel2CaseEngine({
  text,
  gamify,
  caseId,
  model,
  autostartQuiz,
  hideHistoryIntro,
  locale,
}) {
  const [loading, setLoading] = useState(gamify);
  const [shortHistory, setShortHistory] = useState("");
  const [mcqs, setMcqs] = useState([]);
  const [stepIndex, setStepIndex] = useState(-1);
  const [answered, setAnswered] = useState(false);
  const [chosenIdx, setChosenIdx] = useState(null);
  const [selections, setSelections] = useState([]);
  const [reviewMode, setReviewMode] = useState(false);
  const [error, setError] = useState("");

  const runningTotal = selections.reduce((sum, s) => sum + (s?.score || 0), 0);
  const totalScore = runningTotal;
  const maxScore = mcqs.reduce(
    (sum, q) => sum + Math.max(...(q.choices?.map((c) => c.score) || [0])),
    0
  );
  const pct = maxScore ? Math.round((totalScore / maxScore) * 100) : 0;
  const q = mcqs[stepIndex] || null;

  useEffect(() => {
    if (!gamify) return;
    let aborted = false;
    setLoading(true);
    setError("");
    fetch(`${API_BASE}/api/gamify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: caseId,
        lang: normalizeLang(locale) || "en",
        level: 2,
        text,
        model,
      }),
    })
      .then(getJsonOrThrow)
      .then((data) => {
        if (aborted) return;
        if (data && Array.isArray(data.mcqs)) {
          setMcqs(data.mcqs);
          setShortHistory(data.shortHistory || "");
          if (autostartQuiz && hideHistoryIntro) setStepIndex(0);
        } else {
          setError("No MCQs received.");
        }
      })
      .catch((e) => {
        if (!aborted) setError(e.message || "Failed to load MCQs");
      })
      .finally(() => {
        if (!aborted) setLoading(false);
      });
    return () => {
      aborted = true;
    };
  }, [text, gamify, caseId, model, autostartQuiz, hideHistoryIntro, locale]);

  const beginQuiz = () => setStepIndex(0);

  const handleChoice = (idx) => {
    if (answered) return;
    setChosenIdx(idx);
    setAnswered(true);
    const choiceScore = q?.choices?.[idx]?.score || 0;
    setSelections((prev) => {
      const copy = [...prev];
      copy[stepIndex] = { choiceIdx: idx, score: choiceScore };
      return copy;
    });
  };

  const handleNext = () => {
    if (stepIndex + 1 < mcqs.length) {
      setStepIndex(stepIndex + 1);
      setAnswered(false);
      setChosenIdx(null);
    } else {
      setReviewMode(true);
    }
  };

  return {
    loading,
    error,
    shortHistory,
    mcqs,
    stepIndex,
    answered,
    chosenIdx,
    selections,
    reviewMode,
    runningTotal,
    totalScore,
    maxScore,
    pct,
    q,
    beginQuiz,
    handleChoice,
    handleNext,
  };
}
