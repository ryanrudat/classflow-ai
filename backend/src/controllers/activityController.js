import db from '../database/db.js'
import { generateContent } from '../services/aiService.js'

/**
 * Generate new activity using AI
 * POST /api/ai/generate
 * Body: { sessionId, prompt, type, subject, difficulty, length, count }
 * Protected: Teacher only
 */
export async function generateActivity(req, res) {
  try {
    const {
      sessionId,
      prompt,
      type = 'reading',
      subject = 'English',
      difficulty = 'medium',
      length,
      count
    } = req.body

    const teacherId = req.user.userId

    // Validation
    if (!sessionId || !prompt) {
      return res.status(400).json({
        message: 'Session ID and prompt are required'
      })
    }

    // Verify teacher owns this session
    const sessionCheck = await db.query(
      'SELECT id FROM sessions WHERE id = $1 AND teacher_id = $2 AND status = $3',
      [sessionId, teacherId, 'active']
    )

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({
        message: 'Session not found or not active'
      })
    }

    // Generate content with AI
    const startTime = Date.now()

    const aiResult = await generateContent(prompt, {
      type,
      subject,
      difficulty,
      length,
      count
    })

    const generationTime = Date.now() - startTime

    // Save activity to database
    const result = await db.query(
      `INSERT INTO activities (
        session_id,
        type,
        prompt,
        ai_generated,
        generation_time_ms,
        cached,
        content,
        difficulty_level,
        pushed_to
      )
      VALUES ($1, $2, $3, true, $4, $5, $6, $7, 'none')
      RETURNING *`,
      [
        sessionId,
        type,
        prompt,
        generationTime,
        aiResult.cached,
        JSON.stringify(aiResult.content),
        difficulty
      ]
    )

    const activity = result.rows[0]

    // Log analytics
    await db.query(
      `INSERT INTO analytics_events (event_type, user_id, session_id, properties)
       VALUES ($1, $2, $3, $4)`,
      [
        'ai_content_generated',
        teacherId,
        sessionId,
        JSON.stringify({
          type,
          subject,
          difficulty,
          cached: aiResult.cached,
          generationTime
        })
      ]
    )

    res.json({
      activity: {
        ...activity,
        content: aiResult.content // Return parsed content, not stringified
      },
      metadata: {
        cached: aiResult.cached,
        generationTime: aiResult.generationTime,
        model: aiResult.model
      },
      message: 'Activity generated successfully'
    })

  } catch (error) {
    console.error('Generate activity error:', error)
    res.status(500).json({
      message: `Failed to generate activity: ${error.message}`
    })
  }
}

/**
 * Push activity to students
 * POST /api/activities/:activityId/push
 * Body: { target, studentIds }
 * Protected: Teacher only
 */
export async function pushActivity(req, res) {
  try {
    const { activityId } = req.params
    const { target = 'all', studentIds = [] } = req.body
    const teacherId = req.user.userId

    // Get activity and verify ownership
    const activityResult = await db.query(
      `SELECT a.*, s.teacher_id
       FROM activities a
       JOIN sessions s ON a.session_id = s.id
       WHERE a.id = $1`,
      [activityId]
    )

    if (activityResult.rows.length === 0) {
      return res.status(404).json({ message: 'Activity not found' })
    }

    const activity = activityResult.rows[0]

    if (activity.teacher_id !== teacherId) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    // Determine target students
    let targetStudentIds = []

    if (target === 'all') {
      // Get all students in session
      const studentsResult = await db.query(
        'SELECT id FROM session_students WHERE session_id = $1',
        [activity.session_id]
      )
      targetStudentIds = studentsResult.rows.map(row => row.id)

    } else if (target === 'specific' && studentIds.length > 0) {
      targetStudentIds = studentIds

    } else if (target === 'struggling') {
      // Get students with <50% correct rate
      // TODO: Week 2 - Implement performance tracking
      const studentsResult = await db.query(
        `SELECT DISTINCT ss.id
         FROM session_students ss
         LEFT JOIN student_responses sr ON sr.student_id = ss.id
         WHERE ss.session_id = $1
         GROUP BY ss.id
         HAVING (
           COUNT(CASE WHEN sr.is_correct = false THEN 1 END)::float /
           NULLIF(COUNT(sr.id), 0)
         ) > 0.5 OR COUNT(sr.id) = 0`,
        [activity.session_id]
      )
      targetStudentIds = studentsResult.rows.map(row => row.id)

    } else if (target === 'advanced') {
      // Get students with >80% correct rate
      const studentsResult = await db.query(
        `SELECT DISTINCT ss.id
         FROM session_students ss
         LEFT JOIN student_responses sr ON sr.student_id = ss.id
         WHERE ss.session_id = $1
         GROUP BY ss.id
         HAVING (
           COUNT(CASE WHEN sr.is_correct = true THEN 1 END)::float /
           NULLIF(COUNT(sr.id), 0)
         ) > 0.8`,
        [activity.session_id]
      )
      targetStudentIds = studentsResult.rows.map(row => row.id)
    }

    // Update activity with push info
    await db.query(
      `UPDATE activities
       SET pushed_to = $1, specific_student_ids = $2
       WHERE id = $3`,
      [target, targetStudentIds, activityId]
    )

    // Log analytics
    await db.query(
      `INSERT INTO analytics_events (event_type, user_id, session_id, properties)
       VALUES ($1, $2, $3, $4)`,
      [
        'activity_pushed',
        teacherId,
        activity.session_id,
        JSON.stringify({ target, studentCount: targetStudentIds.length })
      ]
    )

    // TODO: Week 2 - Emit WebSocket event to students
    // io.to(`session-${activity.session_id}`).emit('activity-pushed', {
    //   activity,
    //   targetStudentIds
    // })

    res.json({
      message: 'Activity pushed successfully',
      pushedTo: target,
      studentCount: targetStudentIds.length,
      studentIds: targetStudentIds
    })

  } catch (error) {
    console.error('Push activity error:', error)
    res.status(500).json({ message: 'Failed to push activity' })
  }
}

/**
 * Submit student response
 * POST /api/activities/:activityId/respond
 * Body: { studentId, response }
 * Public: No auth required
 */
export async function submitResponse(req, res) {
  try {
    const { activityId } = req.params
    const { studentId, response } = req.body

    // Validation
    if (!studentId || !response) {
      return res.status(400).json({
        message: 'Student ID and response are required'
      })
    }

    // Verify student exists in active session
    const studentCheck = await db.query(
      `SELECT ss.id, ss.session_id
       FROM session_students ss
       JOIN sessions s ON ss.session_id = s.id
       WHERE ss.id = $1 AND s.status = 'active'`,
      [studentId]
    )

    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found in active session' })
    }

    // Get activity
    const activityResult = await db.query(
      'SELECT * FROM activities WHERE id = $1',
      [activityId]
    )

    if (activityResult.rows.length === 0) {
      return res.status(404).json({ message: 'Activity not found' })
    }

    const activity = activityResult.rows[0]

    // Check if answer is correct (for multiple choice/quiz types)
    let isCorrect = null
    if (activity.type === 'quiz' || activity.type === 'questions') {
      // Parse activity content
      const content = typeof activity.content === 'string'
        ? JSON.parse(activity.content)
        : activity.content

      // Simple correctness check for multiple choice
      if (response.questionIndex !== undefined && response.selectedOption !== undefined) {
        const questions = content.questions || content.quiz || []
        const question = questions[response.questionIndex]
        if (question && question.correct !== undefined) {
          isCorrect = (response.selectedOption === question.correct)
        }
      }
    }

    // Save response
    const result = await db.query(
      `INSERT INTO student_responses (activity_id, student_id, response, is_correct, time_spent_seconds)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        activityId,
        studentId,
        JSON.stringify(response),
        isCorrect,
        response.timeSpent || null
      ]
    )

    // Log analytics
    await db.query(
      `INSERT INTO analytics_events (event_type, session_id, properties)
       VALUES ($1, $2, $3)`,
      [
        'student_response_submitted',
        studentCheck.rows[0].session_id,
        JSON.stringify({ activityType: activity.type, isCorrect })
      ]
    )

    // TODO: Week 2 - Emit WebSocket event to teacher
    // io.to(`session-${activity.session_id}`).emit('student-response', {
    //   studentId,
    //   activityId,
    //   isCorrect
    // })

    res.json({
      message: 'Response submitted successfully',
      isCorrect,
      feedback: isCorrect === true ? 'Correct!' : isCorrect === false ? 'Incorrect' : null
    })

  } catch (error) {
    console.error('Submit response error:', error)
    res.status(500).json({ message: 'Failed to submit response' })
  }
}

/**
 * Get activity with responses
 * GET /api/activities/:activityId
 * Protected: Teacher only
 */
export async function getActivity(req, res) {
  try {
    const { activityId } = req.params
    const teacherId = req.user.userId

    // Get activity and verify ownership
    const activityResult = await db.query(
      `SELECT a.*, s.teacher_id
       FROM activities a
       JOIN sessions s ON a.session_id = s.id
       WHERE a.id = $1`,
      [activityId]
    )

    if (activityResult.rows.length === 0) {
      return res.status(404).json({ message: 'Activity not found' })
    }

    const activity = activityResult.rows[0]

    if (activity.teacher_id !== teacherId) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    // Get responses
    const responsesResult = await db.query(
      `SELECT sr.*, ss.student_name
       FROM student_responses sr
       JOIN session_students ss ON sr.student_id = ss.id
       WHERE sr.activity_id = $1
       ORDER BY sr.created_at DESC`,
      [activityId]
    )

    res.json({
      activity: {
        ...activity,
        content: typeof activity.content === 'string'
          ? JSON.parse(activity.content)
          : activity.content
      },
      responses: responsesResult.rows
    })

  } catch (error) {
    console.error('Get activity error:', error)
    res.status(500).json({ message: 'Failed to get activity' })
  }
}

/**
 * Get all activities for a session
 * GET /api/sessions/:sessionId/activities
 * Protected: Teacher only
 */
export async function getSessionActivities(req, res) {
  try {
    const { sessionId } = req.params
    const teacherId = req.user.userId

    // Verify teacher owns this session
    const sessionCheck = await db.query(
      'SELECT id FROM sessions WHERE id = $1 AND teacher_id = $2',
      [sessionId, teacherId]
    )

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' })
    }

    // Get all activities for this session
    const activitiesResult = await db.query(
      `SELECT
        id,
        type,
        prompt,
        content,
        difficulty_level,
        pushed_to,
        created_at,
        ai_generated,
        cached,
        generation_time_ms
       FROM activities
       WHERE session_id = $1
       ORDER BY created_at DESC`,
      [sessionId]
    )

    // Parse content for each activity (only parse JSON types, not plain text)
    const activities = activitiesResult.rows.map(activity => {
      let parsedContent = activity.content

      // Only parse JSON for non-reading types
      if (typeof activity.content === 'string' && activity.type !== 'reading') {
        try {
          parsedContent = JSON.parse(activity.content)
        } catch (e) {
          // If parsing fails, keep as string
          parsedContent = activity.content
        }
      }

      return {
        ...activity,
        content: parsedContent
      }
    })

    res.json({
      activities,
      count: activities.length
    })

  } catch (error) {
    console.error('Get session activities error:', error)
    res.status(500).json({ message: 'Failed to get session activities' })
  }
}
