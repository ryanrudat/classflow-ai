import { useState, useEffect, useRef } from 'react'
import { learningWorldsAPI, uploadAPI } from '../../services/api'

/**
 * Activity Content Editor
 *
 * Hybrid editor supporting both AI-generated and manually created content.
 * Works with vocabulary_touch, matching_game, listen_point, tpr_action, coloring
 */
export default function ActivityContentEditor({
  activity,
  onSave,
  onClose
}) {
  const [content, setContent] = useState(activity.content || {})
  const [items, setItems] = useState([])
  const [instructions, setInstructions] = useState('')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // AI generation options
  const [topic, setTopic] = useState(activity.title || '')
  const [itemCount, setItemCount] = useState(6)

  // Activity type configurations
  const activityConfigs = {
    vocabulary_touch: {
      label: 'Vocabulary Items',
      itemFields: ['word', 'imageUrl', 'emoji', 'phrase', 'translation'],
      contentKey: 'items',
      supportsImages: true
    },
    matching_game: {
      label: 'Matching Pairs',
      itemFields: ['word', 'imageUrl', 'match', 'translation'],
      contentKey: 'pairs',
      supportsImages: true
    },
    listen_point: {
      label: 'Listen & Point Items',
      itemFields: ['word', 'imageUrl', 'emoji', 'prompt', 'translation'],
      contentKey: 'items',
      supportsImages: true
    },
    tpr_action: {
      label: 'TPR Actions',
      itemFields: ['command', 'imageUrl', 'emoji', 'demonstration', 'translation'],
      contentKey: 'actions',
      supportsImages: true
    },
    coloring: {
      label: 'Coloring Items',
      itemFields: ['object', 'imageUrl', 'emoji', 'suggestedColor', 'prompt', 'translation'],
      contentKey: 'items',
      supportsImages: true
    }
  }

  const config = activityConfigs[activity.activity_type] || activityConfigs.vocabulary_touch

  // Initialize from existing content
  useEffect(() => {
    if (activity.content) {
      const existingItems = activity.content[config.contentKey] || activity.content.items || []
      setItems(existingItems)
      setInstructions(activity.content.instructions || '')
    }
  }, [activity.content])

  // Generate content with AI
  async function handleGenerateAI() {
    setGenerating(true)
    setError(null)

    try {
      const result = await learningWorldsAPI.generateActivityContent(activity.id, {
        topic,
        itemCount
      })

      if (result.content) {
        const generatedItems = result.content[config.contentKey] ||
                               result.content.items ||
                               result.content.pairs ||
                               result.content.actions || []

        // Merge with existing items (add new ones)
        setItems(prev => [...prev, ...generatedItems])
        if (result.content.instructions) {
          setInstructions(result.content.instructions)
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to generate content')
    } finally {
      setGenerating(false)
    }
  }

  // Add new blank item
  function handleAddItem() {
    const newItem = {}
    config.itemFields.forEach(field => {
      newItem[field] = ''
    })
    setItems([...items, newItem])
  }

  // Update item field
  function handleUpdateItem(index, field, value) {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  // Delete item
  function handleDeleteItem(index) {
    setItems(items.filter((_, i) => i !== index))
  }

  // Move item up/down
  function handleMoveItem(index, direction) {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= items.length) return

    const updated = [...items]
    const temp = updated[index]
    updated[index] = updated[newIndex]
    updated[newIndex] = temp
    setItems(updated)
  }

  // Save content
  async function handleSave() {
    setSaving(true)

    const newContent = {
      ...content,
      [config.contentKey]: items,
      instructions
    }

    try {
      await learningWorldsAPI.saveActivityContent(activity.id, newContent)
      onSave(newContent)
    } catch (err) {
      setError(err.message || 'Failed to save content')
    } finally {
      setSaving(false)
    }
  }

  // Track uploading state for each item
  const [uploadingIndex, setUploadingIndex] = useState(null)
  const fileInputRefs = useRef({})

  // Handle image upload for an item
  async function handleImageUpload(index, file) {
    if (!file) return

    setUploadingIndex(index)
    try {
      const result = await uploadAPI.uploadImage(file)
      if (result.url) {
        handleUpdateItem(index, 'imageUrl', result.url)
      }
    } catch (err) {
      setError('Failed to upload image: ' + (err.message || 'Unknown error'))
    } finally {
      setUploadingIndex(null)
    }
  }

  // Field labels for display
  const fieldLabels = {
    word: 'Word',
    imageUrl: 'Image',
    emoji: 'Emoji',
    phrase: 'Phrase',
    translation: 'Translation',
    match: 'Match/Emoji',
    prompt: 'Prompt',
    command: 'Command',
    demonstration: 'Demo',
    object: 'Object',
    suggestedColor: 'Color'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-purple-500 to-blue-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Edit Activity Content</h2>
              <p className="text-sm text-white/80">{activity.title}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* AI Generation Section */}
        <div className="p-4 bg-purple-50 border-b">
          <h3 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
            <span className="text-xl">🤖</span>
            AI Content Generator
          </h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Topic/Theme</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Farm animals, Colors, Food"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="w-24">
              <label className="block text-sm font-medium text-gray-700 mb-1">Items</label>
              <select
                value={itemCount}
                onChange={(e) => setItemCount(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                {[4, 6, 8, 10, 12].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleGenerateAI}
              disabled={generating || !topic.trim()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate with AI
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-purple-600 mt-2">
            AI will generate vocabulary items based on your topic. You can edit or add more manually below.
          </p>
        </div>

        {/* Error display */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Content Editor */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Instructions */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Instructions (shown to students)
            </label>
            <input
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g., Touch each picture to learn the word!"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Items List */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="font-medium text-gray-700">
                {config.label} ({items.length} items)
              </label>
              <button
                onClick={handleAddItem}
                className="px-3 py-1.5 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Item
              </button>
            </div>

            {items.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
                <p className="text-lg mb-2">No items yet</p>
                <p className="text-sm">Use AI to generate content or add items manually</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                  >
                    <div className="flex items-start gap-2">
                      {/* Move buttons */}
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleMoveItem(index, -1)}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleMoveItem(index, 1)}
                          disabled={index === items.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>

                      {/* Fields */}
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                        {config.itemFields.map(field => (
                          <div key={field}>
                            <label className="block text-xs text-gray-500 mb-0.5">
                              {fieldLabels[field] || field}
                            </label>
                            {field === 'imageUrl' ? (
                              <div className="relative">
                                <input
                                  type="file"
                                  accept="image/*"
                                  ref={el => fileInputRefs.current[index] = el}
                                  onChange={(e) => handleImageUpload(index, e.target.files?.[0])}
                                  className="hidden"
                                />
                                {item.imageUrl ? (
                                  <div className="relative group">
                                    <img
                                      src={item.imageUrl}
                                      alt="Item"
                                      className="w-full h-12 object-cover rounded border"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => fileInputRefs.current[index]?.click()}
                                        className="p-1 bg-white rounded text-xs"
                                        title="Replace"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateItem(index, 'imageUrl', '')}
                                        className="p-1 bg-white rounded text-xs text-red-500"
                                        title="Remove"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => fileInputRefs.current[index]?.click()}
                                    disabled={uploadingIndex === index}
                                    className="w-full h-12 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors disabled:opacity-50"
                                  >
                                    {uploadingIndex === index ? (
                                      <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                                    ) : (
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    )}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <input
                                type="text"
                                value={item[field] || ''}
                                onChange={(e) => handleUpdateItem(index, field, e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                                placeholder={field}
                              />
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={() => handleDeleteItem(index)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {items.length} items ready
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || items.length === 0}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Content'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
