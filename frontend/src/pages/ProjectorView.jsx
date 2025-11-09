import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { slidesAPI } from '../services/api'
import { useSocket } from '../hooks/useSocket'

/**
 * ProjectorView - Clean public display for screen sharing/projector
 * Shows ONLY slides without any controls or teacher interface
 * Synchronized with teacher's control panel via WebSocket
 */
export default function ProjectorView() {
  const { deckId } = useParams()
  const { joinSession, on, off } = useSocket()

  const [deck, setDeck] = useState(null)
  const [currentSlideNumber, setCurrentSlideNumber] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const currentSlide = deck?.slides?.find(s => s.slideNumber === currentSlideNumber)
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

  useEffect(() => {
    loadDeck()
  }, [deckId])

  // Join WebSocket room when deck is loaded
  useEffect(() => {
    if (deck?.session_id) {
      console.log('Projector view joining session:', deck.session_id)
      joinSession(deck.session_id, 'projector')
    }
  }, [deck?.session_id, joinSession])

  // Listen for navigation from teacher
  useEffect(() => {
    const handleTeacherNavigated = ({ slideNumber }) => {
      console.log('Projector view: Teacher navigated to slide', slideNumber)
      setCurrentSlideNumber(slideNumber)
    }

    on('teacher-navigated', handleTeacherNavigated)

    return () => {
      off('teacher-navigated', handleTeacherNavigated)
    }
  }, [on, off])

  // Keyboard navigation (backup control)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        if (currentSlideNumber < deck?.slides?.length) {
          setCurrentSlideNumber(currentSlideNumber + 1)
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentSlideNumber > 1) {
          setCurrentSlideNumber(currentSlideNumber - 1)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentSlideNumber, deck])

  const loadDeck = async () => {
    try {
      const result = await slidesAPI.getDeck(deckId)

      const deckData = {
        ...result,
        session_id: result.sessionId
      }

      setDeck(deckData)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load deck')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">Loading...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">Error</div>
          <p className="text-xl">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8 overflow-hidden">
      {currentSlide ? (
        <div className="bg-white rounded-lg shadow-2xl p-16 max-w-6xl w-full max-h-[calc(100vh-4rem)] overflow-y-auto flex flex-col">
          {/* Slide title */}
          {currentSlide.title && (
            <h2 className="text-6xl font-bold text-gray-900 mb-10">
              {currentSlide.title}
            </h2>
          )}

          {/* Slide body */}
          {currentSlide.body && (
            <div
              className="max-w-none mb-10 flex-1"
              dangerouslySetInnerHTML={{ __html: currentSlide.body }}
            />
          )}

          {/* Image */}
          {currentSlide.image && (
            <div className={`mb-10 flex-shrink-0 ${
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
                  maxHeight: '70vh',
                  height: 'auto',
                  objectFit: 'contain'
                }}
                className="rounded-lg shadow-lg inline-block"
              />
            </div>
          )}

          {/* Question */}
          {currentSlide.question && (
            <div className="mt-10 p-10 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <h3 className="font-bold text-3xl text-gray-900 mb-8">
                {currentSlide.question.text}
              </h3>

              {currentSlide.question.type === 'multiple_choice' && (
                <div className="space-y-4">
                  {currentSlide.question.options.map((option, index) => (
                    <div
                      key={index}
                      className="p-6 bg-white border-2 border-gray-200 rounded-lg"
                    >
                      <span className="text-2xl text-gray-900">
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
          <div className="text-6xl mb-4">No slide</div>
        </div>
      )}

      {/* Minimal slide indicator in corner */}
      <div className="fixed bottom-4 right-4 bg-gray-800 bg-opacity-90 text-white text-sm px-4 py-2 rounded shadow-lg">
        Slide {currentSlideNumber} / {deck?.slides?.length || 0}
      </div>
    </div>
  )
}
