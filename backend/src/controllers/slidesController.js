import db from '../database/db.js'
import { generateSlideDeck } from '../services/slideGeneratorService.js'

/**
 * Generate a new slide deck using AI
 * POST /api/slides/generate
 * Body: { sessionId, topic, gradeLevel, difficulty, slideCount }
 */
export async function generateDeck(req, res) {
  try {
    const {
      sessionId,
      topic,
      gradeLevel = '9th-10th',
      difficulty = 'medium',
      slideCount = 10
    } = req.body

    const teacherId = req.user.userId

    // Validation
    if (!sessionId || !topic) {
      return res.status(400).json({
        message: 'Session ID and topic are required'
      })
    }

    // Verify teacher owns this session
    const sessionCheck = await db.query(
      'SELECT id, subject FROM sessions WHERE id = $1 AND teacher_id = $2',
      [sessionId, teacherId]
    )

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({
        message: 'Session not found or unauthorized'
      })
    }

    const session = sessionCheck.rows[0]

    // Generate slide deck with AI
    const startTime = Date.now()

    const { deck, slides } = await generateSlideDeck({
      topic,
      subject: session.subject,
      gradeLevel,
      difficulty,
      slideCount
    })

    const generationTime = Date.now() - startTime

    // Save deck to database
    const deckResult = await db.query(
      `INSERT INTO slide_decks (session_id, title, grade_level, difficulty)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [sessionId, deck.title, gradeLevel, difficulty]
    )

    const savedDeck = deckResult.rows[0]

    // Save slides to database
    const slideInserts = slides.map((slide, index) => {
      return db.query(
        `INSERT INTO slides (
          deck_id, slide_number, type, title, body, template, difficulty_level, question
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          savedDeck.id,
          index + 1,
          slide.type,
          slide.title,
          slide.body,
          slide.template || 'default',
          difficulty,
          slide.question ? JSON.stringify(slide.question) : null
        ]
      )
    })

    const savedSlides = await Promise.all(slideInserts)

    // Log analytics
    await db.query(
      `INSERT INTO analytics_events (event_type, user_id, session_id, properties)
       VALUES ($1, $2, $3, $4)`,
      [
        'slide_deck_generated',
        teacherId,
        sessionId,
        JSON.stringify({
          topic,
          difficulty,
          slideCount: slides.length,
          generationTime
        })
      ]
    )

    res.json({
      deck: savedDeck,
      slides: savedSlides.map(s => s.rows[0]),
      generationTime,
      message: 'Slide deck generated successfully'
    })

  } catch (error) {
    console.error('Generate deck error:', error)
    res.status(500).json({
      message: `Failed to generate slide deck: ${error.message}`
    })
  }
}

/**
 * Get a slide deck with all slides
 * GET /api/slides/decks/:deckId
 */
export async function getDeck(req, res) {
  try {
    const { deckId } = req.params
    const teacherId = req.user.userId

    // Get deck and verify ownership
    const deckResult = await db.query(
      `SELECT d.*, s.teacher_id
       FROM slide_decks d
       JOIN sessions s ON d.session_id = s.id
       WHERE d.id = $1`,
      [deckId]
    )

    if (deckResult.rows.length === 0) {
      return res.status(404).json({ message: 'Deck not found' })
    }

    const deck = deckResult.rows[0]

    if (deck.teacher_id !== teacherId) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    // Get all slides for this deck (main slides only, not variants)
    const slidesResult = await db.query(
      `SELECT
        s.*,
        i.url as image_url,
        i.alt_text as image_alt
       FROM slides s
       LEFT JOIN uploaded_images i ON s.image_id = i.id
       WHERE s.deck_id = $1 AND s.parent_slide_id IS NULL
       ORDER BY s.slide_number ASC`,
      [deckId]
    )

    res.json({
      deck: {
        id: deck.id,
        sessionId: deck.session_id,
        title: deck.title,
        gradeLevel: deck.grade_level,
        difficulty: deck.difficulty,
        totalSlides: deck.total_slides,
        createdAt: deck.created_at,
        updatedAt: deck.updated_at
      },
      slides: slidesResult.rows.map(slide => ({
        id: slide.id,
        slideNumber: parseFloat(slide.slide_number),
        type: slide.type,
        title: slide.title,
        body: slide.body,
        template: slide.template,
        image: slide.image_id ? {
          id: slide.image_id,
          url: slide.image_url,
          alt: slide.image_alt,
          position: slide.image_position,
          width: slide.image_width,
          height: slide.image_height
        } : null,
        question: slide.question,
        createdAt: slide.created_at,
        updatedAt: slide.updated_at
      }))
    })

  } catch (error) {
    console.error('Get deck error:', error)
    res.status(500).json({ message: 'Failed to get slide deck' })
  }
}

/**
 * Update a single slide
 * PUT /api/slides/:slideId
 * Body: { title, body, imageId, imagePosition, imageWidth, imageHeight, template }
 */
export async function updateSlide(req, res) {
  try {
    const { slideId } = req.params
    const {
      title,
      body,
      imageId,
      imagePosition,
      imageWidth,
      imageHeight,
      template
    } = req.body

    const teacherId = req.user.userId

    // Verify ownership
    const ownershipCheck = await db.query(
      `SELECT s.id
       FROM slides sl
       JOIN slide_decks d ON sl.deck_id = d.id
       JOIN sessions s ON d.session_id = s.id
       WHERE sl.id = $1 AND s.teacher_id = $2`,
      [slideId, teacherId]
    )

    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Slide not found or unauthorized' })
    }

    // Build dynamic update query
    const updates = []
    const values = []
    let paramCount = 1

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`)
      values.push(title)
    }
    if (body !== undefined) {
      updates.push(`body = $${paramCount++}`)
      values.push(body)
    }
    if (imageId !== undefined) {
      updates.push(`image_id = $${paramCount++}`)
      values.push(imageId)
    }
    if (imagePosition !== undefined) {
      updates.push(`image_position = $${paramCount++}`)
      values.push(imagePosition)
    }
    if (imageWidth !== undefined) {
      updates.push(`image_width = $${paramCount++}`)
      values.push(imageWidth)
    }
    if (imageHeight !== undefined) {
      updates.push(`image_height = $${paramCount++}`)
      values.push(imageHeight)
    }
    if (template !== undefined) {
      updates.push(`template = $${paramCount++}`)
      values.push(template)
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' })
    }

    values.push(slideId)

    const result = await db.query(
      `UPDATE slides
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    )

    res.json({
      slide: result.rows[0],
      message: 'Slide updated successfully'
    })

  } catch (error) {
    console.error('Update slide error:', error)
    res.status(500).json({ message: 'Failed to update slide' })
  }
}

/**
 * Delete a slide
 * DELETE /api/slides/:slideId
 */
export async function deleteSlide(req, res) {
  try {
    const { slideId } = req.params
    const teacherId = req.user.userId

    // Verify ownership
    const ownershipCheck = await db.query(
      `SELECT sl.id, sl.deck_id
       FROM slides sl
       JOIN slide_decks d ON sl.deck_id = d.id
       JOIN sessions s ON d.session_id = s.id
       WHERE sl.id = $1 AND s.teacher_id = $2`,
      [slideId, teacherId]
    )

    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Slide not found or unauthorized' })
    }

    await db.query('DELETE FROM slides WHERE id = $1', [slideId])

    res.json({ message: 'Slide deleted successfully' })

  } catch (error) {
    console.error('Delete slide error:', error)
    res.status(500).json({ message: 'Failed to delete slide' })
  }
}

/**
 * Generate a variant (easier/harder) of an existing slide
 * POST /api/slides/:slideId/variant
 * Body: { direction: 'easier' | 'harder' }
 */
export async function generateVariant(req, res) {
  try {
    const { slideId } = req.params
    const { direction = 'easier' } = req.body
    const teacherId = req.user.userId

    // Get original slide and verify ownership
    const slideResult = await db.query(
      `SELECT sl.*, d.session_id, s.teacher_id, sess.subject
       FROM slides sl
       JOIN slide_decks d ON sl.deck_id = d.id
       JOIN sessions sess ON d.session_id = sess.id
       JOIN users s ON sess.teacher_id = s.id
       WHERE sl.id = $1`,
      [slideId]
    )

    if (slideResult.rows.length === 0) {
      return res.status(404).json({ message: 'Slide not found' })
    }

    const originalSlide = slideResult.rows[0]

    if (originalSlide.teacher_id !== teacherId) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    // Import the slide generator service
    const { generateSlideVariant } = await import('../services/slideGeneratorService.js')

    // Generate variant
    const variant = await generateSlideVariant(originalSlide, direction)

    // Save variant to database
    const newSlideNumber = parseFloat(originalSlide.slide_number) + 0.1

    const result = await db.query(
      `INSERT INTO slides (
        deck_id, slide_number, type, title, body, template,
        difficulty_level, parent_slide_id, question
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        originalSlide.deck_id,
        newSlideNumber,
        variant.type,
        variant.title,
        variant.body,
        variant.template,
        direction === 'easier' ? 'easy' : 'hard',
        slideId,
        variant.question ? JSON.stringify(variant.question) : null
      ]
    )

    res.json({
      slide: result.rows[0],
      message: `${direction === 'easier' ? 'Easier' : 'Harder'} variant generated successfully`
    })

  } catch (error) {
    console.error('Generate variant error:', error)
    res.status(500).json({ message: 'Failed to generate variant' })
  }
}

/**
 * Get all decks for a session
 * GET /api/sessions/:sessionId/decks
 */
export async function getSessionDecks(req, res) {
  try {
    const { sessionId } = req.params
    const teacherId = req.user.userId

    // Verify teacher owns this session
    const sessionCheck = await db.query(
      'SELECT id FROM sessions WHERE id = $1 AND teacher_id = $2',
      [sessionId, teacherId]
    )

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' })
    }

    const decksResult = await db.query(
      `SELECT * FROM slide_decks
       WHERE session_id = $1
       ORDER BY created_at DESC`,
      [sessionId]
    )

    res.json({
      decks: decksResult.rows,
      count: decksResult.rows.length
    })

  } catch (error) {
    console.error('Get session decks error:', error)
    console.error('Error details:', error.message, error.stack)
    res.status(500).json({
      message: 'Failed to get session decks',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}
