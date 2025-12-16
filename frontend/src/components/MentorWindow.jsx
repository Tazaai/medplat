// frontend/src/components/MentorWindow.jsx
// Hybrid Gamification v2.0: Mentor Explanation Window

import React from 'react';

export default function MentorWindow({ mentorExplanations, currentStep }) {
  if (!mentorExplanations) {
    return null;
  }
  
  const stepExplanation = mentorExplanations.step_explanations?.[currentStep] || null;
  const learningPoints = mentorExplanations.learning_points || [];
  
  return (
    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
      <h3 className="text-lg font-semibold mb-3 text-blue-900">💡 Mentor Explanation</h3>
      
      {stepExplanation && (
        <div className="mb-4">
          <p className="text-sm text-gray-700">{stepExplanation}</p>
        </div>
      )}
      
      {learningPoints.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 text-blue-800">Key Learning Points:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            {learningPoints.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

