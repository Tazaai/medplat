// frontend/src/components/ECGModule.jsx — REAL ECG Academy with Images & Interactivity
import { useState, useEffect } from 'react';
import { API_BASE } from '../config';
import './ECGModule.css';

export default function ECGModule({ user }) {
  const [currentView, setCurrentView] = useState('levels'); // levels, session, case, results
  const [masteryLevels, setMasteryLevels] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [currentCase, setCurrentCase] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [sessionProgress, setSessionProgress] = useState({
    answered: 0,
    correct: 0,
    total: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [userProgress, setUserProgress] = useState(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Load categories and mastery levels
      const response = await fetch(`${API_BASE}/api/ecg/categories`);
      const data = await response.json();
      
      if (data.ok) {
        setMasteryLevels([
          { level: 1, name: 'Basic Rhythms', description: 'Normal sinus rhythm and basic arrhythmias' },
          { level: 2, name: 'Ischemia & Blocks', description: 'MI recognition and conduction abnormalities' },
          { level: 3, name: 'Advanced Arrhythmias', description: 'Life-threatening rhythms and management' }
        ]);
        
        // Load user progress if available
        if (user?.id) {
          loadUserProgress();
        }
      }
    } catch (err) {
      console.error('Failed to load ECG data:', err);
      setError('Failed to load ECG Academy. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadUserProgress = async () => {
    try {
      const userId = user?.id || 'demo_user';
      const response = await fetch(`${API_BASE}/api/ecg/progress/${userId}`);
      const data = await response.json();
      
      if (data.ok) {
        setUserProgress(data.progress);
      }
    } catch (err) {
      console.error('Failed to load user progress:', err);
    }
  };

  const startMasterySession = async (level) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/api/ecg/mastery-session/${level}`);
      const data = await response.json();
      
      if (data.ok && data.session) {
        setCurrentSession(data.session);
        setSessionProgress({
          answered: 0,
          correct: 0,
          total: data.session.progress.total_questions
        });
        
        // Start with first case
        if (data.session.cases.length > 0) {
          setCurrentCase(data.session.cases[0]);
          setCurrentQuestionIndex(0);
          setCurrentView('case');
        }
      } else {
        setError(data.error || 'Failed to start mastery session');
      }
    } catch (err) {
      console.error('Failed to start mastery session:', err);
      setError('Failed to start session. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (selectedAnswer === null || !currentCase || !currentSession) return;

    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE}/api/ecg/submit-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: currentCase.id,
          question_index: currentQuestionIndex,
          selected_answer: selectedAnswer,
          session_id: currentSession.session_id
        })
      });
      
      const data = await response.json();
      
      if (data.ok) {
        setFeedback(data.feedback);
        
        // Update progress
        const newProgress = { ...sessionProgress };
        newProgress.answered++;
        if (data.feedback.correct) {
          newProgress.correct++;
        }
        setSessionProgress(newProgress);
        
      } else {
        setError(data.error || 'Failed to submit answer');
      }
    } catch (err) {
      console.error('Failed to submit answer:', err);
      setError('Failed to submit answer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const nextQuestion = () => {
    const currentCaseQuestions = currentCase?.interactive_questions || [];
    
    if (currentQuestionIndex + 1 < currentCaseQuestions.length) {
      // Next question in same case
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setFeedback(null);
    } else {
      // Move to next case
      const currentCaseIndex = currentSession.cases.findIndex(c => c.id === currentCase.id);
      if (currentCaseIndex + 1 < currentSession.cases.length) {
        setCurrentCase(currentSession.cases[currentCaseIndex + 1]);
        setCurrentQuestionIndex(0);
        setSelectedAnswer(null);
        setFeedback(null);
      } else {
        // Session complete
        setCurrentView('results');
      }
    }
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    console.warn('Primary ECG image failed to load, using backup');
    setImageLoaded(true);
  };

  // Render mastery level selection
  const renderLevelSelection = () => (
    <div className="ecg-levels">
      <div className="ecg-header">
        <h2>🫀 ECG Mastery Academy</h2>
        <p>Master ECG interpretation with real cases and interactive learning</p>
        {userProgress && (
          <div className="progress-summary">
            <div>Overall Progress: {Math.round((userProgress.overall_progress.cases_completed / userProgress.overall_progress.total_cases) * 100)}%</div>
            <div>Current Level: {userProgress.overall_progress.mastery_level}</div>
            <div>Accuracy: {userProgress.overall_progress.accuracy}%</div>
          </div>
        )}
      </div>
      
      <div className="mastery-levels-grid">
        {masteryLevels.map(level => {
          const isCompleted = userProgress?.level_progress.find(p => p.level === level.level)?.completed;
          const isUnlocked = level.level === 1 || isCompleted || (userProgress?.overall_progress.mastery_level >= level.level);
          
          return (
            <div 
              key={level.level}
              className={`mastery-level-card ${isCompleted ? 'completed' : ''} ${!isUnlocked ? 'locked' : ''}`}
              onClick={() => isUnlocked && startMasterySession(level.level)}
            >
              <div className="level-badge">Level {level.level}</div>
              <h3>{level.name}</h3>
              <p>{level.description}</p>
              {isCompleted && <div className="completed-badge">✓ Completed</div>}
              {!isUnlocked && <div className="locked-badge">🔒 Locked</div>}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Render ECG case with interactive questions
  const renderCase = () => {
    if (!currentCase) return null;

    const currentQuestion = currentCase.interactive_questions[currentQuestionIndex];
    const progress = ((sessionProgress.answered / sessionProgress.total) * 100).toFixed(0);

    return (
      <div className="ecg-case-view">
        <div className="case-header">
          <button onClick={() => setCurrentView('levels')} className="back-button">
            ← Back to Levels
          </button>
          <div className="case-progress">
            Progress: {sessionProgress.answered}/{sessionProgress.total} ({progress}%)
          </div>
          <div className="case-score">
            Score: {sessionProgress.correct}/{sessionProgress.answered}
            {sessionProgress.answered > 0 && (
              <span> ({Math.round((sessionProgress.correct / sessionProgress.answered) * 100)}%)</span>
            )}
          </div>
        </div>

        <div className="case-content">
          <div className="case-info">
            <h3>{currentCase.title}</h3>
            <p>{currentCase.description}</p>
            <div className="case-meta">
              <span className={`difficulty ${currentCase.difficulty}`}>
                {currentCase.difficulty}
              </span>
              <span className={`category ${currentCase.category}`}>
                {currentCase.category}
              </span>
            </div>
          </div>

          <div className="ecg-image-container">
            <img
              src={imageLoaded ? currentCase.image_url : currentCase.backup_image}
              alt={currentCase.title}
              className="ecg-image"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
            {!imageLoaded && (
              <div className="image-loading">Loading ECG image...</div>
            )}
          </div>

          {currentQuestion && (
            <div className="question-section">
              <h4>Question {currentQuestionIndex + 1} of {currentCase.interactive_questions.length}</h4>
              <p className="question-text">{currentQuestion.question}</p>
              
              <div className="answer-options">
                {currentQuestion.options.map((option, index) => (
                  <label key={index} className="answer-option">
                    <input
                      type="radio"
                      name="answer"
                      value={index}
                      checked={selectedAnswer === index}
                      onChange={() => setSelectedAnswer(index)}
                      disabled={feedback !== null}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>

              <div className="question-actions">
                {!feedback ? (
                  <button
                    onClick={submitAnswer}
                    disabled={selectedAnswer === null || loading}
                    className="submit-answer-btn"
                  >
                    {loading ? 'Submitting...' : 'Submit Answer'}
                  </button>
                ) : (
                  <button onClick={nextQuestion} className="next-question-btn">
                    {currentQuestionIndex + 1 < currentCase.interactive_questions.length
                      ? 'Next Question'
                      : currentSession.cases.findIndex(c => c.id === currentCase.id) + 1 < currentSession.cases.length
                      ? 'Next Case'
                      : 'Complete Session'
                    }
                  </button>
                )}
              </div>
            </div>
          )}

          {feedback && (
            <div className={`feedback-section ${feedback.correct ? 'correct' : 'incorrect'}`}>
              <h4>{feedback.correct ? '✅ Correct!' : '❌ Incorrect'}</h4>
              <p><strong>Your answer:</strong> {feedback.selected_answer}</p>
              {!feedback.correct && (
                <p><strong>Correct answer:</strong> {feedback.correct_answer}</p>
              )}
              <p><strong>Explanation:</strong> {feedback.explanation}</p>
              
              {feedback.additional_info && (
                <div className="additional-info">
                  <h5>Key Teaching Points:</h5>
                  <ul>
                    {feedback.additional_info.review_topics.map((topic, index) => (
                      <li key={index}>{topic}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render session results
  const renderResults = () => (
    <div className="session-results">
      <h2>Session Complete! 🎉</h2>
      <div className="results-stats">
        <div className="stat">
          <div className="stat-value">{sessionProgress.correct}</div>
          <div className="stat-label">Correct Answers</div>
        </div>
        <div className="stat">
          <div className="stat-value">{sessionProgress.total}</div>
          <div className="stat-label">Total Questions</div>
        </div>
        <div className="stat">
          <div className="stat-value">
            {Math.round((sessionProgress.correct / sessionProgress.total) * 100)}%
          </div>
          <div className="stat-label">Accuracy</div>
        </div>
      </div>
      
      <div className="results-actions">
        <button onClick={() => setCurrentView('levels')} className="return-levels-btn">
          Return to Levels
        </button>
        <button 
          onClick={() => startMasterySession(currentSession?.level)} 
          className="retry-session-btn"
        >
          Retry Session
        </button>
      </div>
    </div>
  );

  // Main render
  if (loading && !currentCase) {
    return (
      <div className="ecg-module-loading">
        <div>Loading ECG Academy...</div>
      </div>
    );
  }

  if (error && !currentSession) {
    return (
      <div className="ecg-module-error">
        <h3>ECG Academy Unavailable</h3>
        <p>{error}</p>
        <button onClick={loadInitialData} className="retry-btn">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="ecg-module">
      {currentView === 'levels' && renderLevelSelection()}
      {currentView === 'case' && renderCase()}
      {currentView === 'results' && renderResults()}
    </div>
  );
}