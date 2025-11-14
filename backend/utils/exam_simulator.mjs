/**
 * Exam Simulator - Phase 6 M3
 * Handles timed exam simulations, score prediction, performance analysis
 */

import { Timestamp } from 'firebase-admin/firestore';

/**
 * Generate a timed exam session
 * @param {Object} db - Firestore instance
 * @param {string} uid - User ID
 * @param {string} examTrackId - Exam track (e.g., 'usmle-step1')
 * @param {Object} trackData - Exam track configuration
 * @param {number} questionCount - Number of questions (default: full exam)
 * @returns {Promise<Object>} - Exam session data
 */
export async function generateExamSession(db, uid, examTrackId, trackData, questionCount = null) {
  const totalQuestions = questionCount || trackData.total_questions;
  const durationMinutes = questionCount 
    ? Math.round((questionCount / trackData.total_questions) * trackData.duration_minutes)
    : trackData.duration_minutes;

  // Calculate section distribution
  const sections = trackData.sections.map(section => {
    const sectionQuestions = questionCount
      ? Math.round((section.question_count / trackData.total_questions) * totalQuestions)
      : section.question_count;
    
    return {
      name: section.name,
      question_count: sectionQuestions,
      topics: section.topics
    };
  });

  // Generate question set (placeholder - will integrate with question bank)
  const questions = [];
  let questionNumber = 1;

  for (const section of sections) {
    for (let i = 0; i < section.question_count; i++) {
      questions.push({
        id: `${examTrackId}-q${questionNumber}`,
        number: questionNumber,
        section: section.name,
        topic: section.topics[Math.floor(Math.random() * section.topics.length)],
        difficulty: trackData.difficulty,
        answered: false,
        marked: false,
        time_spent: 0
      });
      questionNumber++;
    }
  }

  const sessionId = `${uid}-${examTrackId}-${Date.now()}`;
  const session = {
    session_id: sessionId,
    user_id: uid,
    exam_track_id: examTrackId,
    exam_name: trackData.name,
    total_questions: totalQuestions,
    duration_minutes: durationMinutes,
    sections,
    questions,
    start_time: null,
    end_time: null,
    time_remaining: durationMinutes * 60, // in seconds
    status: 'created', // created | in_progress | paused | completed | submitted
    current_question: 1,
    answered_count: 0,
    marked_count: 0,
    created_at: Timestamp.now()
  };

  // Save to Firestore
  await db.collection('exam_sessions').doc(sessionId).set(session);

  return session;
}

/**
 * Start exam session timer
 */
export async function startExamSession(db, sessionId) {
  const sessionRef = db.collection('exam_sessions').doc(sessionId);
  const sessionDoc = await sessionRef.get();

  if (!sessionDoc.exists) {
    throw new Error('Session not found');
  }

  const session = sessionDoc.data();
  if (session.status !== 'created' && session.status !== 'paused') {
    throw new Error(`Cannot start session in status: ${session.status}`);
  }

  await sessionRef.update({
    status: 'in_progress',
    start_time: session.start_time || Timestamp.now(),
    last_activity: Timestamp.now()
  });

  return { ...session, status: 'in_progress', start_time: session.start_time || Timestamp.now() };
}

/**
 * Submit answer for a question
 */
export async function submitAnswer(db, sessionId, questionId, answer, timeSpent) {
  const sessionRef = db.collection('exam_sessions').doc(sessionId);
  const sessionDoc = await sessionRef.get();

  if (!sessionDoc.exists) {
    throw new Error('Session not found');
  }

  const session = sessionDoc.data();
  const questions = session.questions.map(q => {
    if (q.id === questionId) {
      return {
        ...q,
        answered: true,
        answer,
        time_spent: timeSpent
      };
    }
    return q;
  });

  const answeredCount = questions.filter(q => q.answered).length;

  await sessionRef.update({
    questions,
    answered_count: answeredCount,
    last_activity: Timestamp.now()
  });

  return { questions, answered_count };
}

/**
 * Toggle marked flag on question
 */
export async function toggleMarkQuestion(db, sessionId, questionId) {
  const sessionRef = db.collection('exam_sessions').doc(sessionId);
  const sessionDoc = await sessionRef.get();

  if (!sessionDoc.exists) {
    throw new Error('Session not found');
  }

  const session = sessionDoc.data();
  const questions = session.questions.map(q => {
    if (q.id === questionId) {
      return { ...q, marked: !q.marked };
    }
    return q;
  });

  const markedCount = questions.filter(q => q.marked).length;

  await sessionRef.update({
    questions,
    marked_count: markedCount,
    last_activity: Timestamp.now()
  });

  return { questions, marked_count };
}

/**
 * Complete exam session and calculate score
 */
export async function completeExamSession(db, sessionId) {
  const sessionRef = db.collection('exam_sessions').doc(sessionId);
  const sessionDoc = await sessionRef.get();

  if (!sessionDoc.exists) {
    throw new Error('Session not found');
  }

  const session = sessionDoc.data();

  // Calculate score (placeholder - will integrate with correct answers)
  const totalQuestions = session.total_questions;
  const answeredCount = session.answered_count;
  const correctCount = Math.round(answeredCount * (0.6 + Math.random() * 0.25)); // Simulated 60-85% accuracy
  const score = Math.round((correctCount / totalQuestions) * 100);

  // Section performance
  const sectionPerformance = session.sections.map(section => {
    const sectionQuestions = session.questions.filter(q => q.section === section.name);
    const sectionAnswered = sectionQuestions.filter(q => q.answered).length;
    const sectionCorrect = Math.round(sectionAnswered * (0.6 + Math.random() * 0.25));
    
    return {
      name: section.name,
      total: section.question_count,
      answered: sectionAnswered,
      correct: sectionCorrect,
      accuracy: sectionAnswered > 0 ? Math.round((sectionCorrect / sectionAnswered) * 100) : 0
    };
  });

  // Time analysis
  const totalTimeSpent = session.questions.reduce((sum, q) => sum + (q.time_spent || 0), 0);
  const avgTimePerQuestion = totalTimeSpent / answeredCount;

  const result = {
    session_id: sessionId,
    score,
    total_questions: totalQuestions,
    answered: answeredCount,
    correct: correctCount,
    accuracy: Math.round((correctCount / answeredCount) * 100),
    section_performance: sectionPerformance,
    time_spent_seconds: totalTimeSpent,
    avg_time_per_question: Math.round(avgTimePerQuestion),
    completed_at: Timestamp.now()
  };

  await sessionRef.update({
    status: 'completed',
    end_time: Timestamp.now(),
    result
  });

  // Save to user's exam history
  await db.collection('exam_history').add({
    user_id: session.user_id,
    exam_track_id: session.exam_track_id,
    session_id: sessionId,
    score,
    accuracy: result.accuracy,
    completed_at: Timestamp.now()
  });

  return result;
}

/**
 * Predict exam score based on user's performance history
 */
export async function predictExamScore(db, uid, examTrackId) {
  // Get user's quiz performance data
  const engagementQuery = await db.collection('engagement_events')
    .where('uid', '==', uid)
    .where('event_type', '==', 'quiz_completed')
    .orderBy('timestamp', 'desc')
    .limit(50)
    .get();

  if (engagementQuery.empty) {
    return {
      predicted_score: null,
      confidence: 'low',
      message: 'Insufficient data for prediction. Complete more quizzes to get a score prediction.'
    };
  }

  // Calculate average accuracy
  const quizzes = engagementQuery.docs.map(doc => doc.data());
  const totalAccuracy = quizzes.reduce((sum, quiz) => {
    const metadata = quiz.metadata || {};
    return sum + (metadata.accuracy || 0);
  }, 0);
  const avgAccuracy = totalAccuracy / quizzes.length;

  // Get exam history for this track
  const examHistoryQuery = await db.collection('exam_history')
    .where('user_id', '==', uid)
    .where('exam_track_id', '==', examTrackId)
    .orderBy('completed_at', 'desc')
    .limit(10)
    .get();

  let predictedScore;
  let confidence;

  if (!examHistoryQuery.empty) {
    // Use exam history for prediction
    const examScores = examHistoryQuery.docs.map(doc => doc.data().score);
    const avgExamScore = examScores.reduce((a, b) => a + b, 0) / examScores.length;
    const recentTrend = examScores.length >= 3 
      ? (examScores[0] - examScores[2]) 
      : 0;

    predictedScore = Math.round(avgExamScore + recentTrend * 0.5);
    confidence = examScores.length >= 5 ? 'high' : 'medium';
  } else {
    // Use quiz accuracy for prediction (convert accuracy to exam score estimate)
    predictedScore = Math.round(avgAccuracy * 0.9); // Conservative estimate
    confidence = quizzes.length >= 30 ? 'medium' : 'low';
  }

  return {
    predicted_score: predictedScore,
    confidence,
    based_on: {
      quiz_count: quizzes.length,
      avg_quiz_accuracy: Math.round(avgAccuracy),
      exam_attempts: examHistoryQuery.size
    }
  };
}

/**
 * Get performance analytics for exam track
 */
export async function getExamAnalytics(db, uid, examTrackId) {
  const examHistoryQuery = await db.collection('exam_history')
    .where('user_id', '==', uid)
    .where('exam_track_id', '==', examTrackId)
    .orderBy('completed_at', 'desc')
    .get();

  if (examHistoryQuery.empty) {
    return {
      attempts: 0,
      highest_score: null,
      latest_score: null,
      average_score: null,
      improvement: null,
      history: []
    };
  }

  const attempts = examHistoryQuery.docs.map(doc => ({
    session_id: doc.data().session_id,
    score: doc.data().score,
    accuracy: doc.data().accuracy,
    completed_at: doc.data().completed_at
  }));

  const scores = attempts.map(a => a.score);
  const highestScore = Math.max(...scores);
  const latestScore = scores[0];
  const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const improvement = scores.length >= 2 ? latestScore - scores[scores.length - 1] : null;

  return {
    attempts: attempts.length,
    highest_score: highestScore,
    latest_score: latestScore,
    average_score: averageScore,
    improvement,
    history: attempts.slice(0, 10) // Last 10 attempts
  };
}
