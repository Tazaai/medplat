/**
 * Case Summary Panel - Phase 7
 * Displays end-of-case summary with scores, strengths, weaknesses, and suggested next cases
 */

import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { safeFetchAPI } from '../utils/safeFetch'; // Phase 7: Safe fetch for progress updates

export default function CaseSummaryPanel({ 
  caseData, 
  score, 
  maxScore, 
  correctCount, 
  totalQuestions,
  questionTypes,
  onClose 
}) {
  let uid = null;
  try {
    const auth = useAuth();
    uid = auth?.uid || null;
  } catch (err) {
    console.warn('Auth context not available:', err);
    uid = null;
  }
  const [progress, setProgress] = useState(null);
  const [suggestedCases, setSuggestedCases] = useState([]);
  const [loading, setLoading] = useState(true);

  const percentage = Math.round((score / maxScore) * 100);

  useEffect(() => {
    if (!uid || !caseData) return;

    const updateProgress = async () => {
      try {
        // Phase 7: Use safe fetch for progress updates (won't interfere with quiz generation)
        const res = await safeFetchAPI(`${API_BASE}/api/progress/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid,
            topic: caseData.meta?.topic || '',
            category: caseData.meta?.category || '',
            score,
            maxScore,
            correctCount,
            totalQuestions,
            difficulty: 'intermediate',
            questionTypes
          })
        });

        const data = await res.json();
        if (data.ok) {
          setProgress(data.progress);
          
          // Get suggested cases based on weak areas
          if (data.progress?.weakAreas && data.progress.weakAreas.length > 0) {
            // TODO: Fetch suggested cases from backend
            setSuggestedCases([]);
          }
        }
      } catch (error) {
        console.error('Error updating progress:', error);
      } finally {
        setLoading(false);
      }
    };

    updateProgress();
  }, [uid, caseData, score, maxScore, correctCount, totalQuestions, questionTypes]);

  // Determine strengths and weaknesses
  const strengths = questionTypes 
    ? Object.entries(questionTypes)
        .filter(([_, { correct, total }]) => total > 0 && (correct / total) >= 0.8)
        .map(([type, _]) => type.replace(/_/g, ' '))
    : [];

  const weaknesses = questionTypes
    ? Object.entries(questionTypes)
        .filter(([_, { correct, total }]) => total > 0 && (correct / total) < 0.5)
        .map(([type, _]) => type.replace(/_/g, ' '))
    : [];

  // Get encouragement message
  const getEncouragement = () => {
    if (percentage >= 90) {
      return { 
        emoji: '🏆', 
        message: 'Outstanding! Expert-level performance!',
        color: 'text-purple-600'
      };
    } else if (percentage >= 75) {
      return { 
        emoji: '👨‍⚕️', 
        message: 'Great work! Specialist-level thinking!',
        color: 'text-blue-600'
      };
    } else if (percentage >= 50) {
      return { 
        emoji: '🩺', 
        message: 'Good progress! Keep building your skills!',
        color: 'text-green-600'
      };
    } else {
      return { 
        emoji: '🌱', 
        message: 'Keep learning! Every case makes you stronger!',
        color: 'text-orange-600'
      };
    }
  };

  const encouragement = getEncouragement();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="text-6xl mb-2">{encouragement.emoji}</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Case Complete!</h2>
        <p className={`text-lg font-semibold ${encouragement.color}`}>
          {encouragement.message}
        </p>
      </div>

      {/* Score Display */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border-2 border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-semibold text-gray-700">Your Score</span>
          <span className="text-3xl font-bold text-blue-600">{percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              percentage >= 90 ? 'bg-gradient-to-r from-purple-500 to-purple-600' :
              percentage >= 75 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
              percentage >= 50 ? 'bg-gradient-to-r from-green-500 to-green-600' :
              'bg-gradient-to-r from-orange-500 to-orange-600'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2 text-center">
          {score} / {maxScore} points ({correctCount} / {totalQuestions} correct)
        </p>
      </div>

      {/* Progress Stats */}
      {progress && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <p className="text-sm text-gray-600">Total Cases</p>
            <p className="text-2xl font-bold text-green-700">{progress.totalCases || 0}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-sm text-gray-600">Current Streak</p>
            <p className="text-2xl font-bold text-blue-700">{progress.streak || 0} 🔥</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
            <p className="text-sm text-gray-600">Overall Accuracy</p>
            <p className="text-2xl font-bold text-purple-700">{progress.overallAccuracy || 0}%</p>
          </div>
          <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
            <p className="text-sm text-gray-600">Topic Mastery</p>
            <p className="text-2xl font-bold text-indigo-700">{progress.topicMastery || 0}%</p>
          </div>
        </div>
      )}

      {/* Strengths */}
      {strengths.length > 0 && (
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <h3 className="text-lg font-semibold text-green-900 mb-2 flex items-center gap-2">
            <span>✅</span>
            <span>Your Strengths</span>
          </h3>
          <ul className="list-disc list-inside space-y-1 text-green-800">
            {strengths.map((strength, idx) => (
              <li key={idx} className="capitalize">{strength}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Weaknesses */}
      {weaknesses.length > 0 && (
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <h3 className="text-lg font-semibold text-orange-900 mb-2 flex items-center gap-2">
            <span>📚</span>
            <span>Areas to Improve</span>
          </h3>
          <ul className="list-disc list-inside space-y-1 text-orange-800">
            {weaknesses.map((weakness, idx) => (
              <li key={idx} className="capitalize">{weakness}</li>
            ))}
          </ul>
          <p className="text-sm text-orange-700 mt-2 italic">
            💡 Focus on these areas in your next cases!
          </p>
        </div>
      )}

      {/* Suggested Next Cases */}
      {suggestedCases.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <span>🎯</span>
            <span>Suggested Next Cases</span>
          </h3>
          <ul className="space-y-2">
            {suggestedCases.map((suggestion, idx) => (
              <li key={idx} className="text-blue-800">
                • {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
        >
          Continue Learning
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-semibold"
        >
          Try Another Case
        </button>
      </div>
    </div>
  );
}

