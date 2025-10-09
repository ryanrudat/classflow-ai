import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { slidesAPI } from '../services/api'
import PresentationControls from '../components/slides/PresentationControls'

/**
 * Presentation - Teacher's presentation view
 * Shows current slide in full-screen with controls at bottom
 */
export default function Presentation() {
  const { deckId } = useParams()
  const navigate = useNavigate()

  const [deck, setDeck] = useState(null)
  const [currentSlideNumber, setCurrentSlideNumber] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const currentSlide = deck?.slides?.find(s => s.slideNumber === currentSlideNumber)
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

  useEffect(() => {
    loadDeck()
  }, [deckId])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        handlePrevious()
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          exitFullscreen()
        }
      } else if (e.key === 'f') {
        toggleFullscreen()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentSlideNumber, deck, isFullscreen])

  const loadDeck = async () => {
    try {
      const result = await slidesAPI.getDeck(deckId)
      setDeck(result)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load deck')
    } finally {
      setLoading(false)
    }
  }

  const handleNext = () => {
    if (currentSlideNumber < deck?.slides?.length) {
      setCurrentSlideNumber(currentSlideNumber + 1)
    }
  }

  const handlePrevious = () => {
    if (currentSlideNumber > 1) {
      setCurrentSlideNumber(currentSlideNumber - 1)
    }
  }

  const handleNavigate = (slideNumber) => {
    setCurrentSlideNumber(slideNumber)
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const handleEndPresentation = () => {
    if (confirm('End presentation and return to session dashboard?')) {
      navigate('/teacher-dashboard')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-xl">Loading presentation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-xl mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-100"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Top bar */}
      <header className="bg-gray-800 px-6 py-3 flex items-center justify-between text-white">
        <div>
          <h1 className="text-lg font-bold">{deck?.title}</h1>
          <p className="text-sm text-gray-400">
            Presenting to students
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleFullscreen}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
            title="Press 'f' to toggle fullscreen"
          >
            {isFullscreen ? '⊡ Exit Fullscreen' : '⛶ Fullscreen'}
          </button>

          <button
            onClick={() => navigate(`/slides/monitor/${deckId}`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
          >
            📊 Monitor Students
          </button>

          <button
            onClick={handleEndPresentation}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition-colors"
          >
            End Presentation
          </button>
        </div>
      </header>

      {/* Main slide area */}
      <main className="flex-1 flex items-center justify-center p-8 pb-32">
        {currentSlide ? (
          <div className="bg-white rounded-lg shadow-2xl p-12 max-w-5xl w-full min-h-[600px] flex flex-col">
            {/* Slide title */}
            {currentSlide.title && (
              <h2 className="text-5xl font-bold text-gray-900 mb-8">
                {currentSlide.title}
              </h2>
            )}

            {/* Slide body */}
            {currentSlide.body && (
              <div
                className="prose prose-xl max-w-none mb-8 flex-1"
                dangerouslySetInnerHTML={{ __html: currentSlide.body }}
              />
            )}

            {/* Image */}
            {currentSlide.image && (
              <div className={`mb-8 ${
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
              <div className="mt-8 p-8 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <h3 className="font-bold text-2xl text-gray-900 mb-6">
                  {currentSlide.question.text}
                </h3>

                {currentSlide.question.type === 'multiple_choice' && (
                  <div className="space-y-3">
                    {currentSlide.question.options.map((option, index) => (
                      <div
                        key={index}
                        className="p-4 bg-white border-2 border-gray-200 rounded-lg"
                      >
                        <span className="text-xl text-gray-900">
                          {String.fromCharCode(65 + index)}. {option}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-white text-center">
            <div className="text-6xl mb-4">📄</div>
            <p className="text-xl">No slide found</p>
          </div>
        )}
      </main>

      {/* Presentation controls */}
      <PresentationControls
        deck={deck}
        currentSlideNumber={currentSlideNumber}
        onNavigate={handleNavigate}
      />

      {/* Keyboard hints */}
      <div className="fixed bottom-4 left-4 bg-gray-800 bg-opacity-90 text-white text-xs px-3 py-2 rounded shadow-lg">
        <div>← → Arrow keys to navigate</div>
        <div>F for fullscreen</div>
        <div>ESC to exit fullscreen</div>
      </div>
    </div>
  )
}
