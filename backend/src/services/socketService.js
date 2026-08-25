// WebSocket service — presence only.
// Tells the teacher dashboard who is connected. Carries no application data
// and performs no database writes. (Activity push, screen lock, confusion,
// tag-team, and the unauthenticated remove-student event were removed.)
export function setupSocketIO(io) {
  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id)

    // Join session room
    socket.on('join-session', async ({ sessionId, role, studentId, studentName }) => {
      if (!sessionId) return

      const roomName = `session-${sessionId}`
      socket.join(roomName)
      socket.sessionId = sessionId
      socket.role = role === 'teacher' ? 'teacher' : 'student'
      socket.studentId = studentId
      socket.studentName = studentName

      console.log(`✅ Socket ${socket.id} joined room ${roomName} as ${socket.role}${studentName ? ` (${studentName})` : ''}`)

      // If a teacher just joined, send them the currently connected students
      if (socket.role === 'teacher') {
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
        if (students.length > 0) {
          socket.emit('students-online', { students })
        }
      }

      // Notify others in the session
      socket.to(roomName).emit('user-joined', {
        socketId: socket.id,
        role: socket.role,
        studentId,
        studentName,
        timestamp: new Date().toISOString()
      })
    })

    // Leave session room
    socket.on('leave-session', async ({ sessionId }) => {
      const roomName = `session-${sessionId}`
      socket.leave(roomName)

      socket.to(roomName).emit('user-left', {
        socketId: socket.id,
        role: socket.role,
        studentId: socket.studentId,
        studentName: socket.studentName,
        timestamp: new Date().toISOString()
      })

      socket.sessionId = null
      socket.studentId = null
      socket.studentName = null
      socket.role = null
    })

    // Handle disconnection — never removes the student from the database
    socket.on('disconnect', () => {
      if (socket.sessionId && socket.studentId && socket.role === 'student') {
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
