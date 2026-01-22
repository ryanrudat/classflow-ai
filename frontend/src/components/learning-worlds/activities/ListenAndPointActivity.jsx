import { useState, useEffect } from 'react'
import { useAudioManager } from '../../../hooks/useAudioManager'

/**
 * Listen and Point Activity
 *
 * Students hear a word and touch the matching image.
 * - Audio prompt plays automatically
 * - Multiple images to choose from
 * - Immediate feedback on selection
 */
export default function ListenAndPointActivity({
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
  const playError = audioManager?.playError
  const playTap = audioManager?.playTap

  // Safely extract items from content
  const safeContent = content || {}
  const items = Array.isArray(safeContent.items) ? safeContent.items
    : Array.isArray(safeContent.vocabulary) ? safeContent.vocabulary
    : []
  const [currentIndex, setCurrentIndex] = useState(0)
  const [options, setOptions] = useState([])
  const [selected, setSelected] = useState(null)
  const [isCorrect, setIsCorrect] = useState(null)
  const [score, setScore] = useState(0)
  const [showingResult, setShowingResult] = useState(false)

  // Current target item
  const currentItem = items[currentIndex]

  // Generate options (current item + distractors)
  useEffect(() => {
    if (!currentItem) return

    // Get 3-4 distractors (depending on age level)
    const numDistractors = ageLevel === 1 ? 2 : ageLevel === 2 ? 3 : 4
    const distractors = items
      .filter((_, i) => i !== currentIndex)
      .sort(() => Math.random() - 0.5)
      .slice(0, numDistractors)

    // Combine and shuffle
    const allOptions = [currentItem, ...distractors].sort(() => Math.random() - 0.5)
    setOptions(allOptions)

    // Play audio prompt after a short delay
    setTimeout(() => {
      if (currentItem?.audioUrl) {
        playWord?.(currentItem.audioUrl)
      }
    }, 500)
  }, [currentIndex, items, playWord])

  function handleOptionSelect(option) {
    // Allow interaction in all modes - teachers can test activities too
    if (showingResult) return

    playTap?.()
    setSelected(option)
    setShowingResult(true)

    const correct = option.word === currentItem?.word
    setIsCorrect(correct)

    if (correct) {
      playSuccess?.()
      setScore(prev => prev + 1)
    } else {
      playError?.()
    }

    // Move to next after delay
    setTimeout(() => {
      if (currentIndex < items.length - 1) {
        setCurrentIndex(prev => prev + 1)
        setSelected(null)
        setIsCorrect(null)
        setShowingResult(false)
      } else {
        // Activity complete
        onComplete({
          score: score + (correct ? 1 : 0),
          maxScore: items.length,
          starsEarned: Math.ceil(((score + (correct ? 1 : 0)) / items.length) * 3)
        })
      }
    }, 1500)
  }

  function handleReplayAudio() {
    if (currentItem?.audioUrl) {
      playWord?.(currentItem.audioUrl)
    }
  }

  const gridCols = ageLevel === 1 ? 2 : options.length <= 4 ? 2 : 3
  const cardSize = ageLevel === 1 ? 'h-40' : ageLevel === 2 ? 'h-36' : 'h-32'

  return (
    <div className="h-full flex flex-col items-center justify-center p-4">
      {/* Progress */}
      <div className="mb-4 text-center">
        <p className="text-sm text-gray-500">
          Question {currentIndex + 1} of {items.length}
        </p>
        <div className="mt-2 w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-sky-500 transition-all duration-300 rounded-full"
            style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Instruction */}
      <div className="mb-6 text-center">
        <p className={`text-gray-700 font-medium ${ageLevel === 1 ? 'text-2xl' : 'text-xl'}`}>
          {ageLevel === 1 ? 'Touch what you hear!' : 'Listen and point to the picture'}
        </p>
      </div>

      {/* Play Audio Button */}
      <button
        onClick={handleReplayAudio}
        className="mb-6 flex items-center gap-3 px-6 py-3 bg-sky-500 text-white rounded-full font-semibold hover:bg-sky-600 transition-colors shadow-lg"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
        <span className={ageLevel === 1 ? 'text-lg' : 'text-base'}>
          {ageLevel === 1 ? 'Hear it again!' : 'Play Again'}
        </span>
      </button>

      {/* Options Grid */}
      <div
        className="grid gap-4 max-w-3xl w-full"
        style={{
          gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`
        }}
      >
        {options.map((option, index) => (
          <OptionCard
            key={option.id || option.word}
            option={option}
            isSelected={selected?.word === option.word}
            isCorrect={showingResult && option.word === currentItem.word}
            isWrong={showingResult && selected?.word === option.word && option.word !== currentItem.word}
            onSelect={() => handleOptionSelect(option)}
            ageLevel={ageLevel}
            controlMode={controlMode}
            cardSize={cardSize}
          />
        ))}
      </div>

      {/* Score */}
      <div className="mt-6 text-center">
        <p className="text-gray-500">
          Score: <span className="font-bold text-emerald-600">{score}</span> / {items.length}
        </p>
      </div>
    </div>
  )
}

/**
 * Option Card Component
 */
function OptionCard({
  option,
  isSelected,
  isCorrect,
  isWrong,
  onSelect,
  ageLevel,
  controlMode,
  cardSize
}) {
  const canTouch = true // Allow interaction in all modes

  return (
    <button
      onClick={onSelect}
      disabled={!canTouch}
      className={`
        ${cardSize}
        bg-white rounded-2xl shadow-lg overflow-hidden
        transition-all duration-200
        focus:outline-none focus:ring-4 focus:ring-yellow-400
        ${canTouch ? 'cursor-pointer hover:shadow-xl' : 'cursor-default'}
        ${isCorrect
          ? 'ring-4 ring-emerald-400 bg-emerald-50 scale-105'
          : isWrong
            ? 'ring-4 ring-red-400 bg-red-50 animate-shake'
            : isSelected
              ? 'ring-4 ring-sky-400 scale-105'
              : ''
        }
      `}
    >
      {/* Image */}
      <div className="w-full h-full flex items-center justify-center p-2 bg-gray-50">
        {option.imageUrl ? (
          <img
            src={option.imageUrl}
            alt={option.word}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <span className="text-5xl">{option.emoji || '📷'}</span>
        )}
      </div>

      {/* Result indicator */}
      {(isCorrect || isWrong) && (
        <div className={`absolute inset-0 flex items-center justify-center ${isCorrect ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
          <span className="text-4xl">
            {isCorrect ? '✓' : '✗'}
          </span>
        </div>
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
