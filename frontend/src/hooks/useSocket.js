import { useEffect, useRef, useState, useCallback } from 'react'
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

  const joinSession = useCallback((sessionId, role, studentId = null, studentName = null) => {
    if (socketRef.current) {
      console.log('🔌 Emitting join-session:', { sessionId, role, studentId, studentName })
      console.log('   Socket connected?', socketRef.current.connected)
      console.log('   Socket ID:', socketRef.current.id)
      socketRef.current.emit('join-session', { sessionId, role, studentId, studentName })
    } else {
      console.error('❌ Cannot join session - socket not initialized')
    }
  }, [])

  const pushActivity = useCallback((sessionId, activity, target = 'all', studentIds = []) => {
    if (socketRef.current) {
      socketRef.current.emit('push-activity', { sessionId, activity, target, studentIds })
    }
  }, [])

  const submitResponse = useCallback((activityId, studentId, response) => {
    if (socketRef.current) {
      socketRef.current.emit('submit-response', { activityId, studentId, response })
    }
  }, [])

  const lockScreen = useCallback((sessionId, studentIds = 'all') => {
    if (socketRef.current) {
      socketRef.current.emit('screen-lock', { sessionId, studentIds })
    }
  }, [])

  const unlockScreen = useCallback((sessionId, studentIds = 'all') => {
    if (socketRef.current) {
      socketRef.current.emit('screen-unlock', { sessionId, studentIds })
    }
  }, [])

  const updateStudentStatus = useCallback((studentId, status) => {
    if (socketRef.current) {
      socketRef.current.emit('student-status', { studentId, status })
    }
  }, [])

  const on = useCallback((event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback)
    }
  }, [])

  const off = useCallback((event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback)
    }
  }, [])

  const emit = useCallback((event, data) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data)
    }
  }, [])

  const removeStudent = useCallback((sessionId, studentId) => {
    if (socketRef.current) {
      socketRef.current.emit('remove-student', { sessionId, studentId })
    }
  }, [])

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
    off,
    emit,
    removeStudent
  }
}
