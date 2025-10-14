import express from 'express'
import {
  generateDeck,
  getDeck,
  updateSlide,
  deleteSlide,
  generateVariant,
  getSessionDecks,
  createBlankSlide,
  duplicateSlide,
  reorderSlides
} from '../controllers/slidesController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// All routes require authentication
router.use(authenticateToken)

// Generate a new slide deck
router.post('/generate', generateDeck)

// Get a specific deck with all slides
router.get('/decks/:deckId', getDeck)

// Update a single slide
router.put('/:slideId', updateSlide)

// Delete a slide
router.delete('/:slideId', deleteSlide)

// Generate a variant (easier/harder) of a slide
router.post('/:slideId/variant', generateVariant)

// Get all decks for a session
router.get('/sessions/:sessionId/decks', getSessionDecks)

// Create a blank slide
router.post('/decks/:deckId/slides', createBlankSlide)

// Duplicate an existing slide
router.post('/:slideId/duplicate', duplicateSlide)

// Reorder slides in a deck
router.put('/decks/:deckId/reorder', reorderSlides)

export default router
