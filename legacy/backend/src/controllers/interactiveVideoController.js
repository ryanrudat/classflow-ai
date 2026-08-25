import db from '../database/db.js'

/**
 * Create an interactive video activity
 * POST /api/sessions/:sessionId/activities/interactive-video
 */
export async function createInteractiveVideoActivity(req, res) {
  try {
    const { sessionId } = req.params
    const { videoId, title, difficulty_level = 'medium' } = req.body
    const teacherId = req.user.userId

    // Verify session ownership
    const sessionResult = await db.query(
      'SELECT * FROM sessions WHERE id = $1 AND teacher_id = $2',
      [sessionId, teacherId]
    )

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found or unauthorized' })
    }

    // Verify video ownership
    const videoResult = await db.query(
      'SELECT * FROM uploaded_videos WHERE id = $1 AND user_id = $2',
      [videoId, teacherId]
    )

    if (videoResult.rows.length === 0) {
      return res.status(404).json({ message: 'Video not found or unauthorized' })
    }

    const video = videoResult.rows[0]

    // Create activity
    const activityResult = await db.query(
      `INSERT INTO activities (session_id, type, prompt, ai_generated, content, difficulty_level)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        sessionId,
        'interactive_video',
        title || `Interactive Video: ${video.original_filename}`,
        false,
        {
          videoId: video.id,
          videoUrl: video.url,
          videoDuration: video.duration_seconds,
          title: title || video.original_filename,
          questions: [] // Questions will be added separately
        },
        difficulty_level
      ]
    )

    const activity = activityResult.rows[0]

    res.status(201).json({
      activity: {
        id: activity.id,
        type: activity.type,
        content: activity.content,
        difficultyLevel: activity.difficulty_level,
        createdAt: activity.created_at
      }
    })

  } catch (error) {
    console.error('Create interactive video error:', error)
    res.status(500).json({ message: 'Failed to create interactive video activity' })
  }
}

/**
 * Add a question to an interactive video
 * POST /api/activities/:activityId/video-questions
 */
export async function addVideoQuestion(req, res) {
  try {
    const { activityId } = req.params
    const { timestamp_seconds, question_type, question_text, options, correct_answer, ai_generated = false } = req.body
    const teacherId = req.user.userId

    // Verify activity ownership
    const activityResult = await db.query(
      `SELECT a.* FROM activities a
       JOIN sessions s ON a.session_id = s.id
       WHERE a.id = $1 AND s.teacher_id = $2 AND a.type = 'interactive_video'`,
      [activityId, teacherId]
    )

    if (activityResult.rows.length === 0) {
      return res.status(404).json({ message: 'Activity not found or unauthorized' })
    }

    // Validate question data
    if (!question_text || question_text.trim() === '') {
      return res.status(400).json({ message: 'Question text is required' })
    }

    if (question_type === 'multiple_choice') {
      if (!options || !Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ message: 'Multiple choice questions need at least 2 options' })
      }
      if (correct_answer === undefined || correct_answer < 0 || correct_answer >= options.length) {
        return res.status(400).json({ message: 'Invalid correct answer index' })
      }
    }

    // Get current max order for this timestamp
    const orderResult = await db.query(
      `SELECT COALESCE(MAX(question_order), -1) as max_order
       FROM video_questions
       WHERE activity_id = $1 AND timestamp_seconds = $2`,
      [activityId, timestamp_seconds]
    )

    const nextOrder = orderResult.rows[0].max_order + 1

    // Insert question
    const questionResult = await db.query(
      `INSERT INTO video_questions (
        activity_id, timestamp_seconds, question_type, question_text,
        options, correct_answer, ai_generated, question_order
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        activityId,
        timestamp_seconds,
        question_type,
        question_text,
        options ? JSON.stringify(options) : null,
        correct_answer,
        ai_generated,
        nextOrder
      ]
    )

    const question = questionResult.rows[0]

    res.status(201).json({
      question: {
        id: question.id,
        timestampSeconds: question.timestamp_seconds,
        questionType: question.question_type,
        questionText: question.question_text,
        options: question.options,
        correctAnswer: question.correct_answer,
        aiGenerated: question.ai_generated,
        order: question.question_order
      }
    })

  } catch (error) {
    console.error('Add video question error:', error)
    res.status(500).json({ message: 'Failed to add question' })
  }
}

/**
 * Get all questions for a video activity
 * GET /api/activities/:activityId/video-questions
 */
export async function getVideoQuestions(req, res) {
  try {
    const { activityId } = req.params

    const questionsResult = await db.query(
      `SELECT * FROM video_questions
       WHERE activity_id = $1
       ORDER BY timestamp_seconds ASC, question_order ASC`,
      [activityId]
    )

    res.json({
      questions: questionsResult.rows.map(q => ({
        id: q.id,
        timestampSeconds: q.timestamp_seconds,
        questionType: q.question_type,
        questionText: q.question_text,
        options: q.options,
        correctAnswer: q.correct_answer,
        aiGenerated: q.ai_generated,
        order: q.question_order,
        createdAt: q.created_at
      }))
    })

  } catch (error) {
    console.error('Get video questions error:', error)
    res.status(500).json({ message: 'Failed to get questions' })
  }
}

/**
 * Update a video question
 * PUT /api/video-questions/:questionId
 */
export async function updateVideoQuestion(req, res) {
  try {
    const { questionId } = req.params
    const { timestamp_seconds, question_text, options, correct_answer } = req.body
    const teacherId = req.user.userId

    // Verify ownership
    const verifyResult = await db.query(
      `SELECT vq.* FROM video_questions vq
       JOIN activities a ON vq.activity_id = a.id
       JOIN sessions s ON a.session_id = s.id
       WHERE vq.id = $1 AND s.teacher_id = $2`,
      [questionId, teacherId]
    )

    if (verifyResult.rows.length === 0) {
      return res.status(404).json({ message: 'Question not found or unauthorized' })
    }

    // Update question
    const updateResult = await db.query(
      `UPDATE video_questions
       SET timestamp_seconds = COALESCE($1, timestamp_seconds),
           question_text = COALESCE($2, question_text),
           options = COALESCE($3, options),
           correct_answer = COALESCE($4, correct_answer)
       WHERE id = $5
       RETURNING *`,
      [
        timestamp_seconds,
        question_text,
        options ? JSON.stringify(options) : null,
        correct_answer,
        questionId
      ]
    )

    const question = updateResult.rows[0]

    res.json({
      question: {
        id: question.id,
        timestampSeconds: question.timestamp_seconds,
        questionType: question.question_type,
        questionText: question.question_text,
        options: question.options,
        correctAnswer: question.correct_answer
      }
    })

  } catch (error) {
    console.error('Update video question error:', error)
    res.status(500).json({ message: 'Failed to update question' })
  }
}

/**
 * Delete a video question
 * DELETE /api/video-questions/:questionId
 */
export async function deleteVideoQuestion(req, res) {
  try {
    const { questionId } = req.params
    const teacherId = req.user.userId

    // Verify ownership
    const verifyResult = await db.query(
      `SELECT vq.* FROM video_questions vq
       JOIN activities a ON vq.activity_id = a.id
       JOIN sessions s ON a.session_id = s.id
       WHERE vq.id = $1 AND s.teacher_id = $2`,
      [questionId, teacherId]
    )

    if (verifyResult.rows.length === 0) {
      return res.status(404).json({ message: 'Question not found or unauthorized' })
    }

    await db.query('DELETE FROM video_questions WHERE id = $1', [questionId])

    res.json({ message: 'Question deleted successfully' })

  } catch (error) {
    console.error('Delete video question error:', error)
    res.status(500).json({ message: 'Failed to delete question' })
  }
}

/**
 * Submit answer to a video question
 * POST /api/video-questions/:questionId/respond
 */
export async function submitVideoQuestionResponse(req, res) {
  try {
    const { questionId } = req.params
    const { response_text, selected_option, time_spent_seconds } = req.body
    const studentId = req.user.studentId // Assuming student auth middleware

    // Get question details
    const questionResult = await db.query(
      'SELECT * FROM video_questions WHERE id = $1',
      [questionId]
    )

    if (questionResult.rows.length === 0) {
      return res.status(404).json({ message: 'Question not found' })
    }

    const question = questionResult.rows[0]

    // Check if correct (for multiple choice)
    let isCorrect = null
    if (question.question_type === 'multiple_choice' && selected_option !== undefined) {
      isCorrect = selected_option === question.correct_answer
    }

    // Insert or update response
    const responseResult = await db.query(
      `INSERT INTO video_question_responses (
        question_id, student_id, activity_id, response_text, selected_option,
        is_correct, time_spent_seconds
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (question_id, student_id)
       DO UPDATE SET
         response_text = EXCLUDED.response_text,
         selected_option = EXCLUDED.selected_option,
         is_correct = EXCLUDED.is_correct,
         time_spent_seconds = EXCLUDED.time_spent_seconds,
         created_at = NOW()
       RETURNING *`,
      [
        questionId,
        studentId,
        question.activity_id,
        response_text,
        selected_option,
        isCorrect,
        time_spent_seconds
      ]
    )

    const response = responseResult.rows[0]

    res.json({
      response: {
        id: response.id,
        isCorrect: response.is_correct,
        feedback: response.ai_feedback
      }
    })

  } catch (error) {
    console.error('Submit video question response error:', error)
    res.status(500).json({ message: 'Failed to submit response' })
  }
}

/**
 * Update video progress (student position in video)
 * POST /api/activities/:activityId/video-progress
 */
export async function updateVideoProgress(req, res) {
  try {
    const { activityId } = req.params
    const { current_timestamp_seconds, completed = false } = req.body
    const studentId = req.user.studentId

    // Get video duration from activity
    const activityResult = await db.query(
      'SELECT content FROM activities WHERE id = $1',
      [activityId]
    )

    if (activityResult.rows.length === 0) {
      return res.status(404).json({ message: 'Activity not found' })
    }

    const videoDuration = activityResult.rows[0].content.videoDuration || 0
    const completionPercentage = videoDuration > 0
      ? Math.min(100, Math.round((current_timestamp_seconds / videoDuration) * 100))
      : 0

    // Insert or update progress
    const progressResult = await db.query(
      `INSERT INTO video_progress (
        activity_id, student_id, current_timestamp_seconds, completed, completion_percentage, last_updated
      )
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (activity_id, student_id)
       DO UPDATE SET
         current_timestamp_seconds = EXCLUDED.current_timestamp_seconds,
         completed = EXCLUDED.completed,
         completion_percentage = EXCLUDED.completion_percentage,
         last_updated = NOW()
       RETURNING *`,
      [activityId, studentId, current_timestamp_seconds, completed, completionPercentage]
    )

    res.json({
      progress: {
        currentTimestamp: progressResult.rows[0].current_timestamp_seconds,
        completed: progressResult.rows[0].completed,
        completionPercentage: progressResult.rows[0].completion_percentage
      }
    })

  } catch (error) {
    console.error('Update video progress error:', error)
    res.status(500).json({ message: 'Failed to update progress' })
  }
}

/**
 * Get video analytics for teacher
 * GET /api/activities/:activityId/video-analytics
 */
export async function getVideoAnalytics(req, res) {
  try {
    const { activityId } = req.params
    const teacherId = req.user.userId

    // Verify ownership
    const activityResult = await db.query(
      `SELECT a.* FROM activities a
       JOIN sessions s ON a.session_id = s.id
       WHERE a.id = $1 AND s.teacher_id = $2`,
      [activityId, teacherId]
    )

    if (activityResult.rows.length === 0) {
      return res.status(404).json({ message: 'Activity not found or unauthorized' })
    }

    // Get student progress
    const progressResult = await db.query(
      `SELECT vp.*, ss.student_name
       FROM video_progress vp
       JOIN session_students ss ON vp.student_id = ss.id
       WHERE vp.activity_id = $1
       ORDER BY vp.completion_percentage DESC`,
      [activityId]
    )

    // Get question responses
    const responsesResult = await db.query(
      `SELECT vqr.*, vq.question_text, vq.timestamp_seconds, ss.student_name
       FROM video_question_responses vqr
       JOIN video_questions vq ON vqr.question_id = vq.id
       JOIN session_students ss ON vqr.student_id = ss.id
       WHERE vqr.activity_id = $1
       ORDER BY vq.timestamp_seconds ASC`,
      [activityId]
    )

    res.json({
      progress: progressResult.rows.map(p => ({
        studentName: p.student_name,
        currentTimestamp: p.current_timestamp_seconds,
        completed: p.completed,
        completionPercentage: p.completion_percentage,
        lastUpdated: p.last_updated
      })),
      responses: responsesResult.rows.map(r => ({
        studentName: r.student_name,
        questionText: r.question_text,
        timestampSeconds: r.timestamp_seconds,
        responseText: r.response_text,
        selectedOption: r.selected_option,
        isCorrect: r.is_correct,
        timeSpent: r.time_spent_seconds
      }))
    })

  } catch (error) {
    console.error('Get video analytics error:', error)
    res.status(500).json({ message: 'Failed to get analytics' })
  }
}
