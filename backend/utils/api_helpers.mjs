// backend/utils/api_helpers.mjs - Timeout and retry utilities for stability

/**
 * Wraps OpenAI API calls with timeout and retry logic
 * @param {Function} apiCall - The API call function
 * @param {number} timeout - Timeout in milliseconds (default 8000)
 * @param {number} maxRetries - Maximum retry attempts (default 1)
 * @returns {Promise} - The API result with timeout and retry protection
 */
// Phase 7: Increased timeout to 120 seconds for enhanced prompts
export async function withTimeoutAndRetry(apiCall, timeout = 120000, maxRetries = 1) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('API_TIMEOUT')), timeout)
      );
      
      // Execute API call with timeout using Promise.race
      // Note: OpenAI SDK doesn't support AbortController signal parameter,
      // so we rely on Promise.race for timeout handling
      const result = await Promise.race([
        typeof apiCall === 'function' ? apiCall() : apiCall,
        timeoutPromise
      ]);
      
      return result;
      
    } catch (error) {
      lastError = error;
      console.warn(`API call attempt ${attempt + 1} failed:`, error.message);
      
      // Don't retry on certain errors
      if (error.name === 'AbortError' || error.message === 'API_TIMEOUT') {
        if (attempt === maxRetries) break;
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // exponential backoff
      } else {
        break; // Don't retry on non-timeout errors
      }
    }
  }
  
  throw lastError || new Error('API call failed after retries');
}

/**
 * Ensures API route always returns proper JSON response
 * @param {Function} handler - The route handler function  
 * @returns {Function} - Wrapped handler with error safety
 */
export function safeRouteHandler(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error('Route error:', error);
      
      // Always return JSON, never let route crash
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: error.message || 'Internal server error',
          timestamp: new Date().toISOString()
        });
      }
    }
  };
}

/**
 * Creates a fallback response for when APIs fail
 * @param {string} type - Type of fallback (case, mcq, ecg, etc.)
 * @param {Object} params - Parameters for customizing fallback
 * @returns {Object} - Fallback data structure
 */
export function createFallbackResponse(type, params = {}) {
  const timestamp = new Date().toISOString();
  
  switch (type) {
    case 'case':
      return {
        ok: true,
        case: {
          meta: {
            topic: params.topic || 'General Medicine',
            language: params.language || 'en',
            region: params.region || 'global',
            model: 'fallback',
            generation_type: 'fallback_case'
          },
          presentation: `Clinical case study: ${params.topic || 'General Medicine'}`,
          diagnosis: params.topic || 'General Medicine',
          history: 'Fallback case - AI generation temporarily unavailable',
          examination: 'Normal examination findings',
          investigations: 'Standard investigations pending',
          management: 'Standard management protocol',
          timestamp
        }
      };
      
    case 'mcq':
      return {
        ok: true,
        mcqs: [
          {
            question: `Which is the most appropriate initial approach for ${params.topic || 'this condition'}?`,
            options: [
              'Immediate specialist referral',
              'Conservative management and monitoring', 
              'Emergency intervention',
              'Further investigations required'
            ],
            correct: 1,
            explanation: 'Conservative management is often the appropriate first-line approach in stable presentations.',
            category: params.category || 'general'
          }
        ],
        fallback: true,
        timestamp
      };
      
    case 'ecg':
      return {
        success: true,
        sessionId: `fallback_${Date.now()}`,
        cases: [
          {
            id: 'fallback_ecg_1',
            ecgImageUrl: '/api/ecg/images/placeholder/fallback',
            stem: 'Analyze this ECG pattern and identify the primary finding.',
            options: ['Normal sinus rhythm', 'Atrial fibrillation', 'Ventricular tachycardia', 'Heart block'],
            correct: 0,
            explanation: 'This represents a normal sinus rhythm with regular P waves and QRS complexes.',
            category: 'arrhythmias',
            difficulty: 'beginner'
          }
        ],
        totalCases: 1,
        fallback: true,
        timestamp
      };
      
    default:
      return {
        success: false,
        error: 'Unknown fallback type',
        fallback: true,
        timestamp
      };
  }
}