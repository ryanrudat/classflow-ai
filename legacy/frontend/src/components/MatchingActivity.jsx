import { useState } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/**
 * MatchingActivity Component
 * Student view - drag items to match pairs or categorize
 *
 * Supports two modes:
 * 1. PAIRS: Drag left items to match with right items (terms to definitions)
 * 2. CATEGORIES: Drag items into category buckets (sort animals into mammals/reptiles/etc)
 */
export default function MatchingActivity({ activity, onSubmit }) {
  const content = activity.content
  const mode = content.mode || 'pairs' // 'pairs' or 'categories'
  const items = content.items || []
  const matches = content.matches || [] // For pairs mode
  const categories = content.categories || [] // For categories mode

  // Initialize matches state
  const [userMatches, setUserMatches] = useState({}) // itemId -> matchId/categoryId
  const [draggedItem, setDraggedItem] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)
  const [hoverTarget, setHoverTarget] = useState(null)

  const handleDragStart = (e, item) => {
    setDraggedItem(item)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDragEnter = (e, targetId) => {
    e.preventDefault()
    setHoverTarget(targetId)
  }

  const handleDragLeave = () => {
    setHoverTarget(null)
  }

  const handleDrop = (e, targetId) => {
    e.preventDefault()
    setHoverTarget(null)

    if (!draggedItem) return

    // Add match
    setUserMatches(prev => ({
      ...prev,
      [draggedItem.id]: targetId
    }))

    setDraggedItem(null)
  }

  const handleRemoveMatch = (itemId) => {
    setUserMatches(prev => {
      const newMatches = { ...prev }
      delete newMatches[itemId]
      return newMatches
    })
  }

  const handleSubmit = async () => {
    const studentToken = localStorage.getItem('studentToken')
    setSubmitted(true)

    try {
      const response = await axios.post(
        `${API_URL}/api/activities/${activity.id}/matching/submit`,
        { matches: userMatches },
        {
          headers: studentToken ? { 'Authorization': `Bearer ${studentToken}` } : {}
        }
      )

      setResult(response.data.response)

      if (onSubmit) {
        onSubmit({
          type: 'matching',
          matches: userMatches,
          score: response.data.response.score
        })
      }
    } catch (error) {
      console.error('Submit error:', error)
      setSubmitted(false)
      alert('Failed to submit. Please try again.')
    }
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setHoverTarget(null)
  }

  // Get unmatched items
  const unmatchedItems = items.filter(item => !userMatches[item.id])

  if (submitted && result) {
    const isCorrect = result.score === 100

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
                {isCorrect ? 'Perfect Match!' : 'Good Try!'}
              </h3>
              <p className={`text-lg ${isCorrect ? 'text-green-700' : 'text-yellow-700'} mt-1`}>
                Score: <span className="font-bold">{Math.round(result.score)}%</span>
              </p>
              <p className={`text-sm ${isCorrect ? 'text-green-600' : 'text-yellow-600'} mt-1`}>
                {result.correctMatches} out of {result.totalMatches} correct
              </p>
            </div>
          </div>

          {!isCorrect && result.correctAnswers && (
            <div className="mt-4 pt-4 border-t border-yellow-300">
              <h4 className="font-semibold text-yellow-900 mb-3">Correct Matches:</h4>
              <div className="space-y-2">
                {Object.entries(result.correctAnswers).map(([itemId, correctMatchId]) => {
                  const item = items.find(i => i.id === itemId)
                  const userMatchId = userMatches[itemId]
                  const isUserCorrect = userMatchId === correctMatchId

                  let correctMatch
                  if (mode === 'pairs') {
                    correctMatch = matches.find(m => m.id === correctMatchId)
                  } else {
                    correctMatch = categories.find(c => c.id === correctMatchId)
                  }

                  return (
                    <div key={itemId} className={`flex items-center gap-3 p-3 rounded ${isUserCorrect ? 'bg-green-100' : 'bg-red-50'}`}>
                      <span className="font-medium">{item?.text || item?.label}</span>
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                      <span className={isUserCorrect ? 'text-green-700 font-medium' : 'text-gray-700'}>
                        {correctMatch?.text || correctMatch?.label || correctMatch?.name}
                      </span>
                      {isUserCorrect && (
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
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

  // PAIRS MODE: Two column matching
  if (mode === 'pairs') {
    return (
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{content.title || 'Match the Pairs'}</h2>
        {content.instructions && (
          <p className="text-gray-600 mb-6">{content.instructions}</p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Items to Drag */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Drag from here</h3>
            <div className="space-y-3">
              {unmatchedItems.map(item => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragEnd={handleDragEnd}
                  className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg cursor-move hover:bg-blue-100 hover:border-blue-300 transition-all active:scale-95"
                >
                  <p className="font-medium text-gray-900">{item.text || item.label}</p>
                  {item.description && (
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  )}
                </div>
              ))}
              {unmatchedItems.length === 0 && (
                <p className="text-gray-400 text-center py-8">All items matched!</p>
              )}
            </div>
          </div>

          {/* Right Column - Drop Targets */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Match with these</h3>
            <div className="space-y-3">
              {matches.map(match => {
                const matchedItem = items.find(item => userMatches[item.id] === match.id)
                const isHovered = hoverTarget === match.id

                return (
                  <div
                    key={match.id}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(e, match.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, match.id)}
                    className={`p-4 rounded-lg border-2 min-h-[80px] transition-all ${
                      matchedItem
                        ? 'bg-green-50 border-green-300'
                        : isHovered
                        ? 'bg-purple-50 border-purple-400 border-dashed'
                        : 'bg-gray-50 border-gray-300 border-dashed'
                    }`}
                  >
                    <p className="font-medium text-gray-900">{match.text || match.label}</p>
                    {match.description && (
                      <p className="text-sm text-gray-600 mt-1">{match.description}</p>
                    )}
                    {matchedItem && (
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-green-700 font-medium">Matched: {matchedItem.text || matchedItem.label}</p>
                          <button
                            onClick={() => handleRemoveMatch(matchedItem.id)}
                            className="text-red-600 hover:text-red-700 p-1"
                            aria-label="Remove match"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={Object.keys(userMatches).length !== items.length}
          className="mt-6 btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {Object.keys(userMatches).length !== items.length
            ? `Match ${items.length - Object.keys(userMatches).length} more items`
            : 'Submit Matches'}
        </button>
      </div>
    )
  }

  // CATEGORIES MODE: Drag items into category buckets
  return (
    <div className="card">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{content.title || 'Categorize Items'}</h2>
      {content.instructions && (
        <p className="text-gray-600 mb-6">{content.instructions}</p>
      )}

      {/* Unmatched Items Pool */}
      {unmatchedItems.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Items to Categorize</h3>
          <div className="flex flex-wrap gap-2">
            {unmatchedItems.map(item => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onDragEnd={handleDragEnd}
                className="px-4 py-2 bg-white border-2 border-blue-300 rounded-lg cursor-move hover:bg-blue-50 hover:border-blue-400 transition-all active:scale-95 font-medium"
              >
                {item.text || item.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Buckets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(category => {
          const categoryItems = items.filter(item => userMatches[item.id] === category.id)
          const isHovered = hoverTarget === category.id

          return (
            <div
              key={category.id}
              onDragOver={handleDragOver}
              onDragEnter={(e) => handleDragEnter(e, category.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, category.id)}
              className={`rounded-lg border-2 transition-all ${
                isHovered
                  ? 'border-purple-400 border-dashed bg-purple-50'
                  : 'border-gray-300 bg-white'
              }`}
            >
              {/* Category Header */}
              <div className={`p-4 rounded-t-lg ${category.color || 'bg-gray-100'}`}>
                <h3 className="font-bold text-gray-900">{category.name || category.label}</h3>
                {category.description && (
                  <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                )}
              </div>

              {/* Category Items */}
              <div className="p-4 min-h-[120px]">
                {categoryItems.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">Drop items here</p>
                ) : (
                  <div className="space-y-2">
                    {categoryItems.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded"
                      >
                        <span className="text-sm font-medium text-gray-900">{item.text || item.label}</span>
                        <button
                          onClick={() => handleRemoveMatch(item.id)}
                          className="text-red-600 hover:text-red-700 p-1"
                          aria-label="Remove from category"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <button
        onClick={handleSubmit}
        disabled={Object.keys(userMatches).length !== items.length}
        className="mt-6 btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {Object.keys(userMatches).length !== items.length
          ? `Categorize ${items.length - Object.keys(userMatches).length} more items`
          : 'Submit Categories'}
      </button>
    </div>
  )
}
