// ~/medplat/frontend/src/components/Level2CaseLogic.jsx
import React from "react";
import useLevel2CaseEngine from "./useLevel2CaseEngine";

export default function Level2CaseLogic({
  text = "",
  gamify = true,
  caseId = "unknown_case",
  model = "gpt-4o-mini",
  autostartQuiz = true,
  hideHistoryIntro = true,
  explanationsAtEnd = true,
  locale = "DK"
}) {
  const {
    loading, shortHistory, mcqs,
    stepIndex, answered, chosenIdx, selections,
    reviewMode, runningTotal, totalScore, maxScore, pct, q,
    beginQuiz, handleChoice, handleNext,
  } = useLevel2CaseEngine({ text, gamify, caseId, model, autostartQuiz, hideHistoryIntro, locale });

  if (loading) return <div className="p-4">Loading interactive case…</div>;
  if (!gamify) return <pre className="p-4 whitespace-pre-wrap">{text}</pre>;

  if (!reviewMode && stepIndex === -1 && !hideHistoryIntro) {
    return (
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-2">Short Case History</h2>
        <p className="mb-4">{shortHistory || "No summary available."}</p>
        <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={beginQuiz}>
          Start Quiz
        </button>
      </div>
    );
  }

  if (reviewMode) {
    const encouragement =
      pct < 40 ? "Keep going — you're warming up."
      : pct < 60 ? "Nice progress — solid student level."
      : pct < 80 ? "Great work — approaching doctor level."
      : pct < 90 ? "Strong performance — specialist level."
      : "Outstanding — expert level!";

    return (
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-semibold">Quiz Completed</h2>
        <div className="p-3 rounded border bg-green-50">
          <div className="font-medium">✅ Final Score: {totalScore} / {maxScore} ({pct}%)</div>
          <div className="text-xs text-gray-600 mt-1">Scoring legend: 🟩 3 points, 🟨 2 points, 🟥 0 points.</div>
          <div className="text-sm mt-1">{encouragement}</div>
        </div>

        <div className="space-y-4">
          {mcqs.map((q, i) => {
            const sel = selections[i]?.choiceIdx;
            const s = selections[i]?.score ?? 0;
            const tier =
              s === 3 ? "bg-green-100 border-green-300"
              : (s >= 1 && s < 3) ? "bg-yellow-100 border-yellow-300"
              : "bg-red-100 border-red-300";

            return (
              <div key={i} className={`p-3 border rounded ${tier}`}>
                <div className="text-sm text-gray-600 mb-1">Question {i + 1} — {q.section || "section"}</div>
                {q.paragraph && (
                  <div className="bg-yellow-50 p-2 border rounded mb-2">
                    <strong>Context:</strong> {q.paragraph}
                  </div>
                )}
                <div className="font-semibold mb-2">{q.prompt}</div>
                <ul className="space-y-1">
                  {(q.choices || []).map((c, idx) => {
                    const isChosen = idx === sel;
                    const badge = c.score === 3 ? "✅" : (c.score >= 1 && c.score < 3) ? "⚠️" : "❌";
                    const color = c.score === 3 ? "text-green-800" : (c.score >= 1 && c.score < 3) ? "text-yellow-800" : "text-red-800";
                    return (
                      <li key={idx} className={`text-sm ${isChosen ? "font-semibold" : ""} ${color}`}>
                        {badge} {c.text} {isChosen ? "(you chose)" : ""}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (!q) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-2">No questions available</h2>
        <p className="text-sm text-gray-600">Try regenerating the case.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-2 text-sm text-gray-600">
        Question {stepIndex + 1} of {mcqs.length} — Score: {runningTotal}
      </div>

      {q.paragraph && (
        <div className="bg-yellow-50 p-3 border rounded mb-3">
          <strong>Context:</strong> {q.paragraph}
        </div>
      )}

      <div className="font-semibold mb-2">{q.prompt}</div>

      <ul className="space-y-2">
        {(q.choices || []).map((c, idx) => {
          const chosen = answered && idx === chosenIdx;

          let marker = "•";
          if (answered) {
            if (c.score === 3) marker = "✅";
            if (chosen && c.score !== 3) marker = (c.score >= 1 ? "⚠️" : "❌");
          }

          const chosenRing = chosen ? "ring-2 ring-blue-400" : "";
          const bgWhenAnswered =
            answered
              ? (c.score === 3 ? "bg-green-50 border-green-300"
                 : (chosen ? (c.score >= 1 ? "bg-yellow-50 border-yellow-300" : "bg-red-50 border-red-300")
                           : "bg-white"))
              : "bg-white";

          return (
            <li key={idx}>
              <button
                onClick={() => handleChoice(idx)}
                disabled={answered}
                className={`w-full text-left px-3 py-2 border rounded flex items-center gap-2 ${chosenRing} ${bgWhenAnswered} ${answered ? "cursor-not-allowed" : "hover:shadow"}`}
              >
                <span className="w-6 text-lg">{marker}</span>
                <span>{c.text}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-3">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          onClick={handleNext}
          disabled={!answered}
        >
          {stepIndex + 1 < mcqs.length ? "Next" : "Finish & Review"}
        </button>
      </div>
    </div>
  );
}
