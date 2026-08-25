import express from 'express'
import {
  registerStudent,
  loginStudent,
  getCurrentStudent,
  getStudentCompletions
} from '../controllers/studentAuthController.js'
import { authenticateStudent } from '../middleware/auth.js'

const router = express.Router()

// Public routes (student registration/login)
router.post('/register', registerStudent)
router.post('/login', loginStudent)

// Protected routes (require student authentication)
router.get('/me', authenticateStudent, getCurrentStudent)
router.get('/completions/:sessionId', authenticateStudent, getStudentCompletions)

export default router
