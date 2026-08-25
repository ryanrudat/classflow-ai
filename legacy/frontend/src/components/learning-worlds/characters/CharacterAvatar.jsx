import { useState, useEffect } from 'react'

/**
 * Character Avatar Component
 *
 * Displays a character guide with animated expressions.
 * Used for land mascots and activity guides.
 */
export default function CharacterAvatar({
  name,
  avatarUrl,
  expression = 'happy',
  size = 'medium',
  onClick = null,
  className = ''
}) {
  const [currentExpression, setCurrentExpression] = useState(expression)
  const [isAnimating, setIsAnimating] = useState(false)

  // Update expression when prop changes
  useEffect(() => {
    setCurrentExpression(expression)

    // Animate when expression changes
    setIsAnimating(true)
    const timer = setTimeout(() => setIsAnimating(false), 300)
    return () => clearTimeout(timer)
  }, [expression])

  // Size classes
  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-24 h-24',
    large: 'w-32 h-32',
    xlarge: 'w-40 h-40'
  }

  // Default character emojis when no avatar URL
  const defaultAvatars = {
    lion: '🦁',
    coyote: '🐺',
    owl: '🦉',
    bear: '🐻',
    fox: '🦊',
    rabbit: '🐰',
    penguin: '🐧',
    panda: '🐼',
    koala: '🐨',
    monkey: '🐵'
  }

  // Get default avatar based on name
  function getDefaultEmoji() {
    const nameLower = name?.toLowerCase() || ''
    for (const [animal, emoji] of Object.entries(defaultAvatars)) {
      if (nameLower.includes(animal)) return emoji
    }
    return '🤖'
  }

  // Expression modifiers (for future animated SVG support)
  const expressionStyles = {
    happy: {},
    talking: { animation: 'talk 0.3s infinite' },
    thinking: { animation: 'think 1s infinite' },
    excited: { animation: 'bounce 0.5s infinite' },
    surprised: {},
    sleeping: { opacity: 0.7 }
  }

  return (
    <div
      className={`
        relative
        ${sizeClasses[size]}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {/* Shadow */}
      <div
        className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-3/4 h-2 bg-black/20 rounded-full blur-sm"
      />

      {/* Avatar Container */}
      <div
        className={`
          w-full h-full rounded-full
          bg-white shadow-lg
          flex items-center justify-center
          overflow-hidden
          transition-transform duration-300
          ${isAnimating ? 'scale-110' : 'scale-100'}
          ${currentExpression === 'talking' ? 'animate-pulse' : ''}
        `}
        style={expressionStyles[currentExpression]}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-4xl md:text-5xl">
            {getDefaultEmoji()}
          </span>
        )}
      </div>

      {/* Expression indicators */}
      {currentExpression === 'talking' && (
        <TalkingIndicator />
      )}

      {currentExpression === 'thinking' && (
        <ThinkingIndicator />
      )}

      {currentExpression === 'excited' && (
        <ExcitedIndicator />
      )}

      <style>{`
        @keyframes talk {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.05); }
        }
        @keyframes think {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  )
}

/**
 * Talking Indicator (sound waves)
 */
function TalkingIndicator() {
  return (
    <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 flex gap-0.5">
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className="w-1 bg-sky-500 rounded-full animate-sound-wave"
          style={{
            animationDelay: `${i * 0.1}s`,
            height: `${8 + i * 4}px`
          }}
        />
      ))}

      <style>{`
        @keyframes sound-wave {
          0%, 100% { transform: scaleY(1); opacity: 0.5; }
          50% { transform: scaleY(1.5); opacity: 1; }
        }
        .animate-sound-wave {
          animation: sound-wave 0.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

/**
 * Thinking Indicator (thought bubbles)
 */
function ThinkingIndicator() {
  return (
    <div className="absolute -right-4 -top-4 flex flex-col items-end gap-1">
      <div className="w-2 h-2 bg-gray-300 rounded-full" />
      <div className="w-3 h-3 bg-gray-300 rounded-full" />
      <div className="w-4 h-4 bg-gray-300 rounded-full" />
    </div>
  )
}

/**
 * Excited Indicator (sparkles)
 */
function ExcitedIndicator() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {[...Array(5)].map((_, i) => (
        <span
          key={i}
          className="absolute text-yellow-400 animate-sparkle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 0.5}s`
          }}
        >
          ✨
        </span>
      ))}

      <style>{`
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }
        .animate-sparkle {
          animation: sparkle 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
