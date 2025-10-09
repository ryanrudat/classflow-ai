import { useState, useRef } from 'react'
import { uploadAPI } from '../../services/api'

/**
 * ImageUploader - Drag-and-drop image upload component
 * Handles file validation, upload progress, and preview
 */
export default function ImageUploader({ onUploadComplete, onSelectFromLibrary }) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)
  const fileInputRef = useRef(null)

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  const MAX_SIZE = 10 * 1024 * 1024 // 10MB

  const validateFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Please upload a JPEG, PNG, GIF, or WebP image')
      return false
    }

    if (file.size > MAX_SIZE) {
      setError('Image must be less than 10MB')
      return false
    }

    setError(null)
    return true
  }

  const handleFileSelect = async (file) => {
    if (!validateFile(file)) return

    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target.result)
    }
    reader.readAsDataURL(file)

    // Upload file
    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Simulate progress (since we don't have real progress tracking)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const result = await uploadAPI.uploadImage(file)

      clearInterval(progressInterval)
      setUploadProgress(100)

      // Call callback with uploaded image data
      if (onUploadComplete) {
        onUploadComplete(result)
      }

      // Reset after success
      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress(0)
        setPreview(null)
      }, 1000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload image')
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleFileInputChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleBrowseClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4">
      {/* Drag-and-drop area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        }`}
      >
        {!isUploading && !preview && (
          <>
            <div className="text-5xl mb-3">📸</div>
            <p className="text-gray-700 font-medium mb-2">
              Drag and drop an image here
            </p>
            <p className="text-gray-500 text-sm mb-4">
              or
            </p>
            <button
              onClick={handleBrowseClick}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              type="button"
            >
              Browse Files
            </button>
            <p className="text-gray-400 text-xs mt-3">
              JPEG, PNG, GIF, WebP • Max 10MB
            </p>
          </>
        )}

        {/* Preview while uploading */}
        {preview && (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="max-h-48 mx-auto rounded-lg"
            />
            {isUploading && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Image library button */}
      {onSelectFromLibrary && (
        <div className="text-center">
          <button
            onClick={onSelectFromLibrary}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            type="button"
          >
            Or select from image library →
          </button>
        </div>
      )}
    </div>
  )
}
