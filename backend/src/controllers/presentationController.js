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

    // Get all students in this session
    const studentsResult = await db.query(
      `SELECT ss.id, ss.student_name
       FROM session_students ss
       WHERE ss.session_id = $1
       ORDER BY ss.student_name`,
      [deck.session_id]
    )

    // For each student, get their latest slide progress for this deck
    const students = await Promise.all(
      studentsResult.rows.map(async (student) => {
        const progressQuery = await db.query(
          `SELECT
            s.slide_number,
            sp.completed_at,
            sp.stuck,
            sp.started_at
           FROM student_slide_progress sp
           JOIN slides s ON sp.slide_id = s.id
           WHERE sp.student_id = $1 AND s.deck_id = $2
           ORDER BY sp.started_at DESC
           LIMIT 1`,
          [student.id, deckId]
        )

        const progress = progressQuery.rows[0]
        const completedCount = await db.query(
          `SELECT COUNT(DISTINCT sp.slide_id) as count
           FROM student_slide_progress sp
           JOIN slides s ON sp.slide_id = s.id
           WHERE sp.student_id = $1 AND s.deck_id = $2 AND sp.completed_at IS NOT NULL`,
          [student.id, deckId]
        )

        return {
          studentId: student.id,
          name: student.student_name,
          currentSlideNumber: progress ? parseFloat(progress.slide_number) : 1,
          completedSlides: parseInt(completedCount.rows[0].count) || 0,
          isStuck: progress?.stuck || false,
          lastActivity: progress?.started_at || null
        }
      })
    )

    res.json({ students })

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
