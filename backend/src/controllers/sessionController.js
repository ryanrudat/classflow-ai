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

    // Create first instance for this session
    const instanceResult = await db.query(
      `INSERT INTO session_instances (session_id, instance_number, label, is_current)
       VALUES ($1, 1, 'Period 1', true)
       RETURNING *`,
      [session.id]
    )

    // Log analytics
    await db.query(
      `INSERT INTO analytics_events (event_type, user_id, session_id, properties)
       VALUES ($1, $2, $3, $4)`,
      ['session_created', teacherId, session.id, JSON.stringify({ subject, title })]
    )

    res.json({
      session,
      instance: instanceResult.rows[0],
      message: 'Session created successfully'
    })

  } catch (error) {
    console.error('Create session error:', error)
    res.status(500).json({ message: 'Failed to create session' })
  }
}

/**
 * Update session details (title and/or subject)
 * PUT /api/sessions/:id
 * Body: { title?, subject? }
 * Protected: Teacher only
 */
export async function updateSession(req, res) {
  try {
    const { id } = req.params
    const { title, subject } = req.body
    const teacherId = req.user.userId

    // Check session exists and belongs to teacher
    const checkResult = await db.query(
      'SELECT * FROM sessions WHERE id = $1 AND teacher_id = $2',
      [id, teacherId]
    )

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' })
    }

    // Validate subject if provided
    if (subject) {
      const validSubjects = ['English', 'History', 'Social Studies', 'Government', 'Biology']
      if (!validSubjects.includes(subject)) {
        return res.status(400).json({
          message: `Subject must be one of: ${validSubjects.join(', ')}`
        })
      }
    }

    // Build update query dynamically
    const updates = []
    const values = []
    let paramCount = 1

    if (title !== undefined) {
      if (!title || title.trim().length === 0) {
        return res.status(400).json({ message: 'Title cannot be empty' })
      }
      updates.push(`title = $${paramCount}`)
      values.push(title.trim())
      paramCount++
    }

    if (subject !== undefined) {
      updates.push(`subject = $${paramCount}`)
      values.push(subject)
      paramCount++
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' })
    }

    // Add session ID and execute update
    values.push(id)
    const result = await db.query(
      `UPDATE sessions SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    )

    res.json({
      session: result.rows[0],
      message: 'Session updated successfully'
    })

  } catch (error) {
    console.error('Update session error:', error)
    res.status(500).json({ message: 'Failed to update session' })
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
 * Get students in a session (current period only)
 * GET /api/sessions/:id/students
 * Protected: Teacher only
 */
export async function getSessionStudents(req, res) {
  try {
    const { id } = req.params
    const teacherId = req.user.userId

    // Verify teacher owns this session
    const sessionCheck = await db.query(
      'SELECT id FROM sessions WHERE id = $1 AND teacher_id = $2',
      [id, teacherId]
    )

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' })
    }

    // Get the current instance for this session
    const instanceResult = await db.query(
      `SELECT id FROM session_instances
       WHERE session_id = $1 AND is_current = true
       LIMIT 1`,
      [id]
    )

    if (instanceResult.rows.length === 0) {
      // No current instance - return empty list
      return res.json({ students: [] })
    }

    const currentInstanceId = instanceResult.rows[0].id

    // Get students in current period only
    const studentsResult = await db.query(
      `SELECT id, student_name, device_type, current_screen_state, joined_at, last_active, instance_id
       FROM session_students
       WHERE session_id = $1 AND instance_id = $2
       ORDER BY student_name ASC`,
      [id, currentInstanceId]
    )

    res.json({
      students: studentsResult.rows
    })

  } catch (error) {
    console.error('Get session students error:', error)
    res.status(500).json({ message: 'Failed to get session students' })
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

    // Count active reverse tutoring conversations
    const activeConversations = await db.query(
      `SELECT COUNT(*) as count
       FROM reverse_tutoring_conversations
       WHERE session_id = $1 AND completed_at IS NULL`,
      [id]
    )

    const activeStudentCount = parseInt(activeConversations.rows[0].count)

    // Set grace period: 2 minutes from now
    const gracePeriodEnds = new Date(Date.now() + 2 * 60 * 1000)

    // Update session with grace period
    const result = await db.query(
      `UPDATE sessions
       SET status = 'ended',
           ended_at = NOW(),
           grace_period_ends_at = $2
       WHERE id = $1
       RETURNING *`,
      [id, gracePeriodEnds]
    )

    // End the current session instance
    await db.query(
      `UPDATE session_instances
       SET is_current = false, ended_at = NOW()
       WHERE session_id = $1 AND is_current = true`,
      [id]
    )

    // Log analytics
    await db.query(
      `INSERT INTO analytics_events (event_type, user_id, session_id, properties)
       VALUES ($1, $2, $3, $4)`,
      ['session_ended', teacherId, id, JSON.stringify({
        activeStudentsAtEnd: activeStudentCount,
        gracePeriodMinutes: 2
      })]
    )

    // Emit WebSocket event to all students
    const io = req.app.get('io')
    if (io) {
      io.to(id).emit('session-status-changed', {
        status: 'ended',
        gracePeriodEndsAt: gracePeriodEnds,
        message: 'Teacher has ended the session. You have 2 minutes to finish your current thought.',
        activeStudentCount
      })
    }

    res.json({
      session: result.rows[0],
      message: 'Session ended successfully',
      gracePeriodEndsAt: gracePeriodEnds,
      activeStudentCount
    })

  } catch (error) {
    console.error('End session error:', error)
    res.status(500).json({ message: 'Failed to end session' })
  }
}

/**
 * Pause session (temporary break)
 * POST /api/sessions/:id/pause
 * Protected: Teacher only
 */
export async function pauseSession(req, res) {
  try {
    const { id } = req.params
    const teacherId = req.user.userId

    // Verify teacher owns this session and it's active
    const check = await db.query(
      'SELECT id, status FROM sessions WHERE id = $1 AND teacher_id = $2',
      [id, teacherId]
    )

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' })
    }

    if (check.rows[0].status !== 'active') {
      return res.status(400).json({ message: 'Can only pause an active session' })
    }

    // Count active reverse tutoring conversations
    const activeConversations = await db.query(
      `SELECT COUNT(*) as count
       FROM reverse_tutoring_conversations
       WHERE session_id = $1 AND completed_at IS NULL`,
      [id]
    )

    const activeStudentCount = parseInt(activeConversations.rows[0].count)

    // Set grace period: 2 minutes from now
    const gracePeriodEnds = new Date(Date.now() + 2 * 60 * 1000)

    // Update session to paused with grace period
    const result = await db.query(
      `UPDATE sessions
       SET status = 'paused',
           paused_at = NOW(),
           grace_period_ends_at = $2
       WHERE id = $1
       RETURNING *`,
      [id, gracePeriodEnds]
    )

    // Log analytics
    await db.query(
      `INSERT INTO analytics_events (event_type, user_id, session_id, properties)
       VALUES ($1, $2, $3, $4)`,
      ['session_paused', teacherId, id, JSON.stringify({
        activeStudentsAtPause: activeStudentCount,
        gracePeriodMinutes: 2
      })]
    )

    // Emit WebSocket event to all students
    const io = req.app.get('io')
    if (io) {
      io.to(id).emit('session-status-changed', {
        status: 'paused',
        gracePeriodEndsAt: gracePeriodEnds,
        message: 'Teacher has paused the session. You have 2 minutes to finish your current thought.',
        activeStudentCount
      })
    }

    res.json({
      session: result.rows[0],
      message: 'Session paused successfully',
      gracePeriodEndsAt: gracePeriodEnds,
      activeStudentCount
    })

  } catch (error) {
    console.error('Pause session error:', error)
    res.status(500).json({ message: 'Failed to pause session' })
  }
}

/**
 * Resume paused session
 * POST /api/sessions/:id/resume
 * Protected: Teacher only
 */
export async function resumeSession(req, res) {
  try {
    const { id } = req.params
    const teacherId = req.user.userId

    // Verify teacher owns this session and it's paused
    const check = await db.query(
      'SELECT id, status FROM sessions WHERE id = $1 AND teacher_id = $2',
      [id, teacherId]
    )

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' })
    }

    if (check.rows[0].status !== 'paused') {
      return res.status(400).json({ message: 'Can only resume a paused session' })
    }

    // Resume session (clear pause and grace period)
    const result = await db.query(
      `UPDATE sessions
       SET status = 'active',
           paused_at = NULL,
           grace_period_ends_at = NULL
       WHERE id = $1
       RETURNING *`,
      [id]
    )

    // Log analytics
    await db.query(
      `INSERT INTO analytics_events (event_type, user_id, session_id)
       VALUES ($1, $2, $3)`,
      ['session_resumed', teacherId, id]
    )

    // Emit WebSocket event to all students
    const io = req.app.get('io')
    if (io) {
      io.to(id).emit('session-status-changed', {
        status: 'active',
        message: 'Teacher has resumed the session. You can continue your conversation.'
      })
    }

    res.json({
      session: result.rows[0],
      message: 'Session resumed successfully'
    })

  } catch (error) {
    console.error('Resume session error:', error)
    res.status(500).json({ message: 'Failed to resume session' })
  }
}

/**
 * Reactivate ended session (resume existing period or create new one)
 * POST /api/sessions/:id/reactivate
 * Body: { resumeInstanceId, label } (optional)
 *   - If resumeInstanceId provided: Resume that period
 *   - Otherwise: Create new period with optional label
 * Protected: Teacher only
 */
export async function reactivateSession(req, res) {
  try {
    const { id } = req.params
    const { resumeInstanceId, label } = req.body
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

    let instanceResult

    // Mark all existing instances as not current first
    await db.query(
      'UPDATE session_instances SET is_current = false WHERE session_id = $1',
      [id]
    )

    if (resumeInstanceId) {
      // RESUME MODE: Verify instance exists and belongs to this session
      const instanceCheck = await db.query(
        'SELECT * FROM session_instances WHERE id = $1 AND session_id = $2',
        [resumeInstanceId, id]
      )

      if (instanceCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Instance not found' })
      }

      // Mark the existing instance as current
      instanceResult = await db.query(
        'UPDATE session_instances SET is_current = true WHERE id = $1 RETURNING *',
        [resumeInstanceId]
      )

      // Log analytics for resume
      await db.query(
        `INSERT INTO analytics_events (event_type, user_id, session_id, properties)
         VALUES ($1, $2, $3, $4)`,
        ['session_resumed', teacherId, id, JSON.stringify({
          instanceId: resumeInstanceId,
          instanceNumber: instanceResult.rows[0].instance_number,
          label: instanceResult.rows[0].label
        })]
      )
    } else {
      // START NEW MODE: Get the next instance number
      const instanceCountResult = await db.query(
        'SELECT COALESCE(MAX(instance_number), 0) + 1 as next_number FROM session_instances WHERE session_id = $1',
        [id]
      )
      const nextInstanceNumber = instanceCountResult.rows[0].next_number

      // Create new instance
      instanceResult = await db.query(
        `INSERT INTO session_instances (session_id, instance_number, label, is_current)
         VALUES ($1, $2, $3, true)
         RETURNING *`,
        [id, nextInstanceNumber, label || `Period ${nextInstanceNumber}`]
      )

      // Log analytics for new period
      await db.query(
        `INSERT INTO analytics_events (event_type, user_id, session_id, properties)
         VALUES ($1, $2, $3, $4)`,
        ['session_reactivated', teacherId, id, JSON.stringify({
          instanceNumber: nextInstanceNumber,
          label: label || `Period ${nextInstanceNumber}`
        })]
      )
    }

    // Reactivate session (clear grace period and pause fields)
    const result = await db.query(
      `UPDATE sessions
       SET status = 'active',
           ended_at = NULL,
           paused_at = NULL,
           grace_period_ends_at = NULL
       WHERE id = $1
       RETURNING *`,
      [id]
    )

    const instance = instanceResult.rows[0]
    const action = resumeInstanceId ? 'resumed' : 'reactivated'

    res.json({
      session: result.rows[0],
      instance,
      message: `Session ${action} for ${instance.label}`
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
 * Public: No authentication required (but optional - see req.student from middleware)
 * If student is authenticated, links session_student to student_account_id
 */
export async function joinSession(req, res) {
  try {
    const { joinCode, studentName, deviceType } = req.body
    const studentAccountId = req.student?.studentId || null // From optional auth middleware

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

    // Get the current instance for this session
    const instanceResult = await db.query(
      `SELECT id FROM session_instances
       WHERE session_id = $1 AND is_current = true
       ORDER BY instance_number DESC
       LIMIT 1`,
      [session.id]
    )

    if (instanceResult.rows.length === 0) {
      return res.status(500).json({
        message: 'No active instance found for this session'
      })
    }

    const currentInstanceId = instanceResult.rows[0].id

    // If authenticated student, check if they already joined this instance
    if (studentAccountId) {
      const existingStudent = await db.query(
        `SELECT id, session_id, student_name, device_type, joined_at
         FROM session_students
         WHERE session_id = $1 AND instance_id = $2 AND student_account_id = $3`,
        [session.id, currentInstanceId, studentAccountId]
      )

      if (existingStudent.rows.length > 0) {
        // Student already joined this instance - return existing record
        return res.json({
          session: {
            id: session.id,
            title: session.title,
            subject: session.subject
          },
          student: existingStudent.rows[0],
          rejoined: true,
          message: 'Rejoined session successfully'
        })
      }
    }

    // Add student to session with current instance
    const result = await db.query(
      `INSERT INTO session_students (session_id, instance_id, student_name, device_type, current_screen_state, student_account_id)
       VALUES ($1, $2, $3, $4, 'free', $5)
       RETURNING id, session_id, student_name, device_type, joined_at`,
      [session.id, currentInstanceId, studentName, deviceType || 'unknown', studentAccountId]
    )

    const student = result.rows[0]

    // Log analytics
    await db.query(
      `INSERT INTO analytics_events (event_type, session_id, properties)
       VALUES ($1, $2, $3)`,
      ['student_joined', session.id, JSON.stringify({
        deviceType,
        studentName,
        authenticated: !!studentAccountId
      })]
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

    // Exclude Learning World sessions (those linked to world_sessions table)
    let query = `
      SELECT s.*,
             (SELECT COUNT(*) FROM session_students WHERE session_id = s.id) as student_count,
             (SELECT COUNT(*) FROM activities WHERE session_id = s.id) as activity_count
      FROM sessions s
      LEFT JOIN world_sessions ws ON ws.session_id = s.id
      WHERE s.teacher_id = $1
        AND ws.id IS NULL
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

/**
 * Get all instances for a session
 * GET /api/sessions/:id/instances
 * Protected: Teacher only
 */
export async function getSessionInstances(req, res) {
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

    // Get all instances with student counts
    const result = await db.query(
      `SELECT si.*,
              (SELECT COUNT(*) FROM session_students WHERE instance_id = si.id) as student_count
       FROM session_instances si
       WHERE si.session_id = $1
       ORDER BY si.instance_number ASC`,
      [id]
    )

    res.json({
      instances: result.rows
    })

  } catch (error) {
    console.error('Get session instances error:', error)
    res.status(500).json({ message: 'Failed to get session instances' })
  }
}

/**
 * Get specific instance details with students
 * GET /api/sessions/:sessionId/instances/:instanceId
 * Protected: Teacher only
 */
export async function getInstanceDetails(req, res) {
  try {
    const { sessionId, instanceId } = req.params
    const teacherId = req.user.userId

    // Verify teacher owns this session
    const check = await db.query(
      'SELECT id FROM sessions WHERE id = $1 AND teacher_id = $2',
      [sessionId, teacherId]
    )

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' })
    }

    // Get instance details
    const instanceResult = await db.query(
      'SELECT * FROM session_instances WHERE id = $1 AND session_id = $2',
      [instanceId, sessionId]
    )

    if (instanceResult.rows.length === 0) {
      return res.status(404).json({ message: 'Instance not found' })
    }

    // Get students for this instance
    const studentsResult = await db.query(
      `SELECT id, student_name, device_type, current_screen_state, joined_at, last_active
       FROM session_students
       WHERE instance_id = $1
       ORDER BY joined_at DESC`,
      [instanceId]
    )

    res.json({
      instance: instanceResult.rows[0],
      students: studentsResult.rows
    })

  } catch (error) {
    console.error('Get instance details error:', error)
    res.status(500).json({ message: 'Failed to get instance details' })
  }
}

/**
 * Get live student progress for an activity
 * GET /api/sessions/:sessionId/activities/:activityId/progress?instanceId=xxx
 * Protected: Teacher only
 */
export async function getActivityProgress(req, res) {
  try {
    const { sessionId, activityId } = req.params
    const { instanceId } = req.query // Optional - filter by specific instance
    const teacherId = req.user.userId

    // Verify teacher owns this session
    const sessionCheck = await db.query(
      'SELECT id FROM sessions WHERE id = $1 AND teacher_id = $2',
      [sessionId, teacherId]
    )

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' })
    }

    // Verify activity belongs to this session
    const activityCheck = await db.query(
      'SELECT id, type, content FROM activities WHERE id = $1 AND session_id = $2',
      [activityId, sessionId]
    )

    if (activityCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Activity not found' })
    }

    const activity = activityCheck.rows[0]
    const totalQuestions = activity.content?.questions?.length || activity.content?.quiz?.length || 0

    // Get students in session - filter by instance if provided
    let studentsQuery = `
      SELECT ss.id, ss.student_name, ss.joined_at, ss.instance_id
      FROM session_students ss
      WHERE ss.session_id = $1
    `
    const queryParams = [sessionId]

    if (instanceId) {
      studentsQuery += ' AND ss.instance_id = $2'
      queryParams.push(instanceId)
    }

    studentsQuery += ' ORDER BY ss.student_name ASC'

    const studentsResult = await db.query(studentsQuery, queryParams)

    // Get detailed progress for each student
    const progressPromises = studentsResult.rows.map(async (student) => {
      // Get all responses for this student and activity
      const responsesResult = await db.query(
        `SELECT
          sr.id,
          sr.question_number,
          sr.is_correct,
          sr.attempt_number,
          sr.help_received,
          sr.time_spent_seconds,
          sr.response,
          sr.created_at
         FROM student_responses sr
         WHERE sr.student_id = $1
           AND sr.activity_id = $2
           AND sr.session_id = $3
         ORDER BY sr.question_number ASC, sr.attempt_number ASC`,
        [student.id, activityId, sessionId]
      )

      // Group responses by question number (to get latest attempt for each question)
      const questionProgress = {}
      let correctCount = 0
      let totalAttempts = 0
      let helpRequestCount = 0

      responsesResult.rows.forEach(response => {
        const qNum = response.question_number

        // Track attempts across all questions
        totalAttempts++

        // Track help requests
        if (response.help_received) {
          helpRequestCount++
        }

        // Keep track of the latest status for each question
        if (!questionProgress[qNum] || response.attempt_number > questionProgress[qNum].attempt_number) {
          questionProgress[qNum] = {
            questionNumber: qNum,
            isCorrect: response.is_correct,
            attemptNumber: response.attempt_number,
            helpReceived: response.help_received,
            timeSpent: response.time_spent_seconds,
            lastAttemptAt: response.created_at
          }
        }
      })

      // Count correct answers (latest attempt for each question)
      Object.values(questionProgress).forEach(q => {
        if (q.isCorrect) correctCount++
      })

      const questionsAttempted = Object.keys(questionProgress).length
      const currentQuestion = questionsAttempted < totalQuestions ? questionsAttempted + 1 : totalQuestions
      const isComplete = questionsAttempted >= totalQuestions
      const score = totalQuestions > 0 ? Math.round((correctCount / questionsAttempted) * 100) || 0 : 0

      // Determine status
      let status = 'active'
      if (isComplete) {
        status = 'completed'
      } else if (helpRequestCount > 0) {
        status = 'needs-help'
      } else if (totalAttempts > questionsAttempted * 1.5) {
        status = 'struggling'
      }

      // Calculate time elapsed (from first response to last)
      let timeElapsed = 0
      if (responsesResult.rows.length > 0) {
        const firstResponse = responsesResult.rows[0].created_at
        const lastResponse = responsesResult.rows[responsesResult.rows.length - 1].created_at
        timeElapsed = Math.round((new Date(lastResponse) - new Date(firstResponse)) / 1000)
      }

      return {
        studentId: student.id,
        studentName: student.student_name,
        currentQuestion,
        questionsAttempted,
        totalQuestions,
        correctCount,
        score,
        totalAttempts,
        helpRequestCount,
        status,
        timeElapsed,
        isComplete,
        questionProgress: Object.values(questionProgress)
      }
    })

    const studentProgress = await Promise.all(progressPromises)

    res.json({
      activityId,
      totalQuestions,
      studentProgress
    })

  } catch (error) {
    console.error('Get activity progress error:', error)
    res.status(500).json({ message: 'Failed to get activity progress' })
  }
}

/**
 * Export grades for a session as CSV
 * GET /api/sessions/:sessionId/export-grades?instanceId=xxx&format=csv
 * Protected: Teacher only
 */
export async function exportGrades(req, res) {
  try {
    const { sessionId } = req.params
    const { instanceId, format = 'csv' } = req.query
    const teacherId = req.user.userId

    // Verify teacher owns this session
    const sessionCheck = await db.query(
      'SELECT id, title FROM sessions WHERE id = $1 AND teacher_id = $2',
      [sessionId, teacherId]
    )

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' })
    }

    const session = sessionCheck.rows[0]

    // Build query to get all student responses
    let query = `
      SELECT
        ss.student_name,
        si.label as period,
        a.type as activity_type,
        a.prompt as activity_name,
        COUNT(DISTINCT sr.question_number) as questions_attempted,
        SUM(CASE WHEN sr.is_correct THEN 1 ELSE 0 END) as questions_correct,
        COUNT(*) as total_attempts,
        ROUND(AVG(CASE WHEN sr.is_correct THEN 100 ELSE 0 END)) as score,
        SUM(sr.time_spent_seconds) as total_time_seconds,
        MAX(sr.created_at) as last_activity
      FROM session_students ss
      JOIN session_instances si ON ss.instance_id = si.id
      LEFT JOIN student_responses sr ON sr.student_id = ss.id AND sr.session_id = ss.session_id
      LEFT JOIN activities a ON sr.activity_id = a.id
      WHERE ss.session_id = $1
    `

    const params = [sessionId]

    if (instanceId) {
      query += ' AND ss.instance_id = $2'
      params.push(instanceId)
    }

    query += `
      GROUP BY ss.id, ss.student_name, si.label, a.id, a.type, a.prompt
      HAVING COUNT(DISTINCT sr.question_number) > 0
      ORDER BY ss.student_name ASC, a.created_at ASC
    `

    const result = await db.query(query, params)

    // Format as CSV
    if (format === 'csv') {
      // CSV Header
      const csvHeader = 'Student Name,Period,Activity Type,Activity Name,Questions Attempted,Questions Correct,Score (%),Total Attempts,Time Spent (min),Last Activity\n'

      // CSV Rows
      const csvRows = result.rows.map(row => {
        const timeMinutes = Math.round(row.total_time_seconds / 60) || 0
        const lastActivity = row.last_activity ? new Date(row.last_activity).toLocaleString() : 'N/A'

        return [
          `"${row.student_name}"`,
          `"${row.period || 'N/A'}"`,
          `"${row.activity_type || 'N/A'}"`,
          `"${row.activity_name || 'N/A'}"`,
          row.questions_attempted || 0,
          row.questions_correct || 0,
          row.score || 0,
          row.total_attempts || 0,
          timeMinutes,
          `"${lastActivity}"`
        ].join(',')
      }).join('\n')

      const csv = csvHeader + csvRows

      // Set headers for CSV download
      const filename = instanceId
        ? `${session.title}_Period_${instanceId}_Grades.csv`
        : `${session.title}_All_Periods_Grades.csv`

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.send(csv)
    } else {
      // Return JSON format
      res.json({
        session: session.title,
        instanceId: instanceId || 'all',
        grades: result.rows
      })
    }

  } catch (error) {
    console.error('Export grades error:', error)
    res.status(500).json({ message: 'Failed to export grades' })
  }
}
