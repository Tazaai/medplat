/**
 * GlossaryQuiz - Gamified medical terminology quiz
 * Phase 7 M4 - Gamification Mode
 * 
 * Features:
 * - Multiple question types (definition, matching, pronunciation, clinical usage)
 * - XP rewards and streak tracking
 * - Difficulty-based progression
 * - Specialty-focused quizzes
 * - Real-time scoring with animations
 */

import React, { useState, useEffect } from 'react';
import './GlossaryQuiz.css';

const GlossaryQuiz = ({ 
  difficulty = 'intermediate',
  specialty = null,
  questionCount = 10,
  userId,
  onComplete
}) => {
  const [quiz, setQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const [results, setResults] = useState(null);

  // Timer
  useEffect(() => {
    if (quiz && !quizComplete) {
      const timer = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [quiz, quizComplete]);

  // Generate quiz on mount
  useEffect(() => {
    generateQuiz();
  }, [difficulty, specialty, questionCount]);

  const generateQuiz = async () => {
    setIsLoading(true);
    
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
      const response = await fetch(`${backendUrl}/api/glossary/quiz/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: questionCount,
          difficulty,
          specialty,
          language: 'en'
        })
      });

      if (!response.ok) throw new Error('Quiz generation failed');

      const data = await response.json();
      setQuiz(data.quiz);
      setCurrentQuestion(0);
      setAnswers({});
      setScore(0);
      setXpEarned(0);
      setStreak(0);
      setTimeElapsed(0);
      setQuizComplete(false);
    } catch (err) {
      console.error('Quiz generation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (optionIndex) => {
    if (showFeedback) return; // Prevent changing answer after submission

    setSelectedAnswer(optionIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;

    const question = quiz.questions[currentQuestion];
    const correct = question.options[selectedAnswer].is_correct;

    setIsCorrect(correct);
    setShowFeedback(true);

    // Update answers
    setAnswers(prev => ({
      ...prev,
      [question.question_id]: selectedAnswer
    }));

    // Update score and XP
    if (correct) {
      setScore(prev => prev + 1);
      setXpEarned(prev => prev + question.xp_value);
      setStreak(prev => prev + 1);
    } else {
      setStreak(0);
    }
  };

  const handleNextQuestion = () => {
    setSelectedAnswer(null);
    setShowFeedback(false);

    if (currentQuestion + 1 < quiz.questions.length) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      submitQuiz();
    }
  };

  const submitQuiz = async () => {
    setIsLoading(true);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
      const response = await fetch(`${backendUrl}/api/glossary/quiz/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz_id: quiz.quiz_id,
          answers,
          user_id: userId
        })
      });

      if (!response.ok) throw new Error('Quiz submission failed');

      const data = await response.json();
      setResults(data.grading);
      setQuizComplete(true);

      if (onComplete) {
        onComplete(data.grading);
      }
    } catch (err) {
      console.error('Quiz submission error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading && !quiz) {
    return (
      <div className="glossary-quiz-loading">
        <div className="loading-spinner"></div>
        <p>Generating quiz...</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="glossary-quiz-error">
        <p>Failed to load quiz. Please try again.</p>
        <button onClick={generateQuiz}>Retry</button>
      </div>
    );
  }

  if (quizComplete && results) {
    return (
      <div className="glossary-quiz-results">
        <div className="results-header">
          <h2>Quiz Complete! 🎉</h2>
          <div className="results-performance-tier">
            <span className={`tier-badge ${results.performance_tier}`}>
              {results.performance_tier.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="results-stats-grid">
          <div className="result-stat">
            <div className="stat-value">{results.correct_answers}/{results.total_questions}</div>
            <div className="stat-label">Correct Answers</div>
          </div>
          <div className="result-stat">
            <div className="stat-value">{results.accuracy}%</div>
            <div className="stat-label">Accuracy</div>
          </div>
          <div className="result-stat xp-stat">
            <div className="stat-value">+{results.xp_earned} XP</div>
            <div className="stat-label">Total XP Earned</div>
          </div>
          <div className="result-stat">
            <div className="stat-value">{formatTime(timeElapsed)}</div>
            <div className="stat-label">Time Taken</div>
          </div>
        </div>

        {results.perfection_bonus > 0 && (
          <div className="bonus-alert perfect-score">
            <span className="bonus-icon">⭐</span>
            <span>Perfect Score Bonus: +{results.perfection_bonus} XP!</span>
          </div>
        )}

        {results.streak_eligible && (
          <div className="bonus-alert streak-eligible">
            <span className="bonus-icon">🔥</span>
            <span>Streak Eligible! Keep going for bonus rewards!</span>
          </div>
        )}

        <div className="results-actions">
          <button className="btn-primary" onClick={generateQuiz}>
            New Quiz
          </button>
          <button className="btn-secondary" onClick={() => window.location.reload()}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const question = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

  return (
    <div className="glossary-quiz-container">
      {/* Quiz Header */}
      <div className="quiz-header">
        <div className="quiz-progress-section">
          <div className="quiz-meta">
            <span className="question-counter">
              Question {currentQuestion + 1} / {quiz.questions.length}
            </span>
            <span className="quiz-timer">⏱️ {formatTime(timeElapsed)}</span>
          </div>
          <div className="quiz-progress-bar">
            <div 
              className="quiz-progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div className="quiz-stats">
          <div className="stat-item score">
            <span className="stat-label">Score:</span>
            <span className="stat-value">{score}/{currentQuestion}</span>
          </div>
          <div className="stat-item xp">
            <span className="stat-label">XP:</span>
            <span className="stat-value">{xpEarned}</span>
          </div>
          <div className="stat-item streak">
            <span className="stat-label">Streak:</span>
            <span className="stat-value">{streak > 0 ? `🔥 ${streak}` : '0'}</span>
          </div>
        </div>
      </div>

      {/* Question Card */}
      <div className="quiz-question-card">
        <div className="question-type-badge">
          {question.type.replace('_', ' ').toUpperCase()}
        </div>

        <div className={`difficulty-badge ${question.difficulty}`}>
          {question.difficulty}
        </div>

        <div className="question-xp-value">+{question.xp_value} XP</div>

        <h3 className="question-text">{question.question}</h3>

        {question.term && (
          <div className="question-term-display">
            <strong>Term:</strong> {question.term}
          </div>
        )}

        {/* Answer Options */}
        <div className="quiz-options">
          {question.options.map((option, index) => (
            <button
              key={index}
              className={`quiz-option ${
                selectedAnswer === index ? 'selected' : ''
              } ${
                showFeedback && option.is_correct ? 'correct' : ''
              } ${
                showFeedback && selectedAnswer === index && !option.is_correct ? 'incorrect' : ''
              }`}
              onClick={() => handleAnswerSelect(index)}
              disabled={showFeedback}
            >
              <span className="option-letter">{String.fromCharCode(65 + index)}</span>
              <span className="option-text">{option.text}</span>
              {showFeedback && option.is_correct && (
                <span className="option-feedback">✓</span>
              )}
              {showFeedback && selectedAnswer === index && !option.is_correct && (
                <span className="option-feedback">✗</span>
              )}
            </button>
          ))}
        </div>

        {/* Feedback Section */}
        {showFeedback && (
          <div className={`feedback-section ${isCorrect ? 'correct' : 'incorrect'}`}>
            <div className="feedback-message">
              {isCorrect ? (
                <>
                  <span className="feedback-icon">✅</span>
                  <strong>Correct!</strong> +{question.xp_value} XP
                </>
              ) : (
                <>
                  <span className="feedback-icon">❌</span>
                  <strong>Incorrect</strong>
                </>
              )}
            </div>

            {/* Hints (shown on incorrect answer) */}
            {!isCorrect && question.hints && question.hints.length > 0 && (
              <div className="feedback-hints">
                <strong>Hints:</strong>
                <ul>
                  {question.hints.map((hint, index) => (
                    <li key={index}>{hint}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="quiz-actions">
          {!showFeedback ? (
            <button
              className="btn-submit-answer"
              onClick={handleSubmitAnswer}
              disabled={selectedAnswer === null}
            >
              Submit Answer
            </button>
          ) : (
            <button className="btn-next-question" onClick={handleNextQuestion}>
              {currentQuestion + 1 < quiz.questions.length ? 'Next Question' : 'Finish Quiz'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlossaryQuiz;
