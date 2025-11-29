import express from 'express'
import {
  pushActivity,
  submitResponse,
  getActivity,
  submitQuestionResponse,
  unlockActivity,
  getStudentCompletions,
  updateActivityContent,
  deleteActivity
} from '../controllers/activityController.js'
import {
  submitSentenceOrdering,
  getLeaderboard,
  getMyScore
} from '../controllers/sentenceOrderingController.js'
import { authenticateToken, optionalStudentAuth } from '../middleware/auth.js'

const router = express.Router()

// Protected routes (teacher only)
router.post('/:activityId/push', authenticateToken, pushActivity)
router.post('/:activityId/unlock', authenticateToken, unlockActivity)
router.put('/:activityId/content', authenticateToken, updateActivityContent)
router.delete('/:activityId', authenticateToken, deleteActivity)
router.get('/:activityId', authenticateToken, getActivity)
router.get('/completions/:studentAccountId', authenticateToken, getStudentCompletions)

// Public routes (students)
router.post('/:activityId/respond', submitResponse)
router.post('/:activityId/submit-question', submitQuestionResponse)

// Sentence ordering routes (optional auth - lesson flow students may not have token)
router.post('/:activityId/sentence-ordering/submit', optionalStudentAuth, submitSentenceOrdering)

export default router
