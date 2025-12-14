// frontend/src/components/XPBar.jsx
// Hybrid Gamification v2.0: XP Progress Bar Component

import React from 'react';
import { useGamificationStore } from '../state/gamificationStore';

export default function XPBar() {
  const { xp, level, getXPForNextLevel, levelThresholds } = useGamificationStore();
  
  const currentLevelXP = levelThresholds[level] || 0;
  const nextLevelXP = levelThresholds[level + 1] || Infinity;
  const xpInCurrentLevel = xp - currentLevelXP;
  const xpNeededForNext = nextLevelXP - currentLevelXP;
  const progressPercent = nextLevelXP === Infinity ? 100 : (xpInCurrentLevel / xpNeededForNext) * 100;
  
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-700">Level {level}</span>
        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
        <span className="text-xs text-gray-600">{xp} XP</span>
      </div>
      {nextLevelXP !== Infinity && (
        <span className="text-xs text-gray-500">
          {xpNeededForNext - xpInCurrentLevel} XP to Level {level + 1}
        </span>
      )}
    </div>
  );
}

