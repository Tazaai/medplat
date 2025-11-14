/**
 * mentor_network_api.mjs
 * 
 * Phase 5: Global AI Mentor Network - Adaptive Tutoring & Gamification
 * 
 * Central AI mentor exchange providing:
 * - Personalized adaptive tutoring sessions
 * - Reasoning feedback and "Explain Why" chains
 * - Streak tracking with comeback bonuses
 * - Daily challenge generation
 * - Badge and XP management
 * - Certification readiness tracking
 * 
 * Gamification Philosophy: Duolingo-style engagement + UpToDate-level rigor
 * - XP system with level progression
 * - Streak mechanics (7/14/30/60/100 day milestones)
 * - Badge system (skill/achievement/certification)
 * - Leaderboard (global/regional/friends/weekly)
 * - Daily challenges with time limits
 * 
 * Educational Approach:
 * - Adaptive difficulty (based on user understanding level)
 * - Persona-based language (student/USMLE/doctor)
 * - Weak area targeting (60/40 remedial/new)
 * - Spaced repetition intervals
 */

import { Router } from 'express';
import { db } from '../firebaseClient.js';
import OpenAI from 'openai';
import { logEngagementEvent, logOpenAICall } from '../telemetry/telemetry_logger.mjs';
import admin from 'firebase-admin';

const router = Router();
const FieldValue = admin.firestore.FieldValue;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ========================================
// CONFIGURATION: XP & Gamification
// ========================================
const XP_VALUES = {
  quiz_completion: 50,
  quiz_perfect_score: 100,
  mentor_interaction: 20,
  mentor_session_complete: 150,
  curriculum_module: 150,
  daily_challenge: 200,
  daily_challenge_speed_bonus: 100,
  daily_challenge_perfect: 150,
  first_daily_login: 10,
  streak_milestone_7: 500,
  streak_milestone_14: 1000,
  streak_milestone_30: 2000,
  streak_milestone_60: 3000,
  streak_milestone_100: 5000,
  badge_earned: 100,
  certificate_earned: 1000
};

const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 1000, 2000, 3500, 5500, 8500, 12500, 17500, 23500, 30500,
  38500, 47500, 57500, 68500, 80500, 93500, 107500, 122500, 138500, 155500
];

// ========================================
// ENDPOINT: Health Check
// ========================================
router.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'mentor_network',
    status: 'operational',
    model: 'gpt-4o-mini',
    timestamp: new Date().toISOString()
  });
});

// ========================================
// ENDPOINT: Start Mentor Session
// POST /api/mentor_network/session
// ========================================
router.post('/session', async (req, res) => {
  try {
    const { uid, topic, difficulty, persona } = req.body;
    
    if (!uid || !topic) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields: uid, topic'
      });
    }
    
    // Get user profile and weak areas
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    const weakAreas = userData.weak_areas || [];
    
    // Generate session ID
    const sessionId = `session_${uid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Build mentor intro message
    const hasWeakness = weakAreas.includes(topic);
    const mentorIntro = hasWeakness
      ? `Hi! I see you've been working on ${topic}. Let's strengthen your understanding with some focused practice. I'll adapt my explanations to your level.`
      : `Hello! Ready to explore ${topic}? I'll guide you through this topic step by step, with clear explanations and clinical reasoning.`;
    
    const suggestedFocus = hasWeakness
      ? [`${topic}_fundamentals`, `${topic}_clinical_application`, `${topic}_reasoning`]
      : [`${topic}_overview`, `${topic}_key_concepts`, `${topic}_practical_cases`];
    
    // Create session document
    const sessionData = {
      session_id: sessionId,
      uid,
      topic,
      difficulty: difficulty || 'intermediate',
      persona: persona || userData.persona || 'medical_student',
      started_at: FieldValue.serverTimestamp(),
      ended_at: null,
      messages: [],
      total_xp_earned: 0,
      skills_improved: [],
      session_rating: null,
      status: 'active'
    };
    
    await db.collection('mentor_sessions').doc(sessionId).set(sessionData);
    
    // Update streak
    const streakData = await updateStreak(uid);
    
    // Log telemetry
    await logEngagementEvent({
      uid,
      event_type: 'mentor_session_started',
      endpoint: 'mentor_network.session',
      metadata: { session_id: sessionId, topic, difficulty, persona }
    }).catch(err => console.warn('⚠️ Telemetry failed:', err.message));
    
    res.json({
      ok: true,
      session_id: sessionId,
      mentor_intro: mentorIntro,
      suggested_focus: suggestedFocus,
      streak: streakData,
      xp_for_session_start: 0
    });
    
  } catch (error) {
    console.error('❌ Start session error:', error);
    res.status(500).json({ ok: false, error: 'Failed to start session', details: error.message });
  }
});

// ========================================
// ENDPOINT: Mentor Chat
// POST /api/mentor_network/chat
// ========================================
router.post('/chat', async (req, res) => {
  try {
    const { session_id, user_message } = req.body;
    
    if (!session_id || !user_message) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields: session_id, user_message'
      });
    }
    
    // Get session data
    const sessionDoc = await db.collection('mentor_sessions').doc(session_id).get();
    if (!sessionDoc.exists) {
      return res.status(404).json({ ok: false, error: 'Session not found' });
    }
    
    const sessionData = sessionDoc.data();
    const previousMessages = sessionData.messages || [];
    
    // Get user profile
    const userDoc = await db.collection('users').doc(sessionData.uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    
    // Assess understanding level from user message
    const understandingLevel = assessUnderstandingLevel(user_message, previousMessages);
    
    // Build adaptive system prompt
    const systemPrompt = buildMentorPrompt({
      topic: sessionData.topic,
      persona: sessionData.persona,
      weakAreas: userData.weak_areas || [],
      understandingLevel,
      previousMessages
    });
    
    // Call OpenAI for mentor response
    const openaiMessages = [
      { role: 'system', content: systemPrompt },
      ...previousMessages.slice(-6).map(m => ({
        role: m.role,
        content: m.content
      })),
      { role: 'user', content: user_message }
    ];
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      temperature: 0.7,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'mentor_response',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              response: { type: 'string' },
              reasoning_chain: { type: 'array', items: { type: 'string' } },
              next_question: { type: 'string' },
              xp_earned: { type: 'integer' },
              skills_improved: { type: 'array', items: { type: 'string' } }
            },
            required: ['response', 'reasoning_chain', 'xp_earned'],
            additionalProperties: false
          }
        }
      }
    });
    
    // Log OpenAI call for telemetry
    await logOpenAICall({
      uid: session.uid,
      model: 'gpt-4o-mini',
      endpoint: 'chat.completions',
      prompt_tokens: completion.usage?.prompt_tokens || 0,
      completion_tokens: completion.usage?.completion_tokens || 0,
      total_tokens: completion.usage?.total_tokens || 0
    });
    
    const mentorData = JSON.parse(completion.choices[0].message.content);
    
    // Generate message IDs
    const userMsgId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const mentorMsgId = `msg_${Date.now() + 1}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Update session with new messages
    const updatedMessages = [
      ...previousMessages,
      {
        message_id: userMsgId,
        timestamp: new Date().toISOString(),
        role: 'user',
        content: user_message
      },
      {
        message_id: mentorMsgId,
        timestamp: new Date().toISOString(),
        role: 'mentor',
        content: mentorData.response,
        reasoning_chain: mentorData.reasoning_chain || [],
        xp_earned: mentorData.xp_earned || XP_VALUES.mentor_interaction
      }
    ];
    
    await db.collection('mentor_sessions').doc(session_id).update({
      messages: updatedMessages,
      total_xp_earned: FieldValue.increment(mentorData.xp_earned || XP_VALUES.mentor_interaction),
      skills_improved: FieldValue.arrayUnion(...(mentorData.skills_improved || [])),
      updated_at: FieldValue.serverTimestamp()
    });
    
    // Update user XP
    await db.collection('users').doc(sessionData.uid).update({
      total_xp: FieldValue.increment(mentorData.xp_earned || XP_VALUES.mentor_interaction),
      last_xp_earned_at: FieldValue.serverTimestamp()
    });
    
    // Log telemetry
    await logEngagementEvent({
      uid: sessionData.uid,
      event_type: 'mentor_interaction',
      endpoint: 'mentor_network.chat',
      metadata: {
        session_id,
        understanding_level: understandingLevel,
        xp_earned: mentorData.xp_earned
      }
    }).catch(err => console.warn('⚠️ Telemetry failed:', err.message));
    
    res.json({
      ok: true,
      message_id: mentorMsgId,
      mentor_response: mentorData.response,
      reasoning_chain: mentorData.reasoning_chain || [],
      next_question: mentorData.next_question || null,
      xp_earned: mentorData.xp_earned || XP_VALUES.mentor_interaction,
      skills_improved: mentorData.skills_improved || []
    });
    
  } catch (error) {
    console.error('❌ Mentor chat error:', error);
    res.status(500).json({ ok: false, error: 'Failed to process chat', details: error.message });
  }
});

// ========================================
// ENDPOINT: Get Session History
// GET /api/mentor_network/history?uid=user123&limit=10
// ========================================
router.get('/history', async (req, res) => {
  try {
    const { uid, limit } = req.query;
    
    if (!uid) {
      return res.status(400).json({ ok: false, error: 'Missing required field: uid' });
    }
    
    const sessionsSnap = await db.collection('mentor_sessions')
      .where('uid', '==', uid)
      .orderBy('started_at', 'desc')
      .limit(parseInt(limit) || 10)
      .get();
    
    const sessions = [];
    sessionsSnap.forEach(doc => {
      const data = doc.data();
      sessions.push({
        session_id: data.session_id,
        topic: data.topic,
        started_at: data.started_at,
        ended_at: data.ended_at,
        duration_minutes: data.ended_at
          ? Math.round((data.ended_at.toDate() - data.started_at.toDate()) / 60000)
          : null,
        messages_count: (data.messages || []).length,
        total_xp_earned: data.total_xp_earned || 0,
        skills_improved: data.skills_improved || [],
        session_rating: data.session_rating,
        status: data.status
      });
    });
    
    res.json({ ok: true, sessions });
    
  } catch (error) {
    console.error('❌ Get history error:', error);
    res.status(500).json({ ok: false, error: 'Failed to retrieve history', details: error.message });
  }
});

// ========================================
// ENDPOINT: Generate Daily Challenge
// GET /api/mentor_network/daily_challenge?uid=user123
// ========================================
router.get('/daily_challenge', async (req, res) => {
  try {
    const { uid } = req.query;
    
    if (!uid) {
      return res.status(400).json({ ok: false, error: 'Missing required field: uid' });
    }
    
    const today = new Date().toISOString().split('T')[0];
    const challengeId = `daily_${uid}_${today}`;
    
    // Check if challenge already exists for today
    const existingChallenge = await db.collection('daily_challenges').doc(challengeId).get();
    if (existingChallenge.exists) {
      return res.json({ ok: true, ...existingChallenge.data() });
    }
    
    // Get user profile and weak areas
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    const weakAreas = userData.weak_areas || [];
    const userLevel = calculateLevel(userData.total_xp || 0).level;
    
    // Time limit based on level (10-20 minutes)
    const timeLimit = Math.max(10, 20 - Math.floor(userLevel / 5));
    
    // Create challenge
    const challengeData = {
      challenge_id: challengeId,
      uid,
      date: today,
      title: 'Daily Clinical Challenge',
      description: `Complete 5 cases in ${timeLimit} minutes`,
      time_limit_minutes: timeLimit,
      rewards: {
        base_xp: XP_VALUES.daily_challenge,
        speed_bonus_xp: XP_VALUES.daily_challenge_speed_bonus,
        perfect_score_xp: XP_VALUES.daily_challenge_perfect
      },
      status: 'pending',
      created_at: FieldValue.serverTimestamp(),
      expires_at: new Date(`${today}T23:59:59Z`)
    };
    
    await db.collection('daily_challenges').doc(challengeId).set(challengeData);
    
    res.json({ ok: true, ...challengeData });
    
  } catch (error) {
    console.error('❌ Daily challenge error:', error);
    res.status(500).json({ ok: false, error: 'Failed to generate challenge', details: error.message });
  }
});

// ========================================
// HELPER FUNCTIONS
// ========================================

// Update user streak with comeback bonuses
async function updateStreak(uid) {
  const userRef = db.collection('users').doc(uid);
  const userDoc = await userRef.get();
  const userData = userDoc.exists ? userDoc.data() : {};
  
  const now = new Date();
  const lastActive = userData.last_active_date?.toDate();
  
  if (!lastActive) {
    await userRef.update({
      streak_days: 1,
      last_active_date: now,
      longest_streak: 1,
      total_xp: FieldValue.increment(XP_VALUES.first_daily_login)
    });
    return { streak: 1, bonus: XP_VALUES.first_daily_login, status: 'new' };
  }
  
  const daysSinceActive = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));
  
  if (daysSinceActive === 0) {
    return { streak: userData.streak_days || 1, bonus: 0, status: 'same_day' };
  } else if (daysSinceActive === 1) {
    const newStreak = (userData.streak_days || 0) + 1;
    const milestoneBonus = getMilestoneBonus(newStreak);
    
    await userRef.update({
      streak_days: newStreak,
      last_active_date: now,
      longest_streak: Math.max(newStreak, userData.longest_streak || 0),
      total_xp: FieldValue.increment(milestoneBonus)
    });
    
    return { streak: newStreak, bonus: milestoneBonus, status: 'continued', milestone: milestoneBonus > 0 };
  } else if (daysSinceActive <= 3) {
    const comebackBonus = 50;
    await userRef.update({
      streak_days: 1,
      last_active_date: now,
      total_xp: FieldValue.increment(comebackBonus)
    });
    return { streak: 1, bonus: comebackBonus, status: 'comeback' };
  } else {
    await userRef.update({
      streak_days: 1,
      last_active_date: now
    });
    return { streak: 1, bonus: 0, status: 'broken' };
  }
}

// Calculate milestone bonus for streak
function getMilestoneBonus(streak) {
  if (streak === 7) return XP_VALUES.streak_milestone_7;
  if (streak === 14) return XP_VALUES.streak_milestone_14;
  if (streak === 30) return XP_VALUES.streak_milestone_30;
  if (streak === 60) return XP_VALUES.streak_milestone_60;
  if (streak === 100) return XP_VALUES.streak_milestone_100;
  return 0;
}

// Calculate user level from total XP
function calculateLevel(totalXP) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) {
      const nextThreshold = LEVEL_THRESHOLDS[i + 1];
      return {
        level: i + 1,
        current_xp: totalXP,
        xp_for_next_level: nextThreshold || null,
        progress_percent: nextThreshold
          ? Math.round(((totalXP - LEVEL_THRESHOLDS[i]) / (nextThreshold - LEVEL_THRESHOLDS[i])) * 100)
          : 100
      };
    }
  }
  return { level: 1, current_xp: totalXP, xp_for_next_level: LEVEL_THRESHOLDS[1], progress_percent: totalXP };
}

// Assess understanding level from user message
function assessUnderstandingLevel(userMessage, previousMessages) {
  const lowerMsg = userMessage.toLowerCase();
  
  // High understanding indicators
  if (lowerMsg.includes('because') || lowerMsg.includes('reasoning') ||
      lowerMsg.includes('differential') || lowerMsg.includes('mechanism')) {
    return 0.8;
  }
  
  // Medium understanding
  if (lowerMsg.includes('think') || lowerMsg.includes('probably') ||
      lowerMsg.includes('maybe') || lowerMsg.length > 50) {
    return 0.5;
  }
  
  // Low understanding (short answers, uncertainty)
  if (lowerMsg.includes('don\'t know') || lowerMsg.includes('confused') ||
      lowerMsg.includes('help') || lowerMsg.length < 20) {
    return 0.3;
  }
  
  // Default
  return 0.5;
}

// Build adaptive mentor prompt
function buildMentorPrompt({ topic, persona, weakAreas, understandingLevel, previousMessages }) {
  let complexity = 'intermediate';
  if (understandingLevel < 0.4) complexity = 'simplified';
  if (understandingLevel > 0.7) complexity = 'advanced';
  
  let personaGuidance = '';
  if (persona === 'medical_student') {
    personaGuidance = 'Use clear, educational language. Provide step-by-step explanations with analogies.';
  } else if (persona === 'usmle_prep') {
    personaGuidance = 'Focus on high-yield facts, mnemonics, and exam-style reasoning. Include NBME-style explanations.';
  } else if (persona === 'doctor') {
    personaGuidance = 'Use professional medical terminology. Focus on clinical decision-making and evidence-based guidelines.';
  }
  
  const isWeakArea = weakAreas.includes(topic);
  const weakAreaGuidance = isWeakArea
    ? `This is a weak area for the user. Be patient, provide more detailed explanations, and encourage confidence building.`
    : `The user is exploring new territory. Balance clarity with appropriate challenge.`;
  
  return `You are an adaptive AI medical mentor. Your goal is to teach ${topic} effectively.

Persona: ${persona}
${personaGuidance}

Complexity Level: ${complexity}
- Simplified: Use basic concepts, visual descriptions, and simple language
- Intermediate: Standard medical terminology, balanced explanations
- Advanced: Deep reasoning, edge cases, research-level discussion

${weakAreaGuidance}

Your responses must:
1. Provide clear, evidence-based explanations
2. Include a reasoning chain showing your thought process
3. Suggest a next question or topic to explore
4. Award XP based on interaction quality (10-50 points)
5. Identify skills being improved (e.g., "ECG_interpretation", "acute_care_management")

Always respond in JSON format with: response, reasoning_chain, next_question, xp_earned, skills_improved.

Be encouraging, adaptive, and maintain Duolingo-style engagement while ensuring UpToDate-level medical accuracy.`;
}

export default router;
