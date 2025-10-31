import { useState } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/**
 * SentenceOrderingActivity Component
 * Student view - drag sentences into correct order
 */
export default function SentenceOrderingActivity({ activity, onSubmit }) {
  const content = activity.content
  const sentences = content.sentences || []

  // Shuffle sentences for initial display (using Fisher-Yates algorithm)
  const [orderedSentences, setOrderedSentences] = useState(() => {
    const shuffled = [...sentences]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  })

  const [draggingIndex, setDraggingIndex] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)

  const handleDragStart = (e, index) => {
    setDraggingIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', e.target)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e, dropIndex) => {
    e.preventDefault()

    if (draggingIndex === null || draggingIndex === dropIndex) {
      setDraggingIndex(null)
      return
    }

    const newOrder = [...orderedSentences]
    const draggedItem = newOrder[draggingIndex]
    newOrder.splice(draggingIndex, 1)
    newOrder.splice(dropIndex, 0, draggedItem)

    setOrderedSentences(newOrder)
    setDraggingIndex(null)
  }

  const handleDragEnd = () => {
    setDraggingIndex(null)
  }

  const handleMoveUp = (index) => {
    if (index === 0) return
    const newOrder = [...orderedSentences]
    const temp = newOrder[index]
    newOrder[index] = newOrder[index - 1]
    newOrder[index - 1] = temp
    setOrderedSentences(newOrder)
  }

  const handleMoveDown = (index) => {
    if (index === orderedSentences.length - 1) return
    const newOrder = [...orderedSentences]
    const temp = newOrder[index]
    newOrder[index] = newOrder[index + 1]
    newOrder[index + 1] = temp
    setOrderedSentences(newOrder)
  }

  const handleSubmit = async () => {
    const orderedIds = orderedSentences.map(s => s.id)
    const studentToken = localStorage.getItem('studentToken')

    setSubmitted(true)

    try {
      // Make API call to sentence ordering endpoint
      const response = await axios.post(
        `${API_URL}/api/activities/${activity.id}/sentence-ordering/submit`,
        { orderedSentences: orderedIds },
        {
          headers: studentToken ? { 'Authorization': `Bearer ${studentToken}` } : {}
        }
      )

      // Set result from API response
      if (response.data?.response) {
        setResult(response.data.response)
      }

      // Also call parent's onSubmit for WebSocket notification (optional)
      if (onSubmit) {
        onSubmit({
          type: 'sentence_ordering',
          orderedSentences: orderedIds,
          score: response.data.response.score
        })
      }
    } catch (error) {
      console.error('Submit error:', error)
      setSubmitted(false)
      alert('Failed to submit. Please try again.')
    }
  }

  if (submitted && result) {
    const isCorrect = result.isCorrect || result.score === 100

    return (
      <div className="card">
        <div className={`p-6 rounded-lg border-2 ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <div className="flex items-start gap-4 mb-4">
            {isCorrect ? (
              <svg className="w-12 h-12 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-12 h-12 text-yellow-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            <div className="flex-1">
              <h3 className={`text-2xl font-bold ${isCorrect ? 'text-green-900' : 'text-yellow-900'}`}>
                {isCorrect ? 'Perfect!' : 'Partial Credit'}
              </h3>
              <p className={`text-lg ${isCorrect ? 'text-green-700' : 'text-yellow-700'} mt-1`}>
                Score: <span className="font-bold">{Math.round(result.score)}%</span>
              </p>
              <p className={`text-sm ${isCorrect ? 'text-green-600' : 'text-yellow-600'} mt-1`}>
                {result.correctPositions} out of {result.totalSentences} sentences in correct position
              </p>
            </div>
          </div>

          {!isCorrect && result.correctOrder && (
            <div className="mt-4 pt-4 border-t border-yellow-300">
              <h4 className="font-semibold text-yellow-900 mb-2">Correct Order:</h4>
              <div className="space-y-2">
                {result.correctOrder.map((id, index) => {
                  const sentence = sentences.find(s => s.id === id)
                  return (
                    <div key={id} className="flex items-start gap-2 text-sm">
                      <span className="font-medium text-yellow-700">{index + 1}.</span>
                      <span className="text-yellow-800">{sentence?.text}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="text-xl font-bold text-gray-900 mb-2">Sentence Ordering</h3>
      <p className="text-gray-600 mb-6">{content.instructions}</p>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Instructions:</strong> Drag the sentences to arrange them in the correct order, or use the up/down arrows on mobile.
        </p>
      </div>

      {/* Sentences */}
      <div className="space-y-3 mb-6">
        {orderedSentences.map((sentence, index) => (
          <div
            key={sentence.id}
            draggable={!submitted}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`
              flex items-start gap-3 p-4 rounded-lg border-2 transition-all
              ${draggingIndex === index ? 'opacity-50 border-blue-400' : 'border-gray-300'}
              ${!submitted ? 'cursor-move hover:border-blue-400 hover:shadow-md' : 'cursor-default'}
            `}
          >
            {/* Drag Handle */}
            {!submitted && (
              <div className="flex-shrink-0 text-gray-400 pt-1">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
              </div>
            )}

            {/* Sentence Number and Text */}
            <div className="flex-1">
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold text-sm">
                  {index + 1}
                </span>
                <p className="text-gray-900 pt-1">{sentence.text}</p>
              </div>
            </div>

            {/* Mobile Controls */}
            {!submitted && (
              <div className="flex flex-col gap-1 sm:hidden">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Move up"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === orderedSentences.length - 1}
                  className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Move down"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={submitted}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {submitted ? 'Submitting...' : 'Submit Answer'}
      </button>
    </div>
  )
}
