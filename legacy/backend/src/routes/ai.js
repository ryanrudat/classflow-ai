import express from 'express'
import { generateActivity } from '../controllers/activityController.js'
import { generateSentenceOrdering } from '../controllers/sentenceOrderingController.js'
import { generateMatching } from '../controllers/matchingController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Protected routes (teacher only)
router.post('/generate', authenticateToken, generateActivity)
router.post('/generate-sentence-ordering', authenticateToken, generateSentenceOrdering)
router.post('/generate-matching', authenticateToken, generateMatching)

// TODO: Week 3 - Add adaptive content generation
// router.post('/adapt', authenticateToken, adaptContent)

export default router
