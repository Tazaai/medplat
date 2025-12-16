/**
 * Certification Display Component - Phase 7
 * Shows unlocked certificates with name, specialty, score, date, and user level
 */

import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';
import { useAuth } from '../contexts/AuthContext';

export default function CertificationDisplay() {
  const { uid } = useAuth() || {};
  const [certifications, setCertifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const loadCertifications = async () => {
      try {
        // Fetch user progress to check for certifications
        const res = await fetch(`${API_BASE}/api/progress/user/${uid}`);
        const data = await res.json();
        
        if (data.ok) {
          setProgress(data.progress);
          setCertifications(data.certifications || []);
        }
      } catch (error) {
        console.error('Error loading certifications:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCertifications();
  }, [uid]);

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading certifications...</p>
      </div>
    );
  }

  if (!uid) {
    return (
      <div className="p-6 text-center text-gray-500">
        Please sign in to view your certifications
      </div>
    );
  }

  // Check for eligible certifications from progress
  const eligibleCertifications = [];
  if (progress?.specialties) {
    Object.entries(progress.specialties).forEach(([category, specData]) => {
      if (specData.masteryScore >= 85 && specData.totalCases >= 20) {
        const alreadyCertified = certifications.some(c => c.specialty === category && c.status === 'valid');
        if (!alreadyCertified) {
          eligibleCertifications.push({
            specialty: category,
            masteryScore: specData.masteryScore,
            totalCases: specData.totalCases,
            level: specData.masteryScore >= 95 ? 'Expert' : 
                  specData.masteryScore >= 90 ? 'Specialist' : 'Resident',
            status: 'eligible'
          });
        }
      }
    });
  }

  return (
    <div className="p-6 space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">🏆 Your Certifications</h2>
        <p className="text-gray-600">Earned through mastery and dedication</p>
      </div>

      {/* Eligible Certifications (not yet earned) */}
      {eligibleCertifications.length > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">🎯 Almost There!</h3>
          <p className="text-sm text-yellow-800 mb-3">
            You're eligible for these certifications. Complete a few more cases to unlock them!
          </p>
          <div className="space-y-2">
            {eligibleCertifications.map((cert, idx) => (
              <div key={idx} className="bg-white rounded-lg p-3 border border-yellow-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{cert.specialty}</p>
                    <p className="text-sm text-gray-600">
                      {cert.masteryScore}% mastery • {cert.totalCases} cases completed
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded-full text-sm font-semibold">
                    {cert.level}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Earned Certifications */}
      {certifications.length === 0 && eligibleCertifications.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-6xl mb-4">📜</div>
          <p className="text-xl font-semibold text-gray-700 mb-2">No Certifications Yet</p>
          <p className="text-gray-600 mb-4">
            Earn certifications by achieving ≥85% mastery and completing ≥20 cases in a specialty
          </p>
          <div className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-lg text-sm">
            <strong>Requirements:</strong> 85%+ mastery • 20+ cases • Consistent performance
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {certifications.map((cert, idx) => (
            <div
              key={idx}
              className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{cert.specialty || cert.pathway_name}</h3>
                  <p className="text-sm text-gray-600">
                    {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString() : 'Recently earned'}
                  </p>
                </div>
                <div className="text-4xl">🏆</div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Mastery Score</span>
                  <span className="font-semibold text-blue-700">{cert.masteryScore || 'N/A'}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Level</span>
                  <span className="px-3 py-1 bg-purple-200 text-purple-800 rounded-full text-sm font-semibold">
                    {cert.level || 'Resident'}
                  </span>
                </div>
                {cert.totalCases && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Cases Completed</span>
                    <span className="font-semibold text-gray-700">{cert.totalCases}</span>
                  </div>
                )}
              </div>

              {cert.verification_code && (
                <div className="mt-4 pt-4 border-t border-gray-300">
                  <p className="text-xs text-gray-500">
                    Verification Code: <code className="bg-gray-100 px-2 py-1 rounded">{cert.verification_code}</code>
                  </p>
                </div>
              )}

              {cert.status === 'valid' && (
                <div className="mt-4 flex items-center gap-2 text-green-700">
                  <span>✅</span>
                  <span className="text-sm font-semibold">Valid Certificate</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Progress Summary */}
      {progress && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Progress</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Cases</p>
              <p className="text-2xl font-bold text-blue-600">{progress.totalCases || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Overall Accuracy</p>
              <p className="text-2xl font-bold text-green-600">{progress.overallAccuracy || 0}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Current Streak</p>
              <p className="text-2xl font-bold text-orange-600">{progress.streak || 0} 🔥</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Certifications</p>
              <p className="text-2xl font-bold text-purple-600">{certifications.length}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

