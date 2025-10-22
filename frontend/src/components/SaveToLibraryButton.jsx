import { useState } from 'react'
import api from '../services/api'
import Toast from './Toast'

/**
 * SaveToLibraryButton Component
 * Reusable button to save activities to content library
 * Can be inline or full modal depending on context
 */

export default function SaveToLibraryButton({ activity, variant = 'button', onSaved }) {
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    title: activity.prompt || '',
    description: '',
    tags: [],
    folder: '',
    gradeLevel: ''
  })
  const [newTag, setNewTag] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  async function handleSave(e) {
    e?.preventDefault()

    if (!formData.title.trim()) {
      setToast({ type: 'error', message: 'Title is required' })
      return
    }

    setLoading(true)
    try {
      const response = await api.post('/library', {
        activityId: activity.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        tags: formData.tags,
        folder: formData.folder.trim() || null,
        gradeLevel: formData.gradeLevel || null
      })

      setToast({ type: 'success', message: 'Saved to library!' })
      setShowModal(false)

      if (onSaved) {
        onSaved(response.data.libraryItem)
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        tags: [],
        folder: '',
        gradeLevel: ''
      })
    } catch (error) {
      console.error('Save to library error:', error)

      if (error.response?.data?.message?.includes('already saved')) {
        setToast({ type: 'info', message: 'This activity is already in your library' })
      } else {
        setToast({ type: 'error', message: 'Failed to save to library' })
      }
    } finally {
      setLoading(false)
    }
  }

  function handleAddTag() {
    const tag = newTag.trim()
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] })
      setNewTag('')
    }
  }

  function handleRemoveTag(tag) {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) })
  }

  // Button variants
  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Save to Library"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
        {showModal && <Modal />}
      </>
    )
  }

  // Default button variant
  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 hover:border-blue-500 hover:text-blue-600 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        Save to Library
      </button>
      {showModal && <Modal />}
    </>
  )

  function Modal() {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-lg w-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Save to Library</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="p-6">
            {/* Title */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Give this activity a memorable name"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
                <span className="text-gray-500 font-normal ml-1">(optional)</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add notes about when/how to use this..."
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Folder */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Folder
                <span className="text-gray-500 font-normal ml-1">(optional)</span>
              </label>
              <input
                type="text"
                value={formData.folder}
                onChange={(e) => setFormData({ ...formData, folder: e.target.value })}
                placeholder="e.g., Unit 1: Colonial America"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Grade Level */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grade Level
                <span className="text-gray-500 font-normal ml-1">(optional)</span>
              </label>
              <select
                value={formData.gradeLevel}
                onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select grade level...</option>
                <option value="9">9th Grade</option>
                <option value="10">10th Grade</option>
                <option value="11">11th Grade</option>
                <option value="12">12th Grade</option>
                <option value="Mixed">Mixed Grades</option>
              </select>
            </div>

            {/* Tags */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
                <span className="text-gray-500 font-normal ml-1">(optional)</span>
              </label>

              {/* Selected Tags */}
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-blue-900"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Add Tag Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                  placeholder="Add a tag (e.g., 'primary sources', 'homework')"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : (
                  'Save to Library'
                )}
              </button>
            </div>
          </form>

          {/* Toast */}
          {toast && (
            <Toast
              type={toast.type}
              message={toast.message}
              onClose={() => setToast(null)}
            />
          )}
        </div>
      </div>
    )
  }
}
