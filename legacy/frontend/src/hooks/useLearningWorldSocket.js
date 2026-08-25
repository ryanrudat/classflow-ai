import { useEffect, useCallback } from 'react'
import { useSocket } from './useSocket'
import { useLearningWorldStore } from '../stores/learningWorldStore'

/**
 * Learning Worlds Socket Hook
 *
 * Extends the base socket with Learning Worlds specific events:
 * - Navigation sync (teacher → students)
 * - Control mode changes
 * - Activity progress updates
 * - Session state changes
 */
export function useLearningWorldSocket(sessionId) {
  const socketState = useSocket() || {}
  const { on, off, emit, isConnected, joinSession, leaveSession } = socketState

  const storeState = useLearningWorldStore() || {}
  const {
    handleNavigateEvent = () => {},
    handleControlModeEvent = () => {},
    handleSessionEndedEvent = () => {},
    handleProgressEvent = () => {},
    isTeacher = true
  } = storeState

  // Join world session room
  useEffect(() => {
    if (!sessionId || !isConnected) return

    const role = isTeacher ? 'teacher' : 'student'
    joinSession(sessionId, role)

    return () => {
      leaveSession(sessionId)
    }
  }, [sessionId, isConnected, isTeacher, joinSession, leaveSession])

  // Set up event listeners
  useEffect(() => {
    if (!isConnected) return

    // Navigation events (teacher controls, students follow)
    const handleNavigate = (data) => {
      console.log('🗺️ World navigation event:', data)
      handleNavigateEvent(data)
    }

    // Control mode changes
    const handleControlMode = (data) => {
      console.log('🎮 Control mode changed:', data)
      handleControlModeEvent(data)
    }

    // Session ended
    const handleSessionEnded = () => {
      console.log('🛑 World session ended')
      handleSessionEndedEvent()
    }

    // Activity progress (from students to teacher)
    const handleProgress = (data) => {
      console.log('📊 Activity progress:', data)
      handleProgressEvent(data)
    }

    // Touch event (student touched something)
    const handleStudentTouch = (data) => {
      console.log('👆 Student touch:', data)
      // Could trigger visual feedback on teacher screen
    }

    // Register event listeners
    on('world-navigate', handleNavigate)
    on('world-control-mode', handleControlMode)
    on('world-session-ended', handleSessionEnded)
    on('world-activity-progress', handleProgress)
    on('world-student-touch', handleStudentTouch)

    return () => {
      off('world-navigate', handleNavigate)
      off('world-control-mode', handleControlMode)
      off('world-session-ended', handleSessionEnded)
      off('world-activity-progress', handleProgress)
      off('world-student-touch', handleStudentTouch)
    }
  }, [
    isConnected,
    on,
    off,
    handleNavigateEvent,
    handleControlModeEvent,
    handleSessionEndedEvent,
    handleProgressEvent
  ])

  /**
   * Emit navigation event (teacher only)
   */
  const emitNavigate = useCallback((navigation) => {
    if (isTeacher && sessionId) {
      emit('world-navigate', {
        sessionId,
        ...navigation
      })
    }
  }, [emit, isTeacher, sessionId])

  /**
   * Emit control mode change (teacher only)
   */
  const emitControlMode = useCallback((controlMode) => {
    if (isTeacher && sessionId) {
      emit('world-control-mode', {
        sessionId,
        controlMode
      })
    }
  }, [emit, isTeacher, sessionId])

  /**
   * Emit activity progress (student only)
   */
  const emitProgress = useCallback((activityId, progress) => {
    if (!isTeacher && sessionId) {
      emit('world-activity-progress', {
        sessionId,
        activityId,
        progress
      })
    }
  }, [emit, isTeacher, sessionId])

  /**
   * Emit student touch event
   */
  const emitStudentTouch = useCallback((touchData) => {
    if (!isTeacher && sessionId) {
      emit('world-student-touch', {
        sessionId,
        ...touchData
      })
    }
  }, [emit, isTeacher, sessionId])

  /**
   * End the world session (teacher only)
   */
  const emitEndSession = useCallback(() => {
    if (isTeacher && sessionId) {
      emit('world-session-ended', { sessionId })
    }
  }, [emit, isTeacher, sessionId])

  return {
    isConnected,
    emitNavigate,
    emitControlMode,
    emitProgress,
    emitStudentTouch,
    emitEndSession
  }
}
