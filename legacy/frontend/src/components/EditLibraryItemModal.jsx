import { useState, useEffect } from 'react'
import api from '../services/api'
import { useToast } from './Toast'
import { Spinner } from './LoadingStates'

/**
 * EditLibraryItemModal Component
 * Edit library item metadata (title, description, tags, folder)
 */

export default function EditLibraryItemModal({ item, allTags, onClose, onSave }) {
  const toast = useToast()
  const [formData, setFormData] = useState({
    title: item.title || '',
    description: item.description || '',
    folder: item.folder || '',
    gradeLevel: item.grade_level || ''
  })

  const [selectedTags, setSelectedTags] = useState(item.tags || [])
  const [newTag, setNewTag] = useState('')
  const [loading, setLoading] = useState(false)

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose, loading])

  async function handleSubmit(e) {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error('Error', 'Title is required')
      return
    }

    setLoading(true)
    try {
      await api.put(`/library/${item.id}`, {
        title: formData.title.trim(),
        description: formData.description.trim(),
        folder: formData.folder.trim() || null,
        gradeLevel: formData.gradeLevel || null,
        tags: selectedTags
      })

      toast.success('Success', 'Activity updated successfully')
      setTimeout(() => {
        onSave()
      }, 500)
    } catch (error) {
      console.error('Update error:', error)
      toast.error('Error', 'Failed to update activity')
    } finally {
      setLoading(false)
    }
  }

  function handleAddTag() {
    const tag = newTag.trim()
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag])
      setNewTag('')
    }
  }

  function handleRemoveTag(tag) {
    setSelectedTags(selectedTags.filter(t => t !== tag))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Edit Activity</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-100"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Title */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., The American Revolution - Reading Passage"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
              <span className="text-gray-500 font-normal ml-1">(optional)</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add notes about this activity..."
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Folder */}
          <div className="mb-5">
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
            <p className="mt-1 text-xs text-gray-500">Group similar activities together</p>
          </div>

          {/* Grade Level */}
          <div className="mb-5">
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
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
              <span className="text-gray-500 font-normal ml-1">(optional)</span>
            </label>

            {/* Selected Tags */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedTags.map((tag) => (
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

            {/* Add New Tag */}
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
                placeholder="Add a tag..."
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

            {/* Suggested Tags */}
            {allTags && allTags.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-600 mb-2">Suggested:</p>
                <div className="flex flex-wrap gap-2">
                  {allTags
                    .filter(t => !selectedTags.includes(t.name))
                    .slice(0, 10)
                    .map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => setSelectedTags([...selectedTags, tag.name])}
                        className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs hover:bg-gray-200 transition-colors"
                      >
                        + {tag.name}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Read-only Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Activity Info</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Type:</span>{' '}
                <span className="font-medium text-gray-900 capitalize">{item.type}</span>
              </div>
              <div>
                <span className="text-gray-600">Subject:</span>{' '}
                <span className="font-medium text-gray-900">{item.subject || 'Not set'}</span>
              </div>
              <div>
                <span className="text-gray-600">Difficulty:</span>{' '}
                <span className="font-medium text-gray-900 capitalize">{item.difficulty_level || 'Not set'}</span>
              </div>
              <div>
                <span className="text-gray-600">Times Used:</span>{' '}
                <span className="font-medium text-gray-900">{item.times_used || 0}</span>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
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
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
