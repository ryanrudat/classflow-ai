import db from '../database/db.js'
import { getIO } from '../services/ioInstance.js'
import { generateJoinCode } from '../utils/generateCode.js'

// ============================================================================
// LEARNING WORLDS CRUD
// ============================================================================

/**
 * Create a new learning world
 * POST /api/learning-worlds
 */
export async function createWorld(req, res) {
  const { name, description, theme, targetAgeMin, targetAgeMax, targetLanguage, supportLanguage } = req.body
  const userId = req.user.userId

  try {
    const result = await db.query(
      `INSERT INTO learning_worlds (
        teacher_id, name, description, theme,
        target_age_min, target_age_max,
        target_language, support_language
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        userId,
        name,
        description || null,
        theme || 'fantasy',
        targetAgeMin || 4,
        targetAgeMax || 10,
        targetLanguage || 'en',
        supportLanguage || 'zh-TW'
      ]
    )

    res.status(201).json({
      message: 'Learning world created successfully',
      world: result.rows[0]
    })
  } catch (error) {
    console.error('Create world error:', error)
    res.status(500).json({ message: 'Failed to create learning world' })
  }
}

/**
 * Get all learning worlds for teacher
 * GET /api/learning-worlds
 */
export async function getWorlds(req, res) {
  const userId = req.user.userId

  try {
    const result = await db.query(
      `SELECT
        w.*,
        COUNT(DISTINCT l.id) as land_count,
        COUNT(DISTINCT a.id) as activity_count
      FROM learning_worlds w
      LEFT JOIN world_lands l ON w.id = l.world_id
      LEFT JOIN land_activities a ON l.id = a.land_id
      WHERE w.teacher_id = $1 AND w.is_archived = false
      GROUP BY w.id
      ORDER BY w.updated_at DESC`,
      [userId]
    )

    res.json({ worlds: result.rows })
  } catch (error) {
    console.error('Get worlds error:', error)
    res.status(500).json({ message: 'Failed to get learning worlds' })
  }
}

/**
 * Get a single learning world with lands
 * GET /api/learning-worlds/:worldId
 */
export async function getWorld(req, res) {
  const { worldId } = req.params
  const userId = req.user.userId

  try {
    // Get world
    const worldResult = await db.query(
      `SELECT * FROM learning_worlds WHERE id = $1 AND teacher_id = $2`,
      [worldId, userId]
    )

    if (worldResult.rows.length === 0) {
      return res.status(404).json({ message: 'Learning world not found' })
    }

    const world = worldResult.rows[0]

    // Get lands with character info
    const landsResult = await db.query(
      `SELECT
        l.*,
        c.name as character_name,
        c.avatar_url as character_avatar,
        c.catchphrase as character_catchphrase,
        COUNT(a.id) as activity_count
      FROM world_lands l
      LEFT JOIN world_characters c ON l.mascot_character_id = c.id
      LEFT JOIN land_activities a ON l.id = a.land_id
      WHERE l.world_id = $1
      GROUP BY l.id, c.id
      ORDER BY l.sequence_order`,
      [worldId]
    )

    // Get characters
    const charactersResult = await db.query(
      `SELECT * FROM world_characters WHERE world_id = $1`,
      [worldId]
    )

    res.json({
      world,
      lands: landsResult.rows,
      characters: charactersResult.rows
    })
  } catch (error) {
    console.error('Get world error:', error)
    res.status(500).json({ message: 'Failed to get learning world' })
  }
}

/**
 * Update a learning world
 * PUT /api/learning-worlds/:worldId
 */
export async function updateWorld(req, res) {
  const { worldId } = req.params
  const { name, description, theme, targetAgeMin, targetAgeMax, mapBackgroundUrl, mapBackgroundColor, isPublished } = req.body
  const userId = req.user.userId

  try {
    // Verify ownership
    const check = await db.query(
      `SELECT id FROM learning_worlds WHERE id = $1 AND teacher_id = $2`,
      [worldId, userId]
    )

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Learning world not found' })
    }

    const result = await db.query(
      `UPDATE learning_worlds SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        theme = COALESCE($3, theme),
        target_age_min = COALESCE($4, target_age_min),
        target_age_max = COALESCE($5, target_age_max),
        map_background_url = COALESCE($6, map_background_url),
        map_background_color = COALESCE($7, map_background_color),
        is_published = COALESCE($8, is_published),
        updated_at = NOW()
      WHERE id = $9
      RETURNING *`,
      [name, description, theme, targetAgeMin, targetAgeMax, mapBackgroundUrl, mapBackgroundColor, isPublished, worldId]
    )

    res.json({
      message: 'Learning world updated successfully',
      world: result.rows[0]
    })
  } catch (error) {
    console.error('Update world error:', error)
    res.status(500).json({ message: 'Failed to update learning world' })
  }
}

/**
 * Delete a learning world
 * DELETE /api/learning-worlds/:worldId
 */
export async function deleteWorld(req, res) {
  const { worldId } = req.params
  const userId = req.user.userId

  try {
    const result = await db.query(
      `DELETE FROM learning_worlds WHERE id = $1 AND teacher_id = $2 RETURNING id`,
      [worldId, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Learning world not found' })
    }

    res.json({ message: 'Learning world deleted successfully' })
  } catch (error) {
    console.error('Delete world error:', error)
    res.status(500).json({ message: 'Failed to delete learning world' })
  }
}

// ============================================================================
// WORLD CHARACTERS
// ============================================================================

/**
 * Create a character for a world
 * POST /api/learning-worlds/:worldId/characters
 */
export async function createCharacter(req, res) {
  const { worldId } = req.params
  const { name, shortName, species, personalityTraits, catchphrase, voiceStyle, avatarUrl } = req.body
  const userId = req.user.userId

  try {
    // Verify world ownership
    const check = await db.query(
      `SELECT id FROM learning_worlds WHERE id = $1 AND teacher_id = $2`,
      [worldId, userId]
    )

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Learning world not found' })
    }

    const result = await db.query(
      `INSERT INTO world_characters (
        world_id, name, short_name, species,
        personality_traits, catchphrase, voice_style, avatar_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [worldId, name, shortName, species, personalityTraits || [], catchphrase, voiceStyle || 'friendly', avatarUrl]
    )

    res.status(201).json({
      message: 'Character created successfully',
      character: result.rows[0]
    })
  } catch (error) {
    console.error('Create character error:', error)
    res.status(500).json({ message: 'Failed to create character' })
  }
}

/**
 * Update a character
 * PUT /api/characters/:characterId
 */
export async function updateCharacter(req, res) {
  const { characterId } = req.params
  const { name, shortName, species, personalityTraits, catchphrase, voiceStyle, avatarUrl, avatarExpressions } = req.body
  const userId = req.user.userId

  try {
    // Verify ownership through world
    const check = await db.query(
      `SELECT c.id FROM world_characters c
       JOIN learning_worlds w ON c.world_id = w.id
       WHERE c.id = $1 AND w.teacher_id = $2`,
      [characterId, userId]
    )

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Character not found' })
    }

    const result = await db.query(
      `UPDATE world_characters SET
        name = COALESCE($1, name),
        short_name = COALESCE($2, short_name),
        species = COALESCE($3, species),
        personality_traits = COALESCE($4, personality_traits),
        catchphrase = COALESCE($5, catchphrase),
        voice_style = COALESCE($6, voice_style),
        avatar_url = COALESCE($7, avatar_url),
        avatar_expressions = COALESCE($8, avatar_expressions)
      WHERE id = $9
      RETURNING *`,
      [name, shortName, species, personalityTraits, catchphrase, voiceStyle, avatarUrl, avatarExpressions, characterId]
    )

    res.json({
      message: 'Character updated successfully',
      character: result.rows[0]
    })
  } catch (error) {
    console.error('Update character error:', error)
    res.status(500).json({ message: 'Failed to update character' })
  }
}

// ============================================================================
// WORLD LANDS CRUD
// ============================================================================

/**
 * Create a land in a world
 * POST /api/learning-worlds/:worldId/lands
 */
export async function createLand(req, res) {
  const { worldId } = req.params
  const {
    name, slug, description, introStory, completionStory,
    mascotCharacterId, mapPositionX, mapPositionY,
    iconUrl, backgroundUrl, backgroundColor,
    sequenceOrder, targetVocabulary
  } = req.body
  const userId = req.user.userId

  try {
    // Verify world ownership
    const check = await db.query(
      `SELECT id FROM learning_worlds WHERE id = $1 AND teacher_id = $2`,
      [worldId, userId]
    )

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Learning world not found' })
    }

    // Generate slug if not provided
    const landSlug = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    // Get next sequence order if not provided
    let order = sequenceOrder
    if (!order) {
      const orderResult = await db.query(
        `SELECT COALESCE(MAX(sequence_order), 0) + 1 as next_order FROM world_lands WHERE world_id = $1`,
        [worldId]
      )
      order = orderResult.rows[0].next_order
    }

    const result = await db.query(
      `INSERT INTO world_lands (
        world_id, name, slug, description, intro_story, completion_story,
        mascot_character_id, map_position_x, map_position_y,
        icon_url, background_url, background_color,
        sequence_order, target_vocabulary
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        worldId, name, landSlug, description, introStory, completionStory,
        mascotCharacterId, mapPositionX || 50, mapPositionY || 50,
        iconUrl, backgroundUrl, backgroundColor,
        order, targetVocabulary || []
      ]
    )

    res.status(201).json({
      message: 'Land created successfully',
      land: result.rows[0]
    })
  } catch (error) {
    console.error('Create land error:', error)
    if (error.code === '23505') {
      return res.status(400).json({ message: 'A land with this slug already exists in this world' })
    }
    res.status(500).json({ message: 'Failed to create land' })
  }
}

/**
 * Get a land with its activities
 * GET /api/lands/:landId
 */
export async function getLand(req, res) {
  const { landId } = req.params
  const userId = req.user.userId

  try {
    // Get land with world ownership check
    const landResult = await db.query(
      `SELECT l.*, w.teacher_id, c.name as character_name, c.avatar_url as character_avatar,
              c.catchphrase as character_catchphrase, c.personality_traits as character_personality
       FROM world_lands l
       JOIN learning_worlds w ON l.world_id = w.id
       LEFT JOIN world_characters c ON l.mascot_character_id = c.id
       WHERE l.id = $1 AND w.teacher_id = $2`,
      [landId, userId]
    )

    if (landResult.rows.length === 0) {
      return res.status(404).json({ message: 'Land not found' })
    }

    const land = landResult.rows[0]

    // Get activities
    const activitiesResult = await db.query(
      `SELECT * FROM land_activities WHERE land_id = $1 ORDER BY sequence_order`,
      [landId]
    )

    // Get vocabulary
    const vocabularyResult = await db.query(
      `SELECT * FROM world_vocabulary WHERE land_id = $1 ORDER BY word`,
      [landId]
    )

    res.json({
      land,
      activities: activitiesResult.rows,
      vocabulary: vocabularyResult.rows
    })
  } catch (error) {
    console.error('Get land error:', error)
    res.status(500).json({ message: 'Failed to get land' })
  }
}

/**
 * Update a land
 * PUT /api/lands/:landId
 */
export async function updateLand(req, res) {
  const { landId } = req.params
  const {
    name, description, introStory, completionStory,
    mascotCharacterId, mapPositionX, mapPositionY, mapScale,
    iconUrl, backgroundUrl, backgroundColor,
    sequenceOrder, isLocked, unlockAfterLandId, targetVocabulary
  } = req.body
  const userId = req.user.userId

  try {
    // Verify ownership through world
    const check = await db.query(
      `SELECT l.id FROM world_lands l
       JOIN learning_worlds w ON l.world_id = w.id
       WHERE l.id = $1 AND w.teacher_id = $2`,
      [landId, userId]
    )

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Land not found' })
    }

    const result = await db.query(
      `UPDATE world_lands SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        intro_story = COALESCE($3, intro_story),
        completion_story = COALESCE($4, completion_story),
        mascot_character_id = COALESCE($5, mascot_character_id),
        map_position_x = COALESCE($6, map_position_x),
        map_position_y = COALESCE($7, map_position_y),
        map_scale = COALESCE($8, map_scale),
        icon_url = COALESCE($9, icon_url),
        background_url = COALESCE($10, background_url),
        background_color = COALESCE($11, background_color),
        sequence_order = COALESCE($12, sequence_order),
        is_locked = COALESCE($13, is_locked),
        unlock_after_land_id = $14,
        target_vocabulary = COALESCE($15, target_vocabulary),
        updated_at = NOW()
      WHERE id = $16
      RETURNING *`,
      [
        name, description, introStory, completionStory,
        mascotCharacterId, mapPositionX, mapPositionY, mapScale,
        iconUrl, backgroundUrl, backgroundColor,
        sequenceOrder, isLocked, unlockAfterLandId, targetVocabulary, landId
      ]
    )

    res.json({
      message: 'Land updated successfully',
      land: result.rows[0]
    })
  } catch (error) {
    console.error('Update land error:', error)
    res.status(500).json({ message: 'Failed to update land' })
  }
}

/**
 * Delete a land
 * DELETE /api/lands/:landId
 */
export async function deleteLand(req, res) {
  const { landId } = req.params
  const userId = req.user.userId

  try {
    // Verify ownership through world
    const result = await db.query(
      `DELETE FROM world_lands l
       USING learning_worlds w
       WHERE l.id = $1 AND l.world_id = w.id AND w.teacher_id = $2
       RETURNING l.id`,
      [landId, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Land not found' })
    }

    res.json({ message: 'Land deleted successfully' })
  } catch (error) {
    console.error('Delete land error:', error)
    res.status(500).json({ message: 'Failed to delete land' })
  }
}

// ============================================================================
// LAND ACTIVITIES CRUD
// ============================================================================

/**
 * Create an activity in a land
 * POST /api/lands/:landId/activities
 */
export async function createActivity(req, res) {
  const { landId } = req.params
  const {
    title, activityType, instructions, studentPrompt,
    introNarrative, successNarrative, content,
    minAgeLevel, maxAgeLevel, level1Content, level2Content, level3Content,
    tprPrompts, estimatedDurationSeconds, requiresAudio, allowsStudentTouch,
    sequenceOrder
  } = req.body
  const userId = req.user.userId

  try {
    // Verify land ownership through world
    const check = await db.query(
      `SELECT l.id FROM world_lands l
       JOIN learning_worlds w ON l.world_id = w.id
       WHERE l.id = $1 AND w.teacher_id = $2`,
      [landId, userId]
    )

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Land not found' })
    }

    // Get next sequence order if not provided
    let order = sequenceOrder
    if (!order) {
      const orderResult = await db.query(
        `SELECT COALESCE(MAX(sequence_order), 0) + 1 as next_order FROM land_activities WHERE land_id = $1`,
        [landId]
      )
      order = orderResult.rows[0].next_order
    }

    const result = await db.query(
      `INSERT INTO land_activities (
        land_id, title, activity_type, instructions, student_prompt,
        intro_narrative, success_narrative, content,
        min_age_level, max_age_level, level_1_content, level_2_content, level_3_content,
        tpr_prompts, estimated_duration_seconds, requires_audio, allows_student_touch,
        sequence_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        landId, title, activityType, instructions, studentPrompt,
        introNarrative, successNarrative, content || {},
        minAgeLevel || 1, maxAgeLevel || 3, level1Content, level2Content, level3Content,
        tprPrompts || [], estimatedDurationSeconds || 180, requiresAudio !== false, allowsStudentTouch !== false,
        order
      ]
    )

    res.status(201).json({
      message: 'Activity created successfully',
      activity: result.rows[0]
    })
  } catch (error) {
    console.error('Create activity error:', error)
    res.status(500).json({ message: 'Failed to create activity' })
  }
}

/**
 * Update an activity
 * PUT /api/activities/:activityId/world
 */
export async function updateActivity(req, res) {
  const { activityId } = req.params
  const {
    title, instructions, studentPrompt,
    introNarrative, successNarrative, content,
    minAgeLevel, maxAgeLevel, level1Content, level2Content, level3Content,
    tprPrompts, estimatedDurationSeconds, requiresAudio, allowsStudentTouch,
    sequenceOrder
  } = req.body
  const userId = req.user.userId

  try {
    // Verify ownership through land and world
    const check = await db.query(
      `SELECT a.id FROM land_activities a
       JOIN world_lands l ON a.land_id = l.id
       JOIN learning_worlds w ON l.world_id = w.id
       WHERE a.id = $1 AND w.teacher_id = $2`,
      [activityId, userId]
    )

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Activity not found' })
    }

    const result = await db.query(
      `UPDATE land_activities SET
        title = COALESCE($1, title),
        instructions = COALESCE($2, instructions),
        student_prompt = COALESCE($3, student_prompt),
        intro_narrative = COALESCE($4, intro_narrative),
        success_narrative = COALESCE($5, success_narrative),
        content = COALESCE($6, content),
        min_age_level = COALESCE($7, min_age_level),
        max_age_level = COALESCE($8, max_age_level),
        level_1_content = COALESCE($9, level_1_content),
        level_2_content = COALESCE($10, level_2_content),
        level_3_content = COALESCE($11, level_3_content),
        tpr_prompts = COALESCE($12, tpr_prompts),
        estimated_duration_seconds = COALESCE($13, estimated_duration_seconds),
        requires_audio = COALESCE($14, requires_audio),
        allows_student_touch = COALESCE($15, allows_student_touch),
        sequence_order = COALESCE($16, sequence_order),
        updated_at = NOW()
      WHERE id = $17
      RETURNING *`,
      [
        title, instructions, studentPrompt,
        introNarrative, successNarrative, content,
        minAgeLevel, maxAgeLevel, level1Content, level2Content, level3Content,
        tprPrompts, estimatedDurationSeconds, requiresAudio, allowsStudentTouch,
        sequenceOrder, activityId
      ]
    )

    res.json({
      message: 'Activity updated successfully',
      activity: result.rows[0]
    })
  } catch (error) {
    console.error('Update activity error:', error)
    res.status(500).json({ message: 'Failed to update activity' })
  }
}

/**
 * Delete an activity
 * DELETE /api/activities/:activityId/world
 */
export async function deleteActivity(req, res) {
  const { activityId } = req.params
  const userId = req.user.userId

  try {
    // Verify ownership through land and world
    const result = await db.query(
      `DELETE FROM land_activities a
       USING world_lands l, learning_worlds w
       WHERE a.id = $1 AND a.land_id = l.id AND l.world_id = w.id AND w.teacher_id = $2
       RETURNING a.id`,
      [activityId, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Activity not found' })
    }

    res.json({ message: 'Activity deleted successfully' })
  } catch (error) {
    console.error('Delete activity error:', error)
    res.status(500).json({ message: 'Failed to delete activity' })
  }
}

// ============================================================================
// WORLD VOCABULARY
// ============================================================================

/**
 * Add vocabulary to a world
 * POST /api/learning-worlds/:worldId/vocabulary
 */
export async function addVocabulary(req, res) {
  const { worldId } = req.params
  const {
    word, phonetic, partOfSpeech, translationZhTw, translationPinyin,
    difficultyLevel, phraseLevel2, sentenceLevel3,
    imageUrl, audioUrl, landId, category, tags
  } = req.body
  const userId = req.user.userId

  try {
    // Verify world ownership
    const check = await db.query(
      `SELECT id FROM learning_worlds WHERE id = $1 AND teacher_id = $2`,
      [worldId, userId]
    )

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Learning world not found' })
    }

    const result = await db.query(
      `INSERT INTO world_vocabulary (
        world_id, land_id, word, phonetic, part_of_speech,
        translation_zh_tw, translation_pinyin,
        difficulty_level, phrase_level_2, sentence_level_3,
        image_url, audio_url, category, tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        worldId, landId, word, phonetic, partOfSpeech,
        translationZhTw, translationPinyin,
        difficultyLevel || 1, phraseLevel2, sentenceLevel3,
        imageUrl, audioUrl, category, tags || []
      ]
    )

    res.status(201).json({
      message: 'Vocabulary added successfully',
      vocabulary: result.rows[0]
    })
  } catch (error) {
    console.error('Add vocabulary error:', error)
    res.status(500).json({ message: 'Failed to add vocabulary' })
  }
}

/**
 * Get vocabulary for a world
 * GET /api/learning-worlds/:worldId/vocabulary
 */
export async function getWorldVocabulary(req, res) {
  const { worldId } = req.params
  const { landId, category, level } = req.query
  const userId = req.user.userId

  try {
    // Verify world ownership
    const check = await db.query(
      `SELECT id FROM learning_worlds WHERE id = $1 AND teacher_id = $2`,
      [worldId, userId]
    )

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Learning world not found' })
    }

    let query = `SELECT * FROM world_vocabulary WHERE world_id = $1`
    const params = [worldId]
    let paramCount = 1

    if (landId) {
      paramCount++
      query += ` AND land_id = $${paramCount}`
      params.push(landId)
    }

    if (category) {
      paramCount++
      query += ` AND category = $${paramCount}`
      params.push(category)
    }

    if (level) {
      paramCount++
      query += ` AND difficulty_level <= $${paramCount}`
      params.push(parseInt(level))
    }

    query += ` ORDER BY word`

    const result = await db.query(query, params)

    res.json({ vocabulary: result.rows })
  } catch (error) {
    console.error('Get vocabulary error:', error)
    res.status(500).json({ message: 'Failed to get vocabulary' })
  }
}

/**
 * Bulk add vocabulary to a world
 * POST /api/learning-worlds/:worldId/vocabulary/bulk
 */
export async function bulkAddVocabulary(req, res) {
  const { worldId } = req.params
  const { vocabulary, landId } = req.body
  const userId = req.user.userId

  try {
    // Verify world ownership
    const check = await db.query(
      `SELECT id FROM learning_worlds WHERE id = $1 AND teacher_id = $2`,
      [worldId, userId]
    )

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Learning world not found' })
    }

    const addedVocabulary = []

    for (const vocab of vocabulary) {
      const result = await db.query(
        `INSERT INTO world_vocabulary (
          world_id, land_id, word, phonetic, part_of_speech,
          translation_zh_tw, translation_pinyin,
          difficulty_level, phrase_level_2, sentence_level_3,
          image_url, audio_url, category, tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT DO NOTHING
        RETURNING *`,
        [
          worldId, landId || vocab.landId, vocab.word, vocab.phonetic, vocab.partOfSpeech,
          vocab.translationZhTw, vocab.translationPinyin,
          vocab.difficultyLevel || 1, vocab.phraseLevel2, vocab.sentenceLevel3,
          vocab.imageUrl, vocab.audioUrl, vocab.category, vocab.tags || []
        ]
      )

      if (result.rows.length > 0) {
        addedVocabulary.push(result.rows[0])
      }
    }

    res.status(201).json({
      message: `Added ${addedVocabulary.length} vocabulary items`,
      vocabulary: addedVocabulary
    })
  } catch (error) {
    console.error('Bulk add vocabulary error:', error)
    res.status(500).json({ message: 'Failed to add vocabulary' })
  }
}

// ============================================================================
// WORLD SESSIONS
// ============================================================================

/**
 * Start a teaching session for a world
 * POST /api/learning-worlds/:worldId/start-session
 */
export async function startWorldSession(req, res) {
  const { worldId } = req.params
  const { ageLevel, controlMode, audioEnabled, musicEnabled } = req.body
  const userId = req.user.userId

  try {
    // Verify world ownership
    const worldCheck = await db.query(
      `SELECT * FROM learning_worlds WHERE id = $1 AND teacher_id = $2`,
      [worldId, userId]
    )

    if (worldCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Learning world not found' })
    }

    // Generate unique join code
    let joinCode
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      joinCode = generateJoinCode()
      const existing = await db.query(
        'SELECT id FROM sessions WHERE join_code = $1 AND status = $2',
        [joinCode, 'active']
      )
      if (existing.rows.length === 0) break
      attempts++
    }

    if (attempts >= maxAttempts) {
      return res.status(500).json({ message: 'Failed to generate unique join code' })
    }

    // Create a session in the main sessions table for join codes
    const sessionResult = await db.query(
      `INSERT INTO sessions (teacher_id, title, subject, join_code, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING *`,
      [userId, `Learning World: ${worldCheck.rows[0].name}`, 'English', joinCode]
    )

    const session = sessionResult.rows[0]

    // Create a session instance
    const instanceResult = await db.query(
      `INSERT INTO session_instances (session_id, instance_number, label, is_current)
       VALUES ($1, 1, 'Learning World Session', true)
       RETURNING *`,
      [session.id]
    )

    // Create the world session
    const worldSessionResult = await db.query(
      `INSERT INTO world_sessions (
        world_id, teacher_id, session_id,
        age_level, control_mode, audio_enabled, music_enabled
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        worldId, userId, session.id,
        ageLevel || 2, controlMode || 'teacher',
        audioEnabled !== false, musicEnabled !== false
      ]
    )

    res.status(201).json({
      message: 'World session started',
      worldSession: worldSessionResult.rows[0],
      session,
      sessionInstance: instanceResult.rows[0],
      joinCode: session.join_code
    })
  } catch (error) {
    console.error('Start world session error:', error)
    res.status(500).json({ message: 'Failed to start world session' })
  }
}

/**
 * Get world session state
 * GET /api/world-sessions/:sessionId/state
 */
export async function getWorldSessionState(req, res) {
  const { sessionId } = req.params

  try {
    const result = await db.query(
      `SELECT
        ws.*,
        w.name as world_name,
        w.theme as world_theme,
        w.map_background_url,
        w.map_background_color,
        l.name as current_land_name,
        l.slug as current_land_slug,
        a.title as current_activity_title,
        a.activity_type as current_activity_type
      FROM world_sessions ws
      JOIN learning_worlds w ON ws.world_id = w.id
      LEFT JOIN world_lands l ON ws.current_land_id = l.id
      LEFT JOIN land_activities a ON ws.current_activity_id = a.id
      WHERE ws.id = $1 AND ws.is_active = true`,
      [sessionId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'World session not found or inactive' })
    }

    res.json({ state: result.rows[0] })
  } catch (error) {
    console.error('Get world session state error:', error)
    res.status(500).json({ message: 'Failed to get session state' })
  }
}

/**
 * Navigate within a world session
 * POST /api/world-sessions/:sessionId/navigate
 */
export async function navigateWorldSession(req, res) {
  const { sessionId } = req.params
  const { view, landId, activityId } = req.body
  const userId = req.user.userId

  try {
    // Verify session ownership
    const check = await db.query(
      `SELECT ws.* FROM world_sessions ws
       WHERE ws.id = $1 AND ws.teacher_id = $2 AND ws.is_active = true`,
      [sessionId, userId]
    )

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'World session not found' })
    }

    const result = await db.query(
      `UPDATE world_sessions SET
        current_view = COALESCE($1, current_view),
        current_land_id = $2,
        current_activity_id = $3
      WHERE id = $4
      RETURNING *`,
      [view, landId, activityId, sessionId]
    )

    // Emit navigation event via socket
    const io = getIO()
    if (io) {
      io.to(`session-${check.rows[0].session_id}`).emit('world-navigate', {
        view: result.rows[0].current_view,
        landId: result.rows[0].current_land_id,
        activityId: result.rows[0].current_activity_id
      })
    }

    res.json({
      message: 'Navigation updated',
      state: result.rows[0]
    })
  } catch (error) {
    console.error('Navigate world session error:', error)
    res.status(500).json({ message: 'Failed to navigate' })
  }
}

/**
 * Set control mode for world session
 * POST /api/world-sessions/:sessionId/set-control
 */
export async function setControlMode(req, res) {
  const { sessionId } = req.params
  const { controlMode } = req.body
  const userId = req.user.userId

  try {
    // Verify session ownership
    const check = await db.query(
      `SELECT ws.* FROM world_sessions ws
       WHERE ws.id = $1 AND ws.teacher_id = $2 AND ws.is_active = true`,
      [sessionId, userId]
    )

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'World session not found' })
    }

    const result = await db.query(
      `UPDATE world_sessions SET control_mode = $1 WHERE id = $2 RETURNING *`,
      [controlMode, sessionId]
    )

    // Emit control mode change via socket
    const io = getIO()
    if (io) {
      io.to(`session-${check.rows[0].session_id}`).emit('world-control-mode', {
        controlMode: result.rows[0].control_mode
      })
    }

    res.json({
      message: 'Control mode updated',
      controlMode: result.rows[0].control_mode
    })
  } catch (error) {
    console.error('Set control mode error:', error)
    res.status(500).json({ message: 'Failed to set control mode' })
  }
}

/**
 * End a world session
 * POST /api/world-sessions/:sessionId/end
 */
export async function endWorldSession(req, res) {
  const { sessionId } = req.params
  const userId = req.user.userId

  try {
    const result = await db.query(
      `UPDATE world_sessions SET
        is_active = false,
        ended_at = NOW()
      WHERE id = $1 AND teacher_id = $2
      RETURNING *`,
      [sessionId, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'World session not found' })
    }

    // Emit session ended via socket
    const io = getIO()
    if (io && result.rows[0].session_id) {
      io.to(`session-${result.rows[0].session_id}`).emit('world-session-ended', {})
    }

    res.json({ message: 'World session ended' })
  } catch (error) {
    console.error('End world session error:', error)
    res.status(500).json({ message: 'Failed to end session' })
  }
}

// ============================================================================
// STUDENT PROGRESS
// ============================================================================

/**
 * Record activity response/progress
 * POST /api/world-activities/:activityId/respond
 */
export async function recordActivityResponse(req, res) {
  const { activityId } = req.params
  const { worldSessionId, responseData, score, maxScore, isCompleted, timeSpentSeconds } = req.body
  const studentId = req.student?.studentId

  if (!studentId) {
    return res.status(401).json({ message: 'Student authentication required' })
  }

  try {
    // Check if progress exists
    const existing = await db.query(
      `SELECT id, attempt_count FROM land_activity_progress
       WHERE activity_id = $1 AND student_id = $2 AND world_session_id = $3`,
      [activityId, studentId, worldSessionId]
    )

    let result
    if (existing.rows.length > 0) {
      // Update existing progress
      const starsEarned = maxScore > 0 ? Math.min(3, Math.floor((score / maxScore) * 3)) : 0

      result = await db.query(
        `UPDATE land_activity_progress SET
          score = $1,
          max_score = $2,
          is_completed = $3,
          completion_percentage = $4,
          stars_earned = $5,
          response_data = $6,
          time_spent_seconds = time_spent_seconds + $7,
          attempt_count = attempt_count + 1,
          completed_at = CASE WHEN $3 THEN NOW() ELSE completed_at END
        WHERE id = $8
        RETURNING *`,
        [
          score, maxScore, isCompleted,
          isCompleted ? 100 : Math.floor((score / maxScore) * 100),
          starsEarned, responseData, timeSpentSeconds || 0,
          existing.rows[0].id
        ]
      )
    } else {
      // Create new progress record
      const starsEarned = maxScore > 0 ? Math.min(3, Math.floor((score / maxScore) * 3)) : 0

      result = await db.query(
        `INSERT INTO land_activity_progress (
          activity_id, student_id, world_session_id,
          score, max_score, is_completed, completion_percentage,
          stars_earned, response_data, time_spent_seconds, attempt_count,
          started_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1, NOW(), CASE WHEN $6 THEN NOW() ELSE NULL END)
        RETURNING *`,
        [
          activityId, studentId, worldSessionId,
          score, maxScore, isCompleted,
          isCompleted ? 100 : Math.floor((score / maxScore) * 100),
          starsEarned, responseData, timeSpentSeconds || 0
        ]
      )
    }

    // Emit progress update via socket
    const io = getIO()
    if (io && worldSessionId) {
      const sessionResult = await db.query(
        `SELECT session_id FROM world_sessions WHERE id = $1`,
        [worldSessionId]
      )
      if (sessionResult.rows.length > 0) {
        io.to(`session-${sessionResult.rows[0].session_id}`).emit('world-activity-progress', {
          studentId,
          activityId,
          progress: result.rows[0]
        })
      }
    }

    res.json({
      message: 'Progress recorded',
      progress: result.rows[0]
    })
  } catch (error) {
    console.error('Record activity response error:', error)
    res.status(500).json({ message: 'Failed to record response' })
  }
}

// ============================================================================
// LAND TEMPLATES
// ============================================================================

/**
 * Get available land templates
 * GET /api/land-templates
 */
export async function getLandTemplates(req, res) {
  const { category } = req.query

  try {
    let query = `SELECT * FROM land_templates WHERE is_published = true`
    const params = []

    if (category) {
      query += ` AND category = $1`
      params.push(category)
    }

    query += ` ORDER BY times_used DESC, name`

    const result = await db.query(query, params)

    res.json({ templates: result.rows })
  } catch (error) {
    console.error('Get templates error:', error)
    res.status(500).json({ message: 'Failed to get templates' })
  }
}

/**
 * Import a land template into a world
 * POST /api/learning-worlds/:worldId/import-template
 */
export async function importLandTemplate(req, res) {
  const { worldId } = req.params
  const { templateId } = req.body
  const userId = req.user.userId

  try {
    // Verify world ownership
    const worldCheck = await db.query(
      `SELECT id FROM learning_worlds WHERE id = $1 AND teacher_id = $2`,
      [worldId, userId]
    )

    if (worldCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Learning world not found' })
    }

    // Get template
    const templateResult = await db.query(
      `SELECT * FROM land_templates WHERE id = $1 AND is_published = true`,
      [templateId]
    )

    if (templateResult.rows.length === 0) {
      return res.status(404).json({ message: 'Template not found' })
    }

    const template = templateResult.rows[0]
    const landData = template.land_data
    const activitiesData = template.activities_data || []
    const vocabularyData = template.vocabulary_data || []

    // Create character if template has one
    let characterId = null
    if (template.character_name) {
      const charResult = await db.query(
        `INSERT INTO world_characters (
          world_id, name, avatar_url, personality_traits, catchphrase
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id`,
        [worldId, template.character_name, template.character_avatar_url, landData.characterPersonality || [], landData.characterCatchphrase]
      )
      characterId = charResult.rows[0].id
    }

    // Get next sequence order
    const orderResult = await db.query(
      `SELECT COALESCE(MAX(sequence_order), 0) + 1 as next_order FROM world_lands WHERE world_id = $1`,
      [worldId]
    )
    const nextOrder = orderResult.rows[0].next_order

    // Create land
    const landResult = await db.query(
      `INSERT INTO world_lands (
        world_id, name, slug, description, intro_story, completion_story,
        mascot_character_id, map_position_x, map_position_y,
        icon_url, background_url, sequence_order, target_vocabulary
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        worldId, landData.name, landData.slug + '-' + Date.now(),
        landData.description, landData.introStory, landData.completionStory,
        characterId, landData.mapPositionX || 50, landData.mapPositionY || 50,
        template.icon_url, template.background_url, nextOrder,
        landData.targetVocabulary || []
      ]
    )

    const land = landResult.rows[0]

    // Create activities
    for (let i = 0; i < activitiesData.length; i++) {
      const activity = activitiesData[i]
      await db.query(
        `INSERT INTO land_activities (
          land_id, title, activity_type, instructions, student_prompt,
          intro_narrative, success_narrative, content,
          min_age_level, max_age_level, level_1_content, level_2_content, level_3_content,
          tpr_prompts, estimated_duration_seconds, sequence_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          land.id, activity.title, activity.activityType, activity.instructions, activity.studentPrompt,
          activity.introNarrative, activity.successNarrative, activity.content,
          activity.minAgeLevel || 1, activity.maxAgeLevel || 3,
          activity.level1Content, activity.level2Content, activity.level3Content,
          activity.tprPrompts || [], activity.estimatedDurationSeconds || 180, i + 1
        ]
      )
    }

    // Create vocabulary
    for (const vocab of vocabularyData) {
      await db.query(
        `INSERT INTO world_vocabulary (
          world_id, land_id, word, phonetic, part_of_speech,
          translation_zh_tw, translation_pinyin,
          difficulty_level, phrase_level_2, sentence_level_3,
          image_url, audio_url, category, tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          worldId, land.id, vocab.word, vocab.phonetic, vocab.partOfSpeech,
          vocab.translationZhTw, vocab.translationPinyin,
          vocab.difficultyLevel || 1, vocab.phraseLevel2, vocab.sentenceLevel3,
          vocab.imageUrl, vocab.audioUrl, vocab.category, vocab.tags || []
        ]
      )
    }

    // Increment template usage count
    await db.query(
      `UPDATE land_templates SET times_used = times_used + 1 WHERE id = $1`,
      [templateId]
    )

    res.status(201).json({
      message: 'Template imported successfully',
      land
    })
  } catch (error) {
    console.error('Import template error:', error)
    res.status(500).json({ message: 'Failed to import template' })
  }
}
