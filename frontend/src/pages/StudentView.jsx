import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { sessionsAPI, slidesAPI } from '../services/api'
import { useSocket } from '../hooks/useSocket'
import StudentPresentationViewer from '../components/slides/StudentPresentationViewer'

export default function StudentView() {
  const { joinCode } = useParams()
  const [step, setStep] = useState('join') // 'join', 'active'
  const [session, setSession] = useState(null)
  const [student, setStudent] = useState(null)
  const [studentName, setStudentName] = useState('')
  const [deviceType, setDeviceType] = useState('chromebook')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentActivity, setCurrentActivity] = useState(null)
  const [screenLocked, setScreenLocked] = useState(false)

  // Presentation state
  const [presentationActive, setPresentationActive] = useState(false)
  const [currentDeck, setCurrentDeck] = useState(null)

  // Auto-fill join code if in URL
  const [code, setCode] = useState(joinCode || '')

  // WebSocket connection
  const { joinSession, submitResponse, on, off, isConnected } = useSocket()

  async function handleJoin(e) {
    e.preventDefault()

    if (!code.trim() || !studentName.trim()) {
      setError('Please enter join code and your name')
      return
    }

    try {
      setLoading(true)
      setError('')

      const data = await sessionsAPI.join(code.toUpperCase(), studentName, deviceType)

      setSession(data.session)
      setStudent(data.student)
      setStep('active')

      // Store in localStorage so they don't lose it on refresh
      localStorage.setItem('student_session', JSON.stringify({
        session: data.session,
        student: data.student
      }))

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join session')
    } finally {
      setLoading(false)
    }
  }

  // Try to restore session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('student_session')
    if (stored) {
      try {
        const data = JSON.parse(stored)
        setSession(data.session)
        setStudent(data.student)
        setStep('active')
      } catch (e) {
        localStorage.removeItem('student_session')
      }
    }
  }, [])

  // WebSocket listeners for real-time updates
  useEffect(() => {
    if (!session || !student) return

    // Join the session room
    joinSession(session.id, 'student', student.id, student.student_name)

    // Listen for activity pushed by teacher
    const handleActivityReceived = ({ activity, targetStudentId }) => {
      if (!targetStudentId || targetStudentId === student.id) {
        setCurrentActivity(activity)
      }
    }

    // Listen for screen lock
    const handleScreenLocked = ({ targetStudentId }) => {
      if (!targetStudentId || targetStudentId === student.id) {
        setScreenLocked(true)
      }
    }

    // Listen for screen unlock
    const handleScreenUnlocked = ({ targetStudentId }) => {
      if (!targetStudentId || targetStudentId === student.id) {
        setScreenLocked(false)
      }
    }

    // Listen for presentation started
    const handlePresentationStarted = async ({ deckId, mode }) => {
      console.log('📊📊📊 PRESENTATION STARTED EVENT RECEIVED!')
      console.log('  DeckId:', deckId)
      console.log('  Mode:', mode)
      console.log('  Session:', session?.id)
      console.log('  Student:', student?.student_name)

      try {
        console.log('  Loading deck data...')
        const deckData = await slidesAPI.getDeck(deckId)
        console.log('  Deck loaded successfully:', deckData)
        setCurrentDeck(deckData)
        setPresentationActive(true)
        console.log('  ✅ Presentation view activated!')
      } catch (err) {
        console.error('  ❌ Failed to load presentation:', err)
      }
    }

    on('activity-received', handleActivityReceived)
    on('screen-locked', handleScreenLocked)
    on('screen-unlocked', handleScreenUnlocked)
    on('presentation-started', handlePresentationStarted)

    // Cleanup
    return () => {
      off('activity-received', handleActivityReceived)
      off('screen-locked', handleScreenLocked)
      off('screen-unlocked', handleScreenUnlocked)
      off('presentation-started', handlePresentationStarted)
    }
  }, [session, student, joinSession, on, off])

  if (step === 'join') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
        <div className="card w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">ClassFlow AI</h1>
            <p className="text-gray-600 mt-2">Join your class session</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Join Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="input-field text-center text-2xl font-mono tracking-wider"
                placeholder="ABC123XY"
                maxLength={8}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="input-field"
                placeholder="Enter your name"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Device Type
              </label>
              <select
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value)}
                className="input-field"
                disabled={loading}
              >
                <option value="chromebook">Chromebook</option>
                <option value="ipad">iPad</option>
                <option value="phone">Phone</option>
                <option value="laptop">Laptop</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
            >
              {loading ? 'Joining...' : 'Join Session'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Show presentation viewer if presentation is active
  if (presentationActive && currentDeck) {
    return (
      <StudentPresentationViewer
        deck={currentDeck.deck}
        sessionId={session.id}
        studentId={student.id}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{session.title}</h1>
            <p className="text-sm text-gray-600">{student.student_name}</p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('student_session')
              setStep('join')
              setSession(null)
              setStudent(null)
            }}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Leave Session
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Connection status */}
        <div className="mb-4 flex items-center justify-between">
          <div className={`text-sm flex items-center gap-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-600' : 'bg-red-600'}`} />
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        {/* Screen lock overlay */}
        {screenLocked && (
          <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
            <div className="text-center text-white">
              <svg className="w-24 h-24 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <h2 className="text-2xl font-bold">Screen Locked</h2>
              <p className="text-gray-300 mt-2">Your teacher has locked your screen</p>
            </div>
          </div>
        )}

        {/* Activity display */}
        {currentActivity ? (
          <ActivityDisplay
            activity={currentActivity}
            studentId={student.id}
            onSubmit={(response) => {
              submitResponse(currentActivity.id, student.id, response)
              setCurrentActivity(null)
            }}
          />
        ) : (
          <div className="card text-center py-16">
            <div className="text-gray-400 mb-4">
              <svg className="w-20 h-20 mx-auto animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-600">Waiting for teacher...</h3>
            <p className="text-gray-500 mt-2">Your teacher will push activities or presentations</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Activity Display Component
function ActivityDisplay({ activity, studentId, onSubmit }) {
  const [response, setResponse] = useState('')
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState([])

  const handleSubmit = (e) => {
    e.preventDefault()

    let submitData
    if (activity.type === 'reading') {
      submitData = { type: 'reading_completed', timestamp: new Date().toISOString() }
    } else if (activity.type === 'questions' || activity.type === 'quiz') {
      submitData = { questionIndex: currentQuestionIndex, selectedOption: selectedAnswer, text: response }
    } else {
      submitData = { text: response }
    }

    onSubmit(submitData)
  }

  const handleNextQuestion = () => {
    const questions = activity.content?.questions || activity.content?.quiz || []

    // Save current answer
    const newAnswers = [...answers]
    newAnswers[currentQuestionIndex] = selectedAnswer
    setAnswers(newAnswers)

    // Move to next question
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSelectedAnswer(newAnswers[currentQuestionIndex + 1] ?? null)
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
      setSelectedAnswer(answers[currentQuestionIndex - 1] ?? null)
    }
  }

  const handleSubmitQuiz = () => {
    // Submit all answers
    const submitData = {
      answers: answers,
      questionIndex: currentQuestionIndex,
      selectedOption: selectedAnswer
    }
    onSubmit(submitData)
  }

  if (activity.type === 'reading') {
    return (
      <div className="card">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Reading Activity</h3>
        <div className="prose prose-sm max-w-none mb-6">
          <p className="whitespace-pre-wrap text-gray-700">{activity.content}</p>
        </div>
        <button onClick={handleSubmit} className="btn-primary">
          Mark as Complete
        </button>
      </div>
    )
  }

  if (activity.type === 'questions' || activity.type === 'quiz') {
    const questions = activity.content?.questions || activity.content?.quiz || []
    const currentQuestion = questions[currentQuestionIndex]
    const isLastQuestion = currentQuestionIndex === questions.length - 1

    return (
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">
            {activity.type === 'quiz' ? 'Quiz' : 'Questions'}
          </h3>
          <span className="text-sm text-gray-600">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
        </div>

        {currentQuestion && (
          <div className="space-y-4">
            <p className="text-lg font-medium text-gray-800">{currentQuestion.question}</p>

            {currentQuestion.options ? (
              <div className="space-y-2">
                {currentQuestion.options.map((option, index) => (
                  <label
                    key={index}
                    className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedAnswer === index
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="answer"
                      value={index}
                      checked={selectedAnswer === index}
                      onChange={() => setSelectedAnswer(index)}
                      className="mr-3"
                    />
                    {String.fromCharCode(65 + index)}. {option}
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                className="input-field min-h-32"
                placeholder="Type your answer here..."
              />
            )}

            <div className="flex gap-2">
              {currentQuestionIndex > 0 && (
                <button
                  onClick={handlePreviousQuestion}
                  className="btn-secondary flex-1"
                >
                  Previous
                </button>
              )}

              {!isLastQuestion ? (
                <button
                  onClick={handleNextQuestion}
                  className="btn-primary flex-1"
                  disabled={currentQuestion.options ? selectedAnswer === null : !response.trim()}
                >
                  Next Question
                </button>
              ) : (
                <button
                  onClick={handleSubmitQuiz}
                  className="btn-primary flex-1"
                  disabled={currentQuestion.options ? selectedAnswer === null : !response.trim()}
                >
                  Submit Quiz
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (activity.type === 'discussion') {
    const prompts = activity.content?.prompts || []

    return (
      <div className="card">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Discussion Prompts</h3>

        <div className="space-y-6">
          {prompts.map((prompt, index) => (
            <div key={index} className="border-b pb-4">
              <p className="font-medium text-gray-800 mb-2">{prompt.question}</p>
              {prompt.context && (
                <p className="text-sm text-gray-600 mb-3">{prompt.context}</p>
              )}
            </div>
          ))}

          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            className="input-field min-h-32"
            placeholder="Share your thoughts..."
          />

          <button
            onClick={handleSubmit}
            className="btn-primary w-full"
            disabled={!response.trim()}
          >
            Submit Response
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <pre className="text-sm">{JSON.stringify(activity, null, 2)}</pre>
    </div>
  )
}
