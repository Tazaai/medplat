// backend/utils/validation.mjs
// Input validation utilities for API routes

/**
 * Validate required fields in request body
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {string[]} requiredFields - Array of required field names
 * @returns {Object|null} - Error response object if validation fails, null if valid
 */
export function validateRequired(req, res, requiredFields) {
  const missing = requiredFields.filter(field => {
    const value = req.body[field];
    return value === undefined || value === null || value === '';
  });
  
  if (missing.length > 0) {
    return res.status(400).json({ 
      ok: false, 
      error: `Missing required fields: ${missing.join(', ')}`,
      missing_fields: missing
    });
  }
  
  return null;
}

/**
 * Validate field types
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Object} fieldTypes - Object mapping field names to expected types
 * @returns {Object|null} - Error response object if validation fails, null if valid
 */
export function validateTypes(req, res, fieldTypes) {
  const errors = [];
  
  for (const [field, expectedType] of Object.entries(fieldTypes)) {
    if (req.body[field] !== undefined) {
      const actualType = typeof req.body[field];
      if (actualType !== expectedType) {
        errors.push(`${field} must be ${expectedType}, got ${actualType}`);
      }
    }
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      ok: false,
      error: 'Type validation failed',
      errors
    });
  }
  
  return null;
}

/**
 * Validate field values against allowed values
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Object} allowedValues - Object mapping field names to arrays of allowed values
 * @returns {Object|null} - Error response object if validation fails, null if valid
 */
export function validateAllowedValues(req, res, allowedValues) {
  const errors = [];
  
  for (const [field, allowed] of Object.entries(allowedValues)) {
    if (req.body[field] !== undefined && !allowed.includes(req.body[field])) {
      errors.push(`${field} must be one of: ${allowed.join(', ')}`);
    }
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      ok: false,
      error: 'Value validation failed',
      errors
    });
  }
  
  return null;
}

/**
 * Combined validation helper
 * @param {Object} options - Validation options
 * @param {string[]} options.required - Required fields
 * @param {Object} options.types - Field type constraints
 * @param {Object} options.allowedValues - Allowed value constraints
 */
export function validateRequest(req, res, options = {}) {
  const { required = [], types = {}, allowedValues = {} } = options;
  
  // Check required fields
  if (required.length > 0) {
    const requiredError = validateRequired(req, res, required);
    if (requiredError) return requiredError;
  }
  
  // Check types
  if (Object.keys(types).length > 0) {
    const typeError = validateTypes(req, res, types);
    if (typeError) return typeError;
  }
  
  // Check allowed values
  if (Object.keys(allowedValues).length > 0) {
    const valueError = validateAllowedValues(req, res, allowedValues);
    if (valueError) return valueError;
  }
  
  return null; // All validations passed
}

