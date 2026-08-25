import db from '../database/db.js'

/**
 * Content Library Controller
 * Manages saving, browsing, and reusing AI-generated activities
 */

/**
 * Save activity to library
 * POST /api/library
 * Body: { activityId, title, description, tags, folder, gradeLevel }
 * Protected: Teacher only
 */
export async function saveToLibrary(req, res) {
  try {
    const {
      activityId,
      title,
      description = '',
      tags = [],
      folder = null,
      gradeLevel = null
    } = req.body

    const teacherId = req.user.userId

    console.log('Save to library request:', {
      activityId,
      title,
      teacherId,
      hasUser: !!req.user,
      tags,
      folder,
      gradeLevel
    })

    // Validation
    if (!activityId || !title) {
      console.error('Validation failed:', { activityId, title })
      return res.status(400).json({
        message: 'Activity ID and title are required'
      })
    }

    // Get activity and verify ownership
    console.log('Fetching activity with ID:', activityId)
    const activityResult = await db.query(
      `SELECT a.*, s.teacher_id, s.subject
       FROM activities a
       JOIN sessions s ON a.session_id = s.id
       WHERE a.id = $1`,
      [activityId]
    )

    if (activityResult.rows.length === 0) {
      console.error('Activity not found:', activityId)
      return res.status(404).json({ message: 'Activity not found' })
    }

    const activity = activityResult.rows[0]

    console.log('Activity found:', {
      id: activity.id,
      type: activity.type,
      hasContent: !!activity.content,
      contentType: typeof activity.content,
      difficulty: activity.difficulty_level,
      subject: activity.subject,
      teacherId: activity.teacher_id
    })

    if (activity.teacher_id !== teacherId) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    // Check if already saved to library
    const existingCheck = await db.query(
      `SELECT id FROM content_library
       WHERE teacher_id = $1
         AND original_prompt = $2
         AND type = $3
         AND difficulty_level = $4`,
      [teacherId, activity.prompt, activity.type, activity.difficulty_level]
    )

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({
        message: 'This activity is already saved to your library',
        libraryItemId: existingCheck.rows[0].id
      })
    }

    // Ensure content is properly formatted for JSONB
    // The content column in activities is JSONB, but node-postgres may return it as string or object
    // We need to ensure it's valid JSON for the JSONB column in content_library
    let contentToSave

    if (typeof activity.content === 'string') {
      // If it's already a string, try to parse it to see if it's valid JSON
      try {
        JSON.parse(activity.content)
        // It's valid JSON string, use as-is
        contentToSave = activity.content
      } catch {
        // It's a plain string (like a reading passage), wrap it in JSON.stringify to make it valid JSON
        contentToSave = JSON.stringify(activity.content)
      }
    } else if (typeof activity.content === 'object') {
      // It's an object, stringify it
      contentToSave = JSON.stringify(activity.content)
    } else {
      // Fallback
      contentToSave = JSON.stringify(activity.content)
    }

    console.log('Content to save:', {
      originalType: typeof activity.content,
      finalType: typeof contentToSave,
      length: contentToSave?.length,
      isValidJSON: (() => { try { JSON.parse(contentToSave); return true } catch { return false } })()
    })

    // Prepare values for insert
    const insertValues = [
      teacherId,
      title,
      description || '',
      activity.type,
      contentToSave,
      activity.difficulty_level || null,
      activity.prompt || '',
      activity.subject || null,
      gradeLevel || null,
      folder || null
    ]

    console.log('Inserting library item with values:', {
      teacherId,
      title,
      type: activity.type,
      hasContent: !!contentToSave,
      difficulty: activity.difficulty_level,
      subject: activity.subject,
      gradeLevel,
      folder
    })

    // Save to library
    let libraryResult
    try {
      libraryResult = await db.query(
        `INSERT INTO content_library (
          teacher_id,
          title,
          description,
          type,
          content,
          difficulty_level,
          original_prompt,
          subject,
          grade_level,
          folder
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        insertValues
      )
    } catch (dbError) {
      console.error('Database INSERT error:', {
        message: dbError.message,
        code: dbError.code,
        detail: dbError.detail,
        constraint: dbError.constraint,
        table: dbError.table,
        column: dbError.column
      })

      // Check if table doesn't exist
      if (dbError.code === '42P01') {
        return res.status(500).json({
          message: 'Library system not initialized. Database migration required.',
          error: 'content_library table does not exist',
          solution: 'Run migration 012_add_content_library.sql on production database'
        })
      }

      throw dbError
    }

    const libraryItem = libraryResult.rows[0]

    console.log('Library item created:', {
      id: libraryItem.id,
      title: libraryItem.title
    })

    // Process tags
    if (tags && tags.length > 0) {
      console.log('Processing tags:', tags)
      try {
        for (const tagName of tags) {
          if (!tagName || typeof tagName !== 'string') {
            console.warn('Skipping invalid tag:', tagName)
            continue
          }

          // Create tag if doesn't exist
          const tagResult = await db.query(
            `INSERT INTO library_tags (teacher_id, name)
             VALUES ($1, $2)
             ON CONFLICT (teacher_id, name)
             DO UPDATE SET name = $2
             RETURNING id`,
            [teacherId, tagName.trim()]
          )

          const tagId = tagResult.rows[0].id

          // Link tag to library item
          await db.query(
            `INSERT INTO library_activity_tags (library_item_id, tag_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [libraryItem.id, tagId]
          )
        }
        console.log('Tags processed successfully')
      } catch (tagError) {
        console.error('Error processing tags:', tagError)
        // Don't fail the whole request if tags fail
      }
    }

    // Log analytics
    await db.query(
      `INSERT INTO analytics_events (event_type, user_id, properties)
       VALUES ($1, $2, $3)`,
      [
        'activity_saved_to_library',
        teacherId,
        JSON.stringify({
          libraryItemId: libraryItem.id,
          activityType: activity.type,
          subject: activity.subject
        })
      ]
    )

    res.json({
      message: 'Activity saved to library successfully',
      libraryItem: {
        ...libraryItem,
        tags
      }
    })

  } catch (error) {
    console.error('Save to library error:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail
    })
    res.status(500).json({
      message: `Failed to save to library: ${error.message}`,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

/**
 * Get all library items for teacher
 * GET /api/library?search=&type=&subject=&tags=&folder=&sortBy=
 * Protected: Teacher only
 */
export async function getLibraryItems(req, res) {
  try {
    const teacherId = req.user.userId
    const {
      search = '',
      type = '',
      subject = '',
      tags = '',
      folder = '',
      sortBy = 'recent' // 'recent', 'popular', 'alphabetical'
    } = req.query

    // Build query
    let query = `
      SELECT
        cl.*,
        ARRAY_AGG(DISTINCT lt.name) FILTER (WHERE lt.name IS NOT NULL) as tags
      FROM content_library cl
      LEFT JOIN library_activity_tags lat ON cl.id = lat.library_item_id
      LEFT JOIN library_tags lt ON lat.tag_id = lt.id
      WHERE cl.teacher_id = $1
    `

    const params = [teacherId]
    let paramCount = 1

    // Add filters
    if (type) {
      paramCount++
      query += ` AND cl.type = $${paramCount}`
      params.push(type)
    }

    if (subject) {
      paramCount++
      query += ` AND cl.subject = $${paramCount}`
      params.push(subject)
    }

    if (folder) {
      paramCount++
      query += ` AND cl.folder = $${paramCount}`
      params.push(folder)
    }

    // Full-text search
    if (search) {
      paramCount++
      query += ` AND (
        to_tsvector('english', cl.title || ' ' || COALESCE(cl.description, ''))
        @@ plainto_tsquery('english', $${paramCount})
        OR cl.title ILIKE $${paramCount + 1}
      )`
      params.push(search, `%${search}%`)
      paramCount++
    }

    // Tag filtering
    if (tags) {
      const tagList = tags.split(',').map(t => t.trim())
      paramCount++
      query += ` AND lt.name = ANY($${paramCount}::text[])`
      params.push(tagList)
    }

    query += ` GROUP BY cl.id`

    // Sorting
    switch (sortBy) {
      case 'popular':
        query += ` ORDER BY cl.times_used DESC, cl.created_at DESC`
        break
      case 'alphabetical':
        query += ` ORDER BY cl.title ASC`
        break
      case 'recent':
      default:
        query += ` ORDER BY cl.created_at DESC`
    }

    const result = await db.query(query, params)

    res.json({
      items: result.rows.map(item => ({
        ...item,
        content: (() => {
          // Safe content parsing - handles strings, objects, and parse errors
          if (typeof item.content === 'string') {
            try {
              return JSON.parse(item.content)
            } catch {
              // If parse fails, return as-is (plain string content)
              return item.content
            }
          }
          return item.content
        })(),
        tags: item.tags || []
      })),
      count: result.rows.length
    })

  } catch (error) {
    console.error('Get library items error:', error)
    res.status(500).json({
      message: `Failed to get library items: ${error.message}`
    })
  }
}

/**
 * Get single library item by ID
 * GET /api/library/:id
 * Protected: Teacher only
 */
export async function getLibraryItem(req, res) {
  try {
    const { id } = req.params
    const teacherId = req.user.userId

    const result = await db.query(
      `SELECT
        cl.*,
        ARRAY_AGG(DISTINCT lt.name) FILTER (WHERE lt.name IS NOT NULL) as tags
       FROM content_library cl
       LEFT JOIN library_activity_tags lat ON cl.id = lat.library_item_id
       LEFT JOIN library_tags lt ON lat.tag_id = lt.id
       WHERE cl.id = $1 AND cl.teacher_id = $2
       GROUP BY cl.id`,
      [id, teacherId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Library item not found' })
    }

    const item = result.rows[0]

    res.json({
      item: {
        ...item,
        content: (() => {
          // Safe content parsing - handles strings, objects, and parse errors
          if (typeof item.content === 'string') {
            try {
              return JSON.parse(item.content)
            } catch {
              // If parse fails, return as-is (plain string content)
              return item.content
            }
          }
          return item.content
        })(),
        tags: item.tags || []
      }
    })

  } catch (error) {
    console.error('Get library item error:', error)
    res.status(500).json({ message: 'Failed to get library item' })
  }
}

/**
 * Update library item
 * PUT /api/library/:id
 * Body: { title, description, tags, folder, gradeLevel }
 * Protected: Teacher only
 */
export async function updateLibraryItem(req, res) {
  try {
    const { id } = req.params
    const {
      title,
      description,
      tags = [],
      folder,
      gradeLevel
    } = req.body

    const teacherId = req.user.userId

    // Verify ownership
    const ownerCheck = await db.query(
      'SELECT id FROM content_library WHERE id = $1 AND teacher_id = $2',
      [id, teacherId]
    )

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Library item not found' })
    }

    // Update library item
    const result = await db.query(
      `UPDATE content_library
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           folder = $3,
           grade_level = $4,
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [title, description, folder, gradeLevel, id]
    )

    // Update tags if provided
    if (tags && tags.length >= 0) {
      // Remove existing tags
      await db.query(
        'DELETE FROM library_activity_tags WHERE library_item_id = $1',
        [id]
      )

      // Add new tags
      for (const tagName of tags) {
        const tagResult = await db.query(
          `INSERT INTO library_tags (teacher_id, name)
           VALUES ($1, $2)
           ON CONFLICT (teacher_id, name)
           DO UPDATE SET name = $2
           RETURNING id`,
          [teacherId, tagName.trim()]
        )

        const tagId = tagResult.rows[0].id

        await db.query(
          `INSERT INTO library_activity_tags (library_item_id, tag_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [id, tagId]
        )
      }
    }

    res.json({
      message: 'Library item updated successfully',
      item: {
        ...result.rows[0],
        tags
      }
    })

  } catch (error) {
    console.error('Update library item error:', error)
    res.status(500).json({ message: 'Failed to update library item' })
  }
}

/**
 * Delete library item
 * DELETE /api/library/:id
 * Protected: Teacher only
 */
export async function deleteLibraryItem(req, res) {
  try {
    const { id } = req.params
    const teacherId = req.user.userId

    const result = await db.query(
      'DELETE FROM content_library WHERE id = $1 AND teacher_id = $2 RETURNING *',
      [id, teacherId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Library item not found' })
    }

    // Log analytics
    await db.query(
      `INSERT INTO analytics_events (event_type, user_id, properties)
       VALUES ($1, $2, $3)`,
      [
        'library_item_deleted',
        teacherId,
        JSON.stringify({ libraryItemId: id })
      ]
    )

    res.json({ message: 'Library item deleted successfully' })

  } catch (error) {
    console.error('Delete library item error:', error)
    res.status(500).json({ message: 'Failed to delete library item' })
  }
}

/**
 * Reuse library item in session (creates new activity)
 * POST /api/library/:id/reuse
 * Body: { sessionId }
 * Protected: Teacher only
 */
export async function reuseLibraryItem(req, res) {
  try {
    const { id } = req.params
    const { sessionId } = req.body
    const teacherId = req.user.userId

    // Validation
    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID is required' })
    }

    // Get library item
    const libraryResult = await db.query(
      'SELECT * FROM content_library WHERE id = $1 AND teacher_id = $2',
      [id, teacherId]
    )

    if (libraryResult.rows.length === 0) {
      return res.status(404).json({ message: 'Library item not found' })
    }

    const libraryItem = libraryResult.rows[0]

    // Verify session ownership
    const sessionCheck = await db.query(
      'SELECT id FROM sessions WHERE id = $1 AND teacher_id = $2 AND status = $3',
      [sessionId, teacherId, 'active']
    )

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found or not active' })
    }

    // Create new activity from library item
    const activityResult = await db.query(
      `INSERT INTO activities (
        session_id,
        type,
        prompt,
        ai_generated,
        generation_time_ms,
        cached,
        content,
        difficulty_level,
        pushed_to
      )
      VALUES ($1, $2, $3, true, 0, true, $4, $5, 'none')
      RETURNING *`,
      [
        sessionId,
        libraryItem.type,
        `[Reused from library] ${libraryItem.title}`,
        libraryItem.content,
        libraryItem.difficulty_level
      ]
    )

    // Update library item usage stats
    await db.query(
      `UPDATE content_library
       SET times_used = times_used + 1,
           last_used_at = NOW()
       WHERE id = $1`,
      [id]
    )

    // Log analytics
    await db.query(
      `INSERT INTO analytics_events (event_type, user_id, session_id, properties)
       VALUES ($1, $2, $3, $4)`,
      [
        'library_item_reused',
        teacherId,
        sessionId,
        JSON.stringify({
          libraryItemId: id,
          activityType: libraryItem.type
        })
      ]
    )

    res.json({
      message: 'Library item reused successfully',
      activity: {
        ...activityResult.rows[0],
        content: (() => {
          // Safe content parsing - handles strings, objects, and parse errors
          if (typeof libraryItem.content === 'string') {
            try {
              return JSON.parse(libraryItem.content)
            } catch {
              // If parse fails, return as-is (plain string content)
              return libraryItem.content
            }
          }
          return libraryItem.content
        })()
      }
    })

  } catch (error) {
    console.error('Reuse library item error:', error)
    res.status(500).json({ message: 'Failed to reuse library item' })
  }
}

/**
 * Get all tags for teacher
 * GET /api/library/tags
 * Protected: Teacher only
 */
export async function getTags(req, res) {
  try {
    const teacherId = req.user.userId

    const result = await db.query(
      `SELECT
        lt.*,
        COUNT(lat.library_item_id) as usage_count
       FROM library_tags lt
       LEFT JOIN library_activity_tags lat ON lt.id = lat.tag_id
       WHERE lt.teacher_id = $1
       GROUP BY lt.id
       ORDER BY usage_count DESC, lt.name ASC`,
      [teacherId]
    )

    res.json({ tags: result.rows })

  } catch (error) {
    console.error('Get tags error:', error)
    res.status(500).json({ message: 'Failed to get tags' })
  }
}

/**
 * Get all folders for teacher
 * GET /api/library/folders
 * Protected: Teacher only
 */
export async function getFolders(req, res) {
  try {
    const teacherId = req.user.userId

    const result = await db.query(
      `SELECT
        folder,
        COUNT(*) as item_count
       FROM content_library
       WHERE teacher_id = $1 AND folder IS NOT NULL
       GROUP BY folder
       ORDER BY folder ASC`,
      [teacherId]
    )

    res.json({
      folders: result.rows.map(row => ({
        name: row.folder,
        itemCount: parseInt(row.item_count)
      }))
    })

  } catch (error) {
    console.error('Get folders error:', error)
    res.status(500).json({ message: 'Failed to get folders' })
  }
}

/**
 * Get library statistics
 * GET /api/library/stats
 * Protected: Teacher only
 */
export async function getLibraryStats(req, res) {
  try {
    const teacherId = req.user.userId

    const result = await db.query(
      `SELECT
        COUNT(*) as total_items,
        SUM(times_used) as total_uses,
        COUNT(DISTINCT type) as unique_types,
        COUNT(DISTINCT subject) as unique_subjects,
        MAX(created_at) as last_saved
       FROM content_library
       WHERE teacher_id = $1`,
      [teacherId]
    )

    const stats = result.rows[0]

    res.json({
      totalItems: parseInt(stats.total_items) || 0,
      totalUses: parseInt(stats.total_uses) || 0,
      uniqueTypes: parseInt(stats.unique_types) || 0,
      uniqueSubjects: parseInt(stats.unique_subjects) || 0,
      lastSaved: stats.last_saved
    })

  } catch (error) {
    console.error('Get library stats error:', error)
    res.status(500).json({ message: 'Failed to get library stats' })
  }
}

export default {
  saveToLibrary,
  getLibraryItems,
  getLibraryItem,
  updateLibraryItem,
  deleteLibraryItem,
  reuseLibraryItem,
  getTags,
  getFolders,
  getLibraryStats
}
