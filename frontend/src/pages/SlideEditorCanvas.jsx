import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDebounce } from 'use-debounce'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { slidesAPI, presentationAPI } from '../services/api'
import SlideCanvas from '../components/slides/SlideCanvas'
import ElementToolbar from '../components/slides/ElementToolbar'
import LayerPanel from '../components/slides/LayerPanel'
import ImageLibrary from '../components/slides/ImageLibrary'

/**
 * SortableSlidePreview - Draggable slide thumbnail
 */
function SortableSlidePreview({ slide, index, isActive, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: slide.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative cursor-pointer rounded-lg border-2 transition-all ${
        isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
      }`}
    >
      {/* Drag Handle */}
      <div
        {...listeners}
        {...attributes}
        className="absolute left-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing bg-white rounded p-1 shadow-md z-10"
      >
        <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>

      {/* Slide Preview */}
      <div onClick={onClick} className="p-3">
        <div className="text-xs font-medium text-gray-500 mb-1">Slide {index + 1}</div>
        <div className="aspect-video bg-white border border-gray-200 rounded flex items-center justify-center text-xs text-gray-400">
          <span>{slide.title || 'Untitled'}</span>
        </div>
      </div>
    </div>
  )
}

/**
 * SlideEditorCanvas - Canvas-based slide editor with free-form elements
 */
export default function SlideEditorCanvas() {
  const { deckId } = useParams()
  const navigate = useNavigate()

  const [deck, setDeck] = useState(null)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [currentSlideElements, setCurrentSlideElements] = useState([])
  const [selectedElementId, setSelectedElementId] = useState(null)
  const [showImageLibrary, setShowImageLibrary] = useState(false)
  const [error, setError] = useState(null)
  const [saveStatus, setSaveStatus] = useState('saved')

  const currentSlide = deck?.slides?.[currentSlideIndex]
  const selectedElement = currentSlideElements.find(el => el.id === selectedElementId)

  // Debounce elements for auto-save
  const [debouncedElements] = useDebounce(currentSlideElements, 500)

  // Drag and drop sensors for slide reordering
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    loadDeck()
  }, [deckId])

  useEffect(() => {
    if (currentSlide) {
      loadSlideElements()
    }
  }, [currentSlide?.id])

  useEffect(() => {
    if (debouncedElements && currentSlide) {
      // Auto-save would go here - for now we'll handle updates individually
    }
  }, [debouncedElements])

  const loadDeck = async () => {
    try {
      const result = await slidesAPI.getDeck(deckId)
      setDeck(result)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load deck')
    }
  }

  const loadSlideElements = async () => {
    if (!currentSlide) return

    try {
      const { elements } = await slidesAPI.getSlideElements(currentSlide.id)
      setCurrentSlideElements(elements || [])

      // If no elements exist but slide has legacy content, create initial elements
      if ((!elements || elements.length === 0) && (currentSlide.title || currentSlide.body)) {
        await convertLegacySlide()
      }
    } catch (err) {
      console.error('Failed to load elements:', err)
      setCurrentSlideElements([])
    }
  }

  const convertLegacySlide = async () => {
    const newElements = []

    // Convert title to text element
    if (currentSlide.title) {
      const titleElement = await slidesAPI.createElement(currentSlide.id, {
        type: 'text',
        position: { x: 50, y: 50 },
        size: { width: 900, height: 100 },
        content: `<h1>${currentSlide.title}</h1>`,
        styles: { fontSize: 32, fontWeight: 'bold' },
        zIndex: 1
      })
      newElements.push(titleElement.element)
    }

    // Convert body to text element
    if (currentSlide.body) {
      const bodyElement = await slidesAPI.createElement(currentSlide.id, {
        type: 'text',
        position: { x: 50, y: 180 },
        size: { width: 900, height: 300 },
        content: currentSlide.body,
        styles: { fontSize: 18 },
        zIndex: 2
      })
      newElements.push(bodyElement.element)
    }

    // Convert image to image element
    if (currentSlide.image) {
      const imageElement = await slidesAPI.createElement(currentSlide.id, {
        type: 'image',
        position: { x: 200, y: 250 },
        size: { width: currentSlide.image.width || 600, height: currentSlide.image.height || 400 },
        imageId: currentSlide.image.id,
        objectFit: currentSlide.image.objectFit || 'contain',
        zIndex: 3
      })
      newElements.push(imageElement.element)
    }

    setCurrentSlideElements(newElements)
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event

    if (active.id !== over.id) {
      const oldIndex = deck.slides.findIndex(s => s.id === active.id)
      const newIndex = deck.slides.findIndex(s => s.id === over.id)

      const newSlides = arrayMove(deck.slides, oldIndex, newIndex)
      setDeck({ ...deck, slides: newSlides })

      if (currentSlideIndex === oldIndex) {
        setCurrentSlideIndex(newIndex)
      } else if (oldIndex < currentSlideIndex && newIndex >= currentSlideIndex) {
        setCurrentSlideIndex(currentSlideIndex - 1)
      } else if (oldIndex > currentSlideIndex && newIndex <= currentSlideIndex) {
        setCurrentSlideIndex(currentSlideIndex + 1)
      }

      try {
        const slidesOrder = newSlides.map((slide, index) => ({
          id: slide.id,
          slideNumber: index + 1
        }))
        await slidesAPI.reorderSlides(deckId, slidesOrder)
      } catch (err) {
        console.error('Failed to save slide order:', err)
      }
    }
  }

  const handleElementUpdate = async (updatedSlide) => {
    setCurrentSlideElements(updatedSlide.elements)
  }

  const handleElementSelect = (elementId) => {
    setSelectedElementId(elementId)
  }

  const handleAddTextBox = async () => {
    try {
      const result = await slidesAPI.createElement(currentSlide.id, {
        type: 'text',
        position: { x: 100, y: 100 },
        size: { width: 400, height: 150 },
        content: '<p>Double-click to edit</p>',
        styles: { fontSize: 18 }
      })

      setCurrentSlideElements([...currentSlideElements, result.element])
      setSelectedElementId(result.element.id)
    } catch (err) {
      setError('Failed to add text box')
    }
  }

  const handleAddImage = async (image) => {
    try {
      const result = await slidesAPI.createElement(currentSlide.id, {
        type: 'image',
        position: { x: 150, y: 150 },
        size: { width: image.width || 600, height: image.height || 400 },
        imageId: image.id,
        objectFit: 'contain'
      })

      setCurrentSlideElements([...currentSlideElements, result.element])
      setSelectedElementId(result.element.id)
      setShowImageLibrary(false)
    } catch (err) {
      setError('Failed to add image')
    }
  }

  const handleElementToolbarUpdate = async (updates) => {
    if (!selectedElement) return

    try {
      await slidesAPI.updateElement(selectedElement.id, updates)

      const updatedElements = currentSlideElements.map(el =>
        el.id === selectedElement.id ? { ...el, ...updates } : el
      )
      setCurrentSlideElements(updatedElements)
    } catch (err) {
      setError('Failed to update element')
    }
  }

  const handleDeleteElement = async () => {
    if (!selectedElement) return

    try {
      await slidesAPI.deleteElement(selectedElement.id)
      setCurrentSlideElements(currentSlideElements.filter(el => el.id !== selectedElement.id))
      setSelectedElementId(null)
    } catch (err) {
      setError('Failed to delete element')
    }
  }

  const handleDuplicateElement = async () => {
    if (!selectedElement) return

    try {
      const result = await slidesAPI.createElement(currentSlide.id, {
        ...selectedElement,
        position: {
          x: selectedElement.position.x + 20,
          y: selectedElement.position.y + 20
        }
      })

      setCurrentSlideElements([...currentSlideElements, result.element])
      setSelectedElementId(result.element.id)
    } catch (err) {
      setError('Failed to duplicate element')
    }
  }

  const handleBringForward = async () => {
    if (!selectedElement) return

    const maxZ = Math.max(...currentSlideElements.map(el => el.zIndex || 0))
    await handleElementToolbarUpdate({ zIndex: maxZ + 1 })
  }

  const handleSendBackward = async () => {
    if (!selectedElement) return

    const minZ = Math.min(...currentSlideElements.map(el => el.zIndex || 0))
    await handleElementToolbarUpdate({ zIndex: minZ - 1 })
  }

  const handleLockToggle = async () => {
    if (!selectedElement) return

    await handleElementToolbarUpdate({ locked: !selectedElement.locked })
  }

  const handleLayerReorder = async (reorderedElements) => {
    try {
      const elementsOrder = reorderedElements.map(el => ({
        id: el.id,
        zIndex: el.zIndex
      }))
      await slidesAPI.reorderElements(currentSlide.id, elementsOrder)
      setCurrentSlideElements(reorderedElements)
    } catch (err) {
      setError('Failed to reorder layers')
    }
  }

  const handleToggleVisibility = async (elementId) => {
    const element = currentSlideElements.find(el => el.id === elementId)
    if (!element) return

    try {
      await slidesAPI.updateElement(elementId, { hidden: !element.hidden })

      const updatedElements = currentSlideElements.map(el =>
        el.id === elementId ? { ...el, hidden: !el.hidden } : el
      )
      setCurrentSlideElements(updatedElements)
    } catch (err) {
      setError('Failed to toggle visibility')
    }
  }

  const handleToggleLock = async (elementId) => {
    const element = currentSlideElements.find(el => el.id === elementId)
    if (!element) return

    try {
      await slidesAPI.updateElement(elementId, { locked: !element.locked })

      const updatedElements = currentSlideElements.map(el =>
        el.id === elementId ? { ...el, locked: !el.locked } : el
      )
      setCurrentSlideElements(updatedElements)
    } catch (err) {
      setError('Failed to toggle lock')
    }
  }

  const handleStartPresentation = async (mode) => {
    try {
      await presentationAPI.start(deckId, mode)
      navigate(`/present/${deckId}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start presentation')
    }
  }

  if (!deck) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📚</div>
          <p className="text-gray-600">Loading deck...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Slide thumbnails sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-bold text-lg text-gray-900">Slides</h2>
          <p className="text-sm text-gray-600">{deck.slides.length} slides</p>
        </div>

        <div className="flex-1 p-4 space-y-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={deck.slides.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {deck.slides.map((slide, index) => (
                <SortableSlidePreview
                  key={slide.id}
                  slide={slide}
                  index={index}
                  isActive={index === currentSlideIndex}
                  onClick={() => setCurrentSlideIndex(index)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </aside>

      {/* Main editor */}
      <main className="flex-1 flex flex-col">
        {/* Top toolbar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{deck.title}</h1>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <span>Slide {currentSlideIndex + 1} of {deck.slides.length}</span>
                <span className="text-gray-400">•</span>
                <span className="text-green-600 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Auto-saved
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Add element buttons */}
              <button
                onClick={handleAddTextBox}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                Add Text
              </button>

              <button
                onClick={() => setShowImageLibrary(true)}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Add Image
              </button>

              <div className="relative group">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Start Presentation ▼
                </button>
                <div className="hidden group-hover:block absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[200px]">
                  <button
                    onClick={() => handleStartPresentation('teacher')}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                  >
                    🔒 Teacher-Paced
                  </button>
                  <button
                    onClick={() => handleStartPresentation('student')}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                  >
                    🟢 Student-Paced
                  </button>
                  <button
                    onClick={() => handleStartPresentation('bounded')}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                  >
                    ⚡ Bounded Freedom
                  </button>
                </div>
              </div>

              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
              <p className="text-sm">{error}</p>
              <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </header>

        {/* Canvas editor */}
        <div className="flex-1 flex items-center justify-center p-8 bg-gray-100">
          <div className="relative">
            {/* Element Toolbar (appears above selected element) */}
            {selectedElement && (
              <ElementToolbar
                element={selectedElement}
                onUpdate={handleElementToolbarUpdate}
                onDelete={handleDeleteElement}
                onDuplicate={handleDuplicateElement}
                onBringForward={handleBringForward}
                onSendBackward={handleSendBackward}
                onLockToggle={handleLockToggle}
              />
            )}

            {/* Canvas */}
            <SlideCanvas
              slide={{ ...currentSlide, elements: currentSlideElements }}
              onElementUpdate={handleElementUpdate}
              onElementSelect={handleElementSelect}
              selectedElementId={selectedElementId}
              canvasWidth={1000}
              canvasHeight={600}
            />
          </div>
        </div>
      </main>

      {/* Layer Panel (right sidebar) */}
      <LayerPanel
        elements={currentSlideElements}
        selectedElementId={selectedElementId}
        onElementSelect={handleElementSelect}
        onReorder={handleLayerReorder}
        onToggleVisibility={handleToggleVisibility}
        onToggleLock={handleToggleLock}
        onDelete={handleDeleteElement}
      />

      {/* Image Library Modal */}
      <ImageLibrary
        isOpen={showImageLibrary}
        onClose={() => setShowImageLibrary(false)}
        onSelect={handleAddImage}
      />
    </div>
  )
}
