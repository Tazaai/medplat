// ~/medplat/frontend/src/components/Level2CaseLogic.jsx
const IconPlaceholder = () => (<svg width="16" height="16" style={{background:"#ccc"}}></svg>);
import React, { useState } from "react";
import useLevel2CaseEngine from "./useLevel2CaseEngine";

export default function Level2CaseLogic({
  text = "",
  gamify = true,
  caseId = "unknown_case",
  model = "gpt-4o-mini",
  autostartQuiz = true,
  hideHistoryIntro = true,
  explanationsAtEnd = true,
  locale = "DK",
}) {
  const {
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
  } = useLevel2CaseEngine({
    text,
    gamify,
    caseId,
    model,
    autostartQuiz,
    hideHistoryIntro,
    locale,
  });

  const [filter, setFilter] = useState("all"); // "all" | "partial" | "wrong"

  if (loading) return <div className="p-4">Loading interactive case…</div>;
  if (error) return <div className="p-4 text-red-700">Error: {error}</div>;
  if (!gamify) return <pre className="p-4 whitespace-pre-wrap">{text}</pre>;

  // Intro (optional)
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

  // Compute filtered indexes WITHOUT useMemo (avoids hook noise)
  const filteredIndexes = (() => {
    const arr = [];
    for (let i = 0; i < mcqs.length; i++) {
      const s = selections[i]?.score ?? 0;
      if (filter === "all" || (filter === "partial" && s > 0 && s < 3) || (filter === "wrong" && s === 0)) {
        arr.push(i);
      }
    }
    return arr;
  })();

  // Review mode
  if (reviewMode) {
    const encouragement =
      pct < 40
        ? "Keep going — you're warming up."
        : pct < 60
        ? "Nice progress — solid student level."
        : pct < 80
        ? "Great work — approaching doctor level."
        : pct < 90
        ? "Strong performance — specialist level."
        : "Outstanding — expert level!";

    return (
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-semibold">Quiz Completed</h2>
        <div className="p-3 rounded border bg-green-50">
          <div className="font-medium">
            ✅ Final Score: {totalScore} / {maxScore} ({pct}%)
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Scoring legend: 🟩 3 points, 🟨 2 points, 🟥 0 points.
          </div>
          <div className="text-sm mt-1">{encouragement}</div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600 mr-1">Review:</span>
          <button
            className={`px-2 py-1 border rounded ${filter === "all" ? "bg-gray-200" : ""}`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            className={`px-2 py-1 border rounded ${filter === "partial" ? "bg-gray-200" : ""}`}
            onClick={() => setFilter("partial")}
          >
            Partial
          </button>
          <button
            className={`px-2 py-1 border rounded ${filter === "wrong" ? "bg-gray-200" : ""}`}
            onClick={() => setFilter("wrong")}
          >
            Wrong
          </button>
          <button
            className="px-2 py-1 border rounded"
            onClick={() => {
              const idx = selections.findIndex((x) => (x?.score ?? 0) === 0);
              if (idx >= 0) document.getElementById(`q${idx}`)?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Jump to first wrong
          </button>
        </div>

        <div className="space-y-4">
          {filteredIndexes.map((i) => {
            const item = mcqs[i];
            const sel = selections[i]?.choiceIdx;
            const s = selections[i]?.score ?? 0;
            const tier =
              s === 3
                ? "bg-green-100 border-green-300"
                : s >= 1 && s < 3
                ? "bg-yellow-100 border-yellow-300"
                : "bg-red-100 border-red-300";
            const statusLabel = s === 3 ? "Correct" : s >= 1 && s < 3 ? "Partial" : "Wrong";
            const correctIdx = (item.choices || []).findIndex((c) => c.score === 3);
            const correctText = correctIdx >= 0 ? item.choices[correctIdx]?.text : "";
            const chosen = typeof sel === "number" ? item.choices?.[sel] : null;

            return (
              <div key={i} id={`q${i}`} className={`p-3 border rounded ${tier}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm text-gray-600">
                    Question {i + 1} — {item.section || "section"}
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      s === 3 ? "bg-green-200" : s > 0 && s < 3 ? "bg-yellow-200" : "bg-red-200"
                    }`}
                  >
                    {statusLabel}
                  </span>
                </div>

                {item.paragraph && (
                  <div className="bg-yellow-50 p-2 border rounded mb-2">
                    <strong>Context:</strong> {item.paragraph}
                  </div>
                )}

                <div className="font-semibold mb-2">{item.prompt}</div>

                <ul className="space-y-1">
                  {(item.choices || []).map((c, idx) => {
                    const isChosen = idx === sel;
                    const badge = c.score === 3 ? "✅" : c.score >= 1 && c.score < 3 ? "⚠️" : "❌";
                    const color =
                      c.score === 3
                        ? "text-green-800"
                        : c.score >= 1 && c.score < 3
                        ? "text-yellow-800"
                        : "text-red-800";
                    return (
                      <li key={idx} className={`text-sm ${isChosen ? "font-semibold" : ""} ${color}`}>
                        {badge} {c.text} {isChosen ? "(you chose)" : ""}
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-2 text-sm">
                  {typeof correctIdx === "number" && correctIdx >= 0 && (
                    <div className="mt-1">
                      <span className="font-semibold">Correct answer:</span> {correctText}
                    </div>
                  )}
                  {chosen?.explanation && (
                    <div className="mt-1">
                      <span className="font-semibold">Explanation for your choice:</span>{" "}
                      {chosen.explanation}
                    </div>
                  )}
                  {correctIdx >= 0 &&
                    item.choices?.[correctIdx]?.explanation &&
                    sel !== correctIdx && (
                      <div className="mt-1">
                        <span className="font-semibold">Why the correct option is best:</span>{" "}
                        {item.choices[correctIdx].explanation}
                      </div>
                    )}
                </div>

                {Array.isArray(item.rationalePanel) && item.rationalePanel.length > 0 && (
                  <div className="mt-2 text-sm">
                    <div className="font-semibold mb-1">Expert panel notes:</div>
                    <ul className="list-disc ml-5 space-y-1">
                      {item.rationalePanel.map((r, k) => (
                        <li key={k}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {Array.isArray(item.references) && item.references.length > 0 && (
                  <div className="mt-2 text-xs text-gray-700">
                    <div className="font-semibold mb-1">References:</div>
                    <ul className="list-disc ml-5 space-y-0.5">
                      {item.references.slice(0, 4).map((ref, k) => (
                        <li key={k}>{ref}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // In-quiz
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
          const immediate =
            !explanationsAtEnd &&
            answered &&
            idx === chosenIdx &&
            (c.score === 3
              ? "bg-green-200"
              : c.score >= 1 && c.score < 3
              ? "bg-yellow-200"
              : "bg-red-200");

          return (
            <li key={idx}>
              <button
                onClick={() => handleChoice(idx)}
                disabled={answered}
                className={`w-full text-left px-3 py-2 border rounded ${
                  chosen ? "ring-2 ring-blue-400" : ""
                } ${immediate || ""}`}
              >
                {c.text}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex items-center gap-2">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          onClick={handleNext}
          disabled={!answered}
        >
          {stepIndex + 1 < mcqs.length ? "Next" : "Finish & Review"}
        </button>
        {!explanationsAtEnd && answered && q.choices?.[chosenIdx]?.explanation && (
          <span className="text-sm ml-2">{q.choices[chosenIdx].explanation}</span>
        )}
      </div>
    </div>
  );
}
