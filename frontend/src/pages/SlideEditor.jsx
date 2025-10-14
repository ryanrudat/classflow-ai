import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { slidesAPI, presentationAPI } from '../services/api'
import RichTextEditor from '../components/slides/RichTextEditor'
import ImageUploader from '../components/slides/ImageUploader'
import ResizableImage from '../components/slides/ResizableImage'
import ImageLibrary from '../components/slides/ImageLibrary'
import SlidePreview from '../components/slides/SlidePreview'

/**
 * SlideEditor - Main page for editing slide decks
 * Allows teachers to create, edit, and manage presentations
 */
export default function SlideEditor() {
  const { deckId } = useParams()
  const navigate = useNavigate()

  const [deck, setDeck] = useState(null)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [showImageLibrary, setShowImageLibrary] = useState(false)
  const [isGeneratingVariant, setIsGeneratingVariant] = useState(false)
  const [error, setError] = useState(null)

  // Current slide
  const currentSlide = deck?.slides?.[currentSlideIndex]

  useEffect(() => {
    loadDeck()
  }, [deckId])

  const loadDeck = async () => {
    try {
      const result = await slidesAPI.getDeck(deckId)
      setDeck(result)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load deck')
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

  const handleSaveSlide = async () => {
    if (!currentSlide) return

    setIsSaving(true)
    setError(null)

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

      // Reload deck to get updated data
      await loadDeck()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save slide')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteSlide = async () => {
    if (!currentSlide) return

    if (!confirm('Delete this slide? This cannot be undone.')) {
      return
    }

    try {
      await slidesAPI.deleteSlide(currentSlide.id)

      // Reload deck
      await loadDeck()

      // Move to previous slide if we deleted the last one
      if (currentSlideIndex >= deck.slides.length - 1) {
        setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete slide')
    }
  }

  const handleGenerateVariant = async (direction) => {
    if (!currentSlide) return

    setIsGeneratingVariant(true)
    setError(null)

    try {
      await slidesAPI.generateVariant(currentSlide.id, direction)

      // Reload deck to show new variant
      await loadDeck()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate variant')
    } finally {
      setIsGeneratingVariant(false)
    }
  }

  const handleCreateBlankSlide = async () => {
    try {
      const result = await slidesAPI.createBlankSlide(deckId)

      // Reload deck to show new slide
      await loadDeck()

      // Navigate to the new slide (it will be at the end)
      setCurrentSlideIndex(deck.slides.length)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create blank slide')
    }
  }

  const handleDuplicateSlide = async () => {
    if (!currentSlide) return

    try {
      const result = await slidesAPI.duplicateSlide(currentSlide.id)

      // Reload deck to show duplicated slide
      await loadDeck()

      // Navigate to the duplicated slide (it will be at the end)
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
      position: 'right'
    })
  }

  const handleImageSelect = (selectedImage) => {
    updateCurrentSlide('image', {
      id: selectedImage.id,
      url: selectedImage.url,
      alt: selectedImage.alt_text,
      width: selectedImage.width,
      height: selectedImage.height,
      position: 'right'
    })
  }

  const handleImageResize = (newSize) => {
    updateCurrentSlide('image', {
      ...currentSlide.image,
      width: newSize.width,
      height: newSize.height
    })
  }

  const handleRemoveImage = () => {
    updateCurrentSlide('image', null)
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
          {deck.slides.map((slide, index) => (
            <SlidePreview
              key={slide.id}
              slide={slide}
              isActive={index === currentSlideIndex}
              onClick={() => setCurrentSlideIndex(index)}
            />
          ))}
        </div>

        {/* New Blank Slide button */}
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
              <p className="text-sm text-gray-600">
                Editing slide {currentSlideIndex + 1} of {deck.slides.length}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveSlide}
                disabled={isSaving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Slide'}
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

          {/* Error message */}
          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <p className="text-sm">{error}</p>
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

            {/* Image section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image
              </label>

              {currentSlide?.image ? (
                <div className="space-y-4">
                  {/* Image controls */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Position
                      </label>
                      <select
                        value={currentSlide.image.position || 'right'}
                        onChange={(e) => updateCurrentSlide('image', { ...currentSlide.image, position: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Fit Style
                      </label>
                      <select
                        value={currentSlide.image.objectFit || 'contain'}
                        onChange={(e) => updateCurrentSlide('image', { ...currentSlide.image, objectFit: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="contain">Contain (fit inside)</option>
                        <option value="cover">Cover (fill, crop edges)</option>
                        <option value="fill">Fill (stretch to fit)</option>
                        <option value="scale-down">Scale Down</option>
                        <option value="none">None (original size)</option>
                      </select>
                    </div>

                    <div className="col-span-2 flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentSlide.image.lockAspectRatio || false}
                          onChange={(e) => updateCurrentSlide('image', { ...currentSlide.image, lockAspectRatio: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Lock aspect ratio when resizing</span>
                      </label>

                      <button
                        onClick={handleRemoveImage}
                        className="ml-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        Remove Image
                      </button>
                    </div>
                  </div>

                  {/* Resizable image */}
                  <div className="border-2 border-gray-200 rounded-lg p-6 bg-gray-50" style={{ height: '400px', position: 'relative' }}>
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
    </div>
  )
}
