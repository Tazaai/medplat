/**
 * Safe fetch wrapper with timeout and retry logic for Phase 7
 * Handles Cloud Run cold starts and longer generation times
 */

const DEFAULT_TIMEOUT = 90000; // 90 seconds for Phase 7 enhanced prompts
const RETRY_DELAY = 500; // 500ms delay before retry
const MAX_RETRIES = 1; // Retry once on abort

/**
 * Safe fetch with timeout and automatic retry on abort
 * @param {string} url - The URL to fetch
 * @param {RequestInit} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds (default: 90000)
 * @param {number} retries - Number of retries on abort (default: 1)
 * @returns {Promise<Response>}
 */
export async function safeFetch(url, options = {}, timeout = DEFAULT_TIMEOUT, retries = MAX_RETRIES) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn(`⏱️ Request timeout after ${timeout}ms, aborting...`);
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Retry on AbortError if retries remaining
    if (error.name === 'AbortError' && retries > 0) {
      console.log(`🔄 Retrying request after abort (${retries} retries remaining)...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return safeFetch(url, options, timeout, retries - 1);
    }
    
    // Re-throw if no retries left or different error
    throw error;
  }
}

/**
 * Safe fetch specifically for quiz generation (longer timeout)
 * @param {string} url - The URL to fetch
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>}
 */
export async function safeFetchQuiz(url, options = {}) {
  // /api/case/init can take 30-300s, allow up to 6 minutes (360 seconds)
  const timeout = url.includes('/api/case/init') ? 360000 : 180000; // 6 minutes for init, 3 minutes for others
  return safeFetch(url, options, timeout, 1);
}

/**
 * Safe fetch for normal API calls (shorter timeout)
 * @param {string} url - The URL to fetch
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>}
 */
export async function safeFetchAPI(url, options = {}) {
  return safeFetch(url, options, 30000, 0); // 30 seconds, no retry
}

