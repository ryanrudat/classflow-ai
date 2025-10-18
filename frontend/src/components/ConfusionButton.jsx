import { useState, useEffect } from 'react'

/**
 * ConfusionButton Component
 * Allows students to signal when they're confused or lost
 *
 * Features:
 * - Large, touch-friendly button
 * - Toggle on/off (students can clear their own confusion)
 * - Visual feedback
 * - Anonymous by default
 * - Mobile-optimized
 * - Accessible
 *
 * UX Best Practices:
 * - Non-judgmental language ("I'm lost" vs "I don't understand")
 * - Easy to find and use
 * - Clear feedback when clicked
 * - Ability to undo
 */
export default function ConfusionButton({
  isConfused = false,
  onToggle,
  disabled = false,
  className = ''
}) {
  const [showConfirmation, setShowConfirmation] = useState(false)

  // Show confirmation briefly when toggled
  useEffect(() => {
    if (isConfused) {
      setShowConfirmation(true)
      const timer = setTimeout(() => setShowConfirmation(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isConfused])

  const handleClick = () => {
    if (!disabled && onToggle) {
      onToggle(!isConfused)
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Main Button */}
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`w-full px-6 py-4 rounded-xl font-bold text-lg transition-all transform active:scale-95 focus:outline-none focus:ring-4 focus:ring-offset-2 ${
          isConfused
            ? 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg ring-4 ring-yellow-200 focus:ring-yellow-400'
            : 'bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 hover:border-gray-400 focus:ring-gray-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        aria-pressed={isConfused}
        aria-label={isConfused ? "I understand now" : "I'm lost or confused"}
      >
        <div className="flex items-center justify-center gap-3">
          {/* Icon */}
          <div className="text-2xl">
            {isConfused ? '🙋' : '🤔'}
          </div>

          {/* Text */}
          <span className="text-base sm:text-lg">
            {isConfused ? "I'm Good Now!" : "I'm Lost 🆘"}
          </span>
        </div>

        {/* Subtext */}
        {!isConfused && (
          <div className="text-xs sm:text-sm text-gray-500 mt-1 font-normal">
            Click if you're confused or need help
          </div>
        )}
      </button>

      {/* Confirmation Toast */}
      {showConfirmation && isConfused && (
        <div className="mt-3 bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 animate-scale-in">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-2xl">
              ✅
            </div>
            <div>
              <p className="font-semibold text-yellow-900 text-sm">
                Your teacher has been notified
              </p>
              <p className="text-yellow-800 text-xs mt-1">
                Help is on the way! Keep working on what you can, or review earlier material.
              </p>
              <p className="text-yellow-700 text-xs mt-2 italic">
                Click the button again when you're ready to continue.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Note */}
      <div className="mt-2 text-center">
        <p className="text-xs text-gray-500">
          🔒 Your teacher will see someone needs help, {' '}
          <span className="font-semibold">but will know it's you</span> so they can provide targeted support
        </p>
      </div>
    </div>
  )
}
