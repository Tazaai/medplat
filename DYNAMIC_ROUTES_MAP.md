# ✅ MedPlat Dynamic-Only Routes Map

## Overview

MedPlat is now **100% dynamic and AI-driven**. All endpoints use Firestore for data and AI for generation. No static endpoints or data files remain.

## Dynamic Endpoints

### Topics & Categories (Firestore-Driven)

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| POST | `/api/topics2` | Get topics from Firestore | `{ category?, language?, area? }` | `{ ok: true, topics: [...] }` |
| POST | `/api/topics2/categories` | Get all categories from Firestore | `{}` | `{ ok: true, categories: [...] }` |
| POST | `/api/topics2/search` | Search topics by category | `{ category: string }` | `{ ok: true, topics: [...] }` |
| POST | `/api/topics2/custom-search` | Fuzzy search with suggestions | `{ query: string, category?: string }` | `{ ok: true, matches: [...], suggestion?: {...} }` |

### AI Case Generation

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| POST | `/api/dialog` | Generate clinical case | `{ message: string, topic?: string }` | `{ ok: true, case: {...} }` |

### Gamification

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| POST | `/api/gamify` | Generate MCQs | `{ topic: string, difficulty?: string }` | `{ ok: true, questions: [...] }` |

### AI Mentor

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| GET | `/api/mentor/health` | Mentor service health | - | `{ status: 'healthy' }` |
| POST | `/api/mentor` | Mentor interaction | `{ message: string, context?: {...} }` | `{ ok: true, response: string }` |

### Expert Panel

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| GET | `/api/panel/health` | Panel service health | - | `{ status: 'healthy' }` |
| POST | `/api/panel` | Panel review | `{ case: {...}, expert?: string }` | `{ ok: true, review: {...} }` |

### Internal Panel

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| POST | `/api/internal-panel` | Auto-review before user sees case | `{ case: {...} }` | `{ ok: true, review: {...} }` |

### AI Reasoning Engine

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| GET | `/api/reasoning/health` | Reasoning service health | - | `{ status: 'healthy' }` |
| POST | `/api/reasoning/differential` | Generate differential diagnosis | `{ case_data: {...}, student_differentials: [...] }` | `{ ok: true, expert_differential: {...} }` |

### Translation

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| POST | `/api/translation` | Translate medical content | `{ text: string, target_lang: string }` | `{ ok: true, translated: string }` |

### Voice

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| POST | `/api/voice/synthesize` | Text-to-speech | `{ text: string, language: string }` | `{ ok: true, audio: string }` |

### Analytics Dashboard

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| POST | `/api/analytics_dashboard/overview` | Get analytics overview | `{ range?: string }` | `{ ok: true, data: {...} }` |

### Quick Reference

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| GET | `/api/quickref` | Quick reference guide | - | `{ ok: true, content: {...} }` |

### Comments

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| POST | `/api/comment` | Add comment | `{ text: string, case_id?: string }` | `{ ok: true, comment: {...} }` |

## Removed Legacy Endpoints

The following static endpoints have been **removed**:

- ❌ `GET /api/topics` - Legacy static topics endpoint
- ❌ `GET /api/topics/categories` - Legacy static categories endpoint
- ❌ Any static JSON file loading
- ❌ Any preloaded topic lists

## Health Checks

All dynamic services expose health endpoints:

- `GET /api/mentor/health`
- `GET /api/panel/health`
- `GET /api/reasoning/health`
- `GET /health` - Main backend health
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

## Validation

Run route validation after deployment:

```bash
BACKEND_URL=https://medplat-backend-139218747785.europe-west1.run.app node scripts/validate_dynamic_routes.mjs
```

This will:
- ✅ Test all required dynamic routes
- ✅ Verify legacy routes are removed
- ✅ Fail if any static endpoints are found

## Notes

- **All data is Firestore-driven** - No static JSON files
- **All endpoints are POST-based** (except health checks)
- **Categories are dynamic** - Loaded from Firestore topics2 collection
- **No fallback data** - System fails gracefully if Firestore is unavailable

