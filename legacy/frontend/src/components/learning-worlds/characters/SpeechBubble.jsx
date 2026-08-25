import { useState, useEffect } from 'react'

/**
 * Speech Bubble Component
 *
 * Displays character dialogue with typewriter effect.
 * Positioned relative to the character avatar.
 */
export default function SpeechBubble({
  message,
  characterName,
  onClose,
  ageLevel = 2,
  autoClose = true,
  autoCloseDelay = 5000,
  position = 'right',
  showTypingEffect = true
}) {
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(showTypingEffect)

  // Typewriter effect
  useEffect(() => {
    if (!showTypingEffect) {
      setDisplayedText(message)
      setIsTyping(false)
      return
    }

    setDisplayedText('')
    setIsTyping(true)

    const typingSpeed = ageLevel === 1 ? 80 : ageLevel === 2 ? 50 : 30

    let index = 0
    const timer = setInterval(() => {
      if (index < message.length) {
        setDisplayedText(prev => prev + message[index])
        index++
      } else {
        setIsTyping(false)
        clearInterval(timer)
      }
    }, typingSpeed)

    return () => clearInterval(timer)
  }, [message, showTypingEffect, ageLevel])

  // Auto-close after reading time
  useEffect(() => {
    if (autoClose && !isTyping) {
      const timer = setTimeout(() => {
        onClose?.()
      }, autoCloseDelay)
      return () => clearTimeout(timer)
    }
  }, [autoClose, autoCloseDelay, isTyping, onClose])

  // Font size based on age level
  const fontSize = ageLevel === 1 ? 'text-xl' : ageLevel === 2 ? 'text-lg' : 'text-base'

  // Position classes
  const positionClasses = {
    right: 'left-full ml-4',
    left: 'right-full mr-4',
    top: 'bottom-full mb-4 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-4 left-1/2 -translate-x-1/2'
  }

  // Tail position
  const tailClasses = {
    right: '-left-2 top-1/2 -translate-y-1/2 border-r-white border-y-transparent border-l-0',
    left: '-right-2 top-1/2 -translate-y-1/2 border-l-white border-y-transparent border-r-0',
    top: '-bottom-2 left-1/2 -translate-x-1/2 border-t-white border-x-transparent border-b-0',
    bottom: '-top-2 left-1/2 -translate-x-1/2 border-b-white border-x-transparent border-t-0'
  }

  return (
    <div
      className={`
        absolute ${positionClasses[position]}
        z-30 animate-fade-in
      `}
    >
      {/* Bubble */}
      <div
        className="relative bg-white rounded-2xl shadow-xl p-4 max-w-xs"
        style={{ minWidth: '200px' }}
      >
        {/* Character name */}
        {characterName && (
          <p className="text-xs font-bold text-sky-600 mb-1 uppercase tracking-wide">
            {characterName}
          </p>
        )}

        {/* Message */}
        <p className={`${fontSize} text-gray-800 font-medium leading-relaxed`}>
          {displayedText}
          {isTyping && <span className="animate-blink">|</span>}
        </p>

        {/* Close button (for non-auto-close) */}
        {!autoClose && (
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Tail */}
        <div
          className={`
            absolute w-0 h-0
            border-8
            ${tailClasses[position]}
          `}
        />
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .animate-blink {
          animation: blink 0.8s step-end infinite;
        }
      `}</style>
    </div>
  )
}

/**
 * Quick Speech Bubble (simpler version for quick messages)
 */
export function QuickBubble({ message, onClose, duration = 2000 }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose?.()
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  return (
    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap">
      <div className="bg-white rounded-full px-4 py-2 shadow-lg text-sm font-medium text-gray-700 animate-bounce-in">
        {message}
      </div>

      <style>{`
        @keyframes bounce-in {
          0% {
            opacity: 0;
            transform: translateY(10px) scale(0.9);
          }
          50% {
            transform: translateY(-5px) scale(1.02);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-bounce-in {
          animation: bounce-in 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
