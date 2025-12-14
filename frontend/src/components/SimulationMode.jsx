// frontend/src/components/SimulationMode.jsx
// Optimized Interactive Simulation Mode - Text-Based Design, First-Class Quality

import React, { useState, useEffect } from 'react';
import VitalsTimeline from './VitalsTimeline';
import BranchingDecision from './BranchingDecision';
import MentorWindow from './MentorWindow';
import { useGamificationStore } from '../state/gamificationStore';

export default function SimulationMode({ caseData, onStepComplete }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastDecisionCorrect, setLastDecisionCorrect] = useState(null);
  const [lastXPEarned, setLastXPEarned] = useState(0);
  const [simulationXP, setSimulationXP] = useState(0);
  const [encouragement, setEncouragement] = useState("");
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [stepStartTime, setStepStartTime] = useState(Date.now());
  const [totalTime, setTotalTime] = useState(0);
  
  const { addXP, updateSpecialtyProgress, xp, level } = useGamificationStore();
  
  const simulationSteps = caseData?.simulation_steps || [];
  const interactionPoints = caseData?.interaction_points || [];
  const vitalsTimeline = caseData?.vitals_timeline || [];
  const branchingLogic = caseData?.branching_logic || {};
  const mentorExplanations = caseData?.mentor_explanations || {};
  
  const currentStep = simulationSteps[currentStepIndex];
  const currentInteraction = interactionPoints.find(
    ip => ip.point_id === currentStep?.required_input
  );
  
  // Track step time
  useEffect(() => {
    setStepStartTime(Date.now());
  }, [currentStepIndex]);
  
  // Update total time
  useEffect(() => {
    const interval = setInterval(() => {
      setTotalTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Encouragement messages
  useEffect(() => {
    if (!showFeedback || lastDecisionCorrect === null) {
      setEncouragement("");
      return;
    }
    
    if (lastDecisionCorrect) {
      if (consecutiveCorrect >= 3) {
        setEncouragement("🔥🔥🔥 Excellent clinical reasoning! You're mastering this!");
      } else if (consecutiveCorrect >= 2) {
        setEncouragement("✨ Great decision! Your clinical judgment is strong.");
      } else {
        setEncouragement("✅ Correct! +" + lastXPEarned + " XP earned");
      }
    } else {
      const messages = [
        "💡 Learning moment! Review the explanation to strengthen your understanding.",
        "📚 Good effort! Clinical reasoning improves with each decision.",
        "🧠 This was a challenging decision. The explanation will help you master it."
      ];
      setEncouragement(messages[Math.floor(Math.random() * messages.length)]);
    }
  }, [showFeedback, lastDecisionCorrect, consecutiveCorrect, lastXPEarned]);
  
  const handleDecision = async (decisionData) => {
    const { correct, xpReward, selectedOption } = decisionData;
    
    // Show feedback
    setShowFeedback(true);
    setLastDecisionCorrect(correct);
    setLastXPEarned(correct ? xpReward : 0);
    
    // Track consecutive correct
    if (correct) {
      setConsecutiveCorrect(prev => prev + 1);
    } else {
      setConsecutiveCorrect(0);
    }
    
    // Add XP if correct
    if (correct && xpReward > 0) {
      const result = addXP(xpReward, 'simulation_decision');
      setSimulationXP(prev => prev + xpReward);
      
      if (result._lastLevelUp) {
        setEncouragement(`🎉 Level Up! You've reached Level ${result.level}! 🎉`);
      }
    }
    
    // Update specialty progress
    if (caseData?.meta?.category) {
      updateSpecialtyProgress(caseData.meta.category, correct ? xpReward : 0);
    }
    
    // Mark step as completed
    setCompletedSteps([...completedSteps, currentStepIndex]);
    
    // Don't auto-advance - wait for user to continue
  };
  
  const continueToNext = () => {
    setShowFeedback(false);
    setLastDecisionCorrect(null);
    setLastXPEarned(0);
    
    // Determine next step based on branching logic
    if (lastDecisionCorrect && currentStep?.next_steps && currentStep.next_steps.length > 0) {
      const nextStepId = currentStep.next_steps[0];
      const nextStepIndex = simulationSteps.findIndex(s => s.step_id === nextStepId);
      if (nextStepIndex !== -1) {
        setCurrentStepIndex(nextStepIndex);
        return;
      }
    }
    
    // Move to next sequential step
    if (currentStepIndex < simulationSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };
  
  const handleNextStep = () => {
    if (currentStepIndex < simulationSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };
  
  const handlePreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      setShowFeedback(false);
    }
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Completion screen
  if (!currentStep || currentStepIndex >= simulationSteps.length) {
    const correctDecisions = completedSteps.length;
    const totalDecisions = interactionPoints.length;
    const completionPercentage = totalDecisions > 0 
      ? Math.round((correctDecisions / totalDecisions) * 100) 
      : 100;
    
    return (
      <div className="p-8 space-y-6">
        <div className="text-center space-y-4">
          <div className="text-6xl">🎉</div>
          <h2 className="text-3xl font-bold text-gray-900">Simulation Completed!</h2>
          <p className="text-lg text-gray-600">
            You've successfully completed all simulation steps
          </p>
        </div>
        
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Summary Statistics */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border-2 border-blue-200">
            <h3 className="text-xl font-bold mb-4 text-gray-900">📊 Performance Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-500 mb-1">Total XP Earned</p>
                <p className="text-2xl font-bold text-blue-600">{simulationXP}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-500 mb-1">Time Spent</p>
                <p className="text-2xl font-bold text-purple-600">{formatTime(totalTime)}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-500 mb-1">Steps Completed</p>
                <p className="text-2xl font-bold text-green-600">{completedSteps.length} / {simulationSteps.length}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-500 mb-1">Performance</p>
                <p className="text-2xl font-bold text-orange-600">{completionPercentage}%</p>
              </div>
            </div>
          </div>
          
          {/* Achievement Badge */}
          {completionPercentage >= 80 && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-6 border-2 border-yellow-300 text-center">
              <div className="text-4xl mb-2">🏆</div>
              <h3 className="text-lg font-bold text-gray-900">Excellent Performance!</h3>
              <p className="text-sm text-gray-600 mt-1">
                You demonstrated strong clinical reasoning throughout the simulation
              </p>
            </div>
          )}
          
          <button
            onClick={() => window.location.reload()}
            className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-bold rounded-lg shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
          >
            🔄 Try Another Simulation
          </button>
        </div>
      </div>
    );
  }
  
  const progressPercentage = ((currentStepIndex + 1) / simulationSteps.length) * 100;
  const currentStepTime = Math.floor((Date.now() - stepStartTime) / 1000);
  
  return (
    <div className="p-6 space-y-6">
      {/* Enhanced Header with Score and Progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clinical Simulation</h1>
            <p className="text-sm text-gray-500">{caseData?.meta?.topic || "Interactive Case"}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-full shadow-lg">
              <span className="text-lg font-bold">{simulationXP}</span>
              <span className="text-sm opacity-90"> XP</span>
            </div>
            <div className="text-sm font-semibold text-gray-700">
              Level {level}
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Step {currentStepIndex + 1} of {simulationSteps.length}</span>
            <span className="text-gray-600">{Math.round(progressPercentage)}% Complete</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
        
        {/* Time Tracking */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Step time: {formatTime(currentStepTime)}</span>
          <span>Total time: {formatTime(totalTime)}</span>
        </div>
      </div>
      
      {/* Immediate Feedback Banner */}
      {showFeedback && lastDecisionCorrect !== null && (
        <div className={`rounded-lg p-4 shadow-lg transition-all duration-500 ${
          lastDecisionCorrect 
            ? 'bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-400' 
            : 'bg-gradient-to-r from-red-100 to-orange-100 border-2 border-red-400'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{lastDecisionCorrect ? '✅' : '❌'}</span>
              <div>
                <p className={`text-lg font-bold ${lastDecisionCorrect ? 'text-green-800' : 'text-red-800'}`}>
                  {lastDecisionCorrect ? 'Correct Decision!' : 'Incorrect Decision'}
                </p>
                {lastDecisionCorrect && (
                  <p className="text-sm text-green-700">+{lastXPEarned} XP earned</p>
                )}
              </div>
            </div>
            {encouragement && (
              <p className={`text-sm font-semibold ${lastDecisionCorrect ? 'text-green-700' : 'text-red-700'}`}>
                {encouragement}
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* Current Step Card */}
      <div className="bg-white rounded-lg shadow-md border-2 border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Step {currentStepIndex + 1}: {currentStep.action_type || 'Clinical Decision'}
            </h2>
            {currentStep.time_elapsed > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                Case time: {currentStep.time_elapsed} minutes
              </p>
            )}
          </div>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
            {currentStep.action_type?.toUpperCase() || 'OBSERVATION'}
          </span>
        </div>
        
        <div className="prose max-w-none">
          <p className="text-gray-700 leading-relaxed text-base mb-4">
            {currentStep.description}
          </p>
        </div>
      </div>
      
      {/* Interaction Point / Decision */}
      {currentInteraction && (
        <BranchingDecision
          interactionPoint={currentInteraction}
          branchingLogic={branchingLogic}
          onDecision={handleDecision}
          showFeedback={showFeedback}
          lastDecisionCorrect={lastDecisionCorrect}
        />
      )}
      
      {/* Explanation Panel (shows after decision) */}
      {showFeedback && currentInteraction?.feedback && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-400 rounded-lg p-5 shadow-md">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-2xl">💡</span>
            <h3 className="text-lg font-bold text-blue-900">Clinical Reasoning Explanation</h3>
          </div>
          <p className="text-blue-800 leading-relaxed">
            {currentInteraction.feedback || "Review the decision and consider the clinical principles involved."}
          </p>
        </div>
      )}
      
      {/* Mentor Window */}
      <MentorWindow
        mentorExplanations={mentorExplanations}
        currentStep={currentStep.step_id}
      />
      
      {/* Vitals Timeline */}
      {vitalsTimeline.length > 0 && (
        <VitalsTimeline vitals={vitalsTimeline} currentTime={currentStep.time_elapsed || 0} />
      )}
      
      {/* Navigation */}
      <div className="flex justify-between items-center pt-4 border-t-2 border-gray-200">
        <button
          onClick={handlePreviousStep}
          disabled={currentStepIndex === 0}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Previous Step
        </button>
        
        {showFeedback && currentInteraction ? (
          <button
            onClick={continueToNext}
            className={`px-8 py-3 rounded-lg font-bold text-white shadow-lg transition-all duration-300 transform hover:scale-105 ${
              lastDecisionCorrect
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
            }`}
          >
            {currentStepIndex + 1 < simulationSteps.length ? 'Continue →' : 'Finish Simulation →'}
          </button>
        ) : !currentInteraction && (
          <button
            onClick={handleNextStep}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-bold shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
          >
            Next Step →
          </button>
        )}
      </div>
    </div>
  );
}
