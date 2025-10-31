import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import {
  uploadVideo,
  getUserVideos,
  deleteVideo,
  uploadMiddleware
} from '../controllers/videoController.js'

const router = express.Router()

// All routes require authentication
router.use(authMiddleware)

// Video upload
router.post('/upload', uploadMiddleware, uploadVideo)

// Get user's videos
router.get('/', getUserVideos)

// Delete video
router.delete('/:videoId', deleteVideo)

export default router
