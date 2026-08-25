/**
 * ActivityStatusBadge Component
 * Shows the status of an activity with appropriate styling and icons
 *
 * States:
 * - not_started: Gray outline, ready to start
 * - in_progress: Yellow/amber, shows progress
 * - completed: Green, shows score
 * - locked: Red, shows lock icon and completion info
 */

export default function ActivityStatusBadge({
  status = 'not_started',
  score = null,
  questionsAttempted = 0,
  totalQuestions = 0,
  completedAt = null,
  onClickUnlock = null,
  onClick = null,
  className = ''
}) {
  // Status styling
  const styles = {
    not_started: {
      bg: 'bg-gray-50 border-gray-300',
      text: 'text-gray-700',
      icon: '○',
      label: 'Not Started'
    },
    in_progress: {
      bg: 'bg-amber-50 border-amber-300',
      text: 'text-amber-700',
      icon: '⏳',
      label: 'In Progress'
    },
    completed: {
      bg: 'bg-emerald-50 border-emerald-300',
      text: 'text-emerald-700',
      icon: '✓',
      label: 'Completed'
    },
    locked: {
      bg: 'bg-red-50 border-red-300',
      text: 'text-red-700',
      icon: '🔒',
      label: 'Locked'
    }
  }

  const style = styles[status] || styles.not_started
  const isClickable = onClick || (status === 'completed' && !onClickUnlock)
  const isUnlockable = status === 'locked' && onClickUnlock

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`

    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  return (
    <div
      className={`
        border-2 rounded-lg p-4 transition-all
        ${style.bg} ${style.text}
        ${isClickable ? 'cursor-pointer hover:shadow-md' : ''}
        ${isUnlockable ? 'cursor-pointer hover:border-blue-400 hover:bg-blue-50' : ''}
        ${className}
      `}
      onClick={() => {
        if (onClick) onClick()
        if (isUnlockable) onClickUnlock()
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{style.icon}</span>
          <div>
            <div className="font-semibold">{style.label}</div>

            {/* Progress info */}
            {status === 'in_progress' && totalQuestions > 0 && (
              <div className="text-sm mt-1">
                {questionsAttempted} of {totalQuestions} questions
              </div>
            )}

            {/* Score info */}
            {(status === 'completed' || status === 'locked') && score !== null && (
              <div className="text-sm mt-1 font-medium">
                Score: {score}%
              </div>
            )}

            {/* Completion time */}
            {(status === 'completed' || status === 'locked') && completedAt && (
              <div className="text-xs mt-1 opacity-75">
                Completed {formatTime(completedAt)}
              </div>
            )}
          </div>
        </div>

        {/* Unlock button for teachers */}
        {isUnlockable && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClickUnlock()
            }}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
          >
            Unlock
          </button>
        )}
      </div>

      {/* Locked explanation (for students) */}
      {status === 'locked' && !onClickUnlock && (
        <div className="mt-3 pt-3 border-t border-red-200 text-xs">
          This activity has been completed and locked. Contact your teacher to unlock for retakes.
        </div>
      )}

      {/* Click hint for completed */}
      {status === 'completed' && onClick && !onClickUnlock && (
        <div className="mt-2 text-xs opacity-75">
          Click to review answers
        </div>
      )}
    </div>
  )
}
