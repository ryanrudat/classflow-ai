import { useState, useRef } from 'react'
import ReactCrop from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

/**
 * ImageCropMode - Full-screen crop interface (Google Slides/Canva style)
 * Allows users to visually crop images with a darkened overlay
 */
export default function ImageCropMode({ imageUrl, initialCrop, onApply, onCancel }) {
  const [crop, setCrop] = useState(initialCrop || {
    unit: '%',
    width: 90,
    height: 90,
    x: 5,
    y: 5
  })
  const [completedCrop, setCompletedCrop] = useState(null)
  const imgRef = useRef(null)

  const handleApply = () => {
    if (completedCrop && imgRef.current) {
      const image = imgRef.current
      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height

      const cropData = {
        x: completedCrop.x * scaleX,
        y: completedCrop.y * scaleY,
        width: completedCrop.width * scaleX,
        height: completedCrop.height * scaleY
      }

      onApply(cropData)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      {/* Toolbar */}
      <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
          </svg>
          <h2 className="text-lg font-semibold">Crop Image</h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Apply Crop
          </button>
        </div>
      </div>

      {/* Crop Area */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
        <div className="max-w-full max-h-full">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={undefined} // Free aspect ratio
          >
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Crop preview"
              style={{ maxWidth: '90vw', maxHeight: '80vh' }}
              onLoad={() => {
                // Set initial crop if not set
                if (!completedCrop && imgRef.current) {
                  const { width, height } = imgRef.current
                  setCompletedCrop({
                    unit: 'px',
                    width: width * 0.9,
                    height: height * 0.9,
                    x: width * 0.05,
                    y: height * 0.05
                  })
                }
              }}
            />
          </ReactCrop>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gray-900 text-gray-300 px-6 py-3 text-center text-sm">
        <p>
          Drag the corners to adjust the crop area • Press <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Enter</kbd> to apply or <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Esc</kbd> to cancel
        </p>
      </div>
    </div>
  )
}
