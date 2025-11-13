/**
 * MedPlat Telemetry API
 * Phase 4 Milestone 1 Task 3
 * 
 * Endpoints:
 * - POST /api/telemetry/event - Record telemetry event
 * - GET /api/telemetry/stats - Retrieve telemetry statistics (admin)
 * 
 * Integrates with Firestore telemetry collection
 */

import express from 'express';
import {
  logOpenAICall,
  logQuizCompletion,
  logEngagementEvent,
  getTelemetryStats,
} from '../telemetry/telemetry_logger.mjs';
import { registerTelemetry } from '../engagement/engagement_core.mjs';

const router = express.Router();

/**
 * POST /api/telemetry/event
 * Record a telemetry event (OpenAI call, quiz completion, engagement)
 * 
 * Body:
 * {
 *   "eventType": "openai_call" | "quiz_completion" | "engagement_event",
 *   "data": { ... event-specific data ... }
 * }
 */
router.post('/event', async (req, res) => {
  try {
    const { eventType, data } = req.body;

    if (!eventType || !data) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields: eventType, data',
      });
    }

    // Route to appropriate logger
    switch (eventType) {
      case 'openai_call':
        await logOpenAICall(data);
        break;
      case 'quiz_completion':
        await logQuizCompletion(data);
        // Trigger engagement flows for quiz completions with scores
        if (data.score !== undefined) {
          registerTelemetry({
            uid: data.uid,
            topic: data.topic,
            score: data.score,
            timestamp: new Date().toISOString(),
          }).catch(err => console.error('⚠️ Engagement registration failed:', err.message));
        }
        break;
      case 'engagement_event':
        await logEngagementEvent(data);
        break;
      default:
        return res.status(400).json({
          ok: false,
          error: `Unknown event type: ${eventType}`,
        });
    }

    return res.json({
      ok: true,
      message: `Telemetry event logged: ${eventType}`,
    });
  } catch (error) {
    console.error('❌ /api/telemetry/event error:', error);
    return res.status(500).json({
      ok: false,
      error: 'Failed to log telemetry event',
      details: error.message,
    });
  }
});

/**
 * GET /api/telemetry/stats
 * Retrieve telemetry statistics
 * 
 * Query params:
 * - limit: Number of records (default: 100)
 * - type: Filter by event type (optional)
 * - uid: Filter by user ID (optional)
 * 
 * Response:
 * {
 *   "ok": true,
 *   "stats": {
 *     "count": 150,
 *     "avgLatencyMs": 1245,
 *     "totalCostUSD": 0.523,
 *     "modelBreakdown": {
 *       "gpt-4o": 120,
 *       "gpt-4o-mini": 30
 *     }
 *   }
 * }
 */
router.get('/stats', async (req, res) => {
  try {
    const { limit, type, uid } = req.query;

    const filters = {
      limit: limit ? parseInt(limit, 10) : 100,
      type: type || null,
      uid: uid || null,
    };

    const stats = await getTelemetryStats(filters);

    return res.json({
      ok: true,
      stats,
    });
  } catch (error) {
    console.error('❌ /api/telemetry/stats error:', error);
    return res.status(500).json({
      ok: false,
      error: 'Failed to retrieve telemetry stats',
      details: error.message,
    });
  }
});

/**
 * GET /api/telemetry/engagement/:uid
 * Get engagement statistics for a user
 * 
 * Response:
 * {
 *   "ok": true,
 *   "engagement": {
 *     "uid": "user123",
 *     "latestWeeklyReport": { ... },
 *     "totalCertifications": 2
 *   }
 * }
 */
router.get('/engagement/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    
    if (!uid) {
      return res.status(400).json({
        ok: false,
        error: 'Missing uid parameter',
      });
    }

    const { getEngagementStats } = await import('../engagement/engagement_core.mjs');
    const engagement = await getEngagementStats(uid);

    return res.json({
      ok: true,
      engagement,
    });
  } catch (error) {
    console.error('❌ /api/telemetry/engagement error:', error);
    return res.status(500).json({
      ok: false,
      error: 'Failed to retrieve engagement stats',
      details: error.message,
    });
  }
});

/**
 * GET /api/telemetry/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'telemetry',
    status: 'operational',
    timestamp: new Date().toISOString(),
  });
});

export default router;
