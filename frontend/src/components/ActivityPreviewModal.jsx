import { useState, useEffect } from 'react'
import api from '../services/api'

/**
 * ActivityPreviewModal Component
 * Shows full preview of library activity and allows reuse in sessions
 */

export default function ActivityPreviewModal({ item, onClose, onReuse }) {
  const [sessions, setSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadActiveSessions()
  }, [])

  async function loadActiveSessions() {
    try {
      const response = await api.get('/sessions')
      // Filter for active sessions only
      const activeSessions = response.data.sessions.filter(s => s.status === 'active')
      setSessions(activeSessions)
      if (activeSessions.length > 0) {
        setSelectedSession(activeSessions[0].id)
      }
    } catch (error) {
      console.error('Load sessions error:', error)
    }
  }

  async function handleReuse() {
    if (!selectedSession) return

    setLoading(true)
    try {
      await onReuse(item, selectedSession)
    } finally {
      setLoading(false)
    }
  }

  function renderContent() {
    const content = typeof item.content === 'string' ? JSON.parse(item.content) : item.content

    switch (item.type) {
      case 'reading':
        return (
          <div className="prose max-w-none">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
              {content}
            </div>
          </div>
        )

      case 'questions':
      case 'quiz':
        const questions = content.questions || content.quiz || []
        return (
          <div className="space-y-4">
            {questions.map((q, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="font-semibold text-gray-900 mb-3">
                  {index + 1}. {q.question}
                </p>
                {q.options && (
                  <div className="space-y-2 ml-4">
                    {q.options.map((option, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded ${
                          i === q.correct
                            ? 'bg-green-100 border border-green-300'
                            : 'bg-white border border-gray-200'
                        }`}
                      >
                        {option}
                        {i === q.correct && (
                          <span className="ml-2 text-green-700 text-sm font-medium">✓ Correct</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {q.sampleAnswer && (
                  <div className="mt-3 ml-4">
                    <p className="text-sm font-medium text-gray-700 mb-1">Sample Answer:</p>
                    <p className="text-sm text-gray-600 italic">{q.sampleAnswer}</p>
                  </div>
                )}
                {q.explanation && (
                  <div className="mt-3 ml-4">
                    <p className="text-sm font-medium text-gray-700 mb-1">Explanation:</p>
                    <p className="text-sm text-gray-600">{q.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )

      case 'discussion':
        const prompts = Array.isArray(content) ? content : content.prompts || []
        return (
          <div className="space-y-3">
            {prompts.map((prompt, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-900">{prompt}</p>
              </div>
            ))}
          </div>
        )

      default:
        return (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <pre className="whitespace-pre-wrap text-sm text-gray-700">
              {JSON.stringify(content, null, 2)}
            </pre>
          </div>
        )
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{item.title}</h2>
              {item.description && (
                <p className="text-gray-600">{item.description}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium capitalize">
                  {item.type}
                </span>
                {item.subject && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                    {item.subject}
                  </span>
                )}
                {item.difficulty_level && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    item.difficulty_level === 'easy'
                      ? 'bg-green-100 text-green-700'
                      : item.difficulty_level === 'hard'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {item.difficulty_level}
                  </span>
                )}
                {item.grade_level && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                    Grade {item.grade_level}
                  </span>
                )}
              </div>
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
        <div className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </div>

        {/* Footer - Reuse Section */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          {sessions.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-600 mb-4">No active sessions. Create a session first to use this activity.</p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add to Session:
              </label>
              <div className="flex gap-3">
                <select
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.title} ({session.join_code})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleReuse}
                  disabled={loading}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Adding...
                    </span>
                  ) : (
                    'Add to Session'
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Used {item.times_used} {item.times_used === 1 ? 'time' : 'times'} previously
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
