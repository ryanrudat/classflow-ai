import { useState, useEffect } from 'react'
import { uploadAPI } from '../../services/api'

/**
 * ImageLibrary - Modal for selecting from previously uploaded images
 * Displays grid of user's images with search and delete functionality
 */
export default function ImageLibrary({ isOpen, onClose, onSelect }) {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadImages()
    }
  }, [isOpen])

  const loadImages = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await uploadAPI.getImages(50, 0)
      setImages(result.images || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load images')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (imageId, e) => {
    e.stopPropagation() // Prevent selection when clicking delete

    if (!confirm('Delete this image? This cannot be undone.')) {
      return
    }

    try {
      await uploadAPI.deleteImage(imageId)
      setImages(images.filter(img => img.id !== imageId))

      if (selectedImage?.id === imageId) {
        setSelectedImage(null)
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete image')
    }
  }

  const handleSelect = () => {
    if (selectedImage && onSelect) {
      onSelect(selectedImage)
      onClose()
    }
  }

  const filteredImages = images.filter(img =>
    img.alt_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    img.filename?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Image Library</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
            type="button"
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search images..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Image grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">⏳</div>
              <p className="text-gray-600">Loading images...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && filteredImages.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📷</div>
              <p className="text-gray-600 text-lg">
                {searchTerm ? 'No images found' : 'No images uploaded yet'}
              </p>
              <p className="text-gray-500 text-sm mt-2">
                {!searchTerm && 'Upload an image to get started'}
              </p>
            </div>
          )}

          {!loading && !error && filteredImages.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {filteredImages.map((image) => (
                <div
                  key={image.id}
                  onClick={() => setSelectedImage(image)}
                  className={`relative aspect-video bg-gray-100 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                    selectedImage?.id === image.id
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img
                    src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${image.url}`}
                    alt={image.alt_text || ''}
                    className="w-full h-full object-cover"
                  />

                  {/* Checkmark for selected */}
                  {selectedImage?.id === image.id && (
                    <div className="absolute top-2 right-2 bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center">
                      ✓
                    </div>
                  )}

                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDelete(image.id, e)}
                    className="absolute top-2 left-2 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                    title="Delete image"
                    type="button"
                  >
                    ×
                  </button>

                  {/* Image info overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                    <p className="text-white text-xs truncate">
                      {image.alt_text || image.filename}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {selectedImage ? `Selected: ${selectedImage.alt_text || selectedImage.filename}` : 'Select an image'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={handleSelect}
              disabled={!selectedImage}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              type="button"
            >
              Select Image
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
