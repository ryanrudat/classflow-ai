import React, { useState, useEffect, useRef } from 'react'
import { useSocket } from '../hooks/useSocket'
import { collaborationAPI } from '../services/api'

/**
 * PartnerChat - Text chat sidebar for Tag-Team collaboration
 *
 * Partners can text each other while one person speaks to the AI.
 * This is the only text-based communication in Tag-Team mode.
 */
export default function PartnerChat({
  collabSessionId,
  studentId,
  studentName,
  partner,
  isMyTurn,
  onRequestTurn
}) {
  const socket = useSocket()
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [partnerTyping, setPartnerTyping] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory()
  }, [collabSessionId])

  // Socket listeners for real-time chat
  useEffect(() => {
    if (!socket || !collabSessionId) return

    // Join collaboration room
    socket.emit('collab-join-room', {
      collabSessionId,
      studentId,
      studentName
    })

    // Listen for new messages
    const handleNewMessage = (data) => {
      if (data.studentId !== studentId) {
        setMessages(prev => [...prev, {
          id: Date.now(),
          studentId: data.studentId,
          studentName: data.studentName,
          message: data.message,
          timestamp: data.timestamp
        }])
      }
    }

    // Listen for partner typing
    const handlePartnerTyping = (data) => {
      if (data.studentId !== studentId) {
        setPartnerTyping(data.isTyping)
      }
    }

    socket.on('collab-new-message', handleNewMessage)
    socket.on('collab-partner-typing', handlePartnerTyping)

    return () => {
      socket.off('collab-new-message', handleNewMessage)
      socket.off('collab-partner-typing', handlePartnerTyping)
      socket.emit('collab-leave-room', { collabSessionId, studentId, studentName })
    }
  }, [socket, collabSessionId, studentId, studentName])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadChatHistory = async () => {
    try {
      const data = await collaborationAPI.getChatHistory(collabSessionId)
      setMessages(data.messages || [])
    } catch (error) {
      console.error('Failed to load chat history:', error)
    }
  }

  const handleInputChange = (e) => {
    setInputText(e.target.value)

    // Emit typing indicator
    if (!isTyping) {
      setIsTyping(true)
      socket?.emit('collab-typing', {
        collabSessionId,
        studentId,
        studentName,
        isTyping: true
      })
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Stop typing indicator after 2 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      socket?.emit('collab-typing', {
        collabSessionId,
        studentId,
        studentName,
        isTyping: false
      })
    }, 2000)
  }

  const sendMessage = async () => {
    if (!inputText.trim()) return

    const messageText = inputText.trim()
    setInputText('')
    setIsTyping(false)

    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Stop typing indicator
    socket?.emit('collab-typing', {
      collabSessionId,
      studentId,
      studentName,
      isTyping: false
    })

    // Optimistically add message
    const newMessage = {
      id: Date.now(),
      studentId,
      studentName,
      message: messageText,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, newMessage])

    try {
      await collaborationAPI.sendChatMessage(collabSessionId, studentId, studentName, messageText)
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="fixed right-4 bottom-4 w-14 h-14 bg-indigo-600 rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 transition-colors z-40"
      >
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {messages.length}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-lg font-semibold text-indigo-600">
                {partner?.name?.charAt(0) || '?'}
              </span>
            </div>
            <div>
              <div className="font-semibold text-gray-900">{partner?.name || 'Partner'}</div>
              <div className="text-xs text-gray-500">
                {isMyTurn ? "Your turn to teach" : "Partner's turn"}
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Turn indicator */}
        <div className="mt-3">
          {isMyTurn ? (
            <div className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-center font-medium">
              You're teaching Alex - speak into the mic!
            </div>
          ) : (
            <button
              onClick={onRequestTurn}
              className="w-full text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full text-center font-medium hover:bg-indigo-200 transition-colors"
            >
              Request your turn
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>Chat with your partner here</p>
            <p className="text-xs mt-1">Coordinate who teaches what!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.studentId === studentId ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  msg.studentId === studentId
                    ? 'bg-indigo-600 text-white rounded-br-md'
                    : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
                }`}
              >
                <p className="text-sm">{msg.message}</p>
                <p className={`text-xs mt-1 ${
                  msg.studentId === studentId ? 'text-indigo-200' : 'text-gray-400'
                }`}>
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}

        {/* Partner typing indicator */}
        {partnerTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Message your partner..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          />
          <button
            onClick={sendMessage}
            disabled={!inputText.trim()}
            className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 disabled:bg-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
