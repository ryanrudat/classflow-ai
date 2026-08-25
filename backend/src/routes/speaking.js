import express from 'express'
import { authenticateToken, optionalAuth } from '../middleware/auth.js'
import {
  audioUpload,
  listPacks,
  getSessionPack,
  assignPack,
  startAttempt,
  getAttempt,
  ready,
  transcribe,
  submitTurn,
  endAttempt,
  listAttempts,
  reviewAttempt
} from '../controllers/speakingController.js'

const router = express.Router()

// Teacher
router.get('/packs', authenticateToken, listPacks)
router.put('/sessions/:sessionId/pack', authenticateToken, assignPack)
router.get('/sessions/:sessionId/attempts', authenticateToken, listAttempts)
router.get('/attempts/:id/review', authenticateToken, reviewAttempt)

// Teacher or student (student passes ?studentId=)
router.get('/sessions/:sessionId/pack', optionalAuth, getSessionPack)
router.get('/attempts/:id', optionalAuth, getAttempt)
router.post('/attempts/:id/end', optionalAuth, endAttempt)

// Student (identified by studentId belonging to the session)
router.post('/attempts', startAttempt)
router.post('/attempts/:id/ready', ready)
router.post('/attempts/:id/transcribe', audioUpload.single('audio'), transcribe)
router.post('/attempts/:id/turns', submitTurn)

export default router
