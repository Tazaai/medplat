# External Panel Review for Gamification

## Purpose

The **External Panel API** reviews generated MCQs (multiple-choice questions) to assess quality and build training data for future improvements.

**Key distinction:**
- **Internal Panel** = Reviews *cases* during generation (keeps unchanged)
- **External Panel** = Reviews *MCQs* after generation (new for gamification)

## How It Works

```
User clicks "Generate Case" with Gamify=true
  ↓
1. Generate clinical case (GPT-4o-mini)
  ↓
2. Internal panel reviews case (unchanged)
  ↓
3. Generate 12 MCQs (/api/gamify)
  ↓
4. Return MCQs to user immediately ✅
  ↓
5. **BACKGROUND**: External panel reviews MCQs
     - Scores difficulty (1-5)
     - Scores distractor quality (1-5)
     - Scores educational value (1-5)
     - Provides suggestions
  ↓
6. Store review data in logs (future: Firestore)
```

## API Endpoint

**POST `/api/external-panel/review-mcqs`**

Request:
```json
{
  "caseContext": { ...case data... },
  "mcqs": [ ...12 questions... ],
  "topic": "STEMI",
  "level": "intermediate"
}
```

Response:
```json
{
  "ok": true,
  "reviews": [
    {
      "question_id": 1,
      "difficulty_score": 4,
      "distractor_quality": 5,
      "educational_value": 5,
      "suggestions": "Excellent question testing critical management",
      "overall_assessment": "High-quality question for board exam prep"
    },
    ...
  ],
  "meta": {
    "average_difficulty": "3.8",
    "average_distractor_quality": "4.2",
    "average_educational_value": "4.5"
  }
}
```

## Performance

- **User Experience**: NOT affected (async background process)
- **Cost**: ~$0.001 per review (GPT-4o-mini)
- **Duration**: ~3-5 seconds (invisible to user)

## Future Uses

1. **Training Data**: Build dataset of reviewed MCQs for fine-tuning
2. **Quality Gate**: Eventually filter low-scoring questions before showing
3. **Adaptive Difficulty**: Adjust question difficulty based on user performance
4. **Analytics Dashboard**: Show MCQ quality trends over time

## Toggling On/Off

External panel runs automatically for all gamified cases. To disable:

```javascript
// In gamify_api.mjs, comment out the setImmediate() block
// Starting at line ~235
```

## Files

- `backend/routes/external_panel_api.mjs` - Review endpoint
- `backend/routes/gamify_api.mjs` - Calls external panel async
- `backend/index.js` - Mounts `/api/external-panel`

---
**Last updated**: November 10, 2025
