import { useState } from 'react'
import api from '../services/api'
import { useToast } from './Toast'

/**
 * QuizEditor Component
 * User-friendly editor for quiz activities
 */
export default function QuizEditor({ activity, onClose, onSaved }) {
  const toast = useToast()
  const [questions, setQuestions] = useState(activity.content?.questions || [])
  const [saving, setSaving] = useState(false)

  const handleQuestionChange = (index, field, value) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value }
    setQuestions(updated)
  }

  const handleChoiceChange = (qIndex, cIndex, value) => {
    const updated = [...questions]
    updated[qIndex].choices[cIndex] = value
    setQuestions(updated)
  }

  const addQuestion = () => {
    setQuestions([...questions, {
      question: '',
      choices: ['', '', '', ''],
      correctAnswer: 0
    }])
  }

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updatedContent = {
        ...activity.content,
        questions
      }

      const response = await api.put(`/activities/${activity.id}/content`, {
        content: updatedContent
      })

      toast.success('Success', 'Quiz updated successfully!')

      if (onSaved) {
        onSaved(response.data.activity)
      }

      onClose()
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Error', error.response?.data?.message || 'Failed to update quiz')
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
              <h2 className="text-xl font-bold text-gray-900">Edit Quiz</h2>
              <p className="text-sm text-gray-600 mt-1">{questions.length} questions</p>
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
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {questions.map((q, qIndex) => (
            <div key={qIndex} className="p-4 border-2 border-gray-200 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">Question {qIndex + 1}</span>
                <button
                  type="button"
                  onClick={() => removeQuestion(qIndex)}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>

              <textarea
                value={q.question}
                onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg mb-3 text-sm resize-none"
                rows="2"
                placeholder="Enter question..."
              />

              <div className="space-y-2">
                {q.choices.map((choice, cIndex) => (
                  <div key={cIndex} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${qIndex}`}
                      checked={q.correctAnswer === cIndex}
                      onChange={() => handleQuestionChange(qIndex, 'correctAnswer', cIndex)}
                      className="text-blue-600"
                    />
                    <input
                      type="text"
                      value={choice}
                      onChange={(e) => handleChoiceChange(qIndex, cIndex, e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded text-sm"
                      placeholder={`Choice ${String.fromCharCode(65 + cIndex)}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addQuestion}
            className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
          >
            + Add Question
          </button>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center justify-center gap-2"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
