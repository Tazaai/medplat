# Phase 4 Quick Reference — AI Mentor + Curriculum Builder

**Version**: v4.0.0 (in development)  
**Branch**: `feature/phase4-ai-mentor`  
**Base**: v3.0.0 (production-stable)  
**Timeline**: 8 weeks (2025-11-12 → 2026-01-07)

---

## 📋 Documentation Map

| Document | Purpose |
|----------|---------|
| `PHASE4_PLAN.md` | Complete 8-week roadmap with milestones |
| `docs/COPILOT_PHASE4_GUIDE.md` | Copilot implementation guide with code patterns |
| `docs/COPILOT_MASTER_GUIDE.md` | Governance, External Panel, AI behavior rules |
| `PHASE3_OPERATIONS_GUIDE.md` | Production monitoring & troubleshooting |
| `validate_phase3.sh` | Automated regression test suite (10 tests) |

---

## 🎯 Current Status

**Phase 3**: ✅ Production (v3.0.0)
- All endpoints operational
- 10/10 regression tests passing
- Comprehensive governance established

**Phase 4**: 🚧 Development Initialized
- [x] Branch created
- [x] Development plan documented
- [x] Copilot guide created
- [ ] Milestone 1 in progress

---

## 🧩 Milestone 1 — Infrastructure (Weeks 1-4)

### Task 1: Firestore Guidelines Seeding
```bash
# Create seeding script
touch backend/setup/seed_guidelines.js

# Implementation location
backend/routes/guidelines_api.mjs  # Update to read from Firestore

# Expected outcome
- Guidelines load from Firestore in <2s
- Static fallback if Firestore unavailable
- Migration complete for all GUIDELINE_REGISTRY entries
```

### Task 2: CI/CD Auto-Traffic Routing
```yaml
# New workflow file
.github/workflows/auto_traffic.yml

# Key features
- Health check after deployment
- Automatic traffic routing to latest revision
- Rollback on health check failure
```

### Task 3: Telemetry Logging
```bash
# Create telemetry module
touch backend/telemetry/telemetry_logger.mjs

# Integration points
backend/routes/dialog_api.mjs      # Log OpenAI calls
backend/routes/adaptive_feedback_api.mjs  # Log quiz completions

# New endpoint
POST /api/telemetry/stats  # Summary analytics
```

### Validation
```bash
bash validate_phase3.sh  # Must pass 10/10
curl -X POST /api/guidelines/fetch  # Firestore response
curl /api/telemetry/stats  # View metrics
```

---

## 🧠 Milestone 2 — AI Mentor Mode (Weeks 5-6)

### Backend Route
```javascript
// backend/routes/mentor_api.mjs
POST /api/mentor/session
{
  "uid": "user123",
  "weakAreas": [{"topic": "AF", "score": 45}],
  "language": "en"
}

// Response
{
  "ok": true,
  "mentorPlan": [
    {"topic": "AF Anticoagulation", "focus": "Decision-score reasoning"}
  ]
}
```

### Frontend Component
```javascript
// frontend/src/components/MentorPanel.jsx
- Display personalized study recommendations
- Show progress summary
- Link to weak area resources
```

---

## 🎓 Milestone 3 — Curriculum Builder (Week 7)

### Backend Route
```javascript
// backend/routes/curriculum_api.mjs
POST /api/curriculum/generate
{
  "examType": "USMLE",
  "targetWeeks": 6
}

// Response
{
  "ok": true,
  "curriculum": {
    "weeks": [...],
    "topics": [...],
    "progress": 0
  }
}
```

### Frontend Component
```javascript
// frontend/src/components/CurriculumBuilder.jsx
- Topic checklist
- Progress bar
- Export to PDF
- Save to user profile
```

---

## 📊 Milestone 4 — Analytics & Optimization (Week 8)

### Backend Route
```javascript
// backend/routes/analytics_api.mjs
GET /api/analytics/overview

// Response
{
  "ok": true,
  "analytics": {
    "openai_calls": 1250,
    "avg_latency": 850,
    "quiz_completions": 340,
    "active_users": 89
  }
}
```

### Frontend Component
```javascript
// frontend/src/components/AnalyticsDashboard.jsx
- Real-time metrics
- User engagement graphs
- Cost tracking
```

---

## ⚙️ Essential Commands

### Development
```bash
# Start local backend
cd backend && npm install && PORT=8080 node index.js

# Start local frontend
cd frontend && npm install && VITE_API_BASE=http://localhost:8080 npm run dev

# Run regression tests
bash validate_phase3.sh
```

### Deployment
```bash
# Push to trigger CI/CD
git push origin feature/phase4-ai-mentor

# Manual deployment (if needed)
gcloud builds submit --config cloudbuild.yaml

# Check deployment status
gcloud run services describe medplat-backend --region=europe-west1
```

### Monitoring
```bash
# Health check
curl https://medplat-backend-139218747785.europe-west1.run.app/

# View logs
gcloud logging read 'resource.labels.service_name=medplat-backend' --limit 50

# Check telemetry
curl https://medplat-backend-139218747785.europe-west1.run.app/api/telemetry/stats
```

---

## 🔒 Quality Gates

Before merging to `main`:

- [ ] Phase 3 regression: `validate_phase3.sh` passes 10/10
- [ ] New endpoints tested locally and in staging
- [ ] Telemetry confirms no performance degradation (<2s non-generative)
- [ ] Documentation updated (`PHASE4_PLAN.md`, `COPILOT_MASTER_GUIDE.md`)
- [ ] External Panel review (if milestone-complete)
- [ ] Version tag prepared (`v4.0.0-alpha` → `v4.0.0-beta` → `v4.0.0`)

---

## 🚨 Emergency Procedures

### Rollback to v3.0.0
```bash
gcloud run services update-traffic medplat-backend \
  --to-revisions=medplat-backend-01033-scb=100 \
  --region=europe-west1

# Verify
curl https://medplat-backend-139218747785.europe-west1.run.app/
```

### Debug Failed Deployment
```bash
# View build logs
gcloud builds list --limit=5

# Check service status
gcloud run services describe medplat-backend --region=europe-west1

# Test endpoints
bash test_backend_local.sh
```

---

## 📚 External Panel Contacts

Review cycles for Phase 4:

1. **Milestone 1 Complete** — Infrastructure review (technical panel)
2. **Milestone 2 Complete** — AI Mentor pedagogy review (USMLE + Professor)
3. **Milestone 3 Complete** — Curriculum alignment review (Student + USMLE)
4. **Final v4.0.0** — Full system review (17-member panel)

---

## 🎯 Success Metrics

### Milestone 1
- Firestore seeding: 100% topics migrated, <2s latency
- CI/CD automation: Zero manual traffic routing steps
- Telemetry: 100% OpenAI call capture, p95 latency tracked

### Milestone 2
- AI Mentor adoption: 30% of active users engage weekly
- Weak area focus: 50% improvement in targeted topic scores

### Milestone 3
- Curriculum completion: 75% of generated plans followed >80%
- Certification paths: 3 exam types supported (USMLE, MRCP, FRCA)

### Milestone 4
- Analytics dashboard: <5s load time, 15+ metrics visualized
- Cost optimization: OpenAI spend reduced by 15% via model tuning

---

**Last Updated**: 2025-11-12  
**Status**: Phase 4 development initialized, ready for Milestone 1 implementation
