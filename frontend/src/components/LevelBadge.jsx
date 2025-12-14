// frontend/src/components/LevelBadge.jsx
// Hybrid Gamification v2.0: Level Badge Component

import React from 'react';
import useGamificationStore from '../state/gamificationStore';

export default function LevelBadge({ size = 'md' }) {
  const { level } = useGamificationStore();
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-lg'
  };
  
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg`}>
      {level}
    </div>
  );
}

