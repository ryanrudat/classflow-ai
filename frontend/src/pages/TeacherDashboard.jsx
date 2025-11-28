import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import api, { sessionsAPI, aiAPI, activitiesAPI, analyticsAPI, slidesAPI, studentHelpAPI, completionAPI } from '../services/api'
import { useSocket } from '../hooks/useSocket'
import LiveMonitoring from '../components/LiveMonitoring'
import StudentDetailModal from '../components/StudentDetailModal'
import ReactivateDialog from '../components/ReactivateDialog'
import ActivityStatusBadge from '../components/ActivityStatusBadge'
import UnlockActivityModal from '../components/UnlockActivityModal'
import SessionJoinCard from '../components/SessionJoinCard'
import ConfusionMeter from '../components/ConfusionMeter'
import SaveToLibraryButton from '../components/SaveToLibraryButton'
import MediaUpload from '../components/MediaUpload'
import GenerateFromDocumentModal from '../components/GenerateFromDocumentModal'
import ActivityEditor from '../components/ActivityEditor'
import QuizEditor from '../components/QuizEditor'
import ReadingEditor from '../components/ReadingEditor'
import DiscussionQuestionsEditor from '../components/DiscussionQuestionsEditor'
import DiscussionPromptsEditor from '../components/DiscussionPromptsEditor'
import ConfirmDialog from '../components/ConfirmDialog'
import InteractiveVideoEditor from '../components/InteractiveVideoEditor'
import SentenceOrderingEditor from '../components/SentenceOrderingEditor'
import MatchingEditor from '../components/MatchingEditor'
import PollEditor from '../components/PollEditor'
import LessonFlowBuilder from '../components/LessonFlowBuilder'
import Leaderboard from '../components/Leaderboard'
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
  const [confirmDialog, setConfirmDialog] = useState(null)

  // Session editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingSubject, setIsEditingSubject] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [editedSubject, setEditedSubject] = useState('')

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
    setConfirmDialog({
      title: 'End Session?',
      message: 'Students will no longer be able to join this session. You can reactivate it later if needed.',
      confirmText: 'End Session',
      cancelText: 'Cancel',
      severity: 'warning',
      onConfirm: async () => {
        setConfirmDialog(null)
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
      },
      onCancel: () => setConfirmDialog(null)
    })
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

  async function updateSessionDetails(field, value) {
    if (!activeSession) return

    try {
      const updateData = { [field]: value }
      const response = await api.put(`/api/sessions/${activeSession.id}`, updateData)

      // Update local state
      const updatedSession = response.data.session
      setActiveSession(updatedSession)
      setSessions(sessions.map(s => s.id === updatedSession.id ? updatedSession : s))

      notifySuccess('Session updated successfully')
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to update session')
    } finally {
      setIsEditingTitle(false)
      setIsEditingSubject(false)
    }
  }

  function startEditingTitle() {
    setEditedTitle(activeSession.title)
    setIsEditingTitle(true)
  }

  function startEditingSubject() {
    setEditedSubject(activeSession.subject || '')
    setIsEditingSubject(true)
  }

  function cancelEdit() {
    setIsEditingTitle(false)
    setIsEditingSubject(false)
    setEditedTitle('')
    setEditedSubject('')
  }

  async function deleteSession(sessionId) {
    setConfirmDialog({
      title: 'Delete Session Permanently?',
      message: 'This action cannot be undone. All activities, student data, and analytics for this session will be permanently deleted.',
      confirmText: 'Delete Session',
      cancelText: 'Cancel',
      severity: 'danger',
      onConfirm: async () => {
        setConfirmDialog(null)
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
      },
      onCancel: () => setConfirmDialog(null)
    })
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
                setConfirmDialog={setConfirmDialog}
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

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={true}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          severity={confirmDialog.severity}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
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

function ActiveSessionView({ session, onEnd, onReactivate, onUpdate, setClickedInstanceForReactivation, setSessionToReactivate, setShowReactivateDialog, setReactivateInstances, setConfirmDialog }) {
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
  const [showVideoEditor, setShowVideoEditor] = useState(false)
  const [showSentenceOrderingEditor, setShowSentenceOrderingEditor] = useState(false)
  const [showMatchingEditor, setShowMatchingEditor] = useState(false)
  const [showPollEditor, setShowPollEditor] = useState(false)
  const [showLessonFlowBuilder, setShowLessonFlowBuilder] = useState(false)
  const [helpHistory, setHelpHistory] = useState([])
  const [loadingHelpHistory, setLoadingHelpHistory] = useState(false)
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null)

  // Inline editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingSubject, setIsEditingSubject] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [editedSubject, setEditedSubject] = useState('')

  const { joinSession, pushActivity, on, off, isConnected, removeStudent, emit } = useSocket()

  // Use a Map for O(1) lookups instead of array.findIndex - much faster with 30+ students
  // This ref must be declared at component level (not inside useEffect) per React Rules of Hooks
  const studentsMapRef = useRef(new Map())

  // Memoize online count to prevent rapid recalculations during state updates
  // This provides a stable count even when many events fire simultaneously
  const onlineCount = useMemo(() => {
    return students.filter(s => s.connected !== false).length
  }, [students])

  // Memoize sorted students list to prevent UI jumping when socket events update the array
  // Sort by: 1) Online students first, 2) Alphabetically by name
  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      // Online students first
      const aOnline = a.connected !== false
      const bOnline = b.connected !== false
      if (aOnline !== bOnline) {
        return aOnline ? -1 : 1
      }
      // Then alphabetically by name
      return (a.name || '').localeCompare(b.name || '')
    })
  }, [students])

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
    { id: 'overview', label: 'Overview', badge: onlineCount },
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
        console.log('📋 Frontend received activities:', {
          count: data.activities?.length || 0,
          types: data.activities?.map(a => a.type) || [],
          activities: data.activities
        })
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

      // IMPORTANT: Merge with existing students instead of replacing
      // This preserves students connected via socket (e.g., Reverse Tutoring) who aren't in this instance
      setStudents(prev => {
        const dbStudents = data.students.map(s => ({
          id: s.id,
          name: s.student_name,
          connected: false, // Will be updated to true when they join via WebSocket
          account_id: s.account_id
        }))

        // Keep any students that are currently connected but not in the database for this instance
        const connectedOnly = prev.filter(p => p.connected && !dbStudents.find(db => db.id === p.id))

        // Merge database students with connected-only students
        return [...dbStudents, ...connectedOnly]
      })

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

    // Listen for students who are already online (sent when teacher joins)
    const handleStudentsOnline = ({ students: onlineStudents }) => {
      console.log('📢 Received online students:', onlineStudents)

      // Batch update using a single setState call to prevent race conditions
      setStudents(prev => {
        // Build a map from previous state for fast lookups
        const studentsMap = new Map(prev.map(s => [s.id, s]))

        // Update all online students in one pass
        onlineStudents.forEach(({ studentId, studentName }) => {
          if (studentsMap.has(studentId)) {
            // Mark existing student as connected
            const existing = studentsMap.get(studentId)
            studentsMap.set(studentId, { ...existing, connected: true, lastSeen: Date.now() })
          } else {
            // Add new student
            studentsMap.set(studentId, {
              id: studentId,
              name: studentName || `Student ${studentId.slice(0, 6)}`,
              connected: true,
              lastSeen: Date.now()
            })
          }
        })

        // Store in ref for quick access
        studentsMapRef.current = studentsMap
        return Array.from(studentsMap.values())
      })
    }

    // Listen for student joins - debounced to prevent rapid flickering
    const handleUserJoined = ({ role, studentId, studentName, timestamp }) => {
      if (role !== 'student') return

      // Use requestAnimationFrame to batch updates within the same render cycle
      requestAnimationFrame(() => {
        setStudents(prev => {
          // Use Map for O(1) lookup
          const studentsMap = new Map(prev.map(s => [s.id, s]))
          const now = Date.now()

          if (studentsMap.has(studentId)) {
            // Student reconnecting - only update if this is a newer event
            const existing = studentsMap.get(studentId)
            const eventTime = timestamp ? new Date(timestamp).getTime() : now

            if (!existing.lastSeen || eventTime >= existing.lastSeen) {
              studentsMap.set(studentId, {
                ...existing,
                connected: true,
                lastSeen: eventTime
              })
            }
          } else {
            // New student joining
            studentsMap.set(studentId, {
              id: studentId,
              name: studentName || `Student ${studentId.slice(0, 6)}`,
              connected: true,
              lastSeen: now
            })
          }

          studentsMapRef.current = studentsMap
          return Array.from(studentsMap.values())
        })
      })
    }

    // Listen for student responses
    const handleStudentResponded = ({ activityId, studentId, response }) => {
      setStudentResponses(prev => [...prev, { activityId, studentId, response }])
    }

    // Listen for student leaving - debounced to prevent rapid flickering
    const handleUserLeft = ({ role, studentId, timestamp }) => {
      if (role !== 'student') return

      // Use requestAnimationFrame to batch updates
      requestAnimationFrame(() => {
        setStudents(prev => {
          const studentsMap = new Map(prev.map(s => [s.id, s]))
          const now = Date.now()

          if (studentsMap.has(studentId)) {
            const existing = studentsMap.get(studentId)
            const eventTime = timestamp ? new Date(timestamp).getTime() : now

            // Only mark as disconnected if this is a newer event
            // This prevents out-of-order events from causing flickering
            if (!existing.lastSeen || eventTime >= existing.lastSeen) {
              studentsMap.set(studentId, {
                ...existing,
                connected: false,
                lastSeen: eventTime
              })
            }
          }

          studentsMapRef.current = studentsMap
          return Array.from(studentsMap.values())
        })
      })
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

    on('students-online', handleStudentsOnline)
    on('user-joined', handleUserJoined)
    on('student-responded', handleStudentResponded)
    on('user-left', handleUserLeft)
    on('student-removed', handleStudentRemoved)
    on('live-progress-update', handleLiveProgressUpdate)

    return () => {
      off('students-online', handleStudentsOnline)
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
        slideData.slideCount,
        slideData.includeQuizzes,
        slideData.presentationStyle
      )

      // Navigate to the slide editor
      navigate(`/slides/edit/${result.deck.id}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate slides')
    } finally {
      setGeneratingSlides(false)
    }
  }

  // Inline editing functions
  async function updateSessionDetails(field, value) {
    if (!session) return

    try {
      const updateData = { [field]: value }
      const response = await api.put(`/api/sessions/${session.id}`, updateData)

      // Trigger parent to reload sessions
      if (onUpdate) {
        onUpdate()
      }

      notifySuccess('Session updated successfully')
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to update session')
    } finally {
      setIsEditingTitle(false)
      setIsEditingSubject(false)
    }
  }

  function startEditingTitle() {
    setEditedTitle(session.title)
    setIsEditingTitle(true)
  }

  function startEditingSubject() {
    setEditedSubject(session.subject || '')
    setIsEditingSubject(true)
  }

  function cancelEdit() {
    setIsEditingTitle(false)
    setIsEditingSubject(false)
    setEditedTitle('')
    setEditedSubject('')
  }

  return (
    <div className="space-y-4">
      {/* Sticky Session Header */}
      <div className="card bg-primary-50 border-primary-200 sticky top-0 z-10 shadow-md">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <div className="flex items-center gap-3 group">
              <div className="flex-1">
                {/* Editable Title */}
                <div className="flex items-center gap-2 mb-1">
                  {isEditingTitle ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') updateSessionDetails('title', editedTitle)
                          if (e.key === 'Escape') cancelEdit()
                        }}
                        className="text-xl font-bold text-gray-900 border-2 border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <button
                        onClick={() => updateSessionDetails('title', editedTitle)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                        title="Save"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Cancel"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-xl font-bold text-gray-900">{session.title}</h2>
                      <button
                        onClick={startEditingTitle}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Edit title"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>

                {/* Editable Subject */}
                <div className="flex items-center gap-2">
                  {isEditingSubject ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={editedSubject}
                        onChange={(e) => setEditedSubject(e.target.value)}
                        className="text-sm text-gray-600 border-2 border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      >
                        <option value="">Select subject...</option>
                        <option value="English">English</option>
                        <option value="History">History</option>
                        <option value="Social Studies">Social Studies</option>
                        <option value="Government">Government</option>
                        <option value="Biology">Biology</option>
                      </select>
                      <button
                        onClick={() => updateSessionDetails('subject', editedSubject)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                        title="Save"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Cancel"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600">{session.subject || 'No subject'}</p>
                      <button
                        onClick={startEditingSubject}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Edit subject"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-gray-600">
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </div>
              <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                {onlineCount} Online
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
              sortedStudents={sortedStudents}
              onlineCount={onlineCount}
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
              setConfirmDialog={setConfirmDialog}
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
              showLessonFlowBuilder={showLessonFlowBuilder}
              setShowLessonFlowBuilder={setShowLessonFlowBuilder}
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
              setShowVideoEditor={setShowVideoEditor}
              setShowSentenceOrderingEditor={setShowSentenceOrderingEditor}
              setShowMatchingEditor={setShowMatchingEditor}
              setShowPollEditor={setShowPollEditor}
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

      {/* Interactive Video Editor */}
      {showVideoEditor && session && (
        <InteractiveVideoEditor
          sessionId={session.id}
          onClose={() => setShowVideoEditor(false)}
          onSaved={(activity) => {
            // Reload activities to show the new video activity
            if (selectedInstance) {
              loadSessionActivities(session.id, selectedInstance.id)
            }
            setShowVideoEditor(false)
          }}
        />
      )}

      {/* Sentence Ordering Editor */}
      {showSentenceOrderingEditor && session && (
        <SentenceOrderingEditor
          sessionId={session.id}
          onClose={() => setShowSentenceOrderingEditor(false)}
          onSaved={(activity) => {
            // Reload activities to show the new sentence ordering activity
            if (selectedInstance) {
              loadSessionActivities(session.id, selectedInstance.id)
            }
            setShowSentenceOrderingEditor(false)
          }}
        />
      )}

      {/* Matching Editor */}
      {showMatchingEditor && session && (
        <MatchingEditor
          sessionId={session.id}
          onClose={() => setShowMatchingEditor(false)}
          onSaved={(activity) => {
            // Reload activities to show the new matching activity
            if (selectedInstance) {
              loadSessionActivities(session.id, selectedInstance.id)
            }
            setShowMatchingEditor(false)
          }}
        />
      )}

      {/* Poll Editor */}
      {showPollEditor && session && (
        <PollEditor
          sessionId={session.id}
          onClose={() => setShowPollEditor(false)}
          onSaved={(activity) => {
            // Reload activities to show the new poll
            if (selectedInstance) {
              loadSessionActivities(session.id, selectedInstance.id)
            }
            setShowPollEditor(false)
          }}
        />
      )}
    </div>
  )
}

// Tab Components
function OverviewTab({ session, isConnected, students, sortedStudents, onlineCount, instances, selectedInstance, setSelectedInstance, loadInstanceStudents, studentResponses, loadingInstance, removeStudent, setStudents, sessionActivities, selectedStudentDetail, setSelectedStudentDetail, currentSession, setClickedInstanceForReactivation, setSessionToReactivate, setShowReactivateDialog, setReactivateInstances, handleSelectPreviousActivity, setActiveTab, setConfirmDialog }) {
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
              {onlineCount} / {students.length} online
            </div>
            <div className="space-y-4">
              {sortedStudents.map(student => {
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
                          setConfirmDialog({
                            title: 'Remove Student?',
                            message: `Remove ${student.name} from this session? They will no longer be able to participate.`,
                            confirmText: 'Remove Student',
                            cancelText: 'Cancel',
                            severity: 'warning',
                            onConfirm: () => {
                              setConfirmDialog(null)
                              removeStudent(session.id, student.id)
                              setStudents(prev => prev.filter(s => s.id !== student.id))
                            },
                            onCancel: () => setConfirmDialog(null)
                          })
                        }}
                        className="ml-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Remove student"
                        aria-label={`Remove ${student.name} from session`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
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
                  case 'interactive_video':
                    return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  case 'sentence_ordering':
                    return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                  case 'matching':
                    return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" d="M14 3v6h6" /></svg>
                  case 'poll':
                    return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
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

      {/* Leaderboard */}
      {selectedInstance && (
        <Leaderboard
          sessionId={session.id}
          instanceId={selectedInstance.id}
          viewMode="teacher"
          maxEntries={10}
        />
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
  handleGenerate, handlePush, handleGenerateFromContent, handleSelectPreviousActivity,
  setShowVideoEditor, setShowSentenceOrderingEditor, setShowMatchingEditor, setShowPollEditor,
  showLessonFlowBuilder, setShowLessonFlowBuilder
}) {
  const { notifySuccess, notifyError} = useNotifications()
  const [generateModal, setGenerateModal] = useState(null)
  const [viewDocumentModal, setViewDocumentModal] = useState(null)
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [editActivityModal, setEditActivityModal] = useState(null)

  // Inline editing state
  const [inlineEditMode, setInlineEditMode] = useState(false)
  const [editedContent, setEditedContent] = useState(null)
  const [saving, setSaving] = useState(false)

  // Lesson flow state
  const [lessonFlows, setLessonFlows] = useState([])
  const [loadingFlows, setLoadingFlows] = useState(false)

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

  const handleDeleteActivity = async (activityId) => {
    setDeleting(true)
    try {
      await api.delete(`/activities/${activityId}`)
      notifySuccess('Activity deleted successfully')

      // Remove from local state
      setSessionActivities(sessionActivities.filter(a => a.id !== activityId))

      // Clear generated content if it was the deleted activity
      if (generatedContent?.id === activityId) {
        setGeneratedContent(null)
      }

      // Close modal
      setDeleteConfirmModal(null)
    } catch (err) {
      console.error('Delete activity error:', err)
      notifyError(err.response?.data?.message || 'Failed to delete activity')
    } finally {
      setDeleting(false)
    }
  }

  const handleActivityEdited = async (updatedActivity) => {
    // Reload activities to get updated content
    try {
      const activitiesData = await sessionsAPI.getActivities(session.id)
      setSessionActivities(activitiesData.activities || [])

      // If this was the selected activity, update it
      if (generatedContent?.id === updatedActivity.id) {
        setGeneratedContent(updatedActivity)
      }
    } catch (err) {
      console.error('Failed to reload activities:', err)
    }
  }

  const handleEnterEditMode = () => {
    if (!generatedContent) return
    setEditedContent(generatedContent.content)
    setInlineEditMode(true)
  }

  const handleCancelEdit = () => {
    setInlineEditMode(false)
    setEditedContent(null)
  }

  // Load lesson flows
  const loadLessonFlows = async () => {
    if (!session?.id) return

    try {
      setLoadingFlows(true)
      const token = JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/sessions/${session.id}/lesson-flows`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      setLessonFlows(data.flows || [])
    } catch (error) {
      console.error('Failed to load lesson flows:', error)
    } finally {
      setLoadingFlows(false)
    }
  }

  useEffect(() => {
    loadLessonFlows()
  }, [session?.id])

  const handleStartFlow = async (flowId) => {
    try {
      const token = JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/lesson-flows/${flowId}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      // Update local state
      setLessonFlows(flows => flows.map(f => ({
        ...f,
        is_active: f.id === flowId
      })))

      notifySuccess('Lesson flow started! Students will now see sequential activities.')
    } catch (error) {
      console.error('Failed to start flow:', error)
      notifyError('Failed to start lesson flow')
    }
  }

  const handleStopFlow = async (flowId) => {
    try {
      const token = JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/lesson-flows/${flowId}/stop`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      // Update local state
      setLessonFlows(flows => flows.map(f => ({
        ...f,
        is_active: false
      })))

      notifySuccess('Lesson flow stopped')
    } catch (error) {
      console.error('Failed to stop flow:', error)
      notifyError('Failed to stop lesson flow')
    }
  }

  const handleDeleteFlow = async (flowId) => {
    try {
      const token = JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/lesson-flows/${flowId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      // Remove from local state
      setLessonFlows(flows => flows.filter(f => f.id !== flowId))

      notifySuccess('Lesson flow deleted')
    } catch (error) {
      console.error('Failed to delete flow:', error)
      notifyError('Failed to delete lesson flow')
    }
  }

  const handleSaveInlineEdit = async () => {
    if (!generatedContent || !editedContent) return

    setSaving(true)
    try {
      const response = await api.put(`/activities/${generatedContent.id}/content`, {
        content: editedContent
      })

      notifySuccess('Activity updated successfully!')

      // Update local state
      const updatedActivity = response.data.activity
      setGeneratedContent(updatedActivity)

      // Update in session activities list
      setSessionActivities(sessionActivities.map(a =>
        a.id === updatedActivity.id ? updatedActivity : a
      ))

      setInlineEditMode(false)
      setEditedContent(null)
    } catch (error) {
      console.error('Save error:', error)
      notifyError(error.response?.data?.message || 'Failed to update activity')
    } finally {
      setSaving(false)
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
                <option value="questions">Critical Thinking Questions</option>
                <option value="quiz">Multiple Choice Quiz</option>
                <option value="mixed">Mixed Questions (Both Types)</option>
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

        {/* Interactive Activities Section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Interactive Activities
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {/* Sentence Ordering */}
            <button
              onClick={() => setShowSentenceOrderingEditor(true)}
              className="px-4 py-3 bg-white border-2 border-gray-200 rounded-lg font-medium text-gray-700 hover:border-teal-500 hover:bg-teal-50 transition-all flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </div>
              <span className="text-sm">Sentence Ordering</span>
            </button>

            {/* Matching */}
            <button
              onClick={() => setShowMatchingEditor(true)}
              className="px-4 py-3 bg-white border-2 border-gray-200 rounded-lg font-medium text-gray-700 hover:border-indigo-500 hover:bg-indigo-50 transition-all flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <span className="text-sm">Drag & Match</span>
            </button>

            {/* Live Poll */}
            <button
              onClick={() => setShowPollEditor(true)}
              className="px-4 py-3 bg-white border-2 border-gray-200 rounded-lg font-medium text-gray-700 hover:border-green-500 hover:bg-green-50 transition-all flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-sm">Live Poll</span>
            </button>

            {/* Interactive Video */}
            <button
              onClick={() => setShowVideoEditor(true)}
              className="px-4 py-3 bg-white border-2 border-gray-200 rounded-lg font-medium text-gray-700 hover:border-purple-500 hover:bg-purple-50 transition-all flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-sm">Video + Questions</span>
            </button>
          </div>
        </div>

        {/* Lesson Flow - Featured */}
        <div className="mt-6">
          <button
            onClick={() => setShowLessonFlowBuilder(true)}
            className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all flex items-center justify-center gap-3 shadow-lg"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <div className="text-left">
              <div className="font-bold">Create Lesson Flow</div>
              <div className="text-xs text-purple-200">Combine multiple activities into one guided lesson</div>
            </div>
          </button>
        </div>

        {/* Existing Lesson Flows */}
        {lessonFlows.length > 0 && (
          <div className="mt-6 border-t pt-6">
            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-2xl">✨</span>
              Your Lesson Flows
            </h4>
            <div className="space-y-3">
              {lessonFlows.map(flow => (
                <div
                  key={flow.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    flow.is_active
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-semibold text-gray-900">{flow.title}</h5>
                        {flow.is_active && (
                          <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-medium rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      {flow.description && (
                        <p className="text-sm text-gray-600 mb-2">{flow.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          {flow.total_activities} activities
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {flow.is_active ? (
                        <button
                          onClick={() => handleStopFlow(flow.id)}
                          className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                        >
                          Stop
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartFlow(flow.id)}
                          className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
                        >
                          Start
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${flow.title}"? This cannot be undone.`)) {
                            handleDeleteFlow(flow.id)
                          }
                        }}
                        className="px-3 py-1.5 bg-red-50 text-red-600 text-sm rounded hover:bg-red-100 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generated Content Preview */}
        {generatedContent && (
          <div className="mt-6 border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-gray-800 flex items-center gap-2">
                Generated Content:
                {!inlineEditMode && (
                  <span className="text-xs text-gray-500 font-normal">
                    (Double-click to edit)
                  </span>
                )}
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGeneratedContent(null)}
                  className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5"
                  title="Delete generated content"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
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

            <div
              className={`p-4 rounded-lg border-2 transition-all ${
                inlineEditMode
                  ? 'bg-white border-blue-400'
                  : 'bg-gray-50 border-gray-200 cursor-pointer hover:border-gray-300 max-h-96 overflow-y-auto'
              }`}
              onDoubleClick={!inlineEditMode ? handleEnterEditMode : undefined}
            >
              {inlineEditMode ? (
                <InlineContentEditor
                  content={editedContent}
                  setContent={setEditedContent}
                  type={generatedContent.type}
                />
              ) : (
                <ContentPreview content={generatedContent.content} type={generatedContent.type} />
              )}
            </div>

            {/* Save/Cancel buttons when in edit mode */}
            {inlineEditMode && (
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveInlineEdit}
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  {saving ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Generate from Content Options */}
            {generatedContent.type === 'reading' && (
              <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Generate activities based on this passage:
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleGenerateFromContent('questions')}
                    className="py-3 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex flex-col items-center justify-center gap-1.5"
                    disabled={generating}
                  >
                    {generating ? (
                      'Generating...'
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span className="text-xs leading-tight">Critical Thinking</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleGenerateFromContent('quiz')}
                    className="py-3 px-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors flex flex-col items-center justify-center gap-1.5"
                    disabled={generating}
                  >
                    {generating ? (
                      'Generating...'
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        <span className="text-xs leading-tight">Multiple Choice</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleGenerateFromContent('mixed')}
                    className="py-3 px-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-medium rounded-lg transition-colors flex flex-col items-center justify-center gap-1.5"
                    disabled={generating}
                  >
                    {generating ? (
                      'Generating...'
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        <span className="text-xs leading-tight">Mixed Questions</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload Content Section */}
      <div className="border-t pt-6">
        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Upload Content
        </h4>
        <MediaUpload
          sessionId={session.id}
          onMediaUploaded={async (media) => {
            // Handle uploaded media (video or document saved for later)
            console.log('Media uploaded:', media)
            // Reload session activities from server
            try {
              const activitiesData = await sessionsAPI.getActivities(session.id)
              setSessionActivities(activitiesData.activities || [])
            } catch (err) {
              console.error('Failed to reload activities:', err)
            }
          }}
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
      <div className="border-t pt-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Session History ({sessionActivities.length} {sessionActivities.length === 1 ? 'item' : 'items'})
        </h3>
        {sessionActivities.length > 0 ? (
          loadingActivities ? (
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
                    case 'video':
                    case 'interactive_video':
                      return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    default:
                      return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  }
                }

                // Documents and videos need special handling
                const isDocument = activity.type === 'document'
                const isVideo = activity.type === 'video' || activity.type === 'interactive_video'

                // Parse content if needed
                const parsedContent = (isDocument || isVideo) && activity.content
                  ? (typeof activity.content === 'string' ? JSON.parse(activity.content) : activity.content)
                  : null

                // Render video card
                if (isVideo) {
                  const formatDuration = (seconds) => {
                    if (!seconds) return ''
                    const mins = Math.floor(seconds / 60)
                    const secs = seconds % 60
                    return `${mins}:${secs.toString().padStart(2, '0')}`
                  }

                  return (
                    <div
                      key={activity.id}
                      onClick={() => setGeneratedContent(activity)}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {getActivityIcon(activity.type)}
                            <span className="font-medium text-gray-900">
                              Video
                            </span>
                            {parsedContent?.duration && (
                              <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 rounded">
                                {formatDuration(parsedContent.duration)}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 mt-1 truncate">
                            {parsedContent?.originalFilename || activity.prompt || 'Untitled video'}
                          </p>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(activity.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteConfirmModal(activity)
                          }}
                          className="text-red-600 hover:text-red-700 transition-colors p-1"
                          title="Delete video"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                }

                // Use parsedContent for documents too
                const documentContent = parsedContent

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
                      <div className="flex gap-2 mt-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setViewDocumentModal(activity)
                          }}
                          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View/Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setGenerateModal(activity)
                          }}
                          className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Generate
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteConfirmModal(activity)
                          }}
                          className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className={`p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className="cursor-pointer"
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
                        <div className="ml-2 flex-shrink-0 flex items-start gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteConfirmModal(activity)
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors"
                            title="Delete activity"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                          {isSelected && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-1" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : (
          <div className="text-center py-8 px-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-600 font-medium">No activities or documents yet</p>
            <p className="text-sm text-gray-500 mt-1">Upload a document or generate an activity to get started</p>
          </div>
        )}
      </div>

      {/* View/Edit Document Modal */}
      {viewDocumentModal && (
        <GenerateFromDocumentModal
          document={viewDocumentModal}
          onClose={() => setViewDocumentModal(null)}
          onGenerated={handleDocumentGenerated}
          viewMode={true}
        />
      )}

      {/* Generate From Document Modal */}
      {generateModal && (
        <GenerateFromDocumentModal
          document={generateModal}
          onClose={() => setGenerateModal(null)}
          onGenerated={handleDocumentGenerated}
          viewMode={false}
        />
      )}

      {/* Activity Editor Modal - Choose editor based on activity type */}
      {editActivityModal && (() => {
        const editorProps = {
          activity: editActivityModal,
          onClose: () => setEditActivityModal(null),
          onSaved: handleActivityEdited
        }

        switch (editActivityModal.type) {
          case 'quiz':
            return <QuizEditor {...editorProps} />
          case 'reading':
            return <ReadingEditor {...editorProps} />
          case 'questions':
            return <DiscussionQuestionsEditor {...editorProps} />
          case 'discussion':
            return <DiscussionPromptsEditor {...editorProps} />
          default:
            return <ActivityEditor {...editorProps} />
        }
      })()}

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
                <h3 className="text-lg font-bold text-gray-900">
                  Delete {deleteConfirmModal.type === 'document' ? 'Document' : 'Activity'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Are you sure you want to delete this {deleteConfirmModal.type === 'document' ? 'document' : 'activity'}? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg mb-4">
              <p className="text-sm font-medium text-gray-900">
                {deleteConfirmModal.type === 'document'
                  ? (typeof deleteConfirmModal.content === 'string'
                      ? JSON.parse(deleteConfirmModal.content).filename
                      : deleteConfirmModal.content?.filename || deleteConfirmModal.prompt)
                  : `${deleteConfirmModal.type.charAt(0).toUpperCase() + deleteConfirmModal.type.slice(1)}: ${deleteConfirmModal.prompt}`
                }
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
                onClick={() => {
                  if (deleteConfirmModal.type === 'document') {
                    handleDeleteDocument(deleteConfirmModal.id)
                  } else {
                    handleDeleteActivity(deleteConfirmModal.id)
                  }
                }}
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
                    Delete {deleteConfirmModal.type === 'document' ? 'Document' : 'Activity'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Flow Builder Modal */}
      {showLessonFlowBuilder && session && (
        <LessonFlowBuilder
          sessionId={session.id}
          onClose={() => setShowLessonFlowBuilder(false)}
          onSaved={(flow) => {
            // Reload lesson flows to show the new one
            loadLessonFlows()
            setShowLessonFlowBuilder(false)
          }}
        />
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
  const [includeQuizzes, setIncludeQuizzes] = useState(true)
  const [presentationStyle, setPresentationStyle] = useState('professional')

  function handleSubmit(e) {
    e.preventDefault()
    onGenerate({ topic, gradeLevel, difficulty, slideCount, includeQuizzes, presentationStyle })
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
              Presentation Style
            </label>
            <select
              value={presentationStyle}
              onChange={(e) => setPresentationStyle(e.target.value)}
              className="input-field"
              disabled={loading}
            >
              <option value="minimal">Minimal - Clean and simple</option>
              <option value="professional">Professional - Corporate and polished</option>
              <option value="creative">Creative - Vibrant and engaging</option>
              <option value="academic">Academic - Traditional and scholarly</option>
              <option value="modern">Modern - Bold and contemporary</option>
            </select>
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

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="includeQuizzes"
              checked={includeQuizzes}
              onChange={(e) => setIncludeQuizzes(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              disabled={loading}
            />
            <label htmlFor="includeQuizzes" className="text-sm font-medium text-gray-700 cursor-pointer">
              Include quiz questions in slides
            </label>
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
  // Debug log to see what type is being passed
  console.log('ContentPreview received:', { type, contentKeys: content ? Object.keys(content) : null })

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

  if (type === 'mixed') {
    const quizQuestions = content.quiz || []
    const openQuestions = content.questions || []
    return (
      <div className="space-y-6">
        {/* Multiple Choice Section */}
        {quizQuestions.length > 0 && (
          <div>
            <h4 className="font-semibold text-purple-700 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Multiple Choice Questions
            </h4>
            <div className="space-y-4">
              {quizQuestions.map((q, i) => (
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
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Critical Thinking Section */}
        {openQuestions.length > 0 && (
          <div>
            <h4 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Critical Thinking Questions
            </h4>
            <div className="space-y-3">
              {openQuestions.map((q, i) => (
                <div key={i} className="border-b pb-2">
                  <div className="font-medium text-gray-900">
                    {quizQuestions.length + i + 1}. {typeof q === 'string' ? q : q.question}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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

  // Handle video type content
  if (type === 'video') {
    const videoUrl = content.url || content.videoUrl
    const duration = content.duration || content.videoDuration
    const transcript = content.transcript
    const questions = content.questions || []

    const formatDuration = (seconds) => {
      if (!seconds) return 'Unknown'
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
      <div className="space-y-4">
        {/* Video Player */}
        {videoUrl && (
          <div className="rounded-lg overflow-hidden bg-black">
            <video
              controls
              className="w-full max-h-64"
              src={videoUrl.startsWith('/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${videoUrl}` : videoUrl}
            >
              Your browser does not support video playback.
            </video>
          </div>
        )}

        {/* Video Info */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          {duration && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatDuration(duration)}
            </span>
          )}
          {content.originalFilename && (
            <span className="truncate">{content.originalFilename}</span>
          )}
        </div>

        {/* Generated Questions */}
        {questions.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-semibold text-purple-700 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Generated Questions ({questions.length})
            </h4>
            <div className="space-y-3">
              {questions.map((q, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-1 text-xs text-gray-500">
                    {q.timestamp_seconds !== undefined && (
                      <span className="font-medium text-blue-600">
                        @ {formatDuration(q.timestamp_seconds)}
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-gray-200 rounded">
                      {q.question_type?.replace('_', ' ') || 'question'}
                    </span>
                  </div>
                  <p className="font-medium text-gray-900">{q.question_text || q.question}</p>
                  {q.options && (
                    <div className="mt-2 ml-4 space-y-1">
                      {q.options.map((opt, j) => (
                        <div key={j} className={`text-sm ${j === q.correct_answer ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                          {String.fromCharCode(65 + j)}. {opt} {j === q.correct_answer && '✓'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transcript Preview */}
        {transcript && (
          <div className="border-t pt-4">
            <h4 className="font-semibold text-gray-700 mb-2">Transcript</h4>
            <p className="text-sm text-gray-600 line-clamp-4">
              {typeof transcript === 'string' ? transcript : transcript.text || 'Transcript available'}
            </p>
          </div>
        )}
      </div>
    )
  }

  return <pre className="text-sm">{JSON.stringify(content, null, 2)}</pre>
}

function InlineContentEditor({ content, setContent, type }) {
  // Handle reading activities
  if (type === 'reading') {
    const passage = content?.passage || content || ''
    const vocabulary = content?.vocabulary || []
    const questions = content?.questions || []

    const handlePassageChange = (value) => {
      setContent({
        ...content,
        passage: value
      })
    }

    const handleVocabChange = (index, field, value) => {
      const updated = [...vocabulary]
      updated[index] = { ...updated[index], [field]: value }
      setContent({ ...content, vocabulary: updated })
    }

    const addVocabWord = () => {
      setContent({ ...content, vocabulary: [...vocabulary, { word: '', definition: '' }] })
    }

    const removeVocabWord = (index) => {
      setContent({ ...content, vocabulary: vocabulary.filter((_, i) => i !== index) })
    }

    const handleQuestionChange = (index, value) => {
      const updated = [...questions]
      updated[index] = value
      setContent({ ...content, questions: updated })
    }

    const addQuestion = () => {
      setContent({ ...content, questions: [...questions, ''] })
    }

    const removeQuestion = (index) => {
      setContent({ ...content, questions: questions.filter((_, i) => i !== index) })
    }

    return (
      <div className="space-y-4">
        {/* Reading Passage */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center justify-between">
            <span>Reading Passage</span>
            <span className="text-xs font-normal text-gray-500">Drag corner to resize</span>
          </label>
          <textarea
            value={typeof passage === 'string' ? passage : passage.passage || ''}
            onChange={(e) => handlePassageChange(e.target.value)}
            className="w-full min-h-[500px] p-4 border-2 border-gray-300 rounded-lg text-[15px] leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Enter the reading passage..."
            style={{ lineHeight: '1.7' }}
          />
        </div>

        {/* Vocabulary Words */}
        {vocabulary.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Vocabulary Words
            </label>
            <div className="space-y-2">
              {vocabulary.map((vocab, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={vocab.word}
                    onChange={(e) => handleVocabChange(index, 'word', e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded text-sm"
                    placeholder="Word"
                  />
                  <input
                    type="text"
                    value={vocab.definition}
                    onChange={(e) => handleVocabChange(index, 'definition', e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded text-sm"
                    placeholder="Definition"
                  />
                  <button
                    type="button"
                    onClick={() => removeVocabWord(index)}
                    className="text-red-600 hover:text-red-700 p-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addVocabWord}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add Vocabulary Word
              </button>
            </div>
          </div>
        )}

        {/* Questions */}
        {questions.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Comprehension Questions
            </label>
            <div className="space-y-2">
              {questions.map((question, index) => (
                <div key={index} className="flex gap-2">
                  <span className="text-sm font-semibold text-gray-700 mt-2">
                    {index + 1}.
                  </span>
                  <textarea
                    value={question}
                    onChange={(e) => handleQuestionChange(index, e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded text-sm resize-none"
                    rows="2"
                    placeholder="Enter question..."
                  />
                  <button
                    type="button"
                    onClick={() => removeQuestion(index)}
                    className="text-red-600 hover:text-red-700 p-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addQuestion}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add Question
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Handle quiz activities
  if (type === 'quiz') {
    const questions = content?.quiz || content?.questions || []

    const handleQuestionChange = (index, field, value) => {
      const updated = [...questions]
      updated[index] = { ...updated[index], [field]: value }
      setContent({ ...content, quiz: updated })
    }

    const handleOptionChange = (qIndex, optIndex, value) => {
      const updated = [...questions]
      const options = [...(updated[qIndex].options || [])]
      options[optIndex] = value
      updated[qIndex] = { ...updated[qIndex], options }
      setContent({ ...content, quiz: updated })
    }

    const addQuestion = () => {
      setContent({
        ...content,
        quiz: [...questions, { question: '', options: ['', '', '', ''], correct: 0 }]
      })
    }

    const removeQuestion = (index) => {
      setContent({ ...content, quiz: questions.filter((_, i) => i !== index) })
    }

    return (
      <div className="space-y-4">
        {questions.map((q, qIndex) => (
          <div key={qIndex} className="p-4 border-2 border-gray-200 rounded-lg">
            <div className="flex items-start gap-3 mb-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-semibold text-sm flex-shrink-0">
                {qIndex + 1}
              </div>
              <textarea
                value={q.question}
                onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)}
                className="flex-1 p-3 border border-gray-300 rounded-lg text-base resize-y focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows="2"
                placeholder="Enter question..."
              />
              <button
                type="button"
                onClick={() => removeQuestion(qIndex)}
                className="text-red-600 hover:text-red-700 p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            <div className="ml-11 space-y-2">
              {q.options?.map((opt, optIndex) => (
                <div key={optIndex} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${qIndex}`}
                    checked={q.correct === optIndex}
                    onChange={() => handleQuestionChange(qIndex, 'correct', optIndex)}
                    className="w-4 h-4 text-green-600"
                  />
                  <span className="text-sm font-medium text-gray-600">
                    {String.fromCharCode(65 + optIndex)}.
                  </span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded text-sm"
                    placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addQuestion}
          className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-all font-medium"
        >
          + Add Question
        </button>
      </div>
    )
  }

  // Handle discussion questions
  if (type === 'questions') {
    const questions = content?.questions || []

    // Helper to get question text (handles both string and object formats)
    const getQuestionText = (q) => {
      if (typeof q === 'string') return q
      return q?.question || ''
    }

    const handleQuestionChange = (index, value) => {
      const updated = [...questions]
      const currentQuestion = updated[index]

      // Convert to object format if it's a string
      if (typeof currentQuestion === 'string') {
        updated[index] = { question: value, sampleAnswer: '' }
      } else {
        updated[index] = { ...currentQuestion, question: value }
      }

      setContent({ ...content, questions: updated })
    }

    const addQuestion = () => {
      setContent({ ...content, questions: [...questions, { question: '', sampleAnswer: '' }] })
    }

    const removeQuestion = (index) => {
      setContent({ ...content, questions: questions.filter((_, i) => i !== index) })
    }

    return (
      <div className="space-y-3">
        {questions.map((question, index) => (
          <div key={index} className="p-3 border-2 border-gray-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm flex-shrink-0">
                {index + 1}
              </div>
              <textarea
                value={getQuestionText(question)}
                onChange={(e) => handleQuestionChange(index, e.target.value)}
                className="flex-1 p-3 border border-gray-300 rounded-lg text-base resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="Enter discussion question..."
              />
              <button
                type="button"
                onClick={() => removeQuestion(index)}
                className="text-red-600 hover:text-red-700 p-1"
                aria-label={`Remove question ${index + 1}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addQuestion}
          className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all font-medium"
        >
          + Add Question
        </button>
      </div>
    )
  }

  // Handle discussion prompts
  if (type === 'discussion') {
    const prompts = content?.prompts || []

    const handlePromptChange = (index, value) => {
      const updated = [...prompts]
      updated[index] = value
      setContent({ ...content, prompts: updated })
    }

    const addPrompt = () => {
      setContent({ ...content, prompts: [...prompts, ''] })
    }

    const removePrompt = (index) => {
      setContent({ ...content, prompts: prompts.filter((_, i) => i !== index) })
    }

    return (
      <div className="space-y-3">
        {prompts.map((prompt, index) => (
          <div key={index} className="p-3 border-2 border-gray-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-semibold text-sm flex-shrink-0">
                {index + 1}
              </div>
              <textarea
                value={prompt}
                onChange={(e) => handlePromptChange(index, e.target.value)}
                className="flex-1 p-3 border border-gray-300 rounded-lg text-base resize-y focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows="3"
                placeholder="Enter discussion prompt..."
              />
              <button
                type="button"
                onClick={() => removePrompt(index)}
                className="text-red-600 hover:text-red-700 p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addPrompt}
          className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-all font-medium"
        >
          + Add Prompt
        </button>
      </div>
    )
  }

  // Handle mixed type (combination of quiz and critical thinking questions)
  if (type === 'mixed') {
    const quizQuestions = content?.quiz || []
    const openQuestions = content?.questions || []

    const handleQuizQuestionChange = (index, field, value) => {
      const updated = [...quizQuestions]
      updated[index] = { ...updated[index], [field]: value }
      setContent({ ...content, quiz: updated })
    }

    const handleQuizOptionChange = (qIndex, optIndex, value) => {
      const updated = [...quizQuestions]
      const options = [...(updated[qIndex].options || [])]
      options[optIndex] = value
      updated[qIndex] = { ...updated[qIndex], options }
      setContent({ ...content, quiz: updated })
    }

    const handleOpenQuestionChange = (index, value) => {
      const updated = [...openQuestions]
      updated[index] = value
      setContent({ ...content, questions: updated })
    }

    return (
      <div className="space-y-6">
        {/* Multiple Choice Section */}
        <div>
          <h4 className="font-semibold text-purple-700 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Multiple Choice Questions
          </h4>
          {quizQuestions.map((q, qIndex) => (
            <div key={qIndex} className="mb-4 p-4 border-2 border-purple-100 rounded-lg">
              <textarea
                value={q.question}
                onChange={(e) => handleQuizQuestionChange(qIndex, 'question', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg text-base resize-y mb-3"
                rows="2"
                placeholder="Enter question..."
              />
              <div className="ml-4 space-y-2">
                {q.options?.map((opt, optIndex) => (
                  <div key={optIndex} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${qIndex}`}
                      checked={q.correct === optIndex}
                      onChange={() => handleQuizQuestionChange(qIndex, 'correct', optIndex)}
                      className="flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => handleQuizOptionChange(qIndex, optIndex, e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded text-sm"
                      placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Critical Thinking Section */}
        <div>
          <h4 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Critical Thinking Questions
          </h4>
          {openQuestions.map((question, index) => (
            <div key={index} className="mb-3 p-3 border-2 border-blue-100 rounded-lg">
              <textarea
                value={typeof question === 'string' ? question : question.question}
                onChange={(e) => handleOpenQuestionChange(index, e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg text-base resize-y"
                rows="2"
                placeholder="Enter critical thinking question..."
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Fallback for unknown types
  return (
    <textarea
      value={JSON.stringify(content, null, 2)}
      onChange={(e) => {
        try {
          setContent(JSON.parse(e.target.value))
        } catch (err) {
          // Invalid JSON, ignore
        }
      }}
      className="w-full h-64 p-3 border-2 border-gray-300 rounded-lg text-sm font-mono resize-none"
    />
  )
}
