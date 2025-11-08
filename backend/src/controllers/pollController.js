import db from '../database/db.js'
import { getIO } from '../services/ioInstance.js'

/**
 * Create a poll activity
 * POST /api/sessions/:sessionId/activities/poll
 */
export async function createPoll(req, res) {
  const { sessionId } = req.params
  const { question, description, options } = req.body
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

    const content = {
      question,
      description,
      options
    }

    // Create poll activity
    const result = await db.query(
      `INSERT INTO activities (session_id, type, prompt, content, difficulty_level, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [sessionId, 'poll', question, JSON.stringify(content), 'medium']
    )

    res.status(201).json({
      message: 'Poll created successfully',
      activity: result.rows[0]
    })
  } catch (error) {
    console.error('Create poll error:', error)
    res.status(500).json({ message: 'Failed to create poll' })
  }
}

/**
 * Submit vote to poll
 * POST /api/activities/:activityId/poll/vote
 */
export async function submitVote(req, res) {
  const { activityId } = req.params
  const { optionId, studentId } = req.body

  try {
    // Get activity
    const activity = await db.query(
      'SELECT * FROM activities WHERE id = $1',
      [activityId]
    )

    if (activity.rows.length === 0) {
      return res.status(404).json({ message: 'Poll not found' })
    }

    const pollActivity = activity.rows[0]

    // Store vote (simple approach: store in student_responses)
    const responseData = {
      type: 'poll',
      optionId
    }

    await db.query(
      `INSERT INTO student_responses (activity_id, student_id, response, is_correct, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (activity_id, student_id)
       DO UPDATE SET response = $3, created_at = NOW()`,
      [activityId, studentId, JSON.stringify(responseData), null]
    )

    // Get updated results
    const resultsData = await getPollResults(activityId)

    // Emit real-time update to all clients
    const io = getIO()
    const sessionId = pollActivity.session_id
    if (io && sessionId) {
      io.to(`session-${sessionId}`).emit('poll-updated', {
        activityId,
        results: resultsData.results,
        totalVotes: resultsData.totalVotes
      })
    }

    res.json({
      message: 'Vote submitted successfully',
      results: resultsData.results,
      totalVotes: resultsData.totalVotes
    })
  } catch (error) {
    console.error('Submit vote error:', error)
    res.status(500).json({ message: 'Failed to submit vote' })
  }
}

/**
 * Get poll results
 * GET /api/activities/:activityId/poll/results
 */
export async function getPollResultsAPI(req, res) {
  const { activityId } = req.params

  try {
    const resultsData = await getPollResults(activityId)

    res.json({
      results: resultsData.results,
      totalVotes: resultsData.totalVotes
    })
  } catch (error) {
    console.error('Get poll results error:', error)
    res.status(500).json({ message: 'Failed to get poll results' })
  }
}

// Helper function to calculate poll results
async function getPollResults(activityId) {
  const responses = await db.query(
    `SELECT response FROM student_responses WHERE activity_id = $1`,
    [activityId]
  )

  const results = {}
  let totalVotes = 0

  responses.rows.forEach(row => {
    const responseData = row.response
    if (responseData.optionId) {
      results[responseData.optionId] = (results[responseData.optionId] || 0) + 1
      totalVotes++
    }
  })

  return { results, totalVotes }
}
