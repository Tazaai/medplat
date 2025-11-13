# Phase 4 Development Plan — AI Mentor Mode + Curriculum Builder

**Branch:** `feature/phase4-ai-mentor`  
**Base Version:** v3.0.0  
**Started:** 2025-11-12  
**Status:** 🚧 In Development

---

## 📋 Phase 4 Objectives

Build on Phase 3's adaptive learning foundation to create:
1. **AI Mentor Mode** — Personalized tutoring and study guidance
2. **Curriculum Builder** — Custom learning paths for exam prep
3. **Enhanced Telemetry** — Usage tracking and performance analytics
4. **Infrastructure Improvements** — Firestore seeding, auto-deployment

---

## 🎯 Phase 4 Milestones

### Milestone 1: Infrastructure Enhancements
**Goal:** Prepare backend for dynamic content and automated deployments

**Tasks:**
- [ ] 1.1: Firestore Guidelines Seeding
  - Create `backend/scripts/seed_guidelines.js`
  - Migrate `GUIDELINE_REGISTRY` to Firestore `guideline_registry` collection
  - Update `guidelines_api.mjs` to read from Firestore first, static fallback
  - Test Denmark/AF, US/Pneumonia, and global topics

- [ ] 1.2: CI/CD Auto-Traffic Routing
  - Update `.github/workflows/deploy.yml`
  - Add health check step after deployment
  - Implement automatic traffic routing on success
  - Add rollback on health check failure

- [ ] 1.3: Telemetry Foundation
  - Create `backend/utils/telemetry.js`
  - Add OpenAI usage tracking (model, tokens, latency, cost)
  - Add quiz completion metrics (score, time, topic)
  - Create Firestore `analytics` collection schema

---

### Milestone 2: AI Mentor Mode (Core)
**Goal:** Personalized AI tutor that reviews performance and suggests study plans

**Tasks:**
- [ ] 2.1: Mentor Session Endpoint
  - Create `backend/routes/ai_mentor_api.mjs`
  - POST `/api/ai-mentor/session` — Generate personalized feedback
  - Analyze user's weak areas and recent performance
  - Generate study recommendations in persona-appropriate tone

- [ ] 2.2: Study Plan Generator
  - POST `/api/ai-mentor/generate-plan` — Create multi-day study schedule
  - Input: weak areas, target exam, available time
  - Output: Spaced repetition schedule with daily topics
  - Integration with adaptive-feedback weak area tracking

- [ ] 2.3: Frontend Mentor Interface
  - Create `frontend/src/components/AIMentorPanel.jsx`
  - Collapsible mentor chat interface
  - Display study plan with progress checkboxes
  - "Ask Mentor" feature for concept clarification

---

### Milestone 3: Curriculum Builder
**Goal:** Allow users to create custom learning paths for specific exams

**Tasks:**
- [ ] 3.1: Curriculum Templates
  - Create `backend/data/curriculum_templates.json`
  - Templates: USMLE Step 2 CK (8 weeks), EM Boards (12 weeks), GP Recert (4 weeks)
  - Each template: topic sequence, duration, milestones, mock exams

- [ ] 3.2: Curriculum API
  - Create `backend/routes/curriculum_api.mjs`
  - POST `/api/curriculum/create` — Custom curriculum from template
  - GET `/api/curriculum/:uid` — Fetch user's active curriculums
  - POST `/api/curriculum/progress` — Update completion status

- [ ] 3.3: Frontend Curriculum Builder
  - Create `frontend/src/components/CurriculumBuilder.jsx`
  - Drag-and-drop topic sequencing
  - Calendar view with daily study goals
  - Progress tracking with certificates on completion

---

### Milestone 4: Enhanced Analytics
**Goal:** Track usage patterns and optimize learning effectiveness

**Tasks:**
- [ ] 4.1: Analytics Dashboard (Admin)
  - Create `frontend/src/components/AnalyticsDashboard.jsx`
  - Metrics: Daily active users, quiz completion rate, OpenAI costs
  - Charts: Performance by topic, weak area frequency, engagement trends

- [ ] 4.2: User Performance Insights
  - Create `frontend/src/components/PerformanceInsights.jsx`
  - Personal analytics: Accuracy over time, streak history, tier progression
  - Comparison with peer averages (anonymized)
  - Predicted readiness for target exam

- [ ] 4.3: A/B Testing Framework
  - Create `backend/utils/ab_testing.js`
  - Test variations: Prompt styles, difficulty curves, feedback timing
  - Track conversion metrics: Engagement, retention, completion rates

---

## 🏗️ Technical Architecture

### New Backend Routes
```
backend/routes/
  ├── ai_mentor_api.mjs         (Milestone 2.1)
  ├── curriculum_api.mjs         (Milestone 3.2)
  └── analytics_api.mjs          (Milestone 4.1)
```

### New Frontend Components
```
frontend/src/components/
  ├── AIMentorPanel.jsx          (Milestone 2.3)
  ├── CurriculumBuilder.jsx      (Milestone 3.3)
  ├── AnalyticsDashboard.jsx     (Milestone 4.1)
  └── PerformanceInsights.jsx    (Milestone 4.2)
```

### New Backend Scripts
```
backend/scripts/
  ├── seed_guidelines.js         (Milestone 1.1)
  └── migrate_analytics.js       (Milestone 4.1)
```

### Firestore Schema Extensions
```
guideline_registry/{region}_{topic}/
  ├── region: string
  ├── topic: string
  ├── local: array
  ├── national: array
  ├── regional: array
  ├── international: array
  └── last_updated: timestamp

curriculums/{curriculum_id}/
  ├── uid: string
  ├── template: string (USMLE, EM, GP)
  ├── start_date: timestamp
  ├── target_date: timestamp
  ├── topics: array
  ├── progress: object
  └── completion_percentage: number

analytics/{collection}/
  ├── openai_usage/{date}/
  │   ├── requests: number
  │   ├── tokens: number
  │   ├── cost: number
  │   └── models: object
  └── quiz_completions/{date}/
      ├── total: number
      ├── avg_score: number
      └── topics: object
```

---

## 🔧 Implementation Strategy

### Phase 4.1 (Weeks 1-2): Infrastructure
Focus on backend improvements that enable Phase 4 features:
- Firestore guidelines seeding (eliminates static registry)
- CI/CD automation (reduces deployment friction)
- Telemetry foundation (enables data-driven decisions)

**Success Criteria:**
- ✅ Guidelines load from Firestore with <2s latency
- ✅ CI/CD deploys and routes traffic automatically after health check
- ✅ Telemetry captures 100% of OpenAI calls and quiz completions

---

### Phase 4.2 (Weeks 3-4): AI Mentor Core
Build the personalized tutoring system:
- Backend mentor session endpoint
- Study plan generation with spaced repetition
- Frontend mentor panel UI

**Success Criteria:**
- ✅ Mentor generates personalized feedback based on weak areas
- ✅ Study plans adapt to user's available time and target exam
- ✅ Frontend displays mentor recommendations with actionable tasks

---

### Phase 4.3 (Weeks 5-6): Curriculum Builder
Enable custom learning path creation:
- Curriculum templates for major exams
- Drag-and-drop curriculum customization
- Progress tracking with certificates

**Success Criteria:**
- ✅ Users can create USMLE/EM/GP curriculum from template
- ✅ Curriculum tracks daily progress and completion percentage
- ✅ Certificates generated on 100% completion

---

### Phase 4.4 (Weeks 7-8): Analytics & Optimization
Add data-driven insights:
- Admin analytics dashboard
- User performance insights
- A/B testing framework

**Success Criteria:**
- ✅ Admin dashboard shows real-time usage metrics
- ✅ Users see personalized performance trends
- ✅ A/B tests run automatically and track conversion rates

---

## 📊 Success Metrics

### User Engagement
- Daily active users (DAU): Target 20% increase
- Quiz completion rate: Target 75%+
- Streak maintenance: Target 60% of users maintain 7-day streak

### Learning Effectiveness
- Average score improvement: Target +10% after 2 weeks
- Weak area remediation: Target 80% improvement on retake
- Exam readiness: Target 85% predicted pass rate for curriculum completers

### Platform Performance
- OpenAI API costs: Monitor and optimize (target <$0.50 per user/month)
- Quiz generation latency: Target <45s (down from 60s)
- Page load time: Target <2s for all components

---

## 🚧 Dependencies & Risks

### Technical Dependencies
- Firestore query performance (guidelines seeding)
- OpenAI API rate limits (mentor mode)
- React state management complexity (curriculum builder)

### External Dependencies
- External Development Panel feedback on mentor tone
- USMLE/EM board content review for curriculum templates
- Legal review for certificate issuance

### Risk Mitigation
- **Firestore Performance:** Implement caching layer with Redis if needed
- **OpenAI Rate Limits:** Add queue system with exponential backoff
- **State Management:** Consider migrating to Redux/Zustand if complexity grows
- **Legal Compliance:** Use "Certificate of Completion" (not "Certification")

---

## 🧪 Testing Strategy

### Unit Tests
- Mentor session logic (weak area analysis, study plan generation)
- Curriculum progress tracking (completion percentage, milestone detection)
- Telemetry data aggregation (daily/weekly/monthly rollups)

### Integration Tests
- Firestore guidelines seeding (verify data integrity)
- CI/CD workflow (health check → traffic routing → rollback)
- End-to-end mentor session (user input → AI response → frontend display)

### User Acceptance Testing
- External Development Panel review of mentor tone and recommendations
- Medical Student panel tests curriculum builder usability
- USMLE Expert validates exam readiness predictions

---

## 📅 Timeline

| Week | Milestone | Key Deliverables |
|------|-----------|------------------|
| 1-2 | Infrastructure | Firestore seeding, CI/CD automation, telemetry |
| 3-4 | AI Mentor | Session endpoint, study plans, frontend panel |
| 5-6 | Curriculum | Templates, builder UI, progress tracking |
| 7-8 | Analytics | Dashboards, insights, A/B testing |

**Target Completion:** 2026-01-07 (8 weeks from start)

---

## ✅ Definition of Done

Phase 4 is complete when:
- [ ] All Milestone 1-4 tasks marked complete
- [ ] External Development Panel approval received
- [ ] All integration tests passing
- [ ] User acceptance testing completed
- [ ] Documentation updated (COPILOT_MASTER_GUIDE.md)
- [ ] Production deployment successful
- [ ] Post-deployment monitoring shows stable metrics
- [ ] v4.0.0 tag created

---

## 📚 Reference Documents

- **Master Guide:** `docs/COPILOT_MASTER_GUIDE.md`
- **Phase 3 Report:** `PHASE3_DEPLOYMENT_REPORT.md`
- **Operations Guide:** `PHASE3_OPERATIONS_GUIDE.md`
- **External Panel:** `docs/EXTERNAL_PANEL_ENHANCEMENT_PLAN.md`

---

## 🆘 Support & Communication

**Daily Standups:** Track progress on Milestone tasks  
**Weekly Reviews:** External Panel feedback sessions  
**Blockers:** Document in GitHub Issues with `phase4` label

---

**Last Updated:** 2025-11-12  
**Next Review:** 2025-11-19 (weekly)  
**Maintained By:** AI/Coding Expert + Development Team
