/**
 * Session Status Validation Middleware
 *
 * Ensures students can only interact with active sessions.
 * Handles grace periods for paused/ended sessions.
 */

import db from '../database/db.js'

/**
 * Validates that a session is active (or within grace period)
 * For reverse tutoring and other student-facing features
 *
 * Expects: req.body.sessionId OR req.params.sessionId
 * Attaches: req.session with full session data
 */
export async function validateActiveSession(req, res, next) {
  try {
    const sessionId = req.body.sessionId || req.params.sessionId || req.query.sessionId

    if (!sessionId) {
      return res.status(400).json({
        message: 'Session ID is required'
      })
    }

    // Get session with status and grace period info
    const sessionResult = await db.query(
      `SELECT id, title, status, paused_at, grace_period_ends_at, teacher_id, created_at
       FROM sessions
       WHERE id = $1`,
      [sessionId]
    )

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Session not found',
        code: 'SESSION_NOT_FOUND'
      })
    }

    const session = sessionResult.rows[0]
    const now = new Date()

    // Check session status
    if (session.status === 'active') {
      // Session is active - allow access
      req.session = session
      return next()
    }

    // Check if within grace period (2 minutes after pausing/ending)
    if (session.grace_period_ends_at) {
      const gracePeriodEnds = new Date(session.grace_period_ends_at)

      if (now < gracePeriodEnds) {
        // Still within grace period - allow but warn
        req.session = session
        req.inGracePeriod = true
        req.gracePeriodEndsAt = gracePeriodEnds
        return next()
      }
    }

    // Session is ended or paused without grace period
    if (session.status === 'paused') {
      return res.status(403).json({
        message: 'Session is paused by teacher',
        code: 'SESSION_PAUSED',
        status: session.status,
        pausedAt: session.paused_at
      })
    }

    if (session.status === 'ended') {
      return res.status(403).json({
        message: 'Session has ended',
        code: 'SESSION_ENDED',
        status: session.status
      })
    }

    // Unknown status
    return res.status(403).json({
      message: 'Session is not available',
      code: 'SESSION_UNAVAILABLE',
      status: session.status
    })

  } catch (error) {
    console.error('Session validation error:', error)
    return res.status(500).json({
      message: 'Failed to validate session status'
    })
  }
}

/**
 * Validates session from conversationId
 * For endpoints that only have conversationId (like /message)
 *
 * Expects: req.params.conversationId
 * Attaches: req.session and req.conversation
 */
export async function validateSessionFromConversation(req, res, next) {
  try {
    const { conversationId } = req.params

    if (!conversationId) {
      return res.status(400).json({
        message: 'Conversation ID is required'
      })
    }

    // Get conversation with session info
    const result = await db.query(
      `SELECT
        c.*,
        s.id as session_id,
        s.title as session_title,
        s.status as session_status,
        s.paused_at,
        s.grace_period_ends_at,
        s.teacher_id
       FROM reverse_tutoring_conversations c
       JOIN sessions s ON c.session_id = s.id
       WHERE c.id = $1`,
      [conversationId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Conversation not found',
        code: 'CONVERSATION_NOT_FOUND'
      })
    }

    const conversation = result.rows[0]
    const now = new Date()

    // Build session object
    const session = {
      id: conversation.session_id,
      title: conversation.session_title,
      status: conversation.session_status,
      paused_at: conversation.paused_at,
      grace_period_ends_at: conversation.grace_period_ends_at,
      teacher_id: conversation.teacher_id
    }

    // Check session status
    if (session.status === 'active') {
      req.session = session
      req.conversation = conversation
      return next()
    }

    // Check grace period
    if (session.grace_period_ends_at) {
      const gracePeriodEnds = new Date(session.grace_period_ends_at)

      if (now < gracePeriodEnds) {
        req.session = session
        req.conversation = conversation
        req.inGracePeriod = true
        req.gracePeriodEndsAt = gracePeriodEnds
        return next()
      }
    }

    // Session not active and grace period expired
    if (session.status === 'paused') {
      return res.status(403).json({
        message: 'Session is paused by teacher',
        code: 'SESSION_PAUSED',
        status: session.status
      })
    }

    if (session.status === 'ended') {
      return res.status(403).json({
        message: 'Session has ended',
        code: 'SESSION_ENDED',
        status: session.status
      })
    }

    return res.status(403).json({
      message: 'Session is not available',
      code: 'SESSION_UNAVAILABLE',
      status: session.status
    })

  } catch (error) {
    console.error('Session validation from conversation error:', error)
    return res.status(500).json({
      message: 'Failed to validate session status'
    })
  }
}

export default {
  validateActiveSession,
  validateSessionFromConversation
}
