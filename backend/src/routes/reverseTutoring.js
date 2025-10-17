import express from 'express'
import {
  transcribeAudio,
  startConversation,
  sendMessage,
  requestHelp,
  getDashboard,
  getTranscript,
  getStudentConversation,
  upload
} from '../controllers/reverseTutoringController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// PUBLIC ROUTES (Students)

/**
 * Transcribe speech to text
 * POST /api/reverse-tutoring/transcribe?language=en&topic=photosynthesis
 */
router.post('/transcribe', upload.single('audio'), transcribeAudio)

/**
 * Start new conversation
 * POST /api/reverse-tutoring/start
 * Body: { sessionId, studentId, topic, subject, gradeLevel, keyVocabulary }
 */
router.post('/start', startConversation)

/**
 * Send message in conversation
 * POST /api/reverse-tutoring/:conversationId/message
 * Body: { studentMessage, language, helpNeeded, vocabularyUsed }
 */
router.post('/:conversationId/message', sendMessage)

/**
 * Request scaffolding/help
 * POST /api/reverse-tutoring/:conversationId/help
 * Body: { struggleArea }
 */
router.post('/:conversationId/help', requestHelp)

/**
 * Get student's own conversation
 * GET /api/reverse-tutoring/student/:studentId/conversation?sessionId=xxx&topic=xxx
 */
router.get('/student/:studentId/conversation', getStudentConversation)

// PROTECTED ROUTES (Teachers)

/**
 * Get teacher dashboard for all conversations in session
 * GET /api/reverse-tutoring/session/:sessionId/dashboard
 */
router.get('/session/:sessionId/dashboard', authenticateToken, getDashboard)

/**
 * Get full conversation transcript
 * GET /api/reverse-tutoring/:conversationId/transcript
 */
router.get('/:conversationId/transcript', authenticateToken, getTranscript)

export default router
