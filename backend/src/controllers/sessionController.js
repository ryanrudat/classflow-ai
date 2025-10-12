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
 * Reactivate ended session (creates new instance for new class period)
 * POST /api/sessions/:id/reactivate
 * Body: { label } (optional - e.g., "Period 2", "Class B")
 * Protected: Teacher only
 */
export async function reactivateSession(req, res) {
  try {
    const { id } = req.params
    const { label } = req.body
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

    // Mark all existing instances as not current
    await db.query(
      'UPDATE session_instances SET is_current = false WHERE session_id = $1',
      [id]
    )

    // Get the next instance number
    const instanceCountResult = await db.query(
      'SELECT COALESCE(MAX(instance_number), 0) + 1 as next_number FROM session_instances WHERE session_id = $1',
      [id]
    )
    const nextInstanceNumber = instanceCountResult.rows[0].next_number

    // Create new instance
    const instanceResult = await db.query(
      `INSERT INTO session_instances (session_id, instance_number, label, is_current)
       VALUES ($1, $2, $3, true)
       RETURNING *`,
      [id, nextInstanceNumber, label || `Period ${nextInstanceNumber}`]
    )

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
      `INSERT INTO analytics_events (event_type, user_id, session_id, properties)
       VALUES ($1, $2, $3, $4)`,
      ['session_reactivated', teacherId, id, JSON.stringify({ instanceNumber: nextInstanceNumber, label: label || `Period ${nextInstanceNumber}` })]
    )

    res.json({
      session: result.rows[0],
      instance: instanceResult.rows[0],
      message: `Session reactivated for ${label || `Period ${nextInstanceNumber}`}`
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

    // Add student to session with current instance
    const result = await db.query(
      `INSERT INTO session_students (session_id, instance_id, student_name, device_type, current_screen_state)
       VALUES ($1, $2, $3, $4, 'free')
       RETURNING id, session_id, student_name, device_type, joined_at`,
      [session.id, currentInstanceId, studentName, deviceType || 'unknown']
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
 * GET /api/sessions/:sessionId/activities/:activityId/progress
 * Protected: Teacher only
 */
export async function getActivityProgress(req, res) {
  try {
    const { sessionId, activityId } = req.params
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

    // Get all students in session
    const studentsResult = await db.query(
      `SELECT ss.id, ss.student_name, ss.joined_at
       FROM session_students ss
       WHERE ss.session_id = $1
       ORDER BY ss.student_name ASC`,
      [sessionId]
    )

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
