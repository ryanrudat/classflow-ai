import express from 'express'
import {
  createSession,
  getSession,
  getSessionStudents,
  endSession,
  pauseSession,
  resumeSession,
  reactivateSession,
  deleteSession,
  joinSession,
  getTeacherSessions,
  getSessionInstances,
  getInstanceDetails,
  getActivityProgress,
  exportGrades
} from '../controllers/sessionController.js'
import { getSessionActivities } from '../controllers/activityController.js'
import { getLeaderboard, getMyScore } from '../controllers/sentenceOrderingController.js'
import { authenticateToken, optionalStudentAuth, authenticateStudent } from '../middleware/auth.js'

const router = express.Router()

// Protected routes (teacher only)
router.post('/', authenticateToken, createSession)
router.get('/', authenticateToken, getTeacherSessions)
router.get('/:id', authenticateToken, getSession)
router.get('/:id/students', authenticateToken, getSessionStudents)
router.get('/:id/instances', authenticateToken, getSessionInstances)
router.get('/:sessionId/instances/:instanceId', authenticateToken, getInstanceDetails)
router.get('/:sessionId/activities', authenticateToken, getSessionActivities)
router.get('/:sessionId/activities/:activityId/progress', authenticateToken, getActivityProgress)
router.get('/:sessionId/export-grades', authenticateToken, exportGrades)
router.get('/:sessionId/instances/:instanceId/leaderboard', authenticateToken, getLeaderboard)
router.post('/:id/end', authenticateToken, endSession)
router.post('/:id/pause', authenticateToken, pauseSession)
router.post('/:id/resume', authenticateToken, resumeSession)
router.post('/:id/reactivate', authenticateToken, reactivateSession)
router.delete('/:id', authenticateToken, deleteSession)

// Public routes (students) - with optional authentication
router.post('/join', optionalStudentAuth, joinSession)

// Student routes (require student authentication)
router.get('/:sessionId/instances/:instanceId/my-score', authenticateStudent, getMyScore)

export default router
