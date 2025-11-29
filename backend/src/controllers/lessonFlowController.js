import db from '../database/db.js'
import { getIO } from '../services/ioInstance.js'

/**
 * Create a new lesson flow
 * POST /api/sessions/:sessionId/lesson-flows
 */
export async function createLessonFlow(req, res) {
  const { sessionId } = req.params
  const { title, description, activityIds, autoAdvance, showProgress, allowReview, pacingMode } = req.body
  const userId = req.user.userId

  try {
    // Verify session belongs to user
    const session = await db.query(
      'SELECT * FROM sessions WHERE id = $1 AND teacher_id = $2',
      [sessionId, userId]
    )

    if (session.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' })
    }

    // Create lesson flow
    const flowResult = await db.query(
      `INSERT INTO lesson_flows (
        session_id, title, description, auto_advance, show_progress, allow_review, pacing_mode
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [sessionId, title, description, autoAdvance !== false, showProgress !== false, allowReview || false, pacingMode || 'student_paced']
    )

    const flow = flowResult.rows[0]

    // Add activities to flow in sequence
    if (activityIds && activityIds.length > 0) {
      for (let i = 0; i < activityIds.length; i++) {
        await db.query(
          `INSERT INTO lesson_flow_items (
            flow_id, activity_id, sequence_order, advance_type
          ) VALUES ($1, $2, $3, $4)`,
          [flow.id, activityIds[i], i + 1, 'on_complete']
        )
      }
    }

    res.status(201).json({
      message: 'Lesson flow created successfully',
      flow
    })
  } catch (error) {
    console.error('Create lesson flow error:', error)
    res.status(500).json({ message: 'Failed to create lesson flow' })
  }
}

/**
 * Get lesson flows for a session
 * GET /api/sessions/:sessionId/lesson-flows
 */
export async function getSessionLessonFlows(req, res) {
  const { sessionId } = req.params

  try {
    const flows = await db.query(
      `SELECT
        lf.*,
        COUNT(lfi.id) as total_activities
       FROM lesson_flows lf
       LEFT JOIN lesson_flow_items lfi ON lf.id = lfi.flow_id
       WHERE lf.session_id = $1
       GROUP BY lf.id
       ORDER BY lf.created_at DESC`,
      [sessionId]
    )

    res.json({ flows: flows.rows })
  } catch (error) {
    console.error('Get lesson flows error:', error)
    res.status(500).json({ message: 'Failed to get lesson flows' })
  }
}

/**
 * Get lesson flow details with activities
 * GET /api/lesson-flows/:flowId
 */
export async function getLessonFlowDetails(req, res) {
  const { flowId } = req.params

  try {
    // Get flow
    const flowResult = await db.query(
      'SELECT * FROM lesson_flows WHERE id = $1',
      [flowId]
    )

    if (flowResult.rows.length === 0) {
      return res.status(404).json({ message: 'Lesson flow not found' })
    }

    const flow = flowResult.rows[0]

    // Get flow items with activity details
    const itemsResult = await db.query(
      `SELECT
        lfi.*,
        a.type, a.prompt, a.content, a.difficulty_level
       FROM lesson_flow_items lfi
       JOIN activities a ON lfi.activity_id = a.id
       WHERE lfi.flow_id = $1
       ORDER BY lfi.sequence_order`,
      [flowId]
    )

    res.json({
      flow,
      items: itemsResult.rows
    })
  } catch (error) {
    console.error('Get lesson flow details error:', error)
    res.status(500).json({ message: 'Failed to get lesson flow details' })
  }
}

/**
 * Start a lesson flow (activate it for students)
 * POST /api/lesson-flows/:flowId/start
 */
export async function startLessonFlow(req, res) {
  const { flowId } = req.params

  try {
    // Deactivate any other active flows for this session
    const flowCheck = await db.query(
      'SELECT session_id FROM lesson_flows WHERE id = $1',
      [flowId]
    )

    if (flowCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Lesson flow not found' })
    }

    const sessionId = flowCheck.rows[0].session_id

    await db.query(
      'UPDATE lesson_flows SET is_active = false WHERE session_id = $1',
      [sessionId]
    )

    // Activate this flow
    await db.query(
      'UPDATE lesson_flows SET is_active = true, updated_at = NOW() WHERE id = $1',
      [flowId]
    )

    // Get first activity
    const firstItem = await db.query(
      `SELECT lfi.*, a.*
       FROM lesson_flow_items lfi
       JOIN activities a ON lfi.activity_id = a.id
       WHERE lfi.flow_id = $1
       ORDER BY lfi.sequence_order
       LIMIT 1`,
      [flowId]
    )

    if (firstItem.rows.length === 0) {
      return res.status(400).json({ message: 'Lesson flow has no activities' })
    }

    // Emit to students that lesson flow has started
    const io = getIO()
    if (io) {
      io.to(`session-${sessionId}`).emit('lesson-flow-started', {
        flowId,
        firstActivity: firstItem.rows[0],
        activityId: firstItem.rows[0].activity_id
      })
    }

    res.json({
      message: 'Lesson flow started',
      firstActivity: firstItem.rows[0]
    })
  } catch (error) {
    console.error('Start lesson flow error:', error)
    res.status(500).json({ message: 'Failed to start lesson flow' })
  }
}

/**
 * Get student's current activity in flow
 * GET /api/lesson-flows/:flowId/current-activity
 */
export async function getCurrentActivity(req, res) {
  const { flowId } = req.params
  const studentId = req.student?.id || req.query.studentId

  if (!studentId) {
    return res.status(400).json({ message: 'Student ID required' })
  }

  try {
    // Check if student has progress record
    let progress = await db.query(
      'SELECT * FROM lesson_flow_progress WHERE flow_id = $1 AND student_id = $2',
      [flowId, studentId]
    )

    // If no progress, create initial record
    if (progress.rows.length === 0) {
      const firstItem = await db.query(
        'SELECT id FROM lesson_flow_items WHERE flow_id = $1 ORDER BY sequence_order LIMIT 1',
        [flowId]
      )

      if (firstItem.rows.length === 0) {
        return res.status(404).json({ message: 'No activities in this flow' })
      }

      await db.query(
        `INSERT INTO lesson_flow_progress (flow_id, student_id, current_item_id, current_sequence)
         VALUES ($1, $2, $3, 1)`,
        [flowId, studentId, firstItem.rows[0].id]
      )

      progress = await db.query(
        'SELECT * FROM lesson_flow_progress WHERE flow_id = $1 AND student_id = $2',
        [flowId, studentId]
      )
    }

    const studentProgress = progress.rows[0]

    // Get flow info including pacing mode
    const flowInfoResult = await db.query(
      `SELECT pacing_mode, title, auto_advance, show_progress, allow_review, teacher_current_sequence
       FROM lesson_flows WHERE id = $1`,
      [flowId]
    )

    const flowInfo = flowInfoResult.rows[0] || {}

    // For teacher-paced modes, use teacher's current sequence
    const currentSequence = (flowInfo.pacing_mode === 'teacher_paced' || flowInfo.pacing_mode === 'teacher_guided')
      ? (flowInfo.teacher_current_sequence || 1)
      : studentProgress.current_sequence

    // Get current activity details
    const activityResult = await db.query(
      `SELECT
        lfi.sequence_order,
        lfi.advance_type,
        lfi.advance_delay_seconds,
        a.*,
        (SELECT COUNT(*) FROM lesson_flow_items WHERE flow_id = $1) as total_items
       FROM lesson_flow_items lfi
       JOIN activities a ON lfi.activity_id = a.id
       WHERE lfi.flow_id = $1 AND lfi.sequence_order = $2
       LIMIT 1`,
      [flowId, currentSequence]
    )

    if (activityResult.rows.length === 0) {
      return res.status(404).json({ message: 'Current activity not found' })
    }

    const currentActivity = activityResult.rows[0]

    res.json({
      activity: currentActivity,
      progress: {
        currentSequence: currentSequence,
        totalItems: parseInt(currentActivity.total_items),
        isCompleted: studentProgress.is_completed,
        completedItems: studentProgress.completed_items || []
      },
      flowInfo: {
        pacingMode: flowInfo.pacing_mode,
        title: flowInfo.title,
        autoAdvance: flowInfo.auto_advance,
        showProgress: flowInfo.show_progress,
        allowReview: flowInfo.allow_review
      }
    })
  } catch (error) {
    console.error('Get current activity error:', error)
    res.status(500).json({ message: 'Failed to get current activity' })
  }
}

/**
 * Complete current activity and advance to next
 * POST /api/lesson-flows/:flowId/advance
 */
export async function advanceToNext(req, res) {
  const { flowId } = req.params
  const { studentId, completedActivityId } = req.body

  if (!studentId) {
    return res.status(400).json({ message: 'Student ID required' })
  }

  try {
    // Get student progress
    const progress = await db.query(
      'SELECT * FROM lesson_flow_progress WHERE flow_id = $1 AND student_id = $2',
      [flowId, studentId]
    )

    if (progress.rows.length === 0) {
      return res.status(404).json({ message: 'No progress found for student' })
    }

    const studentProgress = progress.rows[0]

    // Get total items in flow
    const totalResult = await db.query(
      'SELECT COUNT(*) as total FROM lesson_flow_items WHERE flow_id = $1',
      [flowId]
    )
    const totalItems = parseInt(totalResult.rows[0].total)

    const nextSequence = studentProgress.current_sequence + 1

    // Check if flow is complete
    if (nextSequence > totalItems) {
      // Mark flow as completed
      await db.query(
        `UPDATE lesson_flow_progress
         SET is_completed = true, completed_at = NOW()
         WHERE flow_id = $1 AND student_id = $2`,
        [flowId, studentId]
      )

      // Get flow and session info
      const flowInfo = await db.query(
        'SELECT session_id FROM lesson_flows WHERE id = $1',
        [flowId]
      )

      // Emit completion event
      const io = getIO()
      if (io && flowInfo.rows.length > 0) {
        io.to(`session-${flowInfo.rows[0].session_id}`).emit('lesson-flow-completed', {
          flowId,
          studentId
        })
      }

      return res.json({
        isComplete: true,
        message: 'Lesson flow completed!'
      })
    }

    // Get next activity
    const nextItem = await db.query(
      `SELECT
        lfi.id as flow_item_id,
        lfi.sequence_order,
        lfi.advance_type,
        lfi.advance_delay_seconds,
        a.*
       FROM lesson_flow_items lfi
       JOIN activities a ON lfi.activity_id = a.id
       WHERE lfi.flow_id = $1 AND lfi.sequence_order = $2
       LIMIT 1`,
      [flowId, nextSequence]
    )

    if (nextItem.rows.length === 0) {
      return res.status(404).json({ message: 'Next activity not found' })
    }

    const nextActivity = nextItem.rows[0]

    // Update progress (use flow_item_id, not activity id)
    await db.query(
      `UPDATE lesson_flow_progress
       SET current_sequence = $1, current_item_id = $2
       WHERE flow_id = $3 AND student_id = $4`,
      [nextSequence, nextActivity.flow_item_id, flowId, studentId]
    )

    // Get flow and session info for WebSocket
    const flowInfo = await db.query(
      'SELECT session_id FROM lesson_flows WHERE id = $1',
      [flowId]
    )

    // Emit to student that they should advance
    const io = getIO()
    if (io && flowInfo.rows.length > 0) {
      io.to(`session-${flowInfo.rows[0].session_id}`).emit('flow-advance', {
        flowId,
        studentId,
        nextActivity,
        sequence: nextSequence,
        totalItems
      })
    }

    res.json({
      isComplete: false,
      nextActivity,
      progress: {
        currentSequence: nextSequence,
        totalItems
      }
    })
  } catch (error) {
    console.error('Advance to next error:', error)
    res.status(500).json({ message: 'Failed to advance to next activity' })
  }
}

/**
 * Stop/deactivate a lesson flow
 * POST /api/lesson-flows/:flowId/stop
 */
export async function stopLessonFlow(req, res) {
  const { flowId } = req.params

  try {
    await db.query(
      'UPDATE lesson_flows SET is_active = false WHERE id = $1',
      [flowId]
    )

    // Get session ID for WebSocket
    const flowInfo = await db.query(
      'SELECT session_id FROM lesson_flows WHERE id = $1',
      [flowId]
    )

    // Emit to students
    const io = getIO()
    if (io && flowInfo.rows.length > 0) {
      io.to(`session-${flowInfo.rows[0].session_id}`).emit('lesson-flow-stopped', {
        flowId
      })
    }

    res.json({ message: 'Lesson flow stopped' })
  } catch (error) {
    console.error('Stop lesson flow error:', error)
    res.status(500).json({ message: 'Failed to stop lesson flow' })
  }
}

/**
 * Update a lesson flow
 * PUT /api/lesson-flows/:flowId
 */
export async function updateLessonFlow(req, res) {
  const { flowId } = req.params
  const { title, description, activityIds, autoAdvance, showProgress, allowReview, pacingMode } = req.body

  try {
    // Update lesson flow details
    const flowResult = await db.query(
      `UPDATE lesson_flows
       SET title = $1, description = $2, auto_advance = $3, show_progress = $4, allow_review = $5, pacing_mode = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [title, description, autoAdvance !== false, showProgress !== false, allowReview || false, pacingMode || 'student_paced', flowId]
    )

    if (flowResult.rows.length === 0) {
      return res.status(404).json({ message: 'Lesson flow not found' })
    }

    const flow = flowResult.rows[0]

    // Delete existing flow items
    await db.query('DELETE FROM lesson_flow_items WHERE flow_id = $1', [flowId])

    // Add new activities to flow in sequence
    if (activityIds && activityIds.length > 0) {
      for (let i = 0; i < activityIds.length; i++) {
        await db.query(
          `INSERT INTO lesson_flow_items (
            flow_id, activity_id, sequence_order, advance_type
          ) VALUES ($1, $2, $3, $4)`,
          [flowId, activityIds[i], i + 1, 'on_complete']
        )
      }
    }

    res.json({
      message: 'Lesson flow updated successfully',
      flow
    })
  } catch (error) {
    console.error('Update lesson flow error:', error)
    res.status(500).json({ message: 'Failed to update lesson flow' })
  }
}

/**
 * Delete a lesson flow
 * DELETE /api/lesson-flows/:flowId
 */
export async function deleteLessonFlow(req, res) {
  const { flowId } = req.params

  try {
    await db.query('DELETE FROM lesson_flows WHERE id = $1', [flowId])

    res.json({ message: 'Lesson flow deleted successfully' })
  } catch (error) {
    console.error('Delete lesson flow error:', error)
    res.status(500).json({ message: 'Failed to delete lesson flow' })
  }
}

/**
 * Get the active lesson flow for a session (for students joining after flow started)
 * GET /api/sessions/:sessionId/active-lesson-flow
 */
export async function getActiveFlowForSession(req, res) {
  const { sessionId } = req.params

  try {
    // Get active lesson flow for this session
    const flowResult = await db.query(
      `SELECT lf.*,
        (SELECT COUNT(*) FROM lesson_flow_items WHERE flow_id = lf.id) as total_activities
       FROM lesson_flows lf
       WHERE lf.session_id = $1 AND lf.is_active = true
       LIMIT 1`,
      [sessionId]
    )

    if (flowResult.rows.length === 0) {
      return res.json({ activeFlow: null })
    }

    const flow = flowResult.rows[0]

    // Get the first activity details
    const firstActivity = await db.query(
      `SELECT lfi.*, a.*
       FROM lesson_flow_items lfi
       JOIN activities a ON lfi.activity_id = a.id
       WHERE lfi.flow_id = $1
       ORDER BY lfi.sequence_order
       LIMIT 1`,
      [flow.id]
    )

    res.json({
      activeFlow: {
        ...flow,
        firstActivity: firstActivity.rows[0] || null
      }
    })
  } catch (error) {
    console.error('Get active flow error:', error)
    res.status(500).json({ message: 'Failed to get active lesson flow' })
  }
}

/**
 * Teacher advances all students to the next activity (for teacher-paced mode)
 * POST /api/lesson-flows/:flowId/teacher-advance
 */
export async function teacherAdvanceFlow(req, res) {
  const { flowId } = req.params
  const { targetSequence } = req.body // Optional: go to specific activity

  try {
    // Get flow info
    const flowResult = await db.query(
      `SELECT lf.*,
        (SELECT COUNT(*) FROM lesson_flow_items WHERE flow_id = lf.id) as total_activities
       FROM lesson_flows lf
       WHERE lf.id = $1`,
      [flowId]
    )

    if (flowResult.rows.length === 0) {
      return res.status(404).json({ message: 'Lesson flow not found' })
    }

    const flow = flowResult.rows[0]
    const totalItems = parseInt(flow.total_activities)
    const currentSequence = flow.teacher_current_sequence || 1
    const newSequence = targetSequence ? parseInt(targetSequence) : currentSequence + 1

    // Validate new sequence
    if (newSequence < 1 || newSequence > totalItems) {
      return res.status(400).json({ message: 'Invalid sequence number' })
    }

    // Check if flow is complete
    if (newSequence > totalItems) {
      return res.json({
        isComplete: true,
        message: 'Lesson flow is complete'
      })
    }

    // Update teacher's current position
    await db.query(
      'UPDATE lesson_flows SET teacher_current_sequence = $1, updated_at = NOW() WHERE id = $2',
      [newSequence, flowId]
    )

    // Get the activity at this sequence
    const activityResult = await db.query(
      `SELECT lfi.*, a.*
       FROM lesson_flow_items lfi
       JOIN activities a ON lfi.activity_id = a.id
       WHERE lfi.flow_id = $1 AND lfi.sequence_order = $2
       LIMIT 1`,
      [flowId, newSequence]
    )

    if (activityResult.rows.length === 0) {
      return res.status(404).json({ message: 'Activity not found at this sequence' })
    }

    const activity = activityResult.rows[0]

    // Emit WebSocket event to all students
    const io = getIO()
    if (io) {
      io.to(`session-${flow.session_id}`).emit('teacher-flow-advance', {
        flowId,
        sequence: newSequence,
        totalItems,
        activity,
        activityId: activity.activity_id
      })
    }

    res.json({
      isComplete: false,
      currentSequence: newSequence,
      totalItems,
      activity
    })
  } catch (error) {
    console.error('Teacher advance flow error:', error)
    res.status(500).json({ message: 'Failed to advance lesson flow' })
  }
}

/**
 * Teacher goes back to previous activity (for teacher-paced mode)
 * POST /api/lesson-flows/:flowId/teacher-back
 */
export async function teacherBackFlow(req, res) {
  const { flowId } = req.params

  try {
    // Get flow info
    const flowResult = await db.query(
      `SELECT lf.*,
        (SELECT COUNT(*) FROM lesson_flow_items WHERE flow_id = lf.id) as total_activities
       FROM lesson_flows lf
       WHERE lf.id = $1`,
      [flowId]
    )

    if (flowResult.rows.length === 0) {
      return res.status(404).json({ message: 'Lesson flow not found' })
    }

    const flow = flowResult.rows[0]
    const currentSequence = flow.teacher_current_sequence || 1
    const newSequence = Math.max(1, currentSequence - 1)

    // Update teacher's current position
    await db.query(
      'UPDATE lesson_flows SET teacher_current_sequence = $1, updated_at = NOW() WHERE id = $2',
      [newSequence, flowId]
    )

    // Get the activity at this sequence
    const activityResult = await db.query(
      `SELECT lfi.*, a.*
       FROM lesson_flow_items lfi
       JOIN activities a ON lfi.activity_id = a.id
       WHERE lfi.flow_id = $1 AND lfi.sequence_order = $2
       LIMIT 1`,
      [flowId, newSequence]
    )

    const activity = activityResult.rows[0]
    const totalItems = parseInt(flow.total_activities)

    // Emit WebSocket event to all students
    const io = getIO()
    if (io) {
      io.to(`session-${flow.session_id}`).emit('teacher-flow-advance', {
        flowId,
        sequence: newSequence,
        totalItems,
        activity,
        activityId: activity?.activity_id
      })
    }

    res.json({
      currentSequence: newSequence,
      totalItems,
      activity
    })
  } catch (error) {
    console.error('Teacher back flow error:', error)
    res.status(500).json({ message: 'Failed to go back in lesson flow' })
  }
}
