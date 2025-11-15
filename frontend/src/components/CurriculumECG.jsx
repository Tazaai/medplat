// frontend/src/components/CurriculumECG.jsx — Phase 10: ECG Curriculum Builder
import { useState, useEffect } from 'react';
import './CurriculumECG.css';

const CurriculumECG = () => {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [completedCases, setCompletedCases] = useState({});
  const [userLevel, setUserLevel] = useState(1);
  const [userXP, setUserXP] = useState(0);

  useEffect(() => {
    loadTracks();
    loadUserProgress();
    loadCompletedCases();
  }, []);

  async function loadTracks() {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/curriculum/ecg-track`);
      
      if (!response.ok) {
        throw new Error('Failed to load curriculum');
      }

      const data = await response.json();
      setTracks(data.tracks || []);
      setLoading(false);

    } catch (err) {
      console.error('Error loading curriculum:', err);
      setError('Failed to load curriculum tracks. Please try again later.');
      setLoading(false);
    }
  }

  function loadUserProgress() {
    try {
      const savedProgress = localStorage.getItem('ecg_progress');
      if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        setUserXP(progress.xpEarned || 0);
        setUserLevel(calculateLevel(progress.xpEarned || 0));
      }
    } catch (err) {
      console.warn('Failed to load user progress:', err);
    }
  }

  function loadCompletedCases() {
    try {
      const saved = localStorage.getItem('ecg_curriculum_completed');
      if (saved) {
        setCompletedCases(JSON.parse(saved));
      }
    } catch (err) {
      console.warn('Failed to load completed cases:', err);
    }
  }

  function calculateLevel(xp) {
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

  function toggleCaseCompleted(trackDifficulty, caseId) {
    const key = `${trackDifficulty}_${caseId}`;
    const newCompleted = { ...completedCases };
    
    if (newCompleted[key]) {
      delete newCompleted[key];
    } else {
      newCompleted[key] = {
        timestamp: Date.now(),
        caseId,
        trackDifficulty
      };
    }
    
    setCompletedCases(newCompleted);
    
    try {
      localStorage.setItem('ecg_curriculum_completed', JSON.stringify(newCompleted));
    } catch (err) {
      console.warn('Failed to save completed cases:', err);
    }
  }

  function isTrackUnlocked(track) {
    return userLevel >= track.unlockRequirement.level;
  }

  function getTrackCompletionPercentage(track) {
    const totalCases = track.syllabus.length;
    const completed = track.syllabus.filter(c => 
      completedCases[`${track.difficulty}_${c.id}`]
    ).length;
    return totalCases > 0 ? (completed / totalCases) * 100 : 0;
  }

  if (loading) {
    return (
      <div className="curriculum-ecg">
        <div className="curriculum-header">
          <h1>📚 ECG Curriculum Builder</h1>
          <p>Loading curriculum tracks...</p>
        </div>
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="curriculum-ecg">
        <div className="curriculum-header">
          <h1>📚 ECG Curriculum Builder</h1>
        </div>
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <p>{error}</p>
          <button className="retry-button" onClick={() => {
            setLoading(true);
            setError(null);
            loadTracks();
          }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Track detail view
  if (selectedTrack) {
    const isUnlocked = isTrackUnlocked(selectedTrack);
    const completionPercentage = getTrackCompletionPercentage(selectedTrack);
    const completedCount = selectedTrack.syllabus.filter(c => 
      completedCases[`${selectedTrack.difficulty}_${c.id}`]
    ).length;

    return (
      <div className="curriculum-ecg">
        <div className="curriculum-header">
          <h1>📚 {selectedTrack.title}</h1>
          <button 
            className="back-button" 
            onClick={() => setSelectedTrack(null)}
          >
            ← Back to All Tracks
          </button>
        </div>

        {!isUnlocked && (
          <div className="locked-banner">
            <div className="lock-icon">🔒</div>
            <div>
              <h3>Track Locked</h3>
              <p>{selectedTrack.unlockRequirement.message}</p>
              <p className="progress-hint">
                Current Progress: Level {userLevel} ({userXP} XP) / Required: Level {selectedTrack.unlockRequirement.level} ({selectedTrack.unlockRequirement.xp} XP)
              </p>
            </div>
          </div>
        )}

        <div className="track-detail-header">
          <div className="track-info">
            <p className="track-description">{selectedTrack.description}</p>
            <div className="track-meta">
              <span>⏱️ {selectedTrack.estimatedTime}</span>
              <span>📝 {selectedTrack.totalCases} Cases</span>
              <span>✓ {completedCount}/{selectedTrack.totalCases} Completed</span>
            </div>
          </div>

          <div className="completion-circle">
            <svg width="120" height="120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#ecf0f1" strokeWidth="10"/>
              <circle 
                cx="60" 
                cy="60" 
                r="50" 
                fill="none" 
                stroke="#667eea" 
                strokeWidth="10"
                strokeDasharray={`${(completionPercentage / 100) * 314} 314`}
                transform="rotate(-90 60 60)"
              />
              <text x="60" y="65" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#2c3e50">
                {Math.round(completionPercentage)}%
              </text>
            </svg>
          </div>
        </div>

        <div className="learning-objectives">
          <h3>🎯 Learning Objectives</h3>
          <ul>
            {selectedTrack.learningObjectives.map((obj, idx) => (
              <li key={idx}>{obj}</li>
            ))}
          </ul>
        </div>

        <div className="syllabus-section">
          <h3>📋 Syllabus</h3>
          <div className="case-list">
            {selectedTrack.syllabus.map((caseItem) => {
              const isCompleted = completedCases[`${selectedTrack.difficulty}_${caseItem.id}`];
              
              return (
                <div 
                  key={caseItem.id} 
                  className={`case-item ${isCompleted ? 'completed' : ''} ${!isUnlocked ? 'locked' : ''}`}
                >
                  <div className="case-number">{caseItem.orderIndex}</div>
                  
                  <div className="case-content">
                    <h4>{caseItem.title}</h4>
                    <p className="case-diagnosis">{caseItem.diagnosis}</p>
                    <span className="case-category">
                      {caseItem.category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </span>
                  </div>

                  {isUnlocked && (
                    <button 
                      className={`complete-checkbox ${isCompleted ? 'checked' : ''}`}
                      onClick={() => toggleCaseCompleted(selectedTrack.difficulty, caseItem.id)}
                      title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                      {isCompleted ? '✓' : ''}
                    </button>
                  )}

                  {!isUnlocked && (
                    <div className="lock-badge">🔒</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="track-actions">
          <button 
            className="action-button primary" 
            onClick={() => window.dispatchEvent(new CustomEvent('switchToTab', { detail: 'ecg' }))}
            disabled={!isUnlocked}
          >
            Start ECG Practice →
          </button>
        </div>
      </div>
    );
  }

  // Track overview grid
  return (
    <div className="curriculum-ecg">
      <div className="curriculum-header">
        <h1>📚 ECG Curriculum Builder</h1>
        <p className="subtitle">Structured learning paths from beginner to expert</p>
      </div>

      <div className="user-progress-banner">
        <div className="progress-item">
          <span className="progress-label">Your Level</span>
          <span className="progress-value">Level {userLevel}</span>
        </div>
        <div className="progress-item">
          <span className="progress-label">Total XP</span>
          <span className="progress-value">{userXP} XP</span>
        </div>
        <div className="progress-item">
          <span className="progress-label">Tracks Unlocked</span>
          <span className="progress-value">
            {tracks.filter(t => isTrackUnlocked(t)).length}/{tracks.length}
          </span>
        </div>
      </div>

      <div className="tracks-grid">
        {tracks.map((track) => {
          const isUnlocked = isTrackUnlocked(track);
          const completionPercentage = getTrackCompletionPercentage(track);

          return (
            <div 
              key={track.difficulty} 
              className={`track-card ${!isUnlocked ? 'locked' : ''}`}
              onClick={() => setSelectedTrack(track)}
            >
              <div className="track-header">
                <h3>{track.title}</h3>
                {!isUnlocked && <div className="lock-icon">🔒</div>}
                {isUnlocked && completionPercentage === 100 && <div className="complete-badge">✓</div>}
              </div>

              <p className="track-description">{track.description}</p>

              <div className="track-stats">
                <div className="stat">
                  <span className="stat-icon">📝</span>
                  <span>{track.totalCases} Cases</span>
                </div>
                <div className="stat">
                  <span className="stat-icon">⏱️</span>
                  <span>{track.estimatedTime}</span>
                </div>
                <div className="stat">
                  <span className="stat-icon">🎯</span>
                  <span>{track.difficulty}</span>
                </div>
              </div>

              {isUnlocked ? (
                <div className="track-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${completionPercentage}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">{Math.round(completionPercentage)}% Complete</span>
                </div>
              ) : (
                <div className="unlock-requirement">
                  {track.unlockRequirement.message}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CurriculumECG;
