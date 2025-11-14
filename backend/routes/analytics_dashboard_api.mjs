/**
 * Analytics Dashboard API - Phase 6 M4
 * Admin endpoints for user metrics, pathway analytics, leaderboard stats
 */

import { Router } from 'express';
import { Timestamp } from 'firebase-admin/firestore';

const router = Router();

/**
 * GET /api/analytics_dashboard/health
 * Health check
 */
router.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'analytics_dashboard',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/analytics_dashboard/overview
 * Get high-level platform metrics
 */
router.get('/overview', async (req, res) => {
  try {
    const db = req.app.locals.db;
    
    // Total users
    const usersQuery = await db.collection('engagement_events')
      .select('uid')
      .get();
    const uniqueUsers = new Set(usersQuery.docs.map(doc => doc.data().uid));
    const totalUsers = uniqueUsers.size;

    // Active users (last 7 days)
    const sevenDaysAgo = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeUsersQuery = await db.collection('engagement_events')
      .where('timestamp', '>=', sevenDaysAgo)
      .select('uid')
      .get();
    const activeUsers = new Set(activeUsersQuery.docs.map(doc => doc.data().uid)).size;

    // Total quiz completions
    const quizzesQuery = await db.collection('engagement_events')
      .where('event_type', '==', 'quiz_completed')
      .get();
    const totalQuizzes = quizzesQuery.size;

    // Certification enrollments
    const enrollmentsQuery = await db.collection('pathway_enrollments').get();
    const totalEnrollments = enrollmentsQuery.size;

    // Certificates issued
    const certificatesQuery = await db.collection('certifications').get();
    const totalCertificates = certificatesQuery.size;

    // Exam sessions
    const examSessionsQuery = await db.collection('exam_sessions')
      .where('status', '==', 'completed')
      .get();
    const totalExamSessions = examSessionsQuery.size;

    // Average quiz accuracy
    const quizAccuracies = quizzesQuery.docs
      .map(doc => doc.data().metadata?.accuracy || 0)
      .filter(acc => acc > 0);
    const avgQuizAccuracy = quizAccuracies.length > 0
      ? Math.round(quizAccuracies.reduce((a, b) => a + b, 0) / quizAccuracies.length)
      : 0;

    res.json({
      ok: true,
      overview: {
        total_users: totalUsers,
        active_users_7d: activeUsers,
        total_quiz_completions: totalQuizzes,
        avg_quiz_accuracy: avgQuizAccuracy,
        certification_enrollments: totalEnrollments,
        certificates_issued: totalCertificates,
        exam_sessions_completed: totalExamSessions
      }
    });
  } catch (err) {
    console.error('Error getting overview:', err);
    res.status(500).json({ ok: false, error: 'Failed to get overview metrics' });
  }
});

/**
 * GET /api/analytics_dashboard/users
 * Get user analytics with pagination
 * Query: limit, offset
 */
router.get('/users', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const db = req.app.locals.db;

    // Get all unique users from engagement events
    const usersQuery = await db.collection('engagement_events')
      .select('uid', 'timestamp')
      .get();

    // Aggregate user data
    const userMap = new Map();
    usersQuery.docs.forEach(doc => {
      const data = doc.data();
      const uid = data.uid;
      
      if (!userMap.has(uid)) {
        userMap.set(uid, {
          uid,
          first_seen: data.timestamp,
          last_seen: data.timestamp,
          event_count: 0
        });
      }
      
      const user = userMap.get(uid);
      user.event_count++;
      if (data.timestamp < user.first_seen) user.first_seen = data.timestamp;
      if (data.timestamp > user.last_seen) user.last_seen = data.timestamp;
    });

    // Get XP and quiz data for each user
    const users = await Promise.all(
      Array.from(userMap.values()).map(async (user) => {
        const quizQuery = await db.collection('engagement_events')
          .where('uid', '==', user.uid)
          .where('event_type', '==', 'quiz_completed')
          .get();

        const quizzes = quizQuery.docs.map(doc => doc.data());
        const totalXp = quizzes.reduce((sum, q) => sum + (q.metadata?.xp_earned || 0), 0);
        const avgAccuracy = quizzes.length > 0
          ? Math.round(quizzes.reduce((sum, q) => sum + (q.metadata?.accuracy || 0), 0) / quizzes.length)
          : 0;

        return {
          ...user,
          total_xp: totalXp,
          quiz_count: quizzes.length,
          avg_accuracy: avgAccuracy
        };
      })
    );

    // Sort by XP descending
    users.sort((a, b) => b.total_xp - a.total_xp);

    // Paginate
    const paginatedUsers = users.slice(offset, offset + limit);

    res.json({
      ok: true,
      users: paginatedUsers,
      total: users.length,
      limit,
      offset
    });
  } catch (err) {
    console.error('Error getting users:', err);
    res.status(500).json({ ok: false, error: 'Failed to get user analytics' });
  }
});

/**
 * GET /api/analytics_dashboard/pathways
 * Get certification pathway analytics
 */
router.get('/pathways', async (req, res) => {
  try {
    const db = req.app.locals.db;

    // Get all enrollments
    const enrollmentsQuery = await db.collection('pathway_enrollments').get();
    const enrollments = enrollmentsQuery.docs.map(doc => doc.data());

    // Group by pathway
    const pathwayStats = {};
    enrollments.forEach(enrollment => {
      const pathwayId = enrollment.pathway_id;
      if (!pathwayStats[pathwayId]) {
        pathwayStats[pathwayId] = {
          pathway_id: pathwayId,
          total_enrollments: 0,
          active_enrollments: 0,
          completed_enrollments: 0,
          avg_progress: 0
        };
      }
      
      const stats = pathwayStats[pathwayId];
      stats.total_enrollments++;
      
      if (enrollment.status === 'active') stats.active_enrollments++;
      if (enrollment.status === 'completed') stats.completed_enrollments++;
      stats.avg_progress += enrollment.progress_percentage || 0;
    });

    // Calculate averages
    Object.values(pathwayStats).forEach(stats => {
      stats.avg_progress = Math.round(stats.avg_progress / stats.total_enrollments);
    });

    // Get certificates per pathway
    const certificatesQuery = await db.collection('certifications').get();
    certificatesQuery.docs.forEach(doc => {
      const cert = doc.data();
      const pathwayId = cert.pathway_id;
      if (pathwayStats[pathwayId]) {
        pathwayStats[pathwayId].certificates_issued = (pathwayStats[pathwayId].certificates_issued || 0) + 1;
      }
    });

    res.json({
      ok: true,
      pathways: Object.values(pathwayStats)
    });
  } catch (err) {
    console.error('Error getting pathway analytics:', err);
    res.status(500).json({ ok: false, error: 'Failed to get pathway analytics' });
  }
});

/**
 * GET /api/analytics_dashboard/leaderboard_stats
 * Get leaderboard distribution and tier stats
 */
router.get('/leaderboard_stats', async (req, res) => {
  try {
    const db = req.app.locals.db;

    // Get all users with XP
    const quizQuery = await db.collection('engagement_events')
      .where('event_type', '==', 'quiz_completed')
      .get();

    const userXpMap = new Map();
    quizQuery.docs.forEach(doc => {
      const data = doc.data();
      const uid = data.uid;
      const xp = data.metadata?.xp_earned || 0;
      userXpMap.set(uid, (userXpMap.get(uid) || 0) + xp);
    });

    const users = Array.from(userXpMap.entries()).map(([uid, xp]) => ({ uid, xp }));
    users.sort((a, b) => b.xp - a.xp);

    // Calculate tier distribution
    const tierDistribution = {
      diamond: 0,
      platinum: 0,
      gold: 0,
      silver: 0,
      bronze: 0,
      unranked: 0
    };

    users.forEach((user, index) => {
      const percentile = ((users.length - index) / users.length) * 100;
      
      if (percentile >= 99 && user.xp >= 50000) tierDistribution.diamond++;
      else if (percentile >= 95 && user.xp >= 25000) tierDistribution.platinum++;
      else if (percentile >= 85 && user.xp >= 10000) tierDistribution.gold++;
      else if (percentile >= 60 && user.xp >= 5000) tierDistribution.silver++;
      else if (user.xp >= 1000) tierDistribution.bronze++;
      else tierDistribution.unranked++;
    });

    // XP distribution
    const xpRanges = {
      '0-1k': 0,
      '1k-5k': 0,
      '5k-10k': 0,
      '10k-25k': 0,
      '25k-50k': 0,
      '50k+': 0
    };

    users.forEach(user => {
      if (user.xp >= 50000) xpRanges['50k+']++;
      else if (user.xp >= 25000) xpRanges['25k-50k']++;
      else if (user.xp >= 10000) xpRanges['10k-25k']++;
      else if (user.xp >= 5000) xpRanges['5k-10k']++;
      else if (user.xp >= 1000) xpRanges['1k-5k']++;
      else xpRanges['0-1k']++;
    });

    res.json({
      ok: true,
      stats: {
        total_users: users.length,
        tier_distribution: tierDistribution,
        xp_distribution: xpRanges,
        top_10_users: users.slice(0, 10),
        avg_xp: users.length > 0 ? Math.round(users.reduce((sum, u) => sum + u.xp, 0) / users.length) : 0
      }
    });
  } catch (err) {
    console.error('Error getting leaderboard stats:', err);
    res.status(500).json({ ok: false, error: 'Failed to get leaderboard stats' });
  }
});

/**
 * GET /api/analytics_dashboard/exam_stats
 * Get exam track analytics
 */
router.get('/exam_stats', async (req, res) => {
  try {
    const db = req.app.locals.db;

    // Get all completed exam sessions
    const sessionsQuery = await db.collection('exam_sessions')
      .where('status', '==', 'completed')
      .get();

    const examStats = {};
    sessionsQuery.docs.forEach(doc => {
      const session = doc.data();
      const trackId = session.exam_track_id;
      
      if (!examStats[trackId]) {
        examStats[trackId] = {
          exam_track_id: trackId,
          exam_name: session.exam_name,
          total_attempts: 0,
          avg_score: 0,
          avg_accuracy: 0,
          scores: []
        };
      }
      
      const stats = examStats[trackId];
      stats.total_attempts++;
      if (session.result) {
        stats.scores.push(session.result.score);
        stats.avg_accuracy += session.result.accuracy || 0;
      }
    });

    // Calculate averages
    Object.values(examStats).forEach(stats => {
      if (stats.scores.length > 0) {
        stats.avg_score = Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length);
        stats.avg_accuracy = Math.round(stats.avg_accuracy / stats.total_attempts);
        stats.min_score = Math.min(...stats.scores);
        stats.max_score = Math.max(...stats.scores);
      }
      delete stats.scores; // Remove raw scores from response
    });

    res.json({
      ok: true,
      exam_stats: Object.values(examStats)
    });
  } catch (err) {
    console.error('Error getting exam stats:', err);
    res.status(500).json({ ok: false, error: 'Failed to get exam stats' });
  }
});

/**
 * GET /api/analytics_dashboard/activity_timeline
 * Get activity timeline (daily/weekly/monthly)
 * Query: period=day|week|month, limit=30
 */
router.get('/activity_timeline', async (req, res) => {
  try {
    const period = req.query.period || 'day';
    const limit = parseInt(req.query.limit) || 30;
    const db = req.app.locals.db;

    // Get all engagement events
    const eventsQuery = await db.collection('engagement_events')
      .orderBy('timestamp', 'desc')
      .limit(10000) // Reasonable limit for timeline
      .get();

    const events = eventsQuery.docs.map(doc => doc.data());

    // Group by time period
    const timeline = {};
    events.forEach(event => {
      const timestamp = event.timestamp.toDate();
      let key;
      
      if (period === 'day') {
        key = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (period === 'week') {
        const weekStart = new Date(timestamp);
        weekStart.setDate(timestamp.getDate() - timestamp.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else if (period === 'month') {
        key = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!timeline[key]) {
        timeline[key] = {
          period: key,
          total_events: 0,
          unique_users: new Set(),
          quiz_completions: 0,
          xp_earned: 0
        };
      }

      const stats = timeline[key];
      stats.total_events++;
      stats.unique_users.add(event.uid);
      
      if (event.event_type === 'quiz_completed') {
        stats.quiz_completions++;
        stats.xp_earned += event.metadata?.xp_earned || 0;
      }
    });

    // Convert to array and format
    const timelineArray = Object.values(timeline)
      .map(stats => ({
        ...stats,
        unique_users: stats.unique_users.size
      }))
      .sort((a, b) => b.period.localeCompare(a.period))
      .slice(0, limit);

    res.json({
      ok: true,
      timeline: timelineArray,
      period,
      limit
    });
  } catch (err) {
    console.error('Error getting activity timeline:', err);
    res.status(500).json({ ok: false, error: 'Failed to get activity timeline' });
  }
});

/**
 * GET /api/analytics_dashboard/export
 * Export analytics data (CSV format)
 * Query: type=users|pathways|exams
 */
router.get('/export', async (req, res) => {
  try {
    const type = req.query.type || 'users';
    const db = req.app.locals.db;

    let csvData = '';

    if (type === 'users') {
      csvData = 'UID,Total XP,Quiz Count,Avg Accuracy,First Seen,Last Seen\n';
      
      // Get user data (simplified version)
      const quizQuery = await db.collection('engagement_events')
        .where('event_type', '==', 'quiz_completed')
        .get();

      const userMap = new Map();
      quizQuery.docs.forEach(doc => {
        const data = doc.data();
        if (!userMap.has(data.uid)) {
          userMap.set(data.uid, {
            uid: data.uid,
            xp: 0,
            quizzes: [],
            firstSeen: data.timestamp,
            lastSeen: data.timestamp
          });
        }
        const user = userMap.get(data.uid);
        user.xp += data.metadata?.xp_earned || 0;
        user.quizzes.push(data.metadata?.accuracy || 0);
        if (data.timestamp < user.firstSeen) user.firstSeen = data.timestamp;
        if (data.timestamp > user.lastSeen) user.lastSeen = data.timestamp;
      });

      userMap.forEach(user => {
        const avgAcc = user.quizzes.length > 0
          ? Math.round(user.quizzes.reduce((a, b) => a + b, 0) / user.quizzes.length)
          : 0;
        csvData += `${user.uid},${user.xp},${user.quizzes.length},${avgAcc},${user.firstSeen.toDate().toISOString()},${user.lastSeen.toDate().toISOString()}\n`;
      });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="medplat_${type}_${Date.now()}.csv"`);
    res.send(csvData);
  } catch (err) {
    console.error('Error exporting data:', err);
    res.status(500).json({ ok: false, error: 'Failed to export data' });
  }
});

export default router;
