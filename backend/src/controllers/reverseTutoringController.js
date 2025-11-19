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
 * Body: { sessionId, studentId, topic, subject, gradeLevel, keyVocabulary, languageProficiency, nativeLanguage }
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
      keyVocabulary = [],
      languageProficiency = 'intermediate',
      nativeLanguage = 'en'
    } = req.body

    console.log('🚀 START conversation request:', { sessionId, studentId, topic, subject, gradeLevel, languageProficiency, nativeLanguage })

    // Validation
    if (!sessionId || !studentId || !topic) {
      console.log('❌ Missing required fields')
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

    console.log('👤 Student check:', studentCheck.rows.length > 0 ? 'Found' : 'Not found')

    if (studentCheck.rows.length === 0) {
      console.log('❌ Student not found in session')
      return res.status(404).json({ message: 'Student not found in this session' })
    }

    // Check if conversation already exists for this topic
    console.log('🔍 Checking for existing conversation:', { sessionId, studentId, topic })
    const existingConversation = await db.query(
      `SELECT id, is_blocked, blocked_reason FROM reverse_tutoring_conversations
       WHERE session_id = $1 AND student_id = $2 AND topic = $3`,
      [sessionId, studentId, topic]
    )

    console.log('📊 Existing conversations found:', existingConversation.rows.length)

    if (existingConversation.rows.length > 0) {
      const conversation = existingConversation.rows[0]

      // Check if student is blocked
      if (conversation.is_blocked) {
        console.log('🚫 Student is blocked from this conversation')
        return res.status(403).json({
          message: 'You have been removed from this conversation for off-topic discussion. Please ask your teacher for permission to rejoin.',
          blocked: true,
          reason: conversation.blocked_reason || 'Removed for off-topic discussion',
          conversationId: conversation.id
        })
      }

      console.log('⚠️  Conversation already exists:', conversation.id)
      return res.status(409).json({
        message: 'Conversation already exists for this topic',
        conversationId: conversation.id
      })
    }

    // Fetch topic settings for language complexity, response length, and controls
    console.log('📚 Fetching topic settings for:', topic)
    const topicSettings = await db.query(
      `SELECT language_complexity, response_length, max_student_responses, enforce_topic_focus
       FROM reverse_tutoring_topics
       WHERE session_id = $1 AND topic = $2 AND is_active = true
       LIMIT 1`,
      [sessionId, topic]
    )

    const languageComplexity = topicSettings.rows.length > 0 ? topicSettings.rows[0].language_complexity : 'standard'
    const responseLength = topicSettings.rows.length > 0 ? topicSettings.rows[0].response_length : 'medium'
    const maxStudentResponses = topicSettings.rows.length > 0 ? topicSettings.rows[0].max_student_responses : 10
    const enforceTopicFocus = topicSettings.rows.length > 0 ? topicSettings.rows[0].enforce_topic_focus : true

    console.log('⚙️  Topic settings:', { languageComplexity, responseLength, maxStudentResponses, enforceTopicFocus })
    console.log('🤖 Calling Claude API to start conversation...')

    // Start the conversation
    const result = await startReverseTutoringConversation(
      sessionId,
      studentId,
      {
        topic,
        subject,
        gradeLevel,
        keyVocabulary,
        languageProficiency,
        nativeLanguage,
        languageComplexity,
        responseLength,
        maxStudentResponses,
        enforceTopicFocus
      }
    )

    console.log('✅ Conversation started successfully:', result.conversationId)

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

    // Handle duplicate key constraint violation
    if (error.message && error.message.includes('duplicate key value violates unique constraint')) {
      console.log('⚠️  Caught duplicate key error, fetching existing conversation...')

      try {
        // Extract variables from req.body (they're not in scope here)
        const { sessionId, studentId, topic } = req.body

        // Fetch the existing conversation
        const existing = await db.query(
          `SELECT id FROM reverse_tutoring_conversations
           WHERE session_id = $1 AND student_id = $2 AND topic = $3`,
          [sessionId, studentId, topic]
        )

        if (existing.rows.length > 0) {
          return res.status(409).json({
            message: 'Conversation already exists for this topic',
            conversationId: existing.rows[0].id
          })
        }
      } catch (fetchError) {
        console.error('Error fetching existing conversation:', fetchError)
      }
    }

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

    // Check if student is blocked from this conversation
    const blockCheck = await db.query(
      `SELECT is_blocked, blocked_reason FROM reverse_tutoring_conversations WHERE id = $1`,
      [conversationId]
    )

    if (blockCheck.rows.length > 0 && blockCheck.rows[0].is_blocked) {
      return res.status(403).json({
        message: 'You have been removed from this conversation. Please ask your teacher for permission to rejoin.',
        blocked: true,
        reason: blockCheck.rows[0].blocked_reason || 'Removed for off-topic discussion'
      })
    }

    // Continue the conversation
    const result = await continueConversation(
      conversationId,
      studentMessage,
      { language, helpNeeded, vocabularyUsed }
    )

    // Include grace period warning if applicable
    const response = {
      message: 'Message sent successfully',
      ...result
    }

    if (req.inGracePeriod) {
      response.warning = {
        inGracePeriod: true,
        gracePeriodEndsAt: req.gracePeriodEndsAt,
        sessionStatus: req.session.status,
        message: req.session.status === 'paused'
          ? 'Session is paused. You have limited time to finish your thought.'
          : 'Session is ending. You have limited time to finish your thought.'
      }
    }

    res.json(response)

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

    console.log('📝 Getting transcript for conversation:', conversationId)

    // Get transcript
    const transcript = await getConversationTranscript(conversationId)

    console.log('✅ Transcript retrieved. Session ID:', transcript.sessionId)

    // Verify teacher owns the session
    const sessionCheck = await db.query(
      'SELECT teacher_id FROM sessions WHERE id = $1',
      [transcript.sessionId]
    )

    if (sessionCheck.rows.length === 0) {
      console.log('❌ Session not found:', transcript.sessionId)
      return res.status(404).json({ message: 'Session not found' })
    }

    if (sessionCheck.rows[0].teacher_id !== teacherId) {
      console.log('❌ Unauthorized access attempt. Teacher:', teacherId, 'Session owner:', sessionCheck.rows[0].teacher_id)
      return res.status(403).json({ message: 'Unauthorized' })
    }

    console.log('✅ Authorization successful, sending transcript')
    res.json(transcript)

  } catch (error) {
    console.error('Get transcript error:', error)
    console.error('Conversation ID:', req.params.conversationId)
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

    console.log('📖 GET student conversation:', { studentId, sessionId, topic })

    if (!sessionId || !topic) {
      console.log('❌ Missing required parameters')
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

    console.log('📊 Query result:', result.rows.length, 'conversations found')

    if (result.rows.length === 0) {
      console.log('❌ No conversation found for:', { sessionId, studentId, topic })
      return res.status(404).json({ message: 'Conversation not found' })
    }

    const conversation = result.rows[0]
    console.log('✅ Found conversation:', conversation.id)

    // Handle both string and object (PostgreSQL jsonb returns objects directly)
    const history = typeof conversation.conversation_history === 'string'
      ? JSON.parse(conversation.conversation_history)
      : conversation.conversation_history

    res.json({
      conversationId: conversation.id,
      history: history,
      messageCount: conversation.message_count,
      understandingLevel: conversation.current_understanding_level,
      startedAt: conversation.started_at
    })

  } catch (error) {
    console.error('❌ Get student conversation error:', error)
    console.error('   Parameters:', { studentId: req.params.studentId, sessionId: req.query.sessionId, topic: req.query.topic })
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
      languageComplexity = 'standard',
      responseLength = 'medium',
      maxStudentResponses = 10,
      enforceTopicFocus = true,
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

    // Ensure keyVocabulary is an array (sanitize input)
    let vocabArray = []
    if (Array.isArray(keyVocabulary)) {
      // Remove any quotes from vocabulary terms and filter empty
      vocabArray = keyVocabulary
        .map(term => typeof term === 'string' ? term.replace(/^["']|["']$/g, '').trim() : String(term).trim())
        .filter(term => term.length > 0)
    }

    // Ensure assignedStudentIds is an array
    const studentIdsArray = Array.isArray(assignedStudentIds) ? assignedStudentIds : []

    // Create topic
    const result = await db.query(
      `INSERT INTO reverse_tutoring_topics (
        session_id, topic, subject, grade_level, key_vocabulary,
        language_complexity, response_length, max_student_responses, enforce_topic_focus,
        assigned_student_ids, created_by
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10::jsonb, $11)
      RETURNING *`,
      [
        sessionId,
        topic,
        subject,
        gradeLevel,
        JSON.stringify(vocabArray),
        languageComplexity,
        responseLength,
        maxStudentResponses,
        enforceTopicFocus,
        JSON.stringify(studentIdsArray),
        teacherId
      ]
    )

    const newTopic = result.rows[0]

    // Handle both string and object (PostgreSQL jsonb returns objects directly)
    const parsedKeyVocabulary = typeof newTopic.key_vocabulary === 'string'
      ? JSON.parse(newTopic.key_vocabulary)
      : newTopic.key_vocabulary
    const parsedAssignedStudentIds = typeof newTopic.assigned_student_ids === 'string'
      ? JSON.parse(newTopic.assigned_student_ids)
      : newTopic.assigned_student_ids

    res.json({
      message: 'Topic created successfully',
      topic: {
        id: newTopic.id,
        sessionId: newTopic.session_id,
        topic: newTopic.topic,
        subject: newTopic.subject,
        gradeLevel: newTopic.grade_level,
        keyVocabulary: parsedKeyVocabulary,
        languageComplexity: newTopic.language_complexity,
        responseLength: newTopic.response_length,
        maxStudentResponses: newTopic.max_student_responses,
        enforceTopicFocus: newTopic.enforce_topic_focus,
        assignedStudentIds: parsedAssignedStudentIds,
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
        key_vocabulary, assigned_student_ids, is_active, created_at,
        language_complexity, response_length
      FROM reverse_tutoring_topics
      WHERE session_id = $1 AND is_active = true
      ORDER BY created_at ASC
    `

    const result = await db.query(query, [sessionId])

    // Safely parse topics with error handling for malformed JSON
    let topics = result.rows.map(row => {
      let keyVocabulary = []
      let assignedStudentIds = []

      // Safely parse key_vocabulary
      try {
        if (typeof row.key_vocabulary === 'string') {
          keyVocabulary = JSON.parse(row.key_vocabulary)
        } else if (Array.isArray(row.key_vocabulary)) {
          keyVocabulary = row.key_vocabulary
        }
      } catch (parseError) {
        console.warn(`Failed to parse key_vocabulary for topic ${row.id}:`, parseError.message)
        keyVocabulary = []
      }

      // Safely parse assigned_student_ids
      try {
        if (typeof row.assigned_student_ids === 'string') {
          assignedStudentIds = JSON.parse(row.assigned_student_ids)
        } else if (Array.isArray(row.assigned_student_ids)) {
          assignedStudentIds = row.assigned_student_ids
        }
      } catch (parseError) {
        console.warn(`Failed to parse assigned_student_ids for topic ${row.id}:`, parseError.message)
        assignedStudentIds = []
      }

      return {
        id: row.id,
        sessionId: row.session_id,
        topic: row.topic,
        subject: row.subject,
        gradeLevel: row.grade_level,
        keyVocabulary,
        assignedStudentIds,
        isActive: row.is_active,
        createdAt: row.created_at,
        languageComplexity: row.language_complexity || 'standard',
        responseLength: row.response_length || 'medium'
      }
    })

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
      languageComplexity,
      responseLength,
      maxStudentResponses,
      enforceTopicFocus,
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
      // Sanitize vocabulary terms (remove quotes)
      const vocabArray = Array.isArray(keyVocabulary)
        ? keyVocabulary
            .map(term => typeof term === 'string' ? term.replace(/^["']|["']$/g, '').trim() : String(term).trim())
            .filter(term => term.length > 0)
        : []
      values.push(JSON.stringify(vocabArray))
    }
    if (languageComplexity !== undefined) {
      updates.push(`language_complexity = $${paramCount++}`)
      values.push(languageComplexity)
    }
    if (responseLength !== undefined) {
      updates.push(`response_length = $${paramCount++}`)
      values.push(responseLength)
    }
    if (maxStudentResponses !== undefined) {
      updates.push(`max_student_responses = $${paramCount++}`)
      values.push(maxStudentResponses)
    }
    if (enforceTopicFocus !== undefined) {
      updates.push(`enforce_topic_focus = $${paramCount++}`)
      values.push(enforceTopicFocus)
    }
    if (assignedStudentIds !== undefined) {
      updates.push(`assigned_student_ids = $${paramCount++}`)
      const studentIdsArray = Array.isArray(assignedStudentIds) ? assignedStudentIds : []
      values.push(JSON.stringify(studentIdsArray))
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

    // Handle both string and object (PostgreSQL jsonb returns objects directly)
    const parsedKeyVocabulary = typeof updatedTopic.key_vocabulary === 'string'
      ? JSON.parse(updatedTopic.key_vocabulary)
      : updatedTopic.key_vocabulary
    const parsedAssignedStudentIds = typeof updatedTopic.assigned_student_ids === 'string'
      ? JSON.parse(updatedTopic.assigned_student_ids)
      : updatedTopic.assigned_student_ids

    res.json({
      message: 'Topic updated successfully',
      topic: {
        id: updatedTopic.id,
        sessionId: updatedTopic.session_id,
        topic: updatedTopic.topic,
        subject: updatedTopic.subject,
        gradeLevel: updatedTopic.grade_level,
        keyVocabulary: parsedKeyVocabulary,
        languageComplexity: updatedTopic.language_complexity,
        responseLength: updatedTopic.response_length,
        maxStudentResponses: updatedTopic.max_student_responses,
        enforceTopicFocus: updatedTopic.enforce_topic_focus,
        assignedStudentIds: parsedAssignedStudentIds,
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

/**
 * Unblock a student from a conversation (Teacher only)
 * POST /api/reverse-tutoring/:conversationId/unblock
 * Protected: Requires teacher authentication
 */
export async function unblockStudent(req, res) {
  try {
    const { conversationId } = req.params

    // Update conversation to unblock
    const result = await db.query(
      `UPDATE reverse_tutoring_conversations
       SET is_blocked = false,
           blocked_reason = null,
           blocked_at = null,
           off_topic_warnings = 0
       WHERE id = $1
       RETURNING student_id, topic`,
      [conversationId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Conversation not found' })
    }

    const conversation = result.rows[0]

    res.json({
      message: 'Student unblocked successfully',
      conversationId,
      studentId: conversation.student_id,
      topic: conversation.topic
    })

  } catch (error) {
    console.error('Unblock student error:', error)
    res.status(500).json({
      message: `Failed to unblock student: ${error.message}`
    })
  }
}

// Export multer upload middleware
export { upload }
