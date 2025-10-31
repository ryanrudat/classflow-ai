import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { studentAuthMiddleware } from '../middleware/studentAuth.js'
import {
  createInteractiveVideoActivity,
  addVideoQuestion,
  getVideoQuestions,
  updateVideoQuestion,
  deleteVideoQuestion,
  submitVideoQuestionResponse,
  updateVideoProgress,
  getVideoAnalytics
} from '../controllers/interactiveVideoController.js'

const router = express.Router()

// Teacher routes (require auth)
router.post('/sessions/:sessionId/activities/interactive-video',
  authMiddleware,
  createInteractiveVideoActivity
)

router.post('/activities/:activityId/video-questions',
  authMiddleware,
  addVideoQuestion
)

router.get('/activities/:activityId/video-questions',
  getVideoQuestions // Public for students
)

router.put('/video-questions/:questionId',
  authMiddleware,
  updateVideoQuestion
)

router.delete('/video-questions/:questionId',
  authMiddleware,
  deleteVideoQuestion
)

router.get('/activities/:activityId/video-analytics',
  authMiddleware,
  getVideoAnalytics
)

// Student routes (require student auth)
router.post('/video-questions/:questionId/respond',
  studentAuthMiddleware,
  submitVideoQuestionResponse
)

router.post('/activities/:activityId/video-progress',
  studentAuthMiddleware,
  updateVideoProgress
)

export default router
