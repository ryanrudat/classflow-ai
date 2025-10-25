import express from 'express'
import {
  pushActivity,
  submitResponse,
  getActivity,
  submitQuestionResponse,
  unlockActivity,
  getStudentCompletions,
  updateActivityContent
} from '../controllers/activityController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Protected routes (teacher only)
router.post('/:activityId/push', authenticateToken, pushActivity)
router.post('/:activityId/unlock', authenticateToken, unlockActivity)
router.put('/:activityId/content', authenticateToken, updateActivityContent)
router.get('/:activityId', authenticateToken, getActivity)
router.get('/completions/:studentAccountId', authenticateToken, getStudentCompletions)

// Public routes (students)
router.post('/:activityId/respond', submitResponse)
router.post('/:activityId/submit-question', submitQuestionResponse)

export default router
