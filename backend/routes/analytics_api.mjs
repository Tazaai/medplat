/**
 * analytics_api.mjs
 * 
 * Phase 4 Milestone 4: Analytics & Optimization
 * 
 * Admin dashboard API providing:
 * - KPI overview (users, sessions, performance)
 * - Performance metrics (p50/p95/p99 latency, token usage, costs)
 * - A/B testing framework (create experiments, fetch results)
 * - Automatic aggregation jobs (every 6h to stats/analytics/{date})
 * 
 * Data Sources:
 * - Firestore: telemetry, users, mentor_sessions, curriculum, stats/analytics
 * - Real-time aggregation from telemetry logs
 * 
 * Authorization: Admin-only endpoints (uid check against users/{uid}.role)
 */

import { Router } from 'express';
import { db } from '../firebaseClient.js';
import { logEngagementEvent } from '../telemetry/telemetry_logger.mjs';
import admin from 'firebase-admin';

const router = Router();
const FieldValue = admin.firestore.FieldValue;

// ========================================
// HELPER: Check Admin Role
// ========================================
async function isAdmin(uid) {
  if (!uid) return false;
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) return false;
    const userData = userDoc.data();
    return userData.role === 'admin' || userData.isAdmin === true;
  } catch (err) {
    console.error('❌ Admin check error:', err);
    return false;
  }
}

// ========================================
// HELPER: Calculate Percentiles
// ========================================
function calculatePercentile(sortedArray, percentile) {
  if (sortedArray.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, index)];
}

// ========================================
// HELPER: Aggregate Telemetry Data
// ========================================
async function aggregateTelemetryData() {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Fetch telemetry logs from last 24h
    const telemetrySnapshot = await db.collection('telemetry')
      .where('timestamp', '>=', last24h)
      .orderBy('timestamp', 'desc')
      .limit(10000)
      .get();
    
    const latencies = [];
    const tokenUsages = [];
    const endpoints = {};
    const regions = {};
    let totalCost = 0;
    
    telemetrySnapshot.forEach(doc => {
      const data = doc.data();
      
      // Latency tracking
      if (data.latency_ms) {
        latencies.push(data.latency_ms);
      }
      
      // Token usage tracking
      if (data.tokens) {
        tokenUsages.push(data.tokens);
        // Rough cost estimation: $0.15/1M input tokens, $0.60/1M output tokens (gpt-4o-mini)
        const inputCost = (data.tokens.prompt_tokens || 0) * 0.00000015;
        const outputCost = (data.tokens.completion_tokens || 0) * 0.00000060;
        totalCost += inputCost + outputCost;
      }
      
      // Endpoint usage
      if (data.endpoint) {
        endpoints[data.endpoint] = (endpoints[data.endpoint] || 0) + 1;
      }
      
      // Region distribution
      if (data.region) {
        regions[data.region] = (regions[data.region] || 0) + 1;
      }
    });
    
    // Calculate percentiles
    latencies.sort((a, b) => a - b);
    const p50_latency = calculatePercentile(latencies, 50);
    const p95_latency = calculatePercentile(latencies, 95);
    const p99_latency = calculatePercentile(latencies, 99);
    
    // Calculate token statistics
    tokenUsages.sort((a, b) => a - b);
    const avgTokens = tokenUsages.length > 0 
      ? Math.round(tokenUsages.reduce((sum, t) => sum + t, 0) / tokenUsages.length)
      : 0;
    
    return {
      telemetry: {
        last24h: telemetrySnapshot.size,
        p50_latency_ms: Math.round(p50_latency),
        p95_latency_ms: Math.round(p95_latency),
        p99_latency_ms: Math.round(p99_latency),
        avg_tokens: avgTokens,
        total_cost_usd: parseFloat(totalCost.toFixed(4)),
        endpoints: Object.entries(endpoints).sort((a, b) => b[1] - a[1]).slice(0, 10),
        regions: Object.entries(regions).sort((a, b) => b[1] - a[1])
      }
    };
  } catch (err) {
    console.error('❌ Telemetry aggregation error:', err);
    return {
      telemetry: {
        last24h: 0,
        p50_latency_ms: 0,
        p95_latency_ms: 0,
        p99_latency_ms: 0,
        avg_tokens: 0,
        total_cost_usd: 0,
        endpoints: [],
        regions: []
      }
    };
  }
}

// ========================================
// HELPER: Aggregate User Data
// ========================================
async function aggregateUserData() {
  try {
    const now = new Date();
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Total users
    const usersSnapshot = await db.collection('users').get();
    const totalUsers = usersSnapshot.size;
    
    // Active users (users with telemetry in last 7 days)
    const activeTelemetry = await db.collection('telemetry')
      .where('timestamp', '>=', last7d)
      .get();
    
    const activeUids = new Set();
    activeTelemetry.forEach(doc => {
      const data = doc.data();
      if (data.uid) activeUids.add(data.uid);
    });
    
    // Average quiz score (from telemetry quiz_completed events)
    const quizEvents = await db.collection('telemetry')
      .where('event_type', '==', 'quiz_completed')
      .where('timestamp', '>=', last30d)
      .limit(1000)
      .get();
    
    const scores = [];
    quizEvents.forEach(doc => {
      const data = doc.data();
      if (data.metadata && data.metadata.score !== undefined) {
        scores.push(data.metadata.score);
      }
    });
    
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : 0;
    
    return {
      users: {
        total: totalUsers,
        active_7d: activeUids.size,
        avg_quiz_score: avgScore,
        completion_rate: scores.length > 0 ? Math.round((scores.filter(s => s >= 70).length / scores.length) * 100) : 0
      }
    };
  } catch (err) {
    console.error('❌ User aggregation error:', err);
    return {
      users: {
        total: 0,
        active_7d: 0,
        avg_quiz_score: 0,
        completion_rate: 0
      }
    };
  }
}

// ========================================
// HELPER: Aggregate Mentor Data
// ========================================
async function aggregateMentorData() {
  try {
    const now = new Date();
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const mentorSnapshot = await db.collection('mentor_sessions')
      .where('timestamp', '>=', last7d)
      .get();
    
    const sessions = mentorSnapshot.size;
    const topics = new Set();
    
    mentorSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.topic) topics.add(data.topic);
    });
    
    return {
      mentor: {
        sessions_7d: sessions,
        unique_topics: topics.size
      }
    };
  } catch (err) {
    console.error('❌ Mentor aggregation error:', err);
    return {
      mentor: {
        sessions_7d: 0,
        unique_topics: 0
      }
    };
  }
}

// ========================================
// HELPER: Aggregate Curriculum Data
// ========================================
async function aggregateCurriculumData() {
  try {
    // Query all users to aggregate curriculum progress
    const usersSnapshot = await db.collection('users').get();
    
    let totalPaths = 0;
    let completedModules = 0;
    let totalModules = 0;
    const examTypes = {};
    
    for (const userDoc of usersSnapshot.docs) {
      const curriculumSnapshot = await db.collection('users')
        .doc(userDoc.id)
        .collection('curriculum')
        .get();
      
      curriculumSnapshot.forEach(currDoc => {
        const data = currDoc.data();
        totalPaths++;
        
        if (data.examType) {
          examTypes[data.examType] = (examTypes[data.examType] || 0) + 1;
        }
        
        if (data.modules && Array.isArray(data.modules)) {
          totalModules += data.modules.length;
          completedModules += data.modules.filter(m => m.completed).length;
        }
      });
    }
    
    const avgCompletion = totalModules > 0
      ? Math.round((completedModules / totalModules) * 100)
      : 0;
    
    return {
      curriculum: {
        total_paths: totalPaths,
        avg_completion: avgCompletion,
        exam_distribution: Object.entries(examTypes).sort((a, b) => b[1] - a[1])
      }
    };
  } catch (err) {
    console.error('❌ Curriculum aggregation error:', err);
    return {
      curriculum: {
        total_paths: 0,
        avg_completion: 0,
        exam_distribution: []
      }
    };
  }
}

// ========================================
// ENDPOINT: GET /api/analytics/health
// ========================================
router.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'analytics',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

// ========================================
// ENDPOINT: GET /api/analytics/overview
// Admin-only: Return comprehensive KPIs
// ========================================
router.get('/overview', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { uid } = req.query;
    
    // Admin check
    const adminAccess = await isAdmin(uid);
    if (!adminAccess) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }
    
    // Aggregate all data in parallel
    const [telemetryData, userData, mentorData, curriculumData] = await Promise.all([
      aggregateTelemetryData(),
      aggregateUserData(),
      aggregateMentorData(),
      aggregateCurriculumData()
    ]);
    
    const overview = {
      ...telemetryData,
      ...userData,
      ...mentorData,
      ...curriculumData,
      generated_at: new Date().toISOString()
    };
    
    // Log telemetry
    await logEngagementEvent({
      uid,
      event_type: 'analytics_overview',
      endpoint: '/api/analytics/overview',
      latency_ms: Date.now() - startTime,
      metadata: {
        total_users: overview.users.total,
        active_users: overview.users.active_7d
      }
    });
    
    res.json(overview);
  } catch (err) {
    console.error('❌ Analytics overview error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
});

// ========================================
// ENDPOINT: GET /api/analytics/performance
// Admin-only: Return performance metrics
// ========================================
router.get('/performance', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { uid, timeRange = '24h' } = req.query;
    
    // Admin check
    const adminAccess = await isAdmin(uid);
    if (!adminAccess) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }
    
    // Calculate time range
    const now = new Date();
    let startDate;
    switch (timeRange) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    
    // Fetch telemetry data
    const telemetrySnapshot = await db.collection('telemetry')
      .where('timestamp', '>=', startDate)
      .orderBy('timestamp', 'desc')
      .limit(50000)
      .get();
    
    const latencies = [];
    const tokenUsages = [];
    const costs = [];
    const timeSeriesData = {};
    
    telemetrySnapshot.forEach(doc => {
      const data = doc.data();
      
      if (data.latency_ms) {
        latencies.push(data.latency_ms);
      }
      
      if (data.tokens) {
        const total = (data.tokens.prompt_tokens || 0) + (data.tokens.completion_tokens || 0);
        tokenUsages.push(total);
        
        const inputCost = (data.tokens.prompt_tokens || 0) * 0.00000015;
        const outputCost = (data.tokens.completion_tokens || 0) * 0.00000060;
        costs.push(inputCost + outputCost);
      }
      
      // Time series aggregation (hourly buckets)
      if (data.timestamp) {
        const hour = new Date(data.timestamp.toDate()).toISOString().slice(0, 13);
        if (!timeSeriesData[hour]) {
          timeSeriesData[hour] = {
            hour,
            requests: 0,
            avg_latency: [],
            avg_tokens: []
          };
        }
        timeSeriesData[hour].requests++;
        if (data.latency_ms) timeSeriesData[hour].avg_latency.push(data.latency_ms);
        if (data.tokens) {
          const total = (data.tokens.prompt_tokens || 0) + (data.tokens.completion_tokens || 0);
          timeSeriesData[hour].avg_tokens.push(total);
        }
      }
    });
    
    // Calculate metrics
    latencies.sort((a, b) => a - b);
    tokenUsages.sort((a, b) => a - b);
    
    const performance = {
      time_range: timeRange,
      total_requests: telemetrySnapshot.size,
      latency: {
        p50_ms: calculatePercentile(latencies, 50),
        p95_ms: calculatePercentile(latencies, 95),
        p99_ms: calculatePercentile(latencies, 99),
        avg_ms: latencies.length > 0 
          ? Math.round(latencies.reduce((sum, l) => sum + l, 0) / latencies.length)
          : 0
      },
      tokens: {
        p50: calculatePercentile(tokenUsages, 50),
        p95: calculatePercentile(tokenUsages, 95),
        p99: calculatePercentile(tokenUsages, 99),
        avg: tokenUsages.length > 0
          ? Math.round(tokenUsages.reduce((sum, t) => sum + t, 0) / tokenUsages.length)
          : 0
      },
      cost: {
        total_usd: parseFloat(costs.reduce((sum, c) => sum + c, 0).toFixed(4)),
        avg_per_request_usd: costs.length > 0
          ? parseFloat((costs.reduce((sum, c) => sum + c, 0) / costs.length).toFixed(6))
          : 0
      },
      time_series: Object.values(timeSeriesData).map(bucket => ({
        hour: bucket.hour,
        requests: bucket.requests,
        avg_latency_ms: bucket.avg_latency.length > 0
          ? Math.round(bucket.avg_latency.reduce((sum, l) => sum + l, 0) / bucket.avg_latency.length)
          : 0,
        avg_tokens: bucket.avg_tokens.length > 0
          ? Math.round(bucket.avg_tokens.reduce((sum, t) => sum + t, 0) / bucket.avg_tokens.length)
          : 0
      })).sort((a, b) => a.hour.localeCompare(b.hour))
    };
    
    // Log telemetry
    await logEngagementEvent({
      uid,
      event_type: 'analytics_performance',
      endpoint: '/api/analytics/performance',
      latency_ms: Date.now() - startTime,
      metadata: {
        time_range: timeRange,
        total_requests: performance.total_requests
      }
    });
    
    res.json(performance);
  } catch (err) {
    console.error('❌ Analytics performance error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
});

// ========================================
// ENDPOINT: POST /api/analytics/abtest
// Admin-only: Create A/B test experiment
// ========================================
router.post('/abtest', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { uid, name, description, variants, startDate, endDate } = req.body;
    
    // Admin check
    const adminAccess = await isAdmin(uid);
    if (!adminAccess) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }
    
    // Validation
    if (!name || !variants || !Array.isArray(variants) || variants.length < 2) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'name and variants (array, min 2) are required'
      });
    }
    
    // Create experiment
    const experimentRef = db.collection('experiments').doc();
    const experiment = {
      id: experimentRef.id,
      name,
      description: description || '',
      variants: variants.map((v, idx) => ({
        id: `variant_${idx}`,
        name: v.name || `Variant ${idx + 1}`,
        description: v.description || '',
        allocation: v.allocation || (100 / variants.length), // Equal split by default
        config: v.config || {}
      })),
      status: 'active',
      start_date: startDate || new Date().toISOString(),
      end_date: endDate || null,
      created_by: uid,
      created_at: FieldValue.serverTimestamp(),
      results: {
        total_users: 0,
        variant_assignments: {},
        metrics: {}
      }
    };
    
    await experimentRef.set(experiment);
    
    // Log telemetry
    await logEngagementEvent({
      uid,
      event_type: 'abtest_created',
      endpoint: '/api/analytics/abtest',
      latency_ms: Date.now() - startTime,
      metadata: {
        experiment_id: experiment.id,
        name: experiment.name,
        variants: variants.length
      }
    });
    
    res.json({
      success: true,
      experiment
    });
  } catch (err) {
    console.error('❌ A/B test creation error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
});

// ========================================
// ENDPOINT: GET /api/analytics/abtest/:id
// Admin-only: Fetch A/B test results
// ========================================
router.get('/abtest/:id', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { id } = req.params;
    const { uid } = req.query;
    
    // Admin check
    const adminAccess = await isAdmin(uid);
    if (!adminAccess) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }
    
    const experimentDoc = await db.collection('experiments').doc(id).get();
    
    if (!experimentDoc.exists) {
      return res.status(404).json({
        error: 'Not found',
        message: `Experiment ${id} not found`
      });
    }
    
    const experiment = experimentDoc.data();
    
    // Fetch assignment data
    const assignmentsSnapshot = await db.collection('experiment_assignments')
      .where('experiment_id', '==', id)
      .get();
    
    const variantMetrics = {};
    experiment.variants.forEach(v => {
      variantMetrics[v.id] = {
        name: v.name,
        users: 0,
        conversions: 0,
        avg_score: 0,
        scores: []
      };
    });
    
    assignmentsSnapshot.forEach(doc => {
      const data = doc.data();
      const variantId = data.variant_id;
      
      if (variantMetrics[variantId]) {
        variantMetrics[variantId].users++;
        
        if (data.converted) {
          variantMetrics[variantId].conversions++;
        }
        
        if (data.score !== undefined) {
          variantMetrics[variantId].scores.push(data.score);
        }
      }
    });
    
    // Calculate averages
    Object.keys(variantMetrics).forEach(vId => {
      const metric = variantMetrics[vId];
      if (metric.scores.length > 0) {
        metric.avg_score = Math.round(
          metric.scores.reduce((sum, s) => sum + s, 0) / metric.scores.length
        );
      }
      metric.conversion_rate = metric.users > 0
        ? parseFloat(((metric.conversions / metric.users) * 100).toFixed(2))
        : 0;
      delete metric.scores; // Remove raw scores from response
    });
    
    const results = {
      experiment: {
        id: experiment.id,
        name: experiment.name,
        description: experiment.description,
        status: experiment.status,
        start_date: experiment.start_date,
        end_date: experiment.end_date
      },
      total_users: assignmentsSnapshot.size,
      variants: Object.entries(variantMetrics).map(([id, data]) => ({
        id,
        name: data.name,
        users: data.users,
        conversions: data.conversions,
        conversion_rate: data.conversion_rate,
        avg_score: data.avg_score
      }))
    };
    
    // Log telemetry
    await logEngagementEvent({
      uid,
      event_type: 'abtest_viewed',
      endpoint: `/api/analytics/abtest/${id}`,
      latency_ms: Date.now() - startTime,
      metadata: {
        experiment_id: id,
        total_users: results.total_users
      }
    });
    
    res.json(results);
  } catch (err) {
    console.error('❌ A/B test fetch error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
});

// ========================================
// AUTOMATIC AGGREGATION JOB
// Store stats every 6 hours to stats/analytics/{date}
// ========================================
async function runAggregationJob() {
  try {
    console.log('🔄 Running analytics aggregation job...');
    
    const [telemetryData, userData, mentorData, curriculumData] = await Promise.all([
      aggregateTelemetryData(),
      aggregateUserData(),
      aggregateMentorData(),
      aggregateCurriculumData()
    ]);
    
    const aggregatedStats = {
      ...telemetryData,
      ...userData,
      ...mentorData,
      ...curriculumData,
      generated_at: new Date().toISOString()
    };
    
    // Store to Firestore
    const dateKey = new Date().toISOString().split('T')[0];
    const hourKey = new Date().toISOString().slice(0, 13).replace('T', '_');
    
    await db.collection('stats').doc('analytics').collection(dateKey).doc(hourKey).set({
      ...aggregatedStats,
      timestamp: FieldValue.serverTimestamp()
    });
    
    console.log(`✅ Analytics aggregation complete: stats/analytics/${dateKey}/${hourKey}`);
  } catch (err) {
    console.error('❌ Aggregation job error:', err);
  }
}

// Schedule aggregation job every 6 hours
setInterval(runAggregationJob, 6 * 60 * 60 * 1000);

// Run initial aggregation on startup (delayed 30s)
setTimeout(runAggregationJob, 30000);

// ========================================
// EXPORT ROUTER
// ========================================
export default router;
