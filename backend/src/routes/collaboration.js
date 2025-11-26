import express from 'express'
import Anthropic from '@anthropic-ai/sdk'
import db from '../database/db.js'
import { authenticateToken } from '../middleware/auth.js'
import { validateActiveSession } from '../middleware/sessionStatus.js'
import { getIO } from '../services/ioInstance.js'

const router = express.Router()

// Initialize Claude for generating initial AI messages
const claude = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
})

// ============================================
// COLLABORATION WAITING ROOM
// ============================================

/**
 * Join waiting room for a topic
 * POST /api/collaboration/waiting-room/join
 * Body: { sessionId, topicId, studentId, studentName, preferredMode }
 */
router.post('/waiting-room/join', validateActiveSession, async (req, res) => {
  try {
    const { sessionId, topicId, studentId, studentName, preferredMode = 'pass_the_mic' } = req.body

    if (!sessionId || !topicId || !studentId) {
      return res.status(400).json({ message: 'sessionId, topicId, and studentId are required' })
    }

    // Check if topic allows collaboration
    const topicResult = await db.query(`
      SELECT allow_collaboration, collaboration_mode
      FROM reverse_tutoring_topics
      WHERE id = $1 AND session_id = $2
    `, [topicId, sessionId])

    if (topicResult.rows.length === 0) {
      return res.status(404).json({ message: 'Topic not found' })
    }

    if (!topicResult.rows[0].allow_collaboration) {
      return res.status(400).json({ message: 'This topic does not allow collaboration' })
    }

    // Add to waiting room
    const result = await db.query(`
      INSERT INTO collaboration_waiting_room
        (session_id, topic_id, student_id, student_name, preferred_mode, expires_at)
      VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '10 minutes')
      ON CONFLICT (session_id, topic_id, student_id)
      DO UPDATE SET
        status = 'waiting',
        preferred_mode = $5,
        expires_at = NOW() + INTERVAL '10 minutes',
        created_at = NOW()
      RETURNING id, status, expires_at
    `, [sessionId, topicId, studentId, studentName, preferredMode])

    // Notify other students waiting for this topic
    const io = getIO()
    io.to(`session-${sessionId}`).emit('collab-student-waiting', {
      topicId,
      studentId,
      studentName
    })

    // Check for available partners and AUTO-MATCH if one is waiting
    const partnersResult = await db.query(`
      SELECT student_id, student_name
      FROM collaboration_waiting_room
      WHERE session_id = $1
        AND topic_id = $2
        AND student_id != $3
        AND status = 'waiting'
        AND expires_at > NOW()
      ORDER BY created_at
      LIMIT 1
    `, [sessionId, topicId, studentId])

    // If a partner is available, automatically match them!
    if (partnersResult.rows.length > 0) {
      const partner = partnersResult.rows[0]
      const participantIds = [partner.student_id, studentId]
      const participantNames = {
        [partner.student_id]: partner.student_name,
        [studentId]: studentName
      }

      // Create a new conversation for the collaborative session, or reuse existing one
      // Use ON CONFLICT to handle case where student already has a conversation for this topic
      const convResult = await db.query(`
        INSERT INTO reverse_tutoring_conversations
          (session_id, topic_id, student_id, topic, is_collaborative, started_at)
        SELECT $1, $2, $3, topic, true, NOW()
        FROM reverse_tutoring_topics WHERE id = $2
        ON CONFLICT (session_id, student_id, topic)
        DO UPDATE SET is_collaborative = true
        RETURNING id
      `, [sessionId, topicId, studentId])

      const conversationId = convResult.rows[0].id

      // Create the collaborative session (with ON CONFLICT to handle race conditions)
      const collabResult = await db.query(`
        INSERT INTO collaborative_tutoring_sessions
          (conversation_id, session_id, mode, participant_ids, participant_names,
           current_turn_student_id, turn_order, status, started_at)
        VALUES ($1, $2, $3, $4, $5, $6, $4, 'active', NOW())
        ON CONFLICT (conversation_id) DO UPDATE SET
          participant_ids = $4,
          participant_names = $5,
          status = 'active',
          started_at = COALESCE(collaborative_tutoring_sessions.started_at, NOW())
        RETURNING id
      `, [
        conversationId,
        sessionId,
        'tag_team',
        JSON.stringify(participantIds),
        JSON.stringify(participantNames),
        partner.student_id // First person who was waiting gets first turn
      ])

      const collabSessionId = collabResult.rows[0].id

      // Update the conversation with the collab session ID
      await db.query(`
        UPDATE reverse_tutoring_conversations
        SET collab_session_id = $1
        WHERE id = $2
      `, [collabSessionId, conversationId])

      // Fetch topic settings to generate initial AI message
      const topicSettingsResult = await db.query(`
        SELECT topic, subject, grade_level, key_vocabulary,
               language_complexity, response_length, max_student_responses, enforce_topic_focus
        FROM reverse_tutoring_topics
        WHERE id = $1
      `, [topicId])

      if (topicSettingsResult.rows.length > 0) {
        const topicSettings = topicSettingsResult.rows[0]
        const topic = topicSettings.topic
        const subject = topicSettings.subject || 'Science'
        const gradeLevel = topicSettings.grade_level || '7th grade'
        const keyVocabulary = topicSettings.key_vocabulary || []
        const languageComplexity = topicSettings.language_complexity || 'standard'
        const responseLength = topicSettings.response_length || 'medium'

        // Language complexity guidance
        const complexityGuidance = {
          simple: 'Use very simple vocabulary. Use short sentences (5-10 words).',
          standard: 'Use clear, grade-appropriate vocabulary. Keep sentences moderate length.',
          advanced: 'Use sophisticated academic vocabulary freely.'
        }

        // Response length guidance
        const lengthGuidance = {
          short: 'Keep your responses very brief - 1 to 2 sentences maximum.',
          medium: 'Keep your responses concise - 2 to 3 sentences.',
          long: 'You can give more detailed responses - 3 to 4 sentences.'
        }

        // Create system prompt for initial AI message
        const systemPrompt = `You are Alex, a curious ${gradeLevel} student who is trying to learn about ${topic} in ${subject} class.

LANGUAGE COMPLEXITY - ${languageComplexity.toUpperCase()}:
${complexityGuidance[languageComplexity] || complexityGuidance.standard}

RESPONSE LENGTH - ${responseLength.toUpperCase()}:
${lengthGuidance[responseLength] || lengthGuidance.medium}

COLLABORATIVE MODE:
- This is a TAG-TEAM session where TWO students will take turns teaching you
- Address both students warmly and express excitement about learning from a team
- Be encouraging and make both students feel included

Key vocabulary to listen for: ${Array.isArray(keyVocabulary) ? keyVocabulary.join(', ') : keyVocabulary}

Start by expressing confusion about the topic and inviting the team to teach you.`

        try {
          // Generate initial AI message
          const initialMessage = await claude.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 200,
            system: systemPrompt,
            messages: [{
              role: 'user',
              content: `Start the conversation. Express your confusion about ${topic} and ask the student team to teach you about it. Acknowledge that two students will be working together.`
            }]
          })

          const aiResponse = initialMessage.content[0].text

          // Update conversation with initial AI message and settings
          await db.query(`
            UPDATE reverse_tutoring_conversations
            SET conversation_history = $1,
                subject = $2,
                grade_level = $3,
                key_vocabulary = $4,
                message_count = 1
            WHERE id = $5
          `, [
            JSON.stringify([{
              role: 'ai',
              content: aiResponse,
              timestamp: new Date().toISOString()
            }]),
            subject,
            gradeLevel,
            JSON.stringify(Array.isArray(keyVocabulary) ? keyVocabulary : []),
            conversationId
          ])

          console.log('Generated initial AI message for collaborative session:', conversationId)
        } catch (aiError) {
          console.error('Failed to generate initial AI message:', aiError.message)
          // Continue without initial message - students can still chat
        }
      }

      // Update both students' waiting room status to matched
      await db.query(`
        UPDATE collaboration_waiting_room
        SET status = 'matched', matched_at = NOW()
        WHERE session_id = $1
          AND topic_id = $2
          AND student_id IN ($3, $4)
      `, [sessionId, topicId, partner.student_id, studentId])

      // Notify the FIRST student (partner) via socket
      io.to(`student-${partner.student_id}`).emit('partner-found', {
        collabSessionId,
        conversationId,
        partner: { id: studentId, name: studentName },
        isInitiator: true
      })

      // Return matched status to the SECOND student (current requester)
      return res.json({
        success: true,
        matched: true,
        collabSessionId,
        conversationId,
        partner: { id: partner.student_id, name: partner.student_name },
        isInitiator: false
      })
    }

    // No partner available - just waiting
    res.json({
      success: true,
      matched: false,
      waitingRoomId: result.rows[0].id,
      expiresAt: result.rows[0].expires_at,
      availablePartners: []
    })
  } catch (error) {
    console.error('Error joining waiting room:', error.message)
    console.error('Error stack:', error.stack)
    console.error('Request body:', req.body)
    res.status(500).json({
      message: 'Failed to join waiting room',
      error: error.message
    })
  }
})

/**
 * Get available partners for a topic
 * GET /api/collaboration/waiting-room/:sessionId/:topicId/available?excludeStudentId=xxx
 */
router.get('/waiting-room/:sessionId/:topicId/available', async (req, res) => {
  try {
    const { sessionId, topicId } = req.params
    const { excludeStudentId } = req.query

    let query = `
      SELECT student_id, student_name, preferred_mode, created_at
      FROM collaboration_waiting_room
      WHERE session_id = $1
        AND topic_id = $2
        AND status = 'waiting'
        AND expires_at > NOW()
    `
    const params = [sessionId, topicId]

    if (excludeStudentId) {
      query += ` AND student_id != $${params.length + 1}`
      params.push(excludeStudentId)
    }

    query += ` ORDER BY created_at LIMIT 10`

    const result = await db.query(query, params)

    res.json({
      availablePartners: result.rows,
      count: result.rows.length
    })
  } catch (error) {
    console.error('Error fetching available partners:', error)
    res.status(500).json({ message: 'Failed to fetch partners' })
  }
})

/**
 * Leave waiting room
 * POST /api/collaboration/waiting-room/leave
 * Body: { sessionId, topicId, studentId }
 */
router.post('/waiting-room/leave', async (req, res) => {
  try {
    const { sessionId, topicId, studentId } = req.body

    await db.query(`
      UPDATE collaboration_waiting_room
      SET status = 'cancelled'
      WHERE session_id = $1 AND topic_id = $2 AND student_id = $3
    `, [sessionId, topicId, studentId])

    // Notify others
    const io = getIO()
    io.to(`session-${sessionId}`).emit('collab-student-left-waiting', {
      topicId,
      studentId
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Error leaving waiting room:', error)
    res.status(500).json({ message: 'Failed to leave waiting room' })
  }
})

// ============================================
// COLLABORATIVE SESSION MANAGEMENT
// ============================================

/**
 * Create a collaborative session
 * POST /api/collaboration/sessions
 * Body: { conversationId, sessionId, mode, participantIds, participantNames }
 */
router.post('/sessions', validateActiveSession, async (req, res) => {
  try {
    const { conversationId, sessionId, mode = 'pass_the_mic', participantIds, participantNames } = req.body

    if (!conversationId || !sessionId || !participantIds || participantIds.length < 2) {
      return res.status(400).json({
        message: 'conversationId, sessionId, and at least 2 participantIds are required'
      })
    }

    // Create collaborative session (with ON CONFLICT to handle race conditions)
    const result = await db.query(`
      INSERT INTO collaborative_tutoring_sessions
        (conversation_id, session_id, mode, participant_ids, participant_names,
         current_turn_student_id, turn_order, status, started_at)
      VALUES ($1, $2, $3, $4, $5, $6, $4, 'active', NOW())
      ON CONFLICT (conversation_id) DO UPDATE SET
        participant_ids = $4,
        participant_names = $5,
        mode = $3,
        status = 'active',
        started_at = COALESCE(collaborative_tutoring_sessions.started_at, NOW())
      RETURNING *
    `, [
      conversationId,
      sessionId,
      mode,
      JSON.stringify(participantIds),
      JSON.stringify(participantNames || {}),
      participantIds[0] // First participant gets first turn
    ])

    // Update conversation to mark as collaborative
    await db.query(`
      UPDATE reverse_tutoring_conversations
      SET is_collaborative = true, collab_session_id = $1
      WHERE id = $2
    `, [result.rows[0].id, conversationId])

    // Update waiting room status - use dynamic placeholders for variable participant count
    const placeholders = participantIds.map((_, i) => `$${i + 2}`).join(', ')
    await db.query(`
      UPDATE collaboration_waiting_room
      SET status = 'matched', matched_at = NOW()
      WHERE session_id = $1
        AND student_id IN (${placeholders})
        AND status = 'waiting'
    `, [sessionId, ...participantIds])

    // Notify participants
    const io = getIO()
    participantIds.forEach(studentId => {
      io.to(`student-${studentId}`).emit('collab-session-started', {
        collabSessionId: result.rows[0].id,
        conversationId,
        participants: participantIds,
        currentTurn: participantIds[0],
        mode
      })
    })

    res.json({
      success: true,
      collabSession: result.rows[0]
    })
  } catch (error) {
    console.error('Error creating collaborative session:', error)
    res.status(500).json({ message: 'Failed to create collaborative session' })
  }
})

/**
 * Get collaborative session status
 * GET /api/collaboration/sessions/:collabSessionId
 */
router.get('/sessions/:collabSessionId', async (req, res) => {
  try {
    const { collabSessionId } = req.params

    const result = await db.query(`
      SELECT
        cts.*,
        rtc.topic,
        rtc.message_count,
        rtt.topic as topic_name
      FROM collaborative_tutoring_sessions cts
      JOIN reverse_tutoring_conversations rtc ON cts.conversation_id = rtc.id
      LEFT JOIN reverse_tutoring_topics rtt ON rtc.topic_id = rtt.id
      WHERE cts.id = $1
    `, [collabSessionId])

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Collaborative session not found' })
    }

    res.json({ collabSession: result.rows[0] })
  } catch (error) {
    console.error('Error fetching collaborative session:', error)
    res.status(500).json({ message: 'Failed to fetch session' })
  }
})

/**
 * Pass turn to another participant
 * POST /api/collaboration/sessions/:collabSessionId/tag
 * Body: { fromStudentId, toStudentId }
 */
router.post('/sessions/:collabSessionId/tag', async (req, res) => {
  try {
    const { collabSessionId } = req.params
    const { fromStudentId, toStudentId } = req.body

    // Verify it's the current student's turn
    const sessionResult = await db.query(`
      SELECT current_turn_student_id, participant_ids, turn_count, session_id
      FROM collaborative_tutoring_sessions
      WHERE id = $1 AND status = 'active'
    `, [collabSessionId])

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found or not active' })
    }

    const session = sessionResult.rows[0]

    if (session.current_turn_student_id !== fromStudentId) {
      return res.status(403).json({ message: 'Not your turn' })
    }

    // Verify toStudentId is a participant
    const participants = session.participant_ids
    if (!participants.includes(toStudentId)) {
      return res.status(400).json({ message: 'Target student is not a participant' })
    }

    // Update turn
    await db.query(`
      UPDATE collaborative_tutoring_sessions
      SET
        current_turn_student_id = $1,
        turn_count = turn_count + 1
      WHERE id = $2
    `, [toStudentId, collabSessionId])

    // Notify all participants
    const io = getIO()
    io.to(`collab-${collabSessionId}`).emit('collab-turn-changed', {
      collabSessionId,
      previousTurn: fromStudentId,
      currentTurn: toStudentId,
      turnCount: session.turn_count + 1
    })

    res.json({
      success: true,
      currentTurn: toStudentId
    })
  } catch (error) {
    console.error('Error passing turn:', error)
    res.status(500).json({ message: 'Failed to pass turn' })
  }
})

/**
 * Update contributions after a message
 * POST /api/collaboration/sessions/:collabSessionId/contribution
 * Body: { studentId, wordCount, analysisScore }
 */
router.post('/sessions/:collabSessionId/contribution', async (req, res) => {
  try {
    const { collabSessionId } = req.params
    const { studentId, wordCount, analysisScore } = req.body

    // Get current contributions
    const result = await db.query(`
      SELECT contributions FROM collaborative_tutoring_sessions WHERE id = $1
    `, [collabSessionId])

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' })
    }

    const contributions = result.rows[0].contributions || {}

    // Update student's contribution
    if (!contributions[studentId]) {
      contributions[studentId] = { messageCount: 0, wordCount: 0, analysisSum: 0 }
    }

    contributions[studentId].messageCount += 1
    contributions[studentId].wordCount += (wordCount || 0)
    contributions[studentId].analysisSum += (analysisScore || 0)

    // Calculate balance
    const totalMessages = Object.values(contributions).reduce((sum, c) => sum + c.messageCount, 0)
    const maxMessages = Math.max(...Object.values(contributions).map(c => c.messageCount))
    const isImbalanced = totalMessages > 4 && (maxMessages / totalMessages) > 0.7

    // Update database
    await db.query(`
      UPDATE collaborative_tutoring_sessions
      SET
        contributions = $1,
        is_imbalanced = $2,
        balance_warnings = CASE WHEN $2 AND NOT is_imbalanced THEN balance_warnings + 1 ELSE balance_warnings END
      WHERE id = $3
    `, [JSON.stringify(contributions), isImbalanced, collabSessionId])

    res.json({
      success: true,
      contributions,
      isImbalanced
    })
  } catch (error) {
    console.error('Error updating contributions:', error)
    res.status(500).json({ message: 'Failed to update contributions' })
  }
})

/**
 * Leave collaborative session
 * POST /api/collaboration/sessions/:collabSessionId/leave
 * Body: { studentId }
 */
router.post('/sessions/:collabSessionId/leave', async (req, res) => {
  try {
    const { collabSessionId } = req.params
    const { studentId } = req.body

    const result = await db.query(`
      SELECT participant_ids, session_id, conversation_id
      FROM collaborative_tutoring_sessions
      WHERE id = $1
    `, [collabSessionId])

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' })
    }

    const session = result.rows[0]
    const participants = session.participant_ids.filter(id => id !== studentId)

    if (participants.length < 2) {
      // Not enough participants, end collaboration
      await db.query(`
        UPDATE collaborative_tutoring_sessions
        SET status = 'abandoned', completed_at = NOW()
        WHERE id = $1
      `, [collabSessionId])

      // Convert back to solo
      await db.query(`
        UPDATE reverse_tutoring_conversations
        SET is_collaborative = false
        WHERE id = $1
      `, [session.conversation_id])
    } else {
      // Remove participant
      await db.query(`
        UPDATE collaborative_tutoring_sessions
        SET participant_ids = $1
        WHERE id = $2
      `, [JSON.stringify(participants), collabSessionId])
    }

    // Notify others
    const io = getIO()
    io.to(`collab-${collabSessionId}`).emit('collab-partner-left', {
      collabSessionId,
      studentId,
      remainingParticipants: participants
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Error leaving session:', error)
    res.status(500).json({ message: 'Failed to leave session' })
  }
})

// ============================================
// PARTNER CHAT
// ============================================

/**
 * Send message to partner(s)
 * POST /api/collaboration/chat/:collabSessionId
 * Body: { senderId, senderName, content }
 */
router.post('/chat/:collabSessionId', async (req, res) => {
  try {
    const { collabSessionId } = req.params
    const { senderId, senderName, content } = req.body

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content is required' })
    }

    // Save message
    const result = await db.query(`
      INSERT INTO partner_chat_messages
        (collab_session_id, sender_id, sender_name, content)
      VALUES ($1, $2, $3, $4)
      RETURNING id, created_at
    `, [collabSessionId, senderId, senderName, content.trim()])

    // Broadcast to collaborators
    const io = getIO()
    io.to(`collab-${collabSessionId}`).emit('collab-chat-message', {
      messageId: result.rows[0].id,
      collabSessionId,
      senderId,
      senderName,
      content: content.trim(),
      createdAt: result.rows[0].created_at
    })

    res.json({
      success: true,
      messageId: result.rows[0].id
    })
  } catch (error) {
    console.error('Error sending chat message:', error)
    res.status(500).json({ message: 'Failed to send message' })
  }
})

/**
 * Get chat history
 * GET /api/collaboration/chat/:collabSessionId
 */
router.get('/chat/:collabSessionId', async (req, res) => {
  try {
    const { collabSessionId } = req.params

    const result = await db.query(`
      SELECT id, sender_id, sender_name, content, created_at
      FROM partner_chat_messages
      WHERE collab_session_id = $1
      ORDER BY created_at ASC
      LIMIT 100
    `, [collabSessionId])

    res.json({
      messages: result.rows
    })
  } catch (error) {
    console.error('Error fetching chat history:', error)
    res.status(500).json({ message: 'Failed to fetch chat history' })
  }
})

// ============================================
// INVITATIONS
// ============================================

/**
 * Send invitation to collaborate
 * POST /api/collaboration/invitations
 * Body: { collabSessionId, fromStudentId, toStudentId, message }
 */
router.post('/invitations', async (req, res) => {
  try {
    const { collabSessionId, fromStudentId, toStudentId, message } = req.body

    const result = await db.query(`
      INSERT INTO collaboration_invitations
        (collab_session_id, from_student_id, to_student_id, message)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (collab_session_id, to_student_id) DO UPDATE SET
        status = 'pending',
        message = $4,
        created_at = NOW(),
        expires_at = NOW() + INTERVAL '5 minutes'
      RETURNING id, expires_at
    `, [collabSessionId, fromStudentId, toStudentId, message])

    // Notify target student
    const io = getIO()
    io.to(`student-${toStudentId}`).emit('collab-invitation', {
      invitationId: result.rows[0].id,
      fromStudentId,
      collabSessionId,
      message
    })

    res.json({
      success: true,
      invitationId: result.rows[0].id
    })
  } catch (error) {
    console.error('Error sending invitation:', error)
    res.status(500).json({ message: 'Failed to send invitation' })
  }
})

/**
 * Respond to invitation
 * POST /api/collaboration/invitations/:invitationId/respond
 * Body: { accept: boolean }
 */
router.post('/invitations/:invitationId/respond', async (req, res) => {
  try {
    const { invitationId } = req.params
    const { accept } = req.body

    const status = accept ? 'accepted' : 'declined'

    const result = await db.query(`
      UPDATE collaboration_invitations
      SET status = $1, responded_at = NOW()
      WHERE id = $2 AND status = 'pending' AND expires_at > NOW()
      RETURNING collab_session_id, from_student_id, to_student_id
    `, [status, invitationId])

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Invitation not found or expired' })
    }

    const invitation = result.rows[0]

    // Notify sender
    const io = getIO()
    io.to(`student-${invitation.from_student_id}`).emit('collab-invitation-response', {
      invitationId,
      accepted: accept,
      studentId: invitation.to_student_id
    })

    res.json({ success: true, status })
  } catch (error) {
    console.error('Error responding to invitation:', error)
    res.status(500).json({ message: 'Failed to respond to invitation' })
  }
})

/**
 * Get pending invitations for a student
 * GET /api/collaboration/invitations/pending/:studentId
 */
router.get('/invitations/pending/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params

    const result = await db.query(`
      SELECT
        ci.*,
        ss.student_name as from_student_name
      FROM collaboration_invitations ci
      JOIN session_students ss ON ci.from_student_id = ss.id
      WHERE ci.to_student_id = $1
        AND ci.status = 'pending'
        AND ci.expires_at > NOW()
      ORDER BY ci.created_at DESC
    `, [studentId])

    res.json({
      invitations: result.rows
    })
  } catch (error) {
    console.error('Error fetching invitations:', error)
    res.status(500).json({ message: 'Failed to fetch invitations' })
  }
})

// ============================================
// TEACHER DASHBOARD ADDITIONS
// ============================================

/**
 * Get all collaborative sessions for a class session
 * GET /api/collaboration/dashboard/:sessionId
 */
router.get('/dashboard/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params

    const result = await db.query(`
      SELECT
        cts.*,
        rtc.topic,
        rtc.message_count,
        rtc.current_understanding_level
      FROM collaborative_tutoring_sessions cts
      JOIN reverse_tutoring_conversations rtc ON cts.conversation_id = rtc.id
      WHERE cts.session_id = $1
      ORDER BY cts.created_at DESC
    `, [sessionId])

    res.json({
      collabSessions: result.rows,
      count: result.rows.length
    })
  } catch (error) {
    console.error('Error fetching collaboration dashboard:', error)
    res.status(500).json({ message: 'Failed to fetch dashboard' })
  }
})

export default router
