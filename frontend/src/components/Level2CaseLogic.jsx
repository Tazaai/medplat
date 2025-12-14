// ~/medplat/frontend/src/components/Level2CaseLogic.jsx
import { useState, useEffect } from "react";
import useLevel2CaseEngine from "./useLevel2CaseEngine";
import { API_BASE } from "../config";
import { db } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import CaseSummaryPanel from "./CaseSummaryPanel";
import { safeFetchQuiz } from "../utils/safeFetch"; // Phase 7: Safe fetch with timeout and retry

/**
 * 🧭 @copilot: Adaptive Quiz UI with Tier-Based Feedback
 * 
 * See: docs/COPILOT_GUIDE.md for complete implementation guide
 * 
 * Current Implementation (Phase 2 - Expert Panel UI Enhancements):
 * ✅ Progress bar (0% → 100% visual feedback)
 * ✅ Guideline badges (ESC 2023, AHA/ACC 2022, NICE)
 * ✅ Adaptive feedback based on performance (<50% → detailed study tips)
 * ✅ Topic-specific weak area analysis (rhythm control, anticoagulation scoring)
 * 
 * Dynamic Features:
 * - Extract topic from caseData.meta.topic (NOT hardcoded)
 * - Analyze incorrect question types to generate targeted study recommendations
 * - Scale explanation depth based on quiz score
 * 
 * Next Phase (Tier-Based Scoring):
 * - Replace percentage display with tier system:
 *   🟢 Learner (<50%), 🔵 Skilled (50-79%), 🟣 Expert (80%+)
 * - Add streak tracking (consecutive correct answers)
 * - Implement motivational micro-feedback after each question
 * - Add achievement badges (First Perfect Score, 10-Day Streak, etc.)
 * 
 * Target Experience:
 * - Duolingo-style engagement (non-threatening, motivational)
 * - UpToDate-style evidence (collapsible guideline cards with DOI links)
 * - Adaptive difficulty (questions get harder/easier based on performance)
 */

export default function Level2CaseLogic({ caseData, gamify = true }) {
  const { uid } = useAuth() || {};
  const [reviewMode, setReviewMode] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [encouragement, setEncouragement] = useState("");
  const [realTimeEncouragement, setRealTimeEncouragement] = useState("");
  const [levelTitle, setLevelTitle] = useState("Medical Student");
  const {
    questions,
    setQuestions,
    currentIndex,
    answers,
    answerQuestion,
    continueToNext,
    resetQuiz,
    score,
    isComplete,
    isAnswering,
    showFeedback,
    lastAnswerCorrect,
    lastAnswerPoints,
    consecutiveCorrect,
    consecutiveIncorrect,
    currentDifficulty,
    questionTypes,
  } = useLevel2CaseEngine([]);

  // Fetch MCQs for this case (or use pre-generated MCQs from direct gamification)
  useEffect(() => {
    async function fetchMCQs() {
      console.log("🔍 Level2CaseLogic: fetchMCQs called, checking caseData.mcqs...");
      console.log("🔍 caseData:", caseData);
      console.log("🔍 caseData.mcqs exists?", !!caseData?.mcqs);
      console.log("🔍 caseData.mcqs is array?", Array.isArray(caseData?.mcqs));
      
      // If MCQs already exist in caseData (from universal system or direct gamification), use them directly
      if (caseData?.mcqs && Array.isArray(caseData.mcqs) && caseData.mcqs.length > 0) {
        console.log("✅ Using pre-generated MCQs from universal system, count:", caseData.mcqs.length);
        setQuestions(caseData.mcqs);
        setLoading(false);
        return;
      }
      
      console.log("⚠️ No pre-generated MCQs found, fetching from /api/gamify...");
      // Otherwise, fetch MCQs via /api/gamify (traditional flow)
      setLoading(true);
      try {
        // Phase 7: Use safe fetch with 90-second timeout and retry logic
        const res = await safeFetchQuiz(`${API_BASE}/api/gamify`, {
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
        } else {
          console.error("❌ Invalid MCQ data received:", data);
        }
      } catch (e) {
        console.error("MCQ fetch failed:", e);
        // Phase 7: Better error handling
        if (e.name === 'AbortError') {
          console.warn("⚠️ MCQ generation timed out. Please try again.");
        }
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
  // Formative feedback - positive and growth-oriented with specific study guidance
  useEffect(() => {
    if (!reviewMode) return;
    const maxScore = questions.length * 3; // 12 questions × 3 points = 36
    const percentage = (score / maxScore) * 100;
    const topicHint = caseData?.meta?.topic || "core clinical topics";
    
    // Analyze weak areas based on question types answered incorrectly
    const incorrectTypes = questions
      .filter(q => {
        const ans = answers[q.id];
        if (!ans) return false;
        // Fix: Handle both string (choice text) and number (index) formats
        const ansText = typeof ans === 'string' ? ans : (q.choices && q.choices[ans]);
        return ansText !== q.correct;
      })
      .map(q => q.type || q.reasoning_type)
      .filter(Boolean);
    
    let studyGuidance = "";
    if (incorrectTypes.includes("data_interpretation")) studyGuidance += "vital sign/lab interpretation, ";
    if (incorrectTypes.includes("differential_diagnosis")) studyGuidance += "differential diagnosis reasoning, ";
    if (incorrectTypes.includes("management")) studyGuidance += "evidence-based management decisions, ";
    if (incorrectTypes.includes("complications")) studyGuidance += "complications and pathophysiology, ";
    if (studyGuidance) studyGuidance = `📖 Focus areas: ${studyGuidance.slice(0, -2)}`;
    
    if (percentage < 25) {
      setEncouragement(`🌱 Building Foundation — You're developing clinical reasoning skills. ${studyGuidance || `Review core concepts in ${topicHint} and practice differential diagnosis.`} Keep growing!`);
    } else if (percentage < 50) {
      setEncouragement(`🎓 Developing Competence — You're recognizing key features. ${studyGuidance || `Next step: integrate diagnostic criteria and guideline recommendations for ${topicHint}.`}`);
    } else if (percentage < 75) {
      setEncouragement(`🩺 Strong Clinical Reasoning — Solid foundation! ${studyGuidance || `Work on complex management scenarios and risk stratification tools.`}`);
    } else if (percentage < 90) {
      setEncouragement(`👨‍⚕️ Specialist-Level Thinking — Excellent integration of clinical data and evidence! ${studyGuidance || `Fine-tune guideline nuances and resource-limited adaptations.`}`);
    } else {
      setEncouragement(`🏆 Expert-Level Mastery — Outstanding clinical reasoning and evidence-based decision making! ${studyGuidance || `You demonstrate comprehensive understanding of ${topicHint}.`}`);
    }
  }, [reviewMode, score, questions, answers, caseData]);

  // Optimized real-time encouragement engine (Duolingo-style)
  useEffect(() => {
    if (!showFeedback || lastAnswerCorrect === null) {
      setRealTimeEncouragement("");
      return;
    }

    const maxScore = questions.length * 3;
    const percentage = (score / maxScore) * 100;
    const category = caseData?.meta?.category || caseData?.meta?.topic || "this topic";
    const remaining = questions.length - currentIndex - 1;

    // Immediate feedback-based encouragement
    if (lastAnswerCorrect) {
      if (consecutiveCorrect >= 3) {
        const streakMessages = [
          "🔥🔥🔥 Amazing streak!",
          "⚡⚡⚡ On fire!",
          "🌟 Perfect! Keep going!",
          "💎 Master level!",
          "🚀 Unstoppable!"
        ];
        setRealTimeEncouragement(streakMessages[Math.floor(Math.random() * streakMessages.length)]);
      } else if (consecutiveCorrect >= 2) {
        const goodMessages = [
          "✨ Excellent!",
          "🎯 Great answer!",
          "👍 Perfect!",
          "⭐ Well done!",
          "💪 Strong work!"
        ];
        setRealTimeEncouragement(goodMessages[Math.floor(Math.random() * goodMessages.length)]);
      } else {
        setRealTimeEncouragement("✅ Correct! +" + lastAnswerPoints + " points");
      }
      
    } else {
      // Constructive feedback for incorrect answers
      const encouragingMessages = [
        "💡 Close! Let's learn together",
        "📚 Good effort! Here's why...",
        "🧠 Great thinking! Here's the key point...",
        "💪 Keep going! This will help...",
        "🎓 Learning moment! Review this..."
      ];
      setRealTimeEncouragement(encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)]);
    }
  }, [showFeedback, lastAnswerCorrect, lastAnswerPoints, consecutiveCorrect, score, currentIndex, questions.length, caseData]);

  // Save score and show summary when quiz is complete
  useEffect(() => {
    if (!isComplete || !caseData?.meta?.topic) return;

    const saveScoreAndShowSummary = async () => {
      try {
        const topic = caseData.meta.topic;
        const lang = caseData.meta.language || "en";
        const maxScore = questions.length * 3;
        const correctCount = questions.filter((q) => {
          const ans = answers[q.id];
          if (ans === undefined) return false;
          // Fix: Handle both string (choice text) and number (index) formats
          const ansText = typeof ans === 'string' ? ans : (q.choices && q.choices[ans]);
          return ansText === q.correct;
        }).length;
        
        // Save to Firebase (legacy)
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

        // Show summary panel
        setShowSummary(true);
      } catch (error) {
        console.warn("⚠️ Could not save score to Firebase:", error.message);
        setShowSummary(true); // Show summary anyway
      }
    };

    saveScoreAndShowSummary();
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
    
    // Extract unique guideline references from questions
    const guidelineRefs = [...new Set(
      questions
        .map(q => q.guideline_reference)
        .filter(Boolean)
    )];
    
    return (
      <div className="p-4 space-y-6">
        {/* Header with score and guideline badges */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Review Mode — All 12 Questions</h2>
            <div className="text-lg font-semibold">Score: {score} / {maxScore} ({Math.round((score/maxScore)*100)}%)</div>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                (score/maxScore) >= 0.9 ? 'bg-green-600' :
                (score/maxScore) >= 0.75 ? 'bg-blue-600' :
                (score/maxScore) >= 0.5 ? 'bg-yellow-500' :
                'bg-orange-500'
              }`}
              style={{ width: `${Math.round((score/maxScore)*100)}%` }}
            />
          </div>
          
          {/* Guideline badges */}
          {guidelineRefs.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-semibold text-gray-700">Evidence-based on:</span>
              {guidelineRefs.map((ref, i) => (
                <span 
                  key={i} 
                  className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold rounded-full shadow-sm"
                >
                  📚 {ref}
                </span>
              ))}
            </div>
          )}
        </div>
        
        {questions.map((q, idx) => {
          const chosen = answers[q.id];
          // Fix: Handle both string (choice text) and number (index) formats for backward compatibility
          const chosenText = typeof chosen === 'string' ? chosen : (q.choices && q.choices[chosen]);
          const isCorrect = chosenText === q.correct;
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
                  // Fix: Handle both string (choice text) and number (index) formats
                  const wasChosen = typeof chosen === 'string' 
                    ? c === chosen 
                    : i === chosen;
                  
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
                <p className="text-sm text-blue-800 mt-1">
                  {q.explanation || 'Explanation temporarily unavailable. Review the correct answer and underlying medical principles.'}
                </p>
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

  // Show summary panel if quiz is complete
  if (showSummary && isComplete) {
    const maxScore = questions.length * 3;
    const correctCount = questions.filter((q) => {
      const ans = answers[q.id];
      if (ans === undefined) return false;
      // Fix: Handle both string (choice text) and number (index) formats
      const ansText = typeof ans === 'string' ? ans : (q.choices && q.choices[ans]);
      return ansText === q.correct;
    }).length;

    return (
      <CaseSummaryPanel
        caseData={caseData}
        score={score}
        maxScore={maxScore}
        correctCount={correctCount}
        totalQuestions={questions.length}
        questionTypes={questionTypes}
        onClose={() => {
          setShowSummary(false);
          setReviewMode(true);
        }}
      />
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
          onClick={() => setShowSummary(true)}
        >
          📊 View Summary & Progress
        </button>
      </div>
    );
  }

  const maxScore = questions.length * 3;
  const percentage = Math.round((score / maxScore) * 100);
  const chosenAnswer = answers[q.id];
  const chosenText = typeof chosenAnswer === 'string' ? chosenAnswer : (q.choices && q.choices[chosenAnswer]);
  const isCorrect = chosenText === q.correct;
  const correctChoiceIndex = q.choices?.findIndex(c => c === q.correct) ?? -1;

  return (
    <div className="p-6 space-y-6">
      {/* Enhanced Progress header with prominent score */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Question {currentIndex + 1} of {questions.length}</p>
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-full shadow-lg">
              <span className="text-lg font-bold">{score}</span>
              <span className="text-sm opacity-90"> / {maxScore} points</span>
            </div>
            <div className="text-sm font-semibold text-gray-700">
              {percentage}% correct
            </div>
          </div>
        </div>
        
        {/* Enhanced progress bar */}
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
          <div 
            className={`h-full transition-all duration-500 ${
              percentage >= 90 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
              percentage >= 75 ? 'bg-gradient-to-r from-blue-500 to-purple-500' :
              percentage >= 50 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
              'bg-gradient-to-r from-orange-500 to-red-500'
            }`}
            style={{ width: `${((currentIndex + (showFeedback ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>
        
        {/* Question type badge */}
        {q.type && (
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
              {q.type.replace(/_/g, ' ').toUpperCase()}
            </span>
            {q.guideline_reference && (
              <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
                📚 {q.guideline_reference}
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Immediate feedback banner (shows after answering) */}
      {showFeedback && lastAnswerCorrect !== null && (
        <div className={`rounded-lg p-4 shadow-lg transition-all duration-500 ${
          lastAnswerCorrect 
            ? 'bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-400' 
            : 'bg-gradient-to-r from-red-100 to-orange-100 border-2 border-red-400'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{lastAnswerCorrect ? '✅' : '❌'}</span>
              <div>
                <p className={`text-lg font-bold ${lastAnswerCorrect ? 'text-green-800' : 'text-red-800'}`}>
                  {lastAnswerCorrect ? 'Correct!' : 'Incorrect'}
                </p>
                {lastAnswerCorrect && (
                  <p className="text-sm text-green-700">+{lastAnswerPoints} points earned</p>
                )}
              </div>
            </div>
            {realTimeEncouragement && (
              <p className={`text-sm font-semibold ${lastAnswerCorrect ? 'text-green-700' : 'text-red-700'}`}>
                {realTimeEncouragement}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Difficulty indicator and hint (before answering) */}
      {!showFeedback && currentDifficulty === 'easy' && consecutiveIncorrect >= 2 && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 mb-4">
          <p className="text-sm text-yellow-800">
            💡 <strong>Hint:</strong> Review the key concepts in {caseData?.meta?.topic || "this topic"}. 
            Consider the most common presentation and typical management approach.
          </p>
        </div>
      )}

      {!showFeedback && currentDifficulty === 'hard' && consecutiveCorrect >= 2 && (
        <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-3 mb-4">
          <p className="text-sm text-purple-800">
            🎯 <strong>Challenge Mode:</strong> You're doing great! This is a more advanced question.
          </p>
        </div>
      )}

      {/* Question card */}
      <div className="bg-white border-2 border-gray-300 rounded-lg p-6 shadow-md">
        <p className="text-xl font-semibold mb-6">{q.question}</p>
        
        <ul className="space-y-3">
          {q.choices.map((c, i) => {
            const isSelected = typeof chosenAnswer === 'number' ? chosenAnswer === i : chosenText === c;
            const isCorrectAnswer = c === q.correct;
            
            // Determine button styling based on feedback state
            let buttonClass = 'w-full text-left px-4 py-3 border-2 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 ';
            
            if (showFeedback) {
              // After feedback is shown
              if (isCorrectAnswer) {
                buttonClass += 'bg-green-100 border-green-500 text-green-800 font-semibold';
              } else if (isSelected && !isCorrect) {
                buttonClass += 'bg-red-100 border-red-500 text-red-800';
              } else {
                buttonClass += 'bg-gray-50 border-gray-300 text-gray-600 opacity-60';
              }
            } else {
              // Before answering
              if (isAnswering) {
                buttonClass += 'cursor-wait opacity-50 border-gray-300';
              } else if (isSelected) {
                buttonClass += 'bg-blue-100 border-blue-500 text-blue-800';
              } else {
                buttonClass += 'border-gray-300 hover:bg-blue-50 hover:border-blue-400 hover:shadow-sm';
              }
            }
            
            return (
              <li key={i}>
                <button
                  className={buttonClass}
                  onClick={() => !showFeedback && answerQuestion(i)}
                  disabled={isAnswering || showFeedback}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{c}</span>
                    {showFeedback && isCorrectAnswer && (
                      <span className="text-green-600 font-bold text-xl">✓</span>
                    )}
                    {showFeedback && isSelected && !isCorrect && (
                      <span className="text-red-600 font-bold text-xl">✗</span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      
      {/* Immediate explanation panel (shows after answering) */}
      {showFeedback && q.explanation && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-400 rounded-lg p-5 shadow-md transition-all duration-500">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-2xl">💡</span>
            <h3 className="text-lg font-bold text-blue-900">Explanation</h3>
          </div>
          <p className="text-blue-800 leading-relaxed">{q.explanation}</p>
        </div>
      )}

      {/* Continue button (shows after feedback) */}
      {showFeedback && (
        <button
          onClick={continueToNext}
          className={`w-full py-4 px-6 rounded-lg text-lg font-bold shadow-lg transition-all duration-300 transform hover:scale-105 ${
            lastAnswerCorrect
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
              : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600'
          }`}
        >
          {currentIndex + 1 < questions.length ? 'Continue →' : 'View Results →'}
        </button>
      )}
    </div>
  );
}

