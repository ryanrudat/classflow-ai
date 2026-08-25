import multer from 'multer'
import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import db from '../database/db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configure multer for temporary file storage
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/
    const ext = allowed.test(path.extname(file.originalname).toLowerCase())
    const mime = allowed.test(file.mimetype)

    if (ext && mime) {
      cb(null, true)
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'))
    }
  }
})

/**
 * Upload and process an image
 * POST /api/upload/image
 */
export async function uploadImage(req, res) {
  try {
    const file = req.file
    const teacherId = req.user.userId

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    // Create public uploads directory if it doesn't exist
    const publicUploadsDir = path.join(__dirname, '../../public/uploads')
    await fs.mkdir(publicUploadsDir, { recursive: true })

    // Generate optimized filename
    const optimizedFilename = `opt-${file.filename.replace(/\.[^.]+$/, '.jpg')}`
    const optimizedPath = path.join(publicUploadsDir, optimizedFilename)

    // Process and optimize image
    const metadata = await sharp(file.path)
      .resize(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85, progressive: true })
      .toFile(optimizedPath)

    // Delete temporary file
    await fs.unlink(file.path)

    // Get file size
    const stats = await fs.stat(optimizedPath)

    // Save to database
    const result = await db.query(
      `INSERT INTO uploaded_images (user_id, filename, url, alt_text, width, height, file_size)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        teacherId,
        optimizedFilename,
        `/uploads/${optimizedFilename}`,
        file.originalname.replace(/\.[^.]+$/, ''), // Filename without extension as alt text
        metadata.width,
        metadata.height,
        stats.size
      ]
    )

    const uploadedImage = result.rows[0]

    res.json({
      id: uploadedImage.id,
      url: uploadedImage.url,
      alt: uploadedImage.alt_text,
      width: uploadedImage.width,
      height: uploadedImage.height,
      size: uploadedImage.file_size,
      message: 'Image uploaded successfully'
    })

  } catch (error) {
    console.error('Upload error:', error)

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
 * Get all images uploaded by the current user
 * GET /api/upload/images
 */
export async function getUserImages(req, res) {
  try {
    const teacherId = req.user.userId
    const { limit = 50, offset = 0 } = req.query

    const result = await db.query(
      `SELECT * FROM uploaded_images
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [teacherId, limit, offset]
    )

    const countResult = await db.query(
      'SELECT COUNT(*) FROM uploaded_images WHERE user_id = $1',
      [teacherId]
    )

    res.json({
      images: result.rows.map(img => ({
        id: img.id,
        filename: img.filename,
        url: img.url,
        alt: img.alt_text,
        width: img.width,
        height: img.height,
        size: img.file_size,
        createdAt: img.created_at
      })),
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    })

  } catch (error) {
    console.error('Get images error:', error)
    res.status(500).json({ message: 'Failed to get images' })
  }
}

/**
 * Delete an image
 * DELETE /api/upload/images/:imageId
 */
export async function deleteImage(req, res) {
  try {
    const { imageId } = req.params
    const teacherId = req.user.userId

    // Get image and verify ownership
    const imageResult = await db.query(
      'SELECT * FROM uploaded_images WHERE id = $1 AND user_id = $2',
      [imageId, teacherId]
    )

    if (imageResult.rows.length === 0) {
      return res.status(404).json({ message: 'Image not found or unauthorized' })
    }

    const image = imageResult.rows[0]

    // Delete file from disk
    const filePath = path.join(__dirname, '../../public', image.url)
    try {
      await fs.unlink(filePath)
    } catch (unlinkError) {
      console.error('Failed to delete file:', unlinkError)
      // Continue anyway - database cleanup is more important
    }

    // Delete from database
    await db.query('DELETE FROM uploaded_images WHERE id = $1', [imageId])

    res.json({ message: 'Image deleted successfully' })

  } catch (error) {
    console.error('Delete image error:', error)
    res.status(500).json({ message: 'Failed to delete image' })
  }
}

export const uploadMiddleware = upload.single('image')
