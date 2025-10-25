import React, { useState } from 'react'
import api from '../services/api'
import { useToast } from './Toast'

/**
 * GenerateFromDocumentModal
 * Modal to generate an activity from a previously saved document
 * @param {boolean} viewMode - If true, opens with document text visible for viewing/editing
 */
export default function GenerateFromDocumentModal({ document, onClose, onGenerated, viewMode = false }) {
  const toast = useToast()
  const [activityType, setActivityType] = useState('quiz')
  const [difficulty, setDifficulty] = useState('medium')
  const [generating, setGenerating] = useState(false)
  const [showDocumentText, setShowDocumentText] = useState(viewMode)
  const [editMode, setEditMode] = useState(false)
  const [editedText, setEditedText] = useState('')
  const [saving, setSaving] = useState(false)

  const activityTypes = [
    {
      value: 'quiz',
      label: 'Quiz',
      description: 'Multiple choice questions',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    },
    {
      value: 'questions',
      label: 'Discussion Questions',
      description: 'Open-ended questions',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      value: 'reading',
      label: 'Reading Comprehension',
      description: 'Summary and vocabulary',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    {
      value: 'discussion',
      label: 'Discussion Prompts',
      description: 'Debate topics',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    }
  ]

  const documentContent = typeof document.content === 'string'
    ? JSON.parse(document.content)
    : document.content

  // Initialize edited text when component mounts or edit mode is enabled
  React.useEffect(() => {
    if (editMode && !editedText) {
      setEditedText(documentContent.extractedText || '')
    }
  }, [editMode, documentContent.extractedText])

  const handleSaveEdit = async () => {
    setSaving(true)
    try {
      const response = await api.put(`/documents/${document.id}/content`, {
        extractedText: editedText
      })

      toast.success('Success', 'Document content updated!')
      setEditMode(false)

      // Update the local document content
      documentContent.extractedText = editedText
      documentContent.textLength = editedText.length
    } catch (error) {
      console.error('Save edit error:', error)
      toast.error('Error', error.response?.data?.message || 'Failed to update document')
    } finally {
      setSaving(false)
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)

    try {
      const response = await api.post(`/documents/generate/${document.id}`, {
        activityType,
        difficulty
      })

      toast.success('Success', 'Activity generated from document!')

      if (onGenerated) {
        onGenerated(response.data.activity)
      }

      onClose()
    } catch (error) {
      console.error('Generate error:', error)
      toast.error('Error', error.response?.data?.message || 'Failed to generate activity')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {viewMode ? 'View/Edit Document' : 'Generate Activity from Document'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">{documentContent.filename}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Document Info */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>
                  {documentContent.textLength?.toLocaleString()} characters extracted
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowDocumentText(!showDocumentText)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                {showDocumentText ? 'Hide' : 'View'} Content
                <svg className={`w-4 h-4 transition-transform ${showDocumentText ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            {showDocumentText && (
              <div className="mt-3">
                {editMode ? (
                  <div className="space-y-3">
                    <textarea
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      className="w-full h-60 p-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Edit document text..."
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditMode(false)
                          setEditedText('')
                        }}
                        disabled={saving}
                        className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={saving || !editedText.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                      >
                        {saving ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-white border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap flex-1">
                        {documentContent.extractedText}
                      </p>
                      <button
                        type="button"
                        onClick={() => setEditMode(true)}
                        className="ml-3 text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Activity Generation Options - Only show when NOT in view mode */}
          {!viewMode && (
            <>
              {/* Activity Type Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  What would you like to generate?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {activityTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setActivityType(type.value)}
                      className={`p-3 border-2 rounded-lg text-left transition-all ${
                        activityType === type.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-gray-700">{type.icon}</div>
                        <span className="font-medium text-gray-900">{type.label}</span>
                      </div>
                      <p className="text-xs text-gray-600">{type.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Difficulty Level
                </label>
                <div className="flex gap-2">
                  {['easy', 'medium', 'hard'].map((level) => (
                    <button
                      key={level}
                      onClick={() => setDifficulty(level)}
                      className={`flex-1 px-4 py-2 border-2 rounded-lg font-medium capitalize transition-all ${
                        difficulty === level
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          {viewMode ? (
            // View mode: Just a close button
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          ) : (
            // Generate mode: Cancel and Generate buttons
            <>
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate Activity
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
