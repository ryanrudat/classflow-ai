import express from 'express'
import {
  pushActivity,
  submitResponse,
  getActivity,
  submitQuestionResponse
} from '../controllers/activityController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Protected routes (teacher only)
router.post('/:activityId/push', authenticateToken, pushActivity)
router.get('/:activityId', authenticateToken, getActivity)

// Public routes (students)
router.post('/:activityId/respond', submitResponse)
router.post('/:activityId/submit-question', submitQuestionResponse)

export default router
