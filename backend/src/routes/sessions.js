import express from 'express'
import {
  createSession,
  getSession,
  getSessionStudents,
  endSession,
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
import { authenticateToken, optionalStudentAuth } from '../middleware/auth.js'

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
router.post('/:id/end', authenticateToken, endSession)
router.post('/:id/reactivate', authenticateToken, reactivateSession)
router.delete('/:id', authenticateToken, deleteSession)

// Public routes (students) - with optional authentication
router.post('/join', optionalStudentAuth, joinSession)

export default router
