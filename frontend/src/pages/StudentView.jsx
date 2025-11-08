import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { sessionsAPI, slidesAPI, studentHelpAPI, activitiesAPI } from '../services/api'
import { useSocket } from '../hooks/useSocket'
import { useStudentAuthStore } from '../stores/studentAuthStore'
import StudentPresentationViewer from '../components/slides/StudentPresentationViewer'
import StudentHelpModal from '../components/StudentHelpModal'
import CreateAccountBanner from '../components/CreateAccountBanner'
import ConfusionButton from '../components/ConfusionButton'
import InteractiveVideoPlayer from '../components/InteractiveVideoPlayer'
import SentenceOrderingActivity from '../components/SentenceOrderingActivity'
import MatchingActivity from '../components/MatchingActivity'
import LivePoll from '../components/LivePoll'
import Leaderboard from '../components/Leaderboard'

export default function StudentView() {
  const { joinCode } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useStudentAuthStore()
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

  // Confusion state
  const [isConfused, setIsConfused] = useState(false)

  // Auto-fill join code if in URL
  const [code, setCode] = useState(joinCode || '')

  // WebSocket connection
  const { joinSession, submitResponse, on, off, emit, toggleConfusion, isConnected } = useSocket()

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
    const handlePresentationStarted = ({ deckId, mode, deck }) => {
      console.log('>>> PRESENTATION STARTED EVENT RECEIVED!')
      console.log('  DeckId:', deckId)
      console.log('  Mode:', mode)
      console.log('  Session:', session?.id)
      console.log('  Student:', student?.student_name)
      console.log('  Deck data included:', deck ? 'YES (' + deck.slides?.length + ' slides)' : 'NO')

      if (!deck) {
        console.error('  ❌ No deck data in presentation-started event')
        return
      }

      try {
        // Use deck data from WebSocket event (no API call needed!)
        const restructuredDeck = {
          id: deck.id,
          title: deck.title,
          slides: deck.slides,
          initialMode: mode // Pass the initial mode to the viewer
        }

        setCurrentDeck(restructuredDeck)
        setPresentationActive(true)
        console.log('  ✅ Presentation view activated with mode:', mode)
        console.log('  ✅ No authentication required - deck data came via WebSocket')

        // Announce presence to teacher (in case teacher joined after student)
        setTimeout(() => {
          console.log('  📢 Student announcing presence to teacher')
        }, 100)
      } catch (err) {
        console.error('  ❌ Failed to process presentation data:', err)
      }
    }

    // Listen for confusion cleared by teacher
    const handleConfusionCleared = () => {
      setIsConfused(false)
    }

    // Listen for force disconnect (when teacher removes student)
    const handleForceDisconnect = ({ message }) => {
      alert(message || 'You have been removed from the session')
      localStorage.removeItem('student_session')
      setStep('join')
      setSession(null)
      setStudent(null)
      setPresentationActive(false)
      setCurrentDeck(null)
    }

    on('activity-received', handleActivityReceived)
    on('screen-locked', handleScreenLocked)
    on('screen-unlocked', handleScreenUnlocked)
    on('presentation-started', handlePresentationStarted)
    on('confusion-cleared', handleConfusionCleared)
    on('force-disconnect', handleForceDisconnect)

    // Cleanup
    return () => {
      off('activity-received', handleActivityReceived)
      off('screen-locked', handleScreenLocked)
      off('screen-unlocked', handleScreenUnlocked)
      off('presentation-started', handlePresentationStarted)
      off('confusion-cleared', handleConfusionCleared)
      off('force-disconnect', handleForceDisconnect)
    }
  }, [session, student, joinSession, on, off])

  // Handle confusion toggle
  const handleConfusionToggle = (newConfusedState) => {
    setIsConfused(newConfusedState)
    toggleConfusion(session.id, student.id, student.student_name, newConfusedState)
  }

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
        deck={currentDeck}
        sessionId={session.id}
        studentId={student.id}
        on={on}
        off={off}
        emit={emit}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Create Account Banner - Only show for anonymous students */}
      {!isAuthenticated() && <CreateAccountBanner sessionId={session?.id} />}

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
            student={student}
            studentId={student.id}
            sessionId={session.id}
            emit={emit}
            onSubmit={(response) => {
              submitResponse(currentActivity.id, student.id, response)
              setCurrentActivity(null)
            }}
          />
        ) : (
          <div className="space-y-4">
            <div className="card text-center py-16">
              <div className="text-gray-400 mb-4">
                <svg className="w-20 h-20 mx-auto animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-600">Waiting for teacher...</h3>
              <p className="text-gray-500 mt-2">Your teacher will push activities or presentations</p>
            </div>

            {/* Confusion Button */}
            <div className="card">
              <ConfusionButton
                isConfused={isConfused}
                onToggle={handleConfusionToggle}
                disabled={!isConnected || screenLocked}
              />
            </div>

            {/* Leaderboard */}
            {session && student && (
              <Leaderboard
                sessionId={session.id}
                instanceId={session.currentInstanceId}
                viewMode="student"
                currentStudentId={student.id}
                maxEntries={10}
              />
            )}

            {/* Reverse Tutoring Option */}
            <div className="card bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200">
              <div className="text-center">
                <div className="flex justify-center mb-3">
                  <svg className="w-12 h-12 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Teach the AI</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Show what you know by teaching an AI student about today's lesson
                </p>
                <button
                  onClick={() => navigate(`/reverse-tutoring/${session.id}`, {
                    state: {
                      studentId: student.id,
                      studentName: student.student_name,
                      topic: session.title || 'the lesson',
                      subject: session.subject || 'Science',
                      gradeLevel: '7th grade',
                      keyVocabulary: []
                    }
                  })}
                  className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
                >
                  Start Teaching
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Activity Display Component with Help System
function ActivityDisplay({ activity, student, studentId, sessionId, emit, onSubmit }) {
  const [response, setResponse] = useState('')
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState([])

  // Help system state
  const [attemptNumber, setAttemptNumber] = useState(1)
  const [help, setHelp] = useState(null)
  const [showHelp, setShowHelp] = useState(false)
  const [helpLoading, setHelpLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(null)
  const [startTime] = useState(Date.now())

  // Locked activity state
  const [showLockedModal, setShowLockedModal] = useState(false)
  const [lockMessage, setLockMessage] = useState('')

  // Enhanced handleSubmit with help system
  const handleSubmit = async (e) => {
    e.preventDefault()

    // For reading activities, just mark as complete
    if (activity.type === 'reading') {
      const submitData = { type: 'reading_completed', timestamp: new Date().toISOString() }
      onSubmit(submitData)
      return
    }

    // For questions/quiz, check correctness and offer help if wrong
    if (activity.type === 'questions' || activity.type === 'quiz') {
      const questions = activity.content?.questions || activity.content?.quiz || []
      const currentQuestion = questions[currentQuestionIndex]

      if (!currentQuestion) return

      // Check if answer is correct
      const correct = currentQuestion.correct === selectedAnswer
      setIsCorrect(correct)
      setSubmitted(true)

      // Calculate time spent
      const timeSpent = Math.floor((Date.now() - startTime) / 1000)

      // Send progress update via WebSocket for teacher's live monitoring
      if (emit) {
        // Calculate current score
        const correctSoFar = answers.filter((ans, idx) => {
          const q = questions[idx]
          return q && q.correct === ans
        }).length + (correct ? 1 : 0)

        const questionsAttempted = currentQuestionIndex + 1
        const score = Math.round((correctSoFar / questionsAttempted) * 100)

        emit('student-progress-update', {
          studentId,
          studentName: student.student_name,
          sessionId,
          activityId: activity.id,
          questionNumber: currentQuestionIndex + 1,
          totalQuestions: questions.length,
          isCorrect: correct,
          attemptNumber,
          helpReceived: help !== null,
          score,
          questionsAttempted
        })
      }

      // Save response to database for persistence
      try {
        await activitiesAPI.submitQuestion(activity.id, {
          studentId,
          sessionId,
          questionNumber: currentQuestionIndex + 1,
          selectedAnswer,
          isCorrect: correct,
          attemptNumber,
          helpReceived: help !== null,
          timeSpent
        })
      } catch (error) {
        console.error('Failed to save question response:', error)

        // Check if activity is locked (403 error)
        if (error.response?.status === 403) {
          setLockMessage(error.response?.data?.message || 'This activity has been completed and locked.')
          setShowLockedModal(true)
          setSubmitted(false) // Reset so they can see their answer but not continue
          return // Don't continue if locked
        }
        // For other errors, don't block the student - continue even if save fails
      }

      if (correct) {
        // Correct answer - celebrate and continue
        setTimeout(() => {
          // Auto-advance or submit
          if (currentQuestionIndex < questions.length - 1) {
            handleNextQuestion()
          } else {
            // Submit final quiz
            const submitData = {
              answers: [...answers, selectedAnswer],
              attemptNumber,
              timeSpent
            }
            onSubmit(submitData)
          }
        }, 1500) // Show success message briefly
      } else {
        // Wrong answer - request AI help
        await requestHelp(currentQuestion, timeSpent)
      }
    } else {
      // Discussion prompts - just submit
      const submitData = { text: response }
      onSubmit(submitData)
    }
  }

  // Request help from AI when student gets question wrong
  const requestHelp = async (question, timeSpent) => {
    try {
      setHelpLoading(true)

      const response = await studentHelpAPI.requestHelp({
        studentId,
        sessionId,
        activityId: activity.id,
        questionText: question.question,
        questionNumber: currentQuestionIndex + 1,
        correctAnswer: question.options[question.correct],
        studentAnswer: question.options[selectedAnswer],
        attemptNumber,
        timeSpent
      })

      setHelp(response.help)
      setShowHelp(true)

      // Emit WebSocket event to notify teacher
      if (emit) {
        emit('help-shown', {
          studentId,
          sessionId,
          questionId: `${activity.id}-q${currentQuestionIndex + 1}`,
          helpType: response.help.helpType
        })
      }
    } catch (error) {
      console.error('Error requesting help:', error)
      // Fallback: show generic help
      setHelp({
        feedback: "Not quite right, but good effort!",
        explanation: "Take another look at the question and think it through carefully.",
        hint: "Consider all the options and what the question is really asking.",
        helpType: "generic",
        encouragement: "You can do this - try again!",
        offerSimplerVersion: attemptNumber >= 2
      })
      setShowHelp(true)
    } finally {
      setHelpLoading(false)
    }
  }

  // Handle "Try Again" from help modal
  const handleTryAgain = () => {
    setShowHelp(false)
    setSubmitted(false)
    setSelectedAnswer(null)
    setIsCorrect(null)
    setAttemptNumber(prev => prev + 1)

    // Notify teacher that student is trying again
    if (emit) {
      emit('student-tried-again', {
        studentId,
        sessionId,
        questionId: `${activity.id}-q${currentQuestionIndex + 1}`,
        attemptNumber: attemptNumber + 1
      })
    }
  }

  // Handle "Simpler Version" request
  const handleRequestSimpler = async () => {
    try {
      setHelpLoading(true)

      const questions = activity.content?.questions || activity.content?.quiz || []
      const currentQuestion = questions[currentQuestionIndex]

      const response = await studentHelpAPI.acceptSimplerVersion({
        studentId,
        sessionId,
        activityId: activity.id,
        questionText: currentQuestion.question,
        correctAnswer: currentQuestion.options[currentQuestion.correct]
      })

      // Notify teacher
      if (emit) {
        emit('simpler-version-requested', {
          studentId,
          sessionId,
          questionId: `${activity.id}-q${currentQuestionIndex + 1}`
        })
      }

      // TODO: Replace current question with simpler version
      // For now, just show success message
      alert('Simpler version generated! (Feature coming soon: will replace the question)')
      setShowHelp(false)
    } catch (error) {
      console.error('Error requesting simpler version:', error)
      alert('Failed to generate simpler version. Please try again or ask your teacher.')
    } finally {
      setHelpLoading(false)
    }
  }

  // Handle dismissing help modal
  const handleDismissHelp = () => {
    setShowHelp(false)
  }

  const handleNextQuestion = () => {
    const questions = activity.content?.questions || activity.content?.quiz || []

    // Save current answer
    const newAnswers = [...answers]
    newAnswers[currentQuestionIndex] = selectedAnswer
    setAnswers(newAnswers)

    // Reset question state for next question
    setSubmitted(false)
    setIsCorrect(null)
    setHelp(null)
    setShowHelp(false)
    setAttemptNumber(1)

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
                {currentQuestion.options.map((option, index) => {
                  const isSelectedAnswer = selectedAnswer === index
                  const isCorrectAnswer = currentQuestion.correct === index

                  return (
                    <label
                      key={index}
                      className={`block p-4 border-2 rounded-lg transition-all ${
                        submitted
                          ? 'cursor-not-allowed'
                          : 'cursor-pointer'
                      } ${
                        // Only show green if student got it right
                        isCorrect === true && isSelectedAnswer && isCorrectAnswer
                          ? 'border-green-500 bg-green-50'
                          // Show red only on their incorrect selection
                          : isCorrect === false && isSelectedAnswer
                          ? 'border-red-500 bg-red-50'
                          // Normal selection state
                          : isSelectedAnswer && !submitted
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center flex-1">
                          <input
                            type="radio"
                            name="answer"
                            value={index}
                            checked={isSelectedAnswer}
                            onChange={() => !submitted && setSelectedAnswer(index)}
                            disabled={submitted}
                            className="mr-3"
                          />
                          <span>{String.fromCharCode(65 + index)}. {option}</span>
                        </div>
                        {/* Only show green checkmark if they got it right */}
                        {isCorrect === true && isSelectedAnswer && (
                          <span className="text-green-600 font-semibold flex items-center gap-1">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Correct
                          </span>
                        )}
                        {/* Only show red X on their wrong selection */}
                        {isCorrect === false && isSelectedAnswer && (
                          <span className="text-red-600 font-semibold flex items-center gap-1">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            Incorrect
                          </span>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
            ) : (
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                className="input-field min-h-32"
                placeholder="Type your answer here..."
              />
            )}

            {/* Success message when answer is correct */}
            {isCorrect === true && (
              <div className="bg-green-50 border-l-4 border-green-500 rounded-r-lg p-4 animate-fade-in">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-semibold text-green-900">Excellent work!</p>
                    <p className="text-sm text-green-800">Moving to the next question...</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                className="btn-primary flex-1"
                disabled={submitted || (currentQuestion.options ? selectedAnswer === null : !response.trim())}
              >
                {submitted ? (
                  helpLoading ? 'Getting Help...' : 'Processing...'
                ) : (
                  'Submit Answer'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Help Modal - Only show when showHelp is true */}
        {showHelp && (
          <StudentHelpModal
            help={help}
            onTryAgain={handleTryAgain}
            onRequestSimpler={handleRequestSimpler}
            onDismiss={handleDismissHelp}
            loading={helpLoading}
          />
        )}

        {/* Locked Activity Modal */}
        {showLockedModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="text-center">
                <div className="text-6xl mb-4">🔒</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Activity Locked</h3>
                <p className="text-gray-700 mb-4">
                  {lockMessage}
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>Why is this locked?</strong><br />
                    You've completed this activity and it has been automatically locked to preserve your work.
                    If you need to retake it, please contact your teacher.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowLockedModal(false)
                    // Optionally navigate away or reset activity
                  }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors w-full"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (activity.type === 'interactive_video') {
    return (
      <InteractiveVideoPlayer
        activity={activity}
        studentId={student?.id}
        token={localStorage.getItem('studentToken')}
      />
    )
  }

  if (activity.type === 'sentence_ordering') {
    return (
      <SentenceOrderingActivity
        activity={activity}
        onSubmit={onSubmit}
      />
    )
  }

  if (activity.type === 'matching') {
    return (
      <MatchingActivity
        activity={activity}
        onSubmit={onSubmit}
      />
    )
  }

  if (activity.type === 'poll') {
    return (
      <LivePoll
        activity={activity}
        viewMode="student"
        sessionId={sessionId}
        studentId={studentId}
        onSubmit={onSubmit}
      />
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
