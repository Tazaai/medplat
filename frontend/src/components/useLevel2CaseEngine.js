// ~/medplat/frontend/src/components/useLevel2CaseEngine.js
import { useState } from "react";

/**
 * Hook for managing Level 2 gamification quiz state
 * @param {Array} initialQuestions - Array of MCQ objects
 * @returns {Object} Quiz state and control functions
 */
export default function useLevel2CaseEngine(initialQuestions = []) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: chosenIndex }
  const [score, setScore] = useState(0);
  const [isAnswering, setIsAnswering] = useState(false); // Prevent double-click

  /**
   * Record user's answer for the current question
   * @param {number} choiceIndex - Index of the chosen answer (0-based)
   */
  const answerQuestion = (choiceIndex) => {
    // Prevent double-click or rapid clicking
    if (isAnswering) return;
    
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;
    
    // Check if already answered this question
    if (answers[currentQuestion.id] !== undefined) return;

    setIsAnswering(true);

    const isCorrect = choiceIndex === currentQuestion.correct;
    const points = isCorrect ? 3 : 0;

    // Update answers map
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: choiceIndex,
    }));

    // Update score
    setScore((prev) => prev + points);

    // Move to next question after a brief delay for UX feedback
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setIsAnswering(false);
    }, 500);
  };

  /**
   * Reset the quiz to initial state
   */
  const resetQuiz = () => {
    setCurrentIndex(0);
    setAnswers({});
    setScore(0);
    setIsAnswering(false);
  };

  /**
   * Check if quiz is complete
   */
  const isComplete = currentIndex >= questions.length;

  /**
   * Get progress percentage
   */
  const progress = questions.length > 0 
    ? Math.round((currentIndex / questions.length) * 100)
    : 0;

  return {
    questions,
    setQuestions,
    currentIndex,
    answers,
    answerQuestion,
    resetQuiz,
    score,
    isComplete,
    progress,
    totalQuestions: questions.length,
    isAnswering, // Expose for UI feedback
  };
}
