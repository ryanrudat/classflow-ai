import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

/**
 * LayerPanel - Right sidebar for managing element layers
 * Provides drag-to-reorder, visibility toggle, and lock controls
 */
export default function LayerPanel({
  elements = [],
  selectedElementId,
  onElementSelect,
  onReorder,
  onToggleVisibility,
  onToggleLock,
  onDelete
}) {
  // Sort elements by z-index (highest first in the list = topmost layer)
  const sortedElements = [...elements].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))

  const handleDragEnd = (event) => {
    const { active, over } = event

    if (active.id !== over.id) {
      const oldIndex = sortedElements.findIndex(el => el.id === active.id)
      const newIndex = sortedElements.findIndex(el => el.id === over.id)

      const reordered = arrayMove(sortedElements, oldIndex, newIndex)

      // Update z-index based on new order (highest index = topmost)
      const withUpdatedZIndex = reordered.map((el, index) => ({
        ...el,
        zIndex: reordered.length - index
      }))

      onReorder(withUpdatedZIndex)
    }
  }

  const getElementPreview = (element) => {
    switch (element.type) {
      case 'text':
        const preview = element.content?.replace(/<[^>]*>/g, '').slice(0, 30) || 'Text'
        return `📝 ${preview}${preview.length >= 30 ? '...' : ''}`
      case 'image':
        return '🖼️ Image'
      default:
        return `❓ ${element.type}`
    }
  }

  return (
    <div className="w-64 bg-gray-50 border-l border-gray-300 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-gray-300">
        <h3 className="font-semibold text-gray-700">Layers</h3>
        <p className="text-xs text-gray-500 mt-1">
          {elements.length} element{elements.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Layers list */}
      <div className="flex-1 overflow-y-auto p-2">
        {sortedElements.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">No elements yet</p>
            <p className="text-xs mt-1">Add text or images to get started</p>
          </div>
        ) : (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedElements.map(el => el.id)} strategy={verticalListSortingStrategy}>
              {sortedElements.map(element => (
                <SortableLayerItem
                  key={element.id}
                  element={element}
                  isSelected={selectedElementId === element.id}
                  onSelect={() => onElementSelect(element.id)}
                  onToggleVisibility={() => onToggleVisibility(element.id)}
                  onToggleLock={() => onToggleLock(element.id)}
                  onDelete={() => onDelete(element.id)}
                  preview={getElementPreview(element)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}

function SortableLayerItem({
  element,
  isSelected,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onDelete,
  preview
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: element.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group mb-1 bg-white rounded border
        ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300 hover:border-gray-400'}
        ${element.hidden ? 'opacity-50' : ''}
      `}
    >
      <div className="flex items-center p-2 gap-2">
        {/* Drag handle */}
        <div
          {...listeners}
          {...attributes}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
        >
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 3h2v2H9V3zm0 4h2v2H9V7zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm4-16h2v2h-2V3zm0 4h2v2h-2V7zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z"/>
          </svg>
        </div>

        {/* Element preview */}
        <div
          className="flex-1 text-sm truncate cursor-pointer"
          onClick={onSelect}
        >
          {preview}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Visibility toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleVisibility()
            }}
            className="p-1 hover:bg-gray-100 rounded"
            title={element.hidden ? 'Show' : 'Hide'}
          >
            <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
              {element.hidden ? (
                <path d="M12 6a9.77 9.77 0 018.82 5.5 9.77 9.77 0 01-2.41 3.12l1.41 1.41c1.39-1.23 2.49-2.77 3.18-4.53C21.27 7.11 17 4 12 4c-1.27 0-2.49.2-3.64.57l1.65 1.65C10.66 6.09 11.32 6 12 6zm-1.07 1.14L13 9.21c.57.25 1.03.71 1.28 1.28l2.07 2.07c.08-.34.14-.7.14-1.07C16.5 9.01 14.48 7 12 7c-.37 0-.72.05-1.07.14zM2.01 3.87l2.68 2.68A11.738 11.738 0 001 11.5C2.73 15.89 7 19 12 19c1.52 0 2.98-.29 4.32-.82l3.42 3.42 1.41-1.41L3.42 2.45 2.01 3.87zm7.5 7.5l2.61 2.61c-.04.01-.08.02-.12.02-1.38 0-2.5-1.12-2.5-2.5 0-.05.01-.08.01-.13zm-3.4-3.4l1.75 1.75c-.23.55-.36 1.15-.36 1.78 0 2.48 2.02 4.5 4.5 4.5.63 0 1.23-.13 1.77-.36l.98.98c-.88.24-1.8.38-2.75.38-3.79 0-7.17-2.13-8.82-5.5.7-1.43 1.72-2.61 2.93-3.53z"/>
              ) : (
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              )}
            </svg>
          </button>

          {/* Lock toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleLock()
            }}
            className={`p-1 hover:bg-gray-100 rounded ${
              element.locked ? 'text-yellow-600' : 'text-gray-600'
            }`}
            title={element.locked ? 'Unlock' : 'Lock'}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              {element.locked ? (
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"/>
              ) : (
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h2c0-1.66 1.34-3 3-3s3 1.34 3 3v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z"/>
              )}
            </svg>
          </button>

          {/* Delete */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="p-1 hover:bg-red-100 text-red-600 rounded"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
