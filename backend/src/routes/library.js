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

const router = express.Router()

// All library routes require authentication
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
