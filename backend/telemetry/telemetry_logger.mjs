/**
 * MedPlat Telemetry Logger
 * Phase 4 Milestone 1 Task 3
 * 
 * Tracks:
 * - OpenAI API usage (model, tokens, latency, cost)
 * - MCQ performance (correct, partial, incorrect)
 * - Engagement metrics (time spent, hints used)
 * - Session analytics
 * 
 * Storage: Firestore collection `telemetry/{session_id}`
 * Performance target: <100ms overhead
 */

import { db } from '../firebaseClient.js';

/**
 * Cost per 1M tokens (approximate GPT-4o pricing as of 2025)
 */
const MODEL_COSTS = {
  'gpt-4o': { input: 5.0, output: 15.0 },      // $5 per 1M input, $15 per 1M output
  'gpt-4o-mini': { input: 0.15, output: 0.60 }, // $0.15 per 1M input, $0.60 per 1M output
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
};

/**
 * Log OpenAI API call telemetry
 * @param {Object} params - Telemetry parameters
 * @param {string} params.uid - User ID
 * @param {string} params.model - OpenAI model used (e.g., 'gpt-4o')
 * @param {number} params.inputTokens - Input tokens consumed
 * @param {number} params.outputTokens - Output tokens generated
 * @param {number} params.latencyMs - API call latency in milliseconds
 * @param {string} params.endpoint - API endpoint called (e.g., '/api/gamify')
 * @param {string} params.topic - Medical topic (optional)
 * @returns {Promise<void>}
 */
export async function logOpenAICall(params) {
  try {
    const {
      uid,
      model = 'gpt-4o',
      inputTokens = 0,
      outputTokens = 0,
      latencyMs = 0,
      endpoint = 'unknown',
      topic = null,
    } = params;

    // Calculate cost
    const costs = MODEL_COSTS[model] || MODEL_COSTS['gpt-4o'];
    const inputCost = (inputTokens / 1_000_000) * costs.input;
    const outputCost = (outputTokens / 1_000_000) * costs.output;
    const totalCost = inputCost + outputCost;

    const telemetryData = {
      type: 'openai_call',
      uid,
      model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      latencyMs,
      costUSD: parseFloat(totalCost.toFixed(6)),
      endpoint,
      topic,
      timestamp: new Date().toISOString(),
    };

    // Write to Firestore (non-blocking)
    await db.collection('telemetry').add(telemetryData);

    console.log(`📊 Telemetry logged: ${model} (${inputTokens + outputTokens} tokens, ${latencyMs}ms, $${totalCost.toFixed(4)})`);
  } catch (error) {
    // Non-blocking: log error but don't fail the request
    console.error('⚠️ Telemetry logging failed (non-blocking):', error.message);
  }
}

/**
 * Log MCQ quiz completion telemetry
 * @param {Object} params - Quiz telemetry parameters
 * @param {string} params.uid - User ID
 * @param {string} params.topic - Medical topic
 * @param {number} params.score - Score percentage (0-100)
 * @param {number} params.correctAnswers - Number of correct answers
 * @param {number} params.totalQuestions - Total questions
 * @param {number} params.timeSpentSeconds - Time spent on quiz
 * @param {number} params.hintsUsed - Number of hints used
 * @param {string} params.persona - User persona (Student/USMLE/Doctor)
 * @returns {Promise<void>}
 */
export async function logQuizCompletion(params) {
  try {
    const {
      uid,
      topic,
      score,
      correctAnswers,
      totalQuestions,
      timeSpentSeconds,
      hintsUsed = 0,
      persona = 'Student',
    } = params;

    const telemetryData = {
      type: 'quiz_completion',
      uid,
      topic,
      score,
      correctAnswers,
      totalQuestions,
      timeSpentSeconds,
      hintsUsed,
      persona,
      timestamp: new Date().toISOString(),
    };

    // Write to Firestore
    await db.collection('telemetry').add(telemetryData);

    console.log(`📊 Quiz telemetry logged: ${topic} (${score}% score, ${timeSpentSeconds}s)`);
  } catch (error) {
    console.error('⚠️ Quiz telemetry logging failed (non-blocking):', error.message);
  }
}

/**
 * Log general engagement event
 * @param {Object} params - Event parameters
 * @param {string} params.uid - User ID
 * @param {string} params.eventType - Event type (e.g., 'streak_extended', 'badge_earned')
 * @param {Object} params.metadata - Additional event metadata
 * @returns {Promise<void>}
 */
export async function logEngagementEvent(params) {
  try {
    const { uid, eventType, metadata = {} } = params;

    const telemetryData = {
      type: 'engagement_event',
      uid,
      eventType,
      metadata,
      timestamp: new Date().toISOString(),
    };

    await db.collection('telemetry').add(telemetryData);

    console.log(`📊 Engagement telemetry logged: ${eventType}`);
  } catch (error) {
    console.error('⚠️ Engagement telemetry logging failed (non-blocking):', error.message);
  }
}

/**
 * Get telemetry statistics (admin only)
 * @param {Object} filters - Query filters
 * @param {number} filters.limit - Number of records to retrieve (default: 100)
 * @param {string} filters.type - Filter by telemetry type (optional)
 * @param {string} filters.uid - Filter by user ID (optional)
 * @returns {Promise<Object>} Telemetry statistics
 */
export async function getTelemetryStats(filters = {}) {
  try {
    const { limit = 100, type = null, uid = null } = filters;

    let query = db.collection('telemetry').orderBy('timestamp', 'desc').limit(limit);

    if (type) {
      query = query.where('type', '==', type);
    }
    if (uid) {
      query = query.where('uid', '==', uid);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      return {
        count: 0,
        avgLatencyMs: 0,
        totalCostUSD: 0,
        modelBreakdown: {},
      };
    }

    let totalLatency = 0;
    let totalCost = 0;
    let latencyCount = 0;
    const modelBreakdown = {};

    snapshot.forEach((doc) => {
      const data = doc.data();

      if (data.latencyMs) {
        totalLatency += data.latencyMs;
        latencyCount++;
      }

      if (data.costUSD) {
        totalCost += data.costUSD;
      }

      if (data.model) {
        modelBreakdown[data.model] = (modelBreakdown[data.model] || 0) + 1;
      }
    });

    return {
      count: snapshot.size,
      avgLatencyMs: latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0,
      totalCostUSD: parseFloat(totalCost.toFixed(4)),
      modelBreakdown,
    };
  } catch (error) {
    console.error('❌ Failed to retrieve telemetry stats:', error.message);
    throw error;
  }
}
