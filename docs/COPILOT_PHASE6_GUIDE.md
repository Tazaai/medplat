# 🤖 Copilot Phase 6 Implementation Guide

**Target:** v6.0.0 (Advanced Certification & Global Leaderboards)  
**Base:** v5.0.0-alpha  
**Branch:** `feature/phase6-certifications`  
**Timeline:** 8 weeks

---

## 🎯 Autonomous Execution Rules

### Golden Principles

1. **Build on Phase 5 stability** - All Phase 5 features must remain operational
2. **Clinical rigor first** - Exam content must be evidence-based and accurate
3. **Performance targets** - Leaderboards <200ms, certificates <2s generation
4. **External Panel approval** - Phase 6 cannot deploy without panel consensus
5. **No regressions** - `validate_phase3.sh` must pass 10/10 throughout

### Communication Style

- **Concise updates** - Report completion, not process
- **Critical issues only** - Alert on blockers, not routine operations
- **Final results** - Show outcomes, not intermediate logs
- **Actionable next steps** - Always provide clear continuation path

---

## 📋 Milestone 1: Certification Infrastructure (Weeks 1-2)

### Backend Implementation

**Files to Create:**

```javascript
// backend/routes/certification_api.mjs
import express from 'express';
import { db } from '../firebaseClient.js';
import { generateCertificatePDF } from '../utils/pdf_generator.mjs';
import { logEngagementEvent } from '../telemetry/telemetry_logger.mjs';

const router = express.Router();

// Health check
router.get('/health', async (req, res) => {
  res.json({
    ok: true,
    service: 'certification',
    status: 'operational'
  });
});

// Enroll in pathway
router.post('/enroll', async (req, res) => {
  const { uid, pathway_id } = req.body;
  
  // Create enrollment record
  const enrollment = {
    uid,
    pathway_id,
    enrolled_at: new Date().toISOString(),
    progress: 0,
    status: 'active'
  };
  
  await db.collection('pathway_enrollments').add(enrollment);
  await logEngagementEvent({
    uid,
    event_type: 'pathway_enrolled',
    payload: { pathway_id }
  });
  
  res.json({ ok: true, enrollment });
});

// Get progress
router.get('/progress', async (req, res) => {
  const { uid, pathway_id } = req.query;
  
  const snapshot = await db.collection('pathway_enrollments')
    .where('uid', '==', uid)
    .where('pathway_id', '==', pathway_id)
    .where('status', '==', 'active')
    .get();
    
  if (snapshot.empty) {
    return res.status(404).json({ error: 'Enrollment not found' });
  }
  
  const enrollment = snapshot.docs[0].data();
  res.json({ ok: true, progress: enrollment.progress });
});

// Complete pathway and issue certificate
router.post('/complete', async (req, res) => {
  const { uid, pathway_id } = req.body;
  
  // Verify requirements met
  const requirements = await verifyPathwayRequirements(uid, pathway_id);
  if (!requirements.met) {
    return res.status(400).json({ 
      error: 'Requirements not met',
      missing: requirements.missing 
    });
  }
  
  // Generate verification code
  const verification_code = generateVerificationCode();
  
  // Create certificate
  const certificate = {
    uid,
    pathway_id,
    issued_at: new Date().toISOString(),
    verification_code,
    status: 'valid'
  };
  
  await db.collection('certifications').add(certificate);
  
  // Generate PDF
  const pdf_url = await generateCertificatePDF(certificate);
  
  await logEngagementEvent({
    uid,
    event_type: 'certificate_issued',
    payload: { pathway_id, verification_code }
  });
  
  res.json({ ok: true, certificate, pdf_url });
});

// Verify certificate
router.get('/verify/:code', async (req, res) => {
  const { code } = req.params;
  
  const snapshot = await db.collection('certifications')
    .where('verification_code', '==', code)
    .where('status', '==', 'valid')
    .get();
    
  if (snapshot.empty) {
    return res.status(404).json({ error: 'Certificate not found' });
  }
  
  const cert = snapshot.docs[0].data();
  res.json({ ok: true, valid: true, certificate: cert });
});

// List user certificates
router.get('/list', async (req, res) => {
  const { uid } = req.query;
  
  const snapshot = await db.collection('certifications')
    .where('uid', '==', uid)
    .orderBy('issued_at', 'desc')
    .get();
    
  const certificates = snapshot.docs.map(doc => doc.data());
  res.json({ ok: true, certificates });
});

export default router;
```

**Helper Functions:**

```javascript
// backend/utils/pdf_generator.mjs
import PDFDocument from 'pdfkit';
import { Storage } from '@google-cloud/storage';

export async function generateCertificatePDF(certificate) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const buffers = [];
  
  doc.on('data', buffers.push.bind(buffers));
  
  // Header
  doc.fontSize(24).text('MedPlat Certificate of Completion', { align: 'center' });
  doc.moveDown();
  
  // User info
  doc.fontSize(16).text(`This certifies that`, { align: 'center' });
  doc.fontSize(20).text(certificate.user_name, { align: 'center' });
  doc.moveDown();
  
  // Pathway info
  doc.fontSize(14).text(`has successfully completed the`, { align: 'center' });
  doc.fontSize(18).text(certificate.pathway_name, { align: 'center' });
  doc.moveDown();
  
  // Date and verification
  doc.fontSize(12).text(`Issued: ${certificate.issued_at}`, { align: 'center' });
  doc.text(`Verification Code: ${certificate.verification_code}`, { align: 'center' });
  
  doc.end();
  
  return new Promise((resolve, reject) => {
    doc.on('end', async () => {
      const pdfBuffer = Buffer.concat(buffers);
      const filename = `certificates/${certificate.verification_code}.pdf`;
      
      // Upload to Google Cloud Storage
      const storage = new Storage();
      const bucket = storage.bucket('medplat-certificates');
      const file = bucket.file(filename);
      
      await file.save(pdfBuffer, { contentType: 'application/pdf' });
      
      const url = `https://storage.googleapis.com/medplat-certificates/${filename}`;
      resolve(url);
    });
  });
}

function generateVerificationCode() {
  const prefix = 'MEDP';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

async function verifyPathwayRequirements(uid, pathway_id) {
  // Check XP threshold
  // Check quiz completion
  // Check streak requirement
  // Return { met: boolean, missing: array }
}
```

**Data Files:**

```json
// backend/data/pathways.json
{
  "cardiology-specialist": {
    "id": "cardiology-specialist",
    "name": "Cardiology Specialist Pathway",
    "specialty": "Cardiology",
    "requirements": {
      "topics_mastered": 120,
      "xp_required": 15000,
      "quiz_accuracy_min": 0.85,
      "streak_days_min": 30
    },
    "topics": [
      "acute-coronary-syndrome",
      "heart-failure",
      "arrhythmias",
      "valvular-disease",
      "ecg-interpretation"
    ]
  },
  "emergency-medicine": {
    "id": "emergency-medicine",
    "name": "Emergency Medicine Pathway",
    "specialty": "Emergency Medicine",
    "requirements": {
      "topics_mastered": 100,
      "xp_required": 12000,
      "quiz_accuracy_min": 0.80,
      "streak_days_min": 21
    },
    "topics": [
      "trauma-management",
      "sepsis-shock",
      "acute-abdomen",
      "toxicology",
      "resuscitation"
    ]
  }
}
```

**Register Route:**

```javascript
// backend/index.js - Add to existing routes
import certificationRoutes from './routes/certification_api.mjs';
app.use('/api/certification', certificationRoutes);
```

### Frontend Implementation

**Components:**

```jsx
// frontend/src/components/CertificationCard.jsx
import React from 'react';

export default function CertificationCard({ certificate }) {
  return (
    <div className="certification-card">
      <div className="cert-header">
        <h3>🎓 {certificate.pathway_name}</h3>
        <span className="cert-date">{new Date(certificate.issued_at).toLocaleDateString()}</span>
      </div>
      
      <div className="cert-body">
        <p>Verification Code:</p>
        <code>{certificate.verification_code}</code>
      </div>
      
      <div className="cert-actions">
        <button onClick={() => window.open(certificate.pdf_url)}>
          📄 Download PDF
        </button>
        <button onClick={() => shareToLinkedIn(certificate)}>
          🔗 Share on LinkedIn
        </button>
      </div>
    </div>
  );
}

function shareToLinkedIn(cert) {
  const url = `https://www.linkedin.com/sharing/share-offsite/?url=https://medplat.app/verify/${cert.verification_code}`;
  window.open(url, '_blank');
}
```

```jsx
// frontend/src/components/PathwayProgress.jsx
import React from 'react';

export default function PathwayProgress({ pathway, enrollment }) {
  const progress = enrollment?.progress || 0;
  const requirements = pathway.requirements;
  
  return (
    <div className="pathway-progress">
      <h4>{pathway.name}</h4>
      
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
      </div>
      <p>{progress}% Complete</p>
      
      <div className="requirements-checklist">
        <h5>Requirements:</h5>
        <ul>
          <li>✅ Topics: {enrollment?.topics_completed || 0} / {requirements.topics_mastered}</li>
          <li>✅ XP: {enrollment?.xp || 0} / {requirements.xp_required}</li>
          <li>✅ Accuracy: {(enrollment?.accuracy || 0) * 100}% / {requirements.quiz_accuracy_min * 100}%</li>
          <li>✅ Streak: {enrollment?.streak || 0} / {requirements.streak_days_min} days</li>
        </ul>
      </div>
    </div>
  );
}
```

### Testing Checklist

```bash
# Backend API tests
curl https://medplat-backend-139218747785.europe-west1.run.app/api/certification/health
# Expected: {"ok": true, "service": "certification", "status": "operational"}

curl -X POST https://medplat-backend-139218747785.europe-west1.run.app/api/certification/enroll \
  -H "Content-Type: application/json" \
  -d '{"uid": "test-user", "pathway_id": "cardiology-specialist"}'
# Expected: {"ok": true, "enrollment": {...}}

# Regression test
bash validate_phase3.sh
# Expected: 10/10 PASSING
```

---

## 📋 Milestone 2: Leaderboard System (Weeks 3-4)

### Backend Implementation

**ELO Ranking Algorithm:**

```javascript
// backend/utils/ranking_engine.mjs
export function calculateGlobalRankings(users) {
  // Sort users by XP descending
  const sorted = users.sort((a, b) => b.xp - a.xp);
  
  // Assign ranks and tiers
  return sorted.map((user, index) => {
    const rank = index + 1;
    const percentile = (1 - rank / sorted.length) * 100;
    const tier = calculateTier(percentile);
    
    return {
      uid: user.uid,
      rank,
      xp: user.xp,
      percentile,
      tier
    };
  });
}

function calculateTier(percentile) {
  if (percentile >= 99) return 'Diamond';
  if (percentile >= 95) return 'Platinum';
  if (percentile >= 85) return 'Gold';
  if (percentile >= 60) return 'Silver';
  return 'Bronze';
}

export function calculateSpecialtyRankings(users, specialty) {
  const filtered = users.filter(u => u.specialty === specialty);
  return calculateGlobalRankings(filtered);
}
```

**Leaderboard API:**

```javascript
// backend/routes/leaderboard_api.mjs
import express from 'express';
import { db } from '../firebaseClient.js';
import { calculateGlobalRankings, calculateSpecialtyRankings } from '../utils/ranking_engine.mjs';
import Redis from 'ioredis';

const router = express.Router();
const redis = new Redis(process.env.REDIS_URL);

router.get('/health', async (req, res) => {
  res.json({ ok: true, service: 'leaderboard', status: 'operational' });
});

router.get('/global', async (req, res) => {
  const { period = 'weekly' } = req.query;
  const cacheKey = `leaderboard:global:${period}`;
  
  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return res.json({ ok: true, rankings: JSON.parse(cached), cached: true });
  }
  
  // Fetch users and calculate rankings
  const snapshot = await db.collection('users').get();
  const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
  const rankings = calculateGlobalRankings(users);
  
  // Cache for 6 hours
  await redis.set(cacheKey, JSON.stringify(rankings), 'EX', 21600);
  
  res.json({ ok: true, rankings, cached: false });
});

router.get('/specialty/:specialty', async (req, res) => {
  const { specialty } = req.params;
  const cacheKey = `leaderboard:specialty:${specialty}`;
  
  const cached = await redis.get(cacheKey);
  if (cached) {
    return res.json({ ok: true, rankings: JSON.parse(cached), cached: true });
  }
  
  const snapshot = await db.collection('users').where('specialty', '==', specialty).get();
  const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
  const rankings = calculateSpecialtyRankings(users, specialty);
  
  await redis.set(cacheKey, JSON.stringify(rankings), 'EX', 21600);
  
  res.json({ ok: true, rankings, cached: false });
});

export default router;
```

### Frontend Implementation

```jsx
// frontend/src/components/LeaderboardTable.jsx
import React, { useEffect, useState } from 'react';

export default function LeaderboardTable({ type = 'global', period = 'weekly' }) {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchRankings();
    const interval = setInterval(fetchRankings, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [type, period]);
  
  async function fetchRankings() {
    const endpoint = type === 'global' 
      ? `/api/leaderboard/global?period=${period}`
      : `/api/leaderboard/specialty/${type}`;
      
    const res = await fetch(`${import.meta.env.VITE_API_BASE}${endpoint}`);
    const data = await res.json();
    setRankings(data.rankings);
    setLoading(false);
  }
  
  if (loading) return <div>Loading rankings...</div>;
  
  return (
    <table className="leaderboard-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>User</th>
          <th>XP</th>
          <th>Tier</th>
        </tr>
      </thead>
      <tbody>
        {rankings.slice(0, 100).map(user => (
          <tr key={user.uid}>
            <td>#{user.rank}</td>
            <td>{user.display_name}</td>
            <td>{user.xp.toLocaleString()}</td>
            <td><TierBadge tier={user.tier} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## 🚦 Quality Gates

### Before Each Milestone Completion

**Automated Checks:**
```bash
# Regression tests
bash validate_phase3.sh  # Must pass 10/10

# API endpoint verification
curl /api/certification/health  # Must return 200 OK
curl /api/leaderboard/health    # Must return 200 OK

# Performance tests
# Leaderboard query must be <200ms
# Certificate generation must be <2s
```

**Manual Verification:**
- [ ] External Panel review completed
- [ ] Clinical content accuracy confirmed
- [ ] UI/UX approved by Medical Student panel member
- [ ] Security audit passed (no PII leaks)

---

## 📦 Deployment Checklist

### Pre-Deployment

- [ ] All Phase 6 routes registered in `backend/index.js`
- [ ] Frontend environment variable `VITE_API_BASE` confirmed
- [ ] Firestore indexes created for new queries
- [ ] Redis cache configured and tested
- [ ] PDF generation tested (sample certificate)

### Deployment Commands

```bash
# Build backend
cd /workspaces/medplat/backend
gcloud builds submit --tag gcr.io/medplat-458911/medplat-backend:v6-alpha

# Deploy backend
gcloud run deploy medplat-backend \
  --image gcr.io/medplat-458911/medplat-backend:v6-alpha \
  --region europe-west1

# Build frontend
cd /workspaces/medplat/frontend
npm run build
gcloud builds submit --tag gcr.io/medplat-458911/medplat-frontend:v6-alpha

# Deploy frontend
gcloud run deploy medplat-frontend \
  --image gcr.io/medplat-458911/medplat-frontend:v6-alpha \
  --region europe-west1 \
  --set-env-vars VITE_API_BASE=https://medplat-backend-139218747785.europe-west1.run.app
```

### Post-Deployment

- [ ] Verify all endpoints return 200 OK
- [ ] Test certificate generation end-to-end
- [ ] Check leaderboard query performance
- [ ] Run regression tests (10/10 passing)
- [ ] Create deployment confirmation doc

---

## ✅ Success Criteria

### Technical Metrics

- [ ] Certification API: 6 endpoints operational
- [ ] Leaderboard API: 5 endpoints operational
- [ ] Response times: All <1s
- [ ] Certificate PDF generation: <2s
- [ ] Leaderboard query: <200ms
- [ ] Regression tests: 10/10 passing

### Clinical Quality

- [ ] Pathway requirements clinically validated
- [ ] Certificate content approved by External Panel
- [ ] Leaderboard ethics reviewed (no gaming)
- [ ] Exam prep questions ≥95% accurate

### User Experience

- [ ] Certificate download works on all browsers
- [ ] Leaderboard updates visible within 30s
- [ ] Pathway progress tracker accurate
- [ ] Mobile-responsive on all new pages

---

## 🎯 Copilot Execution Mode

When implementing Phase 6, Copilot will:

1. **Work sequentially** through milestones 1-5
2. **Report completion** of each milestone with:
   - Endpoints verified (URLs + 200 OK status)
   - Tests passed (regression + unit tests)
   - Next milestone ready to start
3. **Alert on blockers** only:
   - API errors preventing progress
   - Regression test failures
   - External dependency issues
4. **Minimize verbosity** - No step-by-step logs unless debugging

**Completion Template:**

```
✅ Milestone 1 Complete: Certification Infrastructure

Endpoints:
- POST /api/certification/enroll ✅ 200 OK
- GET /api/certification/progress ✅ 200 OK
- POST /api/certification/complete ✅ 200 OK
- GET /api/certification/verify/:code ✅ 200 OK
- GET /api/certification/list ✅ 200 OK

Tests: 10/10 PASSING
Next: Milestone 2 - Leaderboard System
```

---

**Phase 6 Guide Status:** ✅ READY FOR EXECUTION  
**Approval Required:** External Development Panel  
**Start Command:** `Implement Phase 6 Milestone 1 per COPILOT_PHASE6_GUIDE.md`
