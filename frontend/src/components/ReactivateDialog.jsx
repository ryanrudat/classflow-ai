import { useEffect, useRef, useState } from 'react'

/**
 * ReactivateDialog Component
 * Shows options to resume an existing period or start a new one when reactivating a session
 *
 * Accessibility features:
 * - Keyboard navigation (Escape to close)
 * - Click outside to close
 * - Focus trap
 * - ARIA attributes
 * - Loading states
 */
export default function ReactivateDialog({ session, instances, onResume, onStartNew, onCancel, clickedInstance = null }) {
  const [loading, setLoading] = useState(false)
  const dialogRef = useRef(null)
  const firstButtonRef = useRef(null)

  // Use the clicked instance if provided, otherwise find the most recent period
  const instanceToReactivate = clickedInstance || (instances?.length > 0
    ? instances.reduce((latest, current) =>
        current.instance_number > latest.instance_number ? current : latest
      )
    : null)

  const studentCount = instanceToReactivate?.student_count || 0

  // Focus first button when dialog opens
  useEffect(() => {
    if (firstButtonRef.current) {
      firstButtonRef.current.focus()
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
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
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

  const handleResumeClick = async () => {
    if (loading) return
    setLoading(true)
    try {
      await onResume(instanceToReactivate.id)
    } catch (error) {
      setLoading(false)
    }
  }

  const handleStartNewClick = async () => {
    if (loading) return
    setLoading(true)
    try {
      await onStartNew()
    } catch (error) {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-6 animate-scale-in"
      >
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <h2 id="dialog-title" className="text-2xl font-bold text-gray-900">
              Reactivate Period
            </h2>
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
          <p id="dialog-description" className="text-sm text-gray-600">
            {session?.title}
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            Choose how you'd like to continue with this session
          </p>
        </div>

        {/* Resume Option */}
        {instanceToReactivate && (
          <div className="space-y-3">
            <button
              ref={firstButtonRef}
              onClick={handleResumeClick}
              disabled={loading}
              className="w-full text-left p-4 border-2 border-blue-300 hover:border-blue-500 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all group disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label={`Resume ${instanceToReactivate.label || `Period ${instanceToReactivate.instance_number}`} with ${studentCount} students`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-500 group-hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors">
                  <span className="text-xl">📚</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 mb-1">
                    Resume {instanceToReactivate.label || `Period ${instanceToReactivate.instance_number}`}
                  </h3>
                  <p className="text-sm text-gray-700 font-medium">
                    Continue with {studentCount} student{studentCount !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Students can rejoin and pick up where they left off
                  </p>
                </div>
                {loading && (
                  <div className="flex-shrink-0">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="text-sm text-gray-500 font-medium">OR</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>
          </div>
        )}

        {/* Start New Option */}
        <button
          onClick={handleStartNewClick}
          disabled={loading}
          className="w-full text-left p-4 border-2 border-green-200 hover:border-green-400 rounded-lg transition-all group disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          aria-label={`Start new period ${instances?.length ? instances.length + 1 : 2} with fresh students`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-green-100 group-hover:bg-green-200 rounded-full flex items-center justify-center transition-colors">
              <span className="text-xl">✨</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 mb-1">
                Start New Period {instances?.length ? instances.length + 1 : 2}
              </h3>
              <p className="text-sm text-gray-600">
                Fresh start with new students
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Previous periods remain archived and accessible
              </p>
            </div>
            {loading && (
              <div className="flex-shrink-0">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
              </div>
            )}
          </div>
        </button>

        {/* Warning Message */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex gap-2">
            <span className="text-amber-600 flex-shrink-0">⚠️</span>
            <p className="text-xs text-amber-800">
              <strong>Note:</strong> Reactivating will make this session active again. Students will be able to join using the same join code.
            </p>
          </div>
        </div>

        {/* Cancel Button */}
        <button
          onClick={onCancel}
          disabled={loading}
          className="w-full px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          aria-label="Cancel and close dialog"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
