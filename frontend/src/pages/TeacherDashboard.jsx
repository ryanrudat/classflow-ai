import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { sessionsAPI, aiAPI, activitiesAPI, analyticsAPI, slidesAPI, studentHelpAPI, completionAPI } from '../services/api'
import { useSocket } from '../hooks/useSocket'
import LiveMonitoring from '../components/LiveMonitoring'
import StudentDetailModal from '../components/StudentDetailModal'
import ReactivateDialog from '../components/ReactivateDialog'
import ActivityStatusBadge from '../components/ActivityStatusBadge'
import UnlockActivityModal from '../components/UnlockActivityModal'
import SessionJoinCard from '../components/SessionJoinCard'
import ConfusionMeter from '../components/ConfusionMeter'
import SaveToLibraryButton from '../components/SaveToLibraryButton'
import DocumentUpload from '../components/DocumentUpload'
import GenerateFromDocumentModal from '../components/GenerateFromDocumentModal'
import { NoSessionsEmpty, NoStudentsEmpty, NoSlidesEmpty, NoAnalyticsEmpty, NoSessionSelectedEmpty } from '../components/EmptyState'
import {
  LoadingSpinner,
  StudentListSkeleton,
  ActivityCardSkeleton,
  SlideDeckSkeleton,
  AIGenerationProgress
} from '../components/LoadingStates'
import { ErrorMessage, getErrorMessage } from '../components/ErrorMessages'
import { useNotifications } from '../components/Toast'

export default function TeacherDashboard() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const { notifySuccess, notifyError, notifySessionCreated } = useNotifications()

  const [sessions, setSessions] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showReactivateDialog, setShowReactivateDialog] = useState(false)
  const [sessionToReactivate, setSessionToReactivate] = useState(null)
  const [clickedInstanceForReactivation, setClickedInstanceForReactivation] = useState(null)
  const [reactivateInstances, setReactivateInstances] = useState([])

  // Load sessions on mount
  useEffect(() => {
    loadSessions()
  }, [])

  // Auto-select session when navigating back from Reverse Tutoring Dashboard
  useEffect(() => {
    if (location.state?.selectedSessionId && sessions.length > 0) {
      const sessionToSelect = sessions.find(s => s.id === location.state.selectedSessionId)
      if (sessionToSelect) {
        setActiveSession(sessionToSelect)
        // Clear the state so it doesn't interfere with future navigation
        window.history.replaceState({}, document.title)
      }
    }
  }, [location.state, sessions])

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
      notifySessionCreated()
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
      notifySuccess('Session has been ended successfully')
    } catch (err) {
      notifyError('Failed to end session. Please try again.')
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
      notifyError('Failed to load session data. Please try again.')
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
      notifySuccess('Session resumed successfully')
    } catch (err) {
      notifyError('Failed to resume session. Please try again.')
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
      notifySuccess('New period started successfully')
    } catch (err) {
      notifyError('Failed to start new period. Please try again.')
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
      notifySuccess('Session deleted successfully')
    } catch (err) {
      notifyError('Failed to delete session. Please try again.')
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/library', { state: { selectedSessionId: activeSession?.id } })}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Library
            </button>
            <button
              onClick={handleLogout}
              className="btn-secondary text-sm"
            >
              Logout
            </button>
          </div>
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
                  <NoSessionsEmpty onCreate={() => setShowCreateModal(true)} />
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
              <div className="card">
                <NoSessionSelectedEmpty onCreate={() => setShowCreateModal(true)} />
              </div>
            ) : (
              <ActiveSessionView
                session={activeSession}
                onEnd={() => endSession(activeSession.id)}
                onReactivate={() => reactivateSession(activeSession.id)}
                onUpdate={loadSessions}
                setClickedInstanceForReactivation={setClickedInstanceForReactivation}
                setSessionToReactivate={setSessionToReactivate}
                setShowReactivateDialog={setShowReactivateDialog}
                setReactivateInstances={setReactivateInstances}
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
          clickedInstance={clickedInstanceForReactivation}
          onResume={handleResumeInstance}
          onStartNew={handleStartNewInstance}
          onCancel={() => {
            setShowReactivateDialog(false)
            setSessionToReactivate(null)
            setClickedInstanceForReactivation(null)
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
          <div className="mb-4">
            <ErrorMessage
              type="error"
              title="Error Creating Session"
              message={error}
              onDismiss={() => setError('')}
            />
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

function ActiveSessionView({ session, onEnd, onReactivate, onUpdate, setClickedInstanceForReactivation, setSessionToReactivate, setShowReactivateDialog, setReactivateInstances }) {
  const navigate = useNavigate()
  const { notifySuccess, notifyError, notifyActivityPushed, notifyContentGenerated } = useNotifications()
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
  // Icon components for tabs
  const getTabIcon = (tabId) => {
    const iconClass = "w-5 h-5"
    switch(tabId) {
      case 'overview':
        return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
      case 'present':
        return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
      case 'activities':
        return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
      case 'analytics':
        return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
      default:
        return null
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', badge: students.length },
    { id: 'present', label: 'Present' },
    { id: 'activities', label: 'Activities', badge: sessionActivities.length > 0 ? sessionActivities.length : null },
    { id: 'analytics', label: 'Analytics' }
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

      notifyActivityPushed()
    } catch (err) {
      notifyError('Failed to push content. Please try again.')
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
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/reverse-tutoring/dashboard/${session.id}`)}
              className="px-4 py-2 bg-purple-500 text-white text-sm font-medium rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2 group relative"
              title="Create topics and monitor student conversations"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Reverse Tutoring</span>
              {/* Helpful tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap">
                  Set up topics & monitor students teaching AI
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
            </button>
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
                {getTabIcon(tab.id)}
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
              currentSession={session}
              setClickedInstanceForReactivation={setClickedInstanceForReactivation}
              setSessionToReactivate={setSessionToReactivate}
              setShowReactivateDialog={setShowReactivateDialog}
              setReactivateInstances={setReactivateInstances}
              handleSelectPreviousActivity={handleSelectPreviousActivity}
              setActiveTab={setActiveTab}
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
function OverviewTab({ session, isConnected, students, instances, selectedInstance, setSelectedInstance, loadInstanceStudents, studentResponses, loadingInstance, removeStudent, setStudents, sessionActivities, selectedStudentDetail, setSelectedStudentDetail, currentSession, setClickedInstanceForReactivation, setSessionToReactivate, setShowReactivateDialog, setReactivateInstances, handleSelectPreviousActivity, setActiveTab }) {
  const { notifySuccess, notifyError } = useNotifications()
  const { on, off, clearAllConfusion } = useSocket()
  const [studentProgressData, setStudentProgressData] = useState([])
  const [studentIdToRemove, setStudentIdToRemove] = useState(null)
  const [studentCompletions, setStudentCompletions] = useState({}) // Map of studentId -> completions
  const [loadingCompletions, setLoadingCompletions] = useState(false)
  const [unlockModal, setUnlockModal] = useState(null) // { studentId, studentName, activityId, activityName }
  const [unlocking, setUnlocking] = useState(false)
  const [confusedStudents, setConfusedStudents] = useState([]) // Track confused students

  // Find active quiz/questions activities for live monitoring
  const activeMonitoringActivity = sessionActivities.find(a =>
    (a.type === 'quiz' || a.type === 'questions') && a.pushed_to
  )

  // Listen for confusion updates
  useEffect(() => {
    const handleConfusionUpdate = ({ studentId, studentName, isConfused, timestamp }) => {
      setConfusedStudents(prev => {
        if (isConfused) {
          // Add student to confused list if not already there
          if (!prev.find(s => s.id === studentId)) {
            return [...prev, { id: studentId, name: studentName, timestamp }]
          }
          return prev
        } else {
          // Remove student from confused list
          return prev.filter(s => s.id !== studentId)
        }
      })
    }

    on('confusion-updated', handleConfusionUpdate)

    return () => {
      off('confusion-updated', handleConfusionUpdate)
    }
  }, [on, off])

  // Clear all confusion
  const handleClearConfusion = () => {
    setConfusedStudents([])
    clearAllConfusion(session.id)
  }

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
      notifySuccess(`Successfully unlocked "${unlockModal.activityName}" for ${unlockModal.studentName}`)
    } catch (error) {
      console.error('Failed to unlock activity:', error)
      notifyError(`Failed to unlock activity: ${error.response?.data?.message || error.message}`)
    } finally {
      setUnlocking(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Join Code Card with QR Code */}
      <SessionJoinCard session={session} />

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

      {/* Confusion Meter - Real-time student feedback */}
      {selectedInstance?.is_current && (
        <ConfusionMeter
          confusedStudents={confusedStudents}
          totalStudents={students.length}
          onAcknowledge={handleClearConfusion}
        />
      )}

      {/* Class Periods */}
      {instances.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-800">Class Periods</h3>
            {instances.length > 1 && (
              <span className="text-sm text-gray-600">
                {instances.length} {instances.length === 1 ? 'period' : 'periods'}
              </span>
            )}
          </div>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
            role="tablist"
            aria-label="Class periods"
          >
            {instances.map(instance => {
              const isSelected = selectedInstance?.id === instance.id
              const instanceDate = new Date(instance.started_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })
              const instanceTime = new Date(instance.started_at).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit'
              })

              return (
                <button
                  key={instance.id}
                  onClick={() => {
                    // Always select the instance and load its students
                    setSelectedInstance(instance)
                    loadInstanceStudents(instance.id)
                  }}
                  role="tab"
                  aria-selected={isSelected}
                  aria-controls="period-students"
                  aria-label={`${instance.label || `Period ${instance.instance_number}`}, ${instance.is_current ? 'current period' : 'ended period'}, ${instance.student_count || 0} students, started ${instanceDate}`}
                  className={`relative p-4 rounded-lg font-medium transition-all text-left group focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-600 focus:ring-indigo-500'
                      : instance.is_current
                      ? 'bg-indigo-50 text-indigo-900 border-2 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 focus:ring-indigo-500'
                      : 'bg-gray-50 text-gray-900 border-2 border-gray-200 hover:bg-gray-100 hover:border-gray-300 focus:ring-gray-500'
                  }`}
                >
                  {/* Status Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : instance.is_current
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-gray-200 text-gray-700 border border-gray-300'
                    }`}>
                      {instance.is_current ? '● Active' : '○ Ended'}
                    </span>
                    {isSelected && (
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>

                  {/* Period Name */}
                  <div className={`font-bold text-base mb-1 ${
                    isSelected ? 'text-white' : 'text-gray-900'
                  }`}>
                    {instance.label || `Period ${instance.instance_number}`}
                  </div>

                  {/* Student Count */}
                  <div className={`flex items-center gap-1 text-sm mb-2 ${
                    isSelected ? 'text-white/90' : 'text-gray-600'
                  }`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span className="font-medium">{instance.student_count || 0}</span>
                    <span className={isSelected ? 'text-white/75' : 'text-gray-500'}>
                      {instance.student_count === 1 ? 'student' : 'students'}
                    </span>
                  </div>

                  {/* Date & Time */}
                  <div className={`text-xs ${
                    isSelected ? 'text-white/75' : 'text-gray-500'
                  }`}>
                    <div>{instanceDate}</div>
                    <div>{instanceTime}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Period Warning Banner */}
      {selectedInstance && !selectedInstance.is_current && (
        <div
          className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4"
          role="alert"
          aria-live="polite"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-amber-700 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <div className="font-bold text-amber-900">
                  Viewing Past Period: {selectedInstance.label || `Period ${selectedInstance.instance_number}`}
                </div>
                <div className="text-sm text-amber-800 mt-1">
                  Ended on {new Date(selectedInstance.ended_at || selectedInstance.started_at).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setClickedInstanceForReactivation(selectedInstance)
                setSessionToReactivate(currentSession)
                setReactivateInstances(instances)
                setShowReactivateDialog(true)
              }}
              className="px-4 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center gap-2 justify-center"
              aria-label={`Reactivate ${selectedInstance.label || `Period ${selectedInstance.instance_number}`}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Reactivate Period</span>
            </button>
          </div>
        </div>
      )}

      {/* Students in this Period */}
      <div id="period-students" role="tabpanel" aria-labelledby="period-students-heading">
        <h3 id="period-students-heading" className="text-lg font-bold text-gray-800 mb-3">
          Students
          {selectedInstance && instances.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-600">
              in {selectedInstance.label || `Period ${selectedInstance.instance_number}`}
            </span>
          )}
        </h3>

        {loadingInstance ? (
          <StudentListSkeleton count={3} />
        ) : students.length === 0 ? (
          <NoStudentsEmpty
            joinCode={session.join_code}
            isCurrent={selectedInstance?.is_current}
          />
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
                                    <span className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                      completion.is_locked
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                      {completion.is_locked ? (
                                        <>
                                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                          </svg>
                                          Locked
                                        </>
                                      ) : (
                                        <>
                                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                          </svg>
                                          Complete
                                        </>
                                      )}
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
              const getActivityIcon = (type) => {
                const iconClass = "w-5 h-5"
                switch(type) {
                  case 'reading':
                    return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  case 'questions':
                    return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  case 'quiz':
                    return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                  case 'discussion':
                    return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  default:
                    return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                }
              }

              return (
                <div
                  key={activity.id}
                  onClick={() => {
                    handleSelectPreviousActivity(activity)
                    setActiveTab('activities')
                  }}
                  className="p-3 rounded-lg border-2 border-gray-200 bg-white hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {getActivityIcon(activity.type)}
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
                    <div className="ml-3 text-gray-400 hover:text-blue-600 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
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
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Live Progress Monitoring
          </h3>
          <LiveMonitoring
            sessionId={session.id}
            activityId={activeMonitoringActivity.id}
            instanceId={selectedInstance?.id}
            allowedStudentIds={students.map(s => s.id)}
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
        <SlideDeckSkeleton count={2} />
      ) : slideDecks.length === 0 ? (
        <NoSlidesEmpty onGenerate={() => setShowSlideGenerator(true)} />
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
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={() => navigate(`/present/${deck.id}`)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Present
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
  const { notifySuccess, notifyError } = useNotifications()
  const [generateModal, setGenerateModal] = useState(null)
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const handleDocumentGenerated = async (newActivity) => {
    setGeneratedContent(newActivity)
    // Reload session activities
    try {
      const activitiesData = await sessionsAPI.getActivities(session.id)
      setSessionActivities(activitiesData.activities || [])
    } catch (err) {
      console.error('Failed to reload activities:', err)
    }
  }

  const handleDeleteDocument = async (documentId) => {
    setDeleting(true)
    try {
      await api.delete(`/documents/${documentId}`)
      notifySuccess('Document deleted successfully')

      // Remove from local state
      setSessionActivities(sessionActivities.filter(a => a.id !== documentId))

      // Close modal
      setDeleteConfirmModal(null)
    } catch (err) {
      console.error('Delete document error:', err)
      notifyError(err.response?.data?.message || 'Failed to delete document')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* AI Content Generator */}
      <div>
        <h3 className="text-xl font-bold text-gray-800 mb-4">Generate AI Content</h3>

        {error && (
          <div className="mb-4">
            <ErrorMessage
              type="error"
              title="Content Generation Failed"
              message={error}
              action="Try Again"
              onAction={() => setError('')}
              onDismiss={() => setError('')}
            />
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
            className="btn-primary w-full flex items-center justify-center gap-2"
            disabled={generating || !prompt.trim()}
          >
            {generating ? (
              'Generating with AI...'
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Generate Content
              </>
            )}
          </button>
        </form>

        {/* Generated Content Preview */}
        {generatedContent && (
          <div className="mt-6 border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-gray-800">Generated Content:</h4>
              <div className="flex items-center gap-2">
                <SaveToLibraryButton
                  activity={generatedContent}
                  variant="button"
                />
                <button
                  onClick={handlePush}
                  className="btn-primary text-sm"
                >
                  Push to All Students
                </button>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto border border-gray-200">
              <ContentPreview content={generatedContent.content} type={generatedContent.type} />
            </div>

            {/* Generate from Content Options */}
            {generatedContent.type === 'reading' && (
              <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Generate activities based on this passage:
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleGenerateFromContent('questions')}
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    disabled={generating}
                  >
                    {generating ? (
                      'Generating...'
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Generate Questions
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleGenerateFromContent('quiz')}
                    className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    disabled={generating}
                  >
                    {generating ? (
                      'Generating...'
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        Generate Quiz
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Document Upload Section */}
      <div className="border-t pt-6">
        <DocumentUpload
          sessionId={session.id}
          onActivityGenerated={async (activity) => {
            setGeneratedContent(activity)
            // Reload session activities from server to get the saved activity
            try {
              const activitiesData = await sessionsAPI.getActivities(session.id)
              setSessionActivities(activitiesData.activities || [])
            } catch (err) {
              console.error('Failed to reload activities:', err)
              // Fallback: manually add to list if reload fails
              setSessionActivities([activity, ...sessionActivities])
            }
          }}
        />
      </div>

      {/* Session History */}
      {sessionActivities.length > 0 && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Session History ({sessionActivities.length} {sessionActivities.length === 1 ? 'activity' : 'activities'})
          </h3>
          {loadingActivities ? (
            <ActivityCardSkeleton count={3} />
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {sessionActivities.map(activity => {
                const isSelected = generatedContent?.id === activity.id
                const getActivityIcon = (type) => {
                  const iconClass = "w-5 h-5"
                  switch(type) {
                    case 'reading':
                      return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    case 'questions':
                      return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    case 'quiz':
                      return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                    case 'discussion':
                      return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    case 'document':
                      return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    default:
                      return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  }
                }

                // Documents need special handling
                const isDocument = activity.type === 'document'

                // Parse document content if needed
                const documentContent = isDocument && activity.content
                  ? (typeof activity.content === 'string' ? JSON.parse(activity.content) : activity.content)
                  : null

                // Render document card differently
                if (isDocument) {
                  return (
                    <div
                      key={activity.id}
                      className="p-3 rounded-lg border-2 border-purple-200 bg-purple-50 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {getActivityIcon(activity.type)}
                            <span className="font-medium text-gray-900">
                              Saved Document
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mt-1 font-medium">
                            {documentContent?.filename || activity.prompt}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                            {documentContent?.textLength && (
                              <>
                                <span>{documentContent.textLength.toLocaleString()} characters</span>
                                <span>•</span>
                              </>
                            )}
                            <span>{new Date(activity.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteConfirmModal(activity)
                          }}
                          className="text-red-600 hover:text-red-700 transition-colors p-1"
                          title="Delete document"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setGenerateModal(activity)
                          }}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Generate Activity
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteConfirmModal(activity)
                          }}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                }

                // Regular activity card
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
                          {getActivityIcon(activity.type)}
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

      {/* Generate From Document Modal */}
      {generateModal && (
        <GenerateFromDocumentModal
          document={generateModal}
          onClose={() => setGenerateModal(null)}
          onGenerated={handleDocumentGenerated}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">Delete Document</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Are you sure you want to delete this document? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg mb-4">
              <p className="text-sm font-medium text-gray-900">
                {typeof deleteConfirmModal.content === 'string'
                  ? JSON.parse(deleteConfirmModal.content).filename
                  : deleteConfirmModal.content?.filename || deleteConfirmModal.prompt}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteDocument(deleteConfirmModal.id)}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Document
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AnalyticsTab({ analytics, loadingAnalytics, selectedInstance, session, instances }) {
  const { notifySuccess, notifyError } = useNotifications()
  const [exporting, setExporting] = useState(false)

  const handleExportGrades = async (exportAllPeriods = false) => {
    try {
      setExporting(true)
      if (exportAllPeriods) {
        await sessionsAPI.exportGrades(session.id)
      } else {
        await sessionsAPI.exportGrades(session.id, selectedInstance?.id)
      }
      notifySuccess('Grades exported successfully')
    } catch (err) {
      notifyError(`Failed to export grades: ${err.message}`)
    } finally {
      setExporting(false)
    }
  }

  if (loadingAnalytics) {
    return <LoadingSpinner text="Loading analytics..." size="large" />
  }

  if (!analytics) {
    return <NoAnalyticsEmpty />
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
                case 'advanced': return (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    Advanced
                  </span>
                )
                case 'on-track': return (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    On Track
                  </span>
                )
                case 'struggling': return (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Needs Help
                  </span>
                )
                case 'limited-data': return (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Limited Data
                  </span>
                )
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
              className="btn-primary flex-1 flex items-center justify-center gap-2"
              disabled={loading || !topic.trim()}
            >
              {loading ? (
                'Generating...'
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  Generate Slides
                </>
              )}
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
