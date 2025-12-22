/**
 * PeerChallenge - Head-to-head quiz competition
 * Phase 7 M5 - Social Features
 * 
 * Features:
 * - Create and send challenges
 * - Accept/decline challenges
 * - Live quiz duel
 * - Winner declaration
 * - Challenge history
 */

import React, { useState, useEffect } from 'react';
import './PeerChallenge.css';

const PeerChallenge = ({ userId }) => {
  const [challenges, setChallenges] = useState([]);
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [friends, setFriends] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState('');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [specialty, setSpecialty] = useState('');

  useEffect(() => {
    fetchChallenges();
    fetchFriends();
  }, [userId]);

  const fetchChallenges = async () => {
    try {
      const backendUrl = import.meta.env.VITE_API_BASE || import.meta.env.VITE_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/social/challenges/user/${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        setChallenges(data.challenges || []);
      }
    } catch (err) {
      console.error('Failed to fetch challenges:', err);
    }
  };

  const fetchFriends = async () => {
    try {
      const backendUrl = import.meta.env.VITE_API_BASE || import.meta.env.VITE_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/social/friends/list/${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends || []);
      }
    } catch (err) {
      console.error('Failed to fetch friends:', err);
    }
  };

  const handleCreateChallenge = async () => {
    if (!selectedFriend) return;

    try {
      const backendUrl = import.meta.env.VITE_API_BASE || import.meta.env.VITE_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/social/challenges/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_uid: userId,
          opponent_uid: selectedFriend,
          challenge_type: 'quiz_duel',
          specialty: specialty || null,
          difficulty,
          question_count: 10
        })
      });

      if (response.ok) {
        setShowCreateModal(false);
        setSelectedFriend('');
        setSpecialty('');
        fetchChallenges();
      }
    } catch (err) {
      console.error('Failed to create challenge:', err);
    }
  };

  const handleAcceptChallenge = async (challengeId) => {
    try {
      const backendUrl = import.meta.env.VITE_API_BASE || import.meta.env.VITE_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/social/challenges/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge_id: challengeId,
          uid: userId
        })
      });

      if (response.ok) {
        fetchChallenges();
      }
    } catch (err) {
      console.error('Failed to accept challenge:', err);
    }
  };

  const handleStartChallenge = (challenge) => {
    setActiveChallenge(challenge);
  };

  const renderChallengeCard = (challenge) => {
    const isCreator = challenge.creator_uid === userId;
    const opponentId = isCreator ? challenge.opponent_uid : challenge.creator_uid;
    const myScore = isCreator ? challenge.creator_score : challenge.opponent_score;
    const opponentScore = isCreator ? challenge.opponent_score : challenge.creator_score;

    return (
      <div key={challenge.id} className={`challenge-card status-${challenge.status}`}>
        <div className="challenge-header">
          <h4>Quiz Duel</h4>
          <span className={`status-badge ${challenge.status}`}>
            {challenge.status}
          </span>
        </div>

        <div className="challenge-info">
          <div className="challenge-opponent">
            <span className="label">Opponent:</span>
            <span className="value">User {opponentId.substring(0, 8)}</span>
          </div>
          <div className="challenge-difficulty">
            <span className="label">Difficulty:</span>
            <span className={`value difficulty-${challenge.difficulty}`}>
              {challenge.difficulty}
            </span>
          </div>
          {challenge.specialty && (
            <div className="challenge-specialty">
              <span className="label">Specialty:</span>
              <span className="value">{challenge.specialty}</span>
            </div>
          )}
        </div>

        {challenge.status === 'pending' && !isCreator && (
          <div className="challenge-actions">
            <button 
              className="btn-accept-challenge"
              onClick={() => handleAcceptChallenge(challenge.id)}
            >
              Accept Challenge
            </button>
          </div>
        )}

        {challenge.status === 'active' && myScore === null && (
          <div className="challenge-actions">
            <button 
              className="btn-start-challenge"
              onClick={() => handleStartChallenge(challenge)}
            >
              Start Quiz
            </button>
          </div>
        )}

        {challenge.status === 'completed' && (
          <div className="challenge-results">
            <div className="score-comparison">
              <div className={`player-score ${myScore > opponentScore ? 'winner' : ''}`}>
                <span className="score-label">You</span>
                <span className="score-value">{myScore}</span>
              </div>
              <div className="vs-divider">VS</div>
              <div className={`player-score ${opponentScore > myScore ? 'winner' : ''}`}>
                <span className="score-label">Opponent</span>
                <span className="score-value">{opponentScore}</span>
              </div>
            </div>
            {challenge.winner_uid === userId && (
              <div className="winner-badge">🏆 Victory!</div>
            )}
            {challenge.winner_uid === 'tie' && (
              <div className="tie-badge">🤝 Tie</div>
            )}
            {challenge.winner_uid !== userId && challenge.winner_uid !== 'tie' && (
              <div className="loser-badge">Better luck next time</div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="peer-challenge-container">
      <div className="challenge-header-section">
        <h2>Peer Challenges</h2>
        <button 
          className="btn-new-challenge"
          onClick={() => setShowCreateModal(true)}
        >
          + New Challenge
        </button>
      </div>

      <div className="challenges-tabs">
        <button className="tab active">Active ({challenges.filter(c => c.status === 'active').length})</button>
        <button className="tab">Pending ({challenges.filter(c => c.status === 'pending').length})</button>
        <button className="tab">Completed ({challenges.filter(c => c.status === 'completed').length})</button>
      </div>

      <div className="challenges-list">
        {challenges.length === 0 ? (
          <div className="no-challenges">
            <p>No challenges yet!</p>
            <p className="hint">Challenge your friends to a quiz duel</p>
          </div>
        ) : (
          challenges.map(renderChallengeCard)
        )}
      </div>

      {/* Create Challenge Modal */}
      {showCreateModal && (
        <div className="create-challenge-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="create-challenge-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create Challenge</h3>

            <div className="form-group">
              <label>Select Opponent</label>
              <select 
                value={selectedFriend}
                onChange={(e) => setSelectedFriend(e.target.value)}
                className="friend-select"
              >
                <option value="">Choose a friend...</option>
                {friends.map(friend => (
                  <option key={friend.friend_uid} value={friend.friend_uid}>
                    User {friend.friend_uid.substring(0, 8)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Difficulty</label>
              <select 
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="difficulty-select"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </div>

            <div className="form-group">
              <label>Specialty (Optional)</label>
              <select 
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="specialty-select"
              >
                <option value="">All Specialties</option>
                <option value="cardiology">Cardiology</option>
                <option value="neurology">Neurology</option>
                <option value="pulmonology">Pulmonology</option>
                <option value="gastroenterology">Gastroenterology</option>
                <option value="nephrology">Nephrology</option>
                <option value="endocrinology">Endocrinology</option>
              </select>
            </div>

            <div className="modal-actions">
              <button 
                className="btn-create"
                onClick={handleCreateChallenge}
                disabled={!selectedFriend}
              >
                Send Challenge
              </button>
              <button 
                className="btn-cancel"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PeerChallenge;
