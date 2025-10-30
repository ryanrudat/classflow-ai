import { useState } from 'react'
import api from '../services/api'
import { useToast } from './Toast'

/**
 * QuizEditor Component
 * User-friendly editor for quiz activities
 */
export default function QuizEditor({ activity, onClose, onSaved }) {
  const toast = useToast()

  // Normalize questions on load - handle both 'choices'/'options' and 'correctAnswer'/'correct'
  const normalizeQuestions = (questions) => {
    return questions.map(q => ({
      question: q.question || '',
      options: q.options || q.choices || ['', '', '', ''],
      correct: q.correct !== undefined ? q.correct : (q.correctAnswer !== undefined ? q.correctAnswer : 0)
    }))
  }

  const [questions, setQuestions] = useState(normalizeQuestions(activity.content?.questions || []))
  const [saving, setSaving] = useState(false)

  const handleQuestionChange = (index, field, value) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value }
    setQuestions(updated)
  }

  const handleOptionChange = (qIndex, optIndex, value) => {
    const updated = [...questions]
    updated[qIndex].options[optIndex] = value
    setQuestions(updated)
  }

  const addQuestion = () => {
    setQuestions([...questions, {
      question: '',
      options: ['', '', '', ''],
      correct: 0
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
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-editor-title"
    >
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col max-w-full sm:max-w-4xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="quiz-editor-title" className="text-xl font-bold text-gray-900">Edit Multiple Choice Quiz</h2>
              <p className="text-sm text-gray-600 mt-1">{questions.length} question{questions.length !== 1 ? 's' : ''}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2"
              aria-label="Close quiz editor"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {questions.map((q, qIndex) => (
            <div key={qIndex} className="p-5 border-2 border-blue-100 rounded-lg bg-white shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                    {qIndex + 1}
                  </div>
                  <span className="text-sm font-semibold text-gray-700">Question {qIndex + 1}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeQuestion(qIndex)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded transition-colors text-sm font-medium"
                  aria-label={`Remove question ${qIndex + 1}`}
                >
                  Remove
                </button>
              </div>

              <label className="block text-xs font-medium text-gray-700 mb-1">
                Question
              </label>
              <textarea
                value={q.question}
                onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg mb-4 text-base resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                placeholder="Enter question..."
              />

              <label className="block text-xs font-medium text-gray-700 mb-2">
                Answer Options (select the correct answer)
              </label>
              <div className="space-y-2">
                {q.options.map((option, optIndex) => (
                  <div key={optIndex} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <input
                      type="radio"
                      id={`q${qIndex}-opt${optIndex}`}
                      name={`correct-${qIndex}`}
                      checked={q.correct === optIndex}
                      onChange={() => handleQuestionChange(qIndex, 'correct', optIndex)}
                      className="w-4 h-4 text-green-600 focus:ring-2 focus:ring-green-500 cursor-pointer"
                    />
                    <label htmlFor={`q${qIndex}-opt${optIndex}`} className="sr-only">
                      Option {String.fromCharCode(65 + optIndex)} - {q.correct === optIndex ? 'Correct answer' : 'Incorrect answer'}
                    </label>
                    <span className="w-6 text-sm font-medium text-gray-600">
                      {String.fromCharCode(65 + optIndex)}.
                    </span>
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                    />
                    {q.correct === optIndex && (
                      <span className="text-green-600 text-xs font-medium flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Correct
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {questions.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
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
