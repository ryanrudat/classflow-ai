import db from '../database/db.js'
import { generateJoinCode, isValidJoinCode } from '../utils/generateCode.js'

/**
 * Create new session
 * POST /api/sessions
 * Body: { title, subject }
 * Protected: Teacher only
 */
export async function createSession(req, res) {
  try {
    const { title, subject } = req.body
    const teacherId = req.user.userId

    // Validation
    if (!title) {
      return res.status(400).json({ message: 'Session title is required' })
    }

    const validSubjects = ['English', 'History', 'Social Studies', 'Government', 'Biology']
    if (subject && !validSubjects.includes(subject)) {
      return res.status(400).json({
        message: `Subject must be one of: ${validSubjects.join(', ')}`
      })
    }

    // Generate unique join code
    let joinCode
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      joinCode = generateJoinCode()

      // Check if code already exists
      const existing = await db.query(
        'SELECT id FROM sessions WHERE join_code = $1 AND status = $2',
        [joinCode, 'active']
      )

      if (existing.rows.length === 0) {
        break // Code is unique
      }

      attempts++
    }

    if (attempts >= maxAttempts) {
      return res.status(500).json({ message: 'Failed to generate unique join code' })
    }

    // Create session
    const result = await db.query(
      `INSERT INTO sessions (teacher_id, title, subject, join_code, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING *`,
      [teacherId, title, subject || null, joinCode]
    )

    const session = result.rows[0]

    // Log analytics
    await db.query(
      `INSERT INTO analytics_events (event_type, user_id, session_id, properties)
       VALUES ($1, $2, $3, $4)`,
      ['session_created', teacherId, session.id, JSON.stringify({ subject, title })]
    )

    res.json({
      session,
      message: 'Session created successfully'
    })

  } catch (error) {
    console.error('Create session error:', error)
    res.status(500).json({ message: 'Failed to create session' })
  }
}

/**
 * Get session details
 * GET /api/sessions/:id
 * Protected: Teacher only
 */
export async function getSession(req, res) {
  try {
    const { id } = req.params
    const teacherId = req.user.userId

    // Get session
    const sessionResult = await db.query(
      `SELECT * FROM sessions
       WHERE id = $1 AND teacher_id = $2`,
      [id, teacherId]
    )

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' })
    }

    const session = sessionResult.rows[0]

    // Get students in session
    const studentsResult = await db.query(
      `SELECT id, student_name, device_type, current_screen_state, joined_at, last_active
       FROM session_students
       WHERE session_id = $1
       ORDER BY joined_at DESC`,
      [id]
    )

    // Get activities in session
    const activitiesResult = await db.query(
      `SELECT id, type, prompt, difficulty_level, pushed_to, created_at
       FROM activities
       WHERE session_id = $1
       ORDER BY created_at DESC`,
      [id]
    )

    res.json({
      session,
      students: studentsResult.rows,
      activities: activitiesResult.rows
    })

  } catch (error) {
    console.error('Get session error:', error)
    res.status(500).json({ message: 'Failed to get session' })
  }
}

/**
 * End session
 * POST /api/sessions/:id/end
 * Protected: Teacher only
 */
export async function endSession(req, res) {
  try {
    const { id } = req.params
    const teacherId = req.user.userId

    // Verify teacher owns this session
    const check = await db.query(
      'SELECT id FROM sessions WHERE id = $1 AND teacher_id = $2',
      [id, teacherId]
    )

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' })
    }

    // Update session
    const result = await db.query(
      `UPDATE sessions
       SET status = 'ended', ended_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    )

    // Log analytics
    await db.query(
      `INSERT INTO analytics_events (event_type, user_id, session_id)
       VALUES ($1, $2, $3)`,
      ['session_ended', teacherId, id]
    )

    res.json({
      session: result.rows[0],
      message: 'Session ended successfully'
    })

  } catch (error) {
    console.error('End session error:', error)
    res.status(500).json({ message: 'Failed to end session' })
  }
}

/**
 * Reactivate ended session
 * POST /api/sessions/:id/reactivate
 * Protected: Teacher only
 */
export async function reactivateSession(req, res) {
  try {
    const { id } = req.params
    const teacherId = req.user.userId

    // Verify teacher owns this session
    const check = await db.query(
      'SELECT id, status FROM sessions WHERE id = $1 AND teacher_id = $2',
      [id, teacherId]
    )

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' })
    }

    if (check.rows[0].status === 'active') {
      return res.status(400).json({ message: 'Session is already active' })
    }

    // Reactivate session
    const result = await db.query(
      `UPDATE sessions
       SET status = 'active', ended_at = NULL
       WHERE id = $1
       RETURNING *`,
      [id]
    )

    // Log analytics
    await db.query(
      `INSERT INTO analytics_events (event_type, user_id, session_id)
       VALUES ($1, $2, $3)`,
      ['session_reactivated', teacherId, id]
    )

    res.json({
      session: result.rows[0],
      message: 'Session reactivated successfully'
    })

  } catch (error) {
    console.error('Reactivate session error:', error)
    res.status(500).json({ message: 'Failed to reactivate session' })
  }
}

/**
 * Delete session
 * DELETE /api/sessions/:id
 * Protected: Teacher only
 */
export async function deleteSession(req, res) {
  try {
    const { id } = req.params
    const teacherId = req.user.userId

    // Verify teacher owns this session
    const check = await db.query(
      'SELECT id FROM sessions WHERE id = $1 AND teacher_id = $2',
      [id, teacherId]
    )

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' })
    }

    // Log analytics before deletion
    await db.query(
      `INSERT INTO analytics_events (event_type, user_id, session_id)
       VALUES ($1, $2, $3)`,
      ['session_deleted', teacherId, id]
    )

    // Delete session (cascade will handle related data)
    await db.query(
      'DELETE FROM sessions WHERE id = $1',
      [id]
    )

    res.json({
      message: 'Session deleted successfully'
    })

  } catch (error) {
    console.error('Delete session error:', error)
    res.status(500).json({ message: 'Failed to delete session' })
  }
}

/**
 * Join session as student
 * POST /api/sessions/join
 * Body: { joinCode, studentName, deviceType }
 * Public: No authentication required
 */
export async function joinSession(req, res) {
  try {
    const { joinCode, studentName, deviceType } = req.body

    // Validation
    if (!joinCode || !studentName) {
      return res.status(400).json({
        message: 'Join code and student name are required'
      })
    }

    if (!isValidJoinCode(joinCode)) {
      return res.status(400).json({
        message: 'Invalid join code format'
      })
    }

    // Find active session
    const sessionResult = await db.query(
      `SELECT id, title, subject, teacher_id
       FROM sessions
       WHERE join_code = $1 AND status = 'active'`,
      [joinCode.toUpperCase()]
    )

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Session not found or has ended'
      })
    }

    const session = sessionResult.rows[0]

    // Add student to session
    const result = await db.query(
      `INSERT INTO session_students (session_id, student_name, device_type, current_screen_state)
       VALUES ($1, $2, $3, 'free')
       RETURNING id, session_id, student_name, device_type, joined_at`,
      [session.id, studentName, deviceType || 'unknown']
    )

    const student = result.rows[0]

    // Log analytics
    await db.query(
      `INSERT INTO analytics_events (event_type, session_id, properties)
       VALUES ($1, $2, $3)`,
      ['student_joined', session.id, JSON.stringify({ deviceType, studentName })]
    )

    res.json({
      session: {
        id: session.id,
        title: session.title,
        subject: session.subject
      },
      student,
      message: 'Joined session successfully'
    })

  } catch (error) {
    console.error('Join session error:', error)
    res.status(500).json({ message: 'Failed to join session' })
  }
}

/**
 * Get all sessions for teacher
 * GET /api/sessions
 * Protected: Teacher only
 */
export async function getTeacherSessions(req, res) {
  try {
    const teacherId = req.user.userId
    const { status } = req.query // Filter by status (active/ended)

    let query = `
      SELECT s.*,
             (SELECT COUNT(*) FROM session_students WHERE session_id = s.id) as student_count,
             (SELECT COUNT(*) FROM activities WHERE session_id = s.id) as activity_count
      FROM sessions s
      WHERE s.teacher_id = $1
    `

    const params = [teacherId]

    if (status) {
      query += ' AND s.status = $2'
      params.push(status)
    }

    query += ' ORDER BY s.created_at DESC LIMIT 50'

    const result = await db.query(query, params)

    res.json({
      sessions: result.rows
    })

  } catch (error) {
    console.error('Get teacher sessions error:', error)
    res.status(500).json({ message: 'Failed to get sessions' })
  }
}
