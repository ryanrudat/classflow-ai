import { useState, useEffect, useRef } from 'react'
import { useAudioManager } from '../../../hooks/useAudioManager'
import P5Canvas from '../p5/P5Canvas'
import { tracingSketch } from '../p5/sketches/tracingSketch'

/**
 * Tracing Activity
 *
 * Children trace letters or words with their finger.
 * Uses P5.js for smooth drawing and visual feedback.
 */
export default function TracingActivity({
  activity,
  content,
  ageLevel,
  controlMode,
  touchTargetSize,
  onComplete
}) {
  const audioManager = useAudioManager()
  const playSuccess = audioManager?.playSuccess
  const playWord = audioManager?.playWord

  // Safely extract items from content
  const safeContent = content || {}
  const items = Array.isArray(safeContent.items) ? safeContent.items
    : Array.isArray(safeContent.letters) ? safeContent.letters
    : [{ letter: 'A', word: 'Apple' }]

  const [currentIndex, setCurrentIndex] = useState(0)
  const [completedItems, setCompletedItems] = useState([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [attempts, setAttempts] = useState(0)

  const currentItem = items[currentIndex] || items[0]

  // Letter size based on age level
  const letterSize = ageLevel === 1 ? 350 : ageLevel === 2 ? 300 : 250

  function handleTraceComplete(result) {
    if (result.success) {
      playSuccess?.()

      // Play word pronunciation if available
      if (currentItem.audioUrl) {
        setTimeout(() => playWord?.(currentItem.audioUrl), 500)
      }

      setShowSuccess(true)
      setCompletedItems(prev => [...prev, currentIndex])

      setTimeout(() => {
        setShowSuccess(false)

        if (currentIndex < items.length - 1) {
          // Move to next letter
          setCurrentIndex(prev => prev + 1)
          setAttempts(0)
        } else {
          // Activity complete
          onComplete({
            score: completedItems.length + 1,
            maxScore: items.length,
            starsEarned: calculateStars(attempts, items.length),
            tracedItems: [...completedItems, currentIndex]
          })
        }
      }, 1500)
    } else {
      setAttempts(prev => prev + 1)
    }
  }

  function calculateStars(totalAttempts, itemCount) {
    const avgAttempts = totalAttempts / itemCount
    if (avgAttempts <= 1) return 3
    if (avgAttempts <= 2) return 2
    return 1
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-4 relative">
      {/* Instructions */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 text-center">
        <p className={`text-gray-700 font-medium ${ageLevel === 1 ? 'text-xl' : 'text-lg'}`}>
          {content.instructions || `Trace the letter "${currentItem.letter}"`}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {currentIndex + 1} / {items.length}
        </p>
      </div>

      {/* Word hint */}
      {currentItem.word && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl px-6 py-3 shadow-md">
            <p className={`font-bold text-gray-800 ${ageLevel === 1 ? 'text-2xl' : 'text-xl'}`}>
              <span className="text-blue-600">{currentItem.letter}</span> is for{' '}
              <span className="text-emerald-600">{currentItem.word}</span>
            </p>
          </div>
        </div>
      )}

      {/* P5.js Tracing Canvas */}
      <div className="flex-1 w-full max-w-2xl relative">
        <P5Canvas
          sketch={tracingSketch}
          props={{
            letter: currentItem.letter,
            letterSize: letterSize,
            guideColor: '#E5E7EB',
            strokeColor: '#3B82F6',
            strokeWidth: ageLevel === 1 ? 24 : ageLevel === 2 ? 20 : 16,
            onComplete: handleTraceComplete
          }}
          frameRate={60}
        />
      </div>

      {/* Success overlay */}
      {showSuccess && (
        <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20 z-20">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center animate-bounce-in">
            <div className="text-5xl mb-2">🎉</div>
            <p className="text-2xl font-bold text-emerald-600">Great Job!</p>
            {currentItem.phrase && (
              <p className="text-lg text-gray-600 mt-2">{currentItem.phrase}</p>
            )}
          </div>
        </div>
      )}

      {/* Progress dots */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
        {items.map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-colors ${
              completedItems.includes(i)
                ? 'bg-emerald-500'
                : i === currentIndex
                  ? 'bg-blue-500'
                  : 'bg-gray-300'
            }`}
          />
        ))}
      </div>

      {/* Retry hint */}
      {attempts > 2 && !showSuccess && (
        <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 z-10">
          <p className="text-gray-500 text-sm bg-white/80 rounded-lg px-4 py-2">
            Follow the dotted line from the green dot!
          </p>
        </div>
      )}

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
          animation: bounce-in 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
