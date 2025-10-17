import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useToast } from '../components/Toast'
import axios from 'axios'

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

  // Get student info and lesson context from location state
  const studentId = location.state?.studentId
  const studentName = location.state?.studentName
  const topic = location.state?.topic ||'the lesson'
  const subject = location.state?.subject || 'Science'
  const gradeLevel = location.state?.gradeLevel || '7th grade'
  const keyVocabulary = location.state?.keyVocabulary || []

  // State
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

  // Refs
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])
  const messagesEndRef = useRef(null)

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Start conversation on mount
  useEffect(() => {
    if (!studentId || !sessionId) {
      toast.error('Error', 'Missing student or session information')
      navigate(-1)
      return
    }

    startConversation()
  }, [])

  /**
   * Start a new conversation
   */
  const startConversation = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/reverse-tutoring/start`, {
        sessionId,
        studentId,
        topic,
        subject,
        gradeLevel,
        keyVocabulary
      })

      setConversationId(response.data.conversationId)
      setMessages([{
        role: 'ai',
        content: response.data.aiMessage,
        timestamp: new Date()
      }])
      setMessageCount(1)

      toast.success('Ready to start!', `Teach Alex about ${topic}`)

    } catch (error) {
      console.error('Start conversation error:', error)
      toast.error('Error', error.response?.data?.message || 'Failed to start conversation')
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
        `${API_URL}/api/reverse-tutoring/transcribe?language=en&topic=${encodeURIComponent(topic)}`,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Teach Alex about {topic}</h1>
              <p className="text-gray-600 mt-1">
                Alex is a {gradeLevel} student who needs your help understanding this concept
              </p>
            </div>
            <button
              onClick={() => navigate(-1)}
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
        <div className="bg-white rounded-2xl shadow-lg flex flex-col" style={{ height: 'calc(100vh - 280px)' }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'student' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start gap-3 max-w-[80%] ${
                  msg.role === 'student' ? 'flex-row-reverse' : ''
                }`}>
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                    msg.role === 'ai'
                      ? 'bg-purple-100 text-purple-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    {msg.role === 'ai' ? '🤖' : '👤'}
                  </div>

                  {/* Message Bubble */}
                  <div className={`rounded-2xl p-4 ${
                    msg.role === 'ai'
                      ? 'bg-purple-50 text-gray-800'
                      : 'bg-blue-500 text-white'
                  }`}>
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex justify-start">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-lg">
                    🤖
                  </div>
                  <div className="bg-purple-50 rounded-2xl p-4">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
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
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  inputMode === 'voice'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🎤 Speak
              </button>
              <button
                onClick={() => setInputMode('text')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  inputMode === 'text'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                ⌨️ Type
              </button>
              <button
                onClick={requestHelp}
                className="px-4 py-2 rounded-lg font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors"
              >
                💡 Need Help?
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
                        className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium"
                      >
                        ✓ Send
                      </button>
                      <button
                        onClick={() => setCurrentTranscript('')}
                        className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                      >
                        ✏️ Record Again
                      </button>
                    </div>
                  </div>
                )}

                {/* Record Button */}
                {!currentTranscript && !isTranscribing && (
                  <div className="flex flex-col items-center">
                    <button
                      onMouseDown={startRecording}
                      onMouseUp={stopRecording}
                      onTouchStart={startRecording}
                      onTouchEnd={stopRecording}
                      className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all ${
                        isRecording
                          ? 'bg-red-500 text-white scale-110 animate-pulse'
                          : 'bg-purple-500 text-white hover:bg-purple-600'
                      }`}
                    >
                      🎤
                    </button>
                    <p className="text-sm text-gray-600 mt-3">
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
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your explanation here..."
                  className="w-full border border-gray-300 rounded-lg p-4 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={4}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => sendMessage(textInput)}
                    disabled={isSending || !textInput.trim()}
                    className="flex-1 bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Key Vocabulary */}
        {keyVocabulary.length > 0 && (
          <div className="mt-4 bg-white rounded-xl shadow-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Key Vocabulary to Use:</h3>
            <div className="flex flex-wrap gap-2">
              {keyVocabulary.map((word, index) => (
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">💡 Here's some help!</h2>
              <button
                onClick={() => setShowScaffolding(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Sentence Starters */}
            {scaffolding.sentenceStarters && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-3">Try starting with one of these:</h3>
                <div className="space-y-2">
                  {scaffolding.sentenceStarters.map((starter, index) => (
                    <button
                      key={index}
                      onClick={() => useSentenceStarter(starter)}
                      className="w-full text-left p-3 border-2 border-purple-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors"
                    >
                      <span className="text-purple-600 font-medium">"{starter}"</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Vocabulary Help */}
            {scaffolding.vocabulary && scaffolding.vocabulary.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-3">Helpful words:</h3>
                <div className="grid grid-cols-1 gap-3">
                  {scaffolding.vocabulary.map((item, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-semibold text-gray-900">{item.word}</div>
                      <div className="text-sm text-gray-600 mt-1">{item.definition}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hint */}
            {scaffolding.hint && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <span className="text-xl">💭</span>
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
    </div>
  )
}
