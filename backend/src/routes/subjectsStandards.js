import express from 'express'
import db from '../database/db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// ============================================
// SUBJECTS ROUTES (PUBLIC)
// ============================================

/**
 * Get all subjects (hierarchical)
 * GET /api/subjects
 * Returns flat list with parent_id for frontend to build tree
 */
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        id, name, icon, parent_id, level, sort_order
      FROM subjects
      WHERE is_active = true
      ORDER BY level, sort_order, name
    `)

    res.json({
      subjects: result.rows,
      count: result.rows.length
    })
  } catch (error) {
    console.error('Error fetching subjects:', error)
    res.status(500).json({ message: 'Failed to fetch subjects' })
  }
})

/**
 * Get subjects tree (hierarchical structure)
 * GET /api/subjects/tree
 * Returns nested structure for UI dropdowns
 */
router.get('/tree', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        id, name, icon, parent_id, level, sort_order
      FROM subjects
      WHERE is_active = true
      ORDER BY level, sort_order, name
    `)

    // Build tree structure
    const subjects = result.rows
    const subjectMap = new Map()
    const rootSubjects = []

    // First pass: create map and identify roots
    subjects.forEach(subject => {
      subjectMap.set(subject.id, { ...subject, children: [] })
    })

    // Second pass: build hierarchy
    subjects.forEach(subject => {
      const node = subjectMap.get(subject.id)
      if (subject.parent_id && subjectMap.has(subject.parent_id)) {
        subjectMap.get(subject.parent_id).children.push(node)
      } else if (!subject.parent_id) {
        rootSubjects.push(node)
      }
    })

    res.json({
      subjects: rootSubjects
    })
  } catch (error) {
    console.error('Error fetching subjects tree:', error)
    res.status(500).json({ message: 'Failed to fetch subjects tree' })
  }
})

/**
 * Get children of a specific subject
 * GET /api/subjects/:subjectId/children
 */
router.get('/:subjectId/children', async (req, res) => {
  try {
    const { subjectId } = req.params

    const result = await db.query(`
      SELECT
        id, name, icon, parent_id, level, sort_order
      FROM subjects
      WHERE parent_id = $1 AND is_active = true
      ORDER BY sort_order, name
    `, [subjectId])

    res.json({
      children: result.rows,
      count: result.rows.length
    })
  } catch (error) {
    console.error('Error fetching subject children:', error)
    res.status(500).json({ message: 'Failed to fetch subject children' })
  }
})

/**
 * Get subject path (for display)
 * GET /api/subjects/:subjectId/path
 * Returns: "Science > Life Science > Biology"
 */
router.get('/:subjectId/path', async (req, res) => {
  try {
    const { subjectId } = req.params

    const result = await db.query(`
      SELECT get_subject_path($1) as path
    `, [subjectId])

    res.json({
      subjectId,
      path: result.rows[0]?.path || ''
    })
  } catch (error) {
    console.error('Error fetching subject path:', error)
    res.status(500).json({ message: 'Failed to fetch subject path' })
  }
})

// ============================================
// STANDARDS ROUTES
// ============================================

/**
 * Get all standards frameworks
 * GET /api/standards/frameworks
 */
router.get('/frameworks', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        id, code, name, description, organization,
        applies_to_subjects, is_universal
      FROM standards_frameworks
      WHERE is_active = true
      ORDER BY is_universal DESC, name
    `)

    res.json({
      frameworks: result.rows,
      count: result.rows.length
    })
  } catch (error) {
    console.error('Error fetching standards frameworks:', error)
    res.status(500).json({ message: 'Failed to fetch frameworks' })
  }
})

/**
 * Get standards by framework
 * GET /api/standards/framework/:frameworkCode?gradeBand=6-8
 */
router.get('/framework/:frameworkCode', async (req, res) => {
  try {
    const { frameworkCode } = req.params
    const { gradeBand, strand } = req.query

    let query = `
      SELECT
        s.id, s.code, s.grade_band, s.strand, s.domain,
        s.full_text, s.short_text, s.is_practice_standard,
        s.parent_standard_id, s.sort_order
      FROM standards s
      JOIN standards_frameworks sf ON s.framework_id = sf.id
      WHERE sf.code = $1 AND s.is_active = true
    `
    const params = [frameworkCode]

    if (gradeBand) {
      query += ` AND (s.grade_band = $${params.length + 1} OR s.grade_band = 'K-12')`
      params.push(gradeBand)
    }

    if (strand) {
      query += ` AND s.strand = $${params.length + 1}`
      params.push(strand)
    }

    query += ` ORDER BY s.strand, s.sort_order, s.code`

    const result = await db.query(query, params)

    res.json({
      framework: frameworkCode,
      standards: result.rows,
      count: result.rows.length
    })
  } catch (error) {
    console.error('Error fetching standards:', error)
    res.status(500).json({ message: 'Failed to fetch standards' })
  }
})

/**
 * Get recommended standards for a subject and grade
 * GET /api/standards/recommended?subjectId=xxx&grade=7
 * Returns Speaking & Listening (universal) + subject-specific standards
 */
router.get('/recommended', async (req, res) => {
  try {
    const { subjectId, grade } = req.query

    if (!subjectId) {
      return res.status(400).json({ message: 'subjectId is required' })
    }

    // Get the subject's main category (level 1)
    const subjectResult = await db.query(`
      WITH RECURSIVE subject_chain AS (
        SELECT id, name, parent_id, level
        FROM subjects
        WHERE id = $1

        UNION ALL

        SELECT s.id, s.name, s.parent_id, s.level
        FROM subjects s
        INNER JOIN subject_chain sc ON s.id = sc.parent_id
      )
      SELECT id, name FROM subject_chain WHERE level = 1
    `, [subjectId])

    const mainSubjectId = subjectResult.rows[0]?.id

    // Get grade band (convert grade to band)
    let gradeBand = 'K-12'
    if (grade) {
      const gradeNum = parseInt(grade)
      if (gradeNum <= 2) gradeBand = 'K-2'
      else if (gradeNum <= 5) gradeBand = '3-5'
      else if (gradeNum <= 8) gradeBand = '6-8'
      else gradeBand = '9-12'
    }

    // Get universal standards (Speaking & Listening)
    const universalResult = await db.query(`
      SELECT
        s.id, s.code, s.grade_band, s.strand, s.domain,
        s.full_text, s.short_text, s.is_practice_standard,
        sf.code as framework_code, sf.name as framework_name,
        true as is_universal
      FROM standards s
      JOIN standards_frameworks sf ON s.framework_id = sf.id
      WHERE sf.is_universal = true
        AND s.is_active = true
        AND (s.grade_band = $1 OR s.grade_band = 'K-12')
      ORDER BY s.sort_order
    `, [grade || '7'])

    // Get subject-specific standards
    let subjectStandards = []
    if (mainSubjectId) {
      const subjectResult = await db.query(`
        SELECT
          s.id, s.code, s.grade_band, s.strand, s.domain,
          s.full_text, s.short_text, s.is_practice_standard,
          sf.code as framework_code, sf.name as framework_name,
          false as is_universal
        FROM standards s
        JOIN standards_frameworks sf ON s.framework_id = sf.id
        WHERE sf.applies_to_subjects @> $1::jsonb
          AND s.is_active = true
          AND (s.grade_band = $2 OR s.grade_band = 'K-12')
        ORDER BY s.is_practice_standard DESC, s.sort_order
      `, [JSON.stringify([mainSubjectId]), gradeBand])

      subjectStandards = subjectResult.rows
    }

    res.json({
      subjectId,
      mainSubjectId,
      grade,
      gradeBand,
      universalStandards: universalResult.rows,
      subjectStandards,
      totalCount: universalResult.rows.length + subjectStandards.length
    })
  } catch (error) {
    console.error('Error fetching recommended standards:', error)
    res.status(500).json({ message: 'Failed to fetch recommended standards' })
  }
})

/**
 * Search standards
 * GET /api/standards/search?q=photosynthesis&gradeBand=6-8
 */
router.get('/search', async (req, res) => {
  try {
    const { q, gradeBand, frameworkCode } = req.query

    if (!q || q.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' })
    }

    let query = `
      SELECT
        s.id, s.code, s.grade_band, s.strand, s.domain,
        s.full_text, s.short_text, s.is_practice_standard,
        sf.code as framework_code, sf.name as framework_name
      FROM standards s
      JOIN standards_frameworks sf ON s.framework_id = sf.id
      WHERE s.is_active = true
        AND (
          s.code ILIKE $1
          OR s.full_text ILIKE $1
          OR s.short_text ILIKE $1
          OR s.strand ILIKE $1
        )
    `
    const params = [`%${q}%`]

    if (gradeBand) {
      query += ` AND (s.grade_band = $${params.length + 1} OR s.grade_band = 'K-12')`
      params.push(gradeBand)
    }

    if (frameworkCode) {
      query += ` AND sf.code = $${params.length + 1}`
      params.push(frameworkCode)
    }

    query += ` ORDER BY sf.is_universal DESC, s.code LIMIT 50`

    const result = await db.query(query, params)

    res.json({
      query: q,
      standards: result.rows,
      count: result.rows.length
    })
  } catch (error) {
    console.error('Error searching standards:', error)
    res.status(500).json({ message: 'Failed to search standards' })
  }
})

// ============================================
// TOPIC-STANDARDS LINKING (PROTECTED)
// ============================================

/**
 * Get standards linked to a topic
 * GET /api/standards/topic/:topicId
 */
router.get('/topic/:topicId', async (req, res) => {
  try {
    const { topicId } = req.params

    const result = await db.query(`
      SELECT
        s.id, s.code, s.grade_band, s.strand, s.domain,
        s.full_text, s.short_text, s.is_practice_standard,
        sf.code as framework_code, sf.name as framework_name,
        ts.is_primary
      FROM topic_standards ts
      JOIN standards s ON ts.standard_id = s.id
      JOIN standards_frameworks sf ON s.framework_id = sf.id
      WHERE ts.topic_id = $1
      ORDER BY ts.is_primary DESC, sf.is_universal DESC, s.code
    `, [topicId])

    res.json({
      topicId,
      standards: result.rows,
      count: result.rows.length
    })
  } catch (error) {
    console.error('Error fetching topic standards:', error)
    res.status(500).json({ message: 'Failed to fetch topic standards' })
  }
})

/**
 * Link standards to a topic
 * POST /api/standards/topic/:topicId
 * Body: { standardIds: ['uuid1', 'uuid2'], primaryStandardId?: 'uuid' }
 */
router.post('/topic/:topicId', authenticateToken, async (req, res) => {
  try {
    const { topicId } = req.params
    const { standardIds, primaryStandardId } = req.body

    if (!standardIds || !Array.isArray(standardIds)) {
      return res.status(400).json({ message: 'standardIds array is required' })
    }

    // Clear existing links
    await db.query('DELETE FROM topic_standards WHERE topic_id = $1', [topicId])

    // Insert new links
    for (const standardId of standardIds) {
      await db.query(`
        INSERT INTO topic_standards (topic_id, standard_id, is_primary)
        VALUES ($1, $2, $3)
        ON CONFLICT (topic_id, standard_id) DO UPDATE SET is_primary = $3
      `, [topicId, standardId, standardId === primaryStandardId])
    }

    res.json({
      success: true,
      topicId,
      linkedCount: standardIds.length
    })
  } catch (error) {
    console.error('Error linking standards to topic:', error)
    res.status(500).json({ message: 'Failed to link standards' })
  }
})

export default router
