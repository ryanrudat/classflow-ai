import { useState, useEffect, useRef } from 'react'

/**
 * UnlockActivityModal Component
 * Allows teachers to unlock completed activities for student retakes
 * Requires a reason for the unlock
 *
 * Accessibility features:
 * - Keyboard navigation (Escape to close)
 * - Click outside to close
 * - Focus trap
 * - ARIA attributes
 * - Auto-focus on textarea
 */
export default function UnlockActivityModal({ studentName, activityName, onConfirm, onCancel, loading }) {
  const [reason, setReason] = useState('')
  const dialogRef = useRef(null)
  const textareaRef = useRef(null)

  // Focus textarea when modal opens
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !loading) {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onCancel, loading])

  // Handle click outside
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !loading) {
      onCancel()
    }
  }

  // Handle focus trap
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const focusableElements = dialog.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleTab = (e) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    dialog.addEventListener('keydown', handleTab)
    return () => dialog.removeEventListener('keydown', handleTab)
  }, [loading])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!loading && reason.trim()) {
      onConfirm(reason)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlock-dialog-title"
      aria-describedby="unlock-dialog-description"
    >
      <div ref={dialogRef} className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 id="unlock-dialog-title" className="text-2xl font-bold text-gray-900">
            Unlock Activity
          </h3>
          <button
            onClick={onCancel}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p id="unlock-dialog-description" className="text-gray-600 mb-4">
          You are about to unlock "<strong>{activityName}</strong>" for <strong>{studentName}</strong>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="unlock-reason" className="block text-sm font-medium text-gray-700 mb-2">
              Reason for unlock <span className="text-red-500" aria-label="required">*</span>
            </label>
            <textarea
              id="unlock-reason"
              ref={textareaRef}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none outline-none transition-all"
              placeholder="e.g., Student request for improvement, Technical issue during first attempt, etc."
              rows={3}
              required
              disabled={loading}
              aria-required="true"
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3" role="alert">
            <div className="flex gap-2">
              <span className="text-amber-600 flex-shrink-0" aria-hidden="true">⚠️</span>
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> The student will be able to retake this activity. Their previous score will be archived.
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2"
              disabled={loading || !reason.trim()}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Unlocking...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  <span>Unlock Activity</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
