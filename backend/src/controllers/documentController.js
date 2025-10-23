import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import Anthropic from '@anthropic-ai/sdk'

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
        prompt = `Based on the following content, create 8-10 thought-provoking discussion questions that encourage critical thinking and deeper understanding.

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
      model: 'claude-3-5-sonnet-20241022',
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

    // Clean up uploaded file
    await fs.unlink(file.path)

    // Return the generated activity
    res.json({
      success: true,
      activity: {
        type: activityType || 'quiz',
        content: aiResult.content,
        sourceDocument: file.originalname,
        extractedTextLength: extractedText.length,
        generationTime: aiResult.generationTime,
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

export const documentUploadMiddleware = documentUpload.single('document')
