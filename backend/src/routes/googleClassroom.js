import express from 'express'
import * as googleClassroomController from '../controllers/googleClassroomController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// OAuth flow
router.get('/auth', authenticateToken, googleClassroomController.initiateAuth)
router.get('/callback', googleClassroomController.handleCallback)

// Connection status and management
router.get('/status', authenticateToken, googleClassroomController.getConnectionStatus)
router.delete('/disconnect', authenticateToken, googleClassroomController.disconnect)

// Courses and rosters
router.get('/courses', authenticateToken, googleClassroomController.getCourses)
router.get('/courses/:courseId/students', authenticateToken, googleClassroomController.getCourseStudents)
router.post('/courses/:courseId/import-roster', authenticateToken, googleClassroomController.importRoster)

// Sharing and grading
router.post('/courses/:courseId/share-activity', authenticateToken, googleClassroomController.shareActivity)
router.post('/sync-grades', authenticateToken, googleClassroomController.syncGrades)

export default router
