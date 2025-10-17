import express from 'express'
import {
  transcribeAudio,
  startConversation,
  sendMessage,
  requestHelp,
  getDashboard,
  getTranscript,
  getStudentConversation,
  createTopic,
  getSessionTopics,
  updateTopic,
  deleteTopic,
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
 * Get available topics for a session (filtered by student if provided)
 * GET /api/reverse-tutoring/session/:sessionId/topics?studentId=xxx
 */
router.get('/session/:sessionId/topics', getSessionTopics)

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

/**
 * Create a new topic
 * POST /api/reverse-tutoring/topics
 * Body: { sessionId, topic, subject, gradeLevel, keyVocabulary, assignedStudentIds }
 */
router.post('/topics', authenticateToken, createTopic)

/**
 * Update a topic
 * PUT /api/reverse-tutoring/topics/:topicId
 * Body: { topic, subject, gradeLevel, keyVocabulary, assignedStudentIds, isActive }
 */
router.put('/topics/:topicId', authenticateToken, updateTopic)

/**
 * Delete a topic
 * DELETE /api/reverse-tutoring/topics/:topicId
 */
router.delete('/topics/:topicId', authenticateToken, deleteTopic)

export default router
