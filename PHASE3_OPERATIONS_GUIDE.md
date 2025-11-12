# Phase 3 Production Operations Guide

**Version:** v3.0.0  
**Release Date:** 2025-11-12  
**Status:** ✅ LIVE IN PRODUCTION

---

## Quick Status Check

```bash
# Backend health
curl https://medplat-backend-139218747785.europe-west1.run.app/

# Guidelines API test
curl -X POST https://medplat-backend-139218747785.europe-west1.run.app/api/guidelines/fetch \
  -H "Content-Type: application/json" \
  -d '{"topic":"Atrial Fibrillation","region":"Denmark"}' | jq '.guidelines | keys'

# Adaptive feedback test
curl -X POST https://medplat-backend-139218747785.europe-west1.run.app/api/adaptive-feedback/next-quiz-topics \
  -H "Content-Type: application/json" \
  -d '{"uid":"ops_check"}' | jq '.distribution'
```

**Expected Results:**
- Health: `{"status":"MedPlat OK","pid":1}`
- Guidelines: `["local","national","regional","international"]`
- Adaptive: `{"remedial":8,"new":4}`

---

## Production Configuration

### Current Deployment
- **Backend Revision:** `medplat-backend-01033-scb`
- **Frontend Revision:** `medplat-frontend-00346-55t`
- **Traffic:** 100% to latest
- **Region:** europe-west1
- **Image SHA:** `sha256:338956d970b98404...`

### Secrets (Secret Manager)
- `medplat-openai-key` → OpenAI API key
- `medplat-firebase-key` → Firebase service account JSON

---

## Monitoring Commands

### Check Service Status
```bash
gcloud run services describe medplat-backend \
  --region=europe-west1 \
  --project=medplat-458911 \
  --format="yaml(status.conditions,status.traffic)"
```

### View Recent Logs
```bash
gcloud logging read \
  'resource.type=cloud_run_revision AND resource.labels.service_name=medplat-backend' \
  --limit=50 \
  --project=medplat-458911 \
  --format="table(timestamp,severity,textPayload)"
```

### Check Mounted Routes
```bash
gcloud logging read \
  'resource.type=cloud_run_revision AND textPayload:"Mounted"' \
  --limit=20 \
  --project=medplat-458911 \
  --freshness=10m
```

### Monitor Errors
```bash
gcloud logging read \
  'resource.type=cloud_run_revision AND severity>=ERROR' \
  --limit=20 \
  --project=medplat-458911 \
  --freshness=1h
```

---

## Deployment Procedures

### Standard Deployment (Code Changes)
```bash
# 1. Commit and push changes
git add .
git commit -m "Description of changes"
git push origin main

# 2. Build backend
cd backend
gcloud builds submit --tag=gcr.io/medplat-458911/medplat-backend:latest --project=medplat-458911

# 3. Deploy with secrets
gcloud run deploy medplat-backend \
  --image=gcr.io/medplat-458911/medplat-backend:latest \
  --region=europe-west1 \
  --platform=managed \
  --allow-unauthenticated \
  --set-secrets=OPENAI_API_KEY=medplat-openai-key:latest,FIREBASE_SERVICE_KEY=medplat-firebase-key:latest \
  --project=medplat-458911

# 4. Route traffic (manual step required)
gcloud run services update-traffic medplat-backend \
  --to-latest \
  --region=europe-west1 \
  --project=medplat-458911

# 5. Verify
bash validate_phase3.sh
```

### Rollback Procedure
```bash
# List recent revisions
gcloud run revisions list \
  --service=medplat-backend \
  --region=europe-west1 \
  --project=medplat-458911

# Route to previous revision
gcloud run services update-traffic medplat-backend \
  --to-revisions=medplat-backend-XXXXX-YYY=100 \
  --region=europe-west1 \
  --project=medplat-458911
```

---

## Troubleshooting

### Routes Not Mounting

**Symptoms:** 404 on Phase 3 endpoints

**Check:**
```bash
# Look for mount logs
gcloud logging read \
  'textPayload:"Mounted /api/guidelines"' \
  --limit=5 --freshness=10m --project=medplat-458911
```

**Common Causes:**
1. Files not committed to git (Docker builds from repo)
2. Traffic routed to old revision
3. Router normalization issue (fixed in v3.0.0)

**Fix:**
```bash
# Ensure files committed
git status

# Check traffic routing
gcloud run services describe medplat-backend \
  --region=europe-west1 \
  --format="value(status.traffic)"

# Force new revision
gcloud run deploy medplat-backend --image=... --no-traffic
gcloud run services update-traffic medplat-backend --to-latest
```

### Firestore Connection Issues

**Symptoms:** Warnings in logs about Firestore unavailable

**Check:**
```bash
# Verify secret exists
gcloud secrets versions access latest --secret=medplat-firebase-key --project=medplat-458911

# Check service account permissions
gcloud projects get-iam-policy medplat-458911 \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:*medplat*"
```

### OpenAI Rate Limits

**Symptoms:** gamify-direct returns "Failed to generate valid MCQ structure"

**Check:**
```bash
# Monitor OpenAI errors
gcloud logging read \
  'textPayload:"OpenAI" AND severity>=WARNING' \
  --limit=10 --freshness=1h --project=medplat-458911
```

**Mitigation:**
- Use `gpt-4o-mini` instead of `gpt-4o` (lower rate limits)
- Implement exponential backoff
- Cache common cases in Firestore

---

## Validation Checklist

Run full validation suite:
```bash
bash validate_phase3.sh
```

**Expected Score:** 10/10 ✅

**Manual Checks:**
1. ✅ Guidelines return 4 tiers for Denmark/AF
2. ✅ Adaptive feedback returns 12 topics (8+4)
3. ✅ Progress updates succeed
4. ✅ Weak areas storage works
5. ✅ Persona selector visible in UI
6. ✅ DOI citations present in guidelines
7. ✅ Dynamic topics work (not hardcoded)
8. ✅ Response times <5s for non-generative endpoints
9. ✅ Error handling graceful
10. ✅ Health check responsive

---

## Performance Baselines

### Expected Response Times
- `GET /` — <100ms
- `POST /api/guidelines/fetch` — <1s (static registry), <2s (Firestore)
- `POST /api/adaptive-feedback/*` — <2s
- `POST /api/gamify-direct` — 40-60s (GPT-4o-mini generation)

### Error Rates
- **Target:** <0.1% error rate
- **Acceptable:** <1% error rate
- **Alert Threshold:** >5% error rate

### Traffic Capacity
- Cloud Run autoscaling: 0-100 instances
- Cold start time: ~3s
- Concurrent requests per instance: 80

---

## Firestore Data Management

### User Progress Schema
```
users/{uid}/
  ├── progress/
  │   ├── xp: number
  │   ├── streak: number
  │   ├── tier: "Learner" | "Skilled" | "Expert"
  │   └── last_updated: timestamp
  └── weak_areas/{topic}/
      └── concepts: string[]
```

### Guidelines Schema (Future)
```
guidelines/{region}/{topic}/
  ├── local: array
  ├── national: array
  ├── regional: array
  └── international: array
```

### Backup Procedure
```bash
# Export Firestore data
gcloud firestore export gs://medplat-458911-backup/$(date +%Y%m%d) \
  --project=medplat-458911

# Import if needed
gcloud firestore import gs://medplat-458911-backup/YYYYMMDD \
  --project=medplat-458911
```

---

## CI/CD Enhancement (Phase 4)

### Recommended Workflow
```yaml
# .github/workflows/deploy.yml
- name: Health Check
  run: |
    RESPONSE=$(curl -s ${{ secrets.BACKEND_URL }}/)
    if [[ $(echo $RESPONSE | jq -r '.status') != "MedPlat OK" ]]; then
      exit 1
    fi

- name: Auto-Route Traffic
  run: |
    gcloud run services update-traffic medplat-backend \
      --to-latest \
      --region=europe-west1 \
      --project=${{ secrets.GCP_PROJECT }}
```

---

## Incident Response

### P0 — Backend Down
1. Check Cloud Run status: `gcloud run services describe...`
2. View error logs: `gcloud logging read ... severity>=ERROR`
3. Rollback if needed: `gcloud run services update-traffic...`
4. Notify team via Slack/Discord

### P1 — Phase 3 Endpoints 404
1. Check mount logs: `gcloud logging read ... "Mounted"`
2. Verify traffic routing: `gcloud run services describe...`
3. Test locally: `PORT=8080 node backend/index.js`
4. Redeploy if needed

### P2 — Slow Response Times
1. Check Cloud Run metrics in Console
2. Review OpenAI API usage
3. Check Firestore query performance
4. Consider increasing instance count

---

## Contact Information

**Documentation:**
- Strategic: `docs/COPILOT_GUIDE.md`
- Implementation: `docs/COPILOT_IMPLEMENTATION_GUIDE.md`
- Deployment Report: `PHASE3_DEPLOYMENT_REPORT.md`

**Support Channels:**
- GitHub Issues: https://github.com/Tazaai/medplat/issues
- Project Owner: @Tazaai

**On-Call Rotation:**
- Primary: [To be assigned]
- Secondary: [To be assigned]

---

**Last Updated:** 2025-11-12 11:20 UTC  
**Maintained By:** DevOps / SRE Team  
**Review Frequency:** Monthly
