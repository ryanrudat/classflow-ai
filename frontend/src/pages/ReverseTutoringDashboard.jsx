import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { useAuthStore } from '../stores/authStore'
import { useSocket } from '../hooks/useSocket'
import ConfirmDialog from '../components/ConfirmDialog'
import axios from 'axios'
import { subjectsAPI, standardsAPI } from '../services/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/**
 * Teacher Dashboard for Reverse Tutoring
 *
 * Shows topic management and all student conversations
 */
export default function ReverseTutoringDashboard() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const token = useAuthStore(state => state.token)
  const socket = useSocket()

  // Topic management state
  const [topics, setTopics] = useState([])
  const [showTopicForm, setShowTopicForm] = useState(false)
  const [editingTopic, setEditingTopic] = useState(null)
  const [topicForm, setTopicForm] = useState({
    topic: '',
    subject: 'Science',
    gradeLevel: '7th grade',
    keyVocabulary: '',
    languageComplexity: 'standard', // 'simple', 'standard', 'advanced'
    responseLength: 'medium', // 'short', 'medium', 'long'
    maxStudentResponses: 10, // 3-15
    enforceTopicFocus: true, // Remove after 3 off-topic warnings
    assignedStudentIds: [],
    // New fields for subject hierarchy and collaboration
    subjectId: null,
    subjectPath: [],
    allowCollaboration: false,
    collaborationMode: 'tag_team', // 'tag_team' only for now
    maxCollaborators: 2,
    selectedStandardIds: []
  })
  const [sessionStudents, setSessionStudents] = useState([])

  // Subject hierarchy and standards state
  const [subjectsTree, setSubjectsTree] = useState([])
  const [selectedMainSubject, setSelectedMainSubject] = useState(null)
  const [selectedSubSubject, setSelectedSubSubject] = useState(null)
  const [selectedFocusSubject, setSelectedFocusSubject] = useState(null)
  const [recommendedStandards, setRecommendedStandards] = useState({ universal: [], subject: [] })
  const [loadingStandards, setLoadingStandards] = useState(false)

  // Conversation monitoring state
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [transcript, setTranscript] = useState(null)
  const [showTranscript, setShowTranscript] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [filter, setFilter] = useState('all') // 'all', 'mastery', 'progressing', 'struggling', 'needs_help'
  const [activeTab, setActiveTab] = useState('topics') // 'topics' or 'conversations'

  // Real-time presence tracking (students currently on Reverse Tutoring page)
  const [onlineStudents, setOnlineStudents] = useState(new Set())

  useEffect(() => {
    loadTopics()
    loadSessionStudents()
    loadDashboard()
    loadSubjectsTree()
    // Poll conversations every 10 seconds for updates
    const interval = setInterval(loadDashboard, 10000)
    return () => clearInterval(interval)
  }, [sessionId])

  // Load recommended standards when subject or grade changes
  useEffect(() => {
    const loadStandards = async () => {
      const subjectId = selectedFocusSubject || selectedSubSubject || selectedMainSubject
      if (!subjectId || !topicForm.gradeLevel) return

      setLoadingStandards(true)
      try {
        // Extract grade number from gradeLevel string (e.g., "7th grade" -> "7")
        const gradeMatch = topicForm.gradeLevel.match(/(\d+)/)
        const gradeNum = gradeMatch ? gradeMatch[1] : '7'

        const data = await standardsAPI.getRecommended(subjectId, gradeNum)
        setRecommendedStandards({
          universal: data.universalStandards || [],
          subject: data.subjectStandards || []
        })
      } catch (error) {
        console.error('Failed to load standards:', error)
      } finally {
        setLoadingStandards(false)
      }
    }

    loadStandards()
  }, [selectedMainSubject, selectedSubSubject, selectedFocusSubject, topicForm.gradeLevel])

  /**
   * Load subjects tree for hierarchical selection
   */
  const loadSubjectsTree = async () => {
    try {
      const data = await subjectsAPI.getTree()
      setSubjectsTree(data.tree || [])
    } catch (error) {
      console.error('Failed to load subjects:', error)
    }
  }

  // Socket presence tracking
  useEffect(() => {
    if (!socket || !sessionId) return

    // Join as teacher to receive presence updates
    socket.emit('join-session', {
      sessionId,
      role: 'teacher'
    })

    // Listen for students joining reverse tutoring
    const handleUserJoined = (data) => {
      if (data.role === 'student' && data.studentId) {
        console.log('📡 Student joined reverse tutoring:', data.studentName)
        setOnlineStudents(prev => new Set(prev).add(data.studentId))
      }
    }

    // Listen for students leaving
    const handleUserLeft = (data) => {
      if (data.role === 'student' && data.studentId) {
        console.log('📡 Student left reverse tutoring:', data.studentName)
        setOnlineStudents(prev => {
          const updated = new Set(prev)
          updated.delete(data.studentId)
          return updated
        })
      }
    }

    // Get initial list of online students
    const handleStudentsOnline = (data) => {
      const studentIds = data.students
        .filter(s => s.role === 'student')
        .map(s => s.studentId)
      console.log('📡 Initial online students:', studentIds.length)
      setOnlineStudents(new Set(studentIds))
    }

    socket.on('user-joined', handleUserJoined)
    socket.on('user-left', handleUserLeft)
    socket.on('students-online', handleStudentsOnline)

    return () => {
      socket.off('user-joined', handleUserJoined)
      socket.off('user-left', handleUserLeft)
      socket.off('students-online', handleStudentsOnline)
      socket.emit('leave-session', { sessionId })
    }
  }, [socket, sessionId])

  /**
   * Load topics for this session
   */
  const loadTopics = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/reverse-tutoring/session/${sessionId}/topics`
      )
      setTopics(response.data.topics)
    } catch (error) {
      // Silently fail - endpoint may not be deployed yet
      if (error.response?.status !== 404) {
        console.error('Load topics error:', error)
      }
    }
  }

  /**
   * Load students in this session
   */
  const loadSessionStudents = async () => {
    try {
      if (!token) {
        console.error('No auth token found - cannot load students')
        return
      }

      const response = await axios.get(
        `${API_URL}/api/sessions/${sessionId}/students`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      setSessionStudents(response.data.students || [])
    } catch (error) {
      // Silently fail on 404/403 during initial load
      if (error.response?.status === 403) {
        console.error('Authentication failed when loading students')
      } else if (error.response?.status !== 404) {
        console.error('Load students error:', error)
      }
    }
  }

  /**
   * Create or update a topic
   */
  const saveTopic = async () => {
    try {
      // Parse vocabulary from comma-separated string
      const keyVocabulary = topicForm.keyVocabulary
        .split(',')
        .map(v => v.trim())
        .filter(v => v.length > 0)

      // Build subject path from selections
      const subjectPath = [
        selectedMainSubject,
        selectedSubSubject,
        selectedFocusSubject
      ].filter(Boolean)

      const payload = {
        sessionId,
        topic: topicForm.topic,
        subject: topicForm.subject,
        gradeLevel: topicForm.gradeLevel,
        keyVocabulary,
        languageComplexity: topicForm.languageComplexity,
        responseLength: topicForm.responseLength,
        maxStudentResponses: topicForm.maxStudentResponses,
        enforceTopicFocus: topicForm.enforceTopicFocus,
        assignedStudentIds: topicForm.assignedStudentIds,
        // New fields
        subjectId: selectedFocusSubject || selectedSubSubject || selectedMainSubject,
        subjectPath,
        allowCollaboration: topicForm.allowCollaboration,
        collaborationMode: topicForm.collaborationMode,
        maxCollaborators: topicForm.maxCollaborators,
        standardIds: topicForm.selectedStandardIds
      }

      if (editingTopic) {
        // Update existing topic
        await axios.put(
          `${API_URL}/api/reverse-tutoring/topics/${editingTopic.id}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        toast.success('Success', 'Topic updated successfully')
      } else {
        // Create new topic
        await axios.post(
          `${API_URL}/api/reverse-tutoring/topics`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        toast.success('Success', 'Topic created successfully')
      }

      // Reset form and reload
      setShowTopicForm(false)
      setEditingTopic(null)
      setTopicForm({
        topic: '',
        subject: 'Science',
        gradeLevel: '7th grade',
        keyVocabulary: '',
        languageComplexity: 'standard',
        responseLength: 'medium',
        maxStudentResponses: 10,
        enforceTopicFocus: true,
        assignedStudentIds: [],
        subjectId: null,
        subjectPath: [],
        allowCollaboration: false,
        collaborationMode: 'tag_team',
        maxCollaborators: 2,
        selectedStandardIds: []
      })
      // Reset subject selections
      setSelectedMainSubject(null)
      setSelectedSubSubject(null)
      setSelectedFocusSubject(null)
      setRecommendedStandards({ universal: [], subject: [] })
      loadTopics()

    } catch (error) {
      console.error('Save topic error:', error)
      toast.error('Error', error.response?.data?.message || 'Failed to save topic')
    }
  }

  /**
   * Delete a topic
   */
  const deleteTopic = async (topicId) => {
    setConfirmDialog({
      title: 'Delete Topic?',
      message: 'This will permanently delete the topic and all associated student conversations. This action cannot be undone.',
      confirmText: 'Delete Topic',
      cancelText: 'Cancel',
      severity: 'danger',
      onConfirm: async () => {
        setConfirmDialog(null)
        try {
          await axios.delete(
            `${API_URL}/api/reverse-tutoring/topics/${topicId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
          toast.success('Success', 'Topic deleted successfully')
          loadTopics()
        } catch (error) {
          console.error('Delete topic error:', error)
          toast.error('Error', 'Failed to delete topic')
        }
      },
      onCancel: () => setConfirmDialog(null)
    })
  }

  /**
   * Start editing a topic
   */
  const startEditTopic = (topic) => {
    setEditingTopic(topic)
    setTopicForm({
      topic: topic.topic,
      subject: topic.subject,
      gradeLevel: topic.gradeLevel,
      keyVocabulary: topic.keyVocabulary.join(', '),
      languageComplexity: topic.languageComplexity || 'standard',
      responseLength: topic.responseLength || 'medium',
      maxStudentResponses: topic.maxStudentResponses || 10,
      enforceTopicFocus: topic.enforceTopicFocus !== false, // Default true if not set
      assignedStudentIds: topic.assignedStudentIds
    })
    setShowTopicForm(true)
  }

  /**
   * Load dashboard data
   */
  const loadDashboard = async () => {
    try {
      if (!token) {
        console.error('No auth token found - please log in')
        setLoading(false)
        return
      }

      const response = await axios.get(
        `${API_URL}/api/reverse-tutoring/session/${sessionId}/dashboard`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      setConversations(response.data.conversations)
      setLoading(false)

    } catch (error) {
      // Handle different error types
      if (error.response?.status === 403) {
        console.error('Authentication failed - token may be expired')
        if (!loading) {
          toast.error('Session Expired', 'Please log in again')
          // Optionally redirect to login
          // navigate('/login')
        }
      } else if (error.response?.status !== 404) {
        console.error('Load dashboard error:', error)
        if (!loading) {
          toast.error('Error', 'Failed to load dashboard')
        }
      }
      setLoading(false)
    }
  }

  /**
   * Unblock a student from a conversation
   */
  const unblockStudent = async (conversationId, studentName) => {
    try {
      await axios.post(
        `${API_URL}/api/reverse-tutoring/${conversationId}/unblock`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Student Unblocked', `${studentName} can now rejoin the conversation`)
      loadDashboard() // Refresh dashboard
    } catch (error) {
      console.error('Unblock student error:', error)
      toast.error('Error', error.response?.data?.message || 'Failed to unblock student')
    }
  }

  /**
   * Load full transcript for a conversation
   */
  const loadTranscript = async (conversationId) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/reverse-tutoring/${conversationId}/transcript`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      setTranscript(response.data)
      setShowTranscript(true)

    } catch (error) {
      console.error('Load transcript error:', error)
      toast.error('Error', 'Failed to load conversation transcript')
    }
  }

  /**
   * Get status badge
   */
  const getStatusBadge = (status, understandingLevel) => {
    const getStatusIcon = (status) => {
      const iconClass = "w-4 h-4"
      switch(status) {
        case 'mastery':
          return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
        case 'progressing':
          return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
        case 'struggling':
          return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        case 'needs_help':
          return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        case 'just_started':
          return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        default:
          return <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
      }
    }

    const badges = {
      mastery: { color: 'bg-green-100 text-green-800', text: 'Mastery' },
      progressing: { color: 'bg-blue-100 text-blue-800', text: 'Progressing' },
      struggling: { color: 'bg-yellow-100 text-yellow-800', text: 'Struggling' },
      needs_help: { color: 'bg-red-100 text-red-800', text: 'Needs Help' },
      just_started: { color: 'bg-gray-100 text-gray-800', text: 'Just Started' }
    }

    const badge = badges[status] || badges.progressing

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {getStatusIcon(status)}
        <span>{badge.text}</span>
        <span className="ml-1 font-bold">{understandingLevel}%</span>
      </span>
    )
  }

  /**
   * Filter conversations
   */
  const filteredConversations = conversations.filter(conv => {
    if (filter === 'all') return true
    return conv.status === filter
  })

  /**
   * Check if a student is currently active
   * Active means EITHER:
   * 1. Currently on the Reverse Tutoring page (real-time socket presence)
   * 2. OR sent a message within last 5 minutes (database activity)
   */
  const isStudentActive = (lastUpdated, studentId) => {
    // Real-time: Check if student is currently connected via socket
    if (studentId && onlineStudents.has(studentId)) {
      return true
    }

    // Database: Check if they sent a message recently
    if (!lastUpdated) return false
    const lastUpdateTime = new Date(lastUpdated).getTime()
    const now = new Date().getTime()
    const fiveMinutesAgo = now - (5 * 60 * 1000)
    return lastUpdateTime > fiveMinutesAgo
  }

  /**
   * Calculate stats
   */
  const stats = {
    total: conversations.length,
    uniqueStudents: new Set(conversations.map(c => c.studentId)).size,
    activeNow: conversations.filter(c => isStudentActive(c.lastUpdated, c.studentId)).length,
    mastery: conversations.filter(c => c.status === 'mastery').length,
    progressing: conversations.filter(c => c.status === 'progressing').length,
    struggling: conversations.filter(c => c.status === 'struggling').length,
    needsHelp: conversations.filter(c => c.status === 'needs_help').length,
    avgUnderstanding: conversations.length > 0
      ? Math.round(conversations.reduce((sum, c) => sum + c.understandingLevel, 0) / conversations.length)
      : 0
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Reverse Tutoring Dashboard</h1>
              <p className="text-gray-600 mt-1">Configure topics and monitor student conversations</p>
            </div>
            <button
              onClick={() => navigate('/dashboard', { state: { selectedSessionId: sessionId } })}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('topics')}
              className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'topics'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Topics ({topics.length})
            </button>
            <button
              onClick={() => setActiveTab('conversations')}
              className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'conversations'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Conversations ({conversations.length})
            </button>
          </div>
        </div>

        {/* Topics Tab */}
        {activeTab === 'topics' && (
          <div>
            {/* Create Topic Button */}
            <div className="mb-6">
              <button
                onClick={() => {
                  setShowTopicForm(true)
                  setEditingTopic(null)
                  setTopicForm({
                    topic: '',
                    subject: 'Science',
                    gradeLevel: '7th grade',
                    keyVocabulary: '',
                    assignedStudentIds: []
                  })
                }}
                className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 font-medium transition-colors"
              >
                + Create New Topic
              </button>
            </div>

            {/* Topic Form Modal */}
            {showTopicForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      {editingTopic ? 'Edit Topic' : 'Create New Topic'}
                    </h2>

                    <div className="space-y-4">
                      {/* Topic */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Topic *
                        </label>
                        <input
                          type="text"
                          value={topicForm.topic}
                          onChange={(e) => setTopicForm({ ...topicForm, topic: e.target.value })}
                          placeholder="e.g., Photosynthesis"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>

                      {/* Subject Hierarchy */}
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Subject Area
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          {/* Main Subject */}
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Main Subject</label>
                            <select
                              value={selectedMainSubject || ''}
                              onChange={(e) => {
                                const subjectId = e.target.value || null
                                setSelectedMainSubject(subjectId)
                                setSelectedSubSubject(null)
                                setSelectedFocusSubject(null)
                                // Find subject name for backward compatibility
                                const subject = subjectsTree.find(s => s.id === subjectId)
                                setTopicForm({
                                  ...topicForm,
                                  subject: subject?.name || 'Science',
                                  selectedStandardIds: []
                                })
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                            >
                              <option value="">Select subject...</option>
                              {subjectsTree.map(subject => (
                                <option key={subject.id} value={subject.id}>
                                  {subject.icon} {subject.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Sub-Subject */}
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Area (optional)</label>
                            <select
                              value={selectedSubSubject || ''}
                              onChange={(e) => {
                                const subjectId = e.target.value || null
                                setSelectedSubSubject(subjectId)
                                setSelectedFocusSubject(null)
                                setTopicForm({ ...topicForm, selectedStandardIds: [] })
                              }}
                              disabled={!selectedMainSubject}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm disabled:bg-gray-100"
                            >
                              <option value="">All areas</option>
                              {selectedMainSubject && subjectsTree
                                .find(s => s.id === selectedMainSubject)?.children?.map(sub => (
                                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                                ))}
                            </select>
                          </div>

                          {/* Focus Subject */}
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Focus (optional)</label>
                            <select
                              value={selectedFocusSubject || ''}
                              onChange={(e) => {
                                setSelectedFocusSubject(e.target.value || null)
                                setTopicForm({ ...topicForm, selectedStandardIds: [] })
                              }}
                              disabled={!selectedSubSubject}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm disabled:bg-gray-100"
                            >
                              <option value="">All focuses</option>
                              {selectedSubSubject && subjectsTree
                                .find(s => s.id === selectedMainSubject)?.children
                                ?.find(s => s.id === selectedSubSubject)?.children?.map(focus => (
                                  <option key={focus.id} value={focus.id}>{focus.name}</option>
                                ))}
                            </select>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">
                          Select a subject to get recommended standards aligned to your topic
                        </p>
                      </div>

                      {/* Grade Level */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Grade Level
                        </label>
                        <select
                          value={topicForm.gradeLevel}
                          onChange={(e) => setTopicForm({ ...topicForm, gradeLevel: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option>Elementary</option>
                          <option>6th grade</option>
                          <option>7th grade</option>
                          <option>8th grade</option>
                          <option>9th grade</option>
                          <option>10th grade</option>
                          <option>11th grade</option>
                          <option>12th grade</option>
                        </select>
                      </div>

                      {/* Standards Alignment */}
                      {selectedMainSubject && (
                        <div className="border-t pt-4">
                          <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                            Standards Alignment
                          </h3>

                          {loadingStandards ? (
                            <div className="text-sm text-gray-500 animate-pulse">Loading standards...</div>
                          ) : (
                            <div className="space-y-3">
                              {/* Universal Speaking & Listening Standards */}
                              {recommendedStandards.universal.length > 0 && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-2">
                                    Speaking & Listening (automatically included)
                                  </label>
                                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                                    {recommendedStandards.universal.slice(0, 3).map(std => (
                                      <div key={std.id} className="text-xs text-green-800 mb-1 flex items-start gap-2">
                                        <span className="font-mono font-bold text-green-600">{std.code}</span>
                                        <span>{std.short_text}</span>
                                      </div>
                                    ))}
                                    {recommendedStandards.universal.length > 3 && (
                                      <div className="text-xs text-green-600 mt-1">
                                        + {recommendedStandards.universal.length - 3} more standards
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Subject-Specific Standards */}
                              {recommendedStandards.subject.length > 0 && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-2">
                                    Subject Standards (select to align)
                                  </label>
                                  <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                                    {recommendedStandards.subject.map(std => (
                                      <label key={std.id} className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                        <input
                                          type="checkbox"
                                          checked={topicForm.selectedStandardIds.includes(std.id)}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setTopicForm({
                                                ...topicForm,
                                                selectedStandardIds: [...topicForm.selectedStandardIds, std.id]
                                              })
                                            } else {
                                              setTopicForm({
                                                ...topicForm,
                                                selectedStandardIds: topicForm.selectedStandardIds.filter(id => id !== std.id)
                                              })
                                            }
                                          }}
                                          className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-bold text-blue-600">{std.code}</span>
                                            <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                                              {std.framework_code}
                                            </span>
                                          </div>
                                          <p className="text-xs text-gray-700 mt-0.5">{std.short_text}</p>
                                        </div>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {recommendedStandards.universal.length === 0 && recommendedStandards.subject.length === 0 && (
                                <div className="text-sm text-gray-500 italic">
                                  No standards found for this subject/grade combination
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Key Vocabulary */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Key Vocabulary (comma-separated)
                        </label>
                        <textarea
                          value={topicForm.keyVocabulary}
                          onChange={(e) => setTopicForm({ ...topicForm, keyVocabulary: e.target.value })}
                          placeholder="e.g., chlorophyll, glucose, carbon dioxide"
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          The AI will listen for these terms and acknowledge when students use them correctly
                        </p>
                      </div>

                      {/* AI Response Settings */}
                      <div className="border-t pt-4">
                        <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Alex AI Response Settings
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                          {/* Language Complexity */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Language Complexity
                            </label>
                            <select
                              value={topicForm.languageComplexity}
                              onChange={(e) => setTopicForm({ ...topicForm, languageComplexity: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                              <option value="simple">Simple - Basic vocabulary & short sentences</option>
                              <option value="standard">Standard - Grade-appropriate language</option>
                              <option value="advanced">Advanced - Complex vocabulary & concepts</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                              Adjust Alex's language to match student reading level
                            </p>
                          </div>

                          {/* Response Length */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Response Length
                            </label>
                            <select
                              value={topicForm.responseLength}
                              onChange={(e) => setTopicForm({ ...topicForm, responseLength: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                              <option value="short">Short - 1-2 sentences</option>
                              <option value="medium">Medium - 2-3 sentences</option>
                              <option value="long">Long - 3-4 sentences with details</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                              Control how verbose Alex's feedback is
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <svg className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="text-xs text-purple-800">
                              <p className="font-medium mb-1">These settings help differentiate instruction:</p>
                              <ul className="list-disc list-inside space-y-0.5 ml-1">
                                <li><strong>Simple</strong>: Great for ELL students or struggling readers</li>
                                <li><strong>Standard</strong>: Appropriate for most grade-level students</li>
                                <li><strong>Advanced</strong>: For gifted students or advanced topics</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Conversation Controls */}
                      <div className="border-t pt-4">
                        <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          Conversation Controls
                        </h3>

                        <div className="space-y-4">
                          {/* Max Student Responses */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Maximum Student Responses
                            </label>
                            <select
                              value={topicForm.maxStudentResponses}
                              onChange={(e) => setTopicForm({ ...topicForm, maxStudentResponses: parseInt(e.target.value) })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            >
                              {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(num => (
                                <option key={num} value={num}>{num} responses</option>
                              ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                              Limit conversation length. Good for timed activities or stations.
                            </p>
                          </div>

                          {/* Enforce Topic Focus */}
                          <div>
                            <label className="flex items-start gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={topicForm.enforceTopicFocus}
                                onChange={(e) => setTopicForm({ ...topicForm, enforceTopicFocus: e.target.checked })}
                                className="mt-1 h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                              />
                              <div>
                                <span className="text-sm font-medium text-gray-700">Enforce Topic Focus</span>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Remove students after 3 off-topic warnings. They can rejoin and try again.
                                </p>
                              </div>
                            </label>
                          </div>
                        </div>

                        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <div className="text-xs text-red-800">
                              <p className="font-medium mb-1">These controls help maintain classroom focus:</p>
                              <ul className="list-disc list-inside space-y-0.5 ml-1">
                                <li>Response limit prevents excessive time on one activity</li>
                                <li>Topic enforcement discourages off-task behavior</li>
                                <li>Students receive clear warnings before removal</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Tag-Team Collaboration Settings */}
                      <div className="border-t pt-4">
                        <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          Tag-Team Mode (Optional)
                        </h3>

                        <div className="space-y-4">
                          {/* Enable Collaboration Toggle */}
                          <div>
                            <label className="flex items-start gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={topicForm.allowCollaboration}
                                onChange={(e) => setTopicForm({ ...topicForm, allowCollaboration: e.target.checked })}
                                className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                              />
                              <div>
                                <span className="text-sm font-medium text-gray-700">Enable Tag-Team Teaching</span>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Allow students to collaborate in pairs, taking turns teaching the AI
                                </p>
                              </div>
                            </label>
                          </div>

                          {/* Collaboration Options (shown when enabled) */}
                          {topicForm.allowCollaboration && (
                            <div className="ml-7 space-y-3 animate-fadeIn">
                              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-indigo-900 mb-2">How Tag-Team Works:</h4>
                                <ul className="text-xs text-indigo-800 space-y-1.5 list-disc list-inside">
                                  <li><strong>Voice to AI:</strong> Students speak to Alex using voice only</li>
                                  <li><strong>Text to Partner:</strong> Partners can chat via text sidebar</li>
                                  <li><strong>Turn-Based:</strong> One student teaches at a time, then tags partner</li>
                                  <li><strong>Shared Progress:</strong> Both students contribute to understanding score</li>
                                </ul>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                {/* Max Collaborators */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Team Size
                                  </label>
                                  <select
                                    value={topicForm.maxCollaborators}
                                    onChange={(e) => setTopicForm({ ...topicForm, maxCollaborators: parseInt(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                  >
                                    <option value={2}>2 students (pairs)</option>
                                    <option value={3}>3 students (trios)</option>
                                  </select>
                                </div>

                                {/* Matching Mode */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Partner Matching
                                  </label>
                                  <select
                                    value="auto"
                                    disabled
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                                  >
                                    <option value="auto">Auto-match (waiting room)</option>
                                  </select>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Students are paired when they join
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Assign to Students */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Assign to Students (optional)
                        </label>
                        <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                          <div className="mb-2">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={topicForm.assignedStudentIds.length === 0}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setTopicForm({ ...topicForm, assignedStudentIds: [] })
                                  }
                                }}
                                className="mr-2"
                              />
                              <span className="text-sm font-medium text-gray-700">All Students</span>
                            </label>
                          </div>
                          {sessionStudents.map(student => (
                            <div key={student.id} className="mb-1">
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={topicForm.assignedStudentIds.includes(student.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setTopicForm({
                                        ...topicForm,
                                        assignedStudentIds: [...topicForm.assignedStudentIds, student.id]
                                      })
                                    } else {
                                      setTopicForm({
                                        ...topicForm,
                                        assignedStudentIds: topicForm.assignedStudentIds.filter(id => id !== student.id)
                                      })
                                    }
                                  }}
                                  className="mr-2"
                                />
                                <span className="text-sm text-gray-700">{student.student_name}</span>
                              </label>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Leave empty to make this topic available to all students
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={saveTopic}
                        disabled={!topicForm.topic.trim()}
                        className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                      >
                        {editingTopic ? 'Update Topic' : 'Create Topic'}
                      </button>
                      <button
                        onClick={() => {
                          setShowTopicForm(false)
                          setEditingTopic(null)
                        }}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Topics List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {topics.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <div className="flex justify-center mb-6">
                    <svg className="w-16 h-16 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                    Get started with Reverse Tutoring
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                    Create topics for students to teach the AI. This powerful learning technique helps students master concepts by explaining them in their own words.
                  </p>

                  <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6 max-w-2xl mx-auto mb-6">
                    <h4 className="font-semibold text-purple-900 mb-3">How it works:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-left">
                      <div>
                        <div className="font-semibold text-purple-800 mb-1">1. You create topics</div>
                        <div className="text-purple-700">Set up topics with key vocabulary for your lesson</div>
                      </div>
                      <div>
                        <div className="font-semibold text-purple-800 mb-1">2. Students teach AI</div>
                        <div className="text-purple-700">Students explain concepts to "Alex", an AI student</div>
                      </div>
                      <div>
                        <div className="font-semibold text-purple-800 mb-1">3. You monitor progress</div>
                        <div className="text-purple-700">See real-time understanding levels and transcripts</div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowTopicForm(true)}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium inline-flex items-center gap-2"
                  >
                    <span>+</span>
                    <span>Create Your First Topic</span>
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {topics.map((topic) => (
                    <div key={topic.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {topic.topic}
                          </h3>
                          <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                              {topic.subject}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                              </svg>
                              {topic.gradeLevel}
                            </span>
                            {topic.assignedStudentIds.length > 0 && (
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                {topic.assignedStudentIds.length} students
                              </span>
                            )}
                            {topic.assignedStudentIds.length === 0 && (
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                All students
                              </span>
                            )}
                          </div>
                          {topic.keyVocabulary.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {topic.keyVocabulary.map((word, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-primary-50 text-primary-700 rounded text-xs font-medium"
                                >
                                  {word}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => startEditTopic(topic)}
                            className="px-3 py-1 text-sm text-primary-600 hover:bg-primary-50 rounded"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteTopic(topic.id)}
                            className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conversations Tab */}
        {activeTab === 'conversations' && (
          <div>
            {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.uniqueStudents}</div>
            <div className="text-sm text-gray-600">Unique Students</div>
          </div>
          <div className="bg-indigo-50 rounded-lg shadow p-4 border-2 border-indigo-200">
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-indigo-600">{stats.activeNow}</div>
              <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <div className="text-sm text-gray-600">Active Now</div>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">{stats.mastery}</div>
            <div className="text-sm text-gray-600">Mastery</div>
          </div>
          <div className="bg-blue-50 rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.progressing}</div>
            <div className="text-sm text-gray-600">Progressing</div>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.struggling}</div>
            <div className="text-sm text-gray-600">Struggling</div>
          </div>
          <div className="bg-red-50 rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-red-600">{stats.needsHelp}</div>
            <div className="text-sm text-gray-600">Needs Help</div>
          </div>
          <div className="bg-purple-50 rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.avgUnderstanding}%</div>
            <div className="text-sm text-gray-600">Avg Understanding</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-2">
            {['all', 'mastery', 'progressing', 'struggling', 'needs_help'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === f
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f === 'all' ? 'All Students' : f.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </button>
            ))}
          </div>
        </div>

        {/* Conversations List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex justify-center mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No conversations yet
              </h3>
              <p className="text-gray-600">
                Students haven't started reverse tutoring yet
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.conversationId}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {conv.studentName}
                          </h3>
                          {isStudentActive(conv.lastUpdated, conv.studentId) ? (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-200 rounded-full">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="text-xs font-medium text-green-700">Active now</span>
                            </div>
                          ) : conv.lastUpdated && (
                            <span className="text-xs text-gray-500">
                              Last active: {new Date(conv.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        {getStatusBadge(conv.status, conv.understandingLevel)}
                      </div>

                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            Topic: {conv.topic}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            {conv.messageCount} exchanges
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {conv.durationMinutes} min
                          </span>
                          {/* Off-Topic Warnings */}
                          {conv.offTopicWarnings > 0 && (
                            <span className={`flex items-center gap-1 px-2 py-1 rounded ${
                              conv.offTopicWarnings >= 3 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              {conv.offTopicWarnings} off-topic warning{conv.offTopicWarnings > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        {/* Blocked Status */}
                        {conv.isBlocked && (
                          <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                                <div>
                                  <div className="font-semibold text-red-900">Student Blocked</div>
                                  <div className="text-sm text-red-700">{conv.blockedReason}</div>
                                  {conv.blockedAt && (
                                    <div className="text-xs text-red-600 mt-1">
                                      Blocked at: {new Date(conv.blockedAt).toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => unblockStudent(conv.conversationId, conv.studentName)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                              >
                                Unblock
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Latest Analysis */}
                        {conv.latestAnalysis && (
                          <div className="mt-3 bg-gray-50 rounded-lg p-3 space-y-3">
                            {/* Multi-Dimensional Rubric Display */}
                            {conv.latestAnalysis.contentUnderstanding && (
                              <div className="space-y-2">
                                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Performance Rubric</div>

                                {/* Content Understanding */}
                                <div>
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="font-medium text-gray-700">Content Understanding</span>
                                    <span className={`font-bold ${
                                      conv.latestAnalysis.contentUnderstanding.level >= 4 ? 'text-green-600' :
                                      conv.latestAnalysis.contentUnderstanding.level >= 3 ? 'text-blue-600' :
                                      conv.latestAnalysis.contentUnderstanding.level >= 2 ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                      Level {conv.latestAnalysis.contentUnderstanding.level}/4
                                    </span>
                                  </div>
                                  <div className="flex gap-1">
                                    {[1, 2, 3, 4].map(level => (
                                      <div
                                        key={level}
                                        className={`h-2 flex-1 rounded ${
                                          level <= conv.latestAnalysis.contentUnderstanding.level
                                            ? conv.latestAnalysis.contentUnderstanding.level >= 4 ? 'bg-green-500' :
                                              conv.latestAnalysis.contentUnderstanding.level >= 3 ? 'bg-blue-500' :
                                              conv.latestAnalysis.contentUnderstanding.level >= 2 ? 'bg-yellow-500' : 'bg-red-500'
                                            : 'bg-gray-200'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  {conv.latestAnalysis.contentUnderstanding.evidence && (
                                    <p className="text-xs text-gray-600 mt-1">{conv.latestAnalysis.contentUnderstanding.evidence}</p>
                                  )}
                                </div>

                                {/* Communication Effectiveness */}
                                <div>
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="font-medium text-gray-700">Communication</span>
                                    <span className={`font-bold ${
                                      conv.latestAnalysis.communicationEffectiveness.level >= 4 ? 'text-green-600' :
                                      conv.latestAnalysis.communicationEffectiveness.level >= 3 ? 'text-blue-600' :
                                      conv.latestAnalysis.communicationEffectiveness.level >= 2 ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                      Level {conv.latestAnalysis.communicationEffectiveness.level}/4
                                    </span>
                                  </div>
                                  <div className="flex gap-1">
                                    {[1, 2, 3, 4].map(level => (
                                      <div
                                        key={level}
                                        className={`h-2 flex-1 rounded ${
                                          level <= conv.latestAnalysis.communicationEffectiveness.level
                                            ? conv.latestAnalysis.communicationEffectiveness.level >= 4 ? 'bg-green-500' :
                                              conv.latestAnalysis.communicationEffectiveness.level >= 3 ? 'bg-blue-500' :
                                              conv.latestAnalysis.communicationEffectiveness.level >= 2 ? 'bg-yellow-500' : 'bg-red-500'
                                            : 'bg-gray-200'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>

                                {/* Vocabulary Usage */}
                                <div>
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="font-medium text-gray-700">Academic Vocabulary</span>
                                    <span className={`font-bold ${
                                      conv.latestAnalysis.vocabularyUsage.level >= 4 ? 'text-green-600' :
                                      conv.latestAnalysis.vocabularyUsage.level >= 3 ? 'text-blue-600' :
                                      conv.latestAnalysis.vocabularyUsage.level >= 2 ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                      Level {conv.latestAnalysis.vocabularyUsage.level}/4
                                    </span>
                                  </div>
                                  <div className="flex gap-1">
                                    {[1, 2, 3, 4].map(level => (
                                      <div
                                        key={level}
                                        className={`h-2 flex-1 rounded ${
                                          level <= conv.latestAnalysis.vocabularyUsage.level
                                            ? conv.latestAnalysis.vocabularyUsage.level >= 4 ? 'bg-green-500' :
                                              conv.latestAnalysis.vocabularyUsage.level >= 3 ? 'bg-blue-500' :
                                              conv.latestAnalysis.vocabularyUsage.level >= 2 ? 'bg-yellow-500' : 'bg-red-500'
                                            : 'bg-gray-200'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  {conv.latestAnalysis.vocabularyUsage.termsUsed && conv.latestAnalysis.vocabularyUsage.termsUsed.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {conv.latestAnalysis.vocabularyUsage.termsUsed.map((word, idx) => (
                                        <span key={idx} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                          {word}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Engagement Level */}
                                <div>
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="font-medium text-gray-700">Engagement</span>
                                    <span className={`font-bold ${
                                      conv.latestAnalysis.engagementLevel.level >= 4 ? 'text-green-600' :
                                      conv.latestAnalysis.engagementLevel.level >= 3 ? 'text-blue-600' :
                                      conv.latestAnalysis.engagementLevel.level >= 2 ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                      Level {conv.latestAnalysis.engagementLevel.level}/4
                                    </span>
                                  </div>
                                  <div className="flex gap-1">
                                    {[1, 2, 3, 4].map(level => (
                                      <div
                                        key={level}
                                        className={`h-2 flex-1 rounded ${
                                          level <= conv.latestAnalysis.engagementLevel.level
                                            ? conv.latestAnalysis.engagementLevel.level >= 4 ? 'bg-green-500' :
                                              conv.latestAnalysis.engagementLevel.level >= 3 ? 'bg-blue-500' :
                                              conv.latestAnalysis.engagementLevel.level >= 2 ? 'bg-yellow-500' : 'bg-red-500'
                                            : 'bg-gray-200'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>

                                {/* Teacher Action */}
                                {conv.latestAnalysis.teacherAction && (
                                  <div className={`border rounded p-2 mt-2 flex items-start gap-2 ${
                                    conv.latestAnalysis.teacherAction.priority === 'urgent' ? 'bg-red-50 border-red-200' :
                                    conv.latestAnalysis.teacherAction.priority === 'high' ? 'bg-orange-50 border-orange-200' :
                                    conv.latestAnalysis.teacherAction.priority === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                                    conv.latestAnalysis.teacherAction.priority === 'monitor' ? 'bg-purple-50 border-purple-200' :
                                    'bg-green-50 border-green-200'
                                  }`}>
                                    <svg className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                                      conv.latestAnalysis.teacherAction.priority === 'urgent' ? 'text-red-700' :
                                      conv.latestAnalysis.teacherAction.priority === 'high' ? 'text-orange-700' :
                                      conv.latestAnalysis.teacherAction.priority === 'medium' ? 'text-yellow-700' :
                                      conv.latestAnalysis.teacherAction.priority === 'monitor' ? 'text-purple-700' :
                                      'text-green-700'
                                    }`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div className="text-xs">
                                      <span className={`font-bold uppercase ${
                                        conv.latestAnalysis.teacherAction.priority === 'urgent' ? 'text-red-800' :
                                        conv.latestAnalysis.teacherAction.priority === 'high' ? 'text-orange-800' :
                                        conv.latestAnalysis.teacherAction.priority === 'medium' ? 'text-yellow-800' :
                                        conv.latestAnalysis.teacherAction.priority === 'monitor' ? 'text-purple-800' :
                                        'text-green-800'
                                      }`}>
                                        {conv.latestAnalysis.teacherAction.priority}
                                      </span>
                                      <span className="text-gray-600"> - {conv.latestAnalysis.teacherAction.type.replace('_', ' ')}</span>
                                      <p className="mt-1 text-gray-700">{conv.latestAnalysis.teacherAction.suggestion}</p>
                                    </div>
                                  </div>
                                )}

                                {/* Misconceptions */}
                                {conv.latestAnalysis.contentUnderstanding.misconceptions && conv.latestAnalysis.contentUnderstanding.misconceptions.length > 0 && (
                                  <div>
                                    <span className="font-medium text-gray-700 flex items-center gap-1 text-xs">
                                      <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                      </svg>
                                      Misconceptions:
                                    </span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {conv.latestAnalysis.contentUnderstanding.misconceptions.map((misc, idx) => (
                                        <span key={idx} className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                                          {misc}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Legacy Format Support */}
                            {!conv.latestAnalysis.contentUnderstanding && conv.latestAnalysis.conceptsDemonstrated && (
                              <div className="space-y-2">
                                {conv.latestAnalysis.conceptsDemonstrated && conv.latestAnalysis.conceptsDemonstrated.length > 0 && (
                                  <div>
                                    <span className="font-medium text-gray-700 flex items-center gap-1 text-xs">
                                      <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                      Concepts demonstrated:
                                    </span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {conv.latestAnalysis.conceptsDemonstrated.map((concept, idx) => (
                                        <span key={idx} className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                                          {concept}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {conv.latestAnalysis.misconceptions && conv.latestAnalysis.misconceptions.length > 0 && (
                                  <div>
                                    <span className="font-medium text-gray-700 flex items-center gap-1 text-xs">
                                      <svg className="w-4 h-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                      </svg>
                                      Misconceptions:
                                    </span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {conv.latestAnalysis.misconceptions.map((misc, idx) => (
                                        <span key={idx} className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                                          {misc}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {conv.latestAnalysis.vocabularyUsed && conv.latestAnalysis.vocabularyUsed.length > 0 && (
                                  <div>
                                    <span className="font-medium text-gray-700 flex items-center gap-1 text-xs">
                                      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                      </svg>
                                      Vocabulary used:
                                    </span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {conv.latestAnalysis.vocabularyUsed.map((word, idx) => (
                                        <span key={idx} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                          {word}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {conv.latestAnalysis.teacherSuggestion && (
                                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-2 flex items-start gap-2">
                                    <svg className="w-4 h-4 text-yellow-700 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                    <div className="text-xs">
                                      <span className="font-medium text-yellow-800">Suggestion: </span>
                                      <span className="text-yellow-700">{conv.latestAnalysis.teacherSuggestion}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => loadTranscript(conv.conversationId)}
                      className="ml-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                    >
                      View Transcript
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          conv.understandingLevel >= 80 ? 'bg-green-500' :
                          conv.understandingLevel >= 60 ? 'bg-blue-500' :
                          conv.understandingLevel >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${conv.understandingLevel}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
          </div>
        )}
      </div>

      {/* Transcript Modal */}
      {showTranscript && transcript && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full my-8">
            {/* Modal Header */}
            <div className="border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {transcript.studentName || transcript.studentAccountName}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {transcript.topic} • {transcript.messageCount} exchanges • {transcript.durationMinutes} minutes
                  </p>
                </div>
                <button
                  onClick={() => setShowTranscript(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Understanding Level */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">Final Understanding Level</span>
                  <span className="font-semibold text-primary-600">{transcript.currentUnderstandingLevel}%</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      transcript.currentUnderstandingLevel >= 80 ? 'bg-green-500' :
                      transcript.currentUnderstandingLevel >= 60 ? 'bg-blue-500' :
                      transcript.currentUnderstandingLevel >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${transcript.currentUnderstandingLevel}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Transcript Messages */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {!transcript.transcript || transcript.transcript.length === 0 ? (
                <div className="text-center py-12">
                  <div className="flex justify-center mb-4">
                    <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-gray-600">No messages yet in this conversation</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transcript.transcript.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === 'student' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-start gap-3 max-w-[80%] ${
                      msg.role === 'student' ? 'flex-row-reverse' : ''
                    }`}>
                      {/* Avatar */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        msg.role === 'ai'
                          ? 'bg-purple-100 text-purple-600'
                          : 'bg-blue-100 text-blue-600'
                      }`}>
                        {msg.role === 'ai' ? (
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                      </div>

                      {/* Message */}
                      <div>
                        <div className={`rounded-2xl p-4 ${
                          msg.role === 'ai'
                            ? 'bg-purple-50 text-gray-800'
                            : 'bg-blue-500 text-white'
                        }`}>
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                        </div>

                        {/* Analysis (for student messages) */}
                        {msg.analysis && (
                          <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs space-y-1">
                            <div className="text-gray-600">
                              Understanding: <span className="font-semibold text-primary-600">{msg.analysis.understandingLevel}%</span>
                            </div>
                            {msg.analysis.vocabularyUsed && msg.analysis.vocabularyUsed.length > 0 && (
                              <div className="text-gray-600">
                                Vocabulary: {msg.analysis.vocabularyUsed.join(', ')}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="text-xs text-gray-500 mt-1 px-2">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-6">
              <button
                onClick={() => setShowTranscript(false)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
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
