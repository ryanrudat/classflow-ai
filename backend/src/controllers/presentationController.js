import db from '../database/db.js'
import { io } from '../server.js'

/**
 * Start a presentation session
 * POST /api/presentation/start
 * Body: { deckId, mode: 'teacher' | 'student' | 'bounded' }
 */
export async function startPresentation(req, res) {
  try {
    const { deckId, mode = 'student' } = req.body
    const teacherId = req.user.userId

    // Verify deck ownership
    const deckResult = await db.query(
      `SELECT d.*, s.id as session_id, s.teacher_id
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

    // Update session with presentation state
    await db.query(
      `UPDATE sessions
       SET screen_lock_enabled = $1,
           focus_mode_enabled = $2
       WHERE id = $3`,
      [
        mode === 'teacher', // Lock screens if teacher-paced
        mode === 'teacher' || mode === 'bounded',
        deck.session_id
      ]
    )

    // Notify all connected students
    io.to(`session-${deck.session_id}`).emit('presentation-started', {
      deckId,
      mode,
      currentSlide: 1
    })

    res.json({
      message: 'Presentation started',
      deckId,
      sessionId: deck.session_id,
      mode
    })

  } catch (error) {
    console.error('Start presentation error:', error)
    res.status(500).json({ message: 'Failed to start presentation' })
  }
}

/**
 * Navigate to a specific slide (teacher controls)
 * POST /api/presentation/navigate
 * Body: { deckId, slideNumber }
 */
export async function navigateToSlide(req, res) {
  try {
    const { deckId, slideNumber } = req.body
    const teacherId = req.user.userId

    // Verify ownership
    const deckResult = await db.query(
      `SELECT d.*, s.id as session_id, s.teacher_id
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

    // Broadcast to all students
    io.to(`session-${deck.session_id}`).emit('teacher-navigated', {
      deckId,
      slideNumber
    })

    res.json({
      message: 'Navigation broadcast',
      slideNumber
    })

  } catch (error) {
    console.error('Navigate error:', error)
    res.status(500).json({ message: 'Failed to navigate' })
  }
}

/**
 * Change presentation mode
 * POST /api/presentation/mode
 * Body: { deckId, mode: 'teacher' | 'student' | 'bounded' }
 */
export async function changeMode(req, res) {
  try {
    const { deckId, mode } = req.body
    const teacherId = req.user.userId

    // Verify ownership
    const deckResult = await db.query(
      `SELECT d.*, s.id as session_id, s.teacher_id
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

    // Update session settings
    await db.query(
      `UPDATE sessions
       SET screen_lock_enabled = $1,
           focus_mode_enabled = $2
       WHERE id = $3`,
      [
        mode === 'teacher',
        mode === 'teacher' || mode === 'bounded',
        deck.session_id
      ]
    )

    // Broadcast mode change
    io.to(`session-${deck.session_id}`).emit('mode-changed', {
      deckId,
      mode
    })

    res.json({
      message: 'Mode changed',
      mode
    })

  } catch (error) {
    console.error('Change mode error:', error)
    res.status(500).json({ message: 'Failed to change mode' })
  }
}

/**
 * Get student progress for a deck
 * GET /api/presentation/:deckId/progress
 */
export async function getStudentProgress(req, res) {
  try {
    const { deckId } = req.params
    const teacherId = req.user.userId

    // Verify ownership
    const deckResult = await db.query(
      `SELECT d.*, s.id as session_id, s.teacher_id
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

    // Get all students and their current slide progress
    const progressResult = await db.query(
      `SELECT
        ss.id as student_id,
        ss.student_name,
        MAX(sp.slide_id) as current_slide_id,
        s.slide_number as current_slide_number,
        COUNT(DISTINCT sp.slide_id) as completed_slides,
        BOOL_OR(sp.stuck) as is_stuck,
        MAX(sp.started_at) as last_activity
       FROM session_students ss
       LEFT JOIN student_slide_progress sp ON ss.id = sp.student_id
       LEFT JOIN slides s ON sp.slide_id = s.id
       WHERE ss.session_id = $1 AND s.deck_id = $2
       GROUP BY ss.id, ss.student_name, s.slide_number
       ORDER BY ss.student_name`,
      [deck.session_id, deckId]
    )

    res.json({
      students: progressResult.rows.map(row => ({
        studentId: row.student_id,
        name: row.student_name,
        currentSlideNumber: parseFloat(row.current_slide_number) || 1,
        completedSlides: parseInt(row.completed_slides) || 0,
        isStuck: row.is_stuck || false,
        lastActivity: row.last_activity
      }))
    })

  } catch (error) {
    console.error('Get progress error:', error)
    res.status(500).json({ message: 'Failed to get student progress' })
  }
}

/**
 * Set checkpoints for bounded mode
 * POST /api/presentation/checkpoints
 * Body: { deckId, slideNumbers: [3, 7, 10] }
 */
export async function setCheckpoints(req, res) {
  try {
    const { deckId, slideNumbers = [] } = req.body
    const teacherId = req.user.userId

    // Verify ownership
    const deckResult = await db.query(
      `SELECT d.*, s.id as session_id, s.teacher_id
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

    // Store checkpoints (we'll add a checkpoints column or use a separate table)
    // For now, broadcast to clients
    io.to(`session-${deck.session_id}`).emit('checkpoints-updated', {
      deckId,
      checkpoints: slideNumbers
    })

    res.json({
      message: 'Checkpoints set',
      checkpoints: slideNumbers
    })

  } catch (error) {
    console.error('Set checkpoints error:', error)
    res.status(500).json({ message: 'Failed to set checkpoints' })
  }
}
