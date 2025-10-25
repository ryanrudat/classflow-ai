import { useState } from 'react'
import api from '../services/api'
import { useToast } from './Toast'

/**
 * ActivityEditor Component
 * Allows editing of AI-generated activity content
 */
export default function ActivityEditor({ activity, onClose, onSaved }) {
  const toast = useToast()
  const [editedContent, setEditedContent] = useState(JSON.stringify(activity.content, null, 2))
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      // Parse the edited JSON
      let parsedContent
      try {
        parsedContent = JSON.parse(editedContent)
      } catch (parseError) {
        toast.error('Error', 'Invalid JSON format. Please check your edits.')
        setSaving(false)
        return
      }

      const response = await api.put(`/activities/${activity.id}/content`, {
        content: parsedContent
      })

      toast.success('Success', 'Activity updated successfully!')

      if (onSaved) {
        onSaved(response.data.activity)
      }

      onClose()
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Error', error.response?.data?.message || 'Failed to update activity')
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
              <h2 className="text-xl font-bold text-gray-900">Edit Activity</h2>
              <p className="text-sm text-gray-600 mt-1">
                {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)} • {activity.difficulty_level || 'Medium'}
              </p>
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
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Activity Content (JSON)
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Edit the JSON below to modify questions, prompts, or other activity content.
            </p>
          </div>
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-96 p-4 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Edit activity content..."
            spellCheck="false"
          />
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
