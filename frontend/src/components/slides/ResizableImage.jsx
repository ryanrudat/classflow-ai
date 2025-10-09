import { useState } from 'react'
import { Rnd } from 'react-rnd'

/**
 * ResizableImage - Draggable and resizable image component for slide editor
 * Allows teachers to position and size images on slides
 */
export default function ResizableImage({
  imageUrl,
  alt = '',
  initialWidth = 400,
  initialHeight = 300,
  initialX = 0,
  initialY = 0,
  onResize,
  onDragStop,
  editable = true
}) {
  const [size, setSize] = useState({ width: initialWidth, height: initialHeight })
  const [position, setPosition] = useState({ x: initialX, y: initialY })

  const handleResizeStop = (e, direction, ref, delta, position) => {
    const newSize = {
      width: parseInt(ref.style.width),
      height: parseInt(ref.style.height)
    }
    setSize(newSize)

    if (onResize) {
      onResize(newSize)
    }
  }

  const handleDragStop = (e, data) => {
    const newPosition = { x: data.x, y: data.y }
    setPosition(newPosition)

    if (onDragStop) {
      onDragStop(newPosition)
    }
  }

  // Non-editable version (for preview)
  if (!editable) {
    return (
      <img
        src={imageUrl}
        alt={alt}
        style={{
          width: size.width,
          height: size.height,
          maxWidth: '100%',
          objectFit: 'contain'
        }}
        className="rounded-lg shadow-md"
      />
    )
  }

  // Editable version with drag and resize
  return (
    <Rnd
      size={{ width: size.width, height: size.height }}
      position={{ x: position.x, y: position.y }}
      onResizeStop={handleResizeStop}
      onDragStop={handleDragStop}
      minWidth={100}
      minHeight={100}
      maxWidth={1000}
      maxHeight={800}
      bounds="parent"
      lockAspectRatio={false}
      className="resizable-image-container"
      enableResizing={{
        top: true,
        right: true,
        bottom: true,
        left: true,
        topRight: true,
        bottomRight: true,
        bottomLeft: true,
        topLeft: true
      }}
    >
      <div className="relative w-full h-full group">
        <img
          src={imageUrl}
          alt={alt}
          className="w-full h-full object-contain rounded-lg shadow-lg border-2 border-gray-300 group-hover:border-blue-500 transition-colors"
          draggable={false}
        />

        {/* Resize handles indicator */}
        <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Drag to move • Resize from corners
        </div>

        {/* Size indicator */}
        <div className="absolute bottom-2 left-2 bg-gray-900 bg-opacity-75 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {size.width} × {size.height}
        </div>
      </div>
    </Rnd>
  )
}
