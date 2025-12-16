# Multi-Step Case API Endpoint Testing

## Overview
Comprehensive automated testing for all routes in `case_api.mjs`.

## Test Script
`test_case_api.mjs` - Tests all endpoints via HTTP calls

## Running Tests

### Local Testing
```bash
cd backend
API_BASE=http://localhost:8080 node test_case_api.mjs
```

### Deployed Backend Testing
```bash
cd backend
API_BASE=https://medplat-backend-139218747785.europe-west1.run.app node test_case_api.mjs
```

## Tests Performed

1. **POST /api/case/init**
   - Returns valid `caseId`
   - Returns valid context (meta, chief_complaint, initial_context)
   - No undefined values in response

2. **POST /api/case/history**
   - Merges history into Firestore under same `caseId`
   - Preserves existing fields
   - No undefined values

3. **POST /api/case/exam**
   - Merges physical_exam correctly
   - Preserves history field
   - No undefined values

4. **POST /api/case/paraclinical**
   - Merges paraclinical (labs + imaging) correctly
   - Preserves previous fields (history, exam)
   - No undefined values

5. **POST /api/case/expand/pathophysiology**
   - Merges pathophysiology correctly
   - Preserves all previous fields
   - No undefined values

6. **POST /api/case/expand/management**
   - Merges management correctly
   - Does not overwrite unrelated fields
   - No undefined values

7. **POST /api/case/expand/question**
   - Returns valid JSON with answer
   - Does NOT overwrite unrelated fields in case
   - No undefined values

8. **GET /api/case/:caseId**
   - Returns complete case with all fields
   - No undefined values

9. **Error Handling**
   - Missing caseId returns error
   - Invalid caseId returns error

## Expected Output
- ✅ Passed: X
- ❌ Failed: Y
- 📈 Success Rate: Z%
- Detailed error messages for any failures

## Notes
- All tests verify Firestore merge behavior
- All tests check for undefined values
- All tests verify field preservation
- Tests stop on first critical failure (missing caseId)
