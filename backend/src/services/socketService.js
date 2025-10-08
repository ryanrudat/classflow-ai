// WebSocket service for real-time communication
export function setupSocketIO(io) {
  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id)

    // Join session room
    socket.on('join-session', ({ sessionId, role, studentId, studentName }) => {
      socket.join(`session-${sessionId}`)
      socket.sessionId = sessionId
      socket.role = role // 'teacher' or 'student'
      socket.studentId = studentId
      socket.studentName = studentName

      console.log(`Socket ${socket.id} joined session ${sessionId} as ${role}${studentName ? ` (${studentName})` : ''}`)

      // Notify others in the session
      socket.to(`session-${sessionId}`).emit('user-joined', {
        socketId: socket.id,
        role,
        studentId,
        studentName,
        timestamp: new Date().toISOString()
      })
    })

    // Activity pushed to students
    socket.on('push-activity', ({ sessionId, activity, target, studentIds }) => {
      if (target === 'all') {
        io.to(`session-${sessionId}`).emit('activity-received', { activity })
      } else if (target === 'specific' && studentIds) {
        studentIds.forEach(studentId => {
          io.to(`session-${sessionId}`).emit('activity-received', {
            activity,
            targetStudentId: studentId
          })
        })
      }
      console.log(`📤 Activity pushed to ${target} in session ${sessionId}`)
    })

    // Student response submitted
    socket.on('submit-response', ({ activityId, studentId, response }) => {
      const sessionId = socket.sessionId

      // Notify teacher of student response
      socket.to(`session-${sessionId}`).emit('student-responded', {
        activityId,
        studentId,
        response,
        timestamp: new Date().toISOString()
      })

      console.log(`📝 Student ${studentId} submitted response for activity ${activityId}`)
    })

    // Screen control events
    socket.on('screen-lock', ({ sessionId, studentIds }) => {
      if (studentIds === 'all') {
        io.to(`session-${sessionId}`).emit('screen-locked')
      } else {
        studentIds.forEach(studentId => {
          io.to(`session-${sessionId}`).emit('screen-locked', { targetStudentId: studentId })
        })
      }
      console.log(`🔒 Screen locked for ${studentIds} in session ${sessionId}`)
    })

    socket.on('screen-unlock', ({ sessionId, studentIds }) => {
      if (studentIds === 'all') {
        io.to(`session-${sessionId}`).emit('screen-unlocked')
      } else {
        studentIds.forEach(studentId => {
          io.to(`session-${sessionId}`).emit('screen-unlocked', { targetStudentId: studentId })
        })
      }
      console.log(`🔓 Screen unlocked for ${studentIds} in session ${sessionId}`)
    })

    // Student status update (for real-time tracking)
    socket.on('student-status', ({ studentId, status }) => {
      const sessionId = socket.sessionId
      socket.to(`session-${sessionId}`).emit('student-status-changed', {
        studentId,
        status,
        timestamp: new Date().toISOString()
      })
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      if (socket.sessionId && socket.studentId) {
        io.to(`session-${socket.sessionId}`).emit('user-left', {
          socketId: socket.id,
          role: socket.role,
          studentId: socket.studentId,
          timestamp: new Date().toISOString()
        })
      }
      console.log('❌ Client disconnected:', socket.id)
    })
  })

  return io
}
