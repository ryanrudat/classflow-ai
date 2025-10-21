import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useToast } from '../components/Toast'
import axios from 'axios'
import io from 'socket.io-client'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/**
 * Reverse Tutoring - Student teaches the AI
 *
 * Features:
 * - Voice input with real-time transcription
 * - Text input fallback
 * - Multilingual support
 * - Scaffolding and hints
 * - Accessible and engaging UI
 */
export default function ReverseTutoring() {
  const { sessionId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()

  // Get student info from location state
  const studentId = location.state?.studentId
  const studentName = location.state?.studentName

  // State
  const [view, setView] = useState('topics') // 'topics' or 'conversation'
  const [availableTopics, setAvailableTopics] = useState([])
  const [loadingTopics, setLoadingTopics] = useState(true)
  const [selectedTopic, setSelectedTopic] = useState(null)

  const [conversationId, setConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputMode, setInputMode] = useState('voice') // 'voice' or 'text'
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [textInput, setTextInput] = useState('')
  const [showScaffolding, setShowScaffolding] = useState(false)
  const [scaffolding, setScaffolding] = useState(null)
  const [understanding, setUnderstanding] = useState(0)
  const [messageCount, setMessageCount] = useState(0)

  // ELL Support
  const [languageProficiency, setLanguageProficiency] = useState('intermediate')
  const [nativeLanguage, setNativeLanguage] = useState('en')
  const [showProficiencySelector, setShowProficiencySelector] = useState(false)

  // Session Status
  const [sessionStatus, setSessionStatus] = useState('active') // 'active', 'paused', 'ended'
  const [gracePeriodEndsAt, setGracePeriodEndsAt] = useState(null)
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(null)

  // Refs
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])
  const messagesEndRef = useRef(null)
  const socketRef = useRef(null)
  const scaffoldingCloseButtonRef = useRef(null)
  const textInputRef = useRef(null)

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load topics on mount
  useEffect(() => {
    if (!studentId || !sessionId) {
      toast.error('Error', 'Missing student or session information')
      navigate(-1)
      return
    }

    loadAvailableTopics()
  }, [])

  // WebSocket for session status updates
  useEffect(() => {
    if (!sessionId) return

    // Initialize WebSocket
    const socket = io(API_URL, {
      transports: ['websocket', 'polling']
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('✅ WebSocket connected')
      // Join session room
      socket.emit('join-session', {
        sessionId,
        role: 'student',
        studentId
      })
    })

    // Listen for session status changes
    socket.on('session-status-changed', (data) => {
      console.log('📡 Session status changed:', data)
      const { status, gracePeriodEndsAt, message } = data

      setSessionStatus(status)

      if (gracePeriodEndsAt) {
        setGracePeriodEndsAt(new Date(gracePeriodEndsAt))
      }

      if (status === 'paused' || status === 'ended') {
        setShowSessionModal(true)
        toast.warning(status === 'paused' ? 'Session Paused' : 'Session Ending', message, 10000)
      } else if (status === 'active') {
        setShowSessionModal(false)
        setGracePeriodEndsAt(null)
        toast.success('Session Resumed', message)
      }
    })

    socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected')
    })

    // Cleanup
    return () => {
      socket.disconnect()
    }
  }, [sessionId, studentId])

  // Grace period countdown timer
  useEffect(() => {
    if (!gracePeriodEndsAt) {
      setTimeRemaining(null)
      return
    }

    const interval = setInterval(() => {
      const now = new Date()
      const diff = gracePeriodEndsAt - now

      if (diff <= 0) {
        setTimeRemaining(0)
        setShowSessionModal(true)
        // Disable all input
        clearInterval(interval)
      } else {
        const seconds = Math.floor(diff / 1000)
        const minutes = Math.floor(seconds / 60)
        const secs = seconds % 60
        setTimeRemaining(`${minutes}:${secs.toString().padStart(2, '0')}`)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [gracePeriodEndsAt])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // ESC to close modals
      if (e.key === 'Escape') {
        if (showScaffolding) {
          setShowScaffolding(false)
        } else if (showSessionModal) {
          // Only allow closing session modal if in grace period
          if (timeRemaining && timeRemaining !== 0) {
            setShowSessionModal(false)
          }
        } else if (showProficiencySelector) {
          setShowProficiencySelector(false)
        }
      }

      // Cmd+Enter or Ctrl+Enter to send message (like iMessage/Slack)
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (textInput.trim() && !isSending) {
          sendMessage(textInput)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showScaffolding, showSessionModal, showProficiencySelector, timeRemaining, textInput, isSending])

  // Focus management for modals
  useEffect(() => {
    if (showScaffolding && scaffoldingCloseButtonRef.current) {
      scaffoldingCloseButtonRef.current.focus()
    }
  }, [showScaffolding])

  /**
   * Load available topics for this student
   */
  const loadAvailableTopics = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/reverse-tutoring/session/${sessionId}/topics?studentId=${studentId}`
      )
      console.log('📚 Loaded topics:', response.data.topics)
      setAvailableTopics(response.data.topics)
      setLoadingTopics(false)

      // If only one topic, auto-select it
      if (response.data.topics.length === 1) {
        selectTopic(response.data.topics[0])
      }
    } catch (error) {
      // Silently fail on 404 - endpoint may not be deployed yet
      if (error.response?.status !== 404) {
        console.error('Load topics error:', error)
        toast.error('Error', 'Failed to load topics')
      } else {
        // Show friendly message that feature isn't ready yet
        toast.info('Not available yet', 'Reverse tutoring topics are being set up')
      }
      setLoadingTopics(false)
    }
  }

  /**
   * Select a topic and show proficiency selector
   */
  const selectTopic = async (topic) => {
    console.log('🎯 Topic selected:', topic)
    console.log('🎯 Setting selectedTopic to:', topic)
    setSelectedTopic(topic)
    console.log('🎯 Setting showProficiencySelector to true')
    setShowProficiencySelector(true)
  }

  /**
   * Start conversation after proficiency is selected
   */
  const startWithProficiency = async () => {
    setShowProficiencySelector(false)
    await startConversation(selectedTopic)
    setView('conversation')
  }

  /**
   * Start a new conversation with selected topic
   */
  const startConversation = async (topic) => {
    try {
      const response = await axios.post(`${API_URL}/api/reverse-tutoring/start`, {
        sessionId,
        studentId,
        topic: topic.topic,
        subject: topic.subject,
        gradeLevel: topic.gradeLevel,
        keyVocabulary: topic.keyVocabulary,
        languageProficiency,
        nativeLanguage
      })

      setConversationId(response.data.conversationId)
      setMessages([{
        role: 'ai',
        content: response.data.aiMessage,
        timestamp: new Date()
      }])
      setMessageCount(1)

      toast.success('Ready to start!', `Teach Alex about ${topic.topic}`)

    } catch (error) {
      console.error('Start conversation error:', error)
      if (error.response?.status === 409) {
        // Conversation already exists - load it
        const existingConversationId = error.response?.data?.conversationId
        if (existingConversationId) {
          toast.info('Resuming', 'Continuing your previous conversation')
          await loadExistingConversation(existingConversationId, topic)
        } else {
          toast.error('Error', 'Could not resume conversation')
        }
      } else {
        toast.error('Error', error.response?.data?.message || 'Failed to start conversation')
      }
    }
  }

  /**
   * Load existing conversation
   */
  const loadExistingConversation = async (conversationId, topic) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/reverse-tutoring/student/${studentId}/conversation?sessionId=${sessionId}&topic=${encodeURIComponent(topic.topic)}`
      )

      setConversationId(conversationId)

      // Parse history and set messages
      const history = response.data.history || []
      const formattedMessages = history.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp)
      }))

      setMessages(formattedMessages)
      setMessageCount(response.data.messageCount || history.length)
      setUnderstanding(response.data.understandingLevel || 0)

    } catch (error) {
      console.error('Load conversation error:', error)
      toast.error('Error', 'Failed to load existing conversation')
    }
  }

  /**
   * Start voice recording
   */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      })

      audioChunks.current = []

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data)
        }
      }

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' })
        await transcribeAudio(audioBlob)

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.current.start()
      setIsRecording(true)

    } catch (error) {
      console.error('Microphone error:', error)
      toast.error('Microphone Error', 'Could not access microphone. Try typing instead.')
      setInputMode('text')
    }
  }

  /**
   * Stop voice recording
   */
  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop()
      setIsRecording(false)
    }
  }

  /**
   * Transcribe audio using Whisper API
   */
  const transcribeAudio = async (audioBlob) => {
    setIsTranscribing(true)

    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const response = await axios.post(
        `${API_URL}/api/reverse-tutoring/transcribe?language=en&topic=${encodeURIComponent(selectedTopic?.topic || 'the lesson')}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      )

      setCurrentTranscript(response.data.text)
      setIsTranscribing(false)

    } catch (error) {
      console.error('Transcription error:', error)
      toast.error('Transcription Failed', 'Please try again or switch to typing')
      setIsTranscribing(false)
    }
  }

  /**
   * Send message to AI
   */
  const sendMessage = async (messageText) => {
    if (!messageText || messageText.trim().length === 0) {
      toast.warning('Empty Message', 'Please say or type something first')
      return
    }

    const message = messageText.trim()

    // Add student message to UI immediately
    const newMessage = {
      role: 'student',
      content: message,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, newMessage])
    setCurrentTranscript('')
    setTextInput('')
    setIsSending(true)

    try {
      const response = await axios.post(
        `${API_URL}/api/reverse-tutoring/${conversationId}/message`,
        {
          studentMessage: message,
          language: 'en',
          helpNeeded: false,
          vocabularyUsed: []
        }
      )

      // Add AI response
      setMessages(prev => [...prev, {
        role: 'ai',
        content: response.data.aiMessage,
        timestamp: new Date()
      }])

      // Update metrics
      setUnderstanding(response.data.analysis.understandingLevel)
      setMessageCount(response.data.messageCount)

      // Show encouragement if doing well
      if (response.data.analysis.understandingLevel >= 80) {
        toast.success('Great explanation!', 'You really understand this topic!')
      }

    } catch (error) {
      console.error('Send message error:', error)
      toast.error('Error', 'Failed to send message. Please try again.')

      // Remove the student message if it failed
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setIsSending(false)
    }
  }

  /**
   * Request scaffolding/help
   */
  const requestHelp = async () => {
    if (!conversationId) return

    try {
      const response = await axios.post(
        `${API_URL}/api/reverse-tutoring/${conversationId}/help`,
        {
          struggleArea: 'explaining the concept'
        }
      )

      setScaffolding(response.data.scaffolding)
      setShowScaffolding(true)

    } catch (error) {
      console.error('Request help error:', error)
      toast.error('Error', 'Failed to get help. Please try again.')
    }
  }

  /**
   * Use a sentence starter
   */
  const useSentenceStarter = (starter) => {
    setTextInput(starter + ' ')
    setInputMode('text')
    setShowScaffolding(false)
  }

  /**
   * Handle key press in text input
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(textInput)
    }
  }

  // Topic Selection View
  if (view === 'topics') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Choose a Topic</h1>
                <p className="text-gray-600 mt-1">
                  Select what you'd like to teach the AI about
                </p>
              </div>
              <div className="flex gap-2">
                {/* Debug button - remove after testing */}
                <button
                  onClick={() => {
                    console.log('🧪 DEBUG: Force showing modal')
                    console.log('Available topics:', availableTopics)
                    if (availableTopics.length > 0) {
                      setSelectedTopic(availableTopics[0])
                      setShowProficiencySelector(true)
                    }
                  }}
                  className="px-3 py-1 bg-yellow-500 text-white text-sm rounded"
                >
                  DEBUG
                </button>
                <button
                  onClick={() => navigate(-1)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {loadingTopics ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
            </div>
          ) : availableTopics.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center max-w-2xl mx-auto">
              <div className="text-6xl mb-6">📚</div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                No topics available yet
              </h3>
              <p className="text-gray-600 mb-6">
                Your teacher needs to create some topics before you can start teaching the AI.
              </p>
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-left">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">💡</div>
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-2">What's Reverse Tutoring?</h4>
                    <p className="text-sm text-blue-800 mb-3">
                      You'll teach an AI student named Alex about a topic. This helps you learn by explaining concepts in your own words!
                    </p>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>✓ Practice explaining concepts</li>
                      <li>✓ Get immediate feedback from the AI</li>
                      <li>✓ Use voice or text to communicate</li>
                      <li>✓ Get help when you're stuck</li>
                    </ul>
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate(-1)}
                className="mt-6 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Go Back
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableTopics.map((topic) => (
                <div
                  key={topic.id}
                  className="bg-white rounded-xl shadow-lg p-6 border-2 border-transparent hover:border-purple-300 transition-all"
                >
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {topic.topic}
                  </h3>
                  <div className="flex flex-wrap gap-2 text-sm text-gray-600 mb-3">
                    <span className="flex items-center gap-1">
                      📖 {topic.subject}
                    </span>
                    <span className="flex items-center gap-1">
                      🎓 {topic.gradeLevel}
                    </span>
                  </div>
                  {topic.keyVocabulary.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-2">Key vocabulary:</p>
                      <div className="flex flex-wrap gap-2">
                        {topic.keyVocabulary.slice(0, 5).map((word, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium"
                          >
                            {word}
                          </span>
                        ))}
                        {topic.keyVocabulary.length > 5 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            +{topic.keyVocabulary.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      console.log('🔘 Button clicked for topic:', topic.topic)
                      selectTopic(topic)
                    }}
                    className="mt-4 w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <span>Click to start teaching</span>
                    <span>→</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Language Proficiency Selector Modal */}
        {(() => {
          console.log('🔍 Modal render check:', { showProficiencySelector, selectedTopic })
          return null
        })()}
        {showProficiencySelector && selectedTopic && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Before we start...</h2>
                <p className="text-gray-600">
                  This will help us match the conversation to your English level
                </p>
              </div>

              {/* English Proficiency Level */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  How comfortable are you speaking English in class?
                </label>
                <div className="space-y-2">
                  <button
                    onClick={() => setLanguageProficiency('beginner')}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      languageProficiency === 'beginner'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">Beginner</div>
                    <div className="text-sm text-gray-600">
                      I'm still learning. Simpler words and sentences help me understand better.
                    </div>
                  </button>

                  <button
                    onClick={() => setLanguageProficiency('intermediate')}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      languageProficiency === 'intermediate'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">Intermediate</div>
                    <div className="text-sm text-gray-600">
                      I can understand most conversations but sometimes need help with harder words.
                    </div>
                  </button>

                  <button
                    onClick={() => setLanguageProficiency('advanced')}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      languageProficiency === 'advanced'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">Advanced</div>
                    <div className="text-sm text-gray-600">
                      I'm comfortable with academic English and complex vocabulary.
                    </div>
                  </button>
                </div>
              </div>

              {/* Native Language (Optional) */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  What's your first language? (optional)
                </label>
                <select
                  value={nativeLanguage}
                  onChange={(e) => setNativeLanguage(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish (Español)</option>
                  <option value="zh">Chinese (中文)</option>
                  <option value="ar">Arabic (العربية)</option>
                  <option value="vi">Vietnamese (Tiếng Việt)</option>
                  <option value="tl">Tagalog (Filipino)</option>
                  <option value="fr">French (Français)</option>
                  <option value="ko">Korean (한국어)</option>
                  <option value="ru">Russian (Русский)</option>
                  <option value="pt">Portuguese (Português)</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="bn">Bengali (বাংলা)</option>
                  <option value="ja">Japanese (日本語)</option>
                  <option value="de">German (Deutsch)</option>
                  <option value="other">Other</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  We can provide translations and examples in your language if needed
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowProficiencySelector(false)
                    setSelectedTopic(null)
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Go Back
                </button>
                <button
                  onClick={startWithProficiency}
                  className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                >
                  Start Teaching
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Conversation View
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Teach Alex about {selectedTopic?.topic}</h1>
              <p className="text-gray-600 mt-1">
                Alex is a {selectedTopic?.gradeLevel} student who needs your help understanding this concept
              </p>
            </div>
            <button
              onClick={() => setView('topics')}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress */}
          {understanding > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Understanding Level</span>
                <span className="font-semibold text-purple-600">{understanding}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    understanding >= 80 ? 'bg-green-500' :
                    understanding >= 60 ? 'bg-blue-500' :
                    understanding >= 40 ? 'bg-yellow-500' : 'bg-orange-500'
                  }`}
                  style={{ width: `${understanding}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Container */}
      <div className="max-w-4xl mx-auto">
        {/* Screen Reader Live Region */}
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {sessionStatus === 'paused' && gracePeriodEndsAt && `Session paused. ${timeRemaining} remaining to finish your thought.`}
          {sessionStatus === 'ended' && gracePeriodEndsAt && `Session ending. ${timeRemaining} remaining to finish your thought.`}
          {isSending && 'Sending your message to Alex...'}
          {isRecording && 'Recording your voice...'}
          {isTranscribing && 'Transcribing your speech...'}
          {understanding > 0 && messages.length > 0 && `Your understanding level is ${understanding}%`}
        </div>

        <div className="bg-white rounded-2xl shadow-lg flex flex-col" style={{ height: 'calc(100vh - 280px)' }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4" role="log" aria-label="Conversation messages">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex animate-slide-up ${msg.role === 'student' ? 'justify-end' : 'justify-start'}`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className={`flex items-start gap-3 max-w-[80%] ${
                  msg.role === 'student' ? 'flex-row-reverse' : ''
                }`}>
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${
                    msg.role === 'ai'
                      ? 'bg-purple-100'
                      : 'bg-blue-100'
                  }`}>
                    {msg.role === 'ai' ? (
                      <svg className="w-5 h-5 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>

                  {/* Message Bubble - iOS Style with tail */}
                  <div className={`relative rounded-2xl p-4 shadow-sm ${
                    msg.role === 'ai'
                      ? 'bg-purple-50 text-gray-900 border border-purple-100 rounded-bl-md'
                      : 'bg-blue-700 text-white rounded-br-md'
                  }`}>
                    <p className="text-base leading-relaxed">{msg.content}</p>
                    {msg.timestamp && (
                      <time className="text-xs opacity-70 mt-2 block">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </time>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex justify-start animate-fade-in">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shadow-sm">
                    <svg className="w-5 h-5 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="bg-purple-50 rounded-2xl rounded-bl-md p-4 border border-purple-100 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span className="text-sm text-gray-600 ml-2">Alex is thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4">
            {/* Mode Toggle */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <button
                onClick={() => setInputMode('voice')}
                className={`min-h-[44px] px-6 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex items-center gap-2 ${
                  inputMode === 'voice'
                    ? 'bg-purple-700 text-white'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
                aria-label="Use voice input mode"
                aria-pressed={inputMode === 'voice'}
                type="button"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <span>Speak</span>
              </button>
              <button
                onClick={() => setInputMode('text')}
                className={`min-h-[44px] px-6 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex items-center gap-2 ${
                  inputMode === 'text'
                    ? 'bg-purple-700 text-white'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
                aria-label="Use text input mode"
                aria-pressed={inputMode === 'text'}
                type="button"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Type</span>
              </button>
              <button
                onClick={requestHelp}
                className="min-h-[44px] px-6 py-2 rounded-lg font-medium bg-yellow-100 text-yellow-900 hover:bg-yellow-200 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 flex items-center gap-2"
                aria-label="Request help and hints"
                type="button"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>Need Help?</span>
              </button>
            </div>

            {/* Voice Input */}
            {inputMode === 'voice' && (
              <div className="space-y-3">
                {/* Transcribed Text (editable) */}
                {currentTranscript && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-sm text-gray-600 mb-2 block">What you said (you can edit this):</label>
                    <textarea
                      value={currentTranscript}
                      onChange={(e) => setCurrentTranscript(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      rows={3}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => sendMessage(currentTranscript)}
                        disabled={isSending}
                        className="flex-1 min-h-[44px] bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center justify-center gap-2"
                        aria-label="Send your message"
                        type="button"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Send</span>
                      </button>
                      <button
                        onClick={() => setCurrentTranscript('')}
                        className="min-h-[44px] px-6 py-2 rounded-lg border-2 border-gray-400 text-gray-900 hover:bg-gray-50 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
                        aria-label="Record again"
                        type="button"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Record Again</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Record Button */}
                {!currentTranscript && !isTranscribing && (
                  <div className="flex flex-col items-center animate-scale-in">
                    <div className="relative">
                      <button
                        onMouseDown={startRecording}
                        onMouseUp={stopRecording}
                        onTouchStart={startRecording}
                        onTouchEnd={stopRecording}
                        className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-2 ${
                          isRecording
                            ? 'bg-red-600 text-white scale-110 shadow-2xl shadow-red-500/50 focus:ring-red-500'
                            : 'bg-purple-700 text-white hover:bg-purple-800 hover:scale-105 shadow-lg focus:ring-purple-500'
                        }`}
                        aria-label={isRecording ? 'Recording - release to stop' : 'Press and hold to record voice message'}
                        aria-pressed={isRecording}
                        type="button"
                      >
                        {isRecording && (
                          <span className="absolute inset-0 rounded-full bg-red-600 animate-ping opacity-75"></span>
                        )}
                        <svg className="w-8 h-8 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </button>

                      {/* Waveform Animation when recording */}
                      {isRecording && (
                        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className="w-1 bg-red-500 rounded-full animate-wave"
                              style={{
                                animationDelay: `${i * 0.1}s`
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <p className="text-sm text-gray-700 mt-16 flex items-center gap-2" aria-live="polite">
                      {isRecording && (
                        <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                      )}
                      {isRecording ? 'Recording... Release to stop' : 'Press and hold to speak'}
                    </p>
                  </div>
                )}

                {/* Transcribing */}
                {isTranscribing && (
                  <div className="flex flex-col items-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                    <p className="text-sm text-gray-600 mt-3">Transcribing your speech...</p>
                  </div>
                )}
              </div>
            )}

            {/* Text Input */}
            {inputMode === 'text' && (
              <div>
                <label htmlFor="text-input" className="sr-only">Type your explanation</label>
                <textarea
                  id="text-input"
                  ref={textInputRef}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your explanation here... (Cmd/Ctrl + Enter to send)"
                  className="w-full border-2 border-gray-300 rounded-lg p-4 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none text-gray-900"
                  rows={4}
                  aria-label="Type your explanation here"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => sendMessage(textInput)}
                    disabled={isSending || !textInput.trim()}
                    className="flex-1 min-h-[44px] bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    aria-label="Send your message"
                    type="button"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Key Vocabulary */}
        {selectedTopic?.keyVocabulary && selectedTopic.keyVocabulary.length > 0 && (
          <div className="mt-4 bg-white rounded-xl shadow-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Key Vocabulary to Use:</h3>
            <div className="flex flex-wrap gap-2">
              {selectedTopic.keyVocabulary.map((word, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Scaffolding Modal */}
      {showScaffolding && scaffolding && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowScaffolding(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="scaffolding-title"
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 id="scaffolding-title" className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>Here's some help!</span>
              </h2>
              <button
                ref={scaffoldingCloseButtonRef}
                onClick={() => setShowScaffolding(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                aria-label="Close help dialog"
                type="button"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Sentence Starters */}
            {scaffolding.sentenceStarters && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Try starting with one of these:</h3>
                <div className="space-y-2">
                  {scaffolding.sentenceStarters.map((starter, index) => (
                    <button
                      key={index}
                      onClick={() => useSentenceStarter(starter)}
                      className="w-full text-left min-h-[44px] p-3 border-2 border-purple-300 rounded-lg hover:border-purple-600 hover:bg-purple-50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                      aria-label={`Use sentence starter: ${starter}`}
                      type="button"
                    >
                      <span className="text-purple-700 font-medium">"{starter}"</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Vocabulary Help */}
            {scaffolding.vocabulary && scaffolding.vocabulary.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Helpful words:</h3>
                <div className="grid grid-cols-1 gap-3" role="list">
                  {scaffolding.vocabulary.map((item, index) => (
                    <div key={index} className="p-3 bg-gray-50 border border-gray-200 rounded-lg" role="listitem">
                      <div className="font-semibold text-gray-900">{item.word}</div>
                      <div className="text-sm text-gray-700 mt-1">{item.definition}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hint */}
            {scaffolding.hint && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-yellow-700 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <div>
                    <div className="font-semibold text-yellow-800 mb-1">Hint:</div>
                    <div className="text-yellow-700">{scaffolding.hint}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Session Status Modal (Paused/Ended) */}
      {showSessionModal && (sessionStatus === 'paused' || sessionStatus === 'ended' || timeRemaining === 0) && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            {sessionStatus === 'paused' && gracePeriodEndsAt && timeRemaining && timeRemaining !== 0 ? (
              <>
                <div className="mx-auto w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Session Paused</h2>
                <p className="text-gray-600 mb-6">
                  Your teacher has paused the session. You have <span className="font-bold text-orange-600">{timeRemaining}</span> to finish your current thought.
                </p>
                <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-orange-700 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <p className="text-sm text-orange-800">
                      Save your work! The session will be locked when the timer runs out.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSessionModal(false)}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Continue Working
                </button>
              </>
            ) : sessionStatus === 'ended' && gracePeriodEndsAt && timeRemaining && timeRemaining !== 0 ? (
              <>
                <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Session Ending</h2>
                <p className="text-gray-600 mb-6">
                  Your teacher has ended the session. You have <span className="font-bold text-red-600">{timeRemaining}</span> to finish your current thought.
                </p>
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-red-700 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm text-red-800">
                      Finish up quickly! You won't be able to send messages after the timer ends.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSessionModal(false)}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Finish My Thought
                </button>
              </>
            ) : sessionStatus === 'paused' ? (
              <>
                <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Session Paused</h2>
                <p className="text-gray-600 mb-6">
                  Your teacher has paused the session. Please wait for them to resume.
                </p>
                <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-600">
                    You can review your conversation, but you can't send new messages right now.
                  </p>
                </div>
                <button
                  onClick={() => navigate(-1)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Return to Join Page
                </button>
              </>
            ) : (
              <>
                <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Session Has Ended</h2>
                <p className="text-gray-600 mb-6">
                  Your teacher has ended this session. Great work teaching today!
                </p>
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-green-800">
                      Your progress has been saved. Your teacher can review your conversation.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(-1)}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Return to Join Page
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Grace Period Warning Banner */}
      {timeRemaining && timeRemaining !== 0 && !showSessionModal && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40">
          <div className={`${sessionStatus === 'paused' ? 'bg-orange-500' : 'bg-red-500'} text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3 animate-pulse`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-bold">
              {sessionStatus === 'paused' ? 'Session Paused' : 'Session Ending'}: {timeRemaining} remaining
            </span>
            <button
              onClick={() => setShowSessionModal(true)}
              className="ml-2 text-white hover:text-gray-200"
              aria-label="Show session status details"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
