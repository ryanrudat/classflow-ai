import express from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import fsSync from 'fs'
import db from '../database/db.js'
import { authenticateToken } from '../middleware/auth.js'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const router = express.Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Create upload directories at startup (synchronously)
const tempUploadDir = path.join(__dirname, '../../temp-uploads')
const publicUploadsDir = path.join(__dirname, '../../public/uploads/videos')

try {
  fsSync.mkdirSync(tempUploadDir, { recursive: true })
  fsSync.mkdirSync(publicUploadsDir, { recursive: true })
  console.log('📁 Upload directories created:', { tempUploadDir, publicUploadsDir })
} catch (err) {
  console.error('⚠️ Failed to create upload directories:', err.message)
}

// Configure multer for large video uploads (use pre-created directory)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempUploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  }
})

// Video upload config - 500MB max for 10+ minute videos
const videoUpload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    const allowed = /mp4|mov|avi|webm|mkv|m4v/
    const ext = allowed.test(path.extname(file.originalname).toLowerCase())
    const mime = file.mimetype.startsWith('video/') || file.mimetype === 'application/octet-stream'

    if (ext || mime) {
      cb(null, true)
    } else {
      cb(new Error('Only video files (MP4, MOV, AVI, WebM, MKV) are allowed'))
    }
  }
})

// All routes require authentication
router.use(authenticateToken)

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
    console.warn('ffprobe not available, duration will be estimated:', error.message)
    return null
  }
}

/**
 * Ensure uploaded_videos table exists
 */
async function ensureVideoTableExists() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS uploaded_videos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        filename VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        url VARCHAR(500) NOT NULL,
        file_size BIGINT NOT NULL,
        duration_seconds INTEGER,
        mime_type VARCHAR(100),
        transcript JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
  } catch (error) {
    console.log('Table check/create:', error.message)
  }
}

// Ensure table exists on startup
ensureVideoTableExists()

/**
 * Multer error handler middleware
 */
function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        message: 'File too large. Maximum size is 500MB.',
        code: 'FILE_TOO_LARGE'
      })
    }
    return res.status(400).json({
      message: `Upload error: ${err.message}`,
      code: err.code
    })
  } else if (err) {
    console.error('Upload middleware error:', err)
    return res.status(400).json({
      message: err.message || 'Upload failed'
    })
  }
  next()
}

/**
 * Upload a video file
 * POST /api/media/upload/video
 */
router.post('/upload/video', videoUpload.single('video'), handleMulterError, async (req, res) => {
  console.log('📹 Video upload request received')

  try {
    const file = req.file
    const teacherId = req.user?.userId
    const { sessionId } = req.body

    console.log('📹 Upload details:', {
      hasFile: !!file,
      teacherId,
      sessionId,
      fileSize: file ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'
    })

    if (!file) {
      return res.status(400).json({ message: 'No video file uploaded' })
    }

    if (!teacherId) {
      return res.status(401).json({ message: 'User not authenticated' })
    }

    console.log('📹 Processing video upload:', {
      filename: file.originalname,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      mimetype: file.mimetype
    })

    // Get video duration
    const duration = await getVideoDuration(file.path)
    console.log('📹 Video duration:', duration ? `${duration} seconds` : 'unknown')

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
    console.log('✅ Video uploaded successfully:', uploadedVideo.id)

    // If sessionId provided, also create an activity record
    if (sessionId) {
      await db.query(
        `INSERT INTO activities (session_id, type, prompt, ai_generated, content, pushed_to)
         VALUES ($1, 'video', $2, false, $3, 'none')`,
        [
          sessionId,
          file.originalname,
          JSON.stringify({
            videoId: uploadedVideo.id,
            filename: finalFilename,
            originalFilename: file.originalname,
            url: uploadedVideo.url,
            duration: duration,
            size: stats.size
          })
        ]
      )
    }

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
    console.error('❌ Video upload error:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    })

    // Clean up temp file if it exists
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path)
      } catch (unlinkError) {
        console.error('Failed to delete temp file:', unlinkError)
      }
    }

    // Check for specific error types
    if (error.code === '42P01') {
      return res.status(500).json({
        message: 'Database table not found. Please run migrations.',
        error: error.message
      })
    }

    res.status(500).json({
      message: `Upload failed: ${error.message}`,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

/**
 * Get all videos for current user
 * GET /api/media/videos
 */
router.get('/videos', async (req, res) => {
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

    res.json({
      videos: result.rows.map(video => ({
        id: video.id,
        filename: video.filename,
        originalFilename: video.original_filename,
        url: video.url,
        duration: video.duration_seconds,
        size: video.file_size,
        mimeType: video.mime_type,
        hasTranscript: !!video.transcript,
        createdAt: video.created_at
      }))
    })

  } catch (error) {
    console.error('Get videos error:', error)
    res.status(500).json({ message: 'Failed to get videos' })
  }
})

/**
 * Delete a video
 * DELETE /api/media/videos/:videoId
 */
router.delete('/videos/:videoId', async (req, res) => {
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
    }

    // Delete from database
    await db.query('DELETE FROM uploaded_videos WHERE id = $1', [videoId])

    res.json({ message: 'Video deleted successfully' })

  } catch (error) {
    console.error('Delete video error:', error)
    res.status(500).json({ message: 'Failed to delete video' })
  }
})

export default router
