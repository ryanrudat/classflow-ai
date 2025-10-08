import express from 'express'
import {
  createSession,
  getSession,
  endSession,
  reactivateSession,
  deleteSession,
  joinSession,
  getTeacherSessions
} from '../controllers/sessionController.js'
import { getSessionActivities } from '../controllers/activityController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Protected routes (teacher only)
router.post('/', authenticateToken, createSession)
router.get('/', authenticateToken, getTeacherSessions)
router.get('/:id', authenticateToken, getSession)
router.get('/:sessionId/activities', authenticateToken, getSessionActivities)
router.post('/:id/end', authenticateToken, endSession)
router.post('/:id/reactivate', authenticateToken, reactivateSession)
router.delete('/:id', authenticateToken, deleteSession)

// Public routes (students)
router.post('/join', joinSession)

export default router
