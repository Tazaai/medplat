/**
 * Progress Tracking API - Phase 7
 * Tracks per-topic, per-specialty progress, mastery scores, and streaks
 */

import express from 'express';
import { db } from '../firebaseClient.js';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ ok: true, service: 'progress', status: 'operational' });
});

// POST /api/progress/update - Update user progress after quiz completion
router.post('/update', async (req, res) => {
  try {
    const { uid, topic, category, score, maxScore, correctCount, totalQuestions, difficulty, questionTypes } = req.body;

    if (!uid || !topic) {
      return res.status(400).json({ ok: false, error: 'Missing uid or topic' });
    }

    if (!db) {
      return res.json({ ok: true, message: 'Firestore unavailable - progress not persisted' });
    }

    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.exists ? userDoc.data() : {};

    // Calculate percentage
    const percentage = Math.round((score / maxScore) * 100);

    // Update overall progress
    const today = new Date().toISOString().split('T')[0];
    const progress = userData.progress || {};
    
    // Update streak
    const lastQuizDate = progress.lastQuizDate;
    const currentStreak = progress.streak || 0;
    let newStreak = currentStreak;
    
    if (lastQuizDate === today) {
      // Already quizzed today, don't increment streak
    } else if (lastQuizDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (lastQuizDate === yesterdayStr) {
        newStreak = currentStreak + 1;
      } else {
        newStreak = 1; // Reset streak
      }
    } else {
      newStreak = 1; // First quiz
    }

    // Update topic-specific progress
    const topicProgress = progress.topics || {};
    const topicKey = `${category}_${topic}`;
    
    if (!topicProgress[topicKey]) {
      topicProgress[topicKey] = {
        topic,
        category,
        totalAttempts: 0,
        correctCount: 0,
        totalQuestions: 0,
        averageScore: 0,
        bestScore: 0,
        lastAttempt: null,
        weakAreas: [],
        questionTypePerformance: {}
      };
    }

    const topicData = topicProgress[topicKey];
    topicData.totalAttempts = (topicData.totalAttempts || 0) + 1;
    topicData.correctCount = (topicData.correctCount || 0) + correctCount;
    topicData.totalQuestions = (topicData.totalQuestions || 0) + totalQuestions;
    topicData.averageScore = Math.round((topicData.correctCount / topicData.totalQuestions) * 100);
    topicData.bestScore = Math.max(topicData.bestScore || 0, percentage);
    topicData.lastAttempt = new Date().toISOString();

    // Track question type performance
    if (questionTypes && typeof questionTypes === 'object') {
      Object.entries(questionTypes).forEach(([type, { correct, total }]) => {
        if (!topicData.questionTypePerformance[type]) {
          topicData.questionTypePerformance[type] = { correct: 0, total: 0 };
        }
        topicData.questionTypePerformance[type].correct += correct;
        topicData.questionTypePerformance[type].total += total;
      });
    }

    // Identify weak areas (question types with <50% accuracy)
    topicData.weakAreas = Object.entries(topicData.questionTypePerformance)
      .filter(([_, perf]) => perf.total > 0 && (perf.correct / perf.total) < 0.5)
      .map(([type, _]) => type);

    // Update category/specialty mastery
    const specialtyProgress = progress.specialties || {};
    if (!specialtyProgress[category]) {
      specialtyProgress[category] = {
        category,
        totalCases: 0,
        totalQuestions: 0,
        correctCount: 0,
        masteryScore: 0,
        topics: {}
      };
    }

    const specialtyData = specialtyProgress[category];
    specialtyData.totalCases = (specialtyData.totalCases || 0) + 1;
    specialtyData.totalQuestions = (specialtyData.totalQuestions || 0) + totalQuestions;
    specialtyData.correctCount = (specialtyData.correctCount || 0) + correctCount;
    specialtyData.masteryScore = Math.round((specialtyData.correctCount / specialtyData.totalQuestions) * 100);
    
    if (!specialtyData.topics[topic]) {
      specialtyData.topics[topic] = { attempts: 0, bestScore: 0 };
    }
    specialtyData.topics[topic].attempts += 1;
    specialtyData.topics[topic].bestScore = Math.max(
      specialtyData.topics[topic].bestScore || 0,
      percentage
    );

    // Update overall stats
    const totalCases = (progress.totalCases || 0) + 1;
    const totalXP = (progress.totalXP || 0) + score;
    const totalQuestionsAll = (progress.totalQuestions || 0) + totalQuestions;
    const totalCorrectAll = (progress.totalCorrect || 0) + correctCount;

    // Save updated progress
    await userRef.set({
      progress: {
        ...progress,
        lastQuizDate: today,
        streak: newStreak,
        totalCases,
        totalXP,
        totalQuestions: totalQuestionsAll,
        totalCorrect: totalCorrectAll,
        overallAccuracy: Math.round((totalCorrectAll / totalQuestionsAll) * 100),
        topics: topicProgress,
        specialties: specialtyProgress,
        lastUpdated: new Date().toISOString()
      }
    }, { merge: true });

    // Check for certification eligibility
    const certifications = userData.certifications || [];
    const newCertifications = [];
    
    // Check if mastery score >= 85% and totalCases >= 20 for any specialty
    Object.entries(specialtyProgress).forEach(([cat, specData]) => {
      if (specData.masteryScore >= 85 && specData.totalCases >= 20) {
        const certId = `cert_${cat}_${uid}`;
        const alreadyCertified = certifications.some(c => c.specialty === cat && c.status === 'valid');
        
        if (!alreadyCertified) {
          newCertifications.push({
            id: certId,
            specialty: cat,
            masteryScore: specData.masteryScore,
            totalCases: specData.totalCases,
            issuedAt: new Date().toISOString(),
            status: 'valid',
            level: specData.masteryScore >= 95 ? 'Expert' : 
                  specData.masteryScore >= 90 ? 'Specialist' : 'Resident'
          });
        }
      }
    });

    // Save new certifications if any
    if (newCertifications.length > 0) {
      await userRef.set({
        certifications: [...certifications, ...newCertifications]
      }, { merge: true });
    }

    res.json({
      ok: true,
      progress: {
        streak: newStreak,
        totalCases,
        overallAccuracy: Math.round((totalCorrectAll / totalQuestionsAll) * 100),
        topicMastery: topicData.averageScore,
        specialtyMastery: specialtyData.masteryScore
      },
      newCertifications: newCertifications.length > 0 ? newCertifications : null
    });

  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/progress/user/:uid - Get user's complete progress
router.get('/user/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    if (!db) {
      return res.json({ ok: true, progress: null, message: 'Firestore unavailable' });
    }

    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.json({ ok: true, progress: null });
    }

    const userData = userDoc.data();
    const progress = userData.progress || {};
    const certifications = userData.certifications || [];

    res.json({
      ok: true,
      progress: {
        streak: progress.streak || 0,
        totalCases: progress.totalCases || 0,
        totalXP: progress.totalXP || 0,
        overallAccuracy: progress.overallAccuracy || 0,
        topics: progress.topics || {},
        specialties: progress.specialties || {},
        lastQuizDate: progress.lastQuizDate
      },
      certifications
    });

  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/progress/topic/:uid/:category/:topic - Get specific topic progress
router.get('/topic/:uid/:category/:topic', async (req, res) => {
  try {
    const { uid, category, topic } = req.params;

    if (!db) {
      return res.json({ ok: true, topicProgress: null });
    }

    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.json({ ok: true, topicProgress: null });
    }

    const progress = userDoc.data().progress || {};
    const topicKey = `${category}_${topic}`;
    const topicProgress = progress.topics?.[topicKey] || null;

    res.json({ ok: true, topicProgress });

  } catch (error) {
    console.error('Error fetching topic progress:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;

