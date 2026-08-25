import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import fs from 'fs/promises'
import mammoth from 'mammoth'
import Anthropic from '@anthropic-ai/sdk'
import db from '../database/db.js'

const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Initialize Claude API
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
})

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../temp-uploads')
    try {
      await fs.mkdir(uploadDir, { recursive: true })
      cb(null, uploadDir)
    } catch (error) {
      cb(error)
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  }
})

const documentUpload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|docx|doc|txt|md/
    const ext = allowed.test(path.extname(file.originalname).toLowerCase())
    const mimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/markdown'
    ]
    const mime = mimeTypes.includes(file.mimetype) || file.mimetype.startsWith('text/')

    if (ext && mime) {
      cb(null, true)
    } else {
      cb(new Error('Only PDF, Word documents, and text files are allowed'))
    }
  }
})

/**
 * Extract text content from uploaded file
 */
async function extractTextFromFile(filePath, mimetype, originalname) {
  const ext = path.extname(originalname).toLowerCase()

  try {
    // PDF files
    if (ext === '.pdf' || mimetype === 'application/pdf') {
      const dataBuffer = await fs.readFile(filePath)
      const data = await pdfParse(dataBuffer)
      return data.text
    }

    // Word documents (.docx)
    if (ext === '.docx' || mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ path: filePath })
      return result.value
    }

    // Text files (.txt, .md, etc.)
    if (ext === '.txt' || ext === '.md' || mimetype.startsWith('text/')) {
      const content = await fs.readFile(filePath, 'utf-8')
      return content
    }

    throw new Error('Unsupported file format')
  } catch (error) {
    console.error('Text extraction error:', error)
    throw new Error(`Failed to extract text: ${error.message}`)
  }
}

/**
 * Generate activity from document content using Claude AI
 */
async function generateActivityFromContent(content, options = {}) {
  const {
    activityType = 'quiz',
    difficulty = 'medium',
    subject = 'General',
    customPrompt = ''
  } = options

  // Build prompt based on activity type
  let prompt = ''

  if (customPrompt) {
    prompt = `${customPrompt}\n\nContent:\n${content}`
  } else {
    switch (activityType) {
      case 'quiz':
        prompt = `Based on the following content, create a comprehensive quiz with 10 multiple-choice questions. Each question should have 4 options (A, B, C, D) with one correct answer.

Format as JSON:
{
  "questions": [
    {
      "question": "Question text",
      "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
      "correctAnswer": "A",
      "explanation": "Why this is correct"
    }
  ]
}

Content:
${content.substring(0, 15000)}`
        break

      case 'questions':
        prompt = `Based on the following content, create 8-10 thought-provoking critical thinking questions that encourage deeper understanding and analysis. These should be open-ended questions that require explanation and reasoning.

Format as JSON:
{
  "questions": [
    "Question 1",
    "Question 2",
    ...
  ]
}

Content:
${content.substring(0, 15000)}`
        break

      case 'mixed':
        prompt = `Based on the following content, create a comprehensive assessment with BOTH types of questions:

1. First, create 5 multiple-choice questions (each with 4 options, one correct answer)
2. Then, create 5 critical thinking questions (open-ended, requiring explanation)

This provides a balanced mix of objective assessment and deeper analysis.

Format as JSON:
{
  "quiz": [
    {
      "question": "Multiple choice question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "Why this is correct"
    }
  ],
  "questions": [
    "Critical thinking question 1",
    "Critical thinking question 2",
    ...
  ]
}

Content:
${content.substring(0, 15000)}`
        break

      case 'discussion':
        prompt = `Based on the following content, create 3-4 discussion prompts that would work well for classroom discussion or debate. Each prompt should encourage multiple perspectives and thoughtful analysis.

Format as JSON:
{
  "prompts": [
    {
      "prompt": "Main discussion prompt",
      "guidingQuestions": ["Question 1", "Question 2", "Question 3"]
    }
  ]
}

Content:
${content.substring(0, 15000)}`
        break

      case 'reading':
        prompt = `Create a reading comprehension activity based on the following content. Include:
1. A brief summary (2-3 sentences)
2. Key vocabulary terms (5-8 words) with definitions
3. 5-6 comprehension questions

Format as JSON:
{
  "summary": "Brief summary",
  "vocabulary": [
    {"term": "word", "definition": "meaning"}
  ],
  "questions": [
    {"question": "Question text", "type": "comprehension"}
  ]
}

Content:
${content.substring(0, 15000)}`
        break

      default:
        prompt = `Analyze the following content and create an engaging educational activity appropriate for ${difficulty} difficulty level.

Content:
${content.substring(0, 15000)}`
    }
  }

  try {
    const startTime = Date.now()

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const generationTime = Date.now() - startTime
    const responseText = message.content[0].text

    // Try to extract JSON from response
    let parsedContent
    try {
      // Look for JSON in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[0])
      } else {
        parsedContent = { text: responseText }
      }
    } catch (parseError) {
      // If parsing fails, return as plain text
      parsedContent = { text: responseText }
    }

    return {
      content: parsedContent,
      generationTime,
      cached: false,
      tokens: message.usage.input_tokens + message.usage.output_tokens
    }

  } catch (error) {
    console.error('AI generation error:', error)
    throw new Error(`Failed to generate activity: ${error.message}`)
  }
}

/**
 * Upload document and generate activity
 * POST /api/documents/upload
 * Body (multipart/form-data):
 *   - file: Document file
 *   - activityType: 'quiz' | 'questions' | 'discussion' | 'reading'
 *   - difficulty: 'easy' | 'medium' | 'hard'
 *   - subject: string
 *   - sessionId: string
 */
export async function uploadAndGenerateActivity(req, res) {
  try {
    const file = req.file
    const { activityType, difficulty, subject, sessionId, customPrompt } = req.body

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID is required' })
    }

    console.log('📄 Processing document:', {
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      activityType,
      difficulty
    })

    // Extract text from document
    console.log('📖 Extracting text from document...')
    const extractedText = await extractTextFromFile(file.path, file.mimetype, file.originalname)

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text content found in document')
    }

    console.log(`✅ Extracted ${extractedText.length} characters`)

    // Generate activity using AI
    console.log('🤖 Generating activity with AI...')
    const aiResult = await generateActivityFromContent(extractedText, {
      activityType: activityType || 'quiz',
      difficulty: difficulty || 'medium',
      subject: subject || 'General',
      customPrompt
    })

    console.log(`✅ Activity generated in ${aiResult.generationTime}ms`)

    // Save activity to database
    console.log('💾 Saving activity to database...')
    const result = await db.query(
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
      VALUES ($1, $2, $3, true, $4, $5, $6, $7, 'none')
      RETURNING *`,
      [
        sessionId,
        activityType || 'quiz',
        `Generated from: ${file.originalname}`,
        aiResult.generationTime,
        aiResult.cached || false,
        JSON.stringify(aiResult.content),
        difficulty || 'medium'
      ]
    )

    const savedActivity = result.rows[0]
    console.log('✅ Activity saved with ID:', savedActivity.id)

    // Clean up uploaded file
    await fs.unlink(file.path)

    // Return the saved activity
    res.json({
      success: true,
      activity: {
        ...savedActivity,
        content: aiResult.content, // Return parsed content, not stringified
        sourceDocument: file.originalname,
        extractedTextLength: extractedText.length,
        tokens: aiResult.tokens
      },
      message: 'Activity generated successfully from document'
    })

  } catch (error) {
    console.error('Document upload error:', error)

    // Clean up temp file if it exists
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path)
      } catch (unlinkError) {
        console.error('Failed to delete temp file:', unlinkError)
      }
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process document'
    })
  }
}

/**
 * Save document without generating activity
 * POST /api/documents/save
 * Body (multipart/form-data):
 *   - file: Document file
 *   - sessionId: string
 *   - title: string (optional)
 */
export async function saveDocument(req, res) {
  try {
    const file = req.file
    const { sessionId, title } = req.body

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID is required' })
    }

    console.log('📄 Saving document:', {
      filename: file.originalname,
      size: file.size,
      sessionId
    })

    // Extract text from document
    console.log('📖 Extracting text from document...')
    const extractedText = await extractTextFromFile(file.path, file.mimetype, file.originalname)

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text content found in document')
    }

    console.log(`✅ Extracted ${extractedText.length} characters`)

    // Save document reference to database
    const result = await db.query(
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
      VALUES ($1, $2, $3, false, 0, false, $4, NULL, 'all')
      RETURNING *`,
      [
        sessionId,
        'document',
        title || file.originalname,
        {
          filename: file.originalname,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
          extractedText: extractedText,
          textLength: extractedText.length
        }
      ]
    )

    const savedDocument = result.rows[0]
    console.log('✅ Document saved successfully:', {
      id: savedDocument.id,
      type: savedDocument.type,
      sessionId: savedDocument.session_id,
      prompt: savedDocument.prompt,
      hasContent: !!savedDocument.content,
      pushedTo: savedDocument.pushed_to
    })

    // Clean up uploaded file
    await fs.unlink(file.path)

    res.json({
      success: true,
      activity: savedDocument,
      message: 'Document saved successfully'
    })

  } catch (error) {
    console.error('Document save error:', error)

    // Clean up temp file if it exists
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path)
      } catch (unlinkError) {
        console.error('Failed to delete temp file:', unlinkError)
      }
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to save document'
    })
  }
}

/**
 * Update document content
 * PUT /api/documents/:documentId/content
 * Body:
 *   - extractedText: string
 */
export async function updateDocumentContent(req, res) {
  try {
    const { documentId } = req.params
    const { extractedText } = req.body
    const teacherId = req.user.userId

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({ message: 'Extracted text is required' })
    }

    console.log('📝 Updating document content:', documentId)

    // Verify document exists and check ownership
    const documentCheck = await db.query(
      `SELECT a.id, a.content, s.teacher_id
       FROM activities a
       JOIN sessions s ON a.session_id = s.id
       WHERE a.id = $1 AND a.type = 'document'`,
      [documentId]
    )

    if (documentCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Document not found' })
    }

    if (documentCheck.rows[0].teacher_id !== teacherId) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    // Get current content
    const currentContent = documentCheck.rows[0].content

    // Update the content with new extracted text
    const updatedContent = {
      ...currentContent,
      extractedText: extractedText,
      textLength: extractedText.length,
      lastEditedAt: new Date().toISOString()
    }

    // Update the document
    const result = await db.query(
      'UPDATE activities SET content = $1 WHERE id = $2 RETURNING *',
      [updatedContent, documentId]
    )

    console.log('✅ Document content updated')

    res.json({
      success: true,
      document: result.rows[0],
      message: 'Document content updated successfully'
    })

  } catch (error) {
    console.error('Update document content error:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update document content'
    })
  }
}

/**
 * Delete a saved document
 * DELETE /api/documents/:documentId
 */
export async function deleteDocument(req, res) {
  try {
    const { documentId } = req.params
    const teacherId = req.user.userId

    console.log('🗑️ Deleting document:', documentId)

    // Verify document exists and check ownership
    const documentCheck = await db.query(
      `SELECT a.id, s.teacher_id
       FROM activities a
       JOIN sessions s ON a.session_id = s.id
       WHERE a.id = $1 AND a.type = 'document'`,
      [documentId]
    )

    if (documentCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Document not found' })
    }

    if (documentCheck.rows[0].teacher_id !== teacherId) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    // Delete the document (CASCADE will delete related responses)
    await db.query(
      'DELETE FROM activities WHERE id = $1',
      [documentId]
    )

    console.log('✅ Document deleted successfully')

    res.json({
      success: true,
      message: 'Document deleted successfully'
    })

  } catch (error) {
    console.error('Delete document error:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete document'
    })
  }
}

/**
 * Get all saved documents for a session
 * GET /api/documents/session/:sessionId
 */
export async function getSessionDocuments(req, res) {
  try {
    const { sessionId } = req.params
    const teacherId = req.user.userId

    console.log('📄 Fetching documents for session:', sessionId)

    // Verify session ownership
    const sessionCheck = await db.query(
      'SELECT teacher_id FROM sessions WHERE id = $1',
      [sessionId]
    )

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' })
    }

    if (sessionCheck.rows[0].teacher_id !== teacherId) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    // Get all documents for this session
    const result = await db.query(
      `SELECT id, prompt as title, content, created_at
       FROM activities
       WHERE session_id = $1 AND type = 'document'
       ORDER BY created_at DESC`,
      [sessionId]
    )

    res.json({
      success: true,
      documents: result.rows
    })

  } catch (error) {
    console.error('Get documents error:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch documents'
    })
  }
}

/**
 * Generate activity from previously saved document
 * POST /api/documents/generate/:activityId
 * Body:
 *   - activityType: 'quiz' | 'questions' | 'discussion' | 'reading'
 *   - difficulty: 'easy' | 'medium' | 'hard'
 */
export async function generateFromSavedDocument(req, res) {
  try {
    const { activityId } = req.params
    const { activityType, difficulty } = req.body
    const teacherId = req.user.userId

    console.log('🤖 Generating activity from saved document:', {
      activityId,
      activityType,
      difficulty
    })

    // Get the saved document
    const documentResult = await db.query(
      `SELECT a.*, s.teacher_id
       FROM activities a
       JOIN sessions s ON a.session_id = s.id
       WHERE a.id = $1 AND a.type = 'document'`,
      [activityId]
    )

    if (documentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Document not found' })
    }

    const document = documentResult.rows[0]

    // Verify ownership
    if (document.teacher_id !== teacherId) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    // Parse the document content
    const documentContent = typeof document.content === 'string'
      ? JSON.parse(document.content)
      : document.content

    if (!documentContent.extractedText) {
      return res.status(400).json({ message: 'Document has no extractable text' })
    }

    console.log('📖 Generating activity from extracted text...')

    // Generate activity using AI
    const aiResult = await generateActivityFromContent(documentContent.extractedText, {
      activityType: activityType || 'quiz',
      difficulty: difficulty || 'medium'
    })

    console.log(`✅ Activity generated in ${aiResult.generationTime}ms`)

    // Create a new activity (keep original document separate)
    const result = await db.query(
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
      VALUES ($1, $2, $3, true, $4, $5, $6, $7, 'none')
      RETURNING *`,
      [
        document.session_id,
        activityType || 'quiz',
        `Generated from: ${documentContent.filename}`,
        aiResult.generationTime,
        aiResult.cached || false,
        JSON.stringify(aiResult.content),
        difficulty || 'medium'
      ]
    )

    const newActivity = result.rows[0]
    console.log('✅ New activity created with ID:', newActivity.id)

    res.json({
      success: true,
      activity: {
        ...newActivity,
        content: aiResult.content,
        sourceDocument: documentContent.filename,
        tokens: aiResult.tokens
      },
      message: 'Activity generated successfully'
    })

  } catch (error) {
    console.error('Generate from document error:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate activity'
    })
  }
}

export const documentUploadMiddleware = documentUpload.single('document')
