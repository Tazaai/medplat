// backend/utils/errorHandler.mjs
// Standardized error response utilities

/**
 * Standard error response format
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {Object} details - Additional error details
 * @param {Error} error - Original error object (for development)
 */
export function sendError(res, statusCode, message, details = {}, error = null) {
  const response = {
    ok: false,
    error: message,
    ...details
  };
  
  // Include stack trace in development
  if (process.env.NODE_ENV === 'development' && error && error.stack) {
    response.stack = error.stack.split('\n').slice(0, 5);
  }
  
  return res.status(statusCode).json(response);
}

/**
 * Standard success response format
 * @param {Object} res - Express response object
 * @param {Object} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 */
export function sendSuccess(res, data = {}, statusCode = 200) {
  return res.status(statusCode).json({
    ok: true,
    ...data
  });
}

/**
 * Handle async route errors
 * @param {Function} fn - Async route handler function
 * @returns {Function} - Express route handler with error handling
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      console.error(`[${new Date().toISOString()}] [ERROR] ${req.method} ${req.path} - ${error.message}`);
      sendError(res, 500, error.message || 'Internal server error', {}, error);
    });
  };
}

/**
 * Log request with structured format
 * @param {Object} req - Express request object
 * @param {string} message - Log message
 * @param {string} level - Log level (info, warn, error)
 */
export function logRequest(req, message, level = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${req.method}] ${req.path} - ${message}`;
  
  if (level === 'error') {
    console.error(logMessage);
  } else if (level === 'warn') {
    console.warn(logMessage);
  } else {
    console.log(logMessage);
  }
}

