import { useState, useEffect } from 'react'
import { useAudioManager } from '../../../hooks/useAudioManager'

/**
 * Matching Game Activity
 *
 * Students match words to pictures or words to words.
 * - Large touch targets
 * - Visual feedback on selection
 * - Celebration on match
 */
export default function MatchingGameActivity({
  activity,
  content,
  ageLevel,
  controlMode,
  touchTargetSize,
  onComplete
}) {
  const audioManager = useAudioManager()
  const playTap = audioManager?.playTap
  const playSuccess = audioManager?.playSuccess
  const playError = audioManager?.playError

  // Safely extract matching pairs from content
  const safeContent = content || {}
  const pairs = Array.isArray(safeContent.pairs) ? safeContent.pairs
    : Array.isArray(safeContent.items) ? safeContent.items
    : []
  const [leftItems, setLeftItems] = useState([])
  const [rightItems, setRightItems] = useState([])
  const [selectedLeft, setSelectedLeft] = useState(null)
  const [selectedRight, setSelectedRight] = useState(null)
  const [matchedPairs, setMatchedPairs] = useState(new Set())
  const [showError, setShowError] = useState(false)

  // Initialize shuffled items
  useEffect(() => {
    const left = pairs.map((p, i) => ({ ...p, id: `left-${i}`, side: 'left' }))
    const right = pairs.map((p, i) => ({
      id: `right-${i}`,
      side: 'right',
      word: p.match || p.word,
      imageUrl: p.matchImage || p.imageUrl,
      pairId: i
    }))

    // Shuffle right items
    setLeftItems(left)
    setRightItems(shuffleArray(right))
  }, [pairs])

  function shuffleArray(array) {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  function handleLeftSelect(item) {
    if (controlMode === 'teacher') return
    if (matchedPairs.has(item.id)) return

    playTap?.()
    setSelectedLeft(item)
    setShowError(false)

    // Check match if right is already selected
    if (selectedRight) {
      checkMatch(item, selectedRight)
    }
  }

  function handleRightSelect(item) {
    if (controlMode === 'teacher') return
    if (matchedPairs.has(item.id)) return

    playTap?.()
    setSelectedRight(item)
    setShowError(false)

    // Check match if left is already selected
    if (selectedLeft) {
      checkMatch(selectedLeft, item)
    }
  }

  function checkMatch(left, right) {
    const leftIndex = parseInt(left.id.split('-')[1])
    const isMatch = right.pairId === leftIndex

    if (isMatch) {
      playSuccess?.()
      setMatchedPairs(prev => new Set([...prev, left.id, right.id]))
      setSelectedLeft(null)
      setSelectedRight(null)
    } else {
      playError?.()
      setShowError(true)
      setTimeout(() => {
        setSelectedLeft(null)
        setSelectedRight(null)
        setShowError(false)
      }, 1000)
    }
  }

  // Check completion
  useEffect(() => {
    if (matchedPairs.size === pairs.length * 2 && pairs.length > 0) {
      setTimeout(() => {
        onComplete({
          score: pairs.length,
          maxScore: pairs.length,
          starsEarned: 3
        })
      }, 1000)
    }
  }, [matchedPairs.size, pairs.length])

  const gridCols = ageLevel === 1 ? 1 : 2
  const cardSize = ageLevel === 1 ? 'h-24' : ageLevel === 2 ? 'h-20' : 'h-16'

  return (
    <div className="h-full flex flex-col items-center justify-center p-4">
      {/* Instructions */}
      <div className="mb-6 text-center">
        <p className={`text-gray-700 font-medium ${ageLevel === 1 ? 'text-xl' : 'text-lg'}`}>
          {content.instructions || 'Match the words to the pictures!'}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {matchedPairs.size / 2} / {pairs.length} matched
        </p>
      </div>

      {/* Matching Area */}
      <div className="flex gap-8 max-w-4xl w-full justify-center">
        {/* Left Column (Words/Images) */}
        <div className="flex flex-col gap-3 flex-1 max-w-xs">
          {leftItems.map(item => (
            <MatchCard
              key={item.id}
              item={item}
              isSelected={selectedLeft?.id === item.id}
              isMatched={matchedPairs.has(item.id)}
              isError={showError && selectedLeft?.id === item.id}
              onSelect={() => handleLeftSelect(item)}
              ageLevel={ageLevel}
              controlMode={controlMode}
              cardSize={cardSize}
              showImage={true}
            />
          ))}
        </div>

        {/* Center divider */}
        <div className="flex items-center">
          <div className="w-1 h-full bg-gray-200 rounded-full" />
        </div>

        {/* Right Column (Matches) */}
        <div className="flex flex-col gap-3 flex-1 max-w-xs">
          {rightItems.map(item => (
            <MatchCard
              key={item.id}
              item={item}
              isSelected={selectedRight?.id === item.id}
              isMatched={matchedPairs.has(item.id)}
              isError={showError && selectedRight?.id === item.id}
              onSelect={() => handleRightSelect(item)}
              ageLevel={ageLevel}
              controlMode={controlMode}
              cardSize={cardSize}
              showImage={!leftItems[0]?.imageUrl} // Show image if left shows words
            />
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-6 w-full max-w-md">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
            style={{ width: `${(matchedPairs.size / (pairs.length * 2)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Match Card Component
 */
function MatchCard({
  item,
  isSelected,
  isMatched,
  isError,
  onSelect,
  ageLevel,
  controlMode,
  cardSize,
  showImage
}) {
  const canTouch = controlMode !== 'teacher'

  return (
    <button
      onClick={onSelect}
      disabled={!canTouch || isMatched}
      className={`
        ${cardSize}
        w-full rounded-xl transition-all duration-200
        focus:outline-none focus:ring-4 focus:ring-yellow-400
        flex items-center justify-center gap-3 px-4
        ${isMatched
          ? 'bg-emerald-100 border-2 border-emerald-400 opacity-60'
          : isError
            ? 'bg-red-100 border-2 border-red-400 animate-shake'
            : isSelected
              ? 'bg-sky-100 border-2 border-sky-400 scale-105 shadow-lg'
              : 'bg-white border-2 border-gray-200 hover:border-gray-300 shadow-md'
        }
        ${canTouch && !isMatched ? 'cursor-pointer hover:shadow-lg' : 'cursor-default'}
      `}
    >
      {/* Image */}
      {showImage && item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={item.word}
          className="w-12 h-12 object-contain"
        />
      )}

      {/* Word */}
      <span className={`font-bold text-gray-800 ${ageLevel === 1 ? 'text-xl' : 'text-lg'}`}>
        {item.word}
      </span>

      {/* Matched indicator */}
      {isMatched && (
        <span className="ml-auto text-emerald-500 text-xl">✓</span>
      )}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-5px); }
          40%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </button>
  )
}
