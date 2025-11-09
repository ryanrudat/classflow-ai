import { useState, useEffect } from 'react'
import { useSocket } from '../../hooks/useSocket'

/**
 * SlideViewer - Student view component for presentations
 * Handles locked/unlocked states, navigation, and real-time sync
 */
export default function SlideViewer({ deck, initialSlideNumber = 1, studentId }) {
  const [currentSlideNumber, setCurrentSlideNumber] = useState(initialSlideNumber)
  const [isLocked, setIsLocked] = useState(false)
  const [mode, setMode] = useState('student') // 'teacher', 'student', 'bounded'
  const [checkpoints, setCheckpoints] = useState([])
  const [slideStartTime, setSlideStartTime] = useState(Date.now())
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)

  const { on, off, emit } = useSocket()

  // Find current slide
  const currentSlide = deck?.slides?.find(s => s.slideNumber === currentSlideNumber)
  const totalSlides = deck?.slides?.length || 0

  // Listen for WebSocket events
  useEffect(() => {
    if (!deck) return

    // Presentation started
    const handlePresentationStarted = ({ mode: newMode, currentSlide }) => {
      setMode(newMode)
      setIsLocked(newMode === 'teacher')
      if (currentSlide) {
        setCurrentSlideNumber(currentSlide)
      }
    }

    // Teacher navigated to a slide (teacher-paced mode)
    const handleTeacherNavigated = ({ slideNumber }) => {
      setCurrentSlideNumber(slideNumber)
      setSlideStartTime(Date.now())
    }

    // Mode changed
    const handleModeChanged = ({ mode: newMode }) => {
      setMode(newMode)
      setIsLocked(newMode === 'teacher')
    }

    // Checkpoints updated (bounded mode)
    const handleCheckpointsUpdated = ({ checkpoints: newCheckpoints }) => {
      setCheckpoints(newCheckpoints)
    }

    on('presentation-started', handlePresentationStarted)
    on('teacher-navigated', handleTeacherNavigated)
    on('mode-changed', handleModeChanged)
    on('checkpoints-updated', handleCheckpointsUpdated)

    return () => {
      off('presentation-started', handlePresentationStarted)
      off('teacher-navigated', handleTeacherNavigated)
      off('mode-changed', handleModeChanged)
      off('checkpoints-updated', handleCheckpointsUpdated)
    }
  }, [deck, on, off])

  // Track slide start and reset quiz state
  useEffect(() => {
    if (!currentSlide || !studentId) return

    setSlideStartTime(Date.now())
    setSelectedAnswer(null)
    setHasSubmitted(false)
    setShowFeedback(false)

    // Emit slide-started event
    emit('slide-started', {
      slideId: currentSlide.id,
      studentId
    })
  }, [currentSlide?.id, studentId, emit])

  const handleNext = () => {
    if (isLocked) return

    const nextNumber = currentSlideNumber + 1

    // Check if blocked by checkpoint in bounded mode
    if (mode === 'bounded' && checkpoints.includes(currentSlideNumber)) {
      // Student is at a checkpoint - cannot proceed
      return
    }

    if (nextNumber <= totalSlides) {
      // Mark current slide as completed
      const timeSpent = Math.floor((Date.now() - slideStartTime) / 1000)
      emit('slide-completed', {
        slideId: currentSlide.id,
        timeSpent,
        studentId
      })

      setCurrentSlideNumber(nextNumber)

      // Emit navigation event
      emit('student-navigated', {
        slideNumber: nextNumber,
        slideId: deck.slides[nextNumber - 1]?.id
      })
    }
  }

  const handlePrevious = () => {
    if (isLocked) return

    const prevNumber = currentSlideNumber - 1
    if (prevNumber >= 1) {
      setCurrentSlideNumber(prevNumber)

      // Emit navigation event
      emit('student-navigated', {
        slideNumber: prevNumber,
        slideId: deck.slides[prevNumber - 1]?.id
      })
    }
  }

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null || hasSubmitted) return

    setHasSubmitted(true)
    setShowFeedback(true)

    // Emit answer to teacher
    emit('question-answered', {
      slideId: currentSlide.id,
      studentId,
      answer: selectedAnswer,
      correct: selectedAnswer === currentSlide.question.correct,
      questionText: currentSlide.question.text
    })
  }

  if (!deck || !currentSlide) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📚</div>
          <p className="text-gray-600">Loading presentation...</p>
        </div>
      </div>
    )
  }

  // Locked screen view
  if (isLocked) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-8xl mb-6">🔒</div>
          <h2 className="text-3xl font-bold mb-3">Teacher is presenting</h2>
          <p className="text-gray-300 text-lg">Please look at the board</p>
        </div>
      </div>
    )
  }

  // Checkpoint blocked view
  const isAtCheckpoint = mode === 'bounded' && checkpoints.includes(currentSlideNumber)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{deck.title}</h1>
            <p className="text-sm text-gray-600">
              Slide {currentSlideNumber} of {totalSlides}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              mode === 'teacher' ? 'bg-red-100 text-red-700' :
              mode === 'bounded' ? 'bg-amber-100 text-amber-700' :
              'bg-green-100 text-green-700'
            }`}>
              {mode === 'teacher' ? '🔒 Teacher-Paced' :
               mode === 'bounded' ? '⚡ Guided' :
               '🟢 Free Navigate'}
            </div>
          </div>
        </div>
      </header>

      {/* Main slide content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-12 min-h-[500px] flex flex-col">
          {/* Slide Title */}
          {currentSlide.title && (
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              {currentSlide.title}
            </h2>
          )}

          {/* Slide Body */}
          {currentSlide.body && (
            <div
              className="max-w-none mb-6 flex-1"
              dangerouslySetInnerHTML={{ __html: currentSlide.body }}
            />
          )}

          {/* Image */}
          {currentSlide.image && (
            <div className={`mb-6 ${
              currentSlide.image.position === 'center' ? 'text-center' :
              currentSlide.image.position === 'right' ? 'text-right' :
              'text-left'
            }`}>
              <img
                src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${currentSlide.image.url}`}
                alt={currentSlide.image.alt || ''}
                style={{
                  width: currentSlide.image.width || 'auto',
                  maxWidth: '100%',
                  height: 'auto'
                }}
                className="rounded-lg shadow-md inline-block"
              />
            </div>
          )}

          {/* Question */}
          {currentSlide.question && (
            <div className="mt-6 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <h3 className="font-bold text-xl text-gray-900 mb-4">
                {currentSlide.question.text}
              </h3>

              {currentSlide.question.type === 'multiple_choice' && (
                <>
                  <div className="space-y-2 mb-4">
                    {currentSlide.question.options.map((option, index) => {
                      const isCorrect = index === currentSlide.question.correct
                      const isSelected = selectedAnswer === index
                      const showCorrectness = showFeedback

                      return (
                        <label
                          key={index}
                          className={`flex items-center p-3 border-2 rounded-lg transition-all cursor-pointer ${
                            !hasSubmitted ? 'bg-white border-gray-200 hover:border-blue-400' :
                            showCorrectness && isCorrect ? 'bg-green-100 border-green-500' :
                            showCorrectness && isSelected && !isCorrect ? 'bg-red-100 border-red-500' :
                            'bg-white border-gray-200'
                          }`}
                        >
                          <input
                            type="radio"
                            name="question"
                            value={index}
                            checked={selectedAnswer === index}
                            onChange={() => !hasSubmitted && setSelectedAnswer(index)}
                            disabled={hasSubmitted}
                            className="mr-3 w-4 h-4"
                          />
                          <span className="text-gray-900 flex-1">
                            {String.fromCharCode(65 + index)}. {option}
                          </span>
                          {showCorrectness && isCorrect && (
                            <span className="ml-2 text-green-600 font-bold">✓ Correct</span>
                          )}
                          {showCorrectness && isSelected && !isCorrect && (
                            <span className="ml-2 text-red-600 font-bold">✗ Incorrect</span>
                          )}
                        </label>
                      )
                    })}
                  </div>

                  {!hasSubmitted ? (
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={selectedAnswer === null}
                      className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Submit Answer
                    </button>
                  ) : (
                    <div className={`p-4 rounded-lg text-center font-medium ${
                      selectedAnswer === currentSlide.question.correct
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedAnswer === currentSlide.question.correct
                        ? '🎉 Correct! Great job!'
                        : '❌ Not quite right. Review the correct answer above.'}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Checkpoint banner */}
        {isAtCheckpoint && (
          <div className="mt-4 bg-amber-100 border-2 border-amber-400 rounded-lg p-6 text-center">
            <div className="text-4xl mb-3">⏸️</div>
            <h3 className="text-xl font-bold text-amber-900 mb-2">
              Checkpoint - Waiting for class
            </h3>
            <p className="text-amber-800">
              Your teacher will continue the lesson when everyone is ready.
            </p>
          </div>
        )}
      </main>

      {/* Navigation Footer */}
      <footer className="bg-white border-t shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={currentSlideNumber === 1 || isLocked}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>

          <div className="text-sm text-gray-600">
            {currentSlideNumber} / {totalSlides}
          </div>

          <button
            onClick={handleNext}
            disabled={currentSlideNumber === totalSlides || isLocked || isAtCheckpoint}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      </footer>
    </div>
  )
}
