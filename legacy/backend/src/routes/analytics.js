import express from 'express'
import { getSessionAnalytics, getStudentAnalytics } from '../controllers/analyticsController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// All analytics routes require authentication
router.get('/sessions/:sessionId/analytics', authenticateToken, getSessionAnalytics)
router.get('/students/:studentId/analytics', authenticateToken, getStudentAnalytics)

export default router
