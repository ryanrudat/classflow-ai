import { useState } from 'react'
import axios from 'axios'
import { useNotifications } from './Toast'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/**
 * MatchingEditor Component
 * Teacher tool to create drag & drop matching activities
 *
 * Supports:
 * - PAIRS mode: Students match left items with right items
 * - CATEGORIES mode: Students drag items into category buckets
 */
export default function MatchingEditor({ sessionId, onClose, onSaved }) {
  const { notifySuccess, notifyError } = useNotifications()
  const token = localStorage.getItem('token')

  const [mode, setMode] = useState('pairs') // 'pairs' or 'categories'
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [difficultyLevel, setDifficultyLevel] = useState('medium')

  // PAIRS mode data
  const [items, setItems] = useState([{ id: 'item1', text: '' }])
  const [matches, setMatches] = useState([{ id: 'match1', text: '', correctItemId: 'item1' }])

  // CATEGORIES mode data
  const [categoryItems, setCategoryItems] = useState([{ id: 'item1', text: '', correctCategoryId: '' }])
  const [categories, setCategories] = useState([
    { id: 'cat1', name: '', description: '', color: 'bg-blue-100' }
  ])

  const [saving, setSaving] = useState(false)
  const [useAI, setUseAI] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiTopic, setAiTopic] = useState('')

  // Color options for categories
  const colorOptions = [
    { value: 'bg-blue-100', label: 'Blue', class: 'bg-blue-100' },
    { value: 'bg-green-100', label: 'Green', class: 'bg-green-100' },
    { value: 'bg-yellow-100', label: 'Yellow', class: 'bg-yellow-100' },
    { value: 'bg-purple-100', label: 'Purple', class: 'bg-purple-100' },
    { value: 'bg-pink-100', label: 'Pink', class: 'bg-pink-100' },
    { value: 'bg-red-100', label: 'Red', class: 'bg-red-100' }
  ]

  const handleAIGenerate = async () => {
    if (!aiTopic.trim()) {
      notifyError('Please enter a topic for AI generation')
      return
    }

    setAiGenerating(true)

    try {
      const response = await axios.post(
        `${API_URL}/api/ai/generate-matching`,
        {
          topic: aiTopic,
          mode,
          difficultyLevel
        },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      const generated = response.data

      setTitle(generated.title || aiTopic)
      setInstructions(generated.instructions || '')

      if (mode === 'pairs') {
        setItems(generated.items || [])
        setMatches(generated.matches || [])
      } else {
        setCategoryItems(generated.items || [])
        setCategories(generated.categories || [])
      }

      notifySuccess('AI generated matching activity!')
    } catch (error) {
      console.error('AI generation error:', error)
      notifyError('Failed to generate with AI. Please try again.')
    } finally {
      setAiGenerating(false)
    }
  }

  const handleSave = async () => {
    // Validation
    if (!title.trim()) {
      notifyError('Please enter a title')
      return
    }

    if (mode === 'pairs') {
      const hasEmptyItems = items.some(i => !i.text.trim())
      const hasEmptyMatches = matches.some(m => !m.text.trim())
      if (hasEmptyItems || hasEmptyMatches) {
        notifyError('Please fill in all items and matches')
        return
      }
      if (items.length !== matches.length) {
        notifyError('Number of items must match number of matches')
        return
      }
    } else {
      const hasEmptyItems = categoryItems.some(i => !i.text.trim())
      const hasEmptyCategories = categories.some(c => !c.name.trim())
      const hasUnassignedItems = categoryItems.some(i => !i.correctCategoryId)
      if (hasEmptyItems || hasEmptyCategories) {
        notifyError('Please fill in all items and categories')
        return
      }
      if (hasUnassignedItems) {
        notifyError('Please assign all items to categories')
        return
      }
    }

    setSaving(true)

    try {
      const activityData = {
        title,
        instructions,
        difficulty_level: difficultyLevel,
        mode,
        items: mode === 'pairs' ? items : categoryItems,
        matches: mode === 'pairs' ? matches : undefined,
        categories: mode === 'categories' ? categories : undefined
      }

      const response = await axios.post(
        `${API_URL}/api/sessions/${sessionId}/activities/matching`,
        activityData,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      notifySuccess('Matching activity created!')
      if (onSaved) onSaved(response.data.activity)
    } catch (error) {
      console.error('Save error:', error)
      notifyError('Failed to save activity. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // PAIRS MODE functions
  const addItem = () => {
    const newId = `item${items.length + 1}`
    setItems([...items, { id: newId, text: '' }])
  }

  const updateItem = (id, text) => {
    setItems(items.map(item => item.id === id ? { ...item, text } : item))
  }

  const removeItem = (id) => {
    if (items.length <= 1) return
    setItems(items.filter(item => item.id !== id))
    // Also remove any matches that reference this item
    setMatches(matches.filter(match => match.correctItemId !== id))
  }

  const addMatch = () => {
    const newId = `match${matches.length + 1}`
    setMatches([...matches, { id: newId, text: '', correctItemId: items[0]?.id || '' }])
  }

  const updateMatch = (id, field, value) => {
    setMatches(matches.map(match => match.id === id ? { ...match, [field]: value } : match))
  }

  const removeMatch = (id) => {
    if (matches.length <= 1) return
    setMatches(matches.filter(match => match.id !== id))
  }

  // CATEGORIES MODE functions
  const addCategoryItem = () => {
    const newId = `item${categoryItems.length + 1}`
    setCategoryItems([...categoryItems, { id: newId, text: '', correctCategoryId: categories[0]?.id || '' }])
  }

  const updateCategoryItem = (id, field, value) => {
    setCategoryItems(categoryItems.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const removeCategoryItem = (id) => {
    if (categoryItems.length <= 1) return
    setCategoryItems(categoryItems.filter(item => item.id !== id))
  }

  const addCategory = () => {
    const newId = `cat${categories.length + 1}`
    setCategories([...categories, { id: newId, name: '', description: '', color: colorOptions[categories.length % colorOptions.length].value }])
  }

  const updateCategory = (id, field, value) => {
    setCategories(categories.map(cat => cat.id === id ? { ...cat, [field]: value } : cat))
  }

  const removeCategory = (id) => {
    if (categories.length <= 1) return
    setCategories(categories.filter(cat => cat.id !== id))
    // Update items that were assigned to this category
    setCategoryItems(categoryItems.map(item =>
      item.correctCategoryId === id ? { ...item, correctCategoryId: categories.find(c => c.id !== id)?.id || '' } : item
    ))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Create Matching Activity</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* AI Generation Section */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
              </svg>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAI}
                  onChange={(e) => setUseAI(e.target.checked)}
                  className="rounded"
                />
                <span className="font-semibold text-purple-900">Use AI to Generate Activity</span>
              </label>
            </div>
            {useAI && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="Enter topic (e.g., 'US States and Capitals', 'Food Groups')"
                  className="flex-1 px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={handleAIGenerate}
                  disabled={aiGenerating}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {aiGenerating ? 'Generating...' : 'Generate'}
                </button>
              </div>
            )}
          </div>

          {/* Mode Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Activity Mode</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setMode('pairs')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  mode === 'pairs'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="font-semibold text-gray-900">Match Pairs</div>
                <div className="text-sm text-gray-600 mt-1">Students match items from two columns (e.g., terms to definitions)</div>
              </button>
              <button
                onClick={() => setMode('categories')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  mode === 'categories'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="font-semibold text-gray-900">Categorize</div>
                <div className="text-sm text-gray-600 mt-1">Students drag items into category buckets (e.g., sort animals by type)</div>
              </button>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Activity Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Match Vocabulary Words"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Difficulty Level</label>
              <select
                value={difficultyLevel}
                onChange={(e) => setDifficultyLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Instructions (Optional)</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Add any specific instructions for students..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* PAIRS MODE EDITOR */}
          {mode === 'pairs' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Items (Left Column)</h3>
                  <button
                    onClick={addItem}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add Item
                  </button>
                </div>
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={item.id} className="flex gap-2">
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) => updateItem(item.id, e.target.value)}
                        placeholder={`Item ${index + 1}`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      {items.length > 1 && (
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-2 text-red-600 hover:text-red-700"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column - Matches */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Matches (Right Column)</h3>
                  <button
                    onClick={addMatch}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add Match
                  </button>
                </div>
                <div className="space-y-3">
                  {matches.map((match, index) => (
                    <div key={match.id} className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={match.text}
                          onChange={(e) => updateMatch(match.id, 'text', e.target.value)}
                          placeholder={`Match ${index + 1}`}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        {matches.length > 1 && (
                          <button
                            onClick={() => removeMatch(match.id)}
                            className="p-2 text-red-600 hover:text-red-700"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <select
                        value={match.correctItemId}
                        onChange={(e) => updateMatch(match.id, 'correctItemId', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select correct item...</option>
                        {items.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.text || `Item ${items.indexOf(item) + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CATEGORIES MODE EDITOR */}
          {mode === 'categories' && (
            <div className="space-y-6">
              {/* Categories */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Categories</h3>
                  <button
                    onClick={addCategory}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add Category
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map((category, index) => (
                    <div key={category.id} className={`p-4 rounded-lg border-2 ${category.color}`}>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-600 uppercase">Category {index + 1}</span>
                          {categories.length > 1 && (
                            <button
                              onClick={() => removeCategory(category.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={category.name}
                          onChange={(e) => updateCategory(category.id, 'name', e.target.value)}
                          placeholder="Category name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          value={category.description || ''}
                          onChange={(e) => updateCategory(category.id, 'description', e.target.value)}
                          placeholder="Description (optional)"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <select
                          value={category.color}
                          onChange={(e) => updateCategory(category.id, 'color', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          {colorOptions.map(color => (
                            <option key={color.value} value={color.value}>{color.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Items to Categorize */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Items to Categorize</h3>
                  <button
                    onClick={addCategoryItem}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add Item
                  </button>
                </div>
                <div className="space-y-3">
                  {categoryItems.map((item, index) => (
                    <div key={item.id} className="flex gap-2">
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) => updateCategoryItem(item.id, 'text', e.target.value)}
                        placeholder={`Item ${index + 1}`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <select
                        value={item.correctCategoryId}
                        onChange={(e) => updateCategoryItem(item.id, 'correctCategoryId', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select category...</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name || `Category ${categories.indexOf(cat) + 1}`}
                          </option>
                        ))}
                      </select>
                      {categoryItems.length > 1 && (
                        <button
                          onClick={() => removeCategoryItem(item.id)}
                          className="p-2 text-red-600 hover:text-red-700"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
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
            {saving ? 'Creating...' : 'Create Activity'}
          </button>
        </div>
      </div>
    </div>
  )
}
