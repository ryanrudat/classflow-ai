import React, { useState, useEffect, useRef } from 'react'
import { useSocket } from '../hooks/useSocket'
import { collaborationAPI } from '../services/api'

/**
 * CollaborationLobby - Waiting room for Tag-Team partner matching
 *
 * Students wait here until matched with a partner for collaborative tutoring.
 * Shows waiting status, tips, and handles the matching process.
 */
export default function CollaborationLobby({
  sessionId,
  studentId,
  studentName,
  topic,
  onPartnerFound,
  onCancel
}) {
  const socket = useSocket()
  const [status, setStatus] = useState('joining') // 'joining', 'waiting', 'matched', 'error'
  const [waitingTime, setWaitingTime] = useState(0)
  const [partnerInfo, setPartnerInfo] = useState(null)
  const [countdown, setCountdown] = useState(3)
  const timerRef = useRef(null)
  const countdownRef = useRef(null)
  const hasJoinedRef = useRef(false) // Prevent multiple join attempts
  const hasMatchedRef = useRef(false) // Prevent duplicate partner found calls
  const onPartnerFoundRef = useRef(onPartnerFound) // Stable reference to callback

  // Keep the ref updated
  useEffect(() => {
    onPartnerFoundRef.current = onPartnerFound
  }, [onPartnerFound])

  // Tips to show while waiting
  const waitingTips = [
    "While you wait, think about how you'll explain the topic to Alex.",
    "Remember: You speak to Alex, but you can text chat with your partner!",
    "Pro tip: Take turns. One person teaches while the other supports.",
    "Your partner might have different insights - collaboration makes learning better!",
    "When it's your turn, speak clearly and use the vocabulary words."
  ]
  const [currentTip, setCurrentTip] = useState(0)

  // Rotate tips every 5 seconds
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % waitingTips.length)
    }, 5000)

    return () => {
      clearInterval(tipInterval)
      if (timerRef.current) clearInterval(timerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [])

  // Socket event listeners and joining waiting room
  // IMPORTANT: Wait for socket to be ready before joining waiting room
  // This prevents race condition where partner-found event is missed
  useEffect(() => {
    if (!socket) return

    // Prevent multiple join attempts
    if (hasJoinedRef.current) return
    hasJoinedRef.current = true

    // Join the student's personal room for direct messages FIRST
    socket.emit('join-student-room', { studentId })

    // Listen for partner found event
    const handlePartnerFound = (data) => {
      // Prevent duplicate calls
      if (hasMatchedRef.current) {
        console.log('Already matched, ignoring duplicate partner-found event')
        return
      }

      if (data.collabSessionId) {
        hasMatchedRef.current = true
        setPartnerInfo(data.partner)
        setStatus('matched')

        // Clear any existing countdown
        if (countdownRef.current) {
          clearInterval(countdownRef.current)
        }

        // Start countdown before entering conversation
        let count = 3
        setCountdown(count)
        countdownRef.current = setInterval(() => {
          count--
          setCountdown(count)
          if (count <= 0) {
            clearInterval(countdownRef.current)
            countdownRef.current = null
            // Use ref to get latest callback
            onPartnerFoundRef.current({
              collabSessionId: data.collabSessionId,
              conversationId: data.conversationId, // Pass the existing conversation ID
              partner: data.partner,
              isInitiator: data.isInitiator
            })
          }
        }, 1000)
      }
    }

    socket.on('partner-found', handlePartnerFound)

    // NOW join the waiting room after socket is ready and listening
    joinWaitingRoom()

    return () => {
      socket.off('partner-found', handlePartnerFound)
      leaveWaitingRoom()
      hasJoinedRef.current = false
    }
  }, [socket, studentId]) // Removed onPartnerFound - using ref instead

  const joinWaitingRoom = async () => {
    try {
      setStatus('joining')
      const result = await collaborationAPI.joinWaitingRoom(sessionId, studentId, studentName, topic.id)

      if (result.matched) {
        // Prevent duplicate calls
        if (hasMatchedRef.current) {
          console.log('Already matched, ignoring duplicate API response')
          return
        }
        hasMatchedRef.current = true

        // Already matched with a partner waiting
        setPartnerInfo(result.partner)
        setStatus('matched')

        // Use a countdown like the socket handler for consistency
        let count = 3
        setCountdown(count)
        countdownRef.current = setInterval(() => {
          count--
          setCountdown(count)
          if (count <= 0) {
            clearInterval(countdownRef.current)
            countdownRef.current = null
            onPartnerFoundRef.current({
              collabSessionId: result.collabSessionId,
              conversationId: result.conversationId, // Pass the existing conversation ID
              partner: result.partner,
              isInitiator: false
            })
          }
        }, 1000)
      } else {
        setStatus('waiting')
        // Start waiting timer
        timerRef.current = setInterval(() => {
          setWaitingTime(prev => prev + 1)
        }, 1000)
      }
    } catch (error) {
      console.error('Failed to join waiting room:', error)
      setStatus('error')
    }
  }

  const leaveWaitingRoom = async () => {
    try {
      await collaborationAPI.leaveWaitingRoom(sessionId, studentId, topic.id)
    } catch (error) {
      console.error('Failed to leave waiting room:', error)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleCancel = () => {
    leaveWaitingRoom()
    onCancel()
  }

  // Render based on status
  if (status === 'joining') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-indigo-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Joining Tag-Team...</h2>
          <p className="text-gray-600">Setting up your collaboration session</p>
        </div>
      </div>
    )
  }

  if (status === 'matched') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-green-900 via-emerald-900 to-green-800 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Partner Found!</h2>
          <p className="text-lg text-gray-600 mb-4">
            You've been matched with <span className="font-semibold text-green-600">{partnerInfo?.name || 'a classmate'}</span>
          </p>
          <div className="text-6xl font-bold text-indigo-600 mb-4">{countdown}</div>
          <p className="text-gray-500">Starting Tag-Team session...</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-red-900 via-rose-900 to-red-800 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-6">Unable to join the waiting room. Please try again.</p>
          <div className="flex gap-3">
            <button
              onClick={joinWaitingRoom}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Try Again
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Go Solo
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Waiting status
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold">Tag-Team Waiting Room</h2>
              <p className="text-indigo-100">Finding you a partner...</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Topic info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="text-sm text-gray-500 mb-1">Topic</div>
            <div className="text-lg font-semibold text-gray-900">{topic.topic}</div>
            <div className="text-sm text-gray-600">{topic.subject} - {topic.gradeLevel}</div>
          </div>

          {/* Waiting animation */}
          <div className="text-center mb-6">
            <div className="flex justify-center gap-2 mb-4">
              <div className="w-4 h-4 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-4 h-4 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-4 h-4 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="text-gray-600">Looking for a classmate to join...</p>
            <p className="text-sm text-gray-500 mt-1">Wait time: {formatTime(waitingTime)}</p>
          </div>

          {/* Tip box */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-indigo-900 mb-1">Tip</div>
                <p className="text-sm text-indigo-800">{waitingTips[currentTip]}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
            >
              Go Solo Instead
            </button>
          </div>

          <p className="text-xs text-center text-gray-500 mt-4">
            If no partner is found in 2 minutes, you can continue solo
          </p>
        </div>
      </div>
    </div>
  )
}
