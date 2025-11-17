import axios from 'axios'
import db from '../database/db.js'
import { getIO } from '../services/ioInstance.js'

/**
 * Generate sentence ordering activity using AI
 * POST /api/ai/generate-sentence-ordering
 */
export async function generateSentenceOrdering(req, res) {
  try {
    const { sessionId, prompt, difficulty = 'medium', sentenceCount = 5 } = req.body
    const teacherId = req.user.userId

    if (!prompt || !sessionId) {
      return res.status(400).json({ message: 'Session ID and prompt are required' })
    }

    // Verify session ownership
    const sessionCheck = await db.query(
      'SELECT * FROM sessions WHERE id = $1 AND teacher_id = $2',
      [sessionId, teacherId]
    )

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found or unauthorized' })
    }

    // Call Claude AI to generate sentences
    const aiResponse = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: `You are an expert educator creating a sentence ordering exercise. Generate ${sentenceCount} sentences about "${prompt}" that tell a coherent story or explain a concept in logical order.

Difficulty: ${difficulty}

Requirements:
1. Sentences should follow a clear logical sequence
2. Each sentence should be complete and grammatically correct
3. The ordering should have ONE clear correct answer
4. Appropriate for ${difficulty} difficulty level
5. Educational and engaging

Respond ONLY with valid JSON in this exact format:
{
  "sentences": [
    {"text": "First sentence in the story or explanation"},
    {"text": "Second sentence that logically follows"},
    {"text": "Third sentence continuing the sequence"}
  ],
  "instructions": "A brief instruction for students (e.g., 'Arrange these sentences to tell the story chronologically')",
  "topic": "${prompt}"
}`
        }]
      },
      {
        headers: {
          'x-api-key': process.env.CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }
      }
    )

    const aiContent = aiResponse.data.content[0].text

    // Extract JSON from response
    let sentenceData
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/)
      sentenceData = JSON.parse(jsonMatch ? jsonMatch[0] : aiContent)
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent)
      throw new Error('AI generated invalid response format')
    }

    // Add IDs and correct positions to sentences
    const sentences = sentenceData.sentences.map((sentence, index) => ({
      id: `s${index + 1}`,
      text: sentence.text,
      correctPosition: index
    }))

    // Create activity in database
    const activityResult = await db.query(
      `INSERT INTO activities (session_id, user_id, type, content, difficulty_level, prompt)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        sessionId,
        teacherId,
        'sentence_ordering',
        JSON.stringify({
          sentences,
          instructions: sentenceData.instructions || 'Arrange these sentences in the correct order',
          topic: sentenceData.topic || prompt,
          scoringType: 'partial' // partial or exact
        }),
        difficulty,
        prompt
      ]
    )

    const activity = activityResult.rows[0]

    res.json({
      message: 'Sentence ordering activity generated successfully',
      activity: {
        id: activity.id,
        type: activity.type,
        content: activity.content,
        difficulty_level: activity.difficulty_level,
        created_at: activity.created_at
      }
    })

  } catch (error) {
    console.error('Sentence ordering generation error:', error.response?.data || error.message)

    if (error.response?.status === 401) {
      return res.status(500).json({
        message: 'Claude API key not configured or invalid'
      })
    }

    res.status(500).json({
      message: `Generation failed: ${error.message}`
    })
  }
}

/**
 * Submit student response for sentence ordering
 * POST /api/activities/:activityId/sentence-ordering/submit
 */
export async function submitSentenceOrdering(req, res) {
  try {
    const { activityId } = req.params
    const { orderedSentences } = req.body // Array of sentence IDs in student's order
    const studentId = req.student.studentId

    if (!orderedSentences || !Array.isArray(orderedSentences)) {
      return res.status(400).json({ message: 'Ordered sentences array is required' })
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
    const content = activity.content

    // Calculate score
    const correctOrder = content.sentences
      .sort((a, b) => a.correctPosition - b.correctPosition)
      .map(s => s.id)

    let correctCount = 0
    for (let i = 0; i < correctOrder.length; i++) {
      if (correctOrder[i] === orderedSentences[i]) {
        correctCount++
      }
    }

    const score = (correctCount / correctOrder.length) * 100
    const isCorrect = score === 100

    // Save response
    const responseResult = await db.query(
      `INSERT INTO student_responses
       (student_id, activity_id, session_instance_id, response, is_correct, submitted_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [
        studentId,
        activityId,
        req.student.sessionInstanceId,
        JSON.stringify({
          orderedSentences,
          score,
          correctPositions: correctCount,
          totalSentences: correctOrder.length,
          correctOrder
        }),
        isCorrect
      ]
    )

    // Emit WebSocket event for real-time leaderboard update
    try {
      const io = getIO()
      const sessionId = activity.session_id

      io.to(`session-${sessionId}`).emit('leaderboard-updated', {
        sessionInstanceId: req.student.sessionInstanceId,
        studentId,
        activityId,
        score,
        timestamp: new Date().toISOString()
      })

      console.log(`📊 Leaderboard update emitted for session ${sessionId}`)
    } catch (error) {
      console.error('Failed to emit leaderboard update:', error)
      // Don't fail the request if WebSocket emission fails
    }

    res.json({
      message: 'Response submitted successfully',
      response: {
        id: responseResult.rows[0].id,
        score,
        correctPositions: correctCount,
        totalSentences: correctOrder.length,
        isCorrect,
        correctOrder: isCorrect ? null : correctOrder // Only show if incorrect
      }
    })

  } catch (error) {
    console.error('Submit sentence ordering error:', error)
    res.status(500).json({ message: 'Failed to submit response' })
  }
}

/**
 * Get leaderboard for a session instance
 * GET /api/sessions/:sessionId/instances/:instanceId/leaderboard
 */
export async function getLeaderboard(req, res) {
  try {
    const { sessionId, instanceId } = req.params
    const teacherId = req.user?.userId

    // Verify session ownership if teacher is requesting
    if (teacherId) {
      const sessionCheck = await db.query(
        'SELECT * FROM sessions WHERE id = $1 AND teacher_id = $2',
        [sessionId, teacherId]
      )

      if (sessionCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Session not found or unauthorized' })
      }
    }

    // Get leaderboard data
    const leaderboardResult = await db.query(
      'SELECT * FROM get_session_leaderboard($1)',
      [instanceId]
    )

    res.json({
      leaderboard: leaderboardResult.rows,
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Get leaderboard error:', error)
    res.status(500).json({ message: 'Failed to get leaderboard' })
  }
}

/**
 * Get student's own score and rank
 * GET /api/sessions/:sessionId/instances/:instanceId/my-score
 */
export async function getMyScore(req, res) {
  try {
    const { instanceId } = req.params
    const studentId = req.student.studentId

    const result = await db.query(
      `SELECT * FROM get_session_leaderboard($1)
       WHERE student_id = $2`,
      [instanceId, studentId]
    )

    if (result.rows.length === 0) {
      return res.json({
        student_id: studentId,
        activities_completed: 0,
        average_score: 0,
        total_score: 0,
        rank: null
      })
    }

    res.json(result.rows[0])

  } catch (error) {
    console.error('Get my score error:', error)
    res.status(500).json({ message: 'Failed to get score' })
  }
}
