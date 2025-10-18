import { useState, useEffect } from 'react'

/**
 * ConfusionMeter Component
 * Real-time feedback widget showing how many students are confused
 *
 * Features:
 * - Live count of confused students
 * - Visual urgency indicators (color-coded)
 * - One-click acknowledge/clear
 * - Student name list on hover/click
 * - Accessibility compliant
 * - Mobile-optimized
 *
 * UX Best Practices:
 * - Non-intrusive but visible
 * - Clear call-to-action when count is high
 * - Positive reinforcement when all students understand
 */
export default function ConfusionMeter({
  confusedStudents = [],
  totalStudents = 0,
  onAcknowledge,
  className = ''
}) {
  const [showDetails, setShowDetails] = useState(false)
  const [hasNewConfusion, setHasNewConfusion] = useState(false)

  const confusedCount = confusedStudents.length
  const confusionPercentage = totalStudents > 0 ? (confusedCount / totalStudents) * 100 : 0

  // Track when new confusion happens
  useEffect(() => {
    if (confusedCount > 0) {
      setHasNewConfusion(true)
      // Auto-dismiss the "new" indicator after 3 seconds
      const timer = setTimeout(() => setHasNewConfusion(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [confusedCount])

  // Get urgency level based on percentage
  const getUrgency = () => {
    if (confusionPercentage >= 50) return 'critical'
    if (confusionPercentage >= 25) return 'high'
    if (confusionPercentage >= 10) return 'medium'
    if (confusedCount > 0) return 'low'
    return 'none'
  }

  const urgency = getUrgency()

  // Color schemes based on urgency
  const urgencyStyles = {
    none: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-900',
      icon: 'text-green-600',
      badge: 'bg-green-100 text-green-800',
      pulse: false
    },
    low: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
      icon: 'text-blue-600',
      badge: 'bg-blue-100 text-blue-800',
      pulse: false
    },
    medium: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-300',
      text: 'text-yellow-900',
      icon: 'text-yellow-600',
      badge: 'bg-yellow-100 text-yellow-800',
      pulse: true
    },
    high: {
      bg: 'bg-orange-50',
      border: 'border-orange-300',
      text: 'text-orange-900',
      icon: 'text-orange-600',
      badge: 'bg-orange-100 text-orange-800',
      pulse: true
    },
    critical: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      text: 'text-red-900',
      icon: 'text-red-600',
      badge: 'bg-red-100 text-red-800',
      pulse: true
    }
  }

  const styles = urgencyStyles[urgency]

  const getMessage = () => {
    if (urgency === 'none') return 'All students on track! 🎉'
    if (urgency === 'critical') return 'Over half the class needs help!'
    if (urgency === 'high') return 'Many students confused'
    if (urgency === 'medium') return 'Some students need help'
    return 'A few students confused'
  }

  const getSuggestion = () => {
    if (urgency === 'none') return 'Keep going at this pace'
    if (urgency === 'critical') return 'Consider pausing and re-explaining'
    if (urgency === 'high') return 'Slow down or check for questions'
    if (urgency === 'medium') return 'Quick check-in recommended'
    return 'Monitor and address if needed'
  }

  return (
    <div className={`${className}`}>
      <div
        className={`${styles.bg} ${styles.border} border-2 rounded-xl p-4 transition-all ${
          styles.pulse && hasNewConfusion ? 'animate-pulse' : ''
        }`}
        role="alert"
        aria-live="polite"
        aria-atomic="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`${styles.icon} ${hasNewConfusion ? 'animate-bounce' : ''}`}>
              {urgency === 'none' ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
            <h3 className={`font-bold ${styles.text} text-sm sm:text-base`}>
              Class Pulse
            </h3>
          </div>

          {/* Count Badge */}
          <div
            className={`${styles.badge} px-3 py-1 rounded-full font-bold text-lg min-w-[3rem] text-center ${
              hasNewConfusion ? 'ring-2 ring-offset-2 ring-current' : ''
            }`}
            aria-label={`${confusedCount} out of ${totalStudents} students confused`}
          >
            {confusedCount}/{totalStudents}
          </div>
        </div>

        {/* Message */}
        <div className={`${styles.text} mb-2`}>
          <p className="font-semibold text-sm">{getMessage()}</p>
          <p className="text-xs mt-1 opacity-80">{getSuggestion()}</p>
        </div>

        {/* Progress Bar */}
        {totalStudents > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3 overflow-hidden">
            <div
              className={`h-2 transition-all duration-300 ${
                urgency === 'none' ? 'bg-green-500' :
                urgency === 'low' ? 'bg-blue-500' :
                urgency === 'medium' ? 'bg-yellow-500' :
                urgency === 'high' ? 'bg-orange-500' :
                'bg-red-500'
              }`}
              style={{ width: `${confusionPercentage}%` }}
              role="progressbar"
              aria-valuenow={confusionPercentage}
              aria-valuemin="0"
              aria-valuemax="100"
              aria-label="Percentage of confused students"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          {confusedCount > 0 && (
            <>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className={`flex-1 px-4 py-2 ${styles.text} bg-white hover:bg-opacity-50 border-2 ${styles.border} rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2`}
                aria-expanded={showDetails}
                aria-controls="confused-students-list"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {showDetails ? 'Hide Details' : 'Show Who'}
              </button>

              {onAcknowledge && (
                <button
                  onClick={onAcknowledge}
                  className={`flex-1 px-4 py-2 ${styles.icon} bg-white hover:bg-opacity-50 border-2 ${styles.border} rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Clear All
                </button>
              )}
            </>
          )}
        </div>

        {/* Student List */}
        {showDetails && confusedCount > 0 && (
          <div
            id="confused-students-list"
            className="mt-3 pt-3 border-t border-current border-opacity-20"
          >
            <p className={`text-xs font-semibold ${styles.text} mb-2`}>
              Students who need help:
            </p>
            <div className="space-y-1">
              {confusedStudents.map((student, index) => (
                <div
                  key={student.id || index}
                  className="flex items-center justify-between bg-white bg-opacity-50 rounded px-3 py-2 text-sm"
                >
                  <span className={`font-medium ${styles.text}`}>
                    {student.name || 'Anonymous Student'}
                  </span>
                  {student.timestamp && (
                    <span className={`text-xs ${styles.text} opacity-60`}>
                      {new Date(student.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
