import express from 'express'
import { generateActivity } from '../controllers/activityController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Protected routes (teacher only)
router.post('/generate', authenticateToken, generateActivity)

// TODO: Week 3 - Add adaptive content generation
// router.post('/adapt', authenticateToken, adaptContent)

export default router
