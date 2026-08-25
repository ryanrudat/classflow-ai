import React, { useState } from 'react'
import api from '../services/api'
import { useToast } from './Toast'

/**
 * DiscussionPromptsEditor Component
 * User-friendly editor for discussion prompts activities
 */
export default function DiscussionPromptsEditor({ activity, onClose, onSaved }) {
  const toast = useToast()
  const [prompts, setPrompts] = useState(activity.content?.prompts || [])
  const [saving, setSaving] = useState(false)

  const handlePromptChange = (index, value) => {
    const updated = [...prompts]
    updated[index] = value
    setPrompts(updated)
  }

  const addPrompt = () => {
    setPrompts([...prompts, ''])
  }

  const removePrompt = (index) => {
    setPrompts(prompts.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updatedContent = {
        prompts: prompts.filter(p => p.trim()) // Remove empty prompts
      }

      const response = await api.put(`/activities/${activity.id}/content`, {
        content: updatedContent
      })

      toast.success('Success', 'Discussion prompts updated successfully!')

      if (onSaved) {
        onSaved(response.data.activity)
      }

      onClose()
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Error', error.response?.data?.message || 'Failed to update discussion prompts')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Edit Discussion Prompts</h2>
              <p className="text-sm text-gray-600 mt-1">{prompts.length} prompts</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {prompts.map((prompt, index) => (
              <div key={index} className="p-4 border-2 border-gray-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-semibold text-sm flex-shrink-0">
                    {index + 1}
                  </div>
                  <textarea
                    value={prompt}
                    onChange={(e) => handlePromptChange(index, e.target.value)}
                    className="flex-1 p-3 border border-gray-300 rounded-lg text-base resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows="3"
                    placeholder="Enter discussion prompt..."
                  />
                  <button
                    type="button"
                    onClick={() => removePrompt(index)}
                    className="text-red-600 hover:text-red-700 p-1"
                    title="Remove prompt"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}

            {prompts.length === 0 && (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-gray-600 font-medium">No prompts yet</p>
                <p className="text-sm text-gray-500 mt-1">Click "Add Prompt" to get started</p>
              </div>
            )}

            <button
              type="button"
              onClick={addPrompt}
              className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-all font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Prompt
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || prompts.length === 0}
            className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:bg-purple-400 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
