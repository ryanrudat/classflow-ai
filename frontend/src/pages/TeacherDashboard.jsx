import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { sessionsAPI, aiAPI, activitiesAPI, analyticsAPI, slidesAPI, studentHelpAPI, completionAPI } from '../services/api'
import { useSocket } from '../hooks/useSocket'
import LiveMonitoring from '../components/LiveMonitoring'
import StudentDetailModal from '../components/StudentDetailModal'
import ReactivateDialog from '../components/ReactivateDialog'
import ActivityStatusBadge from '../components/ActivityStatusBadge'
import UnlockActivityModal from '../components/UnlockActivityModal'

export default function TeacherDashboard() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const [sessions, setSessions] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showReactivateDialog, setShowReactivateDialog] = useState(false)
  const [sessionToReactivate, setSessionToReactivate] = useState(null)
  const [reactivateInstances, setReactivateInstances] = useState([])

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
    try {
      // Load instances for this session
      const data = await sessionsAPI.getInstances(sessionId)
      setReactivateInstances(data.instances || [])
      setSessionToReactivate(sessions.find(s => s.id === sessionId))
      setShowReactivateDialog(true)
    } catch (err) {
      console.error('Failed to load instances:', err)
      alert('Failed to load session data')
    }
  }

  async function handleResumeInstance(instanceId) {
    if (!sessionToReactivate) return

    try {
      const result = await sessionsAPI.reactivate(sessionToReactivate.id, instanceId)
      loadSessions()
      if (activeSession?.id === sessionToReactivate.id) {
        setActiveSession(result.session)
      }
      setShowReactivateDialog(false)
      setSessionToReactivate(null)
    } catch (err) {
      alert('Failed to resume session')
    }
  }

  async function handleStartNewInstance() {
    if (!sessionToReactivate) return

    try {
      const result = await sessionsAPI.reactivate(sessionToReactivate.id)
      loadSessions()
      if (activeSession?.id === sessionToReactivate.id) {
        setActiveSession(result.session)
      }
      setShowReactivateDialog(false)
      setSessionToReactivate(null)
    } catch (err) {
      alert('Failed to start new period')
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

      {/* Reactivate Session Dialog */}
      {showReactivateDialog && sessionToReactivate && (
        <ReactivateDialog
          session={sessionToReactivate}
          instances={reactivateInstances}
          onResume={handleResumeInstance}
          onStartNew={handleStartNewInstance}
          onCancel={() => {
            setShowReactivateDialog(false)
            setSessionToReactivate(null)
          }}
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
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview') // Tab navigation state
  const [generatedContent, setGeneratedContent] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [type, setType] = useState('reading')
  const [difficulty, setDifficulty] = useState('medium')
  const [error, setError] = useState('')
  const [students, setStudents] = useState([])
  const [studentResponses, setStudentResponses] = useState([])
  const [sessionActivities, setSessionActivities] = useState([])
  const [pushedActivities, setPushedActivities] = useState([])
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [analytics, setAnalytics] = useState(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [instances, setInstances] = useState([])
  const [selectedInstance, setSelectedInstance] = useState(null)
  const [loadingInstance, setLoadingInstance] = useState(false)
  const [slideDecks, setSlideDecks] = useState([])
  const [loadingSlides, setLoadingSlides] = useState(false)
  const [generatingSlides, setGeneratingSlides] = useState(false)
  const [showSlideGenerator, setShowSlideGenerator] = useState(false)
  const [helpHistory, setHelpHistory] = useState([])
  const [loadingHelpHistory, setLoadingHelpHistory] = useState(false)
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null)

  const { joinSession, pushActivity, on, off, isConnected, removeStudent, emit } = useSocket()

  // Tab configuration
  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📋', badge: students.length },
    { id: 'present', label: 'Present', icon: '📊' },
    { id: 'activities', label: 'Activities', icon: '✨', badge: sessionActivities.length > 0 ? sessionActivities.length : null },
    { id: 'analytics', label: 'Analytics', icon: '📈' }
  ]

  // Clear content when session changes
  useEffect(() => {
    setGeneratedContent(null)
    setStudents([])
    setStudentResponses([])
    setPrompt('')
    setError('')
  }, [session?.id])

  // Load ALL session activities when session changes (for Activities tab)
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

  // Load PUSHED activities only (for Overview tab)
  useEffect(() => {
    if (!session?.id) return

    async function loadPushedActivities() {
      try {
        const data = await sessionsAPI.getActivities(session.id, true)
        setPushedActivities(data.activities || [])
      } catch (err) {
        console.error('Failed to load pushed activities:', err)
      }
    }

    loadPushedActivities()
  }, [session?.id])

  // Load slide decks for this session
  useEffect(() => {
    if (!session?.id) return

    async function loadSlides() {
      try {
        setLoadingSlides(true)
        const data = await slidesAPI.getSessionDecks(session.id)
        setSlideDecks(data.decks || [])
      } catch (err) {
        console.error('Failed to load slides:', err)
      } finally {
        setLoadingSlides(false)
      }
    }

    loadSlides()
  }, [session?.id])

  // Load session analytics (filtered by selected instance)
  useEffect(() => {
    if (!session?.id || !selectedInstance?.id) return

    async function loadAnalytics() {
      try {
        setLoadingAnalytics(true)
        const data = await analyticsAPI.getSessionAnalytics(session.id, selectedInstance.id)
        setAnalytics(data)
      } catch (err) {
        console.error('Failed to load analytics:', err)
      } finally {
        setLoadingAnalytics(false)
      }
    }

    loadAnalytics()
  }, [session?.id, selectedInstance?.id])

  // Load session instances (reload when status changes, e.g., after reactivation)
  useEffect(() => {
    if (!session?.id) return

    async function loadInstances() {
      try {
        const data = await sessionsAPI.getInstances(session.id)
        setInstances(data.instances || [])

        // Select the current instance by default
        const currentInstance = data.instances?.find(i => i.is_current)
        if (currentInstance) {
          setSelectedInstance(currentInstance)
          // Load students for the current instance
          loadInstanceStudents(currentInstance.id)
        }
      } catch (err) {
        console.error('Failed to load instances:', err)
      }
    }

    loadInstances()
  }, [session?.id, session?.status])

  // Function to load students for a specific instance
  async function loadInstanceStudents(instanceId) {
    try {
      setLoadingInstance(true)

      // Load students from database - they persist even if WebSocket disconnects
      const data = await sessionsAPI.getInstanceDetails(session.id, instanceId)
      setStudents(data.students.map(s => ({
        id: s.id,
        name: s.student_name,
        connected: false, // Will be updated to true when they join via WebSocket
        account_id: s.account_id // Include account_id for authenticated students
      })) || [])

      console.log(`📚 Loaded ${data.students.length} students from database for instance ${instanceId}`)
    } catch (err) {
      console.error('Failed to load instance students:', err)
    } finally {
      setLoadingInstance(false)
    }
  }

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

    // Listen for student being removed by teacher
    const handleStudentRemoved = ({ studentId }) => {
      // Remove student from the list completely
      setStudents(prev => prev.filter(s => s.id !== studentId))
    }

    // Listen for live progress updates
    const handleLiveProgressUpdate = (update) => {
      // Call the global handler if it exists (set by LiveMonitoring component)
      if (window.handleLiveProgressUpdate) {
        window.handleLiveProgressUpdate(update)
      }
    }

    on('user-joined', handleUserJoined)
    on('student-responded', handleStudentResponded)
    on('user-left', handleUserLeft)
    on('student-removed', handleStudentRemoved)
    on('live-progress-update', handleLiveProgressUpdate)

    return () => {
      off('user-joined', handleUserJoined)
      off('student-responded', handleStudentResponded)
      off('user-left', handleUserLeft)
      off('student-removed', handleStudentRemoved)
      off('live-progress-update', handleLiveProgressUpdate)
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

      // Reload pushed activities to show in Overview tab
      const pushedData = await sessionsAPI.getActivities(session.id, true)
      setPushedActivities(pushedData.activities || [])

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

  async function handleGenerateSlides(slideData) {
    try {
      setGeneratingSlides(true)
      setError('')

      const result = await slidesAPI.generate(
        session.id,
        slideData.topic,
        slideData.gradeLevel,
        slideData.difficulty,
        slideData.slideCount
      )

      // Navigate to the slide editor
      navigate(`/slides/edit/${result.deck.id}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate slides')
    } finally {
      setGeneratingSlides(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Sticky Session Header */}
      <div className="card bg-primary-50 border-primary-200 sticky top-0 z-10 shadow-md">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{session.title}</h2>
                <p className="text-sm text-gray-600">{session.subject}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-gray-600">
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </div>
              <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                {students.length} {students.length === 1 ? 'Student' : 'Students'}
              </div>
              <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded font-mono text-sm font-bold">
                {session.join_code}
              </div>
            </div>
          </div>
          {session.status === 'ended' ? (
            <button
              onClick={onReactivate}
              className="px-4 py-2 text-green-600 hover:text-green-700 text-sm font-medium border border-green-600 rounded-lg hover:bg-green-50 transition-colors"
            >
              Reactivate
            </button>
          ) : (
            <button
              onClick={onEnd}
              className="px-4 py-2 text-red-600 hover:text-red-700 text-sm font-medium border border-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              End Session
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="card p-0 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all relative ${
                activeTab === tab.id
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.badge !== null && tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </div>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <OverviewTab
              session={session}
              isConnected={isConnected}
              students={students}
              instances={instances}
              selectedInstance={selectedInstance}
              setSelectedInstance={setSelectedInstance}
              loadInstanceStudents={loadInstanceStudents}
              studentResponses={studentResponses}
              loadingInstance={loadingInstance}
              removeStudent={removeStudent}
              setStudents={setStudents}
              sessionActivities={pushedActivities}
              selectedStudentDetail={selectedStudentDetail}
              setSelectedStudentDetail={setSelectedStudentDetail}
            />
          )}

          {activeTab === 'present' && (
            <PresentTab
              slideDecks={slideDecks}
              loadingSlides={loadingSlides}
              navigate={navigate}
              setShowSlideGenerator={setShowSlideGenerator}
            />
          )}

          {activeTab === 'activities' && (
            <ActivitiesTab
              session={session}
              generatedContent={generatedContent}
              setGeneratedContent={setGeneratedContent}
              generating={generating}
              setGenerating={setGenerating}
              prompt={prompt}
              setPrompt={setPrompt}
              type={type}
              setType={setType}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              error={error}
              setError={setError}
              sessionActivities={sessionActivities}
              setSessionActivities={setSessionActivities}
              loadingActivities={loadingActivities}
              handleGenerate={handleGenerate}
              handlePush={handlePush}
              handleGenerateFromContent={handleGenerateFromContent}
              handleSelectPreviousActivity={handleSelectPreviousActivity}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsTab
              analytics={analytics}
              loadingAnalytics={loadingAnalytics}
              selectedInstance={selectedInstance}
              session={session}
              instances={instances}
            />
          )}
        </div>
      </div>

      {/* Slide Generator Modal */}
      {showSlideGenerator && (
        <SlideGeneratorModal
          onClose={() => setShowSlideGenerator(false)}
          onGenerate={handleGenerateSlides}
          loading={generatingSlides}
          subject={session.subject}
        />
      )}
    </div>
  )
}

// Tab Components
function OverviewTab({ session, isConnected, students, instances, selectedInstance, setSelectedInstance, loadInstanceStudents, studentResponses, loadingInstance, removeStudent, setStudents, sessionActivities, selectedStudentDetail, setSelectedStudentDetail }) {
  const [studentProgressData, setStudentProgressData] = useState([])
  const [studentIdToRemove, setStudentIdToRemove] = useState(null)
  const [studentCompletions, setStudentCompletions] = useState({}) // Map of studentId -> completions
  const [loadingCompletions, setLoadingCompletions] = useState(false)
  const [unlockModal, setUnlockModal] = useState(null) // { studentId, studentName, activityId, activityName }
  const [unlocking, setUnlocking] = useState(false)

  // Find active quiz/questions activities for live monitoring
  const activeMonitoringActivity = sessionActivities.find(a =>
    (a.type === 'quiz' || a.type === 'questions') && a.pushed_to
  )

  // Shared handler for removing students from live monitoring
  const handleRemoveFromMonitoring = (studentId) => {
    // Update local state
    setStudentProgressData(prev => prev.filter(s => s.studentId !== studentId))
    // Trigger LiveMonitoring to remove the student
    setStudentIdToRemove(studentId)
    // Reset the trigger after a brief moment to allow future removals
    setTimeout(() => setStudentIdToRemove(null), 100)
  }

  // Load completions for authenticated students
  useEffect(() => {
    if (!students || students.length === 0 || !session?.id) return

    async function loadCompletions() {
      setLoadingCompletions(true)
      const completionsMap = {}

      for (const student of students) {
        // Only load for students with account_id (authenticated students)
        if (student.account_id) {
          try {
            const data = await completionAPI.getStudentCompletions(student.account_id, session.id)
            completionsMap[student.id] = data.completions || []
          } catch (error) {
            console.error(`Failed to load completions for student ${student.id}:`, error)
            completionsMap[student.id] = []
          }
        }
      }

      setStudentCompletions(completionsMap)
      setLoadingCompletions(false)
    }

    loadCompletions()
  }, [students, session?.id])

  // Handle unlock activity
  const handleUnlock = async (reason) => {
    if (!unlockModal) return

    try {
      setUnlocking(true)
      await completionAPI.unlockActivity(
        unlockModal.activityId,
        unlockModal.studentAccountId,
        reason
      )

      // Reload completions for this student
      const data = await completionAPI.getStudentCompletions(unlockModal.studentAccountId, session.id)
      setStudentCompletions(prev => ({
        ...prev,
        [unlockModal.studentId]: data.completions || []
      }))

      setUnlockModal(null)
      alert(`Successfully unlocked "${unlockModal.activityName}" for ${unlockModal.studentName}`)
    } catch (error) {
      console.error('Failed to unlock activity:', error)
      alert('Failed to unlock activity: ' + (error.response?.data?.message || error.message))
    } finally {
      setUnlocking(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Join Code Card */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border-2 border-blue-200">
        <div className="text-sm font-medium text-gray-700 mb-2">Students join with code:</div>
        <div className="text-5xl font-bold font-mono text-blue-600 tracking-wider text-center my-4">
          {session.join_code}
        </div>
        <div className="text-xs text-gray-600 text-center">
          Share this code with students to join the session
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{students.length}</div>
          <div className="text-sm text-gray-600">Students Joined</div>
        </div>
        <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <div className="text-2xl font-bold text-gray-900">
              {isConnected ? 'Live' : 'Offline'}
            </div>
          </div>
          <div className="text-sm text-gray-600">Connection Status</div>
        </div>
        <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{session.subject}</div>
          <div className="text-sm text-gray-600">Subject</div>
        </div>
      </div>

      {/* Class Periods */}
      {instances.length > 1 && (
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-3">Class Periods</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {instances.map(instance => {
              const instanceDate = new Date(instance.started_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })
              return (
                <button
                  key={instance.id}
                  onClick={() => {
                    setSelectedInstance(instance)
                    loadInstanceStudents(instance.id)
                  }}
                  className={`p-4 rounded-lg font-medium transition-all text-left ${
                    selectedInstance?.id === instance.id
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : instance.is_current
                      ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300 hover:bg-indigo-200'
                      : 'bg-gray-100 text-gray-700 border-2 border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  <div className="font-semibold">
                    {instance.label || `Period ${instance.instance_number}`}
                    {instance.is_current && <span className="ml-1 text-xs">(Current)</span>}
                  </div>
                  <div className="text-xs opacity-75 mt-1">
                    {instanceDate} • {instance.student_count || 0} students
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Period Warning Banner */}
      {selectedInstance && !selectedInstance.is_current && (
        <div className="bg-amber-100 border-2 border-amber-400 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📅</span>
            <div>
              <div className="font-semibold text-amber-900">
                Viewing Past Period: {selectedInstance.label || `Period ${selectedInstance.instance_number}`}
              </div>
              <div className="text-sm text-amber-800">
                This class session ended on {new Date(selectedInstance.ended_at || selectedInstance.started_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Students in this Period */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-3">
          Students
          {selectedInstance && instances.length > 1 && (
            <span className="ml-2 text-sm font-normal text-gray-600">
              - {selectedInstance.label || `Period ${selectedInstance.instance_number}`}
            </span>
          )}
        </h3>

        {loadingInstance ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            <span className="ml-3 text-gray-600">Loading student data...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-4xl mb-2">👥</div>
            <p className="text-gray-600 text-sm">
              {selectedInstance?.is_current
                ? 'No students have joined yet. Share the join code above.'
                : `No students joined ${selectedInstance?.label || 'this period'}.`
              }
            </p>
          </div>
        ) : (
          <div>
            <div className="text-sm text-gray-600 mb-3">
              {students.filter(s => s.connected !== false).length} / {students.length} online
            </div>
            <div className="space-y-4">
              {students.map(student => {
                const hasResponded = studentResponses.some(r => r.studentId === student.id)
                const isConnected = student.connected !== false
                const completions = studentCompletions[student.id] || []
                const hasAccount = !!student.account_id

                return (
                  <div
                    key={student.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      !isConnected
                        ? 'border-gray-300 bg-gray-100'
                        : hasResponded
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className={`font-medium ${isConnected ? 'text-gray-900' : 'text-gray-500 line-through'}`}>
                          {student.name}
                        </span>
                        {hasAccount && (
                          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-medium">
                            Account
                          </span>
                        )}
                        {!isConnected && (
                          <span className="text-xs text-gray-500 font-medium">Offline</span>
                        )}
                        {isConnected && hasResponded && (
                          <span className="text-xs text-green-600 font-medium">Responded</span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${student.name} from this session?`)) {
                            removeStudent(session.id, student.id)
                            setStudents(prev => prev.filter(s => s.id !== student.id))
                          }
                        }}
                        className="ml-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Remove student"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* Activity Completions for Authenticated Students */}
                    {hasAccount && completions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-xs font-semibold text-gray-700 mb-2">Activity Completions:</div>
                        <div className="space-y-2">
                          {completions.map((completion) => {
                            const activityName = completion.activity_prompt || `Activity ${completion.activity_id.slice(0, 8)}`
                            return (
                              <div key={completion.activity_id} className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium text-gray-900 truncate">
                                    {activityName}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                      completion.is_locked
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                      {completion.is_locked ? '🔒 Locked' : '✓ Complete'}
                                    </span>
                                    <span className="text-xs text-gray-600">
                                      Score: {completion.score}%
                                    </span>
                                  </div>
                                </div>
                                {completion.is_locked && (
                                  <button
                                    onClick={() => setUnlockModal({
                                      studentId: student.id,
                                      studentName: student.name,
                                      studentAccountId: student.account_id,
                                      activityId: completion.activity_id,
                                      activityName
                                    })}
                                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors flex-shrink-0"
                                  >
                                    Unlock
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Period Activities */}
      {selectedInstance && sessionActivities.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-3">
            Activities for {selectedInstance.label || `Period ${selectedInstance.instance_number}`}
          </h3>
          <div className="space-y-2">
            {sessionActivities.map(activity => {
              const typeEmoji = {
                reading: '📖',
                questions: '❓',
                quiz: '📋',
                discussion: '💬'
              }[activity.type] || '📄'

              return (
                <div
                  key={activity.id}
                  className="p-3 rounded-lg border-2 border-gray-200 bg-white hover:border-gray-300"
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
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Live Monitoring Dashboard */}
      {activeMonitoringActivity && (
        <div>
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            📊 Live Progress Monitoring
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Real-time student progress for: <span className="font-medium">{activeMonitoringActivity.prompt}</span>
          </p>
          <LiveMonitoring
            sessionId={session.id}
            activityId={activeMonitoringActivity.id}
            instanceId={selectedInstance?.id}
            onStudentClick={(student) => setSelectedStudentDetail(student.studentId)}
            onRemoveStudent={handleRemoveFromMonitoring}
            onProgressDataChange={setStudentProgressData}
            studentIdToRemove={studentIdToRemove}
          />
        </div>
      )}

      {/* Student Detail Modal */}
      {selectedStudentDetail && (
        <StudentDetailModal
          studentId={selectedStudentDetail}
          studentProgress={studentProgressData}
          onClose={() => setSelectedStudentDetail(null)}
          onRemoveStudent={(studentId) => {
            handleRemoveFromMonitoring(studentId)
            setSelectedStudentDetail(null)
          }}
        />
      )}

      {/* Unlock Activity Modal */}
      {unlockModal && (
        <UnlockActivityModal
          studentName={unlockModal.studentName}
          activityName={unlockModal.activityName}
          onConfirm={handleUnlock}
          onCancel={() => setUnlockModal(null)}
          loading={unlocking}
        />
      )}
    </div>
  )
}

function PresentTab({ slideDecks, loadingSlides, navigate, setShowSlideGenerator }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Presentation Slides</h3>
          <p className="text-sm text-gray-600 mt-1">Create and manage AI-powered slide decks for your lessons</p>
        </div>
        <button
          onClick={() => setShowSlideGenerator(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          + Generate New Slides
        </button>
      </div>

      {loadingSlides ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading slides...</span>
        </div>
      ) : slideDecks.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-6xl mb-4">📽️</div>
          <h4 className="text-lg font-semibold text-gray-700 mb-2">No slide decks yet</h4>
          <p className="text-gray-500 text-sm mb-6">Generate AI-powered slides for your lessons</p>
          <button
            onClick={() => setShowSlideGenerator(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            ✨ Create Your First Deck
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {slideDecks.map(deck => (
            <div
              key={deck.id}
              className="p-5 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-lg transition-all bg-white"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-lg">{deck.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {deck.slideCount} slides • {deck.gradeLevel} • {deck.difficulty}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Created {new Date(deck.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/slides/edit/${deck.id}`)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => navigate(`/present/${deck.id}`)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                >
                  ▶️ Present
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ActivitiesTab({
  session, generatedContent, setGeneratedContent, generating, setGenerating,
  prompt, setPrompt, type, setType, difficulty, setDifficulty, error, setError,
  sessionActivities, setSessionActivities, loadingActivities,
  handleGenerate, handlePush, handleGenerateFromContent, handleSelectPreviousActivity
}) {
  return (
    <div className="space-y-6">
      {/* AI Content Generator */}
      <div>
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
              <button
                onClick={handlePush}
                className="btn-primary text-sm"
              >
                Push to All Students
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto border border-gray-200">
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

      {/* Session History */}
      {sessionActivities.length > 0 && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            📚 Session History ({sessionActivities.length} {sessionActivities.length === 1 ? 'activity' : 'activities'})
          </h3>
          {loadingActivities ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading activities...</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
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
                        ? 'border-blue-500 bg-blue-50'
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
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
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
    </div>
  )
}

function AnalyticsTab({ analytics, loadingAnalytics, selectedInstance, session, instances }) {
  const [exporting, setExporting] = useState(false)

  const handleExportGrades = async (exportAllPeriods = false) => {
    try {
      setExporting(true)
      if (exportAllPeriods) {
        await sessionsAPI.exportGrades(session.id)
      } else {
        await sessionsAPI.exportGrades(session.id, selectedInstance?.id)
      }
    } catch (err) {
      alert('Failed to export grades: ' + err.message)
    } finally {
      setExporting(false)
    }
  }

  if (loadingAnalytics) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-3 text-gray-600">Loading analytics...</span>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">No analytics data yet</h3>
        <p className="text-gray-600">
          Analytics will appear here once students start responding to activities
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Session Analytics</h3>
            {selectedInstance && (
              <p className="text-sm text-gray-600 mt-1">
                Showing data for: {selectedInstance.label || `Period ${selectedInstance.instance_number}`}
              </p>
            )}
          </div>

          {/* Export Buttons */}
          <div className="flex gap-2">
            {instances && instances.length > 1 && (
              <button
                onClick={() => handleExportGrades(true)}
                disabled={exporting}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {exporting ? 'Exporting...' : 'Export All Periods'}
              </button>
            )}
            <button
              onClick={() => handleExportGrades(false)}
              disabled={exporting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {exporting ? 'Exporting...' : `Export ${selectedInstance?.label || 'Current Period'}`}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-5 rounded-lg border border-blue-200">
          <div className="text-3xl font-bold text-blue-600">{analytics.summary.totalStudents}</div>
          <div className="text-sm text-gray-600 mt-1">Total Students</div>
        </div>
        <div className="bg-green-50 p-5 rounded-lg border border-green-200">
          <div className="text-3xl font-bold text-green-600">{analytics.summary.activeStudents}</div>
          <div className="text-sm text-gray-600 mt-1">Active Students</div>
        </div>
        <div className="bg-purple-50 p-5 rounded-lg border border-purple-200">
          <div className="text-3xl font-bold text-purple-600">{analytics.summary.avgCorrectness}%</div>
          <div className="text-sm text-gray-600 mt-1">Avg Correctness</div>
        </div>
        <div className="bg-orange-50 p-5 rounded-lg border border-orange-200">
          <div className="text-3xl font-bold text-orange-600">{analytics.summary.strugglingCount}</div>
          <div className="text-sm text-gray-600 mt-1">Need Help</div>
        </div>
      </div>

      {/* Student Performance List */}
      <div>
        <h4 className="font-bold text-gray-800 mb-3">Student Performance</h4>
        <div className="space-y-2">
          {analytics.students.map(student => {
            const getPerformanceColor = (level) => {
              switch (level) {
                case 'advanced': return 'bg-green-100 border-green-300 text-green-800'
                case 'on-track': return 'bg-blue-100 border-blue-300 text-blue-800'
                case 'struggling': return 'bg-red-100 border-red-300 text-red-800'
                case 'limited-data': return 'bg-yellow-100 border-yellow-300 text-yellow-800'
                default: return 'bg-gray-100 border-gray-300 text-gray-600'
              }
            }

            const getPerformanceLabel = (level) => {
              switch (level) {
                case 'advanced': return '🌟 Advanced'
                case 'on-track': return '✓ On Track'
                case 'struggling': return '⚠️ Needs Help'
                case 'limited-data': return '📊 Limited Data'
                default: return 'No Data'
              }
            }

            return (
              <div
                key={student.id}
                className={`p-4 rounded-lg border-2 ${getPerformanceColor(student.performanceLevel)}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-lg">{student.name}</div>
                    <div className="text-sm mt-1">
                      {student.totalResponses > 0 ? (
                        <>
                          {student.correctResponses}/{student.totalResponses} correct
                          {student.correctnessRate !== null && ` (${student.correctnessRate}%)`}
                        </>
                      ) : (
                        'No responses yet'
                      )}
                    </div>
                  </div>
                  <div className="text-sm font-bold">
                    {getPerformanceLabel(student.performanceLevel)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SlideGeneratorModal({ onClose, onGenerate, loading, subject }) {
  const [topic, setTopic] = useState('')
  const [gradeLevel, setGradeLevel] = useState('9th-10th')
  const [difficulty, setDifficulty] = useState('medium')
  const [slideCount, setSlideCount] = useState(10)

  function handleSubmit(e) {
    e.preventDefault()
    onGenerate({ topic, gradeLevel, difficulty, slideCount })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Generate AI Slides</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lesson Topic *
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="input-field"
              placeholder="e.g., The American Revolution, Photosynthesis, Shakespeare's Macbeth"
              required
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grade Level
              </label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="input-field"
                disabled={loading}
              >
                <option value="6th-8th">6th-8th Grade</option>
                <option value="9th-10th">9th-10th Grade</option>
                <option value="11th-12th">11th-12th Grade</option>
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
                disabled={loading}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Slides: {slideCount}
            </label>
            <input
              type="range"
              min="5"
              max="15"
              value={slideCount}
              onChange={(e) => setSlideCount(parseInt(e.target.value))}
              className="w-full"
              disabled={loading}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>5 slides</span>
              <span>15 slides</span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-gray-700">
              <strong>Subject:</strong> {subject}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              AI will generate {slideCount} slides about "{topic || 'your topic'}" tailored for {gradeLevel} students
            </p>
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
              disabled={loading || !topic.trim()}
            >
              {loading ? 'Generating...' : '✨ Generate Slides'}
            </button>
          </div>
        </form>
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
