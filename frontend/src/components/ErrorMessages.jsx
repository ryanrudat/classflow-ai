import React from 'react'

/**
 * Error message component with different severity levels
 * @param {string} type - 'error' | 'warning' | 'info'
 * @param {string} title - Error title
 * @param {string} message - Error message
 * @param {string} action - Optional action text (for actionable errors)
 * @param {function} onAction - Optional action handler
 * @param {function} onDismiss - Optional dismiss handler
 */
export function ErrorMessage({
  type = 'error',
  title,
  message,
  action,
  onAction,
  onDismiss,
  children
}) {
  const styles = {
    error: {
      container: 'bg-red-50 border-red-200 text-red-800',
      icon: '❌',
      iconBg: 'bg-red-100',
      button: 'bg-red-600 hover:bg-red-700 text-white'
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      icon: '⚠️',
      iconBg: 'bg-yellow-100',
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white'
    },
    info: {
      container: 'bg-blue-50 border-blue-200 text-blue-800',
      icon: 'ℹ️',
      iconBg: 'bg-blue-100',
      button: 'bg-blue-600 hover:bg-blue-700 text-white'
    }
  }

  const style = styles[type] || styles.error

  return (
    <div className={`rounded-lg border-2 p-4 ${style.container}`}>
      <div className="flex items-start gap-3">
        <div className={`${style.iconBg} rounded-full p-2 flex-shrink-0`}>
          <span className="text-xl">{style.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="font-semibold text-base mb-1">{title}</h3>
          )}
          <p className="text-sm">{message}</p>
          {children && (
            <div className="mt-2 text-sm">
              {children}
            </div>
          )}
          {(action && onAction) && (
            <button
              onClick={onAction}
              className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${style.button}`}
            >
              {action}
            </button>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * User-friendly error messages for common scenarios
 */
export const ErrorMessages = {
  // Network errors
  NETWORK_ERROR: {
    title: 'Connection Problem',
    message: 'Unable to connect to the server. Please check your internet connection and try again.',
    action: 'Retry',
    type: 'error'
  },

  // Authentication errors
  LOGIN_FAILED: {
    title: 'Login Failed',
    message: 'The email or password you entered is incorrect. Please try again.',
    type: 'error'
  },
  SESSION_EXPIRED: {
    title: 'Session Expired',
    message: 'Your session has expired. Please log in again to continue.',
    action: 'Log In',
    type: 'warning'
  },

  // Session errors
  SESSION_NOT_FOUND: {
    title: 'Session Not Found',
    message: 'The session code you entered doesn\'t exist. Please check the code and try again.',
    action: 'Try Again',
    type: 'error'
  },
  SESSION_ENDED: {
    title: 'Session Has Ended',
    message: 'This session has been ended by the teacher. You can no longer join or submit responses.',
    type: 'info'
  },

  // Content generation errors
  AI_GENERATION_FAILED: {
    title: 'Content Generation Failed',
    message: 'We couldn\'t generate the content. This might be due to high demand or an issue with the AI service.',
    action: 'Try Again',
    type: 'error'
  },
  AI_RATE_LIMIT: {
    title: 'Too Many Requests',
    message: 'You\'ve reached the limit for AI generation. Please wait a few minutes before trying again.',
    type: 'warning'
  },

  // File upload errors
  FILE_TOO_LARGE: {
    title: 'File Too Large',
    message: 'The file you\'re trying to upload is too large. Please choose a file smaller than 5MB.',
    type: 'error'
  },
  INVALID_FILE_TYPE: {
    title: 'Invalid File Type',
    message: 'This file type is not supported. Please upload an image file (PNG, JPG, or GIF).',
    type: 'error'
  },

  // Form validation errors
  VALIDATION_ERROR: {
    title: 'Please Check Your Input',
    message: 'Some required fields are missing or contain invalid data. Please review and try again.',
    type: 'warning'
  },

  // Permission errors
  UNAUTHORIZED: {
    title: 'Access Denied',
    message: 'You don\'t have permission to perform this action.',
    type: 'error'
  },

  // Generic errors
  UNKNOWN_ERROR: {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
    action: 'Try Again',
    type: 'error'
  }
}

/**
 * Helper function to get user-friendly error message from error object
 */
export function getErrorMessage(error) {
  // Handle Axios errors
  if (error.response) {
    const status = error.response.status
    const message = error.response.data?.message

    // Map HTTP status codes to friendly messages
    switch (status) {
      case 400:
        return { ...ErrorMessages.VALIDATION_ERROR, message: message || ErrorMessages.VALIDATION_ERROR.message }
      case 401:
        return { ...ErrorMessages.SESSION_EXPIRED, message: message || ErrorMessages.SESSION_EXPIRED.message }
      case 403:
        return ErrorMessages.UNAUTHORIZED
      case 404:
        return { ...ErrorMessages.SESSION_NOT_FOUND, message: message || 'The requested resource was not found.' }
      case 429:
        return ErrorMessages.AI_RATE_LIMIT
      case 500:
      case 502:
      case 503:
        return { ...ErrorMessages.UNKNOWN_ERROR, message: 'The server is experiencing issues. Please try again later.' }
      default:
        return { ...ErrorMessages.UNKNOWN_ERROR, message: message || ErrorMessages.UNKNOWN_ERROR.message }
    }
  }

  // Handle network errors
  if (error.message === 'Network Error' || !error.response) {
    return ErrorMessages.NETWORK_ERROR
  }

  // Handle custom error messages
  if (error.message) {
    return {
      title: 'Error',
      message: error.message,
      type: 'error'
    }
  }

  return ErrorMessages.UNKNOWN_ERROR
}

/**
 * Inline form field error
 */
export function FieldError({ message }) {
  if (!message) return null

  return (
    <div className="flex items-center gap-2 mt-1 text-red-600 text-sm">
      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <span>{message}</span>
    </div>
  )
}

/**
 * Success message component
 */
export function SuccessMessage({ title, message, onDismiss }) {
  return (
    <div className="rounded-lg border-2 bg-green-50 border-green-200 text-green-800 p-4">
      <div className="flex items-start gap-3">
        <div className="bg-green-100 rounded-full p-2 flex-shrink-0">
          <span className="text-xl">✅</span>
        </div>
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="font-semibold text-base mb-1">{title}</h3>
          )}
          <p className="text-sm">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
