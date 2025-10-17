import { Rnd } from 'react-rnd'
import TextBoxElement from './TextBoxElement'
import ImageElement from './ImageElement'

/**
 * SlideElement - Wrapper component for all slide elements
 * Provides drag, resize, and selection functionality
 */
export default function SlideElement({
  element,
  isSelected,
  onSelect,
  onDragStart,
  onDragStop,
  onResize,
  canvasWidth,
  canvasHeight
}) {
  const { type, position, size, locked } = element

  const handleDragStop = (e, data) => {
    onDragStop({ x: data.x, y: data.y })
  }

  const handleResizeStop = (e, direction, ref, delta, position) => {
    onResize(
      {
        width: parseInt(ref.style.width),
        height: parseInt(ref.style.height)
      },
      position
    )
  }

  // Render different element types
  const renderElementContent = () => {
    switch (type) {
      case 'text':
        return (
          <TextBoxElement
            element={element}
            isSelected={isSelected}
            onUpdate={(updates) => {
              // Handle text content updates
              // This will be implemented in TextBoxElement
            }}
          />
        )

      case 'image':
        return (
          <ImageElement
            element={element}
            isSelected={isSelected}
            onUpdate={(updates) => {
              // Handle image updates (crop, fit, etc.)
              // This will be implemented in ImageElement
            }}
          />
        )

      default:
        return <div>Unknown element type: {type}</div>
    }
  }

  return (
    <Rnd
      position={position}
      size={size}
      onDragStart={onDragStart}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      bounds="parent"
      disableDragging={locked}
      enableResizing={!locked && isSelected}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      className={`
        ${isSelected ? 'ring-2 ring-blue-500' : ''}
        ${locked ? 'cursor-not-allowed' : 'cursor-move'}
      `}
      style={{
        zIndex: element.zIndex || 0
      }}
      // Resize handle styles
      resizeHandleStyles={{
        topLeft: { width: 10, height: 10, background: '#3b82f6', borderRadius: '50%' },
        topRight: { width: 10, height: 10, background: '#3b82f6', borderRadius: '50%' },
        bottomLeft: { width: 10, height: 10, background: '#3b82f6', borderRadius: '50%' },
        bottomRight: { width: 10, height: 10, background: '#3b82f6', borderRadius: '50%' },
        top: { display: 'none' },
        right: { display: 'none' },
        bottom: { display: 'none' },
        left: { display: 'none' }
      }}
    >
      {renderElementContent()}

      {/* Locked indicator */}
      {locked && (
        <div className="absolute top-1 right-1 bg-gray-800 text-white p-1 rounded">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"/>
          </svg>
        </div>
      )}
    </Rnd>
  )
}
