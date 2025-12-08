import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNotifications } from './Toast'
import { getActivityById, ACTIVITY_TYPES } from '../config/activityTypes'
import LessonFlowTemplateSelector from './LessonFlowTemplateSelector'
import GenerateFromVideoModal from './GenerateFromVideoModal'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/**
 * LessonFlowBuilder Component
 * Visual drag & drop interface for creating/editing sequential lesson experiences
 * v2 - Enhanced with centralized activity config and templates
 */
export default function LessonFlowBuilder({ sessionId, onClose, onSaved, existingFlow = null }) {
  const { notifySuccess, notifyError } = useNotifications()
  const token = JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token

  const isEditMode = !!existingFlow

  const [step, setStep] = useState(isEditMode ? 'builder' : 'template') // 'template' or 'builder'
  const [title, setTitle] = useState(existingFlow?.title || '')
  const [description, setDescription] = useState(existingFlow?.description || '')
  const [availableActivities, setAvailableActivities] = useState([])
  const [selectedActivities, setSelectedActivities] = useState([])
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [saving, setSaving] = useState(false)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [activitiesLoading, setActivitiesLoading] = useState(true)

  // Settings
  const [autoAdvance, setAutoAdvance] = useState(existingFlow?.auto_advance ?? true)
  const [showProgress, setShowProgress] = useState(existingFlow?.show_progress ?? true)
  const [allowReview, setAllowReview] = useState(existingFlow?.allow_review ?? false)
  const [pacingMode, setPacingMode] = useState(existingFlow?.pacing_mode || 'student_paced')

  // Video question generation modal
  const [videoForQuestions, setVideoForQuestions] = useState(null)

  // Load available activities
  useEffect(() => {
    async function loadActivities() {
      setActivitiesLoading(true)
      try {
        const response = await axios.get(
          `${API_URL}/api/sessions/${sessionId}/activities`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        )
        const activities = response.data.activities || []
        setAvailableActivities(activities)

        // In edit mode, pre-populate selected activities
        if (isEditMode && existingFlow?.activities && !initialLoadDone) {
          const selectedIds = existingFlow.activities.map(a => a.activity_id || a.id)
          const selected = selectedIds
            .map(id => activities.find(a => a.id === id))
            .filter(Boolean)
          setSelectedActivities(selected)
          setInitialLoadDone(true)
        }
      } catch (error) {
        console.error('Failed to load activities:', error)
      } finally {
        setActivitiesLoading(false)
      }
    }
    loadActivities()
  }, [sessionId, token, isEditMode, existingFlow, initialLoadDone])

  // Use centralized activity config for icons and colors
  const getActivityIcon = (type) => {
    const activity = getActivityById(type)
    return activity?.icon || '📄'
  }

  const getActivityColor = (type) => {
    const activity = getActivityById(type)
    return activity?.bgClass || 'bg-gray-100 border-gray-300'
  }

  // Check if a video activity has questions
  const hasVideoQuestions = (activity) => {
    if (activity.type !== 'interactive_video') return true
    const content = typeof activity.content === 'string'
      ? JSON.parse(activity.content)
      : activity.content
    return content?.questions && content.questions.length > 0
  }

  // Handle video question generation complete
  const handleVideoQuestionsGenerated = (updatedVideo) => {
    // Update the activity in both available and selected lists
    setAvailableActivities(prev =>
      prev.map(a => a.id === updatedVideo.id ? updatedVideo : a)
    )
    setSelectedActivities(prev =>
      prev.map(a => a.id === updatedVideo.id ? updatedVideo : a)
    )
    setVideoForQuestions(null)
  }

  // Handle template selection
  const handleTemplateSelect = (template) => {
    // Set title from template
    setTitle(template.name)
    setDescription(template.description)

    // Find matching activities from available activities
    const matchedActivities = template.activitySequence
      .map(activityType => {
        return availableActivities.find(a => a.type === activityType)
      })
      .filter(Boolean)

    if (matchedActivities.length > 0) {
      setSelectedActivities(matchedActivities)
      if (matchedActivities.length < template.activitySequence.length) {
        notifySuccess(`Added ${matchedActivities.length} of ${template.activitySequence.length} activities from template. Add more from the available activities!`)
      } else {
        notifySuccess(`Template "${template.name}" loaded with ${matchedActivities.length} activities!`)
      }
    } else {
      notifySuccess(`Template "${template.name}" selected. Add activities from the available list to build your flow.`)
    }

    // Move to builder step
    setStep('builder')
  }

  const handleBuildFromScratch = () => {
    setStep('builder')
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
      const payload = {
        title,
        description,
        activityIds: selectedActivities.map(a => a.id),
        autoAdvance: pacingMode === 'teacher_paced' ? false : autoAdvance,
        showProgress,
        allowReview: pacingMode === 'teacher_paced' ? false : allowReview,
        pacingMode
      }

      let response
      if (isEditMode) {
        // Update existing flow
        response = await axios.put(
          `${API_URL}/api/lesson-flows/${existingFlow.id}`,
          payload,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        )
        notifySuccess('Lesson flow updated successfully!')
      } else {
        // Create new flow
        response = await axios.post(
          `${API_URL}/api/sessions/${sessionId}/lesson-flows`,
          payload,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        )
        notifySuccess('Lesson flow created successfully!')
      }

      if (onSaved) onSaved(response.data.flow)
    } catch (error) {
      console.error('Save error:', error)
      notifyError(isEditMode ? 'Failed to update lesson flow. Please try again.' : 'Failed to create lesson flow. Please try again.')
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
                <span className="text-3xl">{isEditMode ? '✏️' : '✨'}</span>
                {isEditMode ? 'Edit Lesson Flow' : 'Create Magical Lesson Flow'}
              </h2>
              <p className="text-purple-100 text-sm mt-1">
                {isEditMode ? 'Modify the activities and settings for this lesson' : 'Build a sequential learning experience for your students'}
              </p>
            </div>
            <button onClick={onClose} className="text-white hover:text-gray-200">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Template Selection Step */}
          {step === 'template' && (
            <LessonFlowTemplateSelector
              onSelectTemplate={handleTemplateSelect}
              onBuildFromScratch={handleBuildFromScratch}
              availableActivities={availableActivities}
              activitiesLoading={activitiesLoading}
            />
          )}

          {/* Builder Step */}
          {step === 'builder' && (
            <>
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

          {/* Pacing Mode */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border-2 border-purple-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span>🎮</span>
              Pacing Control
            </h3>
            <p className="text-sm text-gray-600 mb-3">Choose who controls the pace of the lesson flow</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  pacingMode === 'student_paced'
                    ? 'border-purple-500 bg-purple-100'
                    : 'border-gray-200 bg-white hover:border-purple-300'
                }`}
              >
                <input
                  type="radio"
                  name="pacingMode"
                  value="student_paced"
                  checked={pacingMode === 'student_paced'}
                  onChange={(e) => setPacingMode(e.target.value)}
                  className="sr-only"
                />
                <div className="text-center">
                  <span className="font-semibold text-gray-900 block">Student-Paced</span>
                  <p className="text-xs text-gray-600 mt-1">Students move at their own speed</p>
                </div>
              </label>
              <label
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  pacingMode === 'teacher_paced'
                    ? 'border-purple-500 bg-purple-100'
                    : 'border-gray-200 bg-white hover:border-purple-300'
                }`}
              >
                <input
                  type="radio"
                  name="pacingMode"
                  value="teacher_paced"
                  checked={pacingMode === 'teacher_paced'}
                  onChange={(e) => setPacingMode(e.target.value)}
                  className="sr-only"
                />
                <div className="text-center">
                  <span className="text-2xl block mb-2">👩‍🏫</span>
                  <span className="font-semibold text-gray-900 block">Teacher-Paced</span>
                  <p className="text-xs text-gray-600 mt-1">You control all students (like slides)</p>
                </div>
              </label>
              <label
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  pacingMode === 'teacher_guided'
                    ? 'border-purple-500 bg-purple-100'
                    : 'border-gray-200 bg-white hover:border-purple-300'
                }`}
              >
                <input
                  type="radio"
                  name="pacingMode"
                  value="teacher_guided"
                  checked={pacingMode === 'teacher_guided'}
                  onChange={(e) => setPacingMode(e.target.value)}
                  className="sr-only"
                />
                <div className="text-center">
                  <span className="text-2xl block mb-2">🤝</span>
                  <span className="font-semibold text-gray-900 block">Teacher-Guided</span>
                  <p className="text-xs text-gray-600 mt-1">You set pace, students can catch up</p>
                </div>
              </label>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Additional Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className={`flex items-center gap-2 ${pacingMode === 'teacher_paced' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  checked={pacingMode !== 'teacher_paced' && autoAdvance}
                  onChange={(e) => setAutoAdvance(e.target.checked)}
                  className="rounded"
                  disabled={pacingMode === 'teacher_paced'}
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
              <label className={`flex items-center gap-2 ${pacingMode === 'teacher_paced' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  checked={pacingMode !== 'teacher_paced' && allowReview}
                  onChange={(e) => setAllowReview(e.target.checked)}
                  className="rounded"
                  disabled={pacingMode === 'teacher_paced'}
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

                            {/* Warning for videos without questions */}
                            {activity.type === 'interactive_video' && !hasVideoQuestions(activity) && (
                              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="flex items-center gap-2 text-yellow-700 text-xs">
                                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  <span>No comprehension questions added</span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setVideoForQuestions(activity)
                                  }}
                                  className="mt-2 w-full px-3 py-1.5 bg-yellow-500 text-white text-xs font-medium rounded hover:bg-yellow-600 transition-colors"
                                >
                                  Generate Questions
                                </button>
                              </div>
                            )}

                            {/* Show question count for videos with questions */}
                            {activity.type === 'interactive_video' && hasVideoQuestions(activity) && (
                              <div className="mt-2 flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                                  {(() => {
                                    const content = typeof activity.content === 'string'
                                      ? JSON.parse(activity.content)
                                      : activity.content
                                    return `${content?.questions?.length || 0} comprehension questions`
                                  })()}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setVideoForQuestions(activity)
                                  }}
                                  className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                                >
                                  Edit
                                </button>
                              </div>
                            )}
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
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t p-6 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {step === 'builder' && selectedActivities.length > 0 && (
              <span className="font-medium">
                {selectedActivities.length} {selectedActivities.length === 1 ? 'activity' : 'activities'} in flow
              </span>
            )}
            {step === 'template' && (
              <span className="text-gray-500">Choose a template or build from scratch</span>
            )}
          </div>
          <div className="flex gap-3">
            {step === 'builder' && !isEditMode && (
              <button
                onClick={() => setStep('template')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Back to Templates
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            {step === 'builder' && (
              <button
                onClick={handleSave}
                disabled={saving || !title.trim() || selectedActivities.length === 0}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {saving
                  ? (isEditMode ? 'Saving...' : 'Creating...')
                  : (isEditMode ? 'Save Changes' : 'Create Lesson Flow')
                }
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Video Question Generation Modal */}
      {videoForQuestions && (
        <GenerateFromVideoModal
          video={videoForQuestions}
          onClose={() => setVideoForQuestions(null)}
          onGenerated={handleVideoQuestionsGenerated}
        />
      )}
    </div>
  )
}
