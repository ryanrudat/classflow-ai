import express from 'express'
import {
  createSession,
  updateSession,
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
  getInstanceDetails
} from '../controllers/sessionController.js'
import { authenticateToken, optionalStudentAuth } from '../middleware/auth.js'

const router = express.Router()

// Protected routes (teacher only)
router.post('/', authenticateToken, createSession)
router.put('/:id', authenticateToken, updateSession)
router.get('/', authenticateToken, getTeacherSessions)
router.get('/:id', authenticateToken, getSession)
router.get('/:id/students', authenticateToken, getSessionStudents)
router.get('/:id/instances', authenticateToken, getSessionInstances)
router.get('/:sessionId/instances/:instanceId', authenticateToken, getInstanceDetails)
router.post('/:id/end', authenticateToken, endSession)
router.post('/:id/pause', authenticateToken, pauseSession)
router.post('/:id/resume', authenticateToken, resumeSession)
router.post('/:id/reactivate', authenticateToken, reactivateSession)
router.delete('/:id', authenticateToken, deleteSession)

// Public route (students join with code)
router.post('/join', optionalStudentAuth, joinSession)

export default router
