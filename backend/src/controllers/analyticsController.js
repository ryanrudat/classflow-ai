import db from '../database/db.js'

/**
 * Get session analytics
 * GET /api/sessions/:sessionId/analytics?instanceId=xxx
 * Returns overall performance stats for students in a session (optionally filtered by instance)
 * Protected: Teacher only
 */
export async function getSessionAnalytics(req, res) {
  try {
    const { sessionId } = req.params
    const { instanceId } = req.query
    const teacherId = req.user.userId

    // Verify teacher owns this session
    const sessionCheck = await db.query(
      'SELECT id FROM sessions WHERE id = $1 AND teacher_id = $2',
      [sessionId, teacherId]
    )

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' })
    }

    // Build query with optional instance filter
    let query = `SELECT
        ss.id,
        ss.student_name,
        ss.device_type,
        ss.joined_at,
        COUNT(DISTINCT sr.activity_id) as activities_completed,
        COUNT(sr.id) as total_responses,
        COUNT(CASE WHEN sr.is_correct = true THEN 1 END) as correct_responses,
        COUNT(CASE WHEN sr.is_correct = false THEN 1 END) as incorrect_responses,
        AVG(sr.time_spent_seconds) as avg_time_spent,
        MAX(sr.created_at) as last_activity_at
       FROM session_students ss
       LEFT JOIN student_responses sr ON sr.student_id = ss.id
       WHERE ss.session_id = $1`

    const params = [sessionId]

    // Filter by instance if provided
    if (instanceId) {
      query += ' AND ss.instance_id = $2'
      params.push(instanceId)
    }

    query += ` GROUP BY ss.id, ss.student_name, ss.device_type, ss.joined_at
       ORDER BY ss.joined_at DESC`

    const studentsResult = await db.query(query, params)

    // Calculate performance metrics for each student
    const students = studentsResult.rows.map(student => {
      const totalResponses = parseInt(student.total_responses)
      const correctResponses = parseInt(student.correct_responses)
      const incorrectResponses = parseInt(student.incorrect_responses)

      const correctnessRate = totalResponses > 0
        ? (correctResponses / totalResponses) * 100
        : null

      // Classify student performance
      let performanceLevel = 'no-data'
      if (totalResponses >= 3) {
        if (correctnessRate >= 80) {
          performanceLevel = 'advanced'
        } else if (correctnessRate >= 60) {
          performanceLevel = 'on-track'
        } else {
          performanceLevel = 'struggling'
        }
      } else if (totalResponses > 0) {
        performanceLevel = 'limited-data'
      }

      return {
        id: student.id,
        name: student.student_name,
        deviceType: student.device_type,
        joinedAt: student.joined_at,
        activitiesCompleted: parseInt(student.activities_completed),
        totalResponses,
        correctResponses,
        incorrectResponses,
        correctnessRate: correctnessRate !== null ? Math.round(correctnessRate) : null,
        avgTimeSpent: student.avg_time_spent ? Math.round(student.avg_time_spent) : null,
        lastActivityAt: student.last_activity_at,
        performanceLevel
      }
    })

    // Calculate overall session stats
    const totalStudents = students.length
    const activeStudents = students.filter(s => s.totalResponses > 0).length
    const avgCorrectness = students
      .filter(s => s.correctnessRate !== null)
      .reduce((sum, s) => sum + s.correctnessRate, 0) / (students.filter(s => s.correctnessRate !== null).length || 1)

    const strugglingStudents = students.filter(s => s.performanceLevel === 'struggling')
    const advancedStudents = students.filter(s => s.performanceLevel === 'advanced')

    res.json({
      sessionId,
      students,
      summary: {
        totalStudents,
        activeStudents,
        avgCorrectness: Math.round(avgCorrectness),
        strugglingCount: strugglingStudents.length,
        advancedCount: advancedStudents.length,
        strugglingStudents: strugglingStudents.map(s => ({ id: s.id, name: s.name })),
        advancedStudents: advancedStudents.map(s => ({ id: s.id, name: s.name }))
      }
    })

  } catch (error) {
    console.error('Get session analytics error:', error)
    res.status(500).json({ message: 'Failed to get session analytics' })
  }
}

/**
 * Get individual student analytics
 * GET /api/students/:studentId/analytics
 * Returns detailed performance stats for one student
 * Protected: Teacher only
 */
export async function getStudentAnalytics(req, res) {
  try {
    const { studentId } = req.params
    const teacherId = req.user.userId

    // Verify student belongs to teacher's session
    const studentCheck = await db.query(
      `SELECT ss.*, s.teacher_id
       FROM session_students ss
       JOIN sessions s ON ss.session_id = s.id
       WHERE ss.id = $1 AND s.teacher_id = $2`,
      [studentId, teacherId]
    )

    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' })
    }

    const student = studentCheck.rows[0]

    // Get all responses with activity details
    const responsesResult = await db.query(
      `SELECT
        sr.*,
        a.type as activity_type,
        a.prompt,
        a.difficulty_level,
        a.created_at as activity_created_at
       FROM student_responses sr
       JOIN activities a ON sr.activity_id = a.id
       WHERE sr.student_id = $1
       ORDER BY sr.created_at DESC`,
      [studentId]
    )

    // Calculate detailed stats
    const responses = responsesResult.rows
    const totalResponses = responses.length
    const correctResponses = responses.filter(r => r.is_correct === true).length
    const incorrectResponses = responses.filter(r => r.is_correct === false).length
    const correctnessRate = totalResponses > 0 ? (correctResponses / totalResponses) * 100 : 0

    // Group by activity type
    const byType = {}
    responses.forEach(r => {
      if (!byType[r.activity_type]) {
        byType[r.activity_type] = { total: 0, correct: 0 }
      }
      byType[r.activity_type].total++
      if (r.is_correct) byType[r.activity_type].correct++
    })

    // Recent activity timeline
    const recentActivity = responses.slice(0, 10).map(r => ({
      activityId: r.activity_id,
      type: r.activity_type,
      difficulty: r.difficulty_level,
      isCorrect: r.is_correct,
      timeSpent: r.time_spent_seconds,
      submittedAt: r.created_at
    }))

    res.json({
      student: {
        id: student.id,
        name: student.student_name,
        deviceType: student.device_type,
        joinedAt: student.joined_at
      },
      stats: {
        totalResponses,
        correctResponses,
        incorrectResponses,
        correctnessRate: Math.round(correctnessRate),
        avgTimeSpent: responses.reduce((sum, r) => sum + (r.time_spent_seconds || 0), 0) / (totalResponses || 1)
      },
      byType,
      recentActivity
    })

  } catch (error) {
    console.error('Get student analytics error:', error)
    res.status(500).json({ message: 'Failed to get student analytics' })
  }
}
