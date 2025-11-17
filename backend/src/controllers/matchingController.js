import axios from 'axios'
import db from '../database/db.js'

/**
 * Generate matching activity using AI
 * POST /api/ai/generate-matching
 */
export async function generateMatching(req, res) {
  try {
    const { topic, mode = 'pairs', difficultyLevel = 'medium' } = req.body
    const teacherId = req.user.userId

    if (!topic) {
      return res.status(400).json({ message: 'Topic is required' })
    }

    // Build AI prompt based on mode
    let aiPrompt
    if (mode === 'pairs') {
      aiPrompt = `You are an expert educator creating a matching pairs activity. Generate a matching exercise about "${topic}".

Difficulty: ${difficultyLevel}

Requirements:
1. Create 5-8 matching pairs
2. Left column items should be terms, concepts, or items
3. Right column should be definitions, descriptions, or matching items
4. Each pair should have ONE clear correct match
5. Appropriate for ${difficultyLevel} difficulty level
6. Educational and engaging

Respond ONLY with valid JSON in this exact format:
{
  "title": "A descriptive title for the activity",
  "instructions": "Brief instructions for students (e.g., 'Match each term with its correct definition')",
  "items": [
    {"id": "item1", "text": "First left-side item"},
    {"id": "item2", "text": "Second left-side item"}
  ],
  "matches": [
    {"id": "match1", "text": "First right-side match", "correctItemId": "item1"},
    {"id": "match2", "text": "Second right-side match", "correctItemId": "item2"}
  ]
}`
    } else {
      aiPrompt = `You are an expert educator creating a categorization activity. Generate a categorization exercise about "${topic}".

Difficulty: ${difficultyLevel}

Requirements:
1. Create 3-4 clear categories
2. Create 6-12 items that belong in these categories
3. Each item should have ONE clear correct category
4. Categories should have descriptive names
5. Appropriate for ${difficultyLevel} difficulty level
6. Educational and engaging

Respond ONLY with valid JSON in this exact format:
{
  "title": "A descriptive title for the activity",
  "instructions": "Brief instructions for students (e.g., 'Drag each item into its correct category')",
  "categories": [
    {"id": "cat1", "name": "Category 1 Name", "description": "Brief description", "color": "bg-blue-100"},
    {"id": "cat2", "name": "Category 2 Name", "description": "Brief description", "color": "bg-green-100"},
    {"id": "cat3", "name": "Category 3 Name", "description": "Brief description", "color": "bg-yellow-100"}
  ],
  "items": [
    {"id": "item1", "text": "First item to categorize", "correctCategoryId": "cat1"},
    {"id": "item2", "text": "Second item to categorize", "correctCategoryId": "cat2"}
  ]
}`
    }

    // Call Claude AI
    const aiResponse = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: aiPrompt
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
    let matchingData
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/)
      matchingData = JSON.parse(jsonMatch ? jsonMatch[0] : aiContent)
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent)
      throw new Error('AI generated invalid response format')
    }

    res.json(matchingData)

  } catch (error) {
    console.error('Matching generation error:', error.response?.data || error.message)

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
 * Create a matching activity
 * POST /api/sessions/:sessionId/activities/matching
 */
export async function createMatchingActivity(req, res) {
  const { sessionId } = req.params
  const { title, instructions, difficulty_level, mode, items, matches, categories } = req.body
  const teacherId = req.user.userId

  try {
    // Verify session belongs to user
    const session = await db.query(
      'SELECT * FROM sessions WHERE id = $1 AND teacher_id = $2',
      [sessionId, teacherId]
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
