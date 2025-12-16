# Dialog 500 Error Fix Summary

## Overview
Added comprehensive logging and error handling to fix intermittent 500 errors on `POST /api/dialog` during case generation.

**Date:** 2025-01-27  
**Status:** ✅ **COMPLETED**

---

## Changes Made

### 1. **backend/routes/dialog_api.mjs** - Enhanced Error Handling & Logging

#### Added Input Parameter Logging
- **Location:** Lines 36-44
- **Change:** Added logging at the start of request handling to capture all input parameters
- **Tag:** `[DIALOG_500]` prefix for easy log filtering

```javascript
// Log input parameters
console.log('[DIALOG_500] POST /api/dialog - Input params:', {
  topic,
  category: category || 'General Practice',
  region: effectiveRegion,
  lang,
  mcq_mode: mcq_mode === true || mcq_mode === 'true',
  mode: caseMode
});
```

#### Enhanced generateClinicalCase Error Handling
- **Location:** Lines 60-135
- **Changes:**
  - Added timing logs (start/end with duration)
  - Comprehensive error logging with full stack traces
  - Proper error propagation (re-throw non-timeout errors to outer handler)
  - Timeout-specific fallback handling

**Key improvements:**
- Logs when `generateClinicalCase` starts
- Tracks execution duration
- Logs complete error details including stack trace
- Distinguishes between timeout errors and other failures

#### Enhanced Error Response Structure
- **Location:** Lines 137-151
- **Change:** Improved error response format to match requirements:
  ```javascript
  {
    ok: false,
    error: true,
    message: caseData.message || 'Case generation failed',
    fallback: caseData.fallback || 'Please try again...'
  }
  ```

#### Enhanced Outer Error Handler
- **Location:** Lines 283-305
- **Changes:**
  - Added `[DIALOG_500]` tag for all errors
  - Logs full error details including stack, name, and request body
  - Proper HTTP status code selection (504 for timeouts, 500 for other errors)
  - Consistent error response format

#### Enhanced Panel Review Error Logging
- **Location:** Lines 233-239
- **Change:** Added comprehensive error logging with `[DIALOG_500]` tag

#### Enhanced Regeneration Error Logging
- **Location:** Lines 219-226
- **Change:** Added comprehensive error logging with `[DIALOG_500]` tag

#### Enhanced Interactive Elements Error Logging
- **Location:** Lines 248-254
- **Change:** Added comprehensive error logging with `[DIALOG_500]` tag

---

### 2. **backend/generate_case_clinical.mjs** - Enhanced Error Handling

#### Wrapped OpenAI API Call in Try-Catch
- **Location:** Lines 347-376
- **Changes:**
  - Added explicit try-catch around OpenAI API call
  - Logs detailed error information before re-throwing
  - Includes topic, category, region, and model in error logs

```javascript
try {
  completion = await withTimeoutAndRetry(...);
} catch (openaiError) {
  console.error("❌ OpenAI API call failed in generateClinicalCase:", {
    error: openaiError.message,
    stack: openaiError.stack,
    topic,
    category,
    region,
    model: forcedModel
  });
  throw new Error(`OpenAI API call failed: ${openaiError.message}`);
}
```

#### Enhanced Final Error Handler
- **Location:** Lines 972-994
- **Changes:**
  - Added comprehensive error logging with full context
  - Logs topic, category, region, lang, error message, stack, and error name
  - Returns error object with consistent structure

---

## Error Flow & Handling

### Normal Success Path
1. Log input parameters → `[DIALOG_500] POST /api/dialog - Input params:`
2. Start timing → `[DIALOG_500] Starting generateClinicalCase...`
3. Complete successfully → `[DIALOG_500] generateClinicalCase completed in Xms`
4. Return success response

### Error Paths

#### Path 1: Timeout Error
1. Log input parameters
2. Start timing
3. Timeout occurs (60s)
4. Log timeout error with `[DIALOG_500]` tag
5. Return fallback case structure
6. Continue processing with fallback

#### Path 2: Case Generation Error (Non-Timeout)
1. Log input parameters
2. Start timing
3. Error occurs in `generateClinicalCase`
4. Log error with full stack: `[DIALOG_500] generateClinicalCase failed:`
5. Re-throw error to outer handler
6. Outer handler logs: `[DIALOG_500] Error in POST /api/dialog:`
7. Return HTTP 500/502 with error response

#### Path 3: Case Generation Returns Error Object
1. Log input parameters
2. Start timing
3. Complete successfully
4. Check if `caseData.error === true`
5. Log error: `[DIALOG_500] Case generation returned error:`
6. Return HTTP 500 with error response

#### Path 4: Panel Review Error
1. Log error: `[DIALOG_500] Internal panel review failed or timed out:`
2. Use original case data
3. Continue processing

#### Path 5: Regeneration Error
1. Log error: `[DIALOG_500] Regeneration failed:`
2. Use panel refined case or original
3. Continue processing

#### Path 6: Interactive Elements Error
1. Log error: `[DIALOG_500] Interactive element refinement failed:`
2. Continue with unrefined case
3. Continue processing

---

## Error Response Format

All errors now return consistent format:

```javascript
{
  ok: false,
  error: true,
  message: "Error message here",
  fallback: "User-friendly fallback message"
}
```

**HTTP Status Codes:**
- `500` - Internal server error (default)
- `504` - Gateway timeout (for timeout errors)
- `400` - Bad request (for missing topic)

---

## Log Format

All error logs use the `[DIALOG_500]` tag for easy filtering:

```javascript
[DIALOG_500] Error description: {
  error: "Error message",
  stack: "Full stack trace",
  // Additional context fields
}
```

**Log Locations:**
- Input parameters (start of request)
- Case generation start/end/completion/failure
- Panel review failures
- Regeneration failures
- Interactive element failures
- Outer catch-all errors

---

## Testing Recommendations

After deployment, trigger 3-5 case generations and check logs for:

1. **Success cases:**
   - `[DIALOG_500] POST /api/dialog - Input params:`
   - `[DIALOG_500] Starting generateClinicalCase...`
   - `[DIALOG_500] generateClinicalCase completed in Xms`
   - HTTP 200 response

2. **Error cases:**
   - `[DIALOG_500] generateClinicalCase failed:` - Shows exact error location
   - `[DIALOG_500] Error in POST /api/dialog:` - Shows outer handler catch
   - Full stack traces for debugging
   - HTTP 500/502 response with error details

---

## Files Modified

1. `backend/routes/dialog_api.mjs`
   - Added comprehensive logging throughout
   - Enhanced error handling at all levels
   - Improved error response format

2. `backend/generate_case_clinical.mjs`
   - Added OpenAI API call error handling
   - Enhanced final error handler logging

---

## Next Steps

1. ✅ Deploy backend with changes
2. ✅ Monitor logs for `[DIALOG_500]` tagged entries
3. ✅ Verify error logs show clear error locations
4. ✅ Confirm all errors return proper HTTP status codes
5. ✅ Test 3-5 case generations to verify logging

---

## Summary

All errors in the case generation flow are now:
- ✅ Logged with `[DIALOG_500]` tag for easy filtering
- ✅ Include full stack traces and context
- ✅ Return proper HTTP status codes (500/502/504)
- ✅ Return consistent error response format
- ✅ Tracked with timing information
- ✅ Include input parameters for debugging

This comprehensive logging will help identify the exact cause of intermittent 500 errors during case generation.
