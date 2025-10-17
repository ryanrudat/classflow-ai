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

export default {
  transcribeAudio,
  startConversation,
  sendMessage,
  requestHelp,
  getDashboard,
  getTranscript,
  getStudentConversation,
  upload // Export multer middleware
}
