import { useState, useEffect } from 'react'
import { useAudioManager } from '../../../hooks/useAudioManager'

/**
 * Vocabulary Touch Activity
 *
 * Students touch images to learn vocabulary words.
 * - Large, touchable image cards
 * - Audio pronunciation on touch
 * - Visual feedback
 * - Progress tracking
 */
export default function VocabularyTouchActivity({
  activity,
  content,
  ageLevel,
  controlMode,
  touchTargetSize,
  onComplete
}) {
  const audioManager = useAudioManager()
  const playWord = audioManager?.playWord
  const playSuccess = audioManager?.playSuccess
  const playTap = audioManager?.playTap

  // Safely extract vocabulary items from content
  const safeContent = content || {}
  const items = Array.isArray(safeContent.items) ? safeContent.items
    : Array.isArray(safeContent.vocabulary) ? safeContent.vocabulary
    : []
  const [touchedItems, setTouchedItems] = useState(new Set())
  const [currentItem, setCurrentItem] = useState(null)
  const [showWord, setShowWord] = useState(false)

  // Calculate grid columns based on item count and age level
  const gridCols = ageLevel === 1
    ? items.length <= 4 ? 2 : 3
    : items.length <= 6 ? 3 : 4

  function handleItemTouch(item) {
    // Allow interaction in all modes - teachers can test activities too
    playTap?.()
    setCurrentItem(item)
    setShowWord(true)

    // Play pronunciation
    if (item.audioUrl) {
      playWord?.(item.audioUrl)
    }

    // Track touched items
    setTouchedItems(prev => new Set([...prev, item.id || item.word]))

    // Hide word after 2 seconds
    setTimeout(() => {
      setShowWord(false)
      setCurrentItem(null)
    }, 2500)
  }

  // Check for completion
  useEffect(() => {
    if (touchedItems.size === items.length && items.length > 0) {
      setTimeout(() => {
        onComplete({
          score: items.length,
          maxScore: items.length,
          starsEarned: 3,
          touchedItems: Array.from(touchedItems)
        })
      }, 1000)
    }
  }, [touchedItems, items.length])

  return (
    <div className="h-full flex flex-col items-center justify-center p-4">
      {/* Instructions */}
      <div className="mb-6 text-center">
        <p className={`text-gray-700 font-medium ${ageLevel === 1 ? 'text-xl' : 'text-lg'}`}>
          {content.instructions || 'Touch the pictures to learn the words!'}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {touchedItems.size} / {items.length} touched
        </p>
      </div>

      {/* Vocabulary Grid */}
      <div
        className="grid gap-4 max-w-4xl w-full"
        style={{
          gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`
        }}
      >
        {items.map((item, index) => (
          <VocabularyCard
            key={item.id || item.word || index}
            item={item}
            isTouched={touchedItems.has(item.id || item.word)}
            isActive={currentItem?.word === item.word}
            showWord={showWord && currentItem?.word === item.word}
            onTouch={() => handleItemTouch(item)}
            ageLevel={ageLevel}
            controlMode={controlMode}
            touchTargetSize={touchTargetSize}
          />
        ))}
      </div>

      {/* Current Word Display (for younger learners) */}
      {showWord && currentItem && ageLevel <= 2 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white rounded-2xl shadow-xl px-8 py-4 z-20">
          <p className={`font-bold text-gray-800 ${ageLevel === 1 ? 'text-3xl' : 'text-2xl'}`}>
            {currentItem.word}
          </p>
          {ageLevel >= 2 && currentItem.phrase && (
            <p className="text-lg text-gray-600 mt-1">{currentItem.phrase}</p>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div className="mt-6 w-full max-w-md">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
            style={{ width: `${(touchedItems.size / items.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Vocabulary Card Component
 */
function VocabularyCard({
  item,
  isTouched,
  isActive,
  showWord,
  onTouch,
  ageLevel,
  controlMode,
  touchTargetSize
}) {
  const [isPressed, setIsPressed] = useState(false)

  // Allow interaction in all modes - teachers can test activities too
  const canTouch = true

  // Card size based on age level
  const cardSize = ageLevel === 1 ? 'h-40' : ageLevel === 2 ? 'h-36' : 'h-32'

  return (
    <button
      onClick={onTouch}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      disabled={!canTouch}
      className={`
        ${cardSize}
        bg-white rounded-2xl shadow-lg overflow-hidden
        transition-all duration-200
        focus:outline-none focus:ring-4 focus:ring-yellow-400
        relative
        ${canTouch ? 'cursor-pointer hover:shadow-xl' : 'cursor-default'}
        ${isPressed ? 'scale-95' : isActive ? 'scale-105 ring-4 ring-emerald-400' : ''}
        ${isTouched ? 'border-4 border-emerald-400' : ''}
      `}
    >
      {/* Image */}
      <div className="w-full h-full flex items-center justify-center p-2 bg-gray-50">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.word}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <span className="text-4xl">{item.emoji || '📷'}</span>
        )}
      </div>

      {/* Word label (shown when touched or for older learners) */}
      {(showWord || (isTouched && ageLevel >= 2)) && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
          <p className="text-white font-bold text-center text-lg">
            {item.word}
          </p>
        </div>
      )}

      {/* Touched indicator */}
      {isTouched && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  )
}
