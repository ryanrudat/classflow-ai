import React, { useState } from 'react'
import api from '../services/api'
import { useToast } from './Toast'

/**
 * ReadingEditor Component
 * User-friendly editor for reading comprehension activities
 */
export default function ReadingEditor({ activity, onClose, onSaved }) {
  const toast = useToast()
  const [passage, setPassage] = useState(activity.content?.passage || '')
  const [vocabulary, setVocabulary] = useState(activity.content?.vocabulary || [])
  const [questions, setQuestions] = useState(activity.content?.questions || [])
  const [saving, setSaving] = useState(false)

  const handleVocabChange = (index, field, value) => {
    const updated = [...vocabulary]
    updated[index] = { ...updated[index], [field]: value }
    setVocabulary(updated)
  }

  const addVocabWord = () => {
    setVocabulary([...vocabulary, { word: '', definition: '' }])
  }

  const removeVocabWord = (index) => {
    setVocabulary(vocabulary.filter((_, i) => i !== index))
  }

  const handleQuestionChange = (index, value) => {
    const updated = [...questions]
    updated[index] = value
    setQuestions(updated)
  }

  const addQuestion = () => {
    setQuestions([...questions, ''])
  }

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updatedContent = {
        passage,
        vocabulary,
        questions
      }

      const response = await api.put(`/activities/${activity.id}/content`, {
        content: updatedContent
      })

      toast.success('Success', 'Reading activity updated successfully!')

      if (onSaved) {
        onSaved(response.data.activity)
      }

      onClose()
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Error', error.response?.data?.message || 'Failed to update reading activity')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Edit Reading Comprehension</h2>
              <p className="text-sm text-gray-600 mt-1">
                {questions.length} questions • {vocabulary.length} vocabulary words
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Reading Passage */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Reading Passage
            </label>
            <textarea
              value={passage}
              onChange={(e) => setPassage(e.target.value)}
              className="w-full h-64 p-4 border-2 border-gray-300 rounded-lg text-base text-gray-800 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter the reading passage..."
            />
            <p className="text-xs text-gray-500 mt-1">
              {passage.length.toLocaleString()} characters
            </p>
          </div>

          {/* Vocabulary Words */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-gray-700">
                Vocabulary Words
              </label>
              <button
                type="button"
                onClick={addVocabWord}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Word
              </button>
            </div>
            <div className="space-y-3">
              {vocabulary.map((vocab, index) => (
                <div key={index} className="p-3 border-2 border-gray-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={vocab.word}
                        onChange={(e) => handleVocabChange(index, 'word', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-sm font-semibold"
                        placeholder="Word"
                      />
                      <input
                        type="text"
                        value={vocab.definition}
                        onChange={(e) => handleVocabChange(index, 'definition', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                        placeholder="Definition"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVocabWord(index)}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              {vocabulary.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No vocabulary words yet. Click "Add Word" to add vocabulary.
                </p>
              )}
            </div>
          </div>

          {/* Comprehension Questions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-gray-700">
                Comprehension Questions
              </label>
              <button
                type="button"
                onClick={addQuestion}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Question
              </button>
            </div>
            <div className="space-y-3">
              {questions.map((question, index) => (
                <div key={index} className="p-3 border-2 border-gray-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-semibold text-gray-700 mt-2">
                      {index + 1}.
                    </span>
                    <textarea
                      value={question}
                      onChange={(e) => handleQuestionChange(index, e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded text-sm resize-none"
                      rows="2"
                      placeholder="Enter comprehension question..."
                    />
                    <button
                      type="button"
                      onClick={() => removeQuestion(index)}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              {questions.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No questions yet. Click "Add Question" to add comprehension questions.
                </p>
              )}
            </div>
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
            disabled={saving || !passage.trim()}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
