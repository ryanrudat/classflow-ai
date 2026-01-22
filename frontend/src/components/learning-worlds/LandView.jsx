import { useState, useEffect, useMemo, Component } from 'react'
import { useAudioManager } from '../../hooks/useAudioManager'
import CharacterAvatar from './characters/CharacterAvatar'
import SpeechBubble from './characters/SpeechBubble'

/**
 * Error Boundary for Land View
 */
class LandViewErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('LandView Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full bg-sky-100 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 text-center max-w-md shadow-xl">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">{this.state.error?.message || 'An error occurred while loading the land.'}</p>
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
 * Land View Component
 *
 * An immersive view of a single land with:
 * - Themed animated backgrounds
 * - Character guide with speech bubbles
 * - Activity cards as interactive elements
 */
export default function LandView({ land, onSelectActivity, onBack, ageLevel = 2 }) {
  return (
    <LandViewErrorBoundary onBack={onBack}>
      <LandViewInner
        land={land}
        onSelectActivity={onSelectActivity}
        onBack={onBack}
        ageLevel={ageLevel}
      />
    </LandViewErrorBoundary>
  )
}

function LandViewInner({ land, onSelectActivity, onBack, ageLevel = 2 }) {
  const audioManager = useAudioManager() || {}
  const playVoice = audioManager.playVoice
  const playTap = audioManager.playTap
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
    playTap?.()
    onSelectActivity?.(activity.id, activity)
  }

  function handleBack() {
    playTap?.()
    onBack?.()
  }

  return (
    <div
      className={`w-full h-full overflow-hidden relative transition-opacity duration-500 ${isEntering ? 'opacity-0' : 'opacity-100'}`}
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

      {/* Modern Sun - subtle gradient glow */}
      <div className="absolute top-6 right-8 pointer-events-none">
        <svg width="120" height="120" viewBox="0 0 120 120" className="animate-pulse-slow">
          <defs>
            <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FEF3C7" />
              <stop offset="40%" stopColor="#FCD34D" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.3" />
            </radialGradient>
            <filter id="sunBlur">
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>
          <circle cx="60" cy="60" r="50" fill="url(#sunGlow)" filter="url(#sunBlur)" opacity="0.8" />
          <circle cx="60" cy="60" r="35" fill="#FCD34D" opacity="0.9" />
          <circle cx="50" cy="50" r="10" fill="#FEF3C7" opacity="0.6" />
        </svg>
      </div>

      {/* Clean, minimal clouds */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              top: `${6 + i * 8}%`,
              left: '-15%',
              animation: `cloud-drift ${40 + i * 15}s linear infinite`,
              animationDelay: `${i * 10}s`,
              opacity: 0.6 - i * 0.1
            }}
          >
            <svg width={180 - i * 20} height={70 - i * 5} viewBox="0 0 180 70">
              <defs>
                <filter id={`cloudBlur${i}`}>
                  <feGaussianBlur stdDeviation="2" />
                </filter>
              </defs>
              <ellipse cx="50" cy="45" rx="40" ry="20" fill="white" filter={`url(#cloudBlur${i})`} />
              <ellipse cx="90" cy="40" rx="50" ry="25" fill="white" filter={`url(#cloudBlur${i})`} />
              <ellipse cx="135" cy="45" rx="35" ry="18" fill="white" filter={`url(#cloudBlur${i})`} />
              <ellipse cx="70" cy="32" rx="25" ry="15" fill="white" filter={`url(#cloudBlur${i})`} />
              <ellipse cx="110" cy="32" rx="28" ry="14" fill="white" filter={`url(#cloudBlur${i})`} />
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
 * Modern SVG-based ambient elements - sophisticated, not childish
 */
function AmbientElements({ type }) {
  // Subtle floating orbs - modern, clean aesthetic
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Floating light orbs */}
      {[...Array(6)].map((_, i) => {
        const colors = ['rgba(99, 179, 237, 0.3)', 'rgba(147, 197, 253, 0.25)', 'rgba(196, 181, 253, 0.2)']
        const size = 40 + (i % 3) * 30
        return (
          <div
            key={i}
            className="absolute rounded-full animate-float-orb"
            style={{
              width: size,
              height: size,
              left: `${10 + i * 15}%`,
              top: `${15 + (i % 3) * 20}%`,
              background: `radial-gradient(circle at 30% 30%, ${colors[i % 3]}, transparent)`,
              filter: 'blur(1px)',
              animationDelay: `${i * 1.5}s`,
              animationDuration: `${12 + i * 2}s`
            }}
          />
        )
      })}

      {/* Subtle sparkle dots */}
      {[...Array(8)].map((_, i) => (
        <div
          key={`sparkle-${i}`}
          className="absolute animate-twinkle"
          style={{
            left: `${5 + i * 12}%`,
            top: `${10 + (i % 4) * 15}%`,
            animationDelay: `${i * 0.8}s`
          }}
        >
          <svg width="8" height="8" viewBox="0 0 8 8">
            <circle cx="4" cy="4" r="2" fill="rgba(255, 255, 255, 0.6)" />
          </svg>
        </div>
      ))}

      <style>{`
        @keyframes float-orb {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -30px) scale(1.05); }
          50% { transform: translate(40px, -10px) scale(1); }
          75% { transform: translate(20px, 20px) scale(0.95); }
        }
        .animate-float-orb {
          animation: float-orb 15s infinite ease-in-out;
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.3); }
        }
        .animate-twinkle {
          animation: twinkle 3s infinite ease-in-out;
        }
      `}</style>
    </div>
  )
}

/**
 * Modern floating particles - subtle geometric shapes
 */
function ParticleField({ type, color }) {
  const accentColor = color || '#60A5FA'

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Subtle rising particles */}
      {[...Array(8)].map((_, i) => {
        const shapes = ['circle', 'diamond', 'circle']
        const shape = shapes[i % 3]
        const size = 6 + (i % 3) * 4

        return (
          <div
            key={i}
            className="absolute animate-particle-rise"
            style={{
              left: `${8 + i * 12}%`,
              bottom: '-20px',
              animationDelay: `${i * 1.2}s`,
              animationDuration: `${8 + (i % 3) * 3}s`
            }}
          >
            <svg width={size} height={size} viewBox="0 0 10 10">
              {shape === 'circle' ? (
                <circle cx="5" cy="5" r="4" fill={accentColor} opacity="0.4" />
              ) : (
                <polygon points="5,1 9,5 5,9 1,5" fill={accentColor} opacity="0.3" />
              )}
            </svg>
          </div>
        )
      })}

      <style>{`
        @keyframes particle-rise {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 0;
          }
          15% {
            opacity: 0.6;
          }
          85% {
            opacity: 0.4;
          }
          100% {
            transform: translateY(-80vh) translateX(30px) rotate(180deg);
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
 * Activity Card Component - Modern, clean design
 */
function ActivityCard({ activity, index, onClick, ageLevel, accentColor }) {
  const [isPressed, setIsPressed] = useState(false)

  const durationMinutes = Math.ceil((activity.estimated_duration_seconds || 180) / 60)

  // Card sizes based on age
  const cardClasses = ageLevel === 1
    ? 'p-6 rounded-3xl'
    : ageLevel === 2
    ? 'p-5 rounded-2xl'
    : 'p-4 rounded-xl'

  const titleSize = ageLevel === 1 ? 'text-xl' : ageLevel === 2 ? 'text-lg' : 'text-base'
  const iconSize = ageLevel === 1 ? 48 : ageLevel === 2 ? 40 : 32

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
        focus:outline-none focus:ring-4 focus:ring-blue-300
        transform hover:shadow-2xl
        ${isPressed ? 'scale-95' : 'hover:scale-[1.02]'}
        text-left w-full relative overflow-hidden
        border border-gray-100 hover:border-blue-200
      `}
      style={{
        animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
      }}
    >
      {/* Subtle gradient accent */}
      <div
        className="absolute top-0 right-0 w-20 h-20 opacity-10 rounded-bl-full"
        style={{ background: accentColor }}
      />

      {/* Modern SVG Icon */}
      <div className="mb-3" style={{ width: iconSize, height: iconSize }}>
        <ActivityIcon type={activity.activity_type} size={iconSize} color={accentColor} />
      </div>

      {/* Title */}
      <h3 className={`font-bold text-gray-800 ${titleSize} mb-1`}>
        {activity.title}
      </h3>

      {/* Activity Type */}
      <p className="text-sm text-gray-500 capitalize mb-3">
        {(activity.activity_type || 'unconfigured').replace(/_/g, ' ')}
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

/**
 * Modern SVG Activity Icons
 */
function ActivityIcon({ type, size = 40, color = '#3B82F6' }) {
  const iconPaths = {
    vocabulary_touch: (
      // Hand/Touch icon
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    ),
    matching_game: (
      // Link/Connect icon
      <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
    ),
    listen_point: (
      // Headphones icon
      <path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z" />
    ),
    tpr_action: (
      // Running person icon
      <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7" />
    ),
    coloring: (
      // Palette icon
      <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
    ),
    letter_tracing: (
      // Pencil/Write icon
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    ),
    drawing: (
      // Brush icon
      <path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34c-.39-.39-1.02-.39-1.41 0L9 12.25 11.75 15l8.96-8.96c.39-.39.39-1.02 0-1.41z" />
    ),
    story_sequence: (
      // Book icon
      <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
    ),
    default: (
      // Target icon
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
    )
  }

  const path = iconPaths[type] || iconPaths.default

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className="transition-transform duration-200"
    >
      {path}
    </svg>
  )
}
