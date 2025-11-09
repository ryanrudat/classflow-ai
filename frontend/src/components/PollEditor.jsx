import { useState } from 'react'
import axios from 'axios'
import { useNotifications } from './Toast'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/**
 * PollEditor Component
 * Teacher tool to create live polls
 */
export default function PollEditor({ sessionId, onClose, onSaved }) {
  const { notifySuccess, notifyError } = useNotifications()
  const token = JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token

  const [question, setQuestion] = useState('')
  const [description, setDescription] = useState('')
  const [options, setOptions] = useState([
    { id: 'opt1', text: '' },
    { id: 'opt2', text: '' }
  ])
  const [saving, setSaving] = useState(false)

  const addOption = () => {
    if (options.length >= 6) {
      notifyError('Maximum 6 options allowed')
      return
    }
    setOptions([...options, { id: `opt${options.length + 1}`, text: '' }])
  }

  const updateOption = (id, text) => {
    setOptions(options.map(opt => opt.id === id ? { ...opt, text } : opt))
  }

  const removeOption = (id) => {
    if (options.length <= 2) {
      notifyError('Minimum 2 options required')
      return
    }
    setOptions(options.filter(opt => opt.id !== id))
  }

  const handleSave = async () => {
    if (!question.trim()) {
      notifyError('Please enter a question')
      return
    }

    const hasEmptyOptions = options.some(opt => !opt.text.trim())
    if (hasEmptyOptions) {
      notifyError('Please fill in all options')
      return
    }

    setSaving(true)

    try {
      const response = await axios.post(
        `${API_URL}/api/sessions/${sessionId}/activities/poll`,
        {
          question,
          description,
          options
        },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      notifySuccess('Poll created successfully!')
      if (onSaved) onSaved(response.data.activity)
    } catch (error) {
      console.error('Save error:', error)
      notifyError('Failed to create poll. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Create Live Poll</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Question */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Poll Question *</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., What is the capital of France?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add context or instructions..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Options */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-gray-700">Answer Options *</label>
              <button
                onClick={addOption}
                disabled={options.length >= 6}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Add Option
              </button>
            </div>
            <div className="space-y-3">
              {options.map((option, index) => (
                <div key={option.id} className="flex gap-2">
                  <div className="flex-shrink-0 w-8 h-10 flex items-center justify-center bg-gray-100 rounded font-semibold text-gray-700">
                    {String.fromCharCode(65 + index)}
                  </div>
                  <input
                    type="text"
                    value={option.text}
                    onChange={(e) => updateOption(option.id, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => removeOption(option.id)}
                      className="p-2 text-red-600 hover:text-red-700"
                      aria-label="Remove option"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">Students will see these options and vote in real-time</p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t p-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Poll'}
          </button>
        </div>
      </div>
    </div>
  )
}
