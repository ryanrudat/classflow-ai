import db from '../database/db.js'

/**
 * Create a matching activity
 * POST /api/sessions/:sessionId/activities/matching
 */
export async function createMatchingActivity(req, res) {
  const { sessionId } = req.params
  const { title, instructions, difficulty_level, mode, items, matches, categories } = req.body
  const userId = req.user.id

  try {
    // Verify session belongs to user
    const session = await db.query(
      'SELECT * FROM sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    )

    if (session.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' })
    }

    // Prepare content based on mode
    const content = {
      mode, // 'pairs' or 'categories'
      title,
      instructions,
      items,
      ...(mode === 'pairs' ? { matches } : { categories })
    }

    // Create activity
    const result = await db.query(
      `INSERT INTO activities (session_id, type, prompt, content, difficulty_level, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [
        sessionId,
        'matching',
        title,
        JSON.stringify(content),
        difficulty_level || 'medium'
      ]
    )

    res.status(201).json({
      message: 'Matching activity created successfully',
      activity: result.rows[0]
    })
  } catch (error) {
    console.error('Create matching activity error:', error)
    res.status(500).json({ message: 'Failed to create matching activity' })
  }
}

/**
 * Submit student response to matching activity
 * POST /api/activities/:activityId/matching/submit
 */
export async function submitMatchingResponse(req, res) {
  const { activityId } = req.params
  const { matches } = req.body
  const studentId = req.student?.id

  try {
    // Get activity
    const activityResult = await db.query(
      'SELECT * FROM activities WHERE id = $1',
      [activityId]
    )

    if (activityResult.rows.length === 0) {
      return res.status(404).json({ message: 'Activity not found' })
    }

    const activity = activityResult.rows[0]
    const content = activity.content
    const mode = content.mode

    let correctMatches = 0
    let totalMatches = 0
    const correctAnswers = {}

    if (mode === 'pairs') {
      // Calculate score for pairs mode
      totalMatches = content.matches.length

      content.matches.forEach(match => {
        // Find the item that should match with this match
        const correctItemId = match.correctItemId
        correctAnswers[correctItemId] = match.id

        // Check if student matched correctly
        if (matches[correctItemId] === match.id) {
          correctMatches++
        }
      })
    } else if (mode === 'categories') {
      // Calculate score for categories mode
      totalMatches = content.items.length

      content.items.forEach(item => {
        correctAnswers[item.id] = item.correctCategoryId

        // Check if student categorized correctly
        if (matches[item.id] === item.correctCategoryId) {
          correctMatches++
        }
      })
    }

    const score = (correctMatches / totalMatches) * 100
    const isCorrect = score === 100

    // Prepare response data
    const responseData = {
      type: 'matching',
      matches,
      score,
      correctMatches,
      totalMatches,
      isCorrect,
      correctAnswers
    }

    // Save student response
    if (studentId) {
      await db.query(
        `INSERT INTO student_responses (activity_id, student_id, response, is_correct, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (activity_id, student_id)
         DO UPDATE SET response = $3, is_correct = $4, created_at = NOW()`,
        [activityId, studentId, JSON.stringify(responseData), isCorrect]
      )
    }

    res.json({
      message: 'Response submitted successfully',
      response: responseData
    })
  } catch (error) {
    console.error('Submit matching response error:', error)
    res.status(500).json({ message: 'Failed to submit response' })
  }
}

/**
 * Get matching activity analytics
 * GET /api/activities/:activityId/matching/analytics
 */
export async function getMatchingAnalytics(req, res) {
  const { activityId } = req.params

  try {
    // Get all responses for this activity
    const responses = await db.query(
      `SELECT
        sr.student_id,
        ss.student_name,
        sr.response,
        sr.is_correct,
        sr.created_at
       FROM student_responses sr
       JOIN session_students ss ON sr.student_id = ss.id
       WHERE sr.activity_id = $1
       ORDER BY sr.created_at DESC`,
      [activityId]
    )

    // Calculate analytics
    const totalResponses = responses.rows.length
    const correctResponses = responses.rows.filter(r => r.is_correct).length
    const averageScore = responses.rows.reduce((sum, r) => {
      const responseData = r.response
      return sum + (responseData.score || 0)
    }, 0) / (totalResponses || 1)

    // Common mistakes (which matches were most often incorrect)
    const mistakeCount = {}
    responses.rows.forEach(r => {
      const responseData = r.response
      Object.entries(responseData.matches || {}).forEach(([itemId, matchId]) => {
        if (matchId !== responseData.correctAnswers?.[itemId]) {
          const key = `${itemId}:${matchId}`
          mistakeCount[key] = (mistakeCount[key] || 0) + 1
        }
      })
    })

    res.json({
      totalResponses,
      correctResponses,
      averageScore: Math.round(averageScore * 100) / 100,
      responses: responses.rows,
      commonMistakes: mistakeCount
    })
  } catch (error) {
    console.error('Get matching analytics error:', error)
    res.status(500).json({ message: 'Failed to get analytics' })
  }
}
