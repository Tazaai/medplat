import { useState } from "react";

/**
 * Minimal engine hook for Level2CaseLogic.
 * Manages quiz state: questions, current index, answers, score.
 */
export default function useLevel2CaseEngine(initialQuestions = []) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(0);

  function answerQuestion(qId, choice, points = 0) {
    setAnswers((prev) => ({ ...prev, [qId]: choice }));
    setScore((prev) => prev + points);
    setCurrentIndex((prev) => prev + 1);
  }

  function resetQuiz() {
    setCurrentIndex(0);
    setAnswers({});
    setScore(0);
  }

  return {
    questions,
    setQuestions,
    currentIndex,
    answers,
    score,
    answerQuestion,
    resetQuiz,
  };
}
