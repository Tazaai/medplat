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
  const [showFeedback, setShowFeedback] = useState(false); // Show feedback/explanation after answer
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(null); // Track if last answer was correct
  const [lastAnswerPoints, setLastAnswerPoints] = useState(0); // Points earned for last answer
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [consecutiveIncorrect, setConsecutiveIncorrect] = useState(0);
  const [currentDifficulty, setCurrentDifficulty] = useState('intermediate'); // 'easy', 'intermediate', 'hard'
  const [questionTypes, setQuestionTypes] = useState({}); // Track performance by type

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

    // Fix: Backend stores 'correct' as full choice text (e.g., "B: Aortic dissection")
    // We need to compare the choice text at the index, not the index itself
    const selectedChoice = currentQuestion.choices && currentQuestion.choices[choiceIndex];
    const isCorrect = selectedChoice === currentQuestion.correct;
    const points = isCorrect ? 3 : 0;

    // Track consecutive correct/incorrect for adaptive difficulty
    if (isCorrect) {
      setConsecutiveCorrect((prev) => prev + 1);
      setConsecutiveIncorrect(0);
    } else {
      setConsecutiveIncorrect((prev) => prev + 1);
      setConsecutiveCorrect(0);
    }

    // Track question type performance
    const qType = currentQuestion.type || currentQuestion.reasoning_type || 'general';
    setQuestionTypes((prev) => {
      const typeData = prev[qType] || { correct: 0, total: 0 };
      return {
        ...prev,
        [qType]: {
          correct: typeData.correct + (isCorrect ? 1 : 0),
          total: typeData.total + 1
        }
      };
    });

    // Adaptive difficulty: adjust after 2 consecutive correct/incorrect
    if (isCorrect && consecutiveCorrect + 1 >= 2 && currentDifficulty !== 'hard') {
      setCurrentDifficulty('hard');
    } else if (!isCorrect && consecutiveIncorrect + 1 >= 2 && currentDifficulty !== 'easy') {
      setCurrentDifficulty('easy');
    }

    // Update answers map - store the choice text for comparison in review mode
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: selectedChoice || choiceIndex, // Store choice text if available, fallback to index
    }));

    // Update score
    setScore((prev) => prev + points);
    
    // Set feedback state for immediate display
    setLastAnswerCorrect(isCorrect);
    setLastAnswerPoints(points);
    setIsAnswering(false);
    setShowFeedback(true);
    
    // Don't auto-advance - wait for user to click "Continue"
  };

  /**
   * Move to next question (called after user views feedback)
   */
  const continueToNext = () => {
    setShowFeedback(false);
    setLastAnswerCorrect(null);
    setLastAnswerPoints(0);
    setCurrentIndex((prev) => prev + 1);
  };

  /**
   * Reset the quiz to initial state
   */
  const resetQuiz = () => {
    setCurrentIndex(0);
    setAnswers({});
    setScore(0);
    setIsAnswering(false);
    setShowFeedback(false);
    setLastAnswerCorrect(null);
    setLastAnswerPoints(0);
    setConsecutiveCorrect(0);
    setConsecutiveIncorrect(0);
    setCurrentDifficulty('intermediate');
    setQuestionTypes({});
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
    continueToNext,
    resetQuiz,
    score,
    isComplete,
    progress,
    totalQuestions: questions.length,
    isAnswering, // Expose for UI feedback
    showFeedback, // Show feedback/explanation
    lastAnswerCorrect, // Was last answer correct?
    lastAnswerPoints, // Points earned for last answer
    consecutiveCorrect,
    consecutiveIncorrect,
    currentDifficulty,
    questionTypes,
  };
}
