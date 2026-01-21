import { useState, useEffect } from 'react'
import { useAudioManager } from '../../../hooks/useAudioManager'

/**
 * TPR (Total Physical Response) Action Activity
 *
 * Teacher leads students through physical actions.
 * - Teacher demonstrates movements
 * - Students follow along
 * - No touch interaction needed (movement-based)
 */
export default function TPRActionActivity({
  activity,
  content,
  ageLevel,
  controlMode,
  onComplete
}) {
  const audioManager = useAudioManager()
  const playVoice = audioManager?.playVoice
  const playSuccess = audioManager?.playSuccess

  // Safely extract prompts from content - check actions (AI generated), prompts, and tpr_prompts
  const safeContent = content || {}
  const safeActivity = activity || {}
  const prompts = Array.isArray(safeContent.actions) ? safeContent.actions.map(a => a.command || a)
    : Array.isArray(safeContent.prompts) ? safeContent.prompts
    : Array.isArray(safeActivity.tpr_prompts) ? safeActivity.tpr_prompts
    : []
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [showDemo, setShowDemo] = useState(false)

  const currentPrompt = prompts[currentIndex]

  // Auto-advance through prompts (teacher controlled)
  function handleNext() {
    if (currentIndex < prompts.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      // Activity complete
      playSuccess?.()
      onComplete?.({
        score: prompts.length,
        maxScore: prompts.length,
        starsEarned: 3
      })
    }
  }

  function handlePrevious() {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }

  // Common TPR emojis
  const actionEmojis = {
    'stand up': '🧍',
    'sit down': '🪑',
    'jump': '🦘',
    'clap': '👏',
    'wave': '👋',
    'touch': '👆',
    'point': '👉',
    'walk': '🚶',
    'run': '🏃',
    'stop': '🛑',
    'turn': '🔄',
    'spin': '🌀',
    'dance': '💃',
    'hop': '🐰',
    'stretch': '🙆',
    'shake': '🫨',
    'nod': '😊',
    'sleep': '😴',
    'wake up': '⏰'
  }

  function getEmoji(prompt) {
    if (!prompt) return '🎯'
    const lowerPrompt = String(prompt).toLowerCase()
    for (const [key, emoji] of Object.entries(actionEmojis)) {
      if (lowerPrompt.includes(key)) return emoji
    }
    return '🎯'
  }

  const fontSize = ageLevel === 1 ? 'text-4xl' : ageLevel === 2 ? 'text-3xl' : 'text-2xl'

  return (
    <div className="h-full flex flex-col items-center justify-center p-4">
      {/* Progress */}
      <div className="mb-4 text-center">
        <p className="text-sm text-gray-500">
          Action {currentIndex + 1} of {prompts.length}
        </p>
        <div className="mt-2 w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 transition-all duration-300 rounded-full"
            style={{ width: `${((currentIndex + 1) / prompts.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Current Action Card */}
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-lg w-full text-center mb-8">
        {/* Emoji */}
        <div className="text-8xl mb-6 animate-bounce-slow">
          {getEmoji(currentPrompt)}
        </div>

        {/* Prompt Text */}
        <h2 className={`${fontSize} font-bold text-gray-800 mb-4`}>
          {currentPrompt}
        </h2>

        {/* Instructions for teacher */}
        {controlMode === 'teacher' && (
          <p className="text-gray-500 text-sm">
            Demonstrate this action for your students
          </p>
        )}
      </div>

      {/* Navigation Controls (Teacher only) */}
      {controlMode === 'teacher' && (
        <div className="flex items-center gap-4">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <button
            onClick={handleNext}
            className="px-8 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors text-lg"
          >
            {currentIndex < prompts.length - 1 ? 'Next Action' : 'Finish!'}
          </button>
        </div>
      )}

      {/* Student View (following teacher) */}
      {controlMode !== 'teacher' && (
        <div className="text-center">
          <p className="text-xl text-gray-600">
            Follow along with your teacher!
          </p>
          <div className="mt-4 flex justify-center gap-2">
            {prompts.map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-colors ${
                  i <= currentIndex ? 'bg-purple-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Action Tips */}
      <div className="mt-8 bg-yellow-50 rounded-xl p-4 max-w-md">
        <p className="text-yellow-800 text-sm text-center">
          <span className="font-semibold">Tip:</span> Make big movements!
          Young learners learn best when they can see and copy actions clearly.
        </p>
      </div>

      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
