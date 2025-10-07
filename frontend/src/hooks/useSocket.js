import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000'

export function useSocket() {
  const socketRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    })

    const socket = socketRef.current

    socket.on('connect', () => {
      console.log('✅ WebSocket connected:', socket.id)
      setIsConnected(true)
    })

    socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected')
      setIsConnected(false)
    })

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      setIsConnected(false)
    })

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [])

  const joinSession = (sessionId, role, studentId = null) => {
    if (socketRef.current) {
      socketRef.current.emit('join-session', { sessionId, role, studentId })
    }
  }

  const pushActivity = (sessionId, activity, target = 'all', studentIds = []) => {
    if (socketRef.current) {
      socketRef.current.emit('push-activity', { sessionId, activity, target, studentIds })
    }
  }

  const submitResponse = (activityId, studentId, response) => {
    if (socketRef.current) {
      socketRef.current.emit('submit-response', { activityId, studentId, response })
    }
  }

  const lockScreen = (sessionId, studentIds = 'all') => {
    if (socketRef.current) {
      socketRef.current.emit('screen-lock', { sessionId, studentIds })
    }
  }

  const unlockScreen = (sessionId, studentIds = 'all') => {
    if (socketRef.current) {
      socketRef.current.emit('screen-unlock', { sessionId, studentIds })
    }
  }

  const updateStudentStatus = (studentId, status) => {
    if (socketRef.current) {
      socketRef.current.emit('student-status', { studentId, status })
    }
  }

  const on = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback)
    }
  }

  const off = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback)
    }
  }

  return {
    socket: socketRef.current,
    isConnected,
    joinSession,
    pushActivity,
    submitResponse,
    lockScreen,
    unlockScreen,
    updateStudentStatus,
    on,
    off
  }
}
