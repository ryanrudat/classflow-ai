import { useState, useRef, useEffect } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/**
 * InteractiveVideoPlayer Component
 * Student view - plays video and pauses for questions
 */
export default function InteractiveVideoPlayer({ activity, studentId, token }) {
  const videoRef = useRef(null)
  const [questions, setQuestions] = useState([])
  const [currentTime, setCurrentTime] = useState(0)
  const [activeQuestion, setActiveQuestion] = useState(null)
  const [answeredQuestions, setAnsweredQuestions] = useState(new Set())
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [openAnswer, setOpenAnswer] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [questionStartTime, setQuestionStartTime] = useState(null)

  const videoUrl = activity.content?.videoUrl
  const videoDuration = activity.content?.videoDuration

  // Load questions - use pre-loaded from content or fetch from API
  useEffect(() => {
    async function loadQuestions() {
      // First check if questions are already in activity content
      const contentQuestions = activity.content?.questions
      if (contentQuestions && contentQuestions.length > 0) {
        console.log('📹 Using pre-loaded questions from activity content:', contentQuestions.length)
        setQuestions(contentQuestions)
        return
      }

      // Otherwise fetch from API
      try {
        const response = await axios.get(
          `${API_URL}/api/activities/${activity.id}/video-questions`
        )
        console.log('📹 Fetched questions from API:', response.data.questions.length)
        setQuestions(response.data.questions)
      } catch (error) {
        console.error('Failed to load questions:', error)
      }
    }
    loadQuestions()
  }, [activity.id, activity.content?.questions])

  // Check for questions at current timestamp
  useEffect(() => {
    if (!videoRef.current || questions.length === 0) return

    const currentSecond = Math.floor(currentTime)

    // Find unanswered question at current timestamp
    const questionAtTime = questions.find(
      q => q.timestampSeconds === currentSecond && !answeredQuestions.has(q.id)
    )

    if (questionAtTime) {
      videoRef.current.pause()
      setActiveQuestion(questionAtTime)
      setQuestionStartTime(Date.now())
      setSelectedAnswer(null)
      setOpenAnswer('')
      setShowFeedback(false)
    }
  }, [currentTime, questions, answeredQuestions])

  // Update progress periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        updateProgress()
      }
    }, 5000) // Every 5 seconds

    return () => clearInterval(interval)
  }, [currentTime])

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const updateProgress = async () => {
    if (!token) return

    try {
      await axios.post(
        `${API_URL}/api/activities/${activity.id}/video-progress`,
        {
          current_timestamp_seconds: Math.floor(currentTime),
          completed: videoRef.current?.ended || false
        },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )
    } catch (error) {
      console.error('Failed to update progress:', error)
    }
  }

  const handleSubmitAnswer = async () => {
    if (!activeQuestion || !token) return

    const timeSpent = questionStartTime ? Math.floor((Date.now() - questionStartTime) / 1000) : 0

    try {
      const response = await axios.post(
        `${API_URL}/api/video-questions/${activeQuestion.id}/respond`,
        {
          response_text: openAnswer || null,
          selected_option: selectedAnswer,
          time_spent_seconds: timeSpent
        },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      setIsCorrect(response.data.response.isCorrect)
      setShowFeedback(true)

      // Mark as answered
      setAnsweredQuestions(new Set([...answeredQuestions, activeQuestion.id]))

      // Auto-continue after 2 seconds for correct answers
      if (activeQuestion.questionType === 'multiple_choice' && response.data.response.isCorrect) {
        setTimeout(() => {
          handleContinue()
        }, 2000)
      }

    } catch (error) {
      console.error('Failed to submit answer:', error)
    }
  }

  const handleContinue = () => {
    setActiveQuestion(null)
    setShowFeedback(false)
    videoRef.current?.play()
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const completionPercentage = videoDuration > 0
    ? Math.min(100, Math.round((currentTime / videoDuration) * 100))
    : 0

  return (
    <div className="relative w-full h-full bg-black">
      {/* Video Player */}
      <div className="relative w-full h-full flex items-center justify-center">
        <video
          ref={videoRef}
          src={`${API_URL}${videoUrl}`}
          onTimeUpdate={handleTimeUpdate}
          onEnded={updateProgress}
          controls
          className="w-full h-full object-contain"
        />

        {/* Progress Indicator */}
        <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg text-sm">
          {formatTime(currentTime)} / {formatTime(videoDuration)} ({completionPercentage}%)
        </div>

        {/* Question Markers on Timeline */}
        {questions.length > 0 && videoDuration > 0 && (
          <div className="absolute bottom-16 left-0 right-0 h-1 bg-transparent pointer-events-none">
            {questions.map(q => (
              <div
                key={q.id}
                className={`absolute top-0 w-1 h-3 ${answeredQuestions.has(q.id) ? 'bg-green-500' : 'bg-yellow-400'}`}
                style={{ left: `${(q.timestampSeconds / videoDuration) * 100}%` }}
                title={`Question at ${formatTime(q.timestampSeconds)}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Question Overlay - Smooth fade in */}
      {activeQuestion && (
        <div
          className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-10 animate-fadeIn"
          style={{ animation: 'fadeIn 0.5s ease-out' }}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl transform"
            style={{ animation: 'slideUp 0.4s ease-out' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-sm font-medium text-blue-600 mb-2">
                  Question at {formatTime(activeQuestion.timestampSeconds)}
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {activeQuestion.questionText}
                </h3>
              </div>
            </div>

            {!showFeedback ? (
              <>
                {/* Multiple Choice */}
                {activeQuestion.questionType === 'multiple_choice' && (
                  <div className="space-y-3 mb-6">
                    {activeQuestion.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedAnswer(idx)}
                        className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                          selectedAnswer === idx
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            selectedAnswer === idx
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-400'
                          }`}>
                            {selectedAnswer === idx && (
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <span className="text-base font-medium text-gray-900">
                            {String.fromCharCode(65 + idx)}. {option}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Open Ended */}
                {activeQuestion.questionType === 'open_ended' && (
                  <div className="mb-6">
                    <textarea
                      value={openAnswer}
                      onChange={(e) => setOpenAnswer(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows="6"
                      placeholder="Type your answer here..."
                    />
                  </div>
                )}

                <button
                  onClick={handleSubmitAnswer}
                  disabled={
                    (activeQuestion.questionType === 'multiple_choice' && selectedAnswer === null) ||
                    (activeQuestion.questionType === 'open_ended' && !openAnswer.trim())
                  }
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Submit Answer
                </button>
              </>
            ) : (
              <>
                {/* Feedback */}
                {activeQuestion.questionType === 'multiple_choice' && (
                  <div className={`p-4 rounded-lg mb-6 ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-center gap-3 mb-2">
                      {isCorrect ? (
                        <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                      <div>
                        <p className={`font-bold text-lg ${isCorrect ? 'text-green-900' : 'text-red-900'}`}>
                          {isCorrect ? 'Correct!' : 'Incorrect'}
                        </p>
                        {!isCorrect && (
                          <p className="text-sm text-red-700">
                            Correct answer: {String.fromCharCode(65 + activeQuestion.correctAnswer)}. {activeQuestion.options[activeQuestion.correctAnswer]}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeQuestion.questionType === 'open_ended' && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
                    <p className="text-blue-900 font-medium">Answer submitted!</p>
                    <p className="text-sm text-blue-700 mt-1">Your teacher will review your response.</p>
                  </div>
                )}

                <button
                  onClick={handleContinue}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Continue Watching
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {/* CSS Animations for smooth transitions */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  )
}
