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

    // Slide navigation events
    socket.on('student-navigated', ({ slideNumber, slideId }) => {
      const sessionId = socket.sessionId
      const studentId = socket.studentId

      // Notify teacher of student's current slide
      socket.to(`session-${sessionId}`).emit('student-slide-changed', {
        studentId,
        slideNumber,
        slideId,
        timestamp: new Date().toISOString()
      })

      console.log(`📍 Student ${studentId} navigated to slide ${slideNumber}`)
    })

    // Student started viewing a slide
    socket.on('slide-started', async ({ slideId, studentId: providedStudentId }) => {
      const sessionId = socket.sessionId
      const studentId = providedStudentId || socket.studentId

      // Track slide progress in database
      const db = (await import('../database/db.js')).default
      await db.query(
        `INSERT INTO student_slide_progress (student_id, slide_id, started_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (student_id, slide_id)
         DO UPDATE SET started_at = NOW(), completed_at = NULL`,
        [studentId, slideId]
      )

      console.log(`▶️ Student ${studentId} started slide ${slideId}`)
    })

    // Student completed a slide
    socket.on('slide-completed', async ({ slideId, timeSpent, studentId: providedStudentId }) => {
      const sessionId = socket.sessionId
      const studentId = providedStudentId || socket.studentId

      // Update slide progress in database
      const db = (await import('../database/db.js')).default
      await db.query(
        `UPDATE student_slide_progress
         SET completed_at = NOW(),
             time_spent_seconds = $3,
             stuck = false
         WHERE student_id = $1 AND slide_id = $2`,
        [studentId, slideId, timeSpent]
      )

      // Notify teacher
      socket.to(`session-${sessionId}`).emit('student-slide-completed', {
        studentId,
        slideId,
        timeSpent,
        timestamp: new Date().toISOString()
      })

      console.log(`✅ Student ${studentId} completed slide ${slideId}`)
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
