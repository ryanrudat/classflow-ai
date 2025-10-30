import { useState, useEffect, useCallback } from 'react'
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
import RichTextEditor from '../components/slides/RichTextEditor'
import ImageUploader from '../components/slides/ImageUploader'
import ResizableImage from '../components/slides/ResizableImage'
import ImageLibrary from '../components/slides/ImageLibrary'
import ImageToolbar from '../components/slides/ImageToolbar'
import ImageCropMode from '../components/slides/ImageCropMode'
import ConfirmDialog from '../components/ConfirmDialog'

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
        <div className="aspect-video bg-white border border-gray-200 rounded flex items-center justify-center text-xs text-gray-400 overflow-hidden">
          {slide.image ? (
            <img
              src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${slide.image.url}`}
              alt={slide.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="p-2 text-center">
              <div className="font-semibold text-gray-700">{slide.title || 'Untitled'}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * SlideEditor - Modern slide editor with drag-and-drop, auto-save, and contextual controls
 */
export default function SlideEditor() {
  const { deckId } = useParams()
  const navigate = useNavigate()

  const [deck, setDeck] = useState(null)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [showImageLibrary, setShowImageLibrary] = useState(false)
  const [isGeneratingVariant, setIsGeneratingVariant] = useState(false)
  const [error, setError] = useState(null)
  const [saveStatus, setSaveStatus] = useState('saved') // 'saving', 'saved', 'error'
  const [imageSelected, setImageSelected] = useState(false)
  const [showCropMode, setShowCropMode] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState(null)

  // Current slide
  const currentSlide = deck?.slides?.[currentSlideIndex]

  // Debounce changes for auto-save
  const [debouncedSlide] = useDebounce(currentSlide, 500)

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    loadDeck()
  }, [deckId])

  // Auto-save when slide changes (debounced)
  useEffect(() => {
    if (debouncedSlide && deck) {
      autoSaveSlide()
    }
  }, [debouncedSlide])

  const loadDeck = async () => {
    try {
      const result = await slidesAPI.getDeck(deckId)
      setDeck(result)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load deck')
    }
  }

  const autoSaveSlide = async () => {
    if (!currentSlide) return

    setSaveStatus('saving')

    try {
      await slidesAPI.updateSlide(currentSlide.id, {
        title: currentSlide.title,
        body: currentSlide.body,
        imageId: currentSlide.image?.id,
        imagePosition: currentSlide.image?.position,
        imageWidth: currentSlide.image?.width,
        imageHeight: currentSlide.image?.height,
        imageObjectFit: currentSlide.image?.objectFit,
        imageLockAspectRatio: currentSlide.image?.lockAspectRatio,
        template: currentSlide.template
      })

      setSaveStatus('saved')
    } catch (err) {
      console.error('Auto-save failed:', err)
      setSaveStatus('error')
    }
  }

  const updateCurrentSlide = (field, value) => {
    const updatedSlides = [...deck.slides]
    updatedSlides[currentSlideIndex] = {
      ...updatedSlides[currentSlideIndex],
      [field]: value
    }
    setDeck({ ...deck, slides: updatedSlides })
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event

    if (active.id !== over.id) {
      const oldIndex = deck.slides.findIndex(s => s.id === active.id)
      const newIndex = deck.slides.findIndex(s => s.id === over.id)

      const newSlides = arrayMove(deck.slides, oldIndex, newIndex)
      setDeck({ ...deck, slides: newSlides })

      // Update current slide index if needed
      if (currentSlideIndex === oldIndex) {
        setCurrentSlideIndex(newIndex)
      } else if (oldIndex < currentSlideIndex && newIndex >= currentSlideIndex) {
        setCurrentSlideIndex(currentSlideIndex - 1)
      } else if (oldIndex > currentSlideIndex && newIndex <= currentSlideIndex) {
        setCurrentSlideIndex(currentSlideIndex + 1)
      }

      // Save new order to backend
      try {
        const slidesOrder = newSlides.map((slide, index) => ({
          id: slide.id,
          slideNumber: index + 1
        }))
        await slidesAPI.reorderSlides(deckId, slidesOrder)
      } catch (err) {
        console.error('Failed to save slide order:', err)
        setError('Failed to save slide order')
      }
    }
  }

  const handleDeleteSlide = async () => {
    if (!currentSlide) return

    setConfirmDialog({
      title: 'Delete Slide?',
      message: 'This action cannot be undone. The slide will be permanently deleted from this presentation.',
      confirmText: 'Delete Slide',
      cancelText: 'Cancel',
      severity: 'danger',
      onConfirm: async () => {
        setConfirmDialog(null)
        try {
          await slidesAPI.deleteSlide(currentSlide.id)
          await loadDeck()

          if (currentSlideIndex >= deck.slides.length - 1) {
            setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))
          }
        } catch (err) {
          setError(err.response?.data?.message || 'Failed to delete slide')
        }
      },
      onCancel: () => setConfirmDialog(null)
    })
  }

  const handleGenerateVariant = async (direction) => {
    if (!currentSlide) return

    setIsGeneratingVariant(true)
    setError(null)

    try {
      await slidesAPI.generateVariant(currentSlide.id, direction)
      await loadDeck()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate variant')
    } finally {
      setIsGeneratingVariant(false)
    }
  }

  const handleCreateBlankSlide = async () => {
    try {
      await slidesAPI.createBlankSlide(deckId)
      await loadDeck()
      setCurrentSlideIndex(deck.slides.length)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create blank slide')
    }
  }

  const handleDuplicateSlide = async () => {
    if (!currentSlide) return

    try {
      await slidesAPI.duplicateSlide(currentSlide.id)
      await loadDeck()
      setCurrentSlideIndex(deck.slides.length)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to duplicate slide')
    }
  }

  const handleImageUpload = (uploadedImage) => {
    updateCurrentSlide('image', {
      id: uploadedImage.id,
      url: uploadedImage.url,
      alt: uploadedImage.alt_text,
      width: uploadedImage.width,
      height: uploadedImage.height,
      position: 'center',
      objectFit: 'contain',
      lockAspectRatio: true
    })
  }

  const handleImageSelect = (selectedImage) => {
    updateCurrentSlide('image', {
      id: selectedImage.id,
      url: selectedImage.url,
      alt: selectedImage.alt_text,
      width: selectedImage.width,
      height: selectedImage.height,
      position: 'center',
      objectFit: 'contain',
      lockAspectRatio: true
    })
  }

  const handleImageResize = (newSize) => {
    updateCurrentSlide('image', {
      ...currentSlide.image,
      width: newSize.width,
      height: newSize.height
    })
  }

  const handleImageFitChange = (changes) => {
    updateCurrentSlide('image', {
      ...currentSlide.image,
      ...changes
    })
  }

  const handleRemoveImage = () => {
    updateCurrentSlide('image', null)
    setImageSelected(false)
  }

  const handleCropApply = (cropData) => {
    console.log('Crop data:', cropData)
    // In a real implementation, you'd send the crop data to backend
    // which would process the image and return a new cropped version
    setShowCropMode(false)
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
      {/* Slide thumbnails sidebar with drag-and-drop */}
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

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleCreateBlankSlide}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Blank Slide
          </button>
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
                <span className={`flex items-center gap-1 ${
                  saveStatus === 'saving' ? 'text-blue-600' :
                  saveStatus === 'saved' ? 'text-green-600' :
                  'text-red-600'
                }`}>
                  {saveStatus === 'saving' && (
                    <>
                      <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  )}
                  {saveStatus === 'saved' && (
                    <>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Saved
                    </>
                  )}
                  {saveStatus === 'error' && 'Save failed'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
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

        {/* Editor content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Slide title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slide Title
              </label>
              <input
                type="text"
                value={currentSlide?.title || ''}
                onChange={(e) => updateCurrentSlide('title', e.target.value)}
                className="w-full px-4 py-3 text-2xl font-bold border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter slide title..."
              />
            </div>

            {/* Slide body */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slide Content
              </label>
              <RichTextEditor
                value={currentSlide?.body || ''}
                onChange={(value) => updateCurrentSlide('body', value)}
                placeholder="Add your slide content here..."
              />
            </div>

            {/* Image section with contextual toolbar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image
              </label>

              {currentSlide?.image ? (
                <div className="relative">
                  {/* Contextual toolbar appears when image is selected */}
                  {imageSelected && (
                    <ImageToolbar
                      image={currentSlide.image}
                      onFitChange={handleImageFitChange}
                      onCropClick={() => setShowCropMode(true)}
                      onRemove={handleRemoveImage}
                      containerWidth={1000}
                      containerHeight={600}
                      lockAspectRatio={currentSlide.image.lockAspectRatio}
                      onLockChange={(locked) => handleImageFitChange({ lockAspectRatio: locked })}
                    />
                  )}

                  {/* Resizable image */}
                  <div
                    className="border-2 border-gray-200 rounded-lg p-6 bg-gray-50 cursor-pointer"
                    style={{ height: '500px', position: 'relative' }}
                    onClick={() => setImageSelected(true)}
                    onBlur={() => setImageSelected(false)}
                  >
                    <ResizableImage
                      imageUrl={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${currentSlide.image.url}`}
                      alt={currentSlide.image.alt || ''}
                      initialWidth={currentSlide.image.width}
                      initialHeight={currentSlide.image.height}
                      onResize={handleImageResize}
                      editable={true}
                      objectFit={currentSlide.image.objectFit || 'contain'}
                      lockAspectRatio={currentSlide.image.lockAspectRatio || false}
                    />
                  </div>
                </div>
              ) : (
                <ImageUploader
                  onUploadComplete={handleImageUpload}
                  onSelectFromLibrary={() => setShowImageLibrary(true)}
                />
              )}
            </div>

            {/* Slide actions */}
            <div className="border-t border-gray-200 pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleGenerateVariant('easier')}
                    disabled={isGeneratingVariant}
                    className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50 transition-colors text-sm"
                  >
                    Generate Easier Variant
                  </button>
                  <button
                    onClick={() => handleGenerateVariant('harder')}
                    disabled={isGeneratingVariant}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors text-sm"
                  >
                    Generate Harder Variant
                  </button>
                </div>

                <button
                  onClick={handleDuplicateSlide}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Duplicate Slide
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleDeleteSlide}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
                >
                  Delete Slide
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Image Library Modal */}
      <ImageLibrary
        isOpen={showImageLibrary}
        onClose={() => setShowImageLibrary(false)}
        onSelect={handleImageSelect}
      />

      {/* Crop Mode Overlay */}
      {showCropMode && currentSlide?.image && (
        <ImageCropMode
          imageUrl={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${currentSlide.image.url}`}
          onApply={handleCropApply}
          onCancel={() => setShowCropMode(false)}
        />
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={true}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          severity={confirmDialog.severity}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}
    </div>
  )
}
