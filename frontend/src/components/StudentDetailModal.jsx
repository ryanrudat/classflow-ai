import { useEffect, useRef } from 'react'

/**
 * StudentDetailModal Component
 * Shows detailed question-by-question breakdown for a student
 * Displays which questions were answered correctly/incorrectly and attempt counts
 * Updates in real-time as student answers questions
 *
 * Accessibility features:
 * - Keyboard navigation (Escape to close)
 * - Click outside to close
 * - Focus trap
 * - ARIA attributes
 * - Semantic HTML
 */
export default function StudentDetailModal({ studentId, studentProgress, onClose, onRemoveStudent }) {
  const dialogRef = useRef(null)
  const closeButtonRef = useRef(null)

  // Find the current student data from the live studentProgress array
  const student = studentProgress.find(s => s.studentId === studentId)

  // Focus close button when modal opens
  useEffect(() => {
    if (closeButtonRef.current) {
      closeButtonRef.current.focus()
    }
  }, [])

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Handle click outside
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
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
  }, [])

  if (!student) return null

  // Get status color classes
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'needs-help':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'struggling':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'offline':
        return 'bg-gray-100 text-gray-800 border-gray-300'
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300'
    }
  }

  const handleRemove = () => {
    if (confirm(`Remove ${student.studentName} from this monitoring session? This will not affect their quiz progress.`)) {
      onRemoveStudent(studentId)
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-detail-title"
      aria-describedby="student-detail-description"
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-scale-in"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-5 flex items-center justify-between">
          <div>
            <h2 id="student-detail-title" className="text-2xl font-bold text-white">
              {student.studentName}
            </h2>
            <p id="student-detail-description" className="text-primary-100 text-sm">
              Detailed Progress Report
            </p>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="text-white hover:text-primary-100 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-600 rounded"
            aria-label="Close student details"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" role="region" aria-label="Student statistics">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="text-3xl font-bold text-primary-600" aria-label={`${student.score} percent score`}>
                {student.score}%
              </div>
              <div className="text-sm text-gray-600 mt-1">Overall Score</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="text-3xl font-bold text-gray-900" aria-label={`${student.correctCount} correct out of ${student.questionsAttempted} attempted`}>
                {student.correctCount}/{student.questionsAttempted}
              </div>
              <div className="text-sm text-gray-600 mt-1">Correct Answers</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="text-3xl font-bold text-gray-900" aria-label={`${student.totalAttempts} total attempts`}>
                {student.totalAttempts}
              </div>
              <div className="text-sm text-gray-600 mt-1">Total Attempts</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div
                className={`text-3xl font-bold ${student.helpRequestCount > 0 ? 'text-yellow-600' : 'text-gray-900'}`}
                aria-label={`${student.helpRequestCount} help requests`}
              >
                {student.helpRequestCount}
              </div>
              <div className="text-sm text-gray-600 mt-1">Help Requests</div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <span
              className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(student.status)}`}
              role="status"
              aria-label={`Student status: ${student.status}`}
            >
              {student.status === 'completed' && '✓ Completed'}
              {student.status === 'needs-help' && '? Needs Help'}
              {student.status === 'struggling' && '! Struggling'}
              {student.status === 'offline' && '○ Offline'}
              {student.status === 'active' && '→ Active'}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2" role="region" aria-label="Progress overview">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm text-gray-600">
                {student.questionsAttempted} of {student.totalQuestions} questions
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3" role="progressbar" aria-valuenow={student.questionsAttempted} aria-valuemin="0" aria-valuemax={student.totalQuestions} aria-label="Question progress">
              <div
                className={`h-3 rounded-full transition-all ${
                  student.status === 'completed' ? 'bg-green-500' :
                  student.status === 'needs-help' ? 'bg-yellow-500' :
                  student.status === 'struggling' ? 'bg-red-500' :
                  'bg-blue-500'
                }`}
                style={{
                  width: `${(student.questionsAttempted / student.totalQuestions) * 100}%`
                }}
              />
            </div>
          </div>

          {/* Question-by-Question Breakdown */}
          <div className="space-y-3" role="region" aria-label="Question breakdown">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Question-by-Question Breakdown
            </h3>

            {student.questionProgress && student.questionProgress.length > 0 ? (
              <div className="space-y-3">
                {student.questionProgress.map((question, index) => (
                  <div
                    key={index}
                    className={`border-2 rounded-lg p-4 ${
                      question.isCorrect
                        ? 'border-green-300 bg-green-50'
                        : 'border-red-300 bg-red-50'
                    }`}
                    role="article"
                    aria-label={`Question ${question.questionNumber}, ${question.isCorrect ? 'correct' : 'incorrect'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-gray-900">
                            Question {question.questionNumber}
                          </span>
                          {question.isCorrect ? (
                            <span className="flex items-center gap-1 text-green-700 text-sm font-medium">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Correct
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-700 text-sm font-medium">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                              Incorrect
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Attempts:</span>
                            <span className="ml-2 font-medium text-gray-900">
                              {question.attemptNumber}
                            </span>
                          </div>
                          {question.helpReceived && (
                            <div>
                              <span className="text-yellow-600 font-medium flex items-center gap-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                Help Received
                              </span>
                            </div>
                          )}
                          {question.timeSpent && (
                            <div>
                              <span className="text-gray-600">Time:</span>
                              <span className="ml-2 font-medium text-gray-900">
                                {Math.floor(question.timeSpent / 60)}:{(question.timeSpent % 60).toString().padStart(2, '0')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>No question details available yet</p>
                <p className="text-sm mt-1">Details will appear as the student answers questions</p>
              </div>
            )}
          </div>

          {/* Time Information */}
          {student.timeElapsed > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-gray-700">Time Elapsed:</span>
                <span className="text-sm text-gray-900">
                  {Math.floor(student.timeElapsed / 60)} minutes {student.timeElapsed % 60} seconds
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex flex-col-reverse sm:flex-row justify-between gap-3">
          <button
            onClick={handleRemove}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            aria-label={`Remove ${student.studentName} from monitoring`}
          >
            Remove from Monitoring
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
