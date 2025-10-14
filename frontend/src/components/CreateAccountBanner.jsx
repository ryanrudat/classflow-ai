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
            <div className="text-3xl mt-0.5">💡</div>
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
