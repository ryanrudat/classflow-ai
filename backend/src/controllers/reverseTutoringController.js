import {
  transcribeStudentSpeech,
  startReverseTutoringConversation,
  continueConversation,
  getScaffolding,
  getTeacherDashboard,
  getConversationTranscript
} from '../services/reverseTutoringService.js'
import {
  needsSummarization,
  summarizeDocument,
  combineDocumentContexts
} from '../services/documentSummarizationService.js'
import { extractTextFromPPTX } from '../utils/pptxParser.js'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import fs from 'fs/promises'
import mammoth from 'mammoth'
import db from '../database/db.js'

const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

    // Fetch topic settings for language complexity, response length, controls, and lesson context
    console.log('📚 Fetching topic settings for:', topic)
    const topicSettings = await db.query(
      `SELECT language_complexity, response_length, max_student_responses, enforce_topic_focus,
              concepts_covered, expected_explanations, critical_thinking_topics, critical_thinking_depth,
              document_context
       FROM reverse_tutoring_topics
       WHERE session_id = $1 AND topic = $2 AND is_active = true
       LIMIT 1`,
      [sessionId, topic]
    )

    const ts = topicSettings.rows[0] || {}
    const languageComplexity = ts.language_complexity || 'standard'
    const responseLength = ts.response_length || 'medium'
    const maxStudentResponses = ts.max_student_responses || 10
    const enforceTopicFocus = ts.enforce_topic_focus !== false

    // Parse lesson context fields
    const conceptsCovered = Array.isArray(ts.concepts_covered) ? ts.concepts_covered : []
    const expectedExplanations = Array.isArray(ts.expected_explanations) ? ts.expected_explanations : []
    const criticalThinkingTopics = Array.isArray(ts.critical_thinking_topics) ? ts.critical_thinking_topics : []
    const criticalThinkingDepth = ts.critical_thinking_depth || 'none'
    const documentContext = ts.document_context || null

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
        enforceTopicFocus,
        // Lesson context
        conceptsCovered,
        expectedExplanations,
        criticalThinkingTopics,
        criticalThinkingDepth,
        documentContext
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
      subjectId = null, // New: hierarchical subject reference
      subjectPath = null, // New: denormalized path "Science > Life Science > Biology"
      gradeLevel = '7th grade',
      keyVocabulary = [],
      languageComplexity = 'standard',
      responseLength = 'medium',
      maxStudentResponses = 10,
      enforceTopicFocus = true,
      assignedStudentIds = [], // Empty = available to all
      // Collaboration settings
      allowCollaboration = false,
      collaborationMode = 'pass_the_mic',
      maxCollaborators = 2,
      // Standards (will be linked separately)
      standardIds = [],
      // Lesson context for ALEX
      conceptsCovered = [],
      expectedExplanations = [],
      criticalThinkingTopics = [],
      criticalThinkingDepth = 'none'
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

    // Get subject path if subjectId provided
    let computedSubjectPath = subjectPath
    if (subjectId && !subjectPath) {
      try {
        const pathResult = await db.query(
          'SELECT get_subject_path($1) as path',
          [subjectId]
        )
        computedSubjectPath = pathResult.rows[0]?.path || subject
      } catch (err) {
        console.warn('Could not compute subject path:', err.message)
        computedSubjectPath = subject
      }
    }

    // Ensure lesson context arrays are valid
    const conceptsArray = Array.isArray(conceptsCovered) ? conceptsCovered.filter(c => c && c.trim()) : []
    const explanationsArray = Array.isArray(expectedExplanations) ? expectedExplanations.filter(e => e && e.trim()) : []
    const ctTopicsArray = Array.isArray(criticalThinkingTopics) ? criticalThinkingTopics.filter(t => t && t.trim()) : []
    const ctDepth = ['none', 'light', 'moderate'].includes(criticalThinkingDepth) ? criticalThinkingDepth : 'none'

    // Create topic
    const result = await db.query(
      `INSERT INTO reverse_tutoring_topics (
        session_id, topic, subject, subject_id, subject_path, grade_level, key_vocabulary,
        language_complexity, response_length, max_student_responses, enforce_topic_focus,
        assigned_student_ids, allow_collaboration, collaboration_mode, max_collaborators,
        concepts_covered, expected_explanations, critical_thinking_topics, critical_thinking_depth,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12::jsonb, $13, $14, $15, $16::jsonb, $17::jsonb, $18::jsonb, $19, $20)
      RETURNING *`,
      [
        sessionId,
        topic,
        subject,
        subjectId,
        computedSubjectPath,
        gradeLevel,
        JSON.stringify(vocabArray),
        languageComplexity,
        responseLength,
        maxStudentResponses,
        enforceTopicFocus,
        JSON.stringify(studentIdsArray),
        allowCollaboration,
        collaborationMode,
        maxCollaborators,
        JSON.stringify(conceptsArray),
        JSON.stringify(explanationsArray),
        JSON.stringify(ctTopicsArray),
        ctDepth,
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

    // Link standards if provided
    if (standardIds && standardIds.length > 0) {
      for (const standardId of standardIds) {
        await db.query(
          `INSERT INTO topic_standards (topic_id, standard_id, is_primary)
           VALUES ($1, $2, $3)
           ON CONFLICT (topic_id, standard_id) DO NOTHING`,
          [newTopic.id, standardId, standardId === standardIds[0]]
        )
      }
    }

    // Parse new JSONB fields
    const parsedConceptsCovered = typeof newTopic.concepts_covered === 'string'
      ? JSON.parse(newTopic.concepts_covered)
      : newTopic.concepts_covered || []
    const parsedExpectedExplanations = typeof newTopic.expected_explanations === 'string'
      ? JSON.parse(newTopic.expected_explanations)
      : newTopic.expected_explanations || []
    const parsedCriticalThinkingTopics = typeof newTopic.critical_thinking_topics === 'string'
      ? JSON.parse(newTopic.critical_thinking_topics)
      : newTopic.critical_thinking_topics || []

    res.json({
      message: 'Topic created successfully',
      topic: {
        id: newTopic.id,
        sessionId: newTopic.session_id,
        topic: newTopic.topic,
        subject: newTopic.subject,
        subjectId: newTopic.subject_id,
        subjectPath: newTopic.subject_path,
        gradeLevel: newTopic.grade_level,
        keyVocabulary: parsedKeyVocabulary,
        languageComplexity: newTopic.language_complexity,
        responseLength: newTopic.response_length,
        maxStudentResponses: newTopic.max_student_responses,
        enforceTopicFocus: newTopic.enforce_topic_focus,
        assignedStudentIds: parsedAssignedStudentIds,
        allowCollaboration: newTopic.allow_collaboration,
        collaborationMode: newTopic.collaboration_mode,
        maxCollaborators: newTopic.max_collaborators,
        conceptsCovered: parsedConceptsCovered,
        expectedExplanations: parsedExpectedExplanations,
        criticalThinkingTopics: parsedCriticalThinkingTopics,
        criticalThinkingDepth: newTopic.critical_thinking_depth || 'none',
        linkedStandardsCount: standardIds.length,
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
        id, session_id, topic, subject, subject_id, subject_path, grade_level,
        key_vocabulary, assigned_student_ids, is_active, created_at,
        language_complexity, response_length, max_student_responses, enforce_topic_focus,
        allow_collaboration, collaboration_mode, max_collaborators,
        concepts_covered, expected_explanations, critical_thinking_topics, critical_thinking_depth
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

      // Safely parse lesson context fields
      let conceptsCovered = []
      let expectedExplanations = []
      let criticalThinkingTopics = []

      try {
        conceptsCovered = typeof row.concepts_covered === 'string'
          ? JSON.parse(row.concepts_covered)
          : (Array.isArray(row.concepts_covered) ? row.concepts_covered : [])
      } catch (e) { conceptsCovered = [] }

      try {
        expectedExplanations = typeof row.expected_explanations === 'string'
          ? JSON.parse(row.expected_explanations)
          : (Array.isArray(row.expected_explanations) ? row.expected_explanations : [])
      } catch (e) { expectedExplanations = [] }

      try {
        criticalThinkingTopics = typeof row.critical_thinking_topics === 'string'
          ? JSON.parse(row.critical_thinking_topics)
          : (Array.isArray(row.critical_thinking_topics) ? row.critical_thinking_topics : [])
      } catch (e) { criticalThinkingTopics = [] }

      return {
        id: row.id,
        sessionId: row.session_id,
        topic: row.topic,
        subject: row.subject,
        subjectId: row.subject_id,
        subjectPath: row.subject_path,
        gradeLevel: row.grade_level,
        keyVocabulary,
        assignedStudentIds,
        isActive: row.is_active,
        createdAt: row.created_at,
        languageComplexity: row.language_complexity || 'standard',
        responseLength: row.response_length || 'medium',
        maxStudentResponses: row.max_student_responses || 10,
        enforceTopicFocus: row.enforce_topic_focus !== false,
        allowCollaboration: row.allow_collaboration || false,
        collaborationMode: row.collaboration_mode || 'pass_the_mic',
        maxCollaborators: row.max_collaborators || 2,
        conceptsCovered,
        expectedExplanations,
        criticalThinkingTopics,
        criticalThinkingDepth: row.critical_thinking_depth || 'none'
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
      subjectId,
      subjectPath,
      gradeLevel,
      keyVocabulary,
      languageComplexity,
      responseLength,
      maxStudentResponses,
      enforceTopicFocus,
      assignedStudentIds,
      isActive,
      // Collaboration settings
      allowCollaboration,
      collaborationMode,
      maxCollaborators,
      // Lesson context for ALEX
      conceptsCovered,
      expectedExplanations,
      criticalThinkingTopics,
      criticalThinkingDepth
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
    // Collaboration settings
    if (allowCollaboration !== undefined) {
      updates.push(`allow_collaboration = $${paramCount++}`)
      values.push(allowCollaboration)
    }
    if (collaborationMode !== undefined) {
      updates.push(`collaboration_mode = $${paramCount++}`)
      values.push(collaborationMode)
    }
    if (maxCollaborators !== undefined) {
      updates.push(`max_collaborators = $${paramCount++}`)
      values.push(maxCollaborators)
    }
    // Subject hierarchy
    if (subjectId !== undefined) {
      updates.push(`subject_id = $${paramCount++}`)
      values.push(subjectId)
    }
    if (subjectPath !== undefined) {
      updates.push(`subject_path = $${paramCount++}`)
      values.push(subjectPath)
    }
    // Lesson context for ALEX
    if (conceptsCovered !== undefined) {
      updates.push(`concepts_covered = $${paramCount++}`)
      const conceptsArray = Array.isArray(conceptsCovered) ? conceptsCovered.filter(c => c && c.trim()) : []
      values.push(JSON.stringify(conceptsArray))
    }
    if (expectedExplanations !== undefined) {
      updates.push(`expected_explanations = $${paramCount++}`)
      const explanationsArray = Array.isArray(expectedExplanations) ? expectedExplanations.filter(e => e && e.trim()) : []
      values.push(JSON.stringify(explanationsArray))
    }
    if (criticalThinkingTopics !== undefined) {
      updates.push(`critical_thinking_topics = $${paramCount++}`)
      const ctTopicsArray = Array.isArray(criticalThinkingTopics) ? criticalThinkingTopics.filter(t => t && t.trim()) : []
      values.push(JSON.stringify(ctTopicsArray))
    }
    if (criticalThinkingDepth !== undefined) {
      updates.push(`critical_thinking_depth = $${paramCount++}`)
      const ctDepth = ['none', 'light', 'moderate'].includes(criticalThinkingDepth) ? criticalThinkingDepth : 'none'
      values.push(ctDepth)
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
    // Parse new JSONB fields
    const parsedConceptsCovered = typeof updatedTopic.concepts_covered === 'string'
      ? JSON.parse(updatedTopic.concepts_covered)
      : updatedTopic.concepts_covered || []
    const parsedExpectedExplanations = typeof updatedTopic.expected_explanations === 'string'
      ? JSON.parse(updatedTopic.expected_explanations)
      : updatedTopic.expected_explanations || []
    const parsedCriticalThinkingTopics = typeof updatedTopic.critical_thinking_topics === 'string'
      ? JSON.parse(updatedTopic.critical_thinking_topics)
      : updatedTopic.critical_thinking_topics || []

    res.json({
      message: 'Topic updated successfully',
      topic: {
        id: updatedTopic.id,
        sessionId: updatedTopic.session_id,
        topic: updatedTopic.topic,
        subject: updatedTopic.subject,
        subjectId: updatedTopic.subject_id,
        subjectPath: updatedTopic.subject_path,
        gradeLevel: updatedTopic.grade_level,
        keyVocabulary: parsedKeyVocabulary,
        languageComplexity: updatedTopic.language_complexity,
        responseLength: updatedTopic.response_length,
        maxStudentResponses: updatedTopic.max_student_responses,
        enforceTopicFocus: updatedTopic.enforce_topic_focus,
        assignedStudentIds: parsedAssignedStudentIds,
        isActive: updatedTopic.is_active,
        allowCollaboration: updatedTopic.allow_collaboration,
        collaborationMode: updatedTopic.collaboration_mode,
        maxCollaborators: updatedTopic.max_collaborators,
        conceptsCovered: parsedConceptsCovered,
        expectedExplanations: parsedExpectedExplanations,
        criticalThinkingTopics: parsedCriticalThinkingTopics,
        criticalThinkingDepth: updatedTopic.critical_thinking_depth || 'none'
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

// =====================================================
// TOPIC DOCUMENT UPLOAD FUNCTIONS
// =====================================================

// Configure multer for topic document uploads (disk storage)
const topicDocumentStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../temp-uploads')
    try {
      await fs.mkdir(uploadDir, { recursive: true })
      cb(null, uploadDir)
    } catch (error) {
      cb(error)
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  }
})

export const topicDocumentUpload = multer({
  storage: topicDocumentStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|docx|doc|txt|md|pptx/
    const ext = allowed.test(path.extname(file.originalname).toLowerCase())
    const mimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/markdown'
    ]
    const mime = mimeTypes.includes(file.mimetype) || file.mimetype.startsWith('text/')

    if (ext || mime) {
      cb(null, true)
    } else {
      cb(new Error('Only PDF, Word, PowerPoint, and text files are allowed'))
    }
  }
})

/**
 * Extract text content from uploaded file (supports PDF, DOCX, PPTX, TXT, MD)
 */
async function extractTextFromDocument(filePath, mimetype, originalname) {
  const ext = path.extname(originalname).toLowerCase()

  try {
    // PowerPoint files
    if (ext === '.pptx' || mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      return await extractTextFromPPTX(filePath)
    }

    // PDF files
    if (ext === '.pdf' || mimetype === 'application/pdf') {
      const dataBuffer = await fs.readFile(filePath)
      const data = await pdfParse(dataBuffer)
      return data.text
    }

    // Word documents (.docx)
    if (ext === '.docx' || mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ path: filePath })
      return result.value
    }

    // Text files (.txt, .md, etc.)
    if (ext === '.txt' || ext === '.md' || mimetype.startsWith('text/')) {
      const content = await fs.readFile(filePath, 'utf-8')
      return content
    }

    throw new Error('Unsupported file format')
  } catch (error) {
    console.error('Text extraction error:', error)
    throw new Error(`Failed to extract text: ${error.message}`)
  }
}

/**
 * Regenerate combined document context for a topic
 * Called after documents are added or removed
 */
async function regenerateDocumentContext(topicId) {
  const docs = await db.query(
    `SELECT original_filename, extracted_text, is_summarized, summary, uploaded_at
     FROM reverse_tutoring_topic_documents
     WHERE topic_id = $1
     ORDER BY uploaded_at DESC`,
    [topicId]
  )

  const combinedContext = combineDocumentContexts(docs.rows)

  await db.query(
    `UPDATE reverse_tutoring_topics
     SET document_context = $1, document_context_updated_at = NOW()
     WHERE id = $2`,
    [combinedContext, topicId]
  )

  return combinedContext
}

/**
 * Upload documents to a topic
 * POST /api/reverse-tutoring/topics/:topicId/documents
 * Protected: Teacher only
 */
export async function uploadTopicDocuments(req, res) {
  try {
    const { topicId } = req.params
    const teacherId = req.user.userId
    const files = req.files // Multiple files support

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' })
    }

    // Verify topic ownership
    const topicCheck = await db.query(
      `SELECT rt.id, rt.session_id, s.teacher_id
       FROM reverse_tutoring_topics rt
       JOIN sessions s ON rt.session_id = s.id
       WHERE rt.id = $1`,
      [topicId]
    )

    if (topicCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Topic not found' })
    }

    if (topicCheck.rows[0].teacher_id !== teacherId) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    const uploadedDocs = []

    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase().replace('.', '')
      let extractedText

      try {
        // Extract text based on file type
        extractedText = await extractTextFromDocument(file.path, file.mimetype, file.originalname)
      } catch (extractError) {
        console.error(`Failed to extract text from ${file.originalname}:`, extractError)
        // Clean up temp file
        try { await fs.unlink(file.path) } catch {}
        continue // Skip this file but continue with others
      }

      // Check if summarization is needed
      let summary = null
      let isSummarized = false

      if (needsSummarization(extractedText.length)) {
        try {
          summary = await summarizeDocument(
            extractedText,
            file.originalname,
            ext.toUpperCase()
          )
          isSummarized = true
        } catch (summaryError) {
          console.error('Summarization failed, using truncation:', summaryError.message)
          // Fall back to truncation
          summary = extractedText.substring(0, 2000) + '\n\n[Content truncated due to length]'
          isSummarized = true
        }
      }

      // Save to database
      const result = await db.query(
        `INSERT INTO reverse_tutoring_topic_documents (
          topic_id, original_filename, file_type, file_size_bytes,
          extracted_text, text_length, is_summarized, summary,
          summary_generated_at, uploaded_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, original_filename, file_type, file_size_bytes, text_length, is_summarized, uploaded_at`,
        [
          topicId,
          file.originalname,
          ext,
          file.size,
          extractedText,
          extractedText.length,
          isSummarized,
          summary,
          isSummarized ? new Date() : null,
          teacherId
        ]
      )

      uploadedDocs.push(result.rows[0])

      // Clean up temp file
      try {
        await fs.unlink(file.path)
      } catch (unlinkError) {
        console.warn('Failed to delete temp file:', unlinkError.message)
      }
    }

    if (uploadedDocs.length === 0) {
      return res.status(400).json({ message: 'No documents could be processed' })
    }

    // Regenerate combined document context
    await regenerateDocumentContext(topicId)

    res.json({
      success: true,
      documents: uploadedDocs,
      message: `${uploadedDocs.length} document(s) uploaded successfully`
    })

  } catch (error) {
    console.error('Upload topic documents error:', error)

    // Clean up temp files on error
    if (req.files) {
      for (const file of req.files) {
        try { await fs.unlink(file.path) } catch {}
      }
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload documents'
    })
  }
}

/**
 * Get all documents for a topic
 * GET /api/reverse-tutoring/topics/:topicId/documents
 * Protected: Teacher only
 */
export async function getTopicDocuments(req, res) {
  try {
    const { topicId } = req.params
    const teacherId = req.user.userId

    // Verify ownership
    const topicCheck = await db.query(
      `SELECT rt.id, s.teacher_id
       FROM reverse_tutoring_topics rt
       JOIN sessions s ON rt.session_id = s.id
       WHERE rt.id = $1`,
      [topicId]
    )

    if (topicCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Topic not found' })
    }

    if (topicCheck.rows[0].teacher_id !== teacherId) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    const result = await db.query(
      `SELECT id, original_filename, file_type, file_size_bytes,
              text_length, is_summarized, uploaded_at
       FROM reverse_tutoring_topic_documents
       WHERE topic_id = $1
       ORDER BY uploaded_at DESC`,
      [topicId]
    )

    res.json({
      success: true,
      documents: result.rows
    })

  } catch (error) {
    console.error('Get topic documents error:', error)
    res.status(500).json({ message: error.message })
  }
}

/**
 * Delete a document from a topic
 * DELETE /api/reverse-tutoring/topics/:topicId/documents/:documentId
 * Protected: Teacher only
 */
export async function deleteTopicDocument(req, res) {
  try {
    const { topicId, documentId } = req.params
    const teacherId = req.user.userId

    // Verify ownership
    const docCheck = await db.query(
      `SELECT d.id, d.topic_id, s.teacher_id
       FROM reverse_tutoring_topic_documents d
       JOIN reverse_tutoring_topics rt ON d.topic_id = rt.id
       JOIN sessions s ON rt.session_id = s.id
       WHERE d.id = $1 AND d.topic_id = $2`,
      [documentId, topicId]
    )

    if (docCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Document not found' })
    }

    if (docCheck.rows[0].teacher_id !== teacherId) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    await db.query('DELETE FROM reverse_tutoring_topic_documents WHERE id = $1', [documentId])

    // Regenerate combined document context
    await regenerateDocumentContext(topicId)

    res.json({ success: true, message: 'Document deleted' })

  } catch (error) {
    console.error('Delete topic document error:', error)
    res.status(500).json({ message: error.message })
  }
}

// Export multer upload middleware
export { upload }
