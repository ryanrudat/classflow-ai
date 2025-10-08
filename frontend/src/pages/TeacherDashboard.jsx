import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { sessionsAPI, aiAPI, activitiesAPI } from '../services/api'
import { useSocket } from '../hooks/useSocket'

export default function TeacherDashboard() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const [sessions, setSessions] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Load sessions on mount
  useEffect(() => {
    loadSessions()
  }, [])

  async function loadSessions() {
    try {
      const data = await sessionsAPI.getAll()
      setSessions(data.sessions || [])
    } catch (err) {
      console.error('Failed to load sessions:', err)
    }
  }

  async function createSession(sessionData) {
    try {
      setLoading(true)
      setError('')
      const data = await sessionsAPI.create(sessionData)
      setSessions([data.session, ...sessions])
      setActiveSession(data.session)
      setShowCreateModal(false)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create session')
    } finally {
      setLoading(false)
    }
  }

  async function endSession(sessionId) {
    if (!confirm('End this session? Students will no longer be able to join.')) return

    try {
      await sessionsAPI.end(sessionId)
      loadSessions()
      if (activeSession?.id === sessionId) {
        setActiveSession(null)
      }
    } catch (err) {
      alert('Failed to end session')
    }
  }

  async function reactivateSession(sessionId) {
    if (!confirm('Reactivate this session? Students will be able to join again with the same code.')) return

    try {
      const result = await sessionsAPI.reactivate(sessionId)
      loadSessions()
      // Update the active session to reflect the new status
      if (activeSession?.id === sessionId) {
        setActiveSession(result.session)
      }
    } catch (err) {
      alert('Failed to reactivate session')
    }
  }

  async function deleteSession(sessionId) {
    if (!confirm('Permanently delete this session? All data will be lost.')) return

    try {
      await sessionsAPI.delete(sessionId)
      loadSessions()
      if (activeSession?.id === sessionId) {
        setActiveSession(null)
      }
    } catch (err) {
      alert('Failed to delete session')
    }
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ClassFlow AI</h1>
            <p className="text-sm text-gray-600">Welcome, {user?.name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="btn-secondary text-sm"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left sidebar - Sessions */}
          <div className="lg:col-span-1">
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Sessions</h2>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary text-sm"
                >
                  + New Session
                </button>
              </div>

              <div className="space-y-2">
                {sessions.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-8">
                    No sessions yet.<br />Create one to get started!
                  </p>
                )}

                {sessions.map(session => (
                  <div
                    key={session.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      activeSession?.id === session.id
                        ? 'border-primary-500 bg-primary-50'
                        : session.status === 'ended'
                        ? 'border-gray-300 bg-gray-50 opacity-75'
                        : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => setActiveSession(session)}
                      >
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-gray-900">{session.title}</div>
                          {session.status === 'ended' && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-600 rounded">
                              Ended
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {session.subject || 'No subject'}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          Join Code: <span className="font-mono font-bold">{session.join_code}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSession(session.id)
                        }}
                        className="ml-2 text-red-500 hover:text-red-700 p-1"
                        title="Delete session"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="lg:col-span-2">
            {!activeSession ? (
              <div className="card text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="w-24 h-24 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-gray-600">No Session Selected</h3>
                <p className="text-gray-500 mt-2">Create or select a session to get started</p>
              </div>
            ) : (
              <ActiveSessionView
                session={activeSession}
                onEnd={() => endSession(activeSession.id)}
                onReactivate={() => reactivateSession(activeSession.id)}
                onUpdate={loadSessions}
              />
            )}
          </div>
        </div>
      </div>

      {/* Create Session Modal */}
      {showCreateModal && (
        <CreateSessionModal
          onClose={() => setShowCreateModal(false)}
          onCreate={createSession}
          loading={loading}
          error={error}
        />
      )}
    </div>
  )
}

function CreateSessionModal({ onClose, onCreate, loading, error }) {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('English')

  const subjects = ['English', 'History', 'Social Studies', 'Government', 'Biology']

  function handleSubmit(e) {
    e.preventDefault()
    onCreate({ title, subject })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Create New Session</h2>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              placeholder="e.g., Period 3 - English"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input-field"
              disabled={loading}
            >
              {subjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ActiveSessionView({ session, onEnd, onReactivate, onUpdate }) {
  const [generatedContent, setGeneratedContent] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [type, setType] = useState('reading')
  const [difficulty, setDifficulty] = useState('medium')
  const [error, setError] = useState('')
  const [students, setStudents] = useState([])
  const [studentResponses, setStudentResponses] = useState([])
  const [sessionActivities, setSessionActivities] = useState([])
  const [loadingActivities, setLoadingActivities] = useState(false)

  const { joinSession, pushActivity, on, off, isConnected } = useSocket()

  // Clear content when session changes
  useEffect(() => {
    setGeneratedContent(null)
    setStudents([])
    setStudentResponses([])
    setPrompt('')
    setError('')
  }, [session?.id])

  // Load session activities when session changes
  useEffect(() => {
    if (!session?.id) return

    async function loadActivities() {
      try {
        setLoadingActivities(true)
        const data = await sessionsAPI.getActivities(session.id)
        setSessionActivities(data.activities || [])
      } catch (err) {
        console.error('Failed to load session activities:', err)
      } finally {
        setLoadingActivities(false)
      }
    }

    loadActivities()
  }, [session?.id])

  // Join session as teacher and listen for events
  useEffect(() => {
    if (!session) return

    joinSession(session.id, 'teacher')

    // Listen for student joins
    const handleUserJoined = ({ role, studentId, studentName }) => {
      if (role === 'student') {
        setStudents(prev => {
          // Check if student already exists (reconnecting)
          const existingIndex = prev.findIndex(s => s.id === studentId)
          if (existingIndex !== -1) {
            // Student reconnecting - mark as connected
            const updated = [...prev]
            updated[existingIndex] = { ...updated[existingIndex], connected: true }
            return updated
          }
          // New student joining
          return [...prev, { id: studentId, name: studentName || `Student ${studentId.slice(0, 6)}`, connected: true }]
        })
      }
    }

    // Listen for student responses
    const handleStudentResponded = ({ activityId, studentId, response }) => {
      setStudentResponses(prev => [...prev, { activityId, studentId, response }])
    }

    // Listen for student leaving
    const handleUserLeft = ({ role, studentId }) => {
      if (role === 'student') {
        // Mark student as disconnected instead of removing them
        setStudents(prev => prev.map(s =>
          s.id === studentId ? { ...s, connected: false } : s
        ))
      }
    }

    on('user-joined', handleUserJoined)
    on('student-responded', handleStudentResponded)
    on('user-left', handleUserLeft)

    return () => {
      off('user-joined', handleUserJoined)
      off('student-responded', handleStudentResponded)
      off('user-left', handleUserLeft)
    }
  }, [session, joinSession, on, off])

  async function handleGenerate(e) {
    e.preventDefault()

    if (!prompt.trim()) {
      setError('Please enter a prompt')
      return
    }

    try {
      setGenerating(true)
      setError('')

      const data = await aiAPI.generate({
        sessionId: session.id,
        prompt: prompt.trim(),
        type,
        subject: session.subject,
        difficulty,
        length: type === 'reading' ? 500 : undefined,
        count: type === 'questions' || type === 'quiz' ? 5 : undefined
      })

      setGeneratedContent(data.activity)
      setPrompt('')

      // Reload activities to include the newly generated one
      const activitiesData = await sessionsAPI.getActivities(session.id)
      setSessionActivities(activitiesData.activities || [])

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate content')
    } finally {
      setGenerating(false)
    }
  }

  async function handlePush() {
    if (!generatedContent) return

    try {
      await activitiesAPI.push(generatedContent.id, 'all')
      // Also push via WebSocket for real-time delivery
      pushActivity(session.id, generatedContent, 'all')
      alert('Content pushed to all students!')
    } catch (err) {
      alert('Failed to push content')
    }
  }

  async function handleGenerateFromContent(contentType) {
    if (!generatedContent) return

    try {
      setGenerating(true)
      setError('')

      // Use the existing content as context
      const basePrompt = generatedContent.type === 'reading'
        ? `Based on this passage:\n\n${generatedContent.content}\n\n`
        : ''

      const contextPrompt = contentType === 'questions'
        ? `${basePrompt}Generate 5 comprehension questions about this content.`
        : `${basePrompt}Generate a 5-question quiz about this content.`

      const data = await aiAPI.generate({
        sessionId: session.id,
        prompt: contextPrompt,
        type: contentType,
        subject: session.subject,
        difficulty: difficulty,
        count: 5
      })

      setGeneratedContent(data.activity)

      // Reload activities to include the newly generated one
      const activitiesData = await sessionsAPI.getActivities(session.id)
      setSessionActivities(activitiesData.activities || [])

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate content')
    } finally {
      setGenerating(false)
    }
  }

  function handleSelectPreviousActivity(activity) {
    setGeneratedContent(activity)
  }

  return (
    <div className="space-y-6">
      {/* Session Info */}
      <div className="card bg-primary-50 border-primary-200">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{session.title}</h2>
            <p className="text-gray-600 mt-1">{session.subject}</p>
            <div className="mt-2 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600">
                {isConnected ? 'Live' : 'Disconnected'} • {students.length} student{students.length !== 1 ? 's' : ''} joined
              </span>
            </div>
          </div>
          {session.status === 'ended' ? (
            <button
              onClick={onReactivate}
              className="text-green-600 hover:text-green-700 text-sm font-medium"
            >
              Reactivate Session
            </button>
          ) : (
            <button
              onClick={onEnd}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              End Session
            </button>
          )}
        </div>

        <div className="mt-4 p-4 bg-white rounded-lg border-2 border-primary-300">
          <div className="text-sm text-gray-600 mb-1">Students join with code:</div>
          <div className="text-3xl font-bold font-mono text-primary-600 tracking-wider">
            {session.join_code}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Share this code with students to join the session
          </div>
        </div>
      </div>

      {/* Student List */}
      {students.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Connected Students</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {students.map(student => {
              const hasResponded = studentResponses.some(r => r.studentId === student.id)
              const isConnected = student.connected !== false // Default to true for backward compatibility
              return (
                <div
                  key={student.id}
                  className={`p-3 rounded-lg border-2 ${
                    !isConnected
                      ? 'border-gray-300 bg-gray-100 opacity-60'
                      : hasResponded
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${isConnected ? 'text-gray-900' : 'text-gray-500 line-through'}`}>
                      {student.name}
                    </span>
                    {!isConnected && (
                      <span className="text-xs text-gray-500 font-medium">Disconnected</span>
                    )}
                    {isConnected && hasResponded && (
                      <span className="text-xs text-green-600 font-medium">✓ Responded</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Session History */}
      {sessionActivities.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            📚 Session History ({sessionActivities.length} {sessionActivities.length === 1 ? 'activity' : 'activities'})
          </h3>
          {loadingActivities ? (
            <p className="text-gray-500 text-sm text-center py-4">Loading activities...</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {sessionActivities.map(activity => {
                const isSelected = generatedContent?.id === activity.id
                const typeEmoji = {
                  reading: '📖',
                  questions: '❓',
                  quiz: '📋',
                  discussion: '💬'
                }[activity.type] || '📄'

                return (
                  <div
                    key={activity.id}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => handleSelectPreviousActivity(activity)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{typeEmoji}</span>
                          <span className="font-medium text-gray-900 capitalize">
                            {activity.type}
                          </span>
                          {activity.cached && (
                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                              Cached
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {activity.prompt}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span>Difficulty: {activity.difficulty_level}</span>
                          <span>•</span>
                          <span>{new Date(activity.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="ml-2 flex-shrink-0">
                          <div className="w-2 h-2 bg-primary-500 rounded-full" />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* AI Content Generator */}
      <div className="card">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Generate AI Content</h3>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What do you want to generate?
            </label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="input-field"
              placeholder="e.g., The American Revolution, Romeo and Juliet, Cell Division..."
              disabled={generating}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="input-field"
                disabled={generating}
              >
                <option value="reading">Reading Passage</option>
                <option value="questions">Comprehension Questions</option>
                <option value="quiz">Quiz</option>
                <option value="discussion">Discussion Prompts</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="input-field"
                disabled={generating}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={generating || !prompt.trim()}
          >
            {generating ? 'Generating with AI...' : '✨ Generate Content'}
          </button>
        </form>

        {/* Generated Content Preview */}
        {generatedContent && (
          <div className="mt-6 border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-gray-800">Generated Content:</h4>
              <div className="flex gap-2">
                <button
                  onClick={handlePush}
                  className="btn-primary text-sm"
                >
                  Push to All Students
                </button>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
              <ContentPreview content={generatedContent.content} type={generatedContent.type} />
            </div>

            {/* Generate from Content Options */}
            {generatedContent.type === 'reading' && (
              <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  📝 Generate activities based on this passage:
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleGenerateFromContent('questions')}
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                    disabled={generating}
                  >
                    {generating ? 'Generating...' : '❓ Generate Questions'}
                  </button>
                  <button
                    onClick={() => handleGenerateFromContent('quiz')}
                    className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                    disabled={generating}
                  >
                    {generating ? 'Generating...' : '📋 Generate Quiz'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ContentPreview({ content, type }) {
  if (type === 'reading') {
    return (
      <div className="prose prose-sm max-w-none">
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    )
  }

  if (type === 'questions' || type === 'quiz') {
    const questions = content.questions || content.quiz || []
    return (
      <div className="space-y-4">
        {questions.map((q, i) => (
          <div key={i} className="border-b pb-3">
            <div className="font-medium text-gray-900 mb-2">
              {i + 1}. {q.question}
            </div>
            {q.options && (
              <div className="ml-4 space-y-1">
                {q.options.map((opt, j) => (
                  <div key={j} className={`text-sm ${j === q.correct ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                    {String.fromCharCode(65 + j)}. {opt} {j === q.correct && '✓'}
                  </div>
                ))}
              </div>
            )}
            {q.sampleAnswer && (
              <div className="ml-4 text-sm text-gray-600 italic">
                Sample: {q.sampleAnswer}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (type === 'discussion') {
    const prompts = content.prompts || []
    return (
      <div className="space-y-4">
        {prompts.map((p, i) => (
          <div key={i} className="border-b pb-3">
            <div className="font-medium text-gray-900 mb-1">
              {i + 1}. {p.question}
            </div>
            {p.context && (
              <div className="text-sm text-gray-600 ml-4">
                {p.context}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  return <pre className="text-sm">{JSON.stringify(content, null, 2)}</pre>
}
