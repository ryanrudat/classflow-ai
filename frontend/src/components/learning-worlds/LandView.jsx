import { useState, useEffect } from 'react'
import { useAudioManager } from '../../hooks/useAudioManager'
import CharacterAvatar from './characters/CharacterAvatar'
import SpeechBubble from './characters/SpeechBubble'

/**
 * Land View Component
 *
 * Shows a single land with its activities and character guide.
 * Activities are displayed as large, touchable cards.
 */
export default function LandView({ land, onSelectActivity, onBack, ageLevel = 2 }) {
  const { playVoice, playTap } = useAudioManager()
  const [showIntro, setShowIntro] = useState(true)
  const [characterMessage, setCharacterMessage] = useState(null)

  // Get activities for this age level
  const activities = (land.activities || []).filter(
    activity =>
      activity.min_age_level <= ageLevel &&
      activity.max_age_level >= ageLevel
  )

  // Play intro narrative when entering land
  useEffect(() => {
    if (land.intro_story && showIntro) {
      setCharacterMessage(land.intro_story)
      // Auto-hide after reading time (roughly 100ms per character)
      const readingTime = Math.max(3000, land.intro_story.length * 100)
      const timer = setTimeout(() => {
        setShowIntro(false)
        setCharacterMessage(null)
      }, readingTime)
      return () => clearTimeout(timer)
    }
  }, [land.intro_story])

  function handleActivityClick(activity) {
    playTap()
    onSelectActivity(activity.id, activity)
  }

  function handleBack() {
    playTap()
    onBack()
  }

  // Touch target sizes based on age level
  const cardPadding = ageLevel === 1 ? 'p-6' : ageLevel === 2 ? 'p-5' : 'p-4'
  const fontSize = ageLevel === 1 ? 'text-xl' : ageLevel === 2 ? 'text-lg' : 'text-base'

  return (
    <div
      className="w-full h-screen overflow-hidden relative"
      style={{
        backgroundColor: land.background_color || '#a8d8b9',
        backgroundImage: land.background_url ? `url(${land.background_url})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/30 to-transparent">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium text-gray-700">Back to Map</span>
          </button>

          {/* Land Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
            {land.name}
          </h1>

          {/* Progress indicator */}
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
            <span className="font-medium text-gray-700">
              {activities.length} activities
            </span>
          </div>
        </div>
      </div>

      {/* Character with Speech Bubble */}
      {land.character_name && (
        <div className="absolute left-8 bottom-8 z-30">
          <CharacterAvatar
            name={land.character_name}
            avatarUrl={land.character_avatar}
            expression={characterMessage ? 'talking' : 'happy'}
            size={ageLevel === 1 ? 'large' : 'medium'}
          />
          {characterMessage && (
            <SpeechBubble
              message={characterMessage}
              characterName={land.character_name}
              onClose={() => setCharacterMessage(null)}
              ageLevel={ageLevel}
            />
          )}
        </div>
      )}

      {/* Activities Grid */}
      <div className="absolute inset-0 pt-24 pb-8 px-4 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {activities.length === 0 ? (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 text-center">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">No activities yet</h2>
              <p className="text-gray-600">
                Activities will appear here once they're added to this land.
              </p>
            </div>
          ) : (
            <div className={`grid gap-4 ${ageLevel === 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
              {activities.map((activity, index) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  index={index}
                  onClick={() => handleActivityClick(activity)}
                  ageLevel={ageLevel}
                  cardPadding={cardPadding}
                  fontSize={fontSize}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
    </div>
  )
}

/**
 * Activity Card Component
 */
function ActivityCard({ activity, index, onClick, ageLevel, cardPadding, fontSize }) {
  const [isPressed, setIsPressed] = useState(false)

  // Activity type icons
  const typeIcons = {
    vocabulary_touch: '👆',
    matching_game: '🔗',
    listen_point: '👂',
    tpr_action: '🏃',
    coloring: '🎨',
    story_sequence: '📖',
    fill_in_blank: '✏️',
    word_spelling: '🔤',
    sentence_builder: '📝',
    reading_comprehension: '📚',
    dictation: '🎧',
    story_writing: '✍️',
    dialogue_practice: '💬'
  }

  const icon = typeIcons[activity.activity_type] || '🎯'

  // Estimated duration display
  const durationMinutes = Math.ceil((activity.estimated_duration_seconds || 180) / 60)

  return (
    <button
      onClick={onClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      className={`
        ${cardPadding}
        bg-white rounded-2xl shadow-lg
        transition-all duration-200
        focus:outline-none focus:ring-4 focus:ring-yellow-400
        transform
        ${isPressed ? 'scale-95' : 'hover:scale-[1.02]'}
        text-left w-full
      `}
      style={{
        animationDelay: `${index * 100}ms`,
        animation: 'fadeInUp 0.5s ease-out forwards'
      }}
    >
      {/* Icon and Title Row */}
      <div className="flex items-start gap-3 mb-2">
        <div className="text-3xl flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-bold text-gray-800 ${fontSize} truncate`}>
            {activity.title}
          </h3>
          <p className="text-sm text-gray-500 capitalize">
            {activity.activity_type.replace(/_/g, ' ')}
          </p>
        </div>
      </div>

      {/* Duration */}
      <div className="flex items-center gap-1 text-sm text-gray-400 mt-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{durationMinutes} min</span>
      </div>

      {/* Progress indicator (if completed) */}
      {activity.isCompleted && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  )
}

// Animation keyframes
const style = document.createElement('style')
style.textContent = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`
if (typeof document !== 'undefined') {
  document.head.appendChild(style)
}
