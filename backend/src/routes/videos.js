import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import {
  uploadVideo,
  getUserVideos,
  deleteVideo,
  transcribeVideo,
  generateQuestionsFromTranscript,
  uploadMiddleware
} from '../controllers/videoController.js'

const router = express.Router()

// All routes require authentication
router.use(authenticateToken)

// Video upload
router.post('/upload', uploadMiddleware, uploadVideo)

// Get user's videos
router.get('/', getUserVideos)

// Delete video
router.delete('/:videoId', deleteVideo)

// Transcribe video
router.post('/:videoId/transcribe', transcribeVideo)

// Generate AI questions from transcript
router.post('/:videoId/generate-questions', generateQuestionsFromTranscript)

export default router
