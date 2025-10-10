import { useState, useEffect } from 'react'
import { useSocket } from '../../hooks/useSocket'

/**
 * StudentPresentationViewer - Student's view during a live presentation
 * Displays slides and handles navigation based on presentation mode
 */
export default function StudentPresentationViewer({ deck, sessionId, studentId }) {
  const [currentSlideNumber, setCurrentSlideNumber] = useState(1)
  const [mode, setMode] = useState(deck?.initialMode || 'student') // 'teacher', 'student', 'bounded'
  const [checkpoints, setCheckpoints] = useState([])
  const [canNavigate, setCanNavigate] = useState(deck?.initialMode !== 'teacher')

  const { on, off, emit } = useSocket()
  const currentSlide = deck?.slides?.find(s => s.slideNumber === currentSlideNumber)
  const totalSlides = deck?.slides?.length || 0
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

  // Listen for presentation events
  useEffect(() => {
    const handleTeacherNavigated = ({ slideNumber }) => {
      console.log('📡 Student received teacher-navigated event:', slideNumber)
      // Get current mode from state
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

    const handleModeChanged = ({ mode: newMode }) => {
      console.log('📡 Student received mode-changed event:', newMode)
      setMode(newMode)
      setCanNavigate(newMode !== 'teacher')
      console.log('  ✅ Mode updated. Can navigate:', newMode !== 'teacher')
    }

    const handleCheckpointsUpdated = ({ checkpoints: newCheckpoints }) => {
      console.log('📡 Student received checkpoints-updated event:', newCheckpoints)
      setCheckpoints(newCheckpoints)
    }

    on('teacher-navigated', handleTeacherNavigated)
    on('mode-changed', handleModeChanged)
    on('checkpoints-updated', handleCheckpointsUpdated)

    console.log('🎧 Student registered event listeners')

    return () => {
      off('teacher-navigated', handleTeacherNavigated)
      off('mode-changed', handleModeChanged)
      off('checkpoints-updated', handleCheckpointsUpdated)
      console.log('🔇 Student unregistered event listeners')
    }
  }, [on, off])

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
      <header className="bg-gray-800 px-4 py-3 flex items-center justify-between text-white">
        <div>
          <h1 className="text-lg font-bold">{deck.title}</h1>
          <p className="text-sm text-gray-400">Slide {currentSlideNumber} / {totalSlides}</p>
        </div>

        <div className={`${getModeColor()} text-white px-4 py-2 rounded-lg text-sm font-medium`}>
          {getModeText()}
        </div>
      </header>

      {/* Main slide area */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white rounded-lg shadow-2xl p-12 max-w-4xl w-full min-h-[500px] flex flex-col">
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
            <div className={`mb-6 ${
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
                  height: 'auto'
                }}
                className="rounded-lg shadow-lg inline-block"
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
                <div className="space-y-2">
                  {currentSlide.question.options.map((option, index) => (
                    <div
                      key={index}
                      className="p-3 bg-white border-2 border-gray-200 rounded-lg"
                    >
                      <span className="text-lg text-gray-900">
                        {String.fromCharCode(65 + index)}. {option}
                      </span>
                    </div>
                  ))}
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
