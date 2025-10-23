import { useState, useEffect } from 'react'
// No longer importing useSocket - WebSocket functions come from props

/**
 * StudentPresentationViewer - Student's view during a live presentation
 * Displays slides and handles navigation based on presentation mode
 */
export default function StudentPresentationViewer({ deck, sessionId, studentId, on, off, emit }) {
  const [currentSlideNumber, setCurrentSlideNumber] = useState(1)
  const [mode, setMode] = useState(deck?.initialMode || 'student') // 'teacher', 'student', 'bounded'
  const [checkpoints, setCheckpoints] = useState([])
  const [canNavigate, setCanNavigate] = useState(deck?.initialMode !== 'teacher')

  // Track question answers per slide (slideId -> selectedIndex)
  const [questionAnswers, setQuestionAnswers] = useState({})

  // WebSocket functions now received as props - NO second connection created!
  const currentSlide = deck?.slides?.find(s => s.slideNumber === currentSlideNumber)
  const totalSlides = deck?.slides?.length || 0
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

  // Listen for presentation events
  // CRITICAL FIX: Removed currentSlideNumber and currentSlide?.id from dependencies
  // to prevent event listener re-registration on every navigation
  useEffect(() => {
    console.log('🎧 StudentPresentationViewer setting up event listeners')
    console.log('   Session ID:', sessionId)
    console.log('   Student ID:', studentId)
    console.log('   Deck ID:', deck?.id)
    console.log('   Initial mode:', mode)

    const handleTeacherNavigated = ({ slideNumber }) => {
      console.log('📡 Student received teacher-navigated event:', slideNumber)
      // Use functional update to get current mode without dependency
      setMode(currentMode => {
        console.log('  Current mode:', currentMode)
        if (currentMode === 'teacher') {
          console.log('  ✅ Following teacher to slide', slideNumber)
          setCurrentSlideNumber(slideNumber)
        } else {
          console.log('  ⏭️ Ignoring - not in teacher-paced mode')
        }
        return currentMode
      })
    }

    const handleModeChanged = ({ mode: newMode, deckId: eventDeckId }) => {
      console.log('📡 Student received mode-changed event!')
      console.log('   Event mode:', newMode)
      console.log('   Event deckId:', eventDeckId)
      console.log('   Current deck:', deck?.id)

      setMode(currentMode => {
        console.log('   Current mode (before update):', currentMode)
        console.log('   ✅ Mode state updated to:', newMode)
        return newMode
      })

      setCanNavigate(newMode !== 'teacher')
      console.log('   ✅ Can navigate:', newMode !== 'teacher')

      // Verify state update by logging after a tick
      setTimeout(() => {
        console.log('   🔍 Mode state after update:', newMode)
      }, 100)
    }

    const handleCheckpointsUpdated = ({ checkpoints: newCheckpoints }) => {
      console.log('📡 Student received checkpoints-updated event:', newCheckpoints)
      setCheckpoints(newCheckpoints)
    }

    // When teacher joins, announce student presence
    const handleUserJoined = ({ role, studentId: joinedStudentId }) => {
      if (role === 'teacher') {
        console.log('👨‍🏫 Teacher joined the presentation! Announcing student presence')
        // Announce this student's presence by emitting current slide
        if (studentId) {
          setTimeout(() => {
            // Use functional update to get current slide number without dependency
            setCurrentSlideNumber(currentNum => {
              console.log('  📢 Student announcing presence on slide', currentNum)
              const currentSlideData = deck?.slides?.find(s => s.slideNumber === currentNum)
              emit('student-navigated', {
                slideNumber: currentNum,
                slideId: currentSlideData?.id
              })
              return currentNum // Don't change the value
            })
          }, 200)
        }
      }
    }

    on('teacher-navigated', handleTeacherNavigated)
    on('mode-changed', handleModeChanged)
    on('checkpoints-updated', handleCheckpointsUpdated)
    on('user-joined', handleUserJoined)

    console.log('🎧 Student registered event listeners')
    console.log('   ✅ FIX APPLIED: Event listeners will NOT re-register on navigation')

    return () => {
      off('teacher-navigated', handleTeacherNavigated)
      off('mode-changed', handleModeChanged)
      off('checkpoints-updated', handleCheckpointsUpdated)
      off('user-joined', handleUserJoined)
      console.log('🔇 Student unregistered event listeners')
    }
  }, [on, off, emit, studentId, deck?.id, deck?.slides])

  // Track slide progress
  useEffect(() => {
    if (!currentSlide || !studentId) return

    // Emit that student started viewing this slide
    emit('slide-started', { slideId: currentSlide.id, studentId })

    // Track time on slide
    const startTime = Date.now()

    return () => {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000)
      if (timeSpent > 3) { // Only count if spent more than 3 seconds
        emit('slide-completed', {
          slideId: currentSlide.id,
          studentId,
          timeSpent
        })
      }
    }
  }, [currentSlide?.id, studentId, emit])

  // Emit navigation events
  useEffect(() => {
    if (!currentSlide) return
    emit('student-navigated', {
      slideNumber: currentSlideNumber,
      slideId: currentSlide.id
    })
  }, [currentSlideNumber, currentSlide?.id, emit])

  const handleNext = () => {
    if (!canNavigate) return

    const nextSlide = currentSlideNumber + 1

    // In bounded mode, check if we can go past checkpoints
    if (mode === 'bounded' && checkpoints.includes(nextSlide)) {
      alert('You\'ve reached a checkpoint. Please wait for the teacher.')
      return
    }

    if (nextSlide <= totalSlides) {
      setCurrentSlideNumber(nextSlide)
    }
  }

  const handlePrevious = () => {
    if (!canNavigate) return

    const prevSlide = currentSlideNumber - 1
    if (prevSlide >= 1) {
      setCurrentSlideNumber(prevSlide)
    }
  }

  const handleAnswerQuestion = (optionIndex) => {
    if (!currentSlide?.question || !currentSlide?.id) return

    // Mark this answer
    setQuestionAnswers(prev => ({
      ...prev,
      [currentSlide.id]: optionIndex
    }))

    // Check if correct
    const isCorrect = currentSlide.question.correct === optionIndex

    // Emit answer to teacher
    emit('student-answered-question', {
      slideId: currentSlide.id,
      slideNumber: currentSlideNumber,
      studentId,
      selectedOption: optionIndex,
      isCorrect,
      timestamp: Date.now()
    })

    console.log('📝 Student answered question:', {
      slideId: currentSlide.id,
      option: optionIndex,
      correct: isCorrect
    })
  }

  const getModeColor = () => {
    switch (mode) {
      case 'teacher':
        return 'bg-red-600'
      case 'bounded':
        return 'bg-amber-600'
      default:
        return 'bg-green-600'
    }
  }

  const getModeText = () => {
    switch (mode) {
      case 'teacher':
        return '🔒 Teacher-Paced (Follow along)'
      case 'bounded':
        return '⚡ Bounded (Checkpoints enabled)'
      default:
        return '🟢 Student-Paced (Navigate freely)'
    }
  }

  if (!deck || !currentSlide) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-gray-600">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-xl">Loading presentation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Top bar */}
      <header className="bg-gray-800 px-4 py-3 text-white">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-lg font-bold">{deck.title}</h1>
            <p className="text-sm text-gray-400">Slide {currentSlideNumber} / {totalSlides}</p>
          </div>

          <div className={`${getModeColor()} text-white px-4 py-2 rounded-lg text-sm font-medium`}>
            {getModeText()}
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 justify-center mt-2">
          {Array.from({ length: totalSlides }).map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index + 1 === currentSlideNumber
                  ? 'w-8 bg-blue-500' // Current slide - wider and blue
                  : index + 1 < currentSlideNumber
                  ? 'w-2 bg-green-500' // Completed - green dot
                  : 'w-2 bg-gray-600' // Not yet viewed - gray dot
              }`}
              title={`Slide ${index + 1}`}
            />
          ))}
        </div>
      </header>

      {/* Main slide area */}
      <main className="flex-1 flex items-center justify-center p-8 overflow-hidden">
        <div className="bg-white rounded-lg shadow-2xl p-12 max-w-4xl w-full max-h-[calc(100vh-16rem)] overflow-y-auto flex flex-col">
          {/* Slide title */}
          {currentSlide.title && (
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              {currentSlide.title}
            </h2>
          )}

          {/* Slide body */}
          {currentSlide.body && (
            <div
              className="prose prose-lg max-w-none mb-6 flex-1"
              dangerouslySetInnerHTML={{ __html: currentSlide.body }}
            />
          )}

          {/* Image */}
          {currentSlide.image && (
            <div className={`mb-6 flex-shrink-0 ${
              currentSlide.image.position === 'center' ? 'text-center' :
              currentSlide.image.position === 'right' ? 'text-right' :
              'text-left'
            }`}>
              <img
                src={`${API_URL}${currentSlide.image.url}`}
                alt={currentSlide.image.alt || ''}
                style={{
                  width: currentSlide.image.width || 'auto',
                  maxWidth: '100%',
                  maxHeight: '55vh',
                  height: 'auto',
                  objectFit: 'contain'
                }}
                className="rounded-lg shadow-lg inline-block"
              />
            </div>
          )}

          {/* Question - Interactive */}
          {currentSlide.question && (
            <div className="mt-6 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <h3 className="font-bold text-xl text-gray-900 mb-4">
                {currentSlide.question.text}
              </h3>

              {currentSlide.question.type === 'multiple_choice' && (
                <div className="space-y-3">
                  {currentSlide.question.options.map((option, index) => {
                    const selectedAnswer = questionAnswers[currentSlide.id]
                    const isSelected = selectedAnswer === index
                    const hasAnswered = selectedAnswer !== undefined
                    const isCorrect = currentSlide.question.correct === index

                    // Determine styling based on state
                    let borderColor = 'border-gray-300'
                    let bgColor = 'bg-white hover:bg-gray-50'
                    let textColor = 'text-gray-900'

                    if (hasAnswered) {
                      if (isSelected) {
                        // Show feedback for selected answer
                        if (isCorrect) {
                          borderColor = 'border-green-500'
                          bgColor = 'bg-green-50'
                          textColor = 'text-green-900'
                        } else {
                          borderColor = 'border-red-500'
                          bgColor = 'bg-red-50'
                          textColor = 'text-red-900'
                        }
                      } else if (isCorrect) {
                        // Show correct answer even if not selected
                        borderColor = 'border-green-400'
                        bgColor = 'bg-green-50'
                        textColor = 'text-green-800'
                      }
                    }

                    return (
                      <button
                        key={index}
                        onClick={() => !hasAnswered && handleAnswerQuestion(index)}
                        disabled={hasAnswered}
                        className={`w-full p-4 border-2 ${borderColor} ${bgColor} rounded-lg text-left transition-all ${
                          !hasAnswered ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-not-allowed'
                        }`}
                      >
                        <span className={`text-lg font-medium ${textColor} flex items-center justify-between`}>
                          <span>
                            {String.fromCharCode(65 + index)}. {option}
                          </span>
                          {hasAnswered && (
                            <span className="ml-2 flex items-center gap-2">
                              {isSelected && isCorrect && <><span className="text-2xl">✅</span><span className="text-sm font-bold">You!</span></>}
                              {isSelected && !isCorrect && <><span className="text-2xl">❌</span><span className="text-sm font-bold">You!</span></>}
                              {!isSelected && isCorrect && <span className="text-green-600 text-xl">✓</span>}
                            </span>
                          )}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {questionAnswers[currentSlide.id] !== undefined && (
                <div className={`mt-4 p-3 rounded-lg ${
                  currentSlide.question.correct === questionAnswers[currentSlide.id]
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {currentSlide.question.correct === questionAnswers[currentSlide.id]
                    ? '🎉 Correct! Great job!'
                    : '❌ Incorrect. The correct answer is highlighted above.'}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Navigation controls */}
      <footer className="bg-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentSlideNumber === 1 || !canNavigate}
            className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>

          <div className="flex gap-2">
            {deck.slides.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => canNavigate && setCurrentSlideNumber(index + 1)}
                disabled={!canNavigate}
                className={`w-10 h-10 rounded transition-colors ${
                  index + 1 === currentSlideNumber
                    ? 'bg-blue-600 text-white'
                    : checkpoints.includes(index + 1)
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                } disabled:cursor-not-allowed`}
                title={checkpoints.includes(index + 1) ? 'Checkpoint' : `Slide ${index + 1}`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={currentSlideNumber === totalSlides || !canNavigate}
            className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      </footer>

      {/* Navigation hint */}
      {canNavigate && (
        <div className="fixed bottom-20 left-4 bg-gray-800 bg-opacity-90 text-white text-xs px-3 py-2 rounded shadow-lg">
          <div>← → Arrow keys to navigate</div>
        </div>
      )}
    </div>
  )
}
