// frontend/src/state/gamificationStore.js
// Hybrid Gamification v2.0: Centralized gamification state management
// Using React hooks with localStorage persistence

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'medplat-gamification-storage';
const LEVEL_THRESHOLDS = {
  1: 0,
  2: 100,
  3: 250,
  4: 500,
  5: 1000,
  6: 2000,
  7: 3500,
  8: 5500,
  9: 8000,
  10: 12000
};

function calculateLevel(xp) {
  let level = 1;
  for (let i = 10; i >= 1; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i;
      break;
    }
  }
  return level;
}

function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to load gamification data from storage:', e);
  }
  return {
    xp: 0,
    streak: 0,
    level: 1,
    completed_cases: 0,
    specialty_progress: {}
  };
}

function saveToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save gamification data to storage:', e);
  }
}

export function useGamificationStore() {
  const [state, setState] = useState(loadFromStorage);
  
  useEffect(() => {
    saveToStorage(state);
  }, [state]);
  
  const addXP = useCallback((amount, source = 'case_completion') => {
    setState(prev => {
      const newXP = prev.xp + amount;
      const newLevel = calculateLevel(newXP);
      const newState = {
        ...prev,
        xp: newXP,
        level: newLevel,
        completed_cases: prev.completed_cases + (source === 'case_completion' ? 1 : 0)
      };
      
      const leveledUp = newLevel > prev.level;
      return { ...newState, _lastLevelUp: leveledUp ? newLevel : null };
    });
  }, []);
  
  const incrementStreak = useCallback(() => {
    setState(prev => ({ ...prev, streak: prev.streak + 1 }));
  }, []);
  
  const resetStreak = useCallback(() => {
    setState(prev => ({ ...prev, streak: 0 }));
  }, []);
  
  const updateSpecialtyProgress = useCallback((specialty, xpGain) => {
    setState(prev => {
      const current = prev.specialty_progress[specialty] || { xp: 0, cases: 0 };
      return {
        ...prev,
        specialty_progress: {
          ...prev.specialty_progress,
          [specialty]: {
            xp: current.xp + xpGain,
            cases: current.cases + 1
          }
        }
      };
    });
  }, []);
  
  const getXPForNextLevel = useCallback(() => {
    const nextLevel = state.level + 1;
    const nextThreshold = LEVEL_THRESHOLDS[nextLevel] || Infinity;
    return nextThreshold - state.xp;
  }, [state.level, state.xp]);
  
  return {
    ...state,
    levelThresholds: LEVEL_THRESHOLDS,
    addXP,
    incrementStreak,
    resetStreak,
    updateSpecialtyProgress,
    getXPForNextLevel
  };
}

export default useGamificationStore;

