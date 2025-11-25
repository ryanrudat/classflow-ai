import { useMemo } from 'react'

/**
 * Password Strength Indicator
 * Provides visual feedback on password strength as user types
 */
export default function PasswordStrengthIndicator({ password }) {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '', feedback: [] }

    let score = 0
    const feedback = []

    // Length checks
    if (password.length >= 6) score += 1
    if (password.length >= 8) score += 1
    if (password.length >= 12) score += 1

    // Character type checks
    if (/[a-z]/.test(password)) score += 1
    if (/[A-Z]/.test(password)) score += 1
    if (/[0-9]/.test(password)) score += 1
    if (/[^a-zA-Z0-9]/.test(password)) score += 1

    // Build feedback
    if (password.length < 6) {
      feedback.push('At least 6 characters')
    }
    if (!/[A-Z]/.test(password)) {
      feedback.push('Add uppercase letter')
    }
    if (!/[0-9]/.test(password)) {
      feedback.push('Add a number')
    }

    // Normalize score to 0-4 range
    const normalizedScore = Math.min(4, Math.floor(score / 2))

    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong']
    const colors = [
      'bg-red-500',
      'bg-orange-500',
      'bg-yellow-500',
      'bg-lime-500',
      'bg-green-500'
    ]

    return {
      score: normalizedScore,
      label: labels[normalizedScore],
      color: colors[normalizedScore],
      feedback: feedback.slice(0, 2) // Show max 2 suggestions
    }
  }, [password])

  if (!password) return null

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                index <= strength.score ? strength.color : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <span className={`text-xs font-medium ${
          strength.score >= 3 ? 'text-green-600' :
          strength.score >= 2 ? 'text-yellow-600' : 'text-red-600'
        }`}>
          {strength.label}
        </span>
      </div>

      {/* Feedback suggestions */}
      {strength.feedback.length > 0 && strength.score < 3 && (
        <div className="flex flex-wrap gap-2">
          {strength.feedback.map((tip, index) => (
            <span
              key={index}
              className="text-xs text-gray-500 flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {tip}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
