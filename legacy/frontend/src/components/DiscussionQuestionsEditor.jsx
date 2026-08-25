import React, { useState } from 'react'
import api from '../services/api'
import { useToast } from './Toast'

/**
 * DiscussionQuestionsEditor Component
 * User-friendly editor for discussion questions activities
 */
export default function DiscussionQuestionsEditor({ activity, onClose, onSaved }) {
  const toast = useToast()
  const [questions, setQuestions] = useState(activity.content?.questions || [])
  const [saving, setSaving] = useState(false)

  // Helper to get question text (handles both string and object formats)
  const getQuestionText = (q) => {
    if (typeof q === 'string') return q
    return q?.question || ''
  }

  // Helper to get sample answer
  const getSampleAnswer = (q) => {
    if (typeof q === 'string') return ''
    return q?.sampleAnswer || ''
  }

  const handleQuestionChange = (index, field, value) => {
    const updated = [...questions]
    const currentQuestion = updated[index]

    // If it's a string, convert to object
    if (typeof currentQuestion === 'string') {
      updated[index] = { question: field === 'question' ? value : currentQuestion, sampleAnswer: '' }
      if (field === 'sampleAnswer') {
        updated[index].sampleAnswer = value
      }
    } else {
      // It's already an object
      updated[index] = { ...currentQuestion, [field]: value }
    }

    setQuestions(updated)
  }

  const addQuestion = () => {
    setQuestions([...questions, { question: '', sampleAnswer: '' }])
  }

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Normalize questions (handle both string and object formats)
      const normalizedQuestions = questions
        .map(q => {
          if (typeof q === 'string') {
            return q.trim() ? { question: q.trim(), sampleAnswer: '' } : null
          }
          return q?.question?.trim() ? q : null
        })
        .filter(Boolean) // Remove empty questions

      const updatedContent = {
        questions: normalizedQuestions
      }

      const response = await api.put(`/activities/${activity.id}/content`, {
        content: updatedContent
      })

      toast.success('Success', 'Discussion questions updated successfully!')

      if (onSaved) {
        onSaved(response.data.activity)
      }

      onClose()
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Error', error.response?.data?.message || 'Failed to update discussion questions')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="discussion-questions-title"
    >
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col max-w-full sm:max-w-4xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="discussion-questions-title" className="text-xl font-bold text-gray-900">Edit Discussion Questions</h2>
              <p className="text-sm text-gray-600 mt-1">{questions.length} question{questions.length !== 1 ? 's' : ''}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2"
              aria-label="Close discussion questions editor"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {questions.map((question, index) => (
              <div key={index} className="p-4 border-2 border-blue-100 rounded-lg bg-white">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm flex-shrink-0 mt-1">
                    {index + 1}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Question
                      </label>
                      <textarea
                        value={getQuestionText(question)}
                        onChange={(e) => handleQuestionChange(index, 'question', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg text-base resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows="3"
                        placeholder="Enter discussion question..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Sample Answer <span className="text-gray-500 font-normal">(optional)</span>
                      </label>
                      <textarea
                        value={getSampleAnswer(question)}
                        onChange={(e) => handleQuestionChange(index, 'sampleAnswer', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows="2"
                        placeholder="Add a sample answer or guidance for students (optional)..."
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeQuestion(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors"
                    title="Remove question"
                    aria-label={`Remove question ${index + 1}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}

            {questions.length === 0 && (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-600 font-medium">No questions yet</p>
                <p className="text-sm text-gray-500 mt-1">Click "Add Question" to get started</p>
              </div>
            )}

            <button
              type="button"
              onClick={addQuestion}
              className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Question
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
            disabled={saving || questions.length === 0}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
