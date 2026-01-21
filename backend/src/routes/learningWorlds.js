import express from 'express'
import { authenticateToken, optionalStudentAuth, authenticateStudent } from '../middleware/auth.js'
import {
  // Worlds
  createWorld,
  getWorlds,
  getWorld,
  updateWorld,
  deleteWorld,

  // Characters
  createCharacter,
  updateCharacter,

  // Lands
  createLand,
  getLand,
  updateLand,
  deleteLand,

  // Activities
  createActivity,
  updateActivity,
  deleteActivity,

  // Vocabulary
  addVocabulary,
  getWorldVocabulary,
  bulkAddVocabulary,

  // Sessions
  startWorldSession,
  getWorldSessionState,
  navigateWorldSession,
  setControlMode,
  endWorldSession,

  // Progress
  recordActivityResponse,

  // Templates
  getLandTemplates,
  importLandTemplate,

  // AI Content Generation
  generateAIActivityContent,
  saveActivityContent
} from '../controllers/learningWorldsController.js'

const router = express.Router()

// ============================================================================
// LEARNING WORLDS ROUTES
// ============================================================================

// Worlds CRUD (teacher only)
router.post('/learning-worlds', authenticateToken, createWorld)
router.get('/learning-worlds', authenticateToken, getWorlds)
router.get('/learning-worlds/:worldId', authenticateToken, getWorld)
router.put('/learning-worlds/:worldId', authenticateToken, updateWorld)
router.delete('/learning-worlds/:worldId', authenticateToken, deleteWorld)

// Characters (teacher only)
router.post('/learning-worlds/:worldId/characters', authenticateToken, createCharacter)
router.put('/characters/:characterId', authenticateToken, updateCharacter)

// Lands CRUD (teacher only)
router.post('/learning-worlds/:worldId/lands', authenticateToken, createLand)
router.get('/lands/:landId', authenticateToken, getLand)
router.put('/lands/:landId', authenticateToken, updateLand)
router.delete('/lands/:landId', authenticateToken, deleteLand)

// Activities CRUD (teacher only)
router.post('/lands/:landId/activities', authenticateToken, createActivity)
router.put('/activities/:activityId/world', authenticateToken, updateActivity)
router.delete('/activities/:activityId/world', authenticateToken, deleteActivity)

// Vocabulary (teacher only)
router.post('/learning-worlds/:worldId/vocabulary', authenticateToken, addVocabulary)
router.get('/learning-worlds/:worldId/vocabulary', authenticateToken, getWorldVocabulary)
router.post('/learning-worlds/:worldId/vocabulary/bulk', authenticateToken, bulkAddVocabulary)

// World Sessions (teacher starts, students can read state)
router.post('/learning-worlds/:worldId/start-session', authenticateToken, startWorldSession)
router.get('/world-sessions/:sessionId/state', optionalStudentAuth, getWorldSessionState)
router.post('/world-sessions/:sessionId/navigate', authenticateToken, navigateWorldSession)
router.post('/world-sessions/:sessionId/set-control', authenticateToken, setControlMode)
router.post('/world-sessions/:sessionId/end', authenticateToken, endWorldSession)

// Student progress (student auth required)
router.post('/world-activities/:activityId/respond', authenticateStudent, recordActivityResponse)

// Templates (public read, teacher import)
router.get('/land-templates', getLandTemplates)
router.post('/learning-worlds/:worldId/import-template', authenticateToken, importLandTemplate)

// AI Content Generation (teacher only) - uses /world-activities to avoid conflict with general /activities routes
router.post('/world-activities/:activityId/generate-content', authenticateToken, generateAIActivityContent)
router.put('/world-activities/:activityId/content', authenticateToken, saveActivityContent)

export default router
