// WebSocket service for real-time communication
export function setupSocketIO(io) {
  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id)

    // Leave session room
    socket.on('leave-session', async ({ sessionId }) => {
      const roomName = `session-${sessionId}`
      socket.leave(roomName)

      console.log(`👋 Socket ${socket.id} left room ${roomName}`)

      // Notify others in the session that user left
      socket.to(roomName).emit('user-left', {
        socketId: socket.id,
        role: socket.role,
        studentId: socket.studentId,
        studentName: socket.studentName,
        timestamp: new Date().toISOString()
      })

      // Clear session-specific data from socket
      // (Keep the socket alive, just clear session metadata)
      const previousSessionId = socket.sessionId
      socket.sessionId = null
      socket.studentId = null
      socket.studentName = null
      socket.role = null

      console.log(`🧹 Cleared session metadata for socket ${socket.id} (was in session ${previousSessionId})`)
    })

    // Join session room
    socket.on('join-session', async ({ sessionId, role, studentId, studentName }) => {
      const roomName = `session-${sessionId}`
      socket.join(roomName)
      socket.sessionId = sessionId
      socket.role = role // 'teacher' or 'student'
      socket.studentId = studentId
      socket.studentName = studentName

      // Get all sockets in room after joining
      const socketsInRoom = await io.in(roomName).allSockets()

      console.log(`✅ Socket ${socket.id} joined room ${roomName} as ${role}${studentName ? ` (${studentName})` : ''}`)
      console.log(`   Total sockets in ${roomName}:`, socketsInRoom.size)
      console.log(`   Socket IDs in room:`, Array.from(socketsInRoom))

      // If a teacher just joined, notify them of all currently connected students
      if (role === 'teacher') {
        const students = []
        const sockets = await io.in(roomName).fetchSockets()
        for (const s of sockets) {
          if (s.role === 'student' && s.id !== socket.id) {
            students.push({
              socketId: s.id,
              role: 'student',
              studentId: s.studentId,
              studentName: s.studentName,
              timestamp: new Date().toISOString()
            })
          }
        }
        // Send all currently connected students to the teacher
        if (students.length > 0) {
          socket.emit('students-online', { students })
          console.log(`📢 Sent ${students.length} online students to teacher`)
        }
      }

      // Notify others in the session
      socket.to(roomName).emit('user-joined', {
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

    // Teacher removes a student
    socket.on('remove-student', async ({ studentId, sessionId }) => {
      // Remove student from database
      try {
        const db = (await import('../database/db.js')).default
        await db.query(
          'DELETE FROM session_students WHERE id = $1',
          [studentId]
        )
        console.log(`🗑️ Teacher removed student ${studentId} from database`)
      } catch (err) {
        console.error('Failed to remove student from database:', err)
      }

      // Find and disconnect the student's socket
      const room = io.sockets.adapter.rooms.get(`session-${sessionId}`)
      if (room) {
        for (const socketId of room) {
          const studentSocket = io.sockets.sockets.get(socketId)
          if (studentSocket && studentSocket.studentId === studentId) {
            // Send disconnect message to the student
            studentSocket.emit('force-disconnect', {
              message: 'You have been removed from the session'
            })
            // Disconnect the socket
            studentSocket.disconnect(true)
          }
        }
      }

      // Notify other users that the student was removed
      io.to(`session-${sessionId}`).emit('student-removed', {
        studentId,
        timestamp: new Date().toISOString()
      })

      console.log(`🚫 Student ${studentId} removed from session ${sessionId}`)
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

    // Student answered a question on a slide
    socket.on('student-answered-question', async ({ slideId, slideNumber, studentId: providedStudentId, selectedOption, isCorrect, timestamp }) => {
      const sessionId = socket.sessionId
      const studentId = providedStudentId || socket.studentId
      const studentName = socket.studentName

      console.log(`📝 Student ${studentName} (${studentId}) answered question on slide ${slideNumber}:`, {
        selectedOption,
        isCorrect
      })

      // Broadcast to teacher (and other connected sockets in room)
      socket.to(`session-${sessionId}`).emit('student-question-answered', {
        studentId,
        studentName,
        slideId,
        slideNumber,
        selectedOption,
        isCorrect,
        timestamp
      })

      // TODO: Optionally store in database for analytics
      // const db = (await import('../database/db.js')).default
      // await db.query(...)
    })

    // Student help events
    socket.on('help-shown', ({ studentId, sessionId, questionId, helpType }) => {
      // Notify teacher that a student received help
      socket.to(`session-${sessionId}`).emit('student-help-shown', {
        studentId,
        questionId,
        helpType,
        timestamp: new Date().toISOString()
      })

      console.log(`💡 Student ${studentId} received help (${helpType}) for question ${questionId}`)
    })

    socket.on('student-tried-again', ({ studentId, sessionId, questionId, attemptNumber }) => {
      // Notify teacher that student is trying again after help
      socket.to(`session-${sessionId}`).emit('student-retry', {
        studentId,
        questionId,
        attemptNumber,
        timestamp: new Date().toISOString()
      })

      console.log(`🔄 Student ${studentId} trying again (attempt #${attemptNumber}) for question ${questionId}`)
    })

    socket.on('simpler-version-requested', ({ studentId, sessionId, questionId }) => {
      // Notify teacher that student requested simpler version
      socket.to(`session-${sessionId}`).emit('student-requested-simpler', {
        studentId,
        questionId,
        timestamp: new Date().toISOString()
      })

      console.log(`📉 Student ${studentId} requested simpler version for question ${questionId}`)
    })

    // Student progress update (for live monitoring)
    socket.on('student-progress-update', ({
      studentId,
      studentName,
      sessionId,
      activityId,
      questionNumber,
      totalQuestions,
      isCorrect,
      attemptNumber,
      helpReceived,
      score,
      questionsAttempted
    }) => {
      // Broadcast progress update to teacher and other monitors
      socket.to(`session-${sessionId}`).emit('live-progress-update', {
        studentId,
        studentName,
        activityId,
        questionNumber,
        totalQuestions,
        isCorrect,
        attemptNumber,
        helpReceived,
        score,
        questionsAttempted,
        timestamp: new Date().toISOString()
      })

      console.log(`📊 Progress update: ${studentName} - Q${questionNumber}/${totalQuestions} - ${isCorrect ? '✅' : '❌'} (attempt ${attemptNumber})`)
    })

    // Confusion Meter - Student toggles confusion state
    socket.on('toggle-confusion', ({ sessionId, studentId, studentName, isConfused }) => {
      // Broadcast confusion state to teacher
      socket.to(`session-${sessionId}`).emit('confusion-updated', {
        studentId,
        studentName,
        isConfused,
        timestamp: new Date().toISOString()
      })

      console.log(`🤔 ${studentName} (${studentId}) confusion: ${isConfused ? 'CONFUSED' : 'CLEAR'} in session ${sessionId}`)
    })

    // Confusion Meter - Teacher clears all confusion
    socket.on('clear-confusion', ({ sessionId }) => {
      // Broadcast to all students to clear their confusion state
      io.to(`session-${sessionId}`).emit('confusion-cleared')

      console.log(`✅ All confusion cleared in session ${sessionId}`)
    })

    // Handle disconnection
    socket.on('disconnect', async () => {
      if (socket.sessionId && socket.studentId && socket.role === 'student') {
        // DON'T remove from database - just emit user-left event
        // Students should persist in the session until they explicitly leave
        // or teacher ends the session. Temporary disconnects shouldn't remove them.

        console.log(`⚠️ Student ${socket.studentId} disconnected from WebSocket (still in session)`)

        // Emit user-left event so UI can show them as offline
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
