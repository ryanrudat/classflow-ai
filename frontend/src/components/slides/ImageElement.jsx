/**
 * ImageElement - Displays images with crop and fit support
 * Integrates with existing ImageCropMode and ImageToolbar
 */
export default function ImageElement({ element, isSelected }) {
  const { imageUrl, objectFit, crop } = element

  const getImageStyle = () => {
    const baseStyle = {
      width: '100%',
      height: '100%',
      objectFit: objectFit || 'contain'
    }

    // Apply crop if available
    if (crop) {
      return {
        ...baseStyle,
        objectPosition: `${crop.x}% ${crop.y}%`
      }
    }

    return baseStyle
  }

  return (
    <div className="w-full h-full overflow-hidden bg-gray-100">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Slide image"
          style={getImageStyle()}
          className={`
            select-none
            ${isSelected ? 'ring-2 ring-blue-400 ring-inset' : ''}
          `}
          draggable={false}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">No image</p>
          </div>
        </div>
      )}
    </div>
  )
}
