import express from 'express'
import {
  startPresentation,
  navigateToSlide,
  changeMode,
  getStudentProgress,
  setCheckpoints
} from '../controllers/presentationController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Allow OPTIONS requests for CORS preflight (before auth)
router.options('*', (req, res) => {
  res.status(200).end()
})

// All routes require authentication
router.use(authenticateToken)

// Start a presentation session
router.post('/start', startPresentation)

// Navigate to a slide (teacher-paced mode)
router.post('/navigate', navigateToSlide)

// Change presentation mode
router.post('/mode', changeMode)

// Get student progress
router.get('/:deckId/progress', getStudentProgress)

// Set checkpoints for bounded mode
router.post('/checkpoints', setCheckpoints)

export default router
