/**
 * Progress Dashboard Component - Phase 7
 * Shows mastery per specialty, streaks, total cases, and weak areas
 */

import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';
import { useAuth } from '../contexts/AuthContext';

export default function ProgressDashboard() {
  const { uid } = useAuth() || {};
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const loadProgress = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/progress/user/${uid}`);
        const data = await res.json();
        
        if (data.ok) {
          setProgress(data.progress);
        }
      } catch (error) {
        console.error('Error loading progress:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProgress();
  }, [uid]);

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading your progress...</p>
      </div>
    );
  }

  if (!uid) {
    return (
      <div className="p-6 text-center text-gray-500">
        Please sign in to view your progress
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p className="text-lg mb-2">No progress data yet</p>
        <p className="text-sm">Complete your first case to start tracking progress!</p>
      </div>
    );
  }

  const specialties = progress.specialties || {};
  const topics = progress.topics || {};

  // Get weak areas from topics
  const weakAreas = Object.entries(topics)
    .filter(([_, topicData]) => topicData.weakAreas && topicData.weakAreas.length > 0)
    .map(([key, topicData]) => ({
      topic: topicData.topic || key,
      category: topicData.category || 'General',
      weakAreas: topicData.weakAreas || []
    }));

  return (
    <div className="p-6 space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">📊 Your Progress Dashboard</h2>
        <p className="text-gray-600">Track your learning journey</p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-gray-600 mb-1">Total Cases</p>
          <p className="text-3xl font-bold text-blue-700">{progress.totalCases || 0}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <p className="text-sm text-gray-600 mb-1">Overall Accuracy</p>
          <p className="text-3xl font-bold text-green-700">{progress.overallAccuracy || 0}%</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <p className="text-sm text-gray-600 mb-1">Current Streak</p>
          <p className="text-3xl font-bold text-orange-700">{progress.streak || 0} 🔥</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <p className="text-sm text-gray-600 mb-1">Total XP</p>
          <p className="text-3xl font-bold text-purple-700">{progress.totalXP || 0}</p>
        </div>
      </div>

      {/* Specialty Mastery */}
      {Object.keys(specialties).length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>🎯</span>
            <span>Specialty Mastery</span>
          </h3>
          <div className="space-y-4">
            {Object.entries(specialties).map(([category, specData]) => (
              <div key={category} className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{category}</h4>
                  <span className="text-lg font-bold text-blue-600">{specData.masteryScore || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-2">
                  <div
                    className={`h-full transition-all duration-500 ${
                      (specData.masteryScore || 0) >= 85 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                      (specData.masteryScore || 0) >= 70 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                      (specData.masteryScore || 0) >= 50 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                      'bg-gradient-to-r from-orange-500 to-orange-600'
                    }`}
                    style={{ width: `${Math.min(100, specData.masteryScore || 0)}%` }}
                  />
                </div>
                <div className="flex gap-4 text-sm text-gray-600">
                  <span>{specData.totalCases || 0} cases</span>
                  <span>{specData.correctCount || 0} / {specData.totalQuestions || 0} correct</span>
                  {(specData.masteryScore || 0) >= 85 && specData.totalCases >= 20 && (
                    <span className="text-green-600 font-semibold">✅ Certification Eligible</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weak Areas */}
      {weakAreas.length > 0 && (
        <div className="bg-orange-50 rounded-lg shadow-md p-6 border border-orange-200">
          <h3 className="text-xl font-bold text-orange-900 mb-4 flex items-center gap-2">
            <span>📚</span>
            <span>Areas to Improve</span>
          </h3>
          <div className="space-y-3">
            {weakAreas.map((area, idx) => (
              <div key={idx} className="bg-white rounded-lg p-3 border border-orange-200">
                <p className="font-semibold text-gray-900 mb-1">
                  {area.topic} ({area.category})
                </p>
                <ul className="list-disc list-inside text-sm text-orange-800 space-y-1">
                  {area.weakAreas.map((weak, wIdx) => (
                    <li key={wIdx} className="capitalize">{weak.replace(/_/g, ' ')}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-sm text-orange-700 mt-4 italic">
            💡 Focus on these areas in your next cases to improve your mastery!
          </p>
        </div>
      )}

      {/* Topic Progress */}
      {Object.keys(topics).length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>📖</span>
            <span>Topic Progress</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(topics).slice(0, 10).map(([key, topicData]) => (
              <div key={key} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="font-semibold text-gray-900 text-sm mb-1">
                  {topicData.topic || key}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>{topicData.totalAttempts || 0} attempts</span>
                  <span className="font-semibold text-blue-600">
                    {topicData.averageScore || 0}% avg
                  </span>
                </div>
                {topicData.bestScore && (
                  <p className="text-xs text-green-600 mt-1">
                    Best: {topicData.bestScore}%
                  </p>
                )}
              </div>
            ))}
          </div>
          {Object.keys(topics).length > 10 && (
            <p className="text-sm text-gray-500 mt-4 text-center">
              ... and {Object.keys(topics).length - 10} more topics
            </p>
          )}
        </div>
      )}

      {/* Empty State */}
      {Object.keys(specialties).length === 0 && Object.keys(topics).length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-6xl mb-4">📈</div>
          <p className="text-xl font-semibold text-gray-700 mb-2">Start Your Journey</p>
          <p className="text-gray-600">
            Complete cases to see your progress here!
          </p>
        </div>
      )}
    </div>
  );
}

