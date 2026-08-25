import db from '../database/db.js'
import {
  generateHelp,
  generateSimplerVersion,
  getStudentPerformance
} from '../services/studentHelpService.js'

/**
 * Request help when student gets a question wrong
 * POST /api/student-help/request
 */
export async function requestHelp(req, res) {
  try {
    const {
      studentId,
      sessionId,
      activityId,
      questionText,
      questionNumber,
      correctAnswer,
      studentAnswer,
      attemptNumber = 1,
      timeSpent = 0
    } = req.body

    // Validate required fields
    if (!studentId || !sessionId || !activityId || !questionText || !correctAnswer || !studentAnswer) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      })
    }

    // Get student's recent performance for context
    const performance = await getStudentPerformance(studentId, sessionId)

    // Get activity subject for context
    const activityResult = await db.query(
      'SELECT a.*, s.subject FROM activities a JOIN sessions s ON a.session_id = s.id WHERE a.id = $1',
      [activityId]
    )

    const activity = activityResult.rows[0]

    // Generate personalized help
    const help = await generateHelp({
      questionText,
      correctAnswer,
      studentAnswer,
      attemptNumber,
      studentContext: {
        studentId,
        sessionId,
        activityId,
        questionNumber,
        recentCorrectRate: performance?.correct_rate || 0,
        timeSpent,
        subject: activity?.subject || 'General'
      }
    })

    // Save help event to database
    const helpResult = await db.query(
      `INSERT INTO student_help_events
       (student_id, session_id, activity_id, question_text, question_number,
        correct_answer, student_answer, attempt_number, help_type, help_content, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       RETURNING id`,
      [
        studentId,
        sessionId,
        activityId,
        questionText,
        questionNumber,
        correctAnswer,
        studentAnswer,
        attemptNumber,
        help.helpType,
        JSON.stringify(help)
      ]
    )

    const helpEventId = helpResult.rows[0].id

    res.json({
      success: true,
      help,
      helpEventId
    })
  } catch (error) {
    console.error('Error in requestHelp:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to generate help',
      message: error.message
    })
  }
}

/**
 * Accept simpler version of question
 * POST /api/student-help/accept-simpler
 */
export async function acceptSimplerVersion(req, res) {
  try {
    const {
      studentId,
      sessionId,
      activityId,
      questionText,
      correctAnswer
    } = req.body

    // Validate required fields
    if (!studentId || !sessionId || !activityId || !questionText || !correctAnswer) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      })
    }

    // Get student performance
    const performance = await getStudentPerformance(studentId, sessionId)

    // Generate simpler version
    const simplerVersion = await generateSimplerVersion({
      originalQuestion: questionText,
      correctAnswer,
      studentContext: {
        studentId,
        sessionId,
        activityId,
        recentCorrectRate: performance?.correct_rate || 0
      }
    })

    res.json({
      success: true,
      simplerQuestion: simplerVersion
    })
  } catch (error) {
    console.error('Error in acceptSimplerVersion:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to generate simpler version',
      message: error.message
    })
  }
}

/**
 * Get help history for a session (teacher view)
 * GET /api/student-help/history/:sessionId
 */
export async function getHelpHistory(req, res) {
  try {
    const { sessionId } = req.params
    const { studentId, limit = 50 } = req.query

    let query = `
      SELECT
        she.*,
        ss.student_name,
        a.type as activity_type,
        a.difficulty_level
      FROM student_help_events she
      JOIN session_students ss ON she.student_id = ss.id
      JOIN activities a ON she.activity_id = a.id
      WHERE she.session_id = $1
    `

    const params = [sessionId]

    // Filter by specific student if requested
    if (studentId) {
      query += ` AND she.student_id = $2`
      params.push(studentId)
    }

    query += ` ORDER BY she.created_at DESC LIMIT $${params.length + 1}`
    params.push(parseInt(limit))

    const result = await db.query(query, params)

    // Get summary statistics
    const statsResult = await db.query(
      `SELECT
        COUNT(*) as total_help_requests,
        COUNT(DISTINCT student_id) as students_helped,
        COUNT(*) FILTER (WHERE student_tried_again = true) as students_tried_again,
        COUNT(*) FILTER (WHERE successful_after_help = true) as successful_after_help,
        AVG(time_to_retry_seconds) as avg_time_to_retry,
        COUNT(*) FILTER (WHERE help_type = 'gentle-nudge') as gentle_nudges,
        COUNT(*) FILTER (WHERE help_type = 'direct-explanation') as direct_explanations,
        COUNT(*) FILTER (WHERE help_type = 'simpler-version') as simpler_versions
      FROM student_help_events
      WHERE session_id = $1`,
      [sessionId]
    )

    res.json({
      success: true,
      history: result.rows,
      stats: statsResult.rows[0]
    })
  } catch (error) {
    console.error('Error in getHelpHistory:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get help history',
      message: error.message
    })
  }
}

export default {
  requestHelp,
  acceptSimplerVersion,
  getHelpHistory
}
