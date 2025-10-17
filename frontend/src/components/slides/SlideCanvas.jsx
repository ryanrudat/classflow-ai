import { useState, useRef, useEffect } from 'react'
import SlideElement from './SlideElement'

/**
 * SlideCanvas - Unified canvas for slide elements (Google Slides/Canva style)
 * Renders all elements (text boxes, images) as freely-positioned, draggable items
 */
export default function SlideCanvas({
  slide,
  onElementUpdate,
  onElementSelect,
  selectedElementId,
  canvasWidth = 1000,
  canvasHeight = 600
}) {
  const canvasRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  // Sort elements by z-index for proper rendering order
  const sortedElements = slide?.elements
    ? [...slide.elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
    : []

  const handleCanvasClick = (e) => {
    // If clicking directly on canvas (not an element), deselect
    if (e.target === canvasRef.current) {
      onElementSelect(null)
    }
  }

  const handleElementDragStart = () => {
    setIsDragging(true)
  }

  const handleElementDragStop = (elementId, position) => {
    setIsDragging(false)

    // Update element position
    const updatedElements = slide.elements.map(el =>
      el.id === elementId
        ? { ...el, position }
        : el
    )

    onElementUpdate({ ...slide, elements: updatedElements })
  }

  const handleElementResize = (elementId, size, position) => {
    // Update element size and position
    const updatedElements = slide.elements.map(el =>
      el.id === elementId
        ? { ...el, size, position }
        : el
    )

    onElementUpdate({ ...slide, elements: updatedElements })
  }

  return (
    <div
      ref={canvasRef}
      className="relative bg-white border-2 border-gray-300 shadow-lg overflow-hidden"
      style={{ width: canvasWidth, height: canvasHeight }}
      onClick={handleCanvasClick}
    >
      {/* Render all elements */}
      {sortedElements.map(element => (
        <SlideElement
          key={element.id}
          element={element}
          isSelected={selectedElementId === element.id}
          onSelect={() => onElementSelect(element.id)}
          onDragStart={handleElementDragStart}
          onDragStop={(position) => handleElementDragStop(element.id, position)}
          onResize={(size, position) => handleElementResize(element.id, size, position)}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
        />
      ))}

      {/* Grid overlay (optional - for alignment assistance) */}
      {selectedElementId && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
      )}
    </div>
  )
}
