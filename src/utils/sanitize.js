/**
 * Input sanitization utilities to prevent XSS attacks
 */

/**
 * Sanitize text input by removing HTML tags and dangerous characters
 * @param {string} input - Raw user input
 * @returns {string} - Sanitized input safe for display
 */
export function sanitizeText(input) {
  if (typeof input !== 'string') return '';

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .substring(0, 5000); // Limit length to prevent abuse
}

/**
 * Sanitize email input
 * @param {string} email - Email to sanitize
 * @returns {string} - Sanitized email
 */
export function sanitizeEmail(email) {
  if (typeof email !== 'string') return '';

  return email
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9@._+-]/g, '') // Remove invalid email characters
    .substring(0, 254); // Email max length
}

/**
 * Sanitize URL to prevent open redirects
 * @param {string} url - URL to sanitize
 * @returns {string} - Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url) {
  if (typeof url !== 'string') return '';

  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return url;
  } catch {
    return '';
  }
}

/**
 * Validate and sanitize search input
 * @param {string} input - Search query
 * @returns {string} - Validated search query
 */
export function sanitizeSearch(input) {
  if (typeof input !== 'string') return '';

  return input
    .trim()
    .replace(/[<>]/g, '')
    .substring(0, 100); // Limit search length
}

/**
 * Sanitize database field names to prevent injection
 * @param {string} fieldName - Field name
 * @returns {string} - Valid field name or empty string
 */
export function sanitizeFieldName(fieldName) {
  if (typeof fieldName !== 'string') return '';

  // Only allow alphanumeric and underscore
  return fieldName.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 100);
}

/**
 * Check if input contains potentially dangerous content
 * @param {string} input - Input to check
 * @returns {boolean} - True if input contains dangerous content
 */
export function isDangerousContent(input) {
  if (typeof input !== 'string') return false;

  const dangerous = /<script|javascript:|on\w+\s*=|<iframe|<object|<embed/gi;
  return dangerous.test(input);
}
