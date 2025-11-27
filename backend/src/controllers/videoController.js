import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import fsSync from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'
import FormData from 'form-data'
import axios from 'axios'
import db from '../database/db.js'

const execAsync = promisify(exec)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Create upload directories at startup (synchronously)
const tempUploadDir = path.join(__dirname, '../../temp-uploads')
const publicUploadsDir = path.join(__dirname, '../../public/uploads/videos')

try {
  fsSync.mkdirSync(tempUploadDir, { recursive: true })
  fsSync.mkdirSync(publicUploadsDir, { recursive: true })
} catch (err) {
  console.error('Failed to create upload directories:', err.message)
}

// Configure multer for video uploads (use pre-created directory)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempUploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (req, file, cb) => {
    const allowed = /mp4|mov|avi|webm|mkv/
    const ext = allowed.test(path.extname(file.originalname).toLowerCase())
    const mime = file.mimetype.startsWith('video/')

    if (ext && mime) {
      cb(null, true)
    } else {
      cb(new Error('Only video files (MP4, MOV, AVI, WebM, MKV) are allowed'))
    }
  }
})

/**
 * Get video duration using ffprobe (if available)
 */
async function getVideoDuration(filePath) {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
    )
    const duration = parseFloat(stdout.trim())
    return Math.round(duration)
  } catch (error) {
    console.warn('ffprobe not available, duration will be null:', error.message)
    return null
  }
}

/**
 * Upload a video
 * POST /api/videos/upload
 */
export async function uploadVideo(req, res) {
  try {
    const file = req.file
    const teacherId = req.user.userId

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    // Check video duration
    const duration = await getVideoDuration(file.path)

    // Enforce 10 minute limit (600 seconds)
    if (duration && duration > 600) {
      await fs.unlink(file.path)
      return res.status(400).json({
        message: 'Video is too long. Maximum duration is 10 minutes.',
        duration,
        maxDuration: 600
      })
    }

    // Copy file to public directory (use copy+delete instead of rename for cross-device support)
    const finalFilename = `video-${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`
    const finalPath = path.join(publicUploadsDir, finalFilename)

    // Copy then delete (rename doesn't work across filesystems on Render.com)
    await fs.copyFile(file.path, finalPath)
    await fs.unlink(file.path)

    // Get file size
    const stats = await fs.stat(finalPath)

    // Save to database
    const result = await db.query(
      `INSERT INTO uploaded_videos (user_id, filename, original_filename, url, file_size, duration_seconds, mime_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        teacherId,
        finalFilename,
        file.originalname,
        `/uploads/videos/${finalFilename}`,
        stats.size,
        duration,
        file.mimetype
      ]
    )

    const uploadedVideo = result.rows[0]

    res.json({
      id: uploadedVideo.id,
      url: uploadedVideo.url,
      filename: uploadedVideo.filename,
      originalFilename: uploadedVideo.original_filename,
      duration: uploadedVideo.duration_seconds,
      size: uploadedVideo.file_size,
      message: 'Video uploaded successfully'
    })

  } catch (error) {
    console.error('Video upload error:', error)

    // Clean up temp file if it exists
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path)
      } catch (unlinkError) {
        console.error('Failed to delete temp file:', unlinkError)
      }
    }

    res.status(500).json({
      message: `Upload failed: ${error.message}`
    })
  }
}

/**
 * Get all videos uploaded by the current user
 * GET /api/videos
 */
export async function getUserVideos(req, res) {
  try {
    const teacherId = req.user.userId
    const { limit = 50, offset = 0 } = req.query

    const result = await db.query(
      `SELECT * FROM uploaded_videos
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [teacherId, limit, offset]
    )

    const countResult = await db.query(
      'SELECT COUNT(*) FROM uploaded_videos WHERE user_id = $1',
      [teacherId]
    )

    res.json({
      videos: result.rows.map(video => ({
        id: video.id,
        filename: video.filename,
        originalFilename: video.original_filename,
        url: video.url,
        duration: video.duration_seconds,
        size: video.file_size,
        mimeType: video.mime_type,
        createdAt: video.created_at
      })),
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    })

  } catch (error) {
    console.error('Get videos error:', error)
    res.status(500).json({ message: 'Failed to get videos' })
  }
}

/**
 * Delete a video
 * DELETE /api/videos/:videoId
 */
export async function deleteVideo(req, res) {
  try {
    const { videoId } = req.params
    const teacherId = req.user.userId

    // Get video and verify ownership
    const videoResult = await db.query(
      'SELECT * FROM uploaded_videos WHERE id = $1 AND user_id = $2',
      [videoId, teacherId]
    )

    if (videoResult.rows.length === 0) {
      return res.status(404).json({ message: 'Video not found or unauthorized' })
    }

    const video = videoResult.rows[0]

    // Delete file from disk
    const filePath = path.join(__dirname, '../../public', video.url)
    try {
      await fs.unlink(filePath)
    } catch (unlinkError) {
      console.error('Failed to delete file:', unlinkError)
      // Continue anyway - database cleanup is more important
    }

    // Delete from database
    await db.query('DELETE FROM uploaded_videos WHERE id = $1', [videoId])

    res.json({ message: 'Video deleted successfully' })

  } catch (error) {
    console.error('Delete video error:', error)
    res.status(500).json({ message: 'Failed to delete video' })
  }
}

/**
 * Transcribe a video using OpenAI Whisper
 * POST /api/videos/:videoId/transcribe
 */
export async function transcribeVideo(req, res) {
  try {
    const { videoId } = req.params
    const teacherId = req.user.userId

    // Get video and verify ownership
    const videoResult = await db.query(
      'SELECT * FROM uploaded_videos WHERE id = $1 AND user_id = $2',
      [videoId, teacherId]
    )

    if (videoResult.rows.length === 0) {
      return res.status(404).json({ message: 'Video not found or unauthorized' })
    }

    const video = videoResult.rows[0]

    // Check if already transcribed
    if (video.transcript) {
      return res.json({
        message: 'Video already transcribed',
        transcript: video.transcript
      })
    }

    const filePath = path.join(__dirname, '../../public', video.url)
    console.log('📹 Transcription requested for:', { videoId, filePath })

    // Check if file exists
    try {
      await fs.access(filePath)
      console.log('✅ Video file found:', filePath)
    } catch (error) {
      console.error('❌ Video file not found:', filePath)
      return res.status(404).json({
        message: 'Video file not found on server. On free hosting, files are deleted after each deploy. Please re-upload the video.',
        details: 'Render.com free tier uses ephemeral storage'
      })
    }

    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not configured')
      return res.status(500).json({
        message: 'OpenAI API key not configured. Please add OPENAI_API_KEY to environment variables.'
      })
    }

    console.log('📝 Starting transcription with OpenAI Whisper...')

    // Prepare form data for OpenAI Whisper API
    const formData = new FormData()
    formData.append('file', await fs.readFile(filePath), {
      filename: video.filename,
      contentType: video.mime_type
    })
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'verbose_json') // Get timestamps

    // Call OpenAI Whisper API
    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          ...formData.getHeaders()
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      }
    )

    const transcriptData = response.data

    // Store transcript in database
    await db.query(
      `UPDATE uploaded_videos
       SET transcript = $1, updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(transcriptData), videoId]
    )

    res.json({
      message: 'Video transcribed successfully',
      transcript: transcriptData
    })

  } catch (error) {
    console.error('❌ Transcription error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    })

    if (error.response?.status === 401) {
      return res.status(500).json({
        message: 'OpenAI API key not configured or invalid'
      })
    }

    if (error.code === 'ENOENT') {
      return res.status(404).json({
        message: 'Video file was deleted. Please re-upload the video.',
        details: 'Files are lost after server restarts on free hosting'
      })
    }

    res.status(500).json({
      message: `Transcription failed: ${error.response?.data?.error?.message || error.message}`
    })
  }
}

/**
 * Generate AI questions from video transcript
 * POST /api/videos/:videoId/generate-questions
 */
export async function generateQuestionsFromTranscript(req, res) {
  try {
    const { videoId } = req.params
    const teacherId = req.user.userId
    const { difficulty = 'medium', count = 5 } = req.body

    // Get video and verify ownership
    const videoResult = await db.query(
      'SELECT * FROM uploaded_videos WHERE id = $1 AND user_id = $2',
      [videoId, teacherId]
    )

    if (videoResult.rows.length === 0) {
      return res.status(404).json({ message: 'Video not found or unauthorized' })
    }

    const video = videoResult.rows[0]

    // Check if video has transcript
    if (!video.transcript) {
      return res.status(400).json({
        message: 'Video must be transcribed first. Please run transcription before generating questions.'
      })
    }

    const transcript = typeof video.transcript === 'string'
      ? JSON.parse(video.transcript)
      : video.transcript

    // Prepare transcript text with timestamps
    const segments = transcript.segments || []
    const transcriptWithTimestamps = segments.map(seg =>
      `[${Math.floor(seg.start)}s] ${seg.text}`
    ).join('\n')

    const fullText = transcript.text || transcriptWithTimestamps

    // Call Claude AI to generate questions
    const aiResponse = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: `You are an expert educator creating interactive video questions. Analyze this video transcript and generate ${count} engaging questions at key moments.

Video Duration: ${video.duration_seconds} seconds
Difficulty: ${difficulty}

TRANSCRIPT:
${transcriptWithTimestamps || fullText}

Generate ${count} questions that:
1. Test comprehension of key concepts
2. Are placed at important moments (use timestamps from transcript)
3. Include a mix of multiple choice and open-ended questions
4. Are appropriate for ${difficulty} difficulty level

Respond ONLY with valid JSON in this exact format:
{
  "questions": [
    {
      "timestamp_seconds": 45,
      "question_type": "multiple_choice",
      "question_text": "What is the main topic discussed in this section?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "rationale": "Why this question is important"
    },
    {
      "timestamp_seconds": 120,
      "question_type": "open_ended",
      "question_text": "Explain the concept in your own words.",
      "rationale": "Why this question is important"
    }
  ]
}`
        }]
      },
      {
        headers: {
          'x-api-key': process.env.CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }
      }
    )

    // Parse Claude's response
    const aiContent = aiResponse.data.content[0].text

    // Extract JSON from response (handle markdown code blocks if present)
    let questionsData
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/)
      questionsData = JSON.parse(jsonMatch ? jsonMatch[0] : aiContent)
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent)
      throw new Error('AI generated invalid response format')
    }

    // Validate and clean questions
    const validQuestions = questionsData.questions.filter(q => {
      return q.timestamp_seconds >= 0 &&
        q.timestamp_seconds <= video.duration_seconds &&
        q.question_text &&
        q.question_type &&
        (q.question_type !== 'multiple_choice' || (q.options && q.options.length >= 2))
    })

    res.json({
      message: 'Questions generated successfully',
      questions: validQuestions,
      video: {
        id: video.id,
        duration: video.duration_seconds
      }
    })

  } catch (error) {
    console.error('Question generation error:', error.response?.data || error.message)

    if (error.response?.status === 401) {
      return res.status(500).json({
        message: 'Claude API key not configured or invalid'
      })
    }

    res.status(500).json({
      message: `Question generation failed: ${error.message}`
    })
  }
}

export const uploadMiddleware = upload.single('video')
