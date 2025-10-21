import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { useAuthStore } from '../stores/authStore'
import axios from 'axios'

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

  // Topic management state
  const [topics, setTopics] = useState([])
  const [showTopicForm, setShowTopicForm] = useState(false)
  const [editingTopic, setEditingTopic] = useState(null)
  const [topicForm, setTopicForm] = useState({
    topic: '',
    subject: 'Science',
    gradeLevel: '7th grade',
    keyVocabulary: '',
    assignedStudentIds: []
  })
  const [sessionStudents, setSessionStudents] = useState([])

  // Conversation monitoring state
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [transcript, setTranscript] = useState(null)
  const [showTranscript, setShowTranscript] = useState(false)
  const [filter, setFilter] = useState('all') // 'all', 'mastery', 'progressing', 'struggling', 'needs_help'
  const [activeTab, setActiveTab] = useState('topics') // 'topics' or 'conversations'

  useEffect(() => {
    loadTopics()
    loadSessionStudents()
    loadDashboard()
    // Poll conversations every 10 seconds for updates
    const interval = setInterval(loadDashboard, 10000)
    return () => clearInterval(interval)
  }, [sessionId])

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

      const payload = {
        sessionId,
        topic: topicForm.topic,
        subject: topicForm.subject,
        gradeLevel: topicForm.gradeLevel,
        keyVocabulary,
        assignedStudentIds: topicForm.assignedStudentIds
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
        assignedStudentIds: []
      })
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
    if (!confirm('Are you sure you want to delete this topic?')) return

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
   * Calculate stats
   */
  const stats = {
    total: conversations.length,
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

                      {/* Subject */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Subject
                        </label>
                        <input
                          type="text"
                          value={topicForm.subject}
                          onChange={(e) => setTopicForm({ ...topicForm, subject: e.target.value })}
                          placeholder="e.g., Science"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
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
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Students</div>
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
                        <h3 className="text-lg font-semibold text-gray-900">
                          {conv.studentName}
                        </h3>
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
                        </div>

                        {/* Latest Analysis */}
                        {conv.latestAnalysis && (
                          <div className="mt-3 bg-gray-50 rounded-lg p-3 space-y-2">
                            {conv.latestAnalysis.conceptsDemonstrated && conv.latestAnalysis.conceptsDemonstrated.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700 flex items-center gap-1">
                                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  Concepts demonstrated:
                                </span>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {conv.latestAnalysis.conceptsDemonstrated.map((concept, idx) => (
                                    <span key={idx} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                                      {concept}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {conv.latestAnalysis.misconceptions && conv.latestAnalysis.misconceptions.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700 flex items-center gap-1">
                                  <svg className="w-4 h-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                  Misconceptions:
                                </span>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {conv.latestAnalysis.misconceptions.map((misc, idx) => (
                                    <span key={idx} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                                      {misc}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {conv.latestAnalysis.vocabularyUsed && conv.latestAnalysis.vocabularyUsed.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700 flex items-center gap-1">
                                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                  </svg>
                                  Vocabulary used:
                                </span>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {conv.latestAnalysis.vocabularyUsed.map((word, idx) => (
                                    <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
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
                                <div>
                                  <span className="font-medium text-yellow-800">Suggestion: </span>
                                  <span className="text-yellow-700">{conv.latestAnalysis.teacherSuggestion}</span>
                                </div>
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
    </div>
  )
}
