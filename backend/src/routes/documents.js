import express from 'express'
import {
  uploadAndGenerateActivity,
  saveDocument,
  generateFromSavedDocument,
  getSessionDocuments,
  updateDocumentContent,
  deleteDocument,
  documentUploadMiddleware
} from '../controllers/documentController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// All routes require authentication
router.use(authenticateToken)

/**
 * Upload document and generate activity from it immediately
 * POST /api/documents/upload
 * Multipart form data:
 *   - document: File (PDF, DOCX, TXT)
 *   - activityType: quiz | questions | discussion | reading
 *   - difficulty: easy | medium | hard
 *   - subject: string
 *   - sessionId: string
 */
router.post('/upload', documentUploadMiddleware, uploadAndGenerateActivity)

/**
 * Save document without generating activity
 * POST /api/documents/save
 * Multipart form data:
 *   - document: File (PDF, DOCX, TXT)
 *   - sessionId: string
 *   - title: string (optional)
 */
router.post('/save', documentUploadMiddleware, saveDocument)

/**
 * Get all saved documents for a session
 * GET /api/documents/session/:sessionId
 */
router.get('/session/:sessionId', getSessionDocuments)

/**
 * Update document content
 * PUT /api/documents/:documentId/content
 * Body:
 *   - extractedText: string
 */
router.put('/:documentId/content', updateDocumentContent)

/**
 * Delete a saved document
 * DELETE /api/documents/:documentId
 */
router.delete('/:documentId', deleteDocument)

/**
 * Generate activity from previously saved document
 * POST /api/documents/generate/:activityId
 * Body:
 *   - activityType: quiz | questions | discussion | reading
 *   - difficulty: easy | medium | hard
 */
router.post('/generate/:activityId', generateFromSavedDocument)

export default router
