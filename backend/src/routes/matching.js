import express from 'express'
import { authenticateToken, optionalStudentAuth } from '../middleware/auth.js'
import {
  createMatchingActivity,
  submitMatchingResponse,
  getMatchingAnalytics
} from '../controllers/matchingController.js'

const router = express.Router()

// Teacher routes
router.post(
  '/sessions/:sessionId/activities/matching',
  authenticateToken,
  createMatchingActivity
)

router.get(
  '/activities/:activityId/matching/analytics',
  authenticateToken,
  getMatchingAnalytics
)

// Student routes (with optional auth)
router.post(
  '/activities/:activityId/matching/submit',
  optionalStudentAuth,
  submitMatchingResponse
)

export default router
