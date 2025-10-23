import express from 'express'
import {
  uploadAndGenerateActivity,
  documentUploadMiddleware
} from '../controllers/documentController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// All routes require authentication
router.use(authenticateToken)

/**
 * Upload document and generate activity from it
 * POST /api/documents/upload
 * Multipart form data:
 *   - document: File (PDF, DOCX, TXT)
 *   - activityType: quiz | questions | discussion | reading
 *   - difficulty: easy | medium | hard
 *   - subject: string
 *   - sessionId: string
 */
router.post('/upload', documentUploadMiddleware, uploadAndGenerateActivity)

export default router
