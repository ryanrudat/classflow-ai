import { useState, useEffect } from 'react'

/**
 * SceneItem Component
 *
 * A single interactive vocabulary item placed in the explorable scene.
 * Shows idle animations, glows when undiscovered, and animates on touch.
 */
export default function SceneItem({
  item,
  isDiscovered,
  isHinted = false,
  onTouch,
  ageLevel = 2
}) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [isPressed, setIsPressed] = useState(false)

  // Touch target size based on age
  const touchPadding = ageLevel === 1 ? 20 : ageLevel === 2 ? 15 : 10

  // Get animation classes
  const idleAnimation = getIdleAnimationClass(item.idle_animation)
  const touchAnimation = getTouchAnimationClass(item.touch_animation)

  // Handle touch/click
  const handleInteraction = () => {
    setIsAnimating(true)
    setIsPressed(true)
    onTouch?.()

    // Reset animation state
    setTimeout(() => {
      setIsAnimating(false)
      setIsPressed(false)
    }, 800)
  }

  // Size calculations
  const baseWidth = item.sprite_width || 80
  const baseHeight = item.sprite_height || 80
  const scale = item.scale || 1
  const displayWidth = baseWidth * scale
  const displayHeight = baseHeight * scale

  return (
    <button
      onClick={handleInteraction}
      className={`
        absolute transform -translate-x-1/2 -translate-y-1/2
        focus:outline-none focus:ring-4 focus:ring-yellow-400 rounded-lg
        transition-transform duration-150
        ${isPressed ? 'scale-90' : 'hover:scale-105'}
        ${!isAnimating && !isDiscovered ? idleAnimation : ''}
        ${isAnimating ? touchAnimation : ''}
      `}
      style={{
        left: `${item.position_x}%`,
        top: `${item.position_y}%`,
        zIndex: item.z_index || 10,
        padding: touchPadding,
        // Ensure touch target is large enough
        minWidth: 44,
        minHeight: 44
      }}
    >
      {/* Glow effect for undiscovered items */}
      {!isDiscovered && item.glow_when_undiscovered !== false && (
        <div
          className="absolute inset-0 rounded-full animate-pulse-glow pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${item.glow_color || '#FFD700'}40 0%, transparent 70%)`,
            transform: 'scale(1.5)'
          }}
        />
      )}

      {/* Hint indicator (pulsing arrow) */}
      {isHinted && !isDiscovered && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 animate-bounce z-20">
          <svg className="w-8 h-8 text-yellow-400 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 16l-6-6h12l-6 6z" />
          </svg>
        </div>
      )}

      {/* The sprite/image */}
      <img
        src={item.sprite_url || item.vocabulary?.image_url}
        alt={item.vocabulary?.word || 'Interactive item'}
        className={`
          pointer-events-none select-none
          ${isAnimating ? 'animate-item-touch' : ''}
        `}
        style={{
          width: displayWidth,
          height: displayHeight,
          objectFit: 'contain',
          filter: isDiscovered ? 'none' : 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.5))'
        }}
        draggable={false}
      />

      {/* Discovery checkmark */}
      {isDiscovered && (
        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* CSS for animations */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.6; transform: scale(1.5); }
          50% { opacity: 1; transform: scale(1.8); }
        }
        @keyframes item-bounce {
          0%, 100% { transform: translate(-50%, -50%) translateY(0); }
          50% { transform: translate(-50%, -50%) translateY(-8px); }
        }
        @keyframes item-sway {
          0%, 100% { transform: translate(-50%, -50%) rotate(-3deg); }
          50% { transform: translate(-50%, -50%) rotate(3deg); }
        }
        @keyframes item-float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0); }
          50% { transform: translate(-50%, -50%) translateY(-5px); }
        }
        @keyframes item-breathe {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.05); }
        }
        @keyframes item-touch {
          0% { transform: scale(1); }
          30% { transform: scale(1.3); }
          60% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        @keyframes item-shake {
          0%, 100% { transform: translate(-50%, -50%) translateX(0); }
          20% { transform: translate(-50%, -50%) translateX(-5px); }
          40% { transform: translate(-50%, -50%) translateX(5px); }
          60% { transform: translate(-50%, -50%) translateX(-5px); }
          80% { transform: translate(-50%, -50%) translateX(5px); }
        }
        @keyframes item-spin {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes item-wiggle {
          0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
          25% { transform: translate(-50%, -50%) rotate(-10deg); }
          75% { transform: translate(-50%, -50%) rotate(10deg); }
        }
        @keyframes item-jump {
          0%, 100% { transform: translate(-50%, -50%) translateY(0); }
          30% { transform: translate(-50%, -50%) translateY(-20px); }
          50% { transform: translate(-50%, -50%) translateY(0); }
          70% { transform: translate(-50%, -50%) translateY(-10px); }
        }

        .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        .animate-idle-bounce { animation: item-bounce 2s ease-in-out infinite; }
        .animate-idle-sway { animation: item-sway 3s ease-in-out infinite; }
        .animate-idle-float { animation: item-float 4s ease-in-out infinite; }
        .animate-idle-breathe { animation: item-breathe 3s ease-in-out infinite; }
        .animate-touch-bounce { animation: item-touch 0.5s ease-out; }
        .animate-touch-shake { animation: item-shake 0.5s ease-out; }
        .animate-touch-spin { animation: item-spin 0.5s ease-out; }
        .animate-touch-wiggle { animation: item-wiggle 0.5s ease-out; }
        .animate-touch-jump { animation: item-jump 0.6s ease-out; }
        .animate-item-touch { animation: item-touch 0.5s ease-out; }
      `}</style>
    </button>
  )
}

/**
 * Get idle animation class based on type
 */
function getIdleAnimationClass(animationType) {
  const animations = {
    bounce: 'animate-idle-bounce',
    sway: 'animate-idle-sway',
    float: 'animate-idle-float',
    breathe: 'animate-idle-breathe',
    blink: '', // Handled separately
    none: '',
    custom: ''
  }
  return animations[animationType] || ''
}

/**
 * Get touch animation class based on type
 */
function getTouchAnimationClass(animationType) {
  const animations = {
    bounce: 'animate-touch-bounce',
    grow: 'animate-touch-bounce', // Same effect
    shake: 'animate-touch-shake',
    spin: 'animate-touch-spin',
    wiggle: 'animate-touch-wiggle',
    jump: 'animate-touch-jump',
    custom: ''
  }
  return animations[animationType] || 'animate-touch-bounce'
}
