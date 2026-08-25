import express from 'express'
import {
  requestHelp,
  acceptSimplerVersion,
  getHelpHistory
} from '../controllers/studentHelpController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Public routes (students don't need auth)
router.post('/request', requestHelp)
router.post('/accept-simpler', acceptSimplerVersion)

// Protected routes (teacher only)
router.get('/history/:sessionId', authenticateToken, getHelpHistory)

export default router
