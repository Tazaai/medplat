// ~/medplat/frontend/src/components/Level2CaseLogic.jsx
import { useState, useEffect } from "react";
import useLevel2CaseEngine from "./useLevel2CaseEngine";
import { API_BASE } from "../config";
import { db } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

/**
 * 🧭 Copilot Guide — Global Clinical Context & Dynamic Panels
 *
 * Goal: Make case management, diagnostics, and expert debate globally relevant,
 * evidence-based, and adaptive to context.
 *
 * Instructions:
 * 1) Generate practical, high-level reasoning across specialties (not single-topic).
 *    - Include modality choices and rationale (e.g., CT vs MRI: sensitivity & timing;
 *      LP indications; US vs X-ray for pneumothorax; MRI vs CT for spondylodiscitis).
 *    - Explain when, why, and duration/sensitivity where relevant.
 *
 * 2) Ensure the expert conference panel is dynamic (not hardcoded).
 *    - Members adapt to case type (e.g., Neurology -> Neurologist, Neuroradiologist, ICU, Emergency).
 *    - Each discussion should show concise, multidisciplinary evidence-based reasoning.
 *
 * 3) Use evidence-based, global guidelines loaded dynamically (ESC / NICE / AHA / WHO / local).
 *    - Do NOT include static citations or regional placeholders.
 *
 * 4) Keep outputs globally applicable — logic must generalize across regions and disease areas.
 *
 * Result: Professional, globally consistent case output with dynamic panels, modality
 * reasoning, and guideline-driven explanations.
 */

export default function Level2CaseLogic({ caseData, gamify = true }) {
  const [reviewMode, setReviewMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [encouragement, setEncouragement] = useState("");
  const [levelTitle, setLevelTitle] = useState("Medical Student");
  const {
    questions,
    setQuestions,
    currentIndex,
    answers,
    answerQuestion,
    resetQuiz,
    score,
    isComplete,
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
            caseId: caseData?.meta?.topic || "unknown_case",
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

  // Determine level title based on score
  useEffect(() => {
    const maxScore = questions.length * 3;
    const percentage = (score / maxScore) * 100;
    
    if (percentage >= 90) setLevelTitle("Expert");
    else if (percentage >= 75) setLevelTitle("Specialist");
    else if (percentage >= 50) setLevelTitle("Doctor");
    else setLevelTitle("Medical Student");
  }, [score, questions.length]);

  // Encouragement messages (scaled for 12 questions, 36 max points)
  useEffect(() => {
    if (!reviewMode) return;
    const maxScore = questions.length * 3; // 12 questions × 3 points = 36
    const percentage = (score / maxScore) * 100;
    
    if (percentage < 25) setEncouragement("📚 Keep practicing — you're below Medical Student level.");
    else if (percentage < 50) setEncouragement("🎓 Good job — Medical Student level!");
    else if (percentage < 75) setEncouragement("🩺 Strong reasoning — Doctor level!");
    else if (percentage < 90) setEncouragement("👨‍⚕️ Excellent — Specialist level!");
    else setEncouragement("🏆 Outstanding — Expert panel level!");
  }, [reviewMode, score, questions.length]);

  // Save score to Firebase when quiz is complete
  useEffect(() => {
    if (!isComplete || !caseData?.meta?.topic) return;

    const saveScore = async () => {
      try {
        const topic = caseData.meta.topic;
        const lang = caseData.meta.language || "en";
        const maxScore = questions.length * 3;
        
        const scoreDoc = {
          topic,
          lang,
          score,
          maxScore,
          percentage: Math.round((score / maxScore) * 100),
          level: 2,
          levelTitle,
          questionCount: questions.length,
          answers: Object.keys(answers).length,
          timestamp: serverTimestamp(),
          caseId: `${topic}_${Date.now()}`,
        };

        const docRef = doc(db, "quiz_scores", `${topic}_${Date.now()}`);
        await setDoc(docRef, scoreDoc);
        console.log("✅ Score saved to Firebase");
      } catch (error) {
        console.warn("⚠️ Could not save score to Firebase:", error.message);
      }
    };

    saveScore();
  }, [isComplete, score, levelTitle, questions.length, answers, caseData]);

  if (!gamify) {
    return (
      <div className="p-4">
        <pre className="whitespace-pre-wrap">{JSON.stringify(caseData, null, 2)}</pre>
      </div>
    );
  }

  if (loading) return <div className="p-4">⏳ Generating quiz...</div>;
  if (!questions.length) return <div className="p-4">⚠️ No questions available</div>;

  // In review mode: show all 12 questions with color-coded results and delayed explanations
  if (reviewMode) {
    const maxScore = questions.length * 3;
    return (
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Review Mode — All 12 Questions</h2>
          <div className="text-lg font-semibold">Score: {score} / {maxScore} ({Math.round((score/maxScore)*100)}%)</div>
        </div>
        
        {questions.map((q, idx) => {
          const chosen = answers[q.id];
          const isCorrect = chosen === q.correct;
          const earnedPoints = isCorrect ? 3 : (chosen ? 0 : null); // null if not answered
          
          return (
            <div key={q.id} className="border-2 rounded-lg p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <p className="font-semibold text-lg">Q{idx + 1}. {q.question}</p>
                {earnedPoints !== null && (
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                    earnedPoints === 3 ? 'bg-green-500 text-white' :
                    'bg-red-500 text-white'
                  }`}>
                    {earnedPoints === 3 ? '+3 ✓' : '0 ✗'}
                  </span>
                )}
              </div>
              
              <ul className="space-y-2 mb-3">
                {q.choices.map((c, i) => {
                  const isThisCorrect = c === q.correct;
                  const wasChosen = c === chosen;
                  
                  return (
                    <li
                      key={i}
                      className={`p-2 rounded-md border ${
                        isThisCorrect && wasChosen
                          ? "bg-green-100 border-green-500 font-semibold" // Correct answer chosen
                          : isThisCorrect
                          ? "bg-green-50 border-green-300" // Correct answer (not chosen)
                          : wasChosen
                          ? "bg-red-100 border-red-500" // Wrong answer chosen
                          : "bg-gray-50 border-gray-200" // Not chosen
                      }`}
                    >
                      {isThisCorrect && <span className="mr-2">✓</span>}
                      {wasChosen && !isThisCorrect && <span className="mr-2">✗</span>}
                      {c}
                    </li>
                  );
                })}
              </ul>
              
              <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                <p className="text-sm font-medium text-blue-900">💡 Expert Explanation:</p>
                <p className="text-sm text-blue-800 mt-1">{q.explanation}</p>
              </div>
            </div>
          );
        })}
        
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg shadow">
          <p className="text-xl font-bold text-center">{encouragement}</p>
        </div>
        
        <button
          className="w-full mt-4 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          onClick={resetQuiz}
        >
          🔄 Try Again with New Questions
        </button>
      </div>
    );
  }

  // Normal quiz mode: show current question, NO explanations until review
  const q = questions[currentIndex];
  if (!q) {
    const maxScore = questions.length * 3;
    return (
      <div className="p-6 text-center space-y-4">
        <div className="text-6xl">🎉</div>
        <p className="text-2xl font-bold">Quiz Completed!</p>
        <div className="text-3xl font-bold text-blue-600">
          {score} / {maxScore} points
        </div>
        <p className="text-lg text-gray-600">
          ({Math.round((score/maxScore)*100)}% correct)
        </p>
        <button
          className="mt-6 px-8 py-4 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700 transition shadow-lg"
          onClick={() => setReviewMode(true)}
        >
          📖 Review All Answers & Explanations
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Question {currentIndex + 1} of {questions.length}</p>
        <p className="text-sm font-semibold text-gray-700">Current Score: {score}</p>
      </div>
      
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-500 transition-all duration-300"
          style={{width: `${((currentIndex) / questions.length) * 100}%`}}
        />
      </div>
      
      <div className="bg-white border-2 border-gray-300 rounded-lg p-6 shadow-md">
        <p className="text-xl font-semibold mb-6">{q.question}</p>
        
        <ul className="space-y-3">
          {q.choices.map((c, i) => (
            <li key={i}>
              <button
                className="w-full text-left px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => {
                  const isCorrect = c === q.correct;
                  answerQuestion(q.id, c, isCorrect ? 3 : 0);
                }}
              >
                <span className="font-medium">{c}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      
      <p className="text-sm text-gray-500 text-center italic">
        💡 Explanations will be shown after completing all {questions.length} questions
      </p>
    </div>
  );
}

