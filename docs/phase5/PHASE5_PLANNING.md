# 🚀 **Phase 5 Planning: Global AI Mentor Network**

> **Version:** 5.0.0-alpha  
> **Base:** v4.0.0 (Analytics & Optimization)  
> **Target Release:** Q1 2026  
> **Status:** Initialization  
> **Branch:** feature/phase5-global-mentor  

---

## 📋 **Executive Summary**

**Phase 5 Goal:** Transform MedPlat into a **global, interactive medical learning ecosystem** that combines:

- **Duolingo-style gamification** (streaks, XP, badges, leaderboards, daily challenges)
- **UpToDate-level medical reasoning** (evidence-based, guideline-aligned, cross-specialty)
- **Adaptive AI mentoring** (personalized tutoring, weak-area targeting, certification prep)
- **External Development Panel governance** (multidisciplinary review, consensus-driven quality)

**Core Innovation:** An AI mentor network that adapts to user skill level, learning style, and geographic context while maintaining world-class clinical accuracy through systematic expert review.

---

## 🎯 **Strategic Objectives**

### **1. User Engagement & Retention**
- **Target:** 30% increase in DAU (Daily Active Users)
- **Mechanism:** Daily challenges, streak mechanics, personalized push notifications
- **Metric:** 7-day retention ≥ 70% (up from current 60%)

### **2. Learning Effectiveness**
- **Target:** 25% improvement in quiz scores over 30-day period
- **Mechanism:** Adaptive difficulty (60/40 weak/new), spaced repetition, personalized feedback
- **Metric:** Average quiz score ≥ 85% (up from current 78%)

### **3. Global Reach**
- **Target:** Support 30+ languages with culturally adapted content
- **Mechanism:** Multi-language guideline cascade, resource-aware recommendations
- **Metric:** Active users in ≥ 50 countries

### **4. Clinical Quality**
- **Target:** ≥ 95% guideline alignment across all cases
- **Mechanism:** External Development Panel quarterly reviews, automated quality checks
- **Metric:** Clinical accuracy rating ≥ 9.0/10 from panel reviews

### **5. Certification Readiness**
- **Target:** 10,000 users earn "Exam Ready" certificates
- **Mechanism:** Comprehensive curriculum paths, progress tracking, skill assessments
- **Metric:** Certificate completion rate ≥ 40% of enrolled users

---

## 🏗️ **System Architecture**

### **High-Level Data Flow**

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERACTIONS                        │
├─────────────────────────────────────────────────────────────────┤
│  GlobalMentorHub  │  CaseView  │  MentorTab  │  CurriculumTab   │
└────────┬──────────┴──────┬─────┴──────┬──────┴──────┬───────────┘
         │                 │             │             │
         ▼                 ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND APIs                              │
├─────────────────────────────────────────────────────────────────┤
│  /api/mentor_network  │  /api/panel  │  /api/analytics  │ ...   │
└────────┬──────────────┴──────┬───────┴──────┬─────────┴────────┘
         │                     │               │
         ▼                     ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CORE SERVICES                                 │
├─────────────────────────────────────────────────────────────────┤
│  OpenAI GPT-4o-mini  │  Firestore  │  Telemetry  │  Engagement  │
└────────┬─────────────┴─────┬───────┴──────┬──────┴──────────────┘
         │                   │               │
         ▼                   ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   DATA PERSISTENCE                               │
├─────────────────────────────────────────────────────────────────┤
│  users/  │  mentor_sessions/  │  panel_feedback/  │  telemetry/ │
└─────────┴────────────────────┴───────────────────┴──────────────┘
```

### **Key Components**

#### **1. Global Mentor Hub (Frontend)**
**File:** `frontend/src/components/GlobalMentorHub.jsx`

**Features:**
- **Dashboard View:**
  - Current streak (days), total XP, current level
  - Daily challenge progress bar
  - Leaderboard position (global, regional, friends)
  - Recent badges earned
  - Certification progress tracker

- **Mentor Chat Interface:**
  - Real-time AI mentor conversation
  - Typing indicators, message threading
  - "Explain Why" button for reasoning chains
  - Session history viewer

- **Gamification Elements:**
  - Badge showcase (clinical skills, specialty mastery, streaks)
  - XP breakdown (quizzes, mentor sessions, curriculum completion)
  - Achievement notifications (popups, confetti animations)

- **Progress Analytics:**
  - Skill radar chart (cardiology, pulmonology, etc.)
  - Learning velocity graph (cases/week)
  - Weak area identification with improvement recommendations

**Tech Stack:**
- React with hooks (useState, useEffect, useContext)
- Recharts for visualizations
- Framer Motion for animations
- Firebase SDK for real-time data

#### **2. Mentor Network API (Backend)**
**File:** `backend/routes/mentor_network_api.mjs`

**Endpoints:**

```javascript
// Health check
GET /api/mentor_network/health
Response: { ok: true, service: "mentor_network", status: "operational" }

// Start personalized mentor session
POST /api/mentor_network/session
Body: {
  uid: "user123",
  topic: "Acute Coronary Syndrome",
  difficulty: "intermediate",
  persona: "usmle_prep"
}
Response: {
  session_id: "session_abc123",
  mentor_intro: "Hi! Let's work on ACS. I see you've been struggling with ECG interpretation...",
  suggested_focus: ["ECG_patterns", "STEMI_criteria", "troponin_timing"],
  initial_question: "A 55yo male with crushing chest pain..."
}

// Continue mentor conversation
POST /api/mentor_network/chat
Body: {
  session_id: "session_abc123",
  user_message: "I think it's STEMI because ST elevation in V2-V4",
  context: { previous_answers: [...] }
}
Response: {
  mentor_response: "Excellent! You correctly identified anterior STEMI. Now, what's the immediate management?",
  reasoning_chain: ["Identified ST elevation", "Localized to anterior leads", "Urgent PCI indicated"],
  xp_earned: 15,
  next_question: { ... }
}

// Get session history
GET /api/mentor_network/history?uid=user123&limit=10
Response: {
  sessions: [
    {
      session_id: "session_abc123",
      topic: "Acute Coronary Syndrome",
      started_at: "2025-11-13T20:00:00Z",
      duration_minutes: 25,
      messages_count: 12,
      xp_earned: 180,
      skills_improved: ["ECG_interpretation", "acute_care_management"]
    }
  ]
}

// Request "Explain Why" reasoning
GET /api/mentor_network/explain?session_id=session_abc123&message_id=msg_42
Response: {
  reasoning_chain: [
    "Patient presentation matches STEMI criteria (chest pain + ST elevation)",
    "Anterior wall involvement (V2-V4 leads) suggests LAD occlusion",
    "Time-sensitive: Door-to-balloon should be <90 minutes",
    "Dual antiplatelet + anticoagulation + urgent cath lab activation"
  ],
  evidence: [
    { guideline: "AHA/ACC 2023 STEMI", class: "I", level: "A", text: "..." },
    { guideline: "ESC 2023 ACS", class: "I", level: "A", text: "..." }
  ]
}

// Daily challenge generation
GET /api/mentor_network/daily_challenge?uid=user123
Response: {
  challenge_id: "daily_2025_11_13",
  title: "Rapid Fire: Cardiology Essentials",
  description: "Complete 5 cardiology cases in 15 minutes",
  cases: [...],
  rewards: {
    xp: 200,
    badge: "speed_demon" // if completed < 15 min
  },
  expires_at: "2025-11-14T00:00:00Z"
}
```

**Core Logic:**

```javascript
// Adaptive tutoring algorithm
async function generateMentorResponse(sessionId, userMessage, context) {
  const session = await getSessionData(sessionId);
  const userProfile = await getUserProfile(session.uid);
  
  // Analyze user's current understanding
  const understandingLevel = assessUnderstanding(userMessage, context);
  
  // Select appropriate difficulty
  let promptComplexity;
  if (understandingLevel < 0.4) {
    promptComplexity = "simplified"; // Basic concepts, visual aids
  } else if (understandingLevel < 0.7) {
    promptComplexity = "intermediate"; // Standard medical language
  } else {
    promptComplexity = "advanced"; // Deep reasoning, edge cases
  }
  
  // Build context-aware prompt
  const systemPrompt = buildMentorPrompt({
    topic: session.topic,
    persona: userProfile.persona,
    weakAreas: userProfile.weak_areas,
    complexity: promptComplexity,
    previousMessages: context.previous_answers
  });
  
  // Call OpenAI with structured output
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "mentor_response",
        schema: {
          type: "object",
          properties: {
            response: { type: "string" },
            reasoning_chain: { type: "array", items: { type: "string" } },
            next_question: { type: "string" },
            xp_earned: { type: "integer" },
            skills_improved: { type: "array", items: { type: "string" } }
          },
          required: ["response", "reasoning_chain", "xp_earned"]
        }
      }
    }
  });
  
  const result = JSON.parse(completion.choices[0].message.content);
  
  // Update user progress
  await updateUserProgress(session.uid, {
    xp: result.xp_earned,
    skills: result.skills_improved,
    session_id: sessionId
  });
  
  // Log telemetry
  await logEngagementEvent({
    uid: session.uid,
    event_type: 'mentor_interaction',
    endpoint: 'mentor_network.chat',
    metadata: {
      session_id: sessionId,
      topic: session.topic,
      understanding_level: understandingLevel,
      xp_earned: result.xp_earned
    }
  });
  
  return result;
}

// Streak tracking with comeback bonuses
async function updateStreak(uid) {
  const userRef = db.collection('users').doc(uid);
  const userData = (await userRef.get()).data();
  
  const now = new Date();
  const lastActive = userData.last_active_date?.toDate();
  
  if (!lastActive) {
    // First activity
    await userRef.update({
      streak_days: 1,
      last_active_date: now,
      longest_streak: 1
    });
    return { streak: 1, bonus: 0 };
  }
  
  const daysSinceActive = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));
  
  if (daysSinceActive === 0) {
    // Same day, no change
    return { streak: userData.streak_days || 1, bonus: 0 };
  } else if (daysSinceActive === 1) {
    // Consecutive day: increment streak
    const newStreak = (userData.streak_days || 0) + 1;
    await userRef.update({
      streak_days: newStreak,
      last_active_date: now,
      longest_streak: Math.max(newStreak, userData.longest_streak || 0)
    });
    return { streak: newStreak, bonus: 0 };
  } else if (daysSinceActive <= 3) {
    // Comeback bonus (within 3 days)
    const comebackBonus = 50; // XP bonus for returning
    await userRef.update({
      streak_days: 1,
      last_active_date: now,
      total_xp: (userData.total_xp || 0) + comebackBonus
    });
    return { streak: 1, bonus: comebackBonus };
  } else {
    // Streak broken
    await userRef.update({
      streak_days: 1,
      last_active_date: now
    });
    return { streak: 1, bonus: 0 };
  }
}
```

#### **3. Panel API (Backend)**
**File:** `backend/routes/panel_api.mjs`

**Endpoints:**

```javascript
// Health check
GET /api/panel/health
Response: { ok: true, service: "panel", status: "operational" }

// Submit panel feedback (panel members only)
POST /api/panel/submit
Authorization: Bearer <panel_member_jwt>
Body: {
  review_cycle: "Q4_2025",
  feedback_category: "clinical_accuracy",
  case_id: "case_af_denmark_001",
  ratings: { clinical: 8, educational: 9, ux: 7 },
  priority: "high",
  comments: "Missing CHA₂DS₂-VASc score in initial assessment.",
  suggested_action: "Update case generation prompt with scoring template"
}
Response: {
  ok: true,
  feedback_id: "fb_q4_2025_0042",
  message: "Feedback submitted. Thank you!"
}

// Get all feedback for a review cycle (admin only)
GET /api/panel/feedback?cycle=Q4_2025
Authorization: Admin
Response: {
  ok: true,
  review_cycle: "Q4_2025",
  total_feedback: 156,
  feedback: [ ... ]
}

// Generate consensus report (admin only)
POST /api/panel/consensus
Authorization: Admin
Body: { review_cycle: "Q4_2025" }
Response: {
  ok: true,
  consensus_id: "consensus_q4_2025",
  report_url: "https://firebasestorage/.../Q4_2025_Consensus.pdf",
  themes: [ ... ],
  action_items: [ ... ]
}

// Get consensus report
GET /api/panel/consensus/:cycle
Response: {
  ok: true,
  review_cycle: "Q4_2025",
  generated_at: "2025-11-30T12:00:00Z",
  themes: [
    {
      category: "clinical_accuracy",
      count: 42,
      avg_priority: "high",
      top_issues: ["Missing risk scores (32)", "Incomplete differentials (10)"]
    }
  ],
  action_items: [ ... ],
  report_url: "..."
}
```

**Automated Consensus Generation:**

```javascript
// Cron job (runs every 2 weeks or on-demand)
async function generateConsensusSummary(reviewCycle) {
  const feedbackSnap = await db.collection('panel_feedback')
    .where('review_cycle', '==', reviewCycle)
    .where('status', '!=', 'archived')
    .get();
  
  // Aggregate by category
  const themes = {};
  const actionItems = [];
  
  feedbackSnap.forEach(doc => {
    const data = doc.data();
    const cat = data.feedback_category;
    
    if (!themes[cat]) {
      themes[cat] = { count: 0, priorities: [], issues: [], avg_clinical: 0 };
    }
    
    themes[cat].count++;
    themes[cat].priorities.push(data.priority);
    themes[cat].issues.push(data.comments);
    themes[cat].avg_clinical += data.ratings.clinical;
    
    if (data.priority === 'high') {
      actionItems.push({
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        priority: 'high',
        description: data.suggested_action,
        case_id: data.case_id,
        reviewer_role: data.reviewer_role,
        status: 'open',
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  });
  
  // Calculate averages
  Object.keys(themes).forEach(cat => {
    themes[cat].avg_clinical /= themes[cat].count;
    themes[cat].avg_priority = calculatePriorityScore(themes[cat].priorities);
  });
  
  // Build markdown report
  const markdownReport = buildConsensusMarkdown({
    review_cycle: reviewCycle,
    total_feedback: feedbackSnap.size,
    themes,
    action_items
  });
  
  // Upload to Firebase Storage
  const bucket = admin.storage().bucket();
  const fileName = `panel_consensus/${reviewCycle}_Consensus.md`;
  const file = bucket.file(fileName);
  
  await file.save(markdownReport, {
    contentType: 'text/markdown',
    metadata: {
      review_cycle: reviewCycle,
      generated_at: new Date().toISOString()
    }
  });
  
  const [reportUrl] = await file.getSignedUrl({
    action: 'read',
    expires: '03-01-2030' // Long-lived URL
  });
  
  // Store consensus metadata
  await db.collection('panel_consensus').doc(reviewCycle).set({
    review_cycle: reviewCycle,
    generated_at: admin.firestore.FieldValue.serverTimestamp(),
    total_feedback: feedbackSnap.size,
    themes,
    action_items,
    report_url: reportUrl,
    status: 'published'
  });
  
  console.log(`✅ Consensus report generated: ${reportUrl}`);
  return { reportUrl, themes, actionItems };
}
```

---

## 🎮 **Gamification Framework: Duolingo × UpToDate**

### **Core Mechanics**

#### **1. XP (Experience Points) System**
```javascript
// XP sources and values
const XP_VALUES = {
  quiz_completion: 50,
  quiz_perfect_score: 100, // All questions correct
  mentor_session: 20, // Per meaningful interaction
  curriculum_module: 150,
  daily_challenge: 200,
  first_daily_login: 10,
  streak_milestone_7: 500,
  streak_milestone_30: 2000,
  badge_earned: 100,
  help_peer: 25, // Future: peer learning feature
  certificate_earned: 1000
};

// Level progression (Fibonacci-inspired)
const LEVEL_THRESHOLDS = [
  0,      // Level 1
  100,    // Level 2
  250,    // Level 3
  500,    // Level 4
  1000,   // Level 5
  2000,   // Level 6
  3500,   // Level 7
  5500,   // Level 8
  8500,   // Level 9
  12500,  // Level 10
  // ... up to Level 50
];

function calculateLevel(totalXP) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) {
      return {
        level: i + 1,
        current_xp: totalXP,
        xp_for_next_level: LEVEL_THRESHOLDS[i + 1] || null,
        progress_percent: calculateProgressPercent(totalXP, i)
      };
    }
  }
  return { level: 1, current_xp: totalXP, xp_for_next_level: 100, progress_percent: totalXP };
}
```

#### **2. Streak System**
```javascript
// Streak rewards
const STREAK_REWARDS = {
  3: { badge: "consistent_learner", xp_bonus: 50 },
  7: { badge: "week_warrior", xp_bonus: 200 },
  14: { badge: "fortnight_champion", xp_bonus: 500 },
  30: { badge: "monthly_master", xp_bonus: 1500 },
  60: { badge: "unstoppable", xp_bonus: 3000 },
  100: { badge: "century_scholar", xp_bonus: 5000 }
};

// Push notification triggers
async function checkStreakNotifications(uid) {
  const user = await getUserProfile(uid);
  const lastActive = user.last_active_date?.toDate();
  const now = new Date();
  
  const hoursSinceActive = (now - lastActive) / (1000 * 60 * 60);
  
  // Send reminder if user hasn't been active today and it's evening
  if (hoursSinceActive > 18 && hoursSinceActive < 23) {
    await sendPushNotification(uid, {
      title: "🔥 Don't break your streak!",
      body: `You're on a ${user.streak_days}-day streak. Complete today's challenge to keep it going!`,
      action: "open_daily_challenge"
    });
  }
  
  // Streak about to break (23h since last activity)
  if (hoursSinceActive > 23 && hoursSinceActive < 24) {
    await sendPushNotification(uid, {
      title: "⚠️ Streak at risk!",
      body: "Only 1 hour left to save your streak. Quick quiz?",
      action: "open_quick_quiz",
      urgency: "high"
    });
  }
}
```

#### **3. Badge System**
```javascript
// Badge categories and requirements
const BADGES = {
  // Skill-based badges
  cardiology_novice: {
    category: "skill",
    specialty: "cardiology",
    requirement: "Complete 10 cardiology cases with ≥70% accuracy",
    icon: "🫀",
    rarity: "common"
  },
  cardiology_expert: {
    category: "skill",
    specialty: "cardiology",
    requirement: "Complete 100 cardiology cases with ≥90% accuracy",
    icon: "❤️‍🔥",
    rarity: "epic"
  },
  
  // Streak badges
  week_warrior: {
    category: "streak",
    requirement: "7-day login streak",
    icon: "⚡",
    rarity: "uncommon"
  },
  
  // Achievement badges
  perfect_score: {
    category: "achievement",
    requirement: "Get 100% on any quiz",
    icon: "🌟",
    rarity: "rare"
  },
  
  speed_demon: {
    category: "achievement",
    requirement: "Complete daily challenge in <10 minutes",
    icon: "🚀",
    rarity: "rare"
  },
  
  // Certification badges
  usmle_ready: {
    category: "certification",
    requirement: "Complete USMLE Step 1 curriculum with ≥85% average",
    icon: "🎓",
    rarity: "legendary"
  }
};

// Auto-award badges based on activity
async function checkBadgeEligibility(uid) {
  const userProfile = await getUserProfile(uid);
  const earnedBadges = userProfile.badges || [];
  const newBadges = [];
  
  // Check each badge
  for (const [badgeId, badgeData] of Object.entries(BADGES)) {
    if (earnedBadges.includes(badgeId)) continue; // Already earned
    
    const eligible = await evaluateBadgeRequirement(uid, badgeData);
    if (eligible) {
      newBadges.push(badgeId);
      await awardBadge(uid, badgeId, badgeData);
    }
  }
  
  return newBadges;
}
```

#### **4. Leaderboard System**
```javascript
// Leaderboard types
const LEADERBOARD_TYPES = {
  global: { scope: "all", timeframe: "all_time" },
  regional: { scope: "country", timeframe: "all_time" },
  friends: { scope: "friends", timeframe: "all_time" },
  weekly: { scope: "all", timeframe: "7_days" },
  specialty: { scope: "specialty", timeframe: "30_days" }
};

// Calculate leaderboard position
async function getLeaderboardPosition(uid, type = 'global') {
  const config = LEADERBOARD_TYPES[type];
  
  let query = db.collection('users')
    .orderBy('total_xp', 'desc');
  
  if (config.scope === 'country') {
    const userCountry = (await getUserProfile(uid)).country;
    query = query.where('country', '==', userCountry);
  } else if (config.scope === 'friends') {
    const friends = (await getUserProfile(uid)).friends || [];
    query = query.where(admin.firestore.FieldPath.documentId(), 'in', friends);
  }
  
  if (config.timeframe === '7_days') {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    query = query.where('last_xp_earned_at', '>=', sevenDaysAgo);
  }
  
  const leaderboardSnap = await query.limit(100).get();
  
  let position = 0;
  const topUsers = [];
  
  leaderboardSnap.forEach((doc, index) => {
    const data = doc.data();
    if (doc.id === uid) {
      position = index + 1;
    }
    topUsers.push({
      uid: doc.id,
      username: data.username || 'Anonymous',
      total_xp: data.total_xp || 0,
      level: calculateLevel(data.total_xp || 0).level,
      country: data.country,
      rank: index + 1
    });
  });
  
  return {
    user_position: position,
    top_users: topUsers.slice(0, 10),
    total_users: leaderboardSnap.size
  };
}
```

#### **5. Daily Challenge System**
```javascript
// Generate personalized daily challenge
async function generateDailyChallenge(uid) {
  const userProfile = await getUserProfile(uid);
  const weakAreas = userProfile.weak_areas || [];
  
  // Select 5 cases: 3 from weak areas, 2 from new topics
  const weakCases = await selectCasesFromTopics(weakAreas.slice(0, 3), 3);
  const newCases = await selectRandomCases(2, { exclude: weakAreas });
  
  const challengeCases = [...weakCases, ...newCases];
  
  // Time limit based on user level
  const userLevel = calculateLevel(userProfile.total_xp || 0).level;
  const timeLimit = Math.max(10, 20 - userLevel); // 10-20 minutes
  
  return {
    challenge_id: `daily_${uid}_${new Date().toISOString().split('T')[0]}`,
    title: "Daily Clinical Challenge",
    description: `Complete ${challengeCases.length} cases in ${timeLimit} minutes`,
    cases: challengeCases,
    time_limit_minutes: timeLimit,
    rewards: {
      base_xp: 200,
      speed_bonus_xp: 100, // If completed in < 50% of time limit
      perfect_score_xp: 150 // If all answers correct
    },
    expires_at: getEndOfDay()
  };
}
```

---

## 📊 **Firestore Schema Extensions**

### **New Collections for Phase 5**

```javascript
// mentor_sessions collection
firestore.collection('mentor_sessions').doc(sessionId)
{
  uid: "user123",
  session_id: "session_abc123",
  topic: "Acute Coronary Syndrome",
  difficulty: "intermediate",
  persona: "usmle_prep",
  started_at: Timestamp,
  ended_at: Timestamp | null,
  messages: [
    {
      message_id: "msg_001",
      timestamp: Timestamp,
      role: "user" | "mentor",
      content: "I think it's STEMI...",
      reasoning_chain: [...], // For mentor messages
      xp_earned: 15
    }
  ],
  total_xp_earned: 180,
  skills_improved: ["ECG_interpretation", "acute_care_management"],
  session_rating: 5, // User rates session 1-5
  status: "active" | "completed" | "abandoned"
}

// panel_feedback collection
firestore.collection('panel_feedback').doc(feedbackId)
{
  reviewer_id: "prof_cardiology_1",
  reviewer_role: "Specialist - Cardiology",
  timestamp: Timestamp,
  review_cycle: "Q4_2025",
  feedback_category: "clinical_accuracy" | "educational_design" | "ai_logic" | "global_adaptation" | "ux" | "business",
  case_id: "case_af_denmark_001",
  ratings: {
    clinical: 8,
    educational: 9,
    ux: 7
  },
  priority: "high" | "medium" | "low",
  comments: "Missing CHA₂DS₂-VASc score...",
  suggested_action: "Update case generation prompt...",
  status: "open" | "in_progress" | "resolved" | "archived",
  assigned_to: "backend_team" | "frontend_team" | "educational_core",
  resolved_at: Timestamp | null
}

// panel_consensus collection
firestore.collection('panel_consensus').doc(reviewCycle)
{
  review_cycle: "Q4_2025",
  generated_at: Timestamp,
  total_feedback: 156,
  themes: {
    clinical_accuracy: {
      count: 42,
      avg_priority: "high",
      avg_clinical_rating: 8.2,
      top_issues: [
        { issue: "Missing risk scores", count: 32 },
        { issue: "Incomplete differentials", count: 10 }
      ]
    },
    gamification: { ... }
  },
  action_items: [
    {
      id: "action_001",
      priority: "high",
      description: "Add risk scores to 90% of cases",
      responsibility: "backend",
      deadline: "2025-12-31",
      status: "open"
    }
  ],
  report_url: "https://firebasestorage/.../Q4_2025_Consensus.md",
  status: "published" | "draft"
}

// daily_challenges collection
firestore.collection('daily_challenges').doc(`${uid}_${date}`)
{
  uid: "user123",
  date: "2025-11-13",
  challenge_id: "daily_user123_2025-11-13",
  cases: [...],
  time_limit_minutes: 15,
  started_at: Timestamp | null,
  completed_at: Timestamp | null,
  results: {
    cases_attempted: 5,
    cases_correct: 4,
    time_taken_minutes: 12,
    accuracy_percent: 80
  },
  rewards_earned: {
    base_xp: 200,
    speed_bonus: 100,
    total_xp: 300
  },
  status: "pending" | "in_progress" | "completed" | "expired"
}

// badges collection (user subcollection)
firestore.collection('users').doc(uid).collection('badges').doc(badgeId)
{
  badge_id: "cardiology_expert",
  earned_at: Timestamp,
  category: "skill",
  rarity: "epic",
  icon: "❤️‍🔥",
  metadata: {
    cases_completed: 100,
    accuracy: 92,
    specialty: "cardiology"
  }
}
```

---

## 🛣️ **Implementation Roadmap**

### **Phase 5.1: Core Infrastructure (Weeks 1-4)**

#### **Milestone 1: Mentor Network API** ✅ Target: Week 2
- [ ] Create `backend/routes/mentor_network_api.mjs`
- [ ] Implement session management (start, continue, history)
- [ ] Build adaptive tutoring algorithm (difficulty adjustment)
- [ ] Add "Explain Why" reasoning chain endpoint
- [ ] Integrate with telemetry and engagement core
- [ ] Write unit tests (Jest) for adaptive logic

#### **Milestone 2: Panel API** ✅ Target: Week 3
- [ ] Create `backend/routes/panel_api.mjs`
- [ ] Implement feedback submission endpoint (POST /submit)
- [ ] Build consensus generation algorithm (POST /consensus)
- [ ] Create automated report generation (cron job)
- [ ] Add admin dashboard for panel management
- [ ] Test with sample feedback data

#### **Milestone 3: Gamification Backend** ✅ Target: Week 4
- [ ] Update `backend/engagement/engagement_core.mjs` with:
  - XP system and level calculation
  - Streak tracking with comeback bonuses
  - Badge eligibility checking and awarding
  - Leaderboard calculation (global, regional, friends)
  - Daily challenge generation
- [ ] Create Firestore schema migrations
- [ ] Add push notification triggers (Firebase Cloud Messaging)

### **Phase 5.2: Frontend Development (Weeks 5-8)**

#### **Milestone 4: Global Mentor Hub UI** ✅ Target: Week 6
- [ ] Create `frontend/src/components/GlobalMentorHub.jsx`
- [ ] Build dashboard view (streak, XP, level, leaderboard)
- [ ] Implement mentor chat interface (real-time, typing indicators)
- [ ] Add badge showcase with animations (Framer Motion)
- [ ] Create progress analytics (Recharts radar/line charts)
- [ ] Mobile-responsive design (Tailwind CSS)

#### **Milestone 5: Gamification UI** ✅ Target: Week 7
- [ ] Daily challenge interface with timer
- [ ] XP gain animations (confetti, progress bars)
- [ ] Badge unlock notifications (popups)
- [ ] Leaderboard tabs (global, regional, weekly, friends)
- [ ] Streak calendar visualization
- [ ] Achievement tracker

#### **Milestone 6: Panel Member Dashboard** ✅ Target: Week 8
- [ ] Panel member login and authentication
- [ ] Case review interface (assign, rate, comment)
- [ ] Feedback submission form
- [ ] Progress tracker (cases reviewed, consensus participation)
- [ ] Consensus report viewer

### **Phase 5.3: Testing & Optimization (Weeks 9-10)**

#### **Milestone 7: Integration Testing** ✅ Target: Week 9
- [ ] End-to-end tests (Cypress) for mentor sessions
- [ ] Load testing for daily challenge (1000 concurrent users)
- [ ] Panel feedback workflow (submit → consensus → action)
- [ ] Gamification logic (XP, streaks, badges)
- [ ] Multi-language support testing

#### **Milestone 8: Performance Optimization** ✅ Target: Week 10
- [ ] Optimize Firestore queries (composite indexes)
- [ ] Implement caching for leaderboard (Redis)
- [ ] Reduce OpenAI token usage (prompt optimization)
- [ ] Frontend bundle size reduction (code splitting)
- [ ] CDN setup for static assets

### **Phase 5.4: Launch Preparation (Weeks 11-12)**

#### **Milestone 9: Documentation** ✅ Target: Week 11
- [ ] User guide for Global Mentor Hub
- [ ] Panel member onboarding guide
- [ ] Admin documentation (consensus reports, analytics)
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Update README with Phase 5 features

#### **Milestone 10: Beta Launch** ✅ Target: Week 12
- [ ] Deploy to staging environment
- [ ] Invite 100 beta users (students, doctors, panel members)
- [ ] Monitor analytics (DAU, retention, session duration)
- [ ] Collect user feedback (surveys, interviews)
- [ ] Fix critical bugs and UX issues

### **Phase 5.5: Production Rollout (Week 13)**

#### **Milestone 11: Full Launch** ✅ Target: Week 13
- [ ] Deploy to production (Cloud Run)
- [ ] Route 100% traffic to v5.0.0
- [ ] Launch marketing campaign (social media, email)
- [ ] Monitor performance (latency, errors, costs)
- [ ] Activate push notifications for all users
- [ ] Publish launch blog post and changelog

---

## 📈 **Success Metrics**

### **Engagement Metrics**
| Metric                  | Baseline (v4.0.0) | Target (v5.0.0) | Measurement                           |
| ----------------------- | ----------------- | --------------- | ------------------------------------- |
| Daily Active Users      | 5,000             | 6,500 (+30%)    | Firebase Analytics                    |
| 7-Day Retention         | 60%               | 70%             | Cohort analysis                       |
| Avg Session Duration    | 12 min            | 18 min          | Telemetry logs                        |
| Daily Challenge Compl.  | N/A               | 40%             | Firestore daily_challenges collection |
| Mentor Session Starts   | N/A               | 1,000/day       | Firestore mentor_sessions collection  |
| Badge Unlock Rate       | N/A               | 2.5/user/week   | User badges subcollection             |

### **Learning Effectiveness**
| Metric                      | Baseline | Target      | Measurement                     |
| --------------------------- | -------- | ----------- | ------------------------------- |
| Avg Quiz Score              | 78%      | 85%         | Quiz results aggregation        |
| 30-Day Score Improvement    | +8%      | +25%        | User progress tracking          |
| Weak Area Mastery (≥85%)    | 35%      | 60%         | Adaptive feedback API           |
| Certification Completion    | N/A      | 40%         | Curriculum completion rate      |
| Mentor Session Rating       | N/A      | ≥4.5/5      | Post-session user rating        |

### **Quality Metrics (Panel-Driven)**
| Metric                   | Target  | Measurement                    |
| ------------------------ | ------- | ------------------------------ |
| Panel Participation Rate | ≥90%    | Feedback submissions / Members |
| Clinical Accuracy Rating | ≥9.0/10 | Panel review average           |
| Guideline Alignment      | ≥95%    | Automated validation checks    |
| High-Priority Issue Res. | ≥80%    | Resolved actions / Total       |
| User Satisfaction        | ≥4.5/5  | App store ratings              |

### **Business Metrics**
| Metric                     | Baseline | Target       | Measurement              |
| -------------------------- | -------- | ------------ | ------------------------ |
| Monthly Revenue (Premium)  | $10K     | $25K (+150%) | Subscription conversions |
| User Acquisition Cost      | $15      | $12          | Marketing spend / New    |
| Lifetime Value             | $120     | $200         | Avg revenue per user     |
| Churn Rate                 | 12%      | 8%           | Monthly cancellations    |
| Net Promoter Score (NPS)   | +35      | +50          | User surveys             |

---

## 🔧 **Technical Stack**

### **Backend**
- **Runtime:** Node.js 22.x
- **Framework:** Express.js
- **Database:** Firestore (NoSQL)
- **AI:** OpenAI GPT-4o-mini, GPT-4o
- **Storage:** Firebase Storage
- **Auth:** Firebase Auth (JWT)
- **Deployment:** Google Cloud Run
- **Monitoring:** Cloud Logging, Telemetry API
- **Cron Jobs:** Cloud Scheduler

### **Frontend**
- **Framework:** React 18.x
- **State Management:** React Hooks, Context API
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Animations:** Framer Motion
- **Build:** Vite
- **Deployment:** Firebase Hosting
- **Push Notifications:** Firebase Cloud Messaging

### **DevOps**
- **CI/CD:** GitHub Actions
- **Testing:** Jest (backend), Cypress (E2E)
- **Code Quality:** ESLint, Prettier
- **Monitoring:** Google Cloud Monitoring
- **Alerting:** Cloud Logging Alerts

---

## 🚀 **Next Steps**

### **Immediate Actions (This Week)**
1. ✅ Create Phase 5 branch: `feature/phase5-global-mentor`
2. ✅ Document External Development Panel guide
3. ✅ Create PHASE5_PLANNING.md (this document)
4. 🔄 Implement Mentor Network API (`mentor_network_api.mjs`)
5. 🔄 Implement Panel API (`panel_api.mjs`)
6. 🔄 Build Global Mentor Hub UI (`GlobalMentorHub.jsx`)
7. 🔄 Register routes in `backend/index.js`
8. 🔄 Run validation tests and commit

### **Week 2 Goals**
- Complete Mentor Network API with adaptive tutoring
- Implement session management and "Explain Why" logic
- Build daily challenge generation algorithm
- Write unit tests for core functions

### **Month 1 Goals**
- Complete all backend APIs (mentor, panel, gamification)
- Build frontend UI for Global Mentor Hub
- Implement Firestore schema migrations
- Launch internal beta with panel members

### **Q1 2026 Goals**
- Full production rollout (v5.0.0)
- Achieve 30% increase in DAU
- Onboard 100+ panel members
- Generate first quarterly consensus report
- Expand to 30+ languages

---

## 📚 **Reference Documents**

**Phase 5 Documentation:**
- `docs/panels/EXTERNAL_DEVELOPMENT_PANEL_GUIDE.md` – Panel governance
- `docs/phase5/PHASE5_PLANNING.md` – This document
- `.github/copilot-instructions.md` – Autonomous agent rules

**Previous Phases:**
- `PHASE4_PLAN.md` – Analytics & Optimization (v4.0.0)
- `PHASE3_OPERATIONS_GUIDE.md` – Dynamic-only data (v3.0.0)
- `docs/releases/PHASE4_v4.0.0.md` – Phase 4 completion report

**Technical Guides:**
- `backend/routes/mentor_api.mjs` – Current mentor implementation (Phase 4)
- `backend/engagement/engagement_core.mjs` – Engagement hub
- `frontend/src/components/CaseView.jsx` – Main UI structure

---

## ✅ **Conclusion**

Phase 5 transforms MedPlat into a **global, gamified, AI-powered medical learning ecosystem** that:

- ✅ **Engages** users like Duolingo (streaks, badges, daily challenges)
- ✅ **Educates** with UpToDate-level rigor (evidence-based, guideline-aligned)
- ✅ **Adapts** to individual learning needs (personalized AI mentoring)
- ✅ **Scales** globally (30+ languages, cultural sensitivity)
- ✅ **Maintains quality** through expert panel governance

**Mission:** Make medical education accessible, engaging, and world-class for students, doctors, and exam candidates worldwide.

**Status:** Ready for implementation. Let's build Phase 5! 🚀

---

**Document Prepared By:** GitHub Copilot (Autonomous Agent)  
**Branch:** feature/phase5-global-mentor  
**Version:** 5.0.0-alpha  
**Date:** 2025-11-13  

