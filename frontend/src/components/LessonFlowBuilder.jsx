import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNotifications } from './Toast'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/**
 * LessonFlowBuilder Component
 * Visual drag & drop interface for creating sequential lesson experiences
 */
export default function LessonFlowBuilder({ sessionId, onClose, onSaved }) {
  const { notifySuccess, notifyError } = useNotifications()
  const token = localStorage.getItem('token')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [availableActivities, setAvailableActivities] = useState([])
  const [selectedActivities, setSelectedActivities] = useState([])
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [saving, setSaving] = useState(false)

  // Settings
  const [autoAdvance, setAutoAdvance] = useState(true)
  const [showProgress, setShowProgress] = useState(true)
  const [allowReview, setAllowReview] = useState(false)

  // Load available activities
  useEffect(() => {
    async function loadActivities() {
      try {
        const response = await axios.get(
          `${API_URL}/api/sessions/${sessionId}/activities`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        )
        setAvailableActivities(response.data.activities || [])
      } catch (error) {
        console.error('Failed to load activities:', error)
      }
    }
    loadActivities()
  }, [sessionId, token])

  const getActivityIcon = (type) => {
    const icons = {
      reading: '📖',
      questions: '❓',
      quiz: '📝',
      discussion: '💬',
      interactive_video: '🎥',
      sentence_ordering: '📋',
      matching: '🎯',
      poll: '📊'
    }
    return icons[type] || '📄'
  }

  const getActivityColor = (type) => {
    const colors = {
      reading: 'bg-blue-100 border-blue-300',
      questions: 'bg-yellow-100 border-yellow-300',
      quiz: 'bg-purple-100 border-purple-300',
      discussion: 'bg-pink-100 border-pink-300',
      interactive_video: 'bg-indigo-100 border-indigo-300',
      sentence_ordering: 'bg-teal-100 border-teal-300',
      matching: 'bg-green-100 border-green-300',
      poll: 'bg-orange-100 border-orange-300'
    }
    return colors[type] || 'bg-gray-100 border-gray-300'
  }

  const addToFlow = (activity) => {
    if (selectedActivities.find(a => a.id === activity.id)) {
      notifyError('Activity already in flow')
      return
    }
    setSelectedActivities([...selectedActivities, activity])
  }

  const removeFromFlow = (activityId) => {
    setSelectedActivities(selectedActivities.filter(a => a.id !== activityId))
  }

  const handleDragStart = (e, index) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newActivities = [...selectedActivities]
    const draggedItem = newActivities[draggedIndex]
    newActivities.splice(draggedIndex, 1)
    newActivities.splice(index, 0, draggedItem)

    setSelectedActivities(newActivities)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const moveUp = (index) => {
    if (index === 0) return
    const newActivities = [...selectedActivities]
    ;[newActivities[index], newActivities[index - 1]] = [newActivities[index - 1], newActivities[index]]
    setSelectedActivities(newActivities)
  }

  const moveDown = (index) => {
    if (index === selectedActivities.length - 1) return
    const newActivities = [...selectedActivities]
    ;[newActivities[index], newActivities[index + 1]] = [newActivities[index + 1], newActivities[index]]
    setSelectedActivities(newActivities)
  }

  const handleSave = async () => {
    if (!title.trim()) {
      notifyError('Please enter a title for the lesson flow')
      return
    }

    if (selectedActivities.length === 0) {
      notifyError('Please add at least one activity to the flow')
      return
    }

    setSaving(true)

    try {
      const response = await axios.post(
        `${API_URL}/api/sessions/${sessionId}/lesson-flows`,
        {
          title,
          description,
          activityIds: selectedActivities.map(a => a.id),
          autoAdvance,
          showProgress,
          allowReview
        },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      notifySuccess('Lesson flow created successfully!')
      if (onSaved) onSaved(response.data.flow)
    } catch (error) {
      console.error('Save error:', error)
      notifyError('Failed to create lesson flow. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 z-10 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <span className="text-3xl">✨</span>
                Create Magical Lesson Flow
              </h2>
              <p className="text-purple-100 text-sm mt-1">Build a sequential learning experience for your students</p>
            </div>
            <button onClick={onClose} className="text-white hover:text-gray-200">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Lesson Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Lesson Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., The Water Cycle - Complete Lesson"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Description (Optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this lesson"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Settings */}
          <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Flow Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoAdvance}
                  onChange={(e) => setAutoAdvance(e.target.checked)}
                  className="rounded"
                />
                <div>
                  <span className="font-medium text-gray-900">Auto-advance</span>
                  <p className="text-xs text-gray-600">Automatically move to next activity</p>
                </div>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showProgress}
                  onChange={(e) => setShowProgress(e.target.checked)}
                  className="rounded"
                />
                <div>
                  <span className="font-medium text-gray-900">Show Progress</span>
                  <p className="text-xs text-gray-600">Display "2 of 5" to students</p>
                </div>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowReview}
                  onChange={(e) => setAllowReview(e.target.checked)}
                  className="rounded"
                />
                <div>
                  <span className="font-medium text-gray-900">Allow Review</span>
                  <p className="text-xs text-gray-600">Let students go back</p>
                </div>
              </label>
            </div>
          </div>

          {/* Main Builder Area */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Available Activities */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span>📚</span>
                Available Activities
              </h3>
              <div className="bg-gray-50 rounded-lg border-2 border-gray-200 p-4 min-h-[400px] max-h-[500px] overflow-y-auto">
                {availableActivities.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg">No activities yet</p>
                    <p className="text-sm mt-2">Create some activities first!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableActivities.map(activity => {
                      const isInFlow = selectedActivities.find(a => a.id === activity.id)
                      return (
                        <div
                          key={activity.id}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            isInFlow
                              ? 'opacity-40 cursor-not-allowed bg-gray-100 border-gray-300'
                              : 'cursor-pointer hover:shadow-md ' + getActivityColor(activity.type)
                          }`}
                          onClick={() => !isInFlow && addToFlow(activity)}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{getActivityIcon(activity.type)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{activity.prompt}</p>
                              <p className="text-xs text-gray-600 capitalize">{activity.type.replace('_', ' ')}</p>
                            </div>
                            {isInFlow && (
                              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Lesson Flow Sequence */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span>🎬</span>
                Lesson Flow ({selectedActivities.length} activities)
              </h3>
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border-2 border-purple-300 p-4 min-h-[400px] max-h-[500px] overflow-y-auto">
                {selectedActivities.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <span className="text-4xl mb-4 block">✨</span>
                    <p className="text-lg font-medium">Build Your Lesson Flow</p>
                    <p className="text-sm mt-2">Click activities from the left to add them</p>
                    <p className="text-sm">Drag to reorder</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedActivities.map((activity, index) => (
                      <div
                        key={activity.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`p-4 bg-white rounded-lg border-2 border-purple-300 shadow-sm cursor-move transition-all ${
                          draggedIndex === index ? 'opacity-50 scale-95' : 'hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Sequence Number */}
                          <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                            {index + 1}
                          </div>

                          {/* Activity Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xl">{getActivityIcon(activity.type)}</span>
                              <p className="font-semibold text-gray-900 truncate">{activity.prompt}</p>
                            </div>
                            <p className="text-xs text-gray-600 capitalize">{activity.type.replace('_', ' ')}</p>
                          </div>

                          {/* Controls */}
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => moveUp(index)}
                              disabled={index === 0}
                              className="p-1 text-gray-600 hover:text-purple-600 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move up"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                            <button
                              onClick={() => moveDown(index)}
                              disabled={index === selectedActivities.length - 1}
                              className="p-1 text-gray-600 hover:text-purple-600 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move down"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                            <button
                              onClick={() => removeFromFlow(activity.id)}
                              className="p-1 text-red-600 hover:text-red-700"
                              title="Remove"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Flow Connector */}
                        {index < selectedActivities.length - 1 && (
                          <div className="flex items-center justify-center mt-3 mb-1">
                            <div className="flex flex-col items-center text-purple-400">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t p-6 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedActivities.length > 0 && (
              <span className="font-medium">
                ✨ {selectedActivities.length} {selectedActivities.length === 1 ? 'activity' : 'activities'} in flow
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim() || selectedActivities.length === 0}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {saving ? 'Creating...' : '✨ Create Lesson Flow'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
