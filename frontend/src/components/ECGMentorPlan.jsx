// frontend/src/components/ECGMentorPlan.jsx — Phase 9: AI-Generated ECG Study Plan
import { useState, useEffect } from 'react';
import './ECGMentorPlan.css';

const ECGMentorPlan = () => {
  const [loading, setLoading] = useState(true);
  const [studyPlan, setStudyPlan] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [error, setError] = useState(null);
  const [completedDays, setCompletedDays] = useState([]);

  useEffect(() => {
    loadUserStatsAndGeneratePlan();
    loadCompletedDays();
  }, []);

  function loadUserStatsAndGeneratePlan() {
    try {
      // Load ECG progress from localStorage
      const savedProgress = localStorage.getItem('ecg_progress');
      if (!savedProgress) {
        setError('No ECG progress found. Complete some ECG cases first!');
        setLoading(false);
        return;
      }

      const progress = JSON.parse(savedProgress);
      const stats = {
        level: calculateLevel(progress.xpEarned || 0),
        streak: progress.currentStreak || 0,
        performanceByCategory: progress.performanceByCategory || {},
        xpEarned: progress.xpEarned || 0,
        score: progress.score || 0,
        wrongCount: progress.wrongCount || 0
      };

      // Calculate weak categories (<40% accuracy)
      const weakCategories = [];
      Object.entries(stats.performanceByCategory).forEach(([category, perf]) => {
        const total = (perf.correct || 0) + (perf.wrong || 0);
        if (total > 0) {
          const accuracy = (perf.correct / total) * 100;
          if (accuracy < 40) {
            weakCategories.push(category);
          }
        }
      });

      setUserStats(stats);
      generateAIPlan(stats, weakCategories);

    } catch (err) {
      console.error('Error loading user stats:', err);
      setError('Failed to load your ECG progress. Please try again.');
      setLoading(false);
    }
  }

  async function generateAIPlan(stats, weakCategories) {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/mentor/ecg-path`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          performanceByCategory: stats.performanceByCategory,
          level: stats.level,
          streak: stats.streak,
          weakCategories
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate study plan');
      }

      const data = await response.json();
      setStudyPlan(data.data);
      setLoading(false);

    } catch (err) {
      console.error('Error generating AI plan:', err);
      setError('Failed to generate study plan. Please try again later.');
      setLoading(false);
    }
  }

  function calculateLevel(xp) {
    // Same logic as ECGModule
    if (xp < 100) return 1;
    if (xp < 250) return 2;
    if (xp < 500) return 3;
    if (xp < 800) return 4;
    if (xp < 1200) return 5;
    if (xp < 1700) return 6;
    if (xp < 2300) return 7;
    if (xp < 3000) return 8;
    if (xp < 4000) return 9;
    return 10;
  }

  function loadCompletedDays() {
    try {
      const saved = localStorage.getItem('ecg_mentor_completed_days');
      if (saved) {
        setCompletedDays(JSON.parse(saved));
      }
    } catch (err) {
      console.warn('Failed to load completed days:', err);
    }
  }

  function toggleDayCompleted(dayNumber) {
    const newCompleted = completedDays.includes(dayNumber)
      ? completedDays.filter(d => d !== dayNumber)
      : [...completedDays, dayNumber];
    
    setCompletedDays(newCompleted);
    
    try {
      localStorage.setItem('ecg_mentor_completed_days', JSON.stringify(newCompleted));
    } catch (err) {
      console.warn('Failed to save completed days:', err);
    }
  }

  if (loading) {
    return (
      <div className="ecg-mentor-plan">
        <div className="mentor-header">
          <h1>🧠 AI ECG Study Plan</h1>
          <p>Generating your personalized 7-day learning path...</p>
        </div>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Analyzing your performance...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ecg-mentor-plan">
        <div className="mentor-header">
          <h1>🧠 AI ECG Study Plan</h1>
        </div>
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <p>{error}</p>
          <button 
            className="retry-button" 
            onClick={() => {
              setLoading(true);
              setError(null);
              loadUserStatsAndGeneratePlan();
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!studyPlan) {
    return null;
  }

  const completedCount = completedDays.length;
  const progressPercentage = (completedCount / 7) * 100;

  return (
    <div className="ecg-mentor-plan">
      <div className="mentor-header">
        <h1>🧠 AI ECG Study Plan</h1>
        <p className="mentor-subtitle">Personalized for Level {userStats.level} | {userStats.streak} Streak</p>
      </div>

      {/* Summary Section */}
      <div className="plan-summary">
        <div className="summary-card">
          <h3>📋 Your Weekly Plan</h3>
          <p>{studyPlan.summary}</p>
          <div className="summary-stats">
            <div className="stat-item">
              <span className="stat-label">Weekly XP Goal</span>
              <span className="stat-value">{studyPlan.weeklyXpGoal} XP</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Focus Areas</span>
              <span className="stat-value">{studyPlan.weakAreaFocus.join(', ')}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Progress</span>
              <span className="stat-value">{completedCount}/7 Days</span>
            </div>
          </div>
        </div>

        <div className="encouragement-card">
          <div className="encouragement-icon">💪</div>
          <p>{studyPlan.encouragement}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="week-progress">
        <div className="progress-header">
          <span>Weekly Progress</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* 7-Day Plan */}
      <div className="daily-plan-grid">
        {studyPlan.plan.map((day) => {
          const isCompleted = completedDays.includes(day.day);
          
          return (
            <div 
              key={day.day} 
              className={`day-card ${isCompleted ? 'completed' : ''}`}
            >
              <div className="day-header">
                <div className="day-number">Day {day.day}</div>
                <button 
                  className={`complete-checkbox ${isCompleted ? 'checked' : ''}`}
                  onClick={() => toggleDayCompleted(day.day)}
                  title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                >
                  {isCompleted ? '✓' : ''}
                </button>
              </div>

              <h4 className="day-focus">{day.focus}</h4>

              <div className="day-details">
                <div className="detail-row">
                  <span className="detail-icon">📝</span>
                  <span className="detail-text">{day.cases} ECG cases</span>
                </div>
                <div className="detail-row">
                  <span className="detail-icon">🎯</span>
                  <span className="detail-text">{day.xpTarget} XP target</span>
                </div>
                <div className="detail-row">
                  <span className="detail-icon">📚</span>
                  <span className="detail-text">
                    {day.categories.map(c => c.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')).join(', ')}
                  </span>
                </div>
              </div>

              <div className="day-motivation">
                <div className="motivation-icon">💡</div>
                <p>{day.motivation}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="plan-actions">
        <button 
          className="action-button primary" 
          onClick={() => window.location.href = '/#/ecg'}
        >
          Start ECG Practice →
        </button>
        <button 
          className="action-button secondary" 
          onClick={() => {
            setLoading(true);
            loadUserStatsAndGeneratePlan();
          }}
        >
          🔄 Regenerate Plan
        </button>
        <button 
          className="action-button secondary" 
          onClick={() => {
            setCompletedDays([]);
            localStorage.removeItem('ecg_mentor_completed_days');
          }}
        >
          ↻ Reset Progress
        </button>
      </div>
    </div>
  );
};

export default ECGMentorPlan;
