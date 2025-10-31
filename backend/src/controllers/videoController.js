import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import { exec } from 'child_process'
import { promisify } from 'util'
import db from '../database/db.js'

const execAsync = promisify(exec)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configure multer for video uploads
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

    // Create public uploads directory for videos
    const publicUploadsDir = path.join(__dirname, '../../public/uploads/videos')
    await fs.mkdir(publicUploadsDir, { recursive: true })

    // Move file to public directory
    const finalFilename = `video-${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`
    const finalPath = path.join(publicUploadsDir, finalFilename)

    await fs.rename(file.path, finalPath)

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

export const uploadMiddleware = upload.single('video')
