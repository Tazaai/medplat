# Phase 5 Deployment Guide

> **Last Updated:** 2025-01-12  
> **Branch:** `feature/phase5-global-mentor`  
> **Target Version:** v5.0.0-alpha → v5.0.0  
> **Status:** Integration Complete, Deployment Pending

---

## ✅ Completion Status

### Phase 5 Integration: **COMPLETE** (100%)

**Completed Tasks:**
1. ✅ Registered Panel API route (backend/index.js static import)
2. ✅ Registered Mentor Network API route (backend/index.js dynamic import)
3. ✅ Created GlobalMentorHub.jsx frontend component (534 lines)
4. ✅ Integrated GlobalMentorHub into CaseView.jsx navigation
5. ✅ Validation tests: **10/10 PASSING** ✅
6. ✅ Frontend build: **SUCCESS** (3063 modules, 1.34 MB main bundle)
7. ✅ Committed to feature/phase5-global-mentor (7b4fc4f)
8. ✅ Pushed to GitHub

**Pending:**
- ⏳ Deploy backend to Cloud Run (Phase 5 routes)
- ⏳ Deploy frontend to Firebase Hosting
- ⏳ Verify endpoints (/api/panel/health, /api/mentor_network/health)
- ⏳ Test GlobalMentorHub UI rendering
- ⏳ Merge to main (after successful staging verification)

---

## 📋 Pre-Deployment Checklist

### Code Quality: ✅
- [x] All files committed (3 files modified)
- [x] Pushed to GitHub (feature/phase5-global-mentor)
- [x] No merge conflicts with main
- [x] Regression tests passing (10/10)
- [x] Frontend build successful

### Backend Routes: ✅
- [x] Panel API registered (backend/index.js line ~12)
- [x] Mentor Network API registered (backend/index.js line ~103, ~150, ~306)
- [x] Debug logging added for mentorNetworkMod
- [x] Try-catch protection for route mounting
- [x] Health check endpoints implemented

### Frontend Components: ✅
- [x] GlobalMentorHub.jsx created (5 tabs: Overview, AI Mentor, Challenges, Leaderboard, Certificates)
- [x] CaseView.jsx updated (import + button + conditional render)
- [x] API_BASE configured for production URL
- [x] User authentication flow handled
- [x] Loading states implemented
- [x] Error handling implemented

---

## 🚀 Deployment Steps

### Step 1: Deploy Backend to Cloud Run

#### Option A: From Backend Directory (Recommended)
```bash
cd /workspaces/medplat/backend

gcloud run deploy medplat-backend \
  --region=europe-west1 \
  --source=. \
  --platform=managed \
  --allow-unauthenticated \
  --project=medplat-458911 \
  --timeout=300s \
  --memory=512Mi \
  --cpu=1 \
  --max-instances=10 \
  --set-env-vars="NODE_ENV=production,DEPLOYMENT_TAG=v5.0.0-alpha"
```

**Expected Output:**
```
Building using Dockerfile and deploying container to Cloud Run service [medplat-backend]
✓ Building Container... Done
✓ Uploading... Done
✓ DONE
Service [medplat-backend] revision [medplat-backend-01039-xxx] has been deployed
Service URL: https://medplat-backend-139218747785.europe-west1.run.app
```

#### Option B: Manual Container Build (If Automatic Build Fails)
```bash
# Build container locally
cd /workspaces/medplat/backend
gcloud builds submit --tag gcr.io/medplat-458911/medplat-backend:v5.0.0-alpha .

# Deploy from container registry
gcloud run deploy medplat-backend \
  --region=europe-west1 \
  --image gcr.io/medplat-458911/medplat-backend:v5.0.0-alpha \
  --platform=managed \
  --allow-unauthenticated \
  --timeout=300s \
  --memory=512Mi \
  --set-env-vars="NODE_ENV=production,DEPLOYMENT_TAG=v5.0.0-alpha"
```

### Step 2: Deploy Frontend to Firebase Hosting

```bash
cd /workspaces/medplat/frontend

# Build frontend (already completed)
npm run build

# Deploy to Firebase
firebase deploy --only hosting

# Or deploy to specific environment
firebase deploy --only hosting:production
```

**Expected Output:**
```
✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/medplat-458911/overview
Hosting URL: https://medplat-458911.web.app
```

### Step 3: Verify Endpoints

#### Backend Health Checks
```bash
# Panel API health
curl https://medplat-backend-139218747785.europe-west1.run.app/api/panel/health

# Expected Response:
# {"ok":true,"service":"panel","status":"operational"}

# Mentor Network API health
curl https://medplat-backend-139218747785.europe-west1.run.app/api/mentor_network/health

# Expected Response:
# {"ok":true,"service":"mentor_network","status":"operational","model":"gpt-4o-mini"}
```

#### Panel API Endpoints
```bash
# Submit feedback (requires auth token)
curl -X POST https://medplat-backend-139218747785.europe-west1.run.app/api/panel/submit \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "test_panel_member_123",
    "category": "clinical_logic",
    "component": "case_generator",
    "feedback": "Test feedback submission",
    "priority": "medium",
    "ratings": {
      "clinical": 9,
      "educational": 8,
      "ux": 9
    }
  }'

# Get feedback (admin only)
curl "https://medplat-backend-139218747785.europe-west1.run.app/api/panel/feedback?cycle=Q1_2025"
```

#### Mentor Network API Endpoints
```bash
# Start mentor session
curl -X POST https://medplat-backend-139218747785.europe-west1.run.app/api/mentor_network/session \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "test_user_123",
    "topic": "Cardiology",
    "difficulty": "intermediate",
    "persona": "medical_student"
  }'

# Get daily challenge
curl "https://medplat-backend-139218747785.europe-west1.run.app/api/mentor_network/daily_challenge?uid=test_user_123"
```

### Step 4: Test Frontend UI

1. Navigate to: https://medplat-458911.web.app
2. Log in with test credentials
3. Click **"🌍 Mentor Hub"** tab
4. Verify all 5 sub-tabs render:
   - ✅ Overview (streak, XP, badges, daily challenge)
   - ✅ AI Mentor (chat interface, start session button)
   - ✅ Challenges (daily challenge card)
   - ✅ Leaderboard (coming soon placeholder)
   - ✅ Certificates (coming soon placeholder)
5. Test mentor session:
   - Click "Start Session" in AI Mentor tab
   - Send a message ("Explain atrial fibrillation")
   - Verify mentor response renders
   - Verify XP reward displays

---

## 🔍 Post-Deployment Verification

### Backend Logs
```bash
# View recent logs
gcloud run services logs read medplat-backend \
  --region=europe-west1 \
  --limit=100

# Check for Phase 5 mount messages
gcloud run services logs read medplat-backend \
  --region=europe-west1 \
  --filter="severity=DEFAULT" | grep "Mounted /api/mentor_network"

# Expected log:
# ✅ Mounted /api/mentor_network -> ./routes/mentor_network_api.mjs (Phase 5)
```

### Traffic Routing
```bash
# Check current traffic distribution
gcloud run services describe medplat-backend \
  --region=europe-west1 \
  --format="value(status.traffic[0].revisionName,status.traffic[0].percent)"

# Route 100% traffic to latest revision (if successful)
gcloud run services update-traffic medplat-backend \
  --region=europe-west1 \
  --to-latest
```

### Performance Metrics
```bash
# Check response times
time curl -s https://medplat-backend-139218747785.europe-west1.run.app/api/mentor_network/health > /dev/null

# Expected: <1s for health checks
# Expected: <3s for mentor sessions
# Expected: <5s for daily challenges
```

---

## 🧪 Integration Tests

### Test Scenario 1: Panel Feedback Submission
```javascript
// Expected Flow:
// 1. Panel member logs in
// 2. Navigates to panel feedback form (future component)
// 3. Submits feedback with ratings
// 4. Feedback stored in Firestore panel_feedback collection
// 5. Admin retrieves feedback via GET /api/panel/feedback
// 6. Consensus generated via POST /api/panel/consensus
```

### Test Scenario 2: Adaptive Mentor Session
```javascript
// Expected Flow:
// 1. User navigates to GlobalMentorHub → AI Mentor tab
// 2. Clicks "Start Session"
// 3. POST /api/mentor_network/session creates session
// 4. User sends message: "Explain atrial fibrillation"
// 5. Backend assesses understanding level (0.3-0.8)
// 6. Builds adaptive prompt (simplified/intermediate/advanced)
// 7. OpenAI generates structured response with reasoning chain
// 8. User earns XP (base 20 + quality bonus)
// 9. Session history persisted in Firestore
```

### Test Scenario 3: Daily Challenge Completion
```javascript
// Expected Flow:
// 1. User opens GlobalMentorHub → Challenges tab
// 2. GET /api/mentor_network/daily_challenge generates 5 cases
// 3. User completes 5 cases within time limit
// 4. User earns 200 base XP + 100 perfect score bonus
// 5. Streak incremented if consecutive day
// 6. Milestone bonus awarded if applicable (7/14/30/60/100 days)
```

---

## 📊 Success Metrics

### Immediate Goals (Week 1)
- ✅ Backend deployment successful (all routes operational)
- ✅ Frontend deployment successful (GlobalMentorHub renders)
- ✅ Health endpoints responding <1s
- ✅ Mentor sessions completing <3s
- ✅ No regression in existing Phase 3/4 features

### Short-Term Goals (Week 2-4)
- Daily active users (DAU) baseline established
- Mentor session completion rate >70%
- Average session length >3 minutes
- XP system engagement: >50% of users earning XP daily
- Streak retention: >40% of users maintaining 7-day streak

### Medium-Term Goals (Week 5-13)
- DAU +30% (5K → 6.5K)
- Quiz scores +7% (78% → 85%)
- Panel participation ≥90%
- Clinical accuracy ratings ≥9.0/10
- Certificate completions: 10K users

---

## 🚨 Rollback Plan

### If Deployment Fails
```bash
# Revert to previous stable revision (Phase 4 v4.0.0)
gcloud run services update-traffic medplat-backend \
  --region=europe-west1 \
  --to-revisions=medplat-backend-01038-w5b=100

# Verify rollback
curl https://medplat-backend-139218747785.europe-west1.run.app/health
```

### If Critical Bugs Found
```bash
# Quick fix workflow:
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/phase5-critical-fix

# 2. Apply fix, commit, push
git commit -m "hotfix(phase5): fix critical bug in mentor_network_api"
git push origin hotfix/phase5-critical-fix

# 3. Deploy hotfix
cd backend
gcloud run deploy medplat-backend --source=.

# 4. Merge hotfix to main and feature/phase5-global-mentor
```

---

## 📝 Deployment Logs

### Deployment 1: Phase 5 Alpha (Pending)
- **Date:** 2025-01-12
- **Revision:** medplat-backend-01039-xxx (pending)
- **Status:** Build in progress
- **Changes:**
  - Added mentor_network_api.mjs (557 lines)
  - Added panel_api.mjs (569 lines)
  - Created GlobalMentorHub.jsx (534 lines)
  - Integrated into CaseView.jsx
- **Validation:** 10/10 tests passing
- **Frontend Build:** SUCCESS (3063 modules)

### Previous Deployment: Phase 4 v4.0.0 (Stable)
- **Date:** 2025-11-12
- **Revision:** medplat-backend-01038-w5b
- **Status:** OPERATIONAL (100% traffic)
- **Features:** AI Mentor, Curriculum Builder, Analytics Dashboard

---

## 🔗 Related Documentation

- **Phase 5 Planning:** `docs/phase5/PHASE5_PLANNING.md`
- **External Panel Guide:** `docs/panels/EXTERNAL_DEVELOPMENT_PANEL_GUIDE.md`
- **Phase 5 Architecture:** `PHASE4_PLAN.md` (Phase 5 section)
- **Copilot Instructions:** `.github/copilot-instructions.md`
- **API Specifications:**
  - Panel API: `backend/routes/panel_api.mjs`
  - Mentor Network API: `backend/routes/mentor_network_api.mjs`
- **Frontend Components:**
  - GlobalMentorHub: `frontend/src/components/GlobalMentorHub.jsx`
  - CaseView: `frontend/src/components/CaseView.jsx`

---

## 🎯 Next Steps After Deployment

### Immediate (Week 1)
1. Monitor Cloud Run logs for errors
2. Track mentor session completion rates
3. Gather user feedback on GlobalMentorHub UX
4. Optimize OpenAI token usage (prompt compression)
5. Add telemetry logging for all Phase 5 endpoints

### Short-Term (Week 2-4)
6. Build panel member dashboard (review interface)
7. Add feedback submission form
8. Implement consensus report viewer
9. Create "Explain Why" button for reasoning chains
10. Add push notifications for streak reminders

### Medium-Term (Week 5-13)
11. Optimize Firestore queries (add composite indexes)
12. Build leaderboard backend (global/regional/weekly)
13. Implement certificate generation system
14. Create badge showcase animations (Framer Motion)
15. A/B test adaptive difficulty thresholds

---

## ✅ Final Checklist

Before merging to main:

- [ ] Backend deployed successfully
- [ ] Frontend deployed successfully
- [ ] All health endpoints responding
- [ ] GlobalMentorHub renders all 5 tabs
- [ ] Mentor sessions creating successfully
- [ ] Daily challenges generating correctly
- [ ] XP system awarding correctly
- [ ] Streak tracking working
- [ ] No regression in Phase 3/4 features
- [ ] Telemetry logging operational
- [ ] External Panel review requested
- [ ] Documentation updated (CHANGELOG_PHASE5.txt)
- [ ] Git tag created (v5.0.0-alpha)
- [ ] Pull request created and reviewed
- [ ] Main branch merge approved

---

**Deployment Owner:** GitHub Copilot Agent  
**Review Status:** Pending External Development Panel  
**Target Completion:** 2025-01-19 (Week 1 of Phase 5)
