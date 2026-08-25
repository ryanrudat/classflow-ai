import express from 'express'
import {
  saveToLibrary,
  getLibraryItems,
  getLibraryItem,
  updateLibraryItem,
  deleteLibraryItem,
  reuseLibraryItem,
  getTags,
  getFolders,
  getLibraryStats
} from '../controllers/libraryController.js'
import { authenticateToken } from '../middleware/auth.js'
import db from '../database/db.js'

const router = express.Router()

// Health check endpoint (no auth required) - check if library tables exist
router.get('/health', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('content_library', 'library_tags', 'library_activity_tags')
      ORDER BY table_name
    `)

    const existingTables = result.rows.map(r => r.table_name)
    const requiredTables = ['content_library', 'library_activity_tags', 'library_tags']
    const missingTables = requiredTables.filter(t => !existingTables.includes(t))

    if (missingTables.length > 0) {
      return res.status(503).json({
        status: 'error',
        message: 'Library tables not initialized',
        missingTables,
        existingTables,
        solution: 'Run database migration: 012_add_content_library.sql'
      })
    }

    res.json({
      status: 'ok',
      tables: existingTables,
      message: 'Library system ready'
    })
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    })
  }
})

// All other library routes require authentication
router.use(authenticateToken)

/**
 * Content Library Routes
 */

// Get library statistics
router.get('/stats', getLibraryStats)

// Get all tags
router.get('/tags', getTags)

// Get all folders
router.get('/folders', getFolders)

// Get all library items (with filters)
router.get('/', getLibraryItems)

// Get single library item
router.get('/:id', getLibraryItem)

// Save activity to library
router.post('/', saveToLibrary)

// Update library item
router.put('/:id', updateLibraryItem)

// Delete library item
router.delete('/:id', deleteLibraryItem)

// Reuse library item (create new activity in session)
router.post('/:id/reuse', reuseLibraryItem)

export default router
