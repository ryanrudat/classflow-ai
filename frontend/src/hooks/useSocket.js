import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000'

/**
 * Presence socket.
 * The server only handles join-session / leave-session and broadcasts
 * user-joined / user-left / students-online. Nothing else goes over the socket.
 */
export function useSocket() {
  const socketRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    socketRef.current = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 20000,
      forceNew: true,
      path: '/socket.io/',
      autoConnect: true
    })

    const socket = socketRef.current

    socket.on('connect', () => setIsConnected(true))
    socket.on('disconnect', () => setIsConnected(false))
    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message)
      setIsConnected(false)
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  const joinSession = useCallback((sessionId, role, studentId = null, studentName = null) => {
    socketRef.current?.emit('join-session', { sessionId, role, studentId, studentName })
  }, [])

  const leaveSession = useCallback((sessionId) => {
    socketRef.current?.emit('leave-session', { sessionId })
  }, [])

  const on = useCallback((event, callback) => {
    socketRef.current?.on(event, callback)
  }, [])

  const off = useCallback((event, callback) => {
    socketRef.current?.off(event, callback)
  }, [])

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data)
  }, [])

  return {
    socket: socketRef.current,
    isConnected,
    joinSession,
    leaveSession,
    on,
    off,
    emit
  }
}
