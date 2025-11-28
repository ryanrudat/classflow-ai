import { useState, useEffect } from 'react'
import axios from 'axios'
import { useSocket } from '../hooks/useSocket'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/**
 * LessonFlowView Component
 * Magical student experience with smooth transitions and progress tracking
 */
export default function LessonFlowView({
  flowId,
  sessionId,
  studentId,
  onActivityChange,
  children
}) {
  const [currentActivity, setCurrentActivity] = useState(null)
  const [progress, setProgress] = useState(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [flowInfo, setFlowInfo] = useState(null) // Includes pacing mode

  const { on, off } = useSocket()

  // Load current activity and flow info
  useEffect(() => {
    async function loadCurrentActivity() {
      try {
        const response = await axios.get(
          `${API_URL}/api/lesson-flows/${flowId}/current-activity`,
          {
            params: { studentId }
          }
        )
        setCurrentActivity(response.data.activity)
        setProgress(response.data.progress)
        if (response.data.flowInfo) {
          setFlowInfo(response.data.flowInfo)
        }
        if (onActivityChange) {
          onActivityChange(response.data.activity, response.data.progress)
        }
      } catch (error) {
        console.error('Failed to load current activity:', error)
      }
    }

    if (flowId && studentId) {
      loadCurrentActivity()
    }
  }, [flowId, studentId, onActivityChange])

  // Listen for auto-advance and teacher-paced advance
  useEffect(() => {
    const handleFlowAdvance = (data) => {
      if (data.flowId === flowId && data.studentId === studentId) {
        handleAdvance(data.nextActivity, data.sequence, data.totalItems)
      }
    }

    const handleFlowCompleted = (data) => {
      if (data.flowId === flowId && data.studentId === studentId) {
        handleComplete()
      }
    }

    // Teacher-paced advance - applies to ALL students
    const handleTeacherFlowAdvance = (data) => {
      if (data.flowId === flowId) {
        console.log('📚 Teacher advancing to activity:', data.sequence)
        handleAdvance(data.activity, data.sequence, data.totalItems)
      }
    }

    on('flow-advance', handleFlowAdvance)
    on('lesson-flow-completed', handleFlowCompleted)
    on('teacher-flow-advance', handleTeacherFlowAdvance)

    return () => {
      off('flow-advance', handleFlowAdvance)
      off('lesson-flow-completed', handleFlowCompleted)
      off('teacher-flow-advance', handleTeacherFlowAdvance)
    }
  }, [flowId, studentId, on, off])

  const handleAdvance = (nextActivity, sequence, totalItems) => {
    setIsTransitioning(true)

    // Smooth fade out
    setTimeout(() => {
      setCurrentActivity(nextActivity)
      setProgress({
        currentSequence: sequence,
        totalItems,
        isCompleted: false
      })

      if (onActivityChange) {
        onActivityChange(nextActivity, { currentSequence: sequence, totalItems })
      }

      // Fade back in
      setTimeout(() => {
        setIsTransitioning(false)
      }, 300)
    }, 300)
  }

  const handleComplete = () => {
    setIsTransitioning(true)
    setIsComplete(true)
    setShowCelebration(true)

    // Hide celebration after animation
    setTimeout(() => {
      setShowCelebration(false)
    }, 5000)
  }

  const advanceToNext = async () => {
    if (!currentActivity) return

    try {
      const response = await axios.post(
        `${API_URL}/api/lesson-flows/${flowId}/advance`,
        {
          studentId,
          completedActivityId: currentActivity.id
        }
      )

      if (response.data.isComplete) {
        handleComplete()
      } else {
        // Let WebSocket handle the transition for smooth sync
        // But fallback to direct update if WebSocket is slow
        setTimeout(() => {
          if (!isTransitioning) {
            handleAdvance(
              response.data.nextActivity,
              response.data.progress.currentSequence,
              response.data.progress.totalItems
            )
          }
        }, 1000)
      }
    } catch (error) {
      console.error('Failed to advance:', error)
    }
  }

  if (!progress || !currentActivity) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading your lesson...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Magical Progress Bar */}
      <div className="sticky top-0 z-50 bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Progress Stats */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✨</span>
              <div>
                <h2 className="font-bold text-gray-900">Lesson Flow</h2>
                <p className="text-sm text-gray-600">
                  Activity {progress.currentSequence} of {progress.totalItems}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round((progress.currentSequence / progress.totalItems) * 100)}%
              </div>
              <p className="text-xs text-gray-600">Complete</p>
            </div>
          </div>

          {/* Visual Progress Bar */}
          <div className="relative">
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-1000 ease-out"
                style={{
                  width: `${(progress.currentSequence / progress.totalItems) * 100}%`
                }}
              >
                <div className="h-full w-full bg-white opacity-20 animate-pulse"></div>
              </div>
            </div>

            {/* Activity Markers */}
            <div className="absolute top-0 left-0 right-0 flex justify-between px-1 pointer-events-none">
              {Array.from({ length: progress.totalItems }).map((_, i) => {
                const isComplete = i < progress.currentSequence
                const isCurrent = i === progress.currentSequence - 1

                return (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full border-2 transition-all duration-500 ${
                      isComplete
                        ? 'bg-purple-600 border-purple-600 scale-100'
                        : isCurrent
                        ? 'bg-white border-purple-600 scale-125 shadow-lg'
                        : 'bg-white border-gray-300 scale-75'
                    }`}
                    style={{
                      transform: `translateY(-50%) scale(${isCurrent ? 1.25 : isComplete ? 1 : 0.75})`
                    }}
                  />
                )
              })}
            </div>
          </div>

          {/* Step Indicator Dots (Mobile-friendly) */}
          <div className="flex justify-center gap-2 mt-4 md:hidden">
            {Array.from({ length: progress.totalItems }).map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i < progress.currentSequence
                    ? 'bg-purple-600 w-8'
                    : i === progress.currentSequence - 1
                    ? 'bg-purple-400 w-12'
                    : 'bg-gray-300 w-6'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Activity Content with Transition */}
      <div
        className={`transition-all duration-300 ${
          isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
      >
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Activity Card */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Activity Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-2xl">
                  {progress.currentSequence}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{currentActivity.prompt || 'Activity'}</h3>
                  <p className="text-purple-100 text-sm capitalize">
                    {currentActivity.type?.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>

            {/* Activity Content */}
            <div className="p-6">
              {children}
            </div>
          </div>

          {/* Navigation Hint */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Complete this activity to automatically move to the next one ✨
            </p>
          </div>
        </div>
      </div>

      {/* Celebration Modal */}
      {showCelebration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] animate-fadeIn">
          <div className="bg-white rounded-3xl p-12 max-w-md text-center shadow-2xl transform animate-bounceIn">
            <div className="text-8xl mb-6 animate-bounce">🎉</div>
            <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 mb-4">
              Congratulations!
            </h2>
            <p className="text-xl text-gray-700 mb-6">
              You've completed the entire lesson flow!
            </p>
            <div className="flex gap-2 justify-center mb-6">
              <span className="text-4xl animate-bounce" style={{ animationDelay: '0ms' }}>⭐</span>
              <span className="text-4xl animate-bounce" style={{ animationDelay: '100ms' }}>⭐</span>
              <span className="text-4xl animate-bounce" style={{ animationDelay: '200ms' }}>⭐</span>
            </div>
            <div className="w-full bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full overflow-hidden">
              <div className="h-full bg-white opacity-30 animate-shimmer"></div>
            </div>
          </div>
        </div>
      )}

      {/* Completion Screen */}
      {isComplete && !showCelebration && (
        <div className="fixed inset-0 bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center z-50">
          <div className="text-center text-white p-8">
            <div className="text-8xl mb-6">🏆</div>
            <h2 className="text-5xl font-bold mb-4">All Done!</h2>
            <p className="text-2xl opacity-90">Great work completing this lesson</p>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-bounceIn {
          animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .animate-shimmer {
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  )
}

// Export helper function for auto-advancing
export function useLessonFlowAutoAdvance(flowId, studentId, activityCompleted) {
  useEffect(() => {
    if (!flowId || !studentId || !activityCompleted) return

    const advanceToNext = async () => {
      try {
        await axios.post(
          `${API_URL}/api/lesson-flows/${flowId}/advance`,
          {
            studentId,
            completedActivityId: activityCompleted
          }
        )
      } catch (error) {
        console.error('Auto-advance failed:', error)
      }
    }

    // Delay slightly for smooth transition
    const timer = setTimeout(advanceToNext, 500)
    return () => clearTimeout(timer)
  }, [flowId, studentId, activityCompleted])
}
