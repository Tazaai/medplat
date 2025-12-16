// frontend/src/components/BranchingDecision.jsx
// Optimized Branching Decision Component - Immediate Feedback & Explanations

import React, { useState } from 'react';

export default function BranchingDecision({ 
  interactionPoint, 
  onDecision, 
  branchingLogic = {},
  showFeedback = false,
  lastDecisionCorrect = null
}) {
  const [selectedOption, setSelectedOption] = useState(null);
  
  if (!interactionPoint) {
    return null;
  }
  
  const handleSelect = (option) => {
    if (showFeedback) return; // Prevent reselection after feedback
    
    setSelectedOption(option);
    const isCorrect = option === interactionPoint.correct_path;
    const branch = branchingLogic[interactionPoint.point_id];
    
    if (onDecision) {
      onDecision({
        pointId: interactionPoint.point_id,
        selectedOption: option,
        correct: isCorrect,
        xpReward: isCorrect ? (interactionPoint.xp_reward || 20) : 0
      });
    }
  };
  
  const correctAnswer = interactionPoint.correct_path;
  
  return (
    <div className="bg-white rounded-lg shadow-md border-2 border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Clinical Decision Point</h3>
        <p className="text-gray-700 leading-relaxed text-base">{interactionPoint.question}</p>
      </div>
      
      <div className="space-y-3">
        {interactionPoint.options && interactionPoint.options.map((option, index) => {
          const isSelected = selectedOption === option;
          const isCorrectAnswer = option === correctAnswer;
          
          // Determine button styling
          let buttonClass = 'w-full p-4 text-left rounded-lg border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ';
          
          if (showFeedback) {
            // After feedback is shown
            if (isCorrectAnswer) {
              buttonClass += 'bg-green-50 border-green-500 text-green-900 font-semibold cursor-default';
            } else if (isSelected && !lastDecisionCorrect) {
              buttonClass += 'bg-red-50 border-red-500 text-red-900 cursor-default';
            } else {
              buttonClass += 'bg-gray-50 border-gray-300 text-gray-600 opacity-60 cursor-default';
            }
          } else {
            // Before selection
            if (isSelected) {
              buttonClass += 'bg-blue-100 border-blue-500 text-blue-900 font-semibold';
            } else {
              buttonClass += 'bg-white border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-400 hover:shadow-sm cursor-pointer';
            }
          }
          
          return (
            <button
              key={index}
              onClick={() => handleSelect(option)}
              disabled={showFeedback}
              className={buttonClass}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{option}</span>
                {showFeedback && isCorrectAnswer && (
                  <span className="text-green-600 font-bold text-xl">✓</span>
                )}
                {showFeedback && isSelected && !lastDecisionCorrect && (
                  <span className="text-red-600 font-bold text-xl">✗</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Immediate feedback message */}
      {showFeedback && (
        <div className={`mt-4 p-4 rounded-lg border-2 ${
          lastDecisionCorrect 
            ? 'bg-green-50 border-green-300' 
            : 'bg-red-50 border-red-300'
        }`}>
          <p className={`font-semibold ${
            lastDecisionCorrect ? 'text-green-800' : 'text-red-800'
          }`}>
            {lastDecisionCorrect 
              ? '✅ Excellent clinical judgment!'
              : '❌ Not the optimal decision. Review the explanation below.'
            }
          </p>
        </div>
      )}
    </div>
  );
}
