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

    // Update activity with push info and timestamp
    await db.query(
      `UPDATE activities
       SET pushed_to = $1, specific_student_ids = $2, pushed_at = NOW()
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
 * Update activity content
 * PUT /api/activities/:activityId/content
 * Body:
 *   - content: object (the updated activity content)
 */
export async function updateActivityContent(req, res) {
  try {
    const { activityId } = req.params
    const { content } = req.body
    const teacherId = req.user.userId

    if (!content) {
      return res.status(400).json({ message: 'Content is required' })
    }

    console.log('📝 Updating activity content:', activityId)

    // Verify activity exists and check ownership
    const activityCheck = await db.query(
      `SELECT a.id, s.teacher_id
       FROM activities a
       JOIN sessions s ON a.session_id = s.id
       WHERE a.id = $1`,
      [activityId]
    )

    if (activityCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Activity not found' })
    }

    if (activityCheck.rows[0].teacher_id !== teacherId) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    // Update the activity
    const result = await db.query(
      'UPDATE activities SET content = $1 WHERE id = $2 RETURNING *',
      [content, activityId]
    )

    console.log('✅ Activity content updated')

    res.json({
      success: true,
      activity: result.rows[0],
      message: 'Activity content updated successfully'
    })

  } catch (error) {
    console.error('Update activity content error:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update activity content'
    })
  }
}

/**
 * Get all activities for a session
 * GET /api/sessions/:sessionId/activities?pushedOnly=true
 * Protected: Teacher only
 */
export async function getSessionActivities(req, res) {
  try {
    const { sessionId } = req.params
    const { pushedOnly } = req.query
    const teacherId = req.user.userId

    // Verify teacher owns this session
    const sessionCheck = await db.query(
      'SELECT id FROM sessions WHERE id = $1 AND teacher_id = $2',
      [sessionId, teacherId]
    )

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' })
    }

    // Build query with optional filter for pushed activities
    let query = `SELECT
        id,
        type,
        prompt,
        content,
        difficulty_level,
        pushed_to,
        pushed_at,
        created_at,
        ai_generated,
        cached,
        generation_time_ms
       FROM activities
       WHERE session_id = $1`

    // Add filter for pushed activities if requested
    if (pushedOnly === 'true') {
      query += ` AND pushed_at IS NOT NULL`
    }

    query += ` ORDER BY created_at DESC`

    // Get all activities for this session
    const activitiesResult = await db.query(query, [sessionId])

    console.log(`📋 getSessionActivities for session ${sessionId}:`, {
      count: activitiesResult.rows.length,
      pushedOnly,
      types: activitiesResult.rows.map(a => a.type)
    })

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

/**
 * Submit individual question response with metadata
 * POST /api/activities/:activityId/submit-question
 * Body: { studentId, sessionId, questionNumber, selectedAnswer, isCorrect, attemptNumber, helpReceived, timeSpent }
 * Public: No auth required (students)
 */
export async function submitQuestionResponse(req, res) {
  try {
    const { activityId } = req.params
    const {
      studentId,
      sessionId,
      questionNumber,
      selectedAnswer,
      isCorrect,
      attemptNumber = 1,
      helpReceived = false,
      timeSpent = 0
    } = req.body

    // Validation
    if (!studentId || !sessionId || questionNumber === undefined) {
      return res.status(400).json({
        message: 'Student ID, session ID, and question number are required'
      })
    }

    // Get student info (check if authenticated)
    const studentCheck = await db.query(
      `SELECT ss.student_account_id, ss.instance_id
       FROM session_students ss
       WHERE ss.id = $1`,
      [studentId]
    )

    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' })
    }

    const studentAccountId = studentCheck.rows[0].student_account_id
    const instanceId = studentCheck.rows[0].instance_id

    // If student is authenticated, check completion status
    if (studentAccountId) {
      const completionCheck = await db.query(
        `SELECT status, locked_at
         FROM activity_completions
         WHERE student_account_id = $1
           AND activity_id = $2
           AND instance_id = $3`,
        [studentAccountId, activityId, instanceId]
      )

      if (completionCheck.rows.length > 0 && completionCheck.rows[0].status === 'locked') {
        return res.status(403).json({
          message: 'This activity has been completed and locked. Contact your teacher to unlock for retakes.',
          locked: true,
          lockedAt: completionCheck.rows[0].locked_at
        })
      }
    }

    // Save question response with all metadata
    const result = await db.query(
      `INSERT INTO student_responses (
        activity_id,
        student_id,
        session_id,
        question_number,
        is_correct,
        attempt_number,
        help_received,
        time_spent_seconds,
        response
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        activityId,
        studentId,
        sessionId,
        questionNumber,
        isCorrect,
        attemptNumber,
        helpReceived,
        timeSpent,
        JSON.stringify({ selectedAnswer, questionNumber })
      ]
    )

    // If authenticated, update activity completion tracking
    if (studentAccountId) {
      // Get activity details to know total questions
      const activityResult = await db.query(
        `SELECT content FROM activities WHERE id = $1`,
        [activityId]
      )

      if (activityResult.rows.length > 0) {
        const content = typeof activityResult.rows[0].content === 'string'
          ? JSON.parse(activityResult.rows[0].content)
          : activityResult.rows[0].content

        const totalQuestions = content?.questions?.length || content?.quiz?.length || 0

        // Get current progress for this student
        const progressResult = await db.query(
          `SELECT
             COUNT(DISTINCT sr.question_number) as questions_attempted,
             SUM(CASE WHEN sr.is_correct THEN 1 ELSE 0 END) as questions_correct,
             SUM(sr.time_spent_seconds) as total_time
           FROM student_responses sr
           WHERE sr.student_id = $1
             AND sr.activity_id = $2
             AND sr.session_id = $3`,
          [studentId, activityId, sessionId]
        )

        const progress = progressResult.rows[0]
        const questionsAttempted = parseInt(progress.questions_attempted) || 0
        const questionsCorrect = parseInt(progress.questions_correct) || 0
        const totalTime = parseInt(progress.total_time) || 0
        const scorePercentage = questionsAttempted > 0
          ? Math.round((questionsCorrect / questionsAttempted) * 100)
          : 0

        // Determine if activity is complete
        const isComplete = questionsAttempted >= totalQuestions && totalQuestions > 0
        const newStatus = isComplete ? 'locked' : 'in_progress'

        // Upsert completion record
        await db.query(
          `INSERT INTO activity_completions (
             student_account_id,
             activity_id,
             session_id,
             instance_id,
             status,
             questions_attempted,
             questions_correct,
             score_percentage,
             time_spent_seconds,
             completed_at,
             locked_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (student_account_id, activity_id, instance_id)
           DO UPDATE SET
             questions_attempted = $6,
             questions_correct = $7,
             score_percentage = $8,
             time_spent_seconds = $9,
             status = $5,
             completed_at = CASE WHEN $5 = 'locked' THEN NOW() ELSE activity_completions.completed_at END,
             locked_at = CASE WHEN $5 = 'locked' THEN NOW() ELSE activity_completions.locked_at END`,
          [
            studentAccountId,
            activityId,
            sessionId,
            instanceId,
            newStatus,
            questionsAttempted,
            questionsCorrect,
            scorePercentage,
            totalTime,
            isComplete ? new Date() : null,
            isComplete ? new Date() : null
          ]
        )

        // Log completion event if activity was just completed
        if (isComplete) {
          await db.query(
            `INSERT INTO analytics_events (event_type, session_id, properties)
             VALUES ($1, $2, $3)`,
            [
              'activity_completed',
              sessionId,
              JSON.stringify({
                activityId,
                studentAccountId,
                score: scorePercentage,
                timeSpent: totalTime
              })
            ]
          )
        }
      }
    }

    // Log analytics
    await db.query(
      `INSERT INTO analytics_events (event_type, session_id, properties)
       VALUES ($1, $2, $3)`,
      [
        'question_answered',
        sessionId,
        JSON.stringify({
          activityId,
          questionNumber,
          isCorrect,
          attemptNumber,
          helpReceived
        })
      ]
    )

    res.json({
      message: 'Question response saved successfully',
      response: result.rows[0]
    })

  } catch (error) {
    console.error('Submit question response error:', error)
    res.status(500).json({ message: 'Failed to save question response' })
  }
}

/**
 * Unlock completed activity for retakes (teacher only)
 * POST /api/activities/:activityId/unlock
 * Body: { studentAccountId, reason }
 * Protected: Teacher only
 */
export async function unlockActivity(req, res) {
  try {
    const { activityId } = req.params
    const { studentAccountId, reason } = req.body
    const teacherId = req.user.userId

    // Validation
    if (!studentAccountId) {
      return res.status(400).json({
        message: 'Student account ID is required'
      })
    }

    // Verify activity belongs to teacher's session
    const activityCheck = await db.query(
      `SELECT a.session_id, s.teacher_id
       FROM activities a
       JOIN sessions s ON a.session_id = s.id
       WHERE a.id = $1`,
      [activityId]
    )

    if (activityCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Activity not found' })
    }

    if (activityCheck.rows[0].teacher_id !== teacherId) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    // Unlock the activity by setting status to 'in_progress' and logging unlock info
    const result = await db.query(
      `UPDATE activity_completions
       SET status = 'in_progress',
           unlocked_by = $1,
           unlocked_at = NOW(),
           unlock_reason = $2,
           locked_at = NULL
       WHERE activity_id = $3
         AND student_account_id = $4
       RETURNING *`,
      [teacherId, reason || 'Teacher unlocked for retake', activityId, studentAccountId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'No completion record found for this student and activity'
      })
    }

    // Log analytics
    await db.query(
      `INSERT INTO analytics_events (event_type, user_id, session_id, properties)
       VALUES ($1, $2, $3, $4)`,
      [
        'activity_unlocked',
        teacherId,
        activityCheck.rows[0].session_id,
        JSON.stringify({
          activityId,
          studentAccountId,
          reason: reason || 'Teacher unlocked for retake'
        })
      ]
    )

    res.json({
      message: 'Activity unlocked successfully',
      completion: result.rows[0]
    })

  } catch (error) {
    console.error('Unlock activity error:', error)
    res.status(500).json({ message: 'Failed to unlock activity' })
  }
}

/**
 * Get completion status for a student (teacher view)
 * GET /api/activities/completions/:studentAccountId?sessionId=xxx
 * Protected: Teacher only
 */
export async function getStudentCompletions(req, res) {
  try {
    const { studentAccountId } = req.params
    const { sessionId } = req.query
    const teacherId = req.user.userId

    // Verify teacher owns the session
    if (sessionId) {
      const sessionCheck = await db.query(
        'SELECT id FROM sessions WHERE id = $1 AND teacher_id = $2',
        [sessionId, teacherId]
      )

      if (sessionCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Session not found' })
      }
    }

    // Get completions with activity details
    let query = `
      SELECT
        ac.*,
        a.type as activity_type,
        a.prompt as activity_name,
        a.content as activity_content,
        u.name as unlocked_by_name
      FROM activity_completions ac
      JOIN activities a ON ac.activity_id = a.id
      LEFT JOIN users u ON ac.unlocked_by = u.id
      WHERE ac.student_account_id = $1
    `

    const params = [studentAccountId]

    if (sessionId) {
      query += ' AND ac.session_id = $2'
      params.push(sessionId)
    }

    query += ' ORDER BY ac.started_at DESC'

    const result = await db.query(query, params)

    res.json({
      completions: result.rows
    })

  } catch (error) {
    console.error('Get student completions error:', error)
    res.status(500).json({ message: 'Failed to get student completions' })
  }
}

/**
 * Delete an activity
 * DELETE /api/activities/:activityId
 * Protected: Teacher only (must own the session)
 */
export async function deleteActivity(req, res) {
  try {
    const { activityId } = req.params
    const teacherId = req.user.userId

    // Verify activity exists and teacher owns the session
    const activityCheck = await db.query(
      `SELECT a.id, s.teacher_id
       FROM activities a
       JOIN sessions s ON a.session_id = s.id
       WHERE a.id = $1`,
      [activityId]
    )

    if (activityCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Activity not found' })
    }

    if (activityCheck.rows[0].teacher_id !== teacherId) {
      return res.status(403).json({ message: 'Not authorized to delete this activity' })
    }

    // Delete activity (cascade will handle related records)
    await db.query('DELETE FROM activities WHERE id = $1', [activityId])

    res.json({ message: 'Activity deleted successfully' })

  } catch (error) {
    console.error('Delete activity error:', error)
    res.status(500).json({ message: 'Failed to delete activity' })
  }
}
