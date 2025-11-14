# 🤖 MedPlat Phase 7 – Copilot Implementation Guide

> **File:** `docs/COPILOT_PHASE7_GUIDE.md`  
> **Last Updated:** 2025-11-14  
> **Base:** v6.0.0-complete → **Target:** v7.0.0

---

## ⚙️ Phase 7 Scope

Copilot implements Phase 7 features **only** in the designated branch:

```bash
feature/phase7-ai-reasoning
```

**Reference Documentation:**
- `PHASE7_PLAN.md` - Complete Phase 7 roadmap
- `docs/COPILOT_MASTER_GUIDE.md` - Global governance
- `docs/EXTERNAL_PANEL_GUIDE_FOR_COPILOT.md` - Development philosophy (read-only)
- `validate_phase3.sh` - Regression tests (must pass 10/10)

---

## 🎯 Phase 7 Milestones

| # | Milestone | Implementation | Files | Endpoints |
|---|-----------|----------------|-------|-----------|
| **M1** | AI Reasoning Engine | Weeks 1-3 | 6 backend + 5 frontend | 12 new |
| **M2** | Multi-Language | Weeks 3-5 | 5 backend + 4 frontend | 8 new |
| **M3** | Offline Architecture | Weeks 5-7 | 3 backend + 5 frontend | 4 new |
| **M4** | Voice Interaction | Weeks 7-8 | 3 backend + 3 frontend | 6 new |
| **M5** | Mobile App | Weeks 8-10 | React Native app | N/A |

---

## 🧠 Milestone 1: AI Reasoning Engine (CRITICAL)

### Backend Implementation

#### File 1: `backend/ai/reasoning_engine.mjs`

```javascript
/**
 * Phase 7 M1: Advanced Clinical Reasoning Engine
 * Generates expert differential diagnoses with probability scores
 */

import { openai } from '../openaiClient.js';

/**
 * Generate expert differential diagnosis with probability scores
 * @param {Object} caseData - Patient presentation data
 * @param {Array} studentDifferentials - Student's proposed differentials
 * @returns {Object} Expert differentials with feedback
 */
export async function generateExpertDifferentials(caseData, studentDifferentials = []) {
  const systemPrompt = `You are an expert clinical diagnostician. Analyze the patient presentation and generate a ranked differential diagnosis with probability scores.

For each differential:
1. Assign probability (0-1, sum to ~1.0)
2. Provide brief clinical reasoning
3. Note key supporting/refuting features

Format as JSON:
{
  "differentials": [
    {
      "condition": "Diagnosis name",
      "probability": 0.75,
      "reasoning": "Key features supporting this diagnosis",
      "supporting_features": ["feature1", "feature2"],
      "refuting_features": ["feature1"]
    }
  ],
  "must_not_miss": ["Critical diagnosis 1", "Critical diagnosis 2"]
}`;

  const userPrompt = `Patient Presentation:
Chief Complaint: ${caseData.chief_complaint}
History: ${caseData.history}
Vitals: ${JSON.stringify(caseData.vitals)}
Physical Exam: ${caseData.physical_exam}

${studentDifferentials.length > 0 ? `Student proposed: ${studentDifferentials.join(', ')}` : ''}

Generate expert differential diagnosis.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content);

    // Score student performance if they provided differentials
    let studentScore = null;
    let feedback = null;

    if (studentDifferentials.length > 0) {
      studentScore = scoreStudentDifferentials(
        studentDifferentials,
        result.differentials,
        result.must_not_miss
      );

      feedback = generateFeedback(studentDifferentials, result, studentScore);
    }

    return {
      expert_differentials: result.differentials,
      must_not_miss: result.must_not_miss,
      student_score: studentScore,
      feedback
    };
  } catch (err) {
    console.error('Error generating differentials:', err);
    throw new Error('Failed to generate expert differentials');
  }
}

/**
 * Score student's differential list against expert
 */
function scoreStudentDifferentials(studentDx, expertDx, mustNotMiss) {
  let score = 0;
  const maxScore = 100;

  // Check if critical diagnoses were included (50 points)
  const criticalIncluded = mustNotMiss.filter(dx =>
    studentDx.some(sdx => sdx.toLowerCase().includes(dx.toLowerCase()))
  );
  score += (criticalIncluded.length / mustNotMiss.length) * 50;

  // Check overlap with expert top 5 (30 points)
  const topExpert = expertDx.slice(0, 5).map(d => d.condition.toLowerCase());
  const studentMatches = studentDx.filter(sdx =>
    topExpert.some(edx => edx.includes(sdx.toLowerCase()) || sdx.toLowerCase().includes(edx))
  );
  score += (studentMatches.length / Math.min(5, studentDx.length)) * 30;

  // Bonus for appropriate breadth (20 points)
  if (studentDx.length >= 3 && studentDx.length <= 7) {
    score += 20;
  } else if (studentDx.length >= 2 && studentDx.length <= 9) {
    score += 10;
  }

  return Math.round(Math.min(score, maxScore));
}

/**
 * Generate personalized feedback
 */
function generateFeedback(studentDx, expertResult, score) {
  const missed = expertResult.must_not_miss.filter(dx =>
    !studentDx.some(sdx => sdx.toLowerCase().includes(dx.toLowerCase()))
  );

  const topExpert = expertResult.differentials.slice(0, 3).map(d => d.condition);

  let feedback = '';

  if (score >= 80) {
    feedback = 'Excellent differential diagnosis! ';
  } else if (score >= 60) {
    feedback = 'Good differential, but consider: ';
  } else {
    feedback = 'Review your approach. ';
  }

  if (missed.length > 0) {
    feedback += `⚠️ Critical diagnoses to consider: ${missed.join(', ')}. `;
  }

  if (score < 60) {
    feedback += `Expert top differentials: ${topExpert.join(', ')}.`;
  }

  return feedback;
}

/**
 * Analyze Bayesian probability updates
 */
export async function analyzeBayesianUpdate(priors, newInfo, updatedProbs) {
  const systemPrompt = `You are an expert in clinical Bayesian reasoning. Evaluate if the student correctly updated their prior probabilities given new clinical information.

Provide:
1. Expert probability updates
2. Accuracy score (0-100)
3. Brief feedback

Format as JSON:
{
  "expert_updates": {"Diagnosis1": 0.XX, "Diagnosis2": 0.XX},
  "accuracy_score": 85,
  "feedback": "Brief feedback on reasoning quality"
}`;

  const userPrompt = `Prior probabilities: ${JSON.stringify(priors)}
New information: ${newInfo}
Student updated probabilities: ${JSON.stringify(updatedProbs)}

Evaluate the Bayesian update.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (err) {
    console.error('Error analyzing Bayesian update:', err);
    throw new Error('Failed to analyze Bayesian reasoning');
  }
}
```

#### File 2: `backend/routes/reasoning_api.mjs`

```javascript
/**
 * Phase 7 M1: Clinical Reasoning API
 */

import express from 'express';
import { generateExpertDifferentials, analyzeBayesianUpdate } from '../ai/reasoning_engine.mjs';
import { db } from '../firebaseClient.js';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'operational', service: 'reasoning_api' });
});

/**
 * POST /api/reasoning/differential
 * Generate expert differential diagnosis
 */
router.post('/differential', async (req, res) => {
  try {
    const { case_id, patient_data, student_differentials } = req.body;

    if (!patient_data) {
      return res.status(400).json({ error: 'patient_data required' });
    }

    const result = await generateExpertDifferentials(patient_data, student_differentials || []);

    // Log reasoning session
    if (req.body.uid) {
      await db.collection('reasoning_sessions').add({
        uid: req.body.uid,
        case_id: case_id || null,
        timestamp: new Date(),
        student_differentials: student_differentials || [],
        expert_differentials: result.expert_differentials,
        score: result.student_score
      });
    }

    res.json(result);
  } catch (err) {
    console.error('Error in differential endpoint:', err);
    res.status(500).json({ error: 'Failed to generate differential diagnosis' });
  }
});

/**
 * POST /api/reasoning/bayesian_update
 * Analyze Bayesian probability update
 */
router.post('/bayesian_update', async (req, res) => {
  try {
    const { prior_probabilities, new_information, updated_probabilities } = req.body;

    if (!prior_probabilities || !new_information || !updated_probabilities) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await analyzeBayesianUpdate(
      prior_probabilities,
      new_information,
      updated_probabilities
    );

    res.json(result);
  } catch (err) {
    console.error('Error in Bayesian update endpoint:', err);
    res.status(500).json({ error: 'Failed to analyze Bayesian update' });
  }
});

/**
 * POST /api/reasoning/case/start
 * Start multi-step reasoning case
 */
router.post('/case/start', async (req, res) => {
  try {
    const { uid, case_id, difficulty = 'intermediate' } = req.body;

    // Create new reasoning session
    const sessionRef = await db.collection('reasoning_sessions').add({
      uid,
      case_id,
      difficulty,
      started_at: new Date(),
      current_stage: 1,
      stages_completed: [],
      status: 'active'
    });

    // Get case data (simplified - would fetch from cases collection)
    const caseData = {
      session_id: sessionRef.id,
      stage: 1,
      stage_name: 'Initial Presentation',
      patient_data: {
        chief_complaint: 'Chest pain x 2 hours',
        vitals: { hr: 95, bp: '145/90', rr: 18, temp: 37.2, spo2: 98 }
      },
      task: 'List your top 3 differential diagnoses with brief reasoning',
      time_limit_seconds: 300
    };

    res.json(caseData);
  } catch (err) {
    console.error('Error starting case:', err);
    res.status(500).json({ error: 'Failed to start case' });
  }
});

/**
 * POST /api/reasoning/case/submit_stage
 * Submit answer for current stage and advance
 */
router.post('/case/submit_stage', async (req, res) => {
  try {
    const { session_id, stage, answer } = req.body;

    // Get session
    const sessionDoc = await db.collection('reasoning_sessions').doc(session_id).get();
    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionDoc.data();

    // Score current stage (simplified)
    const stageScore = Math.round(Math.random() * 30 + 70); // Placeholder

    // Update session
    await db.collection('reasoning_sessions').doc(session_id).update({
      [`stages_completed`]: [...(session.stages_completed || []), stage],
      current_stage: stage + 1,
      [`stage_${stage}_answer`]: answer,
      [`stage_${stage}_score`]: stageScore
    });

    // Return next stage
    const nextStageData = {
      stage: stage + 1,
      stage_name: 'Diagnostic Workup',
      stage_feedback: {
        score: stageScore,
        feedback: 'Good differential diagnosis. Consider...'
      },
      new_information: {
        ecg: 'ST elevation in V2-V4',
        labs: { troponin: 'pending' }
      },
      task: 'What is your working diagnosis and immediate management?',
      time_limit_seconds: 180
    };

    res.json(nextStageData);
  } catch (err) {
    console.error('Error submitting stage:', err);
    res.status(500).json({ error: 'Failed to submit stage' });
  }
});

/**
 * GET /api/reasoning/analyze_pattern
 * Analyze student's reasoning pattern
 */
router.get('/analyze_pattern', async (req, res) => {
  try {
    const { uid } = req.query;

    if (!uid) {
      return res.status(400).json({ error: 'uid required' });
    }

    // Get user's recent reasoning sessions
    const sessionsSnapshot = await db.collection('reasoning_sessions')
      .where('uid', '==', uid)
      .orderBy('timestamp', 'desc')
      .limit(20)
      .get();

    // Simplified pattern analysis (would use ML model in production)
    const patterns = {
      pattern_recognition: 0.60,
      hypothetico_deductive: 0.30,
      bayesian: 0.10
    };

    const result = {
      primary_pattern: 'pattern_recognition',
      confidence: 0.82,
      patterns_used: patterns,
      session_count: sessionsSnapshot.size,
      recommendations: [
        'Good pattern recognition for common presentations',
        'Consider using hypothetico-deductive approach for complex cases',
        'Practice explicit Bayesian reasoning for uncertain diagnoses'
      ]
    };

    res.json(result);
  } catch (err) {
    console.error('Error analyzing pattern:', err);
    res.status(500).json({ error: 'Failed to analyze reasoning pattern' });
  }
});

export default router;
```

#### File 3: `backend/index.js` Update

```javascript
// Add to imports
import reasoningRoutes from './routes/reasoning_api.mjs';

// Add to routes (after existing Phase 6 routes)
app.use('/api/reasoning', reasoningRoutes);
```

### Frontend Implementation

#### File 1: `frontend/src/components/ReasoningTab.jsx`

```javascript
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import DifferentialBuilder from './DifferentialBuilder';
import { Brain, Target, TrendingUp, Award } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://medplat-backend-139218747785.europe-west1.run.app';

export default function ReasoningTab({ uid, currentCase }) {
  const [mode, setMode] = useState('differential'); // differential | bayesian | multi_step
  const [reasoningPattern, setReasoningPattern] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReasoningPattern();
  }, [uid]);

  const loadReasoningPattern = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/reasoning/analyze_pattern?uid=${uid}`);
      if (res.ok) {
        const data = await res.json();
        setReasoningPattern(data);
      }
    } catch (err) {
      console.error('Failed to load reasoning pattern:', err);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6" />
            <CardTitle>Clinical Reasoning Lab</CardTitle>
          </div>
          <CardDescription>
            Practice diagnostic thinking with AI-powered feedback
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Reasoning pattern insights */}
      {reasoningPattern && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Reasoning Pattern</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Pattern Recognition</span>
                  <span className="text-sm">{Math.round(reasoningPattern.patterns_used.pattern_recognition * 100)}%</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${reasoningPattern.patterns_used.pattern_recognition * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Hypothetico-Deductive</span>
                  <span className="text-sm">{Math.round(reasoningPattern.patterns_used.hypothetico_deductive * 100)}%</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${reasoningPattern.patterns_used.hypothetico_deductive * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Bayesian Reasoning</span>
                  <span className="text-sm">{Math.round(reasoningPattern.patterns_used.bayesian * 100)}%</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${reasoningPattern.patterns_used.bayesian * 100}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 space-y-1">
                {reasoningPattern.recommendations.map((rec, idx) => (
                  <p key={idx} className="text-sm text-muted-foreground">
                    • {rec}
                  </p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mode selection */}
      <div className="flex gap-2">
        <Button
          variant={mode === 'differential' ? 'default' : 'outline'}
          onClick={() => setMode('differential')}
        >
          <Target className="h-4 w-4 mr-2" />
          Differential Diagnosis
        </Button>
        <Button
          variant={mode === 'bayesian' ? 'default' : 'outline'}
          onClick={() => setMode('bayesian')}
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Bayesian Update
        </Button>
        <Button
          variant={mode === 'multi_step' ? 'default' : 'outline'}
          onClick={() => setMode('multi_step')}
        >
          <Award className="h-4 w-4 mr-2" />
          Multi-Step Case
        </Button>
      </div>

      {/* Mode content */}
      {mode === 'differential' && (
        <DifferentialBuilder uid={uid} currentCase={currentCase} />
      )}

      {mode === 'bayesian' && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Bayesian reasoning module coming soon...
            </p>
          </CardContent>
        </Card>
      )}

      {mode === 'multi_step' && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Multi-step case module coming soon...
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

## 📋 Implementation Checklist

### Milestone 1: AI Reasoning Engine

**Backend:**
- [ ] Create `backend/ai/reasoning_engine.mjs`
- [ ] Create `backend/routes/reasoning_api.mjs`
- [ ] Update `backend/index.js` to include reasoning routes
- [ ] Test `/api/reasoning/differential` endpoint
- [ ] Test `/api/reasoning/bayesian_update` endpoint
- [ ] Test `/api/reasoning/case/start` endpoint
- [ ] Test `/api/reasoning/analyze_pattern` endpoint

**Frontend:**
- [ ] Create `frontend/src/components/ReasoningTab.jsx`
- [ ] Create `frontend/src/components/DifferentialBuilder.jsx`
- [ ] Create `frontend/src/components/BayesianCalculator.jsx`
- [ ] Create `frontend/src/components/MultiStepCase.jsx`
- [ ] Integrate ReasoningTab into CaseView navigation
- [ ] Test differential diagnosis UI
- [ ] Test reasoning pattern analytics

**Validation:**
- [ ] Regression tests passing (10/10)
- [ ] Expert review of differential feedback accuracy
- [ ] Performance: <2s response time for differential generation
- [ ] Commit to `feature/phase7-ai-reasoning`

### Milestone 2-5: [To be detailed in subsequent implementations]

---

## 🔐 Quality Gates

Before each milestone merge:

1. **Regression Tests:** `./validate_phase3.sh` → 10/10 PASSING
2. **New Feature Tests:** All new endpoints return 200 OK
3. **Performance:** API latency <2s p95
4. **Code Review:** External panel consensus summary
5. **Documentation:** Update PHASE7_PLAN.md checklist

---

## 🚀 Deployment Process

```bash
# M1 Complete
cd /workspaces/medplat/backend
gcloud builds submit --tag gcr.io/medplat-458911/medplat-backend:v7-m1
gcloud run deploy medplat-backend --image gcr.io/medplat-458911/medplat-backend:v7-m1 --region europe-west1

cd /workspaces/medplat/frontend
gcloud builds submit --tag gcr.io/medplat-458911/medplat-frontend:v7-m1
gcloud run deploy medplat-frontend --image gcr.io/medplat-458911/medplat-frontend:v7-m1 --region europe-west1

# Tag
git tag v7.0.0-m1
git push origin v7.0.0-m1
```

---

**Status:** Ready for Phase 7 M1 implementation  
**Next Action:** Await user command to begin M1 development
