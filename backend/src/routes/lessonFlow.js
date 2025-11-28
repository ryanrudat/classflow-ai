import express from 'express'
import { authenticateToken, optionalStudentAuth } from '../middleware/auth.js'
import {
  createLessonFlow,
  getSessionLessonFlows,
  getLessonFlowDetails,
  updateLessonFlow,
  startLessonFlow,
  getCurrentActivity,
  advanceToNext,
  stopLessonFlow,
  deleteLessonFlow
} from '../controllers/lessonFlowController.js'

const router = express.Router()

// Teacher routes
router.post(
  '/sessions/:sessionId/lesson-flows',
  authenticateToken,
  createLessonFlow
)

router.get(
  '/sessions/:sessionId/lesson-flows',
  authenticateToken,
  getSessionLessonFlows
)

router.get(
  '/lesson-flows/:flowId',
  authenticateToken,
  getLessonFlowDetails
)

router.put(
  '/lesson-flows/:flowId',
  authenticateToken,
  updateLessonFlow
)

router.post(
  '/lesson-flows/:flowId/start',
  authenticateToken,
  startLessonFlow
)

router.post(
  '/lesson-flows/:flowId/stop',
  authenticateToken,
  stopLessonFlow
)

router.delete(
  '/lesson-flows/:flowId',
  authenticateToken,
  deleteLessonFlow
)

// Student routes (with optional auth)
router.get(
  '/lesson-flows/:flowId/current-activity',
  optionalStudentAuth,
  getCurrentActivity
)

router.post(
  '/lesson-flows/:flowId/advance',
  optionalStudentAuth,
  advanceToNext
)

export default router
