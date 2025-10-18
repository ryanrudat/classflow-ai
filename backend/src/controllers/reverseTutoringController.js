import {
  transcribeStudentSpeech,
  startReverseTutoringConversation,
  continueConversation,
  getScaffolding,
  getTeacherDashboard,
  getConversationTranscript
} from '../services/reverseTutoringService.js'
import multer from 'multer'
import db from '../database/db.js'

// Configure multer for audio file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max (generous for audio)
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream') {
      cb(null, true)
    } else {
      cb(new Error('Only audio files are allowed'))
    }
  }
})

/**
 * Transcribe student speech to text
 * POST /api/reverse-tutoring/transcribe
 * Body: audio file (multipart/form-data)
 * Query: ?language=en&topic=photosynthesis
 */
export async function transcribeAudio(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No audio file provided' })
    }

    const language = req.query.language || 'en'
    const topic = req.query.topic || ''

    // Create lesson context for better accuracy
    const lessonContext = topic ? `Educational conversation about ${topic}` : ''

    const result = await transcribeStudentSpeech(
      req.file.buffer,
      language,
      lessonContext
    )

    res.json({
      text: result.text,
      success: true
    })

  } catch (error) {
    console.error('Transcribe audio error:', error)
    res.status(500).json({
      message: `Transcription failed: ${error.message}`
    })
  }
}

/**
 * Start a new reverse tutoring conversation
 * POST /api/reverse-tutoring/start
 * Body: { sessionId, studentId, topic, subject, gradeLevel, keyVocabulary }
 * Public: No auth required (students)
 */
export async function startConversation(req, res) {
  try {
    const {
      sessionId,
      studentId,
      topic,
      subject = 'Science',
      gradeLevel = '7th grade',
      keyVocabulary = []
    } = req.body

    // Validation
    if (!sessionId || !studentId || !topic) {
      return res.status(400).json({
        message: 'Session ID, student ID, and topic are required'
      })
    }

    // Verify student exists in active session
    const studentCheck = await db.query(
      `SELECT ss.id, s.status
       FROM session_students ss
       JOIN sessions s ON ss.session_id = s.id
       WHERE ss.id = $1 AND s.id = $2`,
      [studentId, sessionId]
    )

    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found in this session' })
    }

    // Check if conversation already exists for this topic
    const existingConversation = await db.query(
      `SELECT id FROM reverse_tutoring_conversations
       WHERE session_id = $1 AND student_id = $2 AND topic = $3`,
      [sessionId, studentId, topic]
    )

    if (existingConversation.rows.length > 0) {
      return res.status(409).json({
        message: 'Conversation already exists for this topic',
        conversationId: existingConversation.rows[0].id
      })
    }

    // Start the conversation
    const result = await startReverseTutoringConversation(
      sessionId,
      studentId,
      {
        topic,
        subject,
        gradeLevel,
        keyVocabulary
      }
    )

    // Log analytics
    await db.query(
      `INSERT INTO analytics_events (event_type, session_id, properties)
       VALUES ($1, $2, $3)`,
      [
        'reverse_tutoring_started',
        sessionId,
        JSON.stringify({
          conversationId: result.conversationId,
          topic,
          subject
        })
      ]
    )

    res.json({
      message: 'Conversation started successfully',
      ...result
    })

  } catch (error) {
    console.error('Start conversation error:', error)
    res.status(500).json({
      message: `Failed to start conversation: ${error.message}`
    })
  }
}

/**
 * Send student message and get AI response
 * POST /api/reverse-tutoring/:conversationId/message
 * Body: { studentMessage, language, helpNeeded, vocabularyUsed }
 * Public: No auth required (students)
 */
export async function sendMessage(req, res) {
  try {
    const { conversationId } = req.params
    const {
      studentMessage,
      language = 'en',
      helpNeeded = false,
      vocabularyUsed = []
    } = req.body

    // Validation
    if (!studentMessage || studentMessage.trim().length === 0) {
      return res.status(400).json({
        message: 'Student message is required'
      })
    }

    // Continue the conversation
    const result = await continueConversation(
      conversationId,
      studentMessage,
      { language, helpNeeded, vocabularyUsed }
    )

    res.json({
      message: 'Message sent successfully',
      ...result
    })

  } catch (error) {
    console.error('Send message error:', error)
    res.status(500).json({
      message: `Failed to send message: ${error.message}`
    })
  }
}

/**
 * Get scaffolding/help for student
 * POST /api/reverse-tutoring/:conversationId/help
 * Body: { struggleArea }
 * Public: No auth required (students)
 */
export async function requestHelp(req, res) {
  try {
    const { conversationId } = req.params
    const { struggleArea = 'explaining the concept' } = req.body

    const scaffolding = await getScaffolding(conversationId, struggleArea)

    // Log analytics
    const conversationResult = await db.query(
      `SELECT session_id FROM reverse_tutoring_conversations WHERE id = $1`,
      [conversationId]
    )

    if (conversationResult.rows.length > 0) {
      await db.query(
        `INSERT INTO analytics_events (event_type, session_id, properties)
         VALUES ($1, $2, $3)`,
        [
          'reverse_tutoring_help_requested',
          conversationResult.rows[0].session_id,
          JSON.stringify({ conversationId, struggleArea })
        ]
      )
    }

    res.json({
      message: 'Scaffolding generated successfully',
      scaffolding
    })

  } catch (error) {
    console.error('Request help error:', error)
    res.status(500).json({
      message: `Failed to get help: ${error.message}`
    })
  }
}

/**
 * Get teacher dashboard for all conversations in session
 * GET /api/reverse-tutoring/session/:sessionId/dashboard
 * Protected: Teacher only
 */
export async function getDashboard(req, res) {
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

    const dashboard = await getTeacherDashboard(sessionId)

    res.json({
      sessionId,
      conversations: dashboard,
      totalStudents: dashboard.length,
      averageUnderstanding: dashboard.length > 0
        ? Math.round(dashboard.reduce((sum, c) => sum + c.understandingLevel, 0) / dashboard.length)
        : 0
    })

  } catch (error) {
    console.error('Get dashboard error:', error)
    res.status(500).json({
      message: `Failed to get dashboard: ${error.message}`
    })
  }
}

/**
 * Get full conversation transcript
 * GET /api/reverse-tutoring/:conversationId/transcript
 * Protected: Teacher only
 */
export async function getTranscript(req, res) {
  try {
    const { conversationId } = req.params
    const teacherId = req.user.userId

    // Get transcript
    const transcript = await getConversationTranscript(conversationId)

    // Verify teacher owns the session
    const sessionCheck = await db.query(
      'SELECT teacher_id FROM sessions WHERE id = $1',
      [transcript.sessionId || 0]
    )

    if (sessionCheck.rows.length === 0 || sessionCheck.rows[0].teacher_id !== teacherId) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    res.json(transcript)

  } catch (error) {
    console.error('Get transcript error:', error)
    res.status(500).json({
      message: `Failed to get transcript: ${error.message}`
    })
  }
}

/**
 * Get student's own conversation
 * GET /api/reverse-tutoring/student/:studentId/conversation?sessionId=xxx&topic=xxx
 * Public: No auth required (students)
 */
export async function getStudentConversation(req, res) {
  try {
    const { studentId } = req.params
    const { sessionId, topic } = req.query

    if (!sessionId || !topic) {
      return res.status(400).json({
        message: 'Session ID and topic are required'
      })
    }

    const result = await db.query(
      `SELECT id, conversation_history, message_count, current_understanding_level, started_at
       FROM reverse_tutoring_conversations
       WHERE session_id = $1 AND student_id = $2 AND topic = $3`,
      [sessionId, studentId, topic]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Conversation not found' })
    }

    const conversation = result.rows[0]

    res.json({
      conversationId: conversation.id,
      history: JSON.parse(conversation.conversation_history),
      messageCount: conversation.message_count,
      understandingLevel: conversation.current_understanding_level,
      startedAt: conversation.started_at
    })

  } catch (error) {
    console.error('Get student conversation error:', error)
    res.status(500).json({
      message: `Failed to get conversation: ${error.message}`
    })
  }
}

/**
 * Create a new topic for reverse tutoring
 * POST /api/reverse-tutoring/topics
 * Body: { sessionId, topic, subject, gradeLevel, keyVocabulary, assignedStudentIds }
 * Protected: Teacher only
 */
export async function createTopic(req, res) {
  try {
    const teacherId = req.user.userId
    const {
      sessionId,
      topic,
      subject = 'Science',
      gradeLevel = '7th grade',
      keyVocabulary = [],
      assignedStudentIds = [] // Empty = available to all
    } = req.body

    // Validation
    if (!sessionId || !topic) {
      return res.status(400).json({
        message: 'Session ID and topic are required'
      })
    }

    // Verify teacher owns this session
    const sessionCheck = await db.query(
      'SELECT id FROM sessions WHERE id = $1 AND teacher_id = $2',
      [sessionId, teacherId]
    )

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found or unauthorized' })
    }

    // Check for duplicate topic
    const duplicateCheck = await db.query(
      'SELECT id FROM reverse_tutoring_topics WHERE session_id = $1 AND topic = $2',
      [sessionId, topic]
    )

    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({ message: 'Topic already exists for this session' })
    }

    // Create topic
    const result = await db.query(
      `INSERT INTO reverse_tutoring_topics (
        session_id, topic, subject, grade_level, key_vocabulary,
        assigned_student_ids, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        sessionId,
        topic,
        subject,
        gradeLevel,
        JSON.stringify(keyVocabulary),
        JSON.stringify(assignedStudentIds),
        teacherId
      ]
    )

    const newTopic = result.rows[0]

    res.json({
      message: 'Topic created successfully',
      topic: {
        id: newTopic.id,
        sessionId: newTopic.session_id,
        topic: newTopic.topic,
        subject: newTopic.subject,
        gradeLevel: newTopic.grade_level,
        keyVocabulary: JSON.parse(newTopic.key_vocabulary),
        assignedStudentIds: JSON.parse(newTopic.assigned_student_ids),
        createdAt: newTopic.created_at
      }
    })

  } catch (error) {
    console.error('Create topic error:', error)
    res.status(500).json({
      message: `Failed to create topic: ${error.message}`
    })
  }
}

/**
 * Get all topics for a session
 * GET /api/reverse-tutoring/session/:sessionId/topics
 * Public: No auth required (students need this)
 */
export async function getSessionTopics(req, res) {
  try {
    const { sessionId } = req.params
    const { studentId } = req.query // Optional: filter by student

    let query = `
      SELECT
        id, session_id, topic, subject, grade_level,
        key_vocabulary, assigned_student_ids, is_active, created_at
      FROM reverse_tutoring_topics
      WHERE session_id = $1 AND is_active = true
      ORDER BY created_at ASC
    `

    const result = await db.query(query, [sessionId])

    let topics = result.rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      topic: row.topic,
      subject: row.subject,
      gradeLevel: row.grade_level,
      keyVocabulary: JSON.parse(row.key_vocabulary),
      assignedStudentIds: JSON.parse(row.assigned_student_ids),
      isActive: row.is_active,
      createdAt: row.created_at
    }))

    // Filter by student if studentId provided
    if (studentId) {
      topics = topics.filter(t =>
        t.assignedStudentIds.length === 0 || // Available to all
        t.assignedStudentIds.includes(studentId) // Assigned to this student
      )
    }

    res.json({
      sessionId,
      topics,
      totalTopics: topics.length
    })

  } catch (error) {
    console.error('Get session topics error:', error)
    res.status(500).json({
      message: `Failed to get topics: ${error.message}`
    })
  }
}

/**
 * Update a topic
 * PUT /api/reverse-tutoring/topics/:topicId
 * Body: { topic, subject, gradeLevel, keyVocabulary, assignedStudentIds, isActive }
 * Protected: Teacher only
 */
export async function updateTopic(req, res) {
  try {
    const teacherId = req.user.userId
    const { topicId } = req.params
    const {
      topic,
      subject,
      gradeLevel,
      keyVocabulary,
      assignedStudentIds,
      isActive
    } = req.body

    // Verify teacher owns this topic's session
    const ownershipCheck = await db.query(
      `SELECT rt.id, s.teacher_id
       FROM reverse_tutoring_topics rt
       JOIN sessions s ON rt.session_id = s.id
       WHERE rt.id = $1`,
      [topicId]
    )

    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Topic not found' })
    }

    if (ownershipCheck.rows[0].teacher_id !== teacherId) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    // Build update query dynamically
    const updates = []
    const values = []
    let paramCount = 1

    if (topic !== undefined) {
      updates.push(`topic = $${paramCount++}`)
      values.push(topic)
    }
    if (subject !== undefined) {
      updates.push(`subject = $${paramCount++}`)
      values.push(subject)
    }
    if (gradeLevel !== undefined) {
      updates.push(`grade_level = $${paramCount++}`)
      values.push(gradeLevel)
    }
    if (keyVocabulary !== undefined) {
      updates.push(`key_vocabulary = $${paramCount++}`)
      values.push(JSON.stringify(keyVocabulary))
    }
    if (assignedStudentIds !== undefined) {
      updates.push(`assigned_student_ids = $${paramCount++}`)
      values.push(JSON.stringify(assignedStudentIds))
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`)
      values.push(isActive)
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No updates provided' })
    }

    values.push(topicId)

    const result = await db.query(
      `UPDATE reverse_tutoring_topics
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    )

    const updatedTopic = result.rows[0]

    res.json({
      message: 'Topic updated successfully',
      topic: {
        id: updatedTopic.id,
        sessionId: updatedTopic.session_id,
        topic: updatedTopic.topic,
        subject: updatedTopic.subject,
        gradeLevel: updatedTopic.grade_level,
        keyVocabulary: JSON.parse(updatedTopic.key_vocabulary),
        assignedStudentIds: JSON.parse(updatedTopic.assigned_student_ids),
        isActive: updatedTopic.is_active
      }
    })

  } catch (error) {
    console.error('Update topic error:', error)
    res.status(500).json({
      message: `Failed to update topic: ${error.message}`
    })
  }
}

/**
 * Delete a topic
 * DELETE /api/reverse-tutoring/topics/:topicId
 * Protected: Teacher only
 */
export async function deleteTopic(req, res) {
  try {
    const teacherId = req.user.userId
    const { topicId } = req.params

    // Verify teacher owns this topic's session
    const ownershipCheck = await db.query(
      `SELECT rt.id, s.teacher_id
       FROM reverse_tutoring_topics rt
       JOIN sessions s ON rt.session_id = s.id
       WHERE rt.id = $1`,
      [topicId]
    )

    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Topic not found' })
    }

    if (ownershipCheck.rows[0].teacher_id !== teacherId) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    // Delete the topic
    await db.query('DELETE FROM reverse_tutoring_topics WHERE id = $1', [topicId])

    res.json({ message: 'Topic deleted successfully' })

  } catch (error) {
    console.error('Delete topic error:', error)
    res.status(500).json({
      message: `Failed to delete topic: ${error.message}`
    })
  }
}

// Export multer upload middleware
export { upload }
