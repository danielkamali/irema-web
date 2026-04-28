/**
 * Helper functions for user-friendly error messages
 */

/**
 * Convert technical error to user-friendly message with recovery hints
 * @param {Error} error - The error object
 * @param {string} context - What operation was being performed (e.g., 'upload', 'login', 'save')
 * @returns {object} - { message: string, recoveryHint: string }
 */
export function getErrorMessage(error, context = 'operation') {
  const errorStr = error?.message?.toLowerCase() || '';
  const errorCode = error?.code;

  // Network errors
  if (errorStr.includes('network') || errorStr.includes('fetch') || errorStr.includes('internet')) {
    return {
      message: `Connection error while ${context}. Please check your internet connection.`,
      recoveryHint: 'Try refreshing the page or check your WiFi/data connection.'
    };
  }

  // Timeout errors
  if (errorStr.includes('timeout') || errorStr.includes('took too long')) {
    return {
      message: `${context} took too long. Please try again.`,
      recoveryHint: 'If the problem persists, try again with less data or contact support.'
    };
  }

  // Firebase auth errors
  if (errorCode?.includes('auth') || errorStr.includes('authentication') || errorStr.includes('unauthorized')) {
    return {
      message: 'Your session has expired. Please log in again.',
      recoveryHint: 'Refresh the page and log in with your credentials.'
    };
  }

  // Firebase permission errors
  if (errorCode === 'permission-denied' || errorStr.includes('permission denied') || errorStr.includes('forbidden')) {
    return {
      message: 'You do not have permission to perform this action.',
      recoveryHint: 'If you believe this is an error, contact support@irema.rw'
    };
  }

  // File size errors
  if (errorStr.includes('file') && (errorStr.includes('too large') || errorStr.includes('size'))) {
    return {
      message: 'File is too large. Maximum size is 5 MB.',
      recoveryHint: 'Try compressing the file or use a smaller image.'
    };
  }

  // Validation errors
  if (errorStr.includes('validation') || errorStr.includes('invalid')) {
    return {
      message: 'Some information is invalid or incomplete.',
      recoveryHint: 'Check the form for errors and make sure all required fields are filled.'
    };
  }

  // Duplicate entry errors
  if (errorStr.includes('duplicate') || errorStr.includes('already exists') || errorCode === 'already-exists') {
    return {
      message: 'This entry already exists.',
      recoveryHint: 'Please use a different value or check if you meant to update an existing entry.'
    };
  }

  // Server errors
  if (errorStr.includes('500') || errorStr.includes('internal') || errorStr.includes('server')) {
    return {
      message: 'Server error. Please try again later.',
      recoveryHint: 'If the problem continues, contact support@irema.rw'
    };
  }

  // Default error
  return {
    message: `Failed to ${context}. Please try again.`,
    recoveryHint: 'If the problem persists, try refreshing the page or contact support@irema.rw'
  };
}

/**
 * Get helpful message for specific Firebase error codes
 * @param {string} code - Firebase error code
 * @returns {string} - User-friendly error message
 */
export function getFirebaseErrorMessage(code) {
  const errorMap = {
    'auth/user-not-found': 'No account found with this email address.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password is too weak. Use at least 8 characters with uppercase, lowercase, numbers, and special characters.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/too-many-requests': 'Too many login attempts. Please try again later.',
    'auth/user-disabled': 'This account has been disabled. Contact support for help.',
    'permission-denied': 'You do not have permission to perform this action.',
    'not-found': 'The requested item was not found.',
    'already-exists': 'This item already exists.',
    'failed-precondition': 'The operation cannot be completed in the current state.',
    'unauthenticated': 'Please log in to continue.',
    'resource-exhausted': 'Request limit exceeded. Please try again later.'
  };

  return errorMap[code] || 'An error occurred. Please try again.';
}
