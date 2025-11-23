/**
 * MedPlat AI Mentor Mode
 * Phase 4 Milestone 2
 * 
 * Personalized tutoring system that:
 * - Analyzes user's weak areas from Firestore
 * - Generates adaptive remediation plans
 * - Provides conversational AI tutoring
 * - Tracks progress and integrates with engagement core
 * 
 * Endpoints:
 * - POST /api/mentor/session - Start personalized tutoring session
 * - GET /api/mentor/plan/:uid - Get remediation plan for user
 * - GET /api/mentor/health - Health check
 */

import express from 'express';
import { getOpenAIClient } from '../openaiClient.js';
import { db } from '../firebaseClient.js';
import { logOpenAICall } from '../telemetry/telemetry_logger.mjs';
import { registerTelemetry } from '../engagement/engagement_core.mjs';

const router = express.Router();
const client = getOpenAIClient();

/**
 * POST /api/mentor/session
 * Start a personalized AI mentoring session
 * 
 * Body:
 * {
 *   "uid": "user123",
 *   "topic": "Atrial Fibrillation",
 *   "userMessage": "I'm struggling with rate vs rhythm control decisions",
 *   "weakAreas": ["CHA2DS2-VASc", "Anticoagulation timing"]  // optional
 * }
 * 
 * Response:
 * {
 *   "ok": true,
 *   "mentorResponse": "Let's work through rate vs rhythm control...",
 *   "remediationPlan": [...],
 *   "suggestedTopics": [...]
 * }
 */
router.post('/session', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { uid, topic, userMessage, weakAreas } = req.body;

    if (!uid || !topic) {
      return res.status(400).json({
        ok: false,
        message: 'Missing required fields: uid, topic',
        details: {}
      });
    }

    // Fetch user's weak areas from Firestore if not provided
    let userWeakAreas = weakAreas || [];
    if (!weakAreas || weakAreas.length === 0) {
      try {
        const weakAreasDoc = await db.collection('weak_areas').doc(uid).get();
        if (weakAreasDoc.exists) {
          const data = weakAreasDoc.data();
          userWeakAreas = data.areas || data.weak_areas || [];
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch weak areas for uid:', uid, error.message);
      }
    }

    // Build personalized mentor system prompt
    const systemPrompt = `You are an expert medical tutor specializing in ${topic}. Your role is to provide personalized, Socratic-method tutoring to help medical students and doctors master challenging concepts.

STUDENT PROFILE:
- Topic: ${topic}
- Known weak areas: ${userWeakAreas.length > 0 ? userWeakAreas.join(', ') : 'General review'}

YOUR TEACHING APPROACH:
1. **Socratic Method**: Ask guiding questions rather than giving direct answers
2. **Clinical Reasoning**: Use real patient scenarios to illustrate concepts
3. **Adaptive Difficulty**: Start with fundamentals, gradually increase complexity
4. **Evidence-Based**: Reference guidelines (ESC, AHA, NICE) when relevant
5. **Encouraging**: Positive reinforcement, acknowledge progress

RESPONSE STRUCTURE:
- Address the student's specific question or concern
- Ask 1-2 thought-provoking questions to deepen understanding
- Provide a brief clinical pearl or key concept
- Suggest next steps for learning

Keep responses concise (2-3 paragraphs), conversational, and clinically relevant.`;

    const userPrompt = userMessage || `I'm studying ${topic} and need help with: ${userWeakAreas.join(', ')}`;

    // Call OpenAI for mentor response
    const model = process.env.MENTOR_MODEL || 'gpt-4o-mini';
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7, // Balanced creativity and consistency
      max_tokens: 800,  // Concise tutoring responses
    });

    const latencyMs = Date.now() - startTime;
    const mentorResponse = response?.choices?.[0]?.message?.content || 'I apologize, I encountered an issue generating a response. Please try again.';

    // Generate remediation plan based on weak areas
    const remediationPlan = generateRemediationPlan(topic, userWeakAreas);

    // Log telemetry (non-blocking)
    const usage = response?.usage || {};
    logOpenAICall({
      uid,
      model,
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
      latencyMs,
      endpoint: '/api/mentor/session',
      topic,
    }).catch(err => console.error('⚠️ Telemetry log failed:', err.message));

    // Register engagement event (non-blocking)
    registerTelemetry({
      uid,
      topic,
      model,
      latency: latencyMs,
      timestamp: new Date().toISOString(),
    }).catch(err => console.error('⚠️ Engagement registration failed:', err.message));

    // Store mentor session in user's progress
    try {
      await db
        .collection('users')
        .doc(uid)
        .collection('mentor_sessions')
        .add({
          topic,
          userMessage: userPrompt,
          mentorResponse,
          weakAreas: userWeakAreas,
          remediationPlan,
          timestamp: new Date().toISOString(),
        });
    } catch (error) {
      console.warn('⚠️ Failed to store mentor session:', error.message);
    }

    return res.json({
      ok: true,
      message: 'Mentor session generated',
      details: {
        mentorResponse,
        remediationPlan,
        suggestedTopics: generateSuggestedTopics(topic, userWeakAreas),
        sessionLatency: latencyMs
      }
    });

  } catch (error) {
    console.error('❌ /api/mentor/session error:', error);
    return res.status(500).json({
      ok: false,
      message: 'Failed to generate mentor response',
      details: { error: error.message }
    });
  }
});

/**
 * GET /api/mentor/plan/:uid
 * Get personalized remediation plan for a user
 * 
 * Query params:
 * - topic: Medical topic (optional, gets plan for all topics if omitted)
 */
router.get('/plan/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { topic } = req.query;

    if (!uid) {
      return res.status(400).json({
        ok: false,
        message: 'Missing uid parameter',
        details: {}
      });
    }

    // Fetch user's weak areas
    const weakAreasDoc = await db.collection('weak_areas').doc(uid).get();
    
    if (!weakAreasDoc.exists) {
      return res.json({
        ok: true,
        message: 'No weak areas identified yet. Complete some quizzes to get a personalized plan!',
        details: {
          plan: {
            remediationSteps: [],
          }
        }
      });
    }

    const data = weakAreasDoc.data();
    const weakAreas = data.areas || data.weak_areas || [];
    const targetTopic = topic || data.topic || 'General Medicine';

    const plan = generateRemediationPlan(targetTopic, weakAreas);

    // Fetch recent mentor sessions for context
    const sessionsSnapshot = await db
      .collection('users')
      .doc(uid)
      .collection('mentor_sessions')
      .orderBy('timestamp', 'desc')
      .limit(5)
      .get();

    const recentSessions = [];
    sessionsSnapshot.forEach(doc => {
      recentSessions.push(doc.data());
    });

    return res.json({
      ok: true,
      message: 'Remediation plan generated',
      details: {
        plan: {
          topic: targetTopic,
          weakAreas,
          remediationSteps: plan,
          recentSessions: recentSessions.length,
          lastSessionDate: recentSessions[0]?.timestamp || null
        }
      }
    });

  } catch (error) {
    console.error('❌ /api/mentor/plan error:', error);
    return res.status(500).json({
      ok: false,
      message: 'Failed to generate remediation plan',
      details: { error: error.message }
    });
  }
});

/**
 * GET /api/mentor/progress/:uid
 * Get user's mentoring progress and stats
 */
router.get('/progress/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    const sessionsSnapshot = await db
      .collection('users')
      .doc(uid)
      .collection('mentor_sessions')
      .orderBy('timestamp', 'desc')
      .get();

    const topicCounts = {};
    let totalSessions = 0;

    sessionsSnapshot.forEach(doc => {
      const data = doc.data();
      totalSessions++;
      if (data.topic) {
        topicCounts[data.topic] = (topicCounts[data.topic] || 0) + 1;
      }
    });

    return res.json({
      ok: true,
      message: 'Mentor progress fetched',
      details: {
        progress: {
          uid,
          totalSessions,
          topicsStudied: Object.keys(topicCounts).length,
          topicBreakdown: topicCounts,
          mostStudiedTopic: Object.keys(topicCounts).reduce((a, b) => 
            topicCounts[a] > topicCounts[b] ? a : b, Object.keys(topicCounts)[0] || 'None'
          )
        }
      }
    });

  } catch (error) {
    console.error('❌ /api/mentor/progress error:', error);
    return res.status(500).json({
      ok: false,
      message: 'Failed to retrieve mentor progress',
      details: { error: error.message }
    });
  }
});

/**
 * GET /api/mentor/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    ok: true,
    message: 'Mentor health check',
    details: {
      service: 'ai_mentor',
      status: 'operational',
      model: process.env.MENTOR_MODEL || 'gpt-4o-mini',
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * Helper: Generate remediation plan based on weak areas
 */
function generateRemediationPlan(topic, weakAreas) {
  if (!weakAreas || weakAreas.length === 0) {
    return [
      {
        step: 1,
        focus: `Foundation concepts in ${topic}`,
        action: 'Complete baseline quizzes to identify weak areas',
        resources: 'Guidelines review + case studies',
      },
    ];
  }

  return weakAreas.slice(0, 5).map((area, index) => ({
    step: index + 1,
    focus: area,
    action: `Review ${area} through adaptive quizzes`,
    resources: `Clinical guidelines + mentor sessions`,
    priority: index === 0 ? 'High' : index === 1 ? 'Medium' : 'Standard',
  }));
}

/**
 * Helper: Generate suggested topics based on current topic and weak areas
 */
function generateSuggestedTopics(topic, weakAreas) {
  const relatedTopics = {
    'Atrial Fibrillation': ['Heart Failure', 'Stroke Prevention', 'Anticoagulation'],
    'Heart Failure': ['Atrial Fibrillation', 'Acute Coronary Syndrome', 'Cardiomyopathy'],
    'Pneumonia': ['Sepsis', 'Respiratory Failure', 'COPD Exacerbation'],
    'Sepsis': ['Shock', 'Multi-organ Failure', 'Antibiotic Stewardship'],
  };

  return relatedTopics[topic] || ['Continue with ' + topic];
}


export default router;
