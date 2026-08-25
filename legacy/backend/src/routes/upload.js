import express from 'express'
import {
  uploadImage,
  getUserImages,
  deleteImage,
  uploadMiddleware
} from '../controllers/uploadController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// All routes require authentication
router.use(authenticateToken)

// Upload an image
router.post('/image', uploadMiddleware, uploadImage)

// Get all images for current user
router.get('/images', getUserImages)

// Delete an image
router.delete('/images/:imageId', deleteImage)

export default router
