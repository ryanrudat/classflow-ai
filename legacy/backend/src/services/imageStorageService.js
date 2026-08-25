import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Base directory for stored images
const IMAGES_DIR = path.join(__dirname, '../../public/uploads/images')

// Ensure the images directory exists
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true })
}

/**
 * Download an image from a URL and save it locally
 * @param {string} url - The image URL to download
 * @param {string} category - Category for organization (e.g., 'vocabulary', 'characters')
 * @param {string} identifier - Unique identifier for the image (e.g., word or character name)
 * @returns {object} Result with local path and URL
 */
export async function downloadAndStoreImage(url, category = 'general', identifier = null) {
  try {
    // Generate a unique filename
    const hash = crypto.createHash('md5').update(url).digest('hex').substring(0, 8)
    const sanitizedId = identifier
      ? identifier.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50)
      : hash
    const filename = `${sanitizedId}-${hash}.png`

    // Create category subdirectory
    const categoryDir = path.join(IMAGES_DIR, category)
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true })
    }

    const filepath = path.join(categoryDir, filename)

    // Check if we already have this image
    if (fs.existsSync(filepath)) {
      console.log('📁 Image already exists locally:', filename)
      return {
        success: true,
        localPath: filepath,
        localUrl: `/uploads/images/${category}/${filename}`,
        cached: true
      }
    }

    // Download the image
    console.log('📥 Downloading image:', url.substring(0, 80) + '...')

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`)
    }

    const buffer = Buffer.from(await response.arrayBuffer())

    // Save to disk
    fs.writeFileSync(filepath, buffer)

    console.log('✅ Image saved locally:', filename)

    return {
      success: true,
      localPath: filepath,
      localUrl: `/uploads/images/${category}/${filename}`,
      cached: false,
      size: buffer.length
    }

  } catch (error) {
    console.error('❌ Image storage error:', error.message)
    return {
      success: false,
      error: error.message,
      originalUrl: url
    }
  }
}

/**
 * Check if a URL is an expired Azure/DALL-E URL
 * @param {string} url - The URL to check
 * @returns {boolean} True if it's an Azure URL
 */
export function isAzureDalleUrl(url) {
  if (!url) return false
  return url.includes('oaidalleapiprodscus.blob.core.windows.net') ||
         url.includes('blob.core.windows.net')
}

/**
 * Check if a URL is a local URL (already stored)
 * @param {string} url - The URL to check
 * @returns {boolean} True if it's a local URL
 */
export function isLocalUrl(url) {
  if (!url) return false
  return url.startsWith('/uploads/') || url.startsWith('/api/images/')
}

/**
 * Get the local file path for a local URL
 * @param {string} localUrl - The local URL
 * @returns {string|null} File path or null
 */
export function getLocalFilePath(localUrl) {
  if (!localUrl || !isLocalUrl(localUrl)) return null
  const relativePath = localUrl.replace('/uploads/', '')
  return path.join(__dirname, '../../public/uploads', relativePath)
}

/**
 * Delete a locally stored image
 * @param {string} localUrl - The local URL of the image
 * @returns {boolean} True if deleted successfully
 */
export function deleteLocalImage(localUrl) {
  try {
    const filepath = getLocalFilePath(localUrl)
    if (filepath && fs.existsSync(filepath)) {
      fs.unlinkSync(filepath)
      return true
    }
    return false
  } catch (error) {
    console.error('Failed to delete image:', error)
    return false
  }
}

export default {
  downloadAndStoreImage,
  isAzureDalleUrl,
  isLocalUrl,
  getLocalFilePath,
  deleteLocalImage
}
