import { useState, useEffect, Component } from 'react'
import { useAudioManager } from '../../hooks/useAudioManager'
import VocabularyTouchActivity from './activities/VocabularyTouchActivity'
import MatchingGameActivity from './activities/MatchingGameActivity'
import ListenAndPointActivity from './activities/ListenAndPointActivity'
import TPRActionActivity from './activities/TPRActionActivity'
import ColoringActivity from './activities/ColoringActivity'
import TracingActivity from './activities/TracingActivity'
import DrawingActivity from './activities/DrawingActivity'
import P5Canvas from './p5/P5Canvas'
import { celebrationSketch } from './p5/sketches/celebrationSketch'

/**
 * Error Boundary for Activity Player
 */
class ActivityErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ActivityPlayer Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-screen bg-gradient-to-b from-sky-100 to-sky-200 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 text-center max-w-md">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">{this.state.error?.message || 'An error occurred while loading the activity.'}</p>
            <button onClick={this.props.onBack} className="px-6 py-2 bg-sky-500 text-white rounded-lg">
              Go Back
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

/**
 * Activity Player Component
 *
 * Renders the appropriate activity component based on activity type.
 * Handles intro/success narratives and completion tracking.
 */
export default function ActivityPlayer({
  activity,
  ageLevel = 2,
  controlMode = 'teacher',
  onComplete,
  onBack
}) {
  return (
    <ActivityErrorBoundary onBack={onBack}>
      <ActivityPlayerInner
        activity={activity}
        ageLevel={ageLevel}
        controlMode={controlMode}
        onComplete={onComplete}
        onBack={onBack}
      />
    </ActivityErrorBoundary>
  )
}

function ActivityPlayerInner({
  activity,
  ageLevel = 2,
  controlMode = 'teacher',
  onComplete,
  onBack
}) {
  // Use audio manager - hooks must be called unconditionally
  const audioManager = useAudioManager() || {}
  const playVoice = audioManager.playVoice
  const playSuccess = audioManager.playSuccess
  const playCelebration = audioManager.playCelebration

  // Guard against missing activity
  if (!activity) {
    return (
      <div className="w-full h-screen bg-gradient-to-b from-sky-100 to-sky-200 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Activity Not Found</h2>
          <p className="text-gray-600 mb-4">The activity could not be loaded.</p>
          <button onClick={onBack} className="px-6 py-2 bg-sky-500 text-white rounded-lg">
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const [showIntro, setShowIntro] = useState(true)
  const [showCelebration, setShowCelebration] = useState(false)
  const [activityResult, setActivityResult] = useState(null)

  // Get age-appropriate content
  const content = getContentForLevel(activity, ageLevel)

  // Play intro narrative
  useEffect(() => {
    if (activity.intro_narrative && showIntro) {
      // Show intro for a few seconds, then start activity
      const timer = setTimeout(() => {
        setShowIntro(false)
      }, 4000)
      return () => clearTimeout(timer)
    } else {
      setShowIntro(false)
    }
  }, [activity.intro_narrative])

  function handleActivityComplete(result) {
    setActivityResult(result)
    setShowCelebration(true)
    playCelebration?.()

    // Show celebration for 3 seconds, then call onComplete
    setTimeout(() => {
      playSuccess?.()
      onComplete?.(activity.id, result)
    }, 3000)
  }

  // Touch target sizes based on age level
  const touchTargetSize = ageLevel === 1 ? 80 : ageLevel === 2 ? 64 : 48

  // Activity component mapping
  const ActivityComponents = {
    vocabulary_touch: VocabularyTouchActivity,
    matching_game: MatchingGameActivity,
    listen_point: ListenAndPointActivity,
    tpr_action: TPRActionActivity,
    coloring: ColoringActivity,
    letter_tracing: TracingActivity,
    drawing: DrawingActivity
  }

  const ActivityComponent = ActivityComponents[activity.activity_type]

  return (
    <div className="w-full h-screen bg-gradient-to-b from-sky-100 to-sky-200 relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-white/50 to-transparent">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium text-gray-700">Back</span>
          </button>

          <h1 className="text-xl md:text-2xl font-bold text-gray-800">
            {activity.title}
          </h1>

          <div className="w-24" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Intro Overlay */}
      {showIntro && activity.intro_narrative && (
        <IntroOverlay
          narrative={activity.intro_narrative}
          ageLevel={ageLevel}
          onSkip={() => setShowIntro(false)}
        />
      )}

      {/* Activity Content */}
      {!showIntro && !showCelebration && (
        <div className="pt-20 h-full">
          {ActivityComponent ? (
            <ActivityComponent
              activity={activity}
              content={content}
              ageLevel={ageLevel}
              controlMode={controlMode}
              touchTargetSize={touchTargetSize}
              onComplete={handleActivityComplete}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="bg-white rounded-2xl p-8 text-center max-w-md">
                <div className="text-4xl mb-4">🚧</div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  {!activity.activity_type ? 'Activity Configuration Missing' : 'Activity Type Not Supported'}
                </h2>
                <p className="text-gray-600 mb-4">
                  {!activity.activity_type
                    ? 'This activity needs to be configured. Please edit the activity in the World Editor and select an activity type.'
                    : `The activity type "${activity.activity_type}" is not yet implemented.`
                  }
                </p>
                <button
                  onClick={onBack}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Go Back
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Celebration Overlay */}
      {showCelebration && (
        <CelebrationOverlay
          result={activityResult}
          successNarrative={activity.success_narrative}
          ageLevel={ageLevel}
        />
      )}
    </div>
  )
}

/**
 * Get content appropriate for the age level
 */
function getContentForLevel(activity, ageLevel) {
  // Check for level-specific content
  if (ageLevel === 1 && activity.level_1_content) {
    return activity.level_1_content
  }
  if (ageLevel === 2 && activity.level_2_content) {
    return activity.level_2_content
  }
  if (ageLevel === 3 && activity.level_3_content) {
    return activity.level_3_content
  }
  // Fall back to default content
  return activity.content || {}
}

/**
 * Intro Overlay Component
 */
function IntroOverlay({ narrative, ageLevel, onSkip }) {
  const fontSize = ageLevel === 1 ? 'text-2xl' : ageLevel === 2 ? 'text-xl' : 'text-lg'

  return (
    <div className="absolute inset-0 z-30 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-lg text-center animate-bounce-in">
        <div className="text-5xl mb-4">🎯</div>
        <p className={`${fontSize} text-gray-800 font-medium mb-6`}>
          {narrative}
        </p>
        <button
          onClick={onSkip}
          className="px-8 py-3 bg-emerald-500 text-white rounded-full font-semibold text-lg hover:bg-emerald-600 transition-colors"
        >
          Let's Go!
        </button>
      </div>

      <style>{`
        @keyframes bounce-in {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          70% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  )
}

/**
 * Celebration Overlay Component with P5.js Effects
 */
function CelebrationOverlay({ result, successNarrative, ageLevel }) {
  const starsEarned = result?.starsEarned || 3
  const fontSize = ageLevel === 1 ? 'text-2xl' : ageLevel === 2 ? 'text-xl' : 'text-lg'

  return (
    <div className="absolute inset-0 z-30 overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-400 via-orange-400 to-rose-400" />

      {/* P5.js Celebration Canvas */}
      <div className="absolute inset-0">
        <P5Canvas
          sketch={celebrationSketch}
          props={{ starsEarned, ageLevel }}
          transparent={true}
          frameRate={60}
        />
      </div>

      {/* Content - on top of canvas */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center relative z-10">
          {/* Stars */}
          <div className="flex justify-center gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <span
                key={i}
                className={`text-6xl transform transition-all duration-500 drop-shadow-lg ${
                  i <= starsEarned ? 'scale-100 opacity-100 animate-bounce-in' : 'scale-50 opacity-30'
                }`}
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                ⭐
              </span>
            ))}
          </div>

          {/* Message */}
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg animate-bounce-in">
            Great Job!
          </h1>

          {successNarrative && (
            <p className={`${fontSize} text-white/90 max-w-md mx-auto drop-shadow`}>
              {successNarrative}
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes bounce-in {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
