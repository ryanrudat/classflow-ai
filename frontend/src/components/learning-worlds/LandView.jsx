import { useState, useEffect, useMemo } from 'react'
import { useAudioManager } from '../../hooks/useAudioManager'
import CharacterAvatar from './characters/CharacterAvatar'
import SpeechBubble from './characters/SpeechBubble'

/**
 * Land View Component
 *
 * An immersive view of a single land with:
 * - Themed animated backgrounds
 * - Character guide with speech bubbles
 * - Activity cards as interactive elements
 */
export default function LandView({ land, onSelectActivity, onBack, ageLevel = 2 }) {
  const { playVoice, playTap } = useAudioManager()
  const [showIntro, setShowIntro] = useState(true)
  const [characterMessage, setCharacterMessage] = useState(null)
  const [isEntering, setIsEntering] = useState(true)

  // Get activities for this age level
  const activities = (land.activities || []).filter(
    activity =>
      (!activity.min_age_level || activity.min_age_level <= ageLevel) &&
      (!activity.max_age_level || activity.max_age_level >= ageLevel)
  )

  // Theme based on land type/slug
  const theme = useMemo(() => {
    const themes = {
      animals: {
        skyTop: '#87CEEB',
        skyBottom: '#E0F4FF',
        ground: '#8B7355',
        grass: '#228B22',
        accent: '#FFD700',
        particles: 'leaves',
        ambient: 'butterflies'
      },
      colors: {
        skyTop: '#FF69B4',
        skyBottom: '#FFE4EC',
        ground: '#DA70D6',
        grass: '#FF1493',
        accent: '#FFD700',
        particles: 'sparkles',
        ambient: 'rainbow'
      },
      ocean: {
        skyTop: '#0EA5E9',
        skyBottom: '#BAE6FD',
        ground: '#0D9488',
        grass: '#14B8A6',
        accent: '#22D3EE',
        particles: 'bubbles',
        ambient: 'fish'
      },
      food: {
        skyTop: '#F97316',
        skyBottom: '#FED7AA',
        ground: '#92400E',
        grass: '#65A30D',
        accent: '#FBBF24',
        particles: 'sparkles',
        ambient: 'none'
      },
      default: {
        skyTop: '#60A5FA',
        skyBottom: '#DBEAFE',
        ground: '#78716C',
        grass: '#22C55E',
        accent: '#FBBF24',
        particles: 'sparkles',
        ambient: 'butterflies'
      }
    }

    const landType = land.slug?.split('-')[0] || 'default'
    return themes[landType] || themes.default
  }, [land.slug])

  // Entry animation
  useEffect(() => {
    const timer = setTimeout(() => setIsEntering(false), 800)
    return () => clearTimeout(timer)
  }, [])

  // Play intro narrative when entering land
  useEffect(() => {
    if (land.intro_story && showIntro) {
      setCharacterMessage(land.intro_story)
      const readingTime = Math.max(4000, land.intro_story.length * 80)
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

  return (
    <div
      className={`w-full h-screen overflow-hidden relative transition-opacity duration-500 ${isEntering ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Animated Sky Background */}
      <div
        className="absolute inset-0"
        style={{
          background: land.background_url
            ? `url(${land.background_url})`
            : `linear-gradient(180deg, ${theme.skyTop} 0%, ${theme.skyBottom} 60%, ${theme.grass} 100%)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />

      {/* Animated Sun */}
      <div className="absolute top-8 right-12 pointer-events-none">
        <div
          className="w-16 h-16 md:w-24 md:h-24 rounded-full animate-pulse-slow"
          style={{
            background: 'radial-gradient(circle at 30% 30%, #FFF8DC, #FFD700, #FFA500)',
            boxShadow: '0 0 40px rgba(255, 215, 0, 0.4), 0 0 80px rgba(255, 165, 0, 0.2)'
          }}
        />
      </div>

      {/* Floating Clouds */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              top: `${8 + i * 6}%`,
              left: '-20%',
              animation: `cloud-drift ${30 + i * 10}s linear infinite`,
              animationDelay: `${i * 8}s`
            }}
          >
            <svg width="150" height="60" viewBox="0 0 150 60">
              <ellipse cx="45" cy="40" rx="35" ry="18" fill="rgba(255,255,255,0.7)" />
              <ellipse cx="75" cy="35" rx="45" ry="22" fill="rgba(255,255,255,0.8)" />
              <ellipse cx="110" cy="40" rx="30" ry="16" fill="rgba(255,255,255,0.7)" />
              <ellipse cx="60" cy="28" rx="22" ry="14" fill="rgba(255,255,255,0.85)" />
              <ellipse cx="95" cy="28" rx="25" ry="13" fill="rgba(255,255,255,0.8)" />
            </svg>
          </div>
        ))}
      </div>

      {/* Themed Ambient Elements */}
      <AmbientElements type={theme.ambient} />

      {/* Floating Particles */}
      <ParticleField type={theme.particles} color={theme.accent} />

      {/* Rolling Hills */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <svg viewBox="0 0 1440 320" className="w-full" preserveAspectRatio="none" style={{ marginBottom: -2 }}>
          <path
            fill={theme.grass}
            fillOpacity="0.6"
            d="M0,160L60,170.7C120,181,240,203,360,197.3C480,192,600,160,720,154.7C840,149,960,171,1080,181.3C1200,192,1320,192,1380,192L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"
          />
          <path
            fill={theme.grass}
            fillOpacity="0.8"
            d="M0,224L48,218.7C96,213,192,203,288,208C384,213,480,235,576,240C672,245,768,235,864,213.3C960,192,1056,160,1152,160C1248,160,1344,192,1392,208L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          />
          <path
            fill={theme.grass}
            d="M0,256L48,261.3C96,267,192,277,288,272C384,267,480,245,576,240C672,235,768,245,864,261.3C960,277,1056,299,1152,293.3C1248,288,1344,256,1392,240L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          />
        </svg>
      </div>

      {/* Header with Back Button and Title */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-5 py-3 bg-white/95 backdrop-blur-sm rounded-full shadow-xl hover:bg-white transition-all hover:scale-105 focus:outline-none focus:ring-4 focus:ring-yellow-400"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-bold text-gray-700">Back to Map</span>
          </button>

          {/* Land Title */}
          <div className="relative">
            <h1
              className="text-2xl md:text-4xl font-bold text-white px-4"
              style={{
                textShadow: '0 2px 10px rgba(0,0,0,0.3), 0 4px 20px rgba(0,0,0,0.2)'
              }}
            >
              {land.name}
            </h1>
          </div>

          {/* Progress indicator */}
          <div
            className="bg-white/95 backdrop-blur-sm rounded-full px-5 py-3 shadow-xl flex items-center gap-2"
            style={{ borderColor: theme.accent, borderWidth: 2 }}
          >
            <span className="text-xl">🎯</span>
            <span className="font-bold text-gray-700">
              {activities.length} {activities.length === 1 ? 'Activity' : 'Activities'}
            </span>
          </div>
        </div>
      </div>

      {/* Character Guide */}
      {land.character_name && (
        <div className="absolute left-4 md:left-8 bottom-20 md:bottom-8 z-30">
          <div className="relative">
            <CharacterAvatar
              name={land.character_name}
              avatarUrl={land.character_avatar}
              expression={characterMessage ? 'talking' : 'happy'}
              size={ageLevel === 1 ? 'large' : 'medium'}
            />
            {characterMessage && (
              <div className="absolute left-full top-0 ml-4">
                <SpeechBubble
                  message={characterMessage}
                  characterName={land.character_name}
                  onClose={() => setCharacterMessage(null)}
                  ageLevel={ageLevel}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Activities Grid */}
      <div className="absolute inset-0 pt-24 pb-24 px-4 overflow-y-auto">
        <div className="max-w-5xl mx-auto mt-4">
          {activities.length === 0 ? (
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 text-center shadow-2xl">
              <div className="text-6xl mb-4">🎮</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">No Activities Yet</h2>
              <p className="text-gray-600">
                Activities will appear here once they're added to this land.
              </p>
            </div>
          ) : (
            <div className={`grid gap-4 md:gap-6 ${ageLevel === 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
              {activities.map((activity, index) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  index={index}
                  onClick={() => handleActivityClick(activity)}
                  ageLevel={ageLevel}
                  accentColor={theme.accent}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Animation Styles */}
      <style>{`
        @keyframes cloud-drift {
          0% { transform: translateX(0); }
          100% { transform: translateX(120vw); }
        }
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s infinite ease-in-out;
        }
        .animate-float-gentle {
          animation: float-gentle 3s infinite ease-in-out;
        }
      `}</style>
    </div>
  )
}

/**
 * Ambient animated elements based on land theme
 */
function AmbientElements({ type }) {
  if (type === 'butterflies') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-butterfly"
            style={{
              left: `${20 + i * 15}%`,
              top: `${20 + Math.sin(i) * 20}%`,
              animationDelay: `${i * 2}s`,
              animationDuration: `${8 + i * 2}s`
            }}
          >
            <span className="text-2xl">🦋</span>
          </div>
        ))}
        <style>{`
          @keyframes butterfly {
            0% { transform: translate(0, 0) rotate(0deg); }
            25% { transform: translate(50px, -30px) rotate(10deg); }
            50% { transform: translate(100px, 0) rotate(0deg); }
            75% { transform: translate(50px, 30px) rotate(-10deg); }
            100% { transform: translate(0, 0) rotate(0deg); }
          }
          .animate-butterfly {
            animation: butterfly 8s infinite ease-in-out;
          }
        `}</style>
      </div>
    )
  }

  if (type === 'fish') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              bottom: `${15 + i * 8}%`,
              left: '-5%',
              animation: `fish-swim ${12 + i * 3}s linear infinite`,
              animationDelay: `${i * 4}s`
            }}
          >
            <span className="text-3xl" style={{ display: 'inline-block', transform: 'scaleX(-1)' }}>
              {['🐠', '🐟', '🐡', '🦈'][i % 4]}
            </span>
          </div>
        ))}
        <style>{`
          @keyframes fish-swim {
            0% { transform: translateX(0) translateY(0); }
            25% { transform: translateX(25vw) translateY(-10px); }
            50% { transform: translateX(50vw) translateY(0); }
            75% { transform: translateX(75vw) translateY(10px); }
            100% { transform: translateX(110vw) translateY(0); }
          }
        `}</style>
      </div>
    )
  }

  if (type === 'rainbow') {
    return (
      <div className="absolute top-12 left-1/4 pointer-events-none opacity-60">
        <svg width="400" height="200" viewBox="0 0 400 200">
          <defs>
            <linearGradient id="rainbow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FF0000" />
              <stop offset="17%" stopColor="#FF7F00" />
              <stop offset="33%" stopColor="#FFFF00" />
              <stop offset="50%" stopColor="#00FF00" />
              <stop offset="67%" stopColor="#0000FF" />
              <stop offset="83%" stopColor="#4B0082" />
              <stop offset="100%" stopColor="#9400D3" />
            </linearGradient>
          </defs>
          <path
            d="M 50 200 A 150 150 0 0 1 350 200"
            fill="none"
            stroke="url(#rainbow)"
            strokeWidth="20"
            strokeLinecap="round"
          />
        </svg>
      </div>
    )
  }

  return null
}

/**
 * Floating particles based on land theme
 */
function ParticleField({ type, color }) {
  const particleEmoji = {
    leaves: ['🍃', '🍂', '🌿'],
    sparkles: ['✨', '⭐', '💫'],
    bubbles: ['🫧', '○', '◯']
  }

  const emojis = particleEmoji[type] || particleEmoji.sparkles

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-particle-float"
          style={{
            left: `${Math.random() * 100}%`,
            bottom: `${Math.random() * 20}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${6 + Math.random() * 4}s`,
            fontSize: `${1 + Math.random() * 0.5}rem`
          }}
        >
          {emojis[i % emojis.length]}
        </div>
      ))}
      <style>{`
        @keyframes particle-float {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
          }
          90% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-60vh) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-particle-float {
          animation: particle-float 8s infinite ease-out;
        }
      `}</style>
    </div>
  )
}

/**
 * Activity Card Component - More playful design
 */
function ActivityCard({ activity, index, onClick, ageLevel, accentColor }) {
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
  const durationMinutes = Math.ceil((activity.estimated_duration_seconds || 180) / 60)

  // Card sizes based on age
  const cardClasses = ageLevel === 1
    ? 'p-6 rounded-3xl'
    : ageLevel === 2
    ? 'p-5 rounded-2xl'
    : 'p-4 rounded-xl'

  const titleSize = ageLevel === 1 ? 'text-xl' : ageLevel === 2 ? 'text-lg' : 'text-base'
  const iconSize = ageLevel === 1 ? 'text-5xl' : 'text-4xl'

  return (
    <button
      onClick={onClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      className={`
        ${cardClasses}
        bg-white/95 backdrop-blur-sm shadow-xl
        transition-all duration-200
        focus:outline-none focus:ring-4 focus:ring-yellow-400
        transform hover:shadow-2xl
        ${isPressed ? 'scale-95' : 'hover:scale-[1.03]'}
        text-left w-full relative overflow-hidden
        border-2 border-transparent hover:border-yellow-300
      `}
      style={{
        animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
      }}
    >
      {/* Decorative corner accent */}
      <div
        className="absolute top-0 right-0 w-16 h-16 opacity-20"
        style={{
          background: `linear-gradient(135deg, transparent 50%, ${accentColor} 50%)`
        }}
      />

      {/* Icon */}
      <div className={`${iconSize} mb-3 animate-float-gentle`} style={{ animationDelay: `${index * 0.2}s` }}>
        {icon}
      </div>

      {/* Title */}
      <h3 className={`font-bold text-gray-800 ${titleSize} mb-1`}>
        {activity.title}
      </h3>

      {/* Activity Type */}
      <p className="text-sm text-gray-500 capitalize mb-3">
        {activity.activity_type.replace(/_/g, ' ')}
      </p>

      {/* Duration Badge */}
      <div
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
        style={{ backgroundColor: `${accentColor}30`, color: '#666' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{durationMinutes} min</span>
      </div>

      {/* Completed checkmark */}
      {activity.isCompleted && (
        <div className="absolute top-3 right-3 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  )
}
