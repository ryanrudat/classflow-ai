import express from 'express'
import { authenticateToken, optionalStudentAuth } from '../middleware/auth.js'
import {
  createPoll,
  submitVote,
  getPollResultsAPI
} from '../controllers/pollController.js'

const router = express.Router()

// Teacher routes
router.post(
  '/sessions/:sessionId/activities/poll',
  authenticateToken,
  createPoll
)

router.get(
  '/activities/:activityId/poll/results',
  getPollResultsAPI // Allow both teachers and students to see results
)

// Student routes
router.post(
  '/activities/:activityId/poll/vote',
  optionalStudentAuth,
  submitVote
)

export default router
