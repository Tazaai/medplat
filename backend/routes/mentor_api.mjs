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

/**
 * POST /api/mentor/ecg-path
 * Phase 9: Generate personalized 7-day ECG study plan
 * 
 * Body:
 * {
 *   "performanceByCategory": { [category]: { correct, wrong } },
 *   "level": number,
 *   "streak": number,
 *   "weakCategories": string[]
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "plan": [ { day, focus, cases, categories, xpTarget, motivation }, ... ],
 *     "summary": string,
 *     "weakAreaFocus": string[],
 *     "weeklyXpGoal": number,
 *     "encouragement": string
 *   },
 *   "meta": { currentLevel, currentStreak, accuracy, totalAttempts, weakCategories }
 * }
 */
router.post('/ecg-path', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { 
      performanceByCategory = {}, 
      level = 1, 
      streak = 0, 
      weakCategories = [] 
    } = req.body;

    // Calculate overall accuracy
    let totalCorrect = 0;
    let totalWrong = 0;
    Object.values(performanceByCategory).forEach(cat => {
      totalCorrect += cat.correct || 0;
      totalWrong += cat.wrong || 0;
    });
    const totalAttempts = totalCorrect + totalWrong;
    const accuracy = totalAttempts > 0 ? ((totalCorrect / totalAttempts) * 100).toFixed(1) : 0;

    // Build AI prompt
    const prompt = `You are an expert medical educator specializing in ECG interpretation. Create a personalized 7-day ECG study plan.

**Student Profile:**
- Current Level: ${level}
- Current Streak: ${streak} correct answers
- Overall Accuracy: ${accuracy}%
- Total Cases Attempted: ${totalAttempts}
- Weak Categories: ${weakCategories.length > 0 ? weakCategories.join(', ') : 'None identified yet'}

**Performance by Category:**
${Object.entries(performanceByCategory).map(([cat, stats]) => {
  const catTotal = (stats.correct || 0) + (stats.wrong || 0);
  const catAccuracy = catTotal > 0 ? ((stats.correct / catTotal) * 100).toFixed(1) : 0;
  return `- ${cat}: ${stats.correct}/${catTotal} correct (${catAccuracy}%)`;
}).join('\n') || 'No performance data yet'}

**Study Plan Requirements:**
1. Create exactly 7 days of study tasks
2. Focus 60% on weak categories: ${weakCategories.join(', ') || 'balanced review'}
3. Focus 40% on unlocked/new categories for variety
4. Each day should have:
   - Specific focus area (1-2 ECG categories)
   - Recommended number of cases (3-5 per day)
   - Daily XP target
   - Motivational message (1 sentence, encouraging)
5. Include specific ECG categories: arrhythmias, ischemia, conduction_blocks, chamber_abnormalities, electrolyte_disorders, pacemakers
6. Total weekly XP goal should be: ${level * 100 + 50}

**Output Format (JSON only, no additional text):**
{
  "plan": [
    {
      "day": 1,
      "focus": "Arrhythmias - Basic rhythms",
      "cases": 4,
      "categories": ["arrhythmias"],
      "xpTarget": 40,
      "motivation": "Start with rhythm recognition - the foundation of ECG mastery!"
    }
  ],
  "summary": "Brief 2-sentence overview",
  "weakAreaFocus": ["category1"],
  "weeklyXpGoal": 350,
  "encouragement": "Personalized message"
}`;

    // Call OpenAI
    const completion = await client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert medical educator creating personalized ECG study plans. Always respond with valid JSON only, no additional text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });

    // Log telemetry
    await logOpenAICall('ecg-mentor-plan', completion.usage);

    // Parse response
    let studyPlan;
    try {
      const content = completion.choices[0].message.content.trim();
      // Remove markdown code blocks if present
      const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      studyPlan = JSON.parse(jsonContent);
    } catch (parseError) {
      console.warn('JSON parsing failed, using fallback plan:', parseError.message);
      studyPlan = generateFallbackECGPlan(level, weakCategories, accuracy);
    }

    res.json({
      ok: true,
      message: 'ECG study plan generated',
      details: {
        plan: studyPlan.plan,
        summary: studyPlan.summary,
        weakAreaFocus: studyPlan.weakAreaFocus,
        weeklyXpGoal: studyPlan.weeklyXpGoal,
        encouragement: studyPlan.encouragement,
        meta: {
          currentLevel: level,
          currentStreak: streak,
          accuracy: parseFloat(accuracy),
          totalAttempts,
          weakCategories
        }
      }
    });

  } catch (error) {
    console.error('Error generating AI mentor ECG plan:', error);
    
    // Fallback plan on error
    const fallbackPlan = generateFallbackECGPlan(
      req.body.level || 1, 
      req.body.weakCategories || [], 
      0
    );

    res.json({
      ok: true,
      message: 'Fallback ECG study plan generated',
      details: {
        plan: fallbackPlan.plan,
        summary: fallbackPlan.summary,
        weakAreaFocus: fallbackPlan.weakAreaFocus,
        weeklyXpGoal: fallbackPlan.weeklyXpGoal,
        encouragement: fallbackPlan.encouragement,
        meta: {
          fallback: true,
          reason: 'AI service unavailable - using template plan'
        }
      }
    });
  }
});

/**
 * Helper: Generate fallback ECG study plan when AI is unavailable
 */
function generateFallbackECGPlan(level, weakCategories, accuracy) {
  const allCategories = [
    'arrhythmias', 
    'ischemia', 
    'conduction_blocks', 
    'chamber_abnormalities', 
    'electrolyte_disorders', 
    'pacemakers'
  ];

  // Prioritize weak categories
  let focusCategories = [...weakCategories];
  if (focusCategories.length === 0) {
    focusCategories = allCategories.slice(0, 2);
  }

  // Mix weak + new categories
  const otherCategories = allCategories.filter(c => !focusCategories.includes(c));
  const mixedCategories = [];
  
  for (let i = 0; i < 7; i++) {
    if (i < 4) {
      mixedCategories.push(focusCategories[i % focusCategories.length]);
    } else {
      mixedCategories.push(otherCategories[(i - 4) % otherCategories.length]);
    }
  }

  const dailyXp = Math.floor((level * 100 + 50) / 7);
  const weeklyXpGoal = level * 100 + 50;

  const capitalize = (str) => str.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const plan = [
    {
      day: 1,
      focus: `${capitalize(mixedCategories[0])} - Foundation`,
      cases: 4,
      categories: [mixedCategories[0]],
      xpTarget: dailyXp,
      motivation: "Build your ECG foundation with systematic practice!"
    },
    {
      day: 2,
      focus: `${capitalize(mixedCategories[1])} - Pattern Recognition`,
      cases: 4,
      categories: [mixedCategories[1]],
      xpTarget: dailyXp,
      motivation: "Pattern recognition improves with consistent exposure!"
    },
    {
      day: 3,
      focus: `${capitalize(mixedCategories[2])} - Clinical Correlation`,
      cases: 5,
      categories: [mixedCategories[2]],
      xpTarget: dailyXp,
      motivation: "Connect ECG findings to clinical scenarios!"
    },
    {
      day: 4,
      focus: `${capitalize(mixedCategories[3])} - Deep Dive`,
      cases: 5,
      categories: [mixedCategories[3]],
      xpTarget: dailyXp,
      motivation: "Master the details - accuracy comes from understanding!"
    },
    {
      day: 5,
      focus: `${capitalize(mixedCategories[4])} - Mixed Practice`,
      cases: 4,
      categories: [mixedCategories[4], mixedCategories[0]],
      xpTarget: dailyXp,
      motivation: "Variety strengthens your diagnostic skills!"
    },
    {
      day: 6,
      focus: `${capitalize(mixedCategories[5])} - Challenge Mode`,
      cases: 5,
      categories: [mixedCategories[5], mixedCategories[1]],
      xpTarget: dailyXp,
      motivation: "Push your limits - you're ready for harder cases!"
    },
    {
      day: 7,
      focus: "Comprehensive Review - All Categories",
      cases: 6,
      categories: mixedCategories.slice(0, 3),
      xpTarget: dailyXp,
      motivation: "Weekly review solidifies your learning - finish strong!"
    }
  ];

  return {
    plan,
    summary: `This 7-day plan focuses on strengthening your weak areas (${weakCategories.join(', ') || 'balanced review'}) while maintaining variety. Complete 31 cases this week to boost your ECG mastery!`,
    weakAreaFocus: weakCategories.length > 0 ? weakCategories : focusCategories.slice(0, 2),
    weeklyXpGoal,
    encouragement: accuracy > 70 
      ? "You're doing great! This plan will help you reach expert level."
      : "Consistent practice is the key to ECG mastery. You've got this!"
  };
}

export default router;
