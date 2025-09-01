// ~/medplat/frontend/src/components/Level2CaseLogic.jsx
import { useState, useEffect } from "react";
import useLevel2CaseEngine from "./useLevel2CaseEngine";
import { API_BASE } from "../config";

export default function Level2CaseLogic({ caseData, gamify = true }) {
  const [reviewMode, setReviewMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [encouragement, setEncouragement] = useState("");
  const {
    questions,
    setQuestions,
    currentIndex,
    answers,
    answerQuestion,
    resetQuiz,
    score,
  } = useLevel2CaseEngine([]);

  // Fetch MCQs for this case
  useEffect(() => {
    async function fetchMCQs() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/gamify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseId: caseData?.meta?.case_id,
            text: JSON.stringify(caseData),
          }),
        });
        const data = await res.json();
        if (data?.ok && Array.isArray(data.mcqs)) {
          setQuestions(data.mcqs);
        }
      } catch (e) {
        console.error("MCQ fetch failed:", e);
      } finally {
        setLoading(false);
      }
    }
    if (gamify && caseData) fetchMCQs();
  }, [caseData, gamify, setQuestions]);

  // Encouragement messages
  useEffect(() => {
    if (!reviewMode) return;
    if (score <= 3) setEncouragement("📚 Keep practicing — you're below Medical Student level.");
    else if (score <= 6) setEncouragement("🎓 Good job — Medical Student level!");
    else if (score <= 9) setEncouragement("🩺 Strong reasoning — Doctor level!");
    else if (score <= 12) setEncouragement("👨‍⚕️ Excellent — Specialist level!");
    else setEncouragement("🏆 Outstanding — Expert panel level!");
  }, [reviewMode, score]);

  if (!gamify) {
    return (
      <div className="p-4">
        <pre className="whitespace-pre-wrap">{JSON.stringify(caseData, null, 2)}</pre>
      </div>
    );
  }

  if (loading) return <div className="p-4">⏳ Generating quiz...</div>;
  if (!questions.length) return <div className="p-4">⚠️ No questions available</div>;

  // In review mode: show all questions, answers, explanations
  if (reviewMode) {
    return (
      <div className="p-4 space-y-6">
        <h2 className="text-xl font-bold">Review Mode</h2>
        {questions.map((q, idx) => {
          const chosen = answers[q.id];
          return (
            <div key={q.id} className="border rounded p-3">
              <p className="font-semibold">{idx + 1}. {q.question}</p>
              <ul className="mt-2 space-y-1">
                {q.choices.map((c, i) => (
                  <li
                    key={i}
                    className={`p-1 rounded ${
                      c === q.correct
                        ? "bg-green-200"
                        : c === chosen
                        ? "bg-red-200"
                        : ""
                    }`}
                  >
                    {c}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm italic">💡 {q.explanation}</p>
            </div>
          );
        })}
        <div className="mt-4 p-2 bg-blue-100 rounded">{encouragement}</div>
        <button
          className="mt-4 px-4 py-2 bg-gray-200 rounded"
          onClick={resetQuiz}
        >
          🔄 Try Again
        </button>
      </div>
    );
  }

  // Normal quiz mode
  const q = questions[currentIndex];
  if (!q) {
    return (
      <div className="p-4">
        <p className="text-lg font-bold">Quiz finished!</p>
        <p>Your score: {score} / {questions.length * 3}</p>
        <button
          className="mt-4 px-4 py-2 bg-blue-200 rounded"
          onClick={() => setReviewMode(true)}
        >
          📖 Review Answers
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <p className="font-semibold">{currentIndex + 1}. {q.question}</p>
      <ul className="space-y-2">
        {q.choices.map((c, i) => (
          <li key={i}>
            <button
              className="w-full text-left px-3 py-2 border rounded hover:bg-gray-100"
              onClick={() => answerQuestion(q.id, c, c === q.correct ? 3 : 0)}
            >
              {c}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

