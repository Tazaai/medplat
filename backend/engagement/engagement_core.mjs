/**
 * MedPlat Engagement Core
 * Phase 4 Milestone 1 - Engagement Integration
 * 
 * Central hub connecting telemetry data to engagement features:
 * - Weekly progress reports
 * - Certification tracking
 * - Leaderboard updates
 * - Adaptive encouragement
 * 
 * All functions use Firestore batch writes for atomicity
 */

import { db } from '../firebaseClient.js';
import admin from 'firebase-admin';
import { logTelemetry } from '../telemetry/telemetry_logger.mjs';

/**
 * Register telemetry event and trigger engagement flows
 * @param {Object} sessionData - Telemetry event data
 * @param {string} sessionData.uid - User ID
 * @param {string} sessionData.topic - Medical topic
 * @param {string} sessionData.model - AI model used
 * @param {number} sessionData.score - Quiz score (0-100)
 * @param {number} sessionData.latency - API latency in ms
 * @param {string} sessionData.timestamp - ISO timestamp
 * @returns {Promise<void>}
 */
export async function registerTelemetry(sessionData) {
  try {
    const { uid, topic, score } = sessionData;

    // Skip if missing critical fields
    if (!uid || !topic) {
      console.warn('⚠️ Skipping engagement registration: missing uid or topic');
      return;
    }

    // Trigger parallel engagement flows (non-blocking)
    const promises = [];

    // Only update leaderboard if score is provided
    if (typeof score === 'number') {
      promises.push(
        updateLeaderboard(topic, uid, score).catch(err =>
          console.error('⚠️ Leaderboard update failed:', err.message)
        )
      );
    }

    // Check certification eligibility
    promises.push(
      evaluateCertification(uid).catch(err =>
        console.error('⚠️ Certification evaluation failed:', err.message)
      )
    );

    // Run all engagement flows in parallel
    await Promise.all(promises);

    console.log(`📊 Engagement flows triggered for uid=${uid}, topic=${topic}`);
  } catch (error) {
    console.error('❌ registerTelemetry error:', error.message);
    // Non-blocking: don't throw, just log
  }
}

/**
 * Generate weekly progress report for a user
 * Summarizes last 7 days of telemetry data
 * @param {string} uid - User ID
 * @returns {Promise<Object>} Progress report summary
 */
export async function generateWeeklyReport(uid) {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Query telemetry data from last 7 days
    const snapshot = await db
      .collection('telemetry')
      .where('uid', '==', uid)
      .where('timestamp', '>=', sevenDaysAgo.toISOString())
      .orderBy('timestamp', 'desc')
      .get();

    if (snapshot.empty) {
      return {
        uid,
        weekStart: sevenDaysAgo.toISOString(),
        weekEnd: new Date().toISOString(),
        totalSessions: 0,
        averageScore: 0,
        topicsStudied: [],
        totalTimeSeconds: 0,
      };
    }

    let totalScore = 0;
    let scoreCount = 0;
    let totalTime = 0;
    const topicsSet = new Set();

    snapshot.forEach(doc => {
      const data = doc.data();
      
      if (data.score !== undefined) {
        totalScore += data.score;
        scoreCount++;
      }
      
      if (data.timeSpentSeconds) {
        totalTime += data.timeSpentSeconds;
      }
      
      if (data.topic) {
        topicsSet.add(data.topic);
      }
    });

    // Fetch mentor sessions from last 7 days
    let mentorSessionCount = 0;
    const mentorTopics = new Set();
    try {
      const mentorSnapshot = await db
        .collection('users')
        .doc(uid)
        .collection('mentor_sessions')
        .where('timestamp', '>=', sevenDaysAgo.toISOString())
        .get();
      
      mentorSessionCount = mentorSnapshot.size;
      mentorSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.topic) {
          mentorTopics.add(data.topic);
        }
      });
    } catch (error) {
      console.warn('⚠️ Could not fetch mentor sessions:', error.message);
    }

    // Fetch curriculum progress from last 7 days
    let curriculumProgress = null;
    try {
      const curriculumSnapshot = await db
        .collection('users')
        .doc(uid)
        .collection('curriculum')
        .where('status', '==', 'active')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
      
      if (!curriculumSnapshot.empty) {
        const curriculumDoc = curriculumSnapshot.docs[0];
        const curriculumData = curriculumDoc.data();
        curriculumProgress = {
          examType: curriculumData.examType,
          progress: curriculumData.progress || 0,
          completedModules: curriculumData.completedModules?.length || 0,
          totalModules: curriculumData.modules?.length || curriculumData.totalWeeks || 0,
          targetWeeks: curriculumData.targetWeeks,
          daysRemaining: Math.max(0, Math.ceil(
            (new Date(curriculumData.createdAt).getTime() + 
             curriculumData.targetWeeks * 7 * 24 * 60 * 60 * 1000 - 
             Date.now()) / (24 * 60 * 60 * 1000)
          ))
        };
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch curriculum progress:', error.message);
    }

    const report = {
      uid,
      weekStart: sevenDaysAgo.toISOString(),
      weekEnd: new Date().toISOString(),
      totalSessions: snapshot.size,
      averageScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0,
      topicsStudied: Array.from(topicsSet),
      totalTimeSeconds: totalTime,
      mentorSummary: {
        sessionsCount: mentorSessionCount,
        topicsDiscussed: Array.from(mentorTopics),
      },
      curriculumProgress,
      generatedAt: new Date().toISOString(),
    };

    // Store report in Firestore
    const weekId = `week_${new Date().toISOString().split('T')[0]}`;
    await db
      .collection('users')
      .doc(uid)
      .collection('progress')
      .doc(weekId)
      .set(report, { merge: true });

    console.log(`📈 Weekly report generated for uid=${uid}: ${report.averageScore}% avg, ${report.totalSessions} sessions, ${mentorSessionCount} mentor sessions`);

    // Log analytics event
    await logTelemetry({
      uid,
      event_type: 'weekly_report_generated',
      endpoint: 'engagement_core.generateWeeklyReport',
      metadata: {
        total_sessions: report.totalSessions,
        average_score: report.averageScore,
        topics_studied: report.topicsStudied.length,
        mentor_sessions: mentorSessionCount,
        curriculum_modules_completed: curriculumProgress?.modulesCompleted || 0
      }
    }).catch(err => console.warn('⚠️ Analytics logging failed:', err.message));

    return report;
  } catch (error) {
    console.error('❌ generateWeeklyReport error:', error.message);
    throw error;
  }
}

/**
 * Update leaderboard for a topic
 * @param {string} topic - Medical topic
 * @param {string} uid - User ID
 * @param {number} score - Quiz score (0-100)
 * @returns {Promise<void>}
 */
export async function updateLeaderboard(topic, uid, score) {
  try {
    if (!topic || !uid || typeof score !== 'number') {
      console.warn('⚠️ Skipping leaderboard update: invalid parameters');
      return;
    }

    const leaderboardRef = db.collection('stats').doc('leaderboards').collection(topic).doc(uid);
    
    // Get current best score
    const doc = await leaderboardRef.get();
    const currentBest = doc.exists ? (doc.data().bestScore || 0) : 0;

    // Only update if new score is better
    if (score > currentBest) {
      await leaderboardRef.set({
        uid,
        topic,
        bestScore: score,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      console.log(`🏆 Leaderboard updated: ${topic} - uid=${uid} scored ${score}%`);
      
      // Log analytics event
      await logTelemetry({
        uid,
        event_type: 'leaderboard_update',
        endpoint: 'engagement_core.updateLeaderboard',
        metadata: {
          topic,
          score,
          previous_best: currentBest,
          improvement: score - currentBest
        }
      }).catch(err => console.warn('⚠️ Analytics logging failed:', err.message));
    }
  } catch (error) {
    console.error('❌ updateLeaderboard error:', error.message);
    throw error;
  }
}

/**
 * Evaluate if user is eligible for certification
 * Awards badge if average score ≥ 85% over last 10 quizzes
 * @param {string} uid - User ID
 * @returns {Promise<boolean>} True if certification awarded
 */
export async function evaluateCertification(uid) {
  try {
    // Get last 10 quiz completions
    const snapshot = await db
      .collection('telemetry')
      .where('uid', '==', uid)
      .where('type', '==', 'quiz_completion')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();

    if (snapshot.size < 10) {
      // Need at least 10 quizzes for certification
      return false;
    }

    let totalScore = 0;
    let count = 0;
    const topics = new Set();

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.score !== undefined) {
        totalScore += data.score;
        count++;
      }
      if (data.topic) {
        topics.add(data.topic);
      }
    });

    const averageScore = count > 0 ? totalScore / count : 0;

    // Award certification if average ≥ 85%
    if (averageScore >= 85) {
      const badgeId = `cert_${Date.now()}`;
      const topicsList = Array.from(topics);

      await db
        .collection('users')
        .doc(uid)
        .collection('certifications')
        .doc(badgeId)
        .set({
          badgeId,
          uid,
          level: averageScore >= 95 ? 'Expert' : averageScore >= 90 ? 'Advanced' : 'Proficient',
          averageScore: Math.round(averageScore),
          topicsCovered: topicsList,
          quizzesCompleted: count,
          awardedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      console.log(`🏅 Certification awarded: uid=${uid}, level=${averageScore >= 95 ? 'Expert' : 'Advanced'}, score=${Math.round(averageScore)}%`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ evaluateCertification error:', error.message);
    throw error;
  }
}

/**
 * Apply adaptive encouragement based on user's weak areas
 * Generates personalized motivational message
 * @param {string} uid - User ID
 * @returns {Promise<string>} Encouragement message
 */
export async function applyAdaptiveEncouragement(uid) {
  try {
    // Get user's recent performance
    const snapshot = await db
      .collection('telemetry')
      .where('uid', '==', uid)
      .where('type', '==', 'quiz_completion')
      .orderBy('timestamp', 'desc')
      .limit(5)
      .get();

    if (snapshot.empty) {
      return "Keep going! Start your medical learning journey today. 🎓";
    }

    let totalScore = 0;
    let count = 0;
    const recentTopics = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.score !== undefined) {
        totalScore += data.score;
        count++;
      }
      if (data.topic) {
        recentTopics.push(data.topic);
      }
    });

    const averageScore = count > 0 ? totalScore / count : 0;
    const uniqueTopics = [...new Set(recentTopics)];

    // Generate context-aware encouragement
    let message = '';
    if (averageScore >= 90) {
      message = `🌟 Outstanding work! You're excelling with ${Math.round(averageScore)}% average. Keep mastering ${uniqueTopics[0] || 'new topics'}!`;
    } else if (averageScore >= 75) {
      message = `💪 Great progress! You're at ${Math.round(averageScore)}%. Focus on weak areas in ${uniqueTopics[0] || 'your topic'} to reach expert level.`;
    } else if (averageScore >= 60) {
      message = `📚 You're building momentum at ${Math.round(averageScore)}%. Review ${uniqueTopics[0] || 'core concepts'} and try the adaptive quizzes again.`;
    } else {
      message = `🎯 Every expert was once a beginner. Focus on ${uniqueTopics[0] || 'fundamentals'} and take it one question at a time. You've got this!`;
    }

    console.log(`💬 Adaptive encouragement for uid=${uid}: "${message}"`);
    return message;
  } catch (error) {
    console.error('❌ applyAdaptiveEncouragement error:', error.message);
    return "Keep learning and improving! 🚀";
  }
}

/**
 * Get engagement statistics for a user
 * @param {string} uid - User ID
 * @returns {Promise<Object>} Engagement stats
 */
export async function getEngagementStats(uid) {
  try {
    const [progressSnap, certsSnap] = await Promise.all([
      db.collection('users').doc(uid).collection('progress').orderBy('generatedAt', 'desc').limit(1).get(),
      db.collection('users').doc(uid).collection('certifications').get(),
    ]);

    const latestProgress = progressSnap.empty ? null : progressSnap.docs[0].data();
    const certifications = certsSnap.size;

    return {
      uid,
      latestWeeklyReport: latestProgress,
      totalCertifications: certifications,
      retrievedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ getEngagementStats error:', error.message);
    throw error;
  }
}
