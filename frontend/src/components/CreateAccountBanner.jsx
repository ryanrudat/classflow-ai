import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * CreateAccountBanner Component
 * Non-intrusive banner encouraging anonymous students to create accounts
 * Shows at top of student session view, dismissible
 */
export default function CreateAccountBanner({ sessionId }) {
  const [isDismissed, setIsDismissed] = useState(() => {
    // Check if user previously dismissed this
    return localStorage.getItem('create-account-banner-dismissed') === 'true'
  })
  const navigate = useNavigate()

  if (isDismissed) return null

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem('create-account-banner-dismissed', 'true')
  }

  const handleCreateAccount = () => {
    // Navigate to student auth with join code for after registration
    navigate(`/student/auth?join=${sessionId}`)
  }

  return (
    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-8 h-8 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg">Save Your Progress!</h3>
              <p className="text-blue-100 text-sm mt-1">
                Create a free account to keep your grades, rejoin sessions anytime, and track your improvement over time.
              </p>
              <div className="flex gap-3 mt-3">
                <button
                  onClick={handleCreateAccount}
                  className="px-4 py-2 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors text-sm"
                >
                  Create Account
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 text-white hover:bg-blue-600 rounded-lg transition-colors text-sm font-medium"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>

          {/* Dismiss X button */}
          <button
            onClick={handleDismiss}
            className="text-white hover:text-blue-200 transition-colors flex-shrink-0"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
