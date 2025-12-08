import { useState, useMemo } from 'react'
import {
  TEACHING_GOALS,
  SUBJECTS,
  ACTIVITY_TYPES,
  getActivitiesByGoal,
  getActivitiesBySubject,
  getAllActivities
} from '../config/activityTypes'

/**
 * ActivityCategorySelector Component
 * Goal-based activity selection with "See All" access
 *
 * Props:
 * - onSelect: (activityType) => void - Called when activity is selected
 * - selectedType: string - Currently selected activity type ID
 * - subject: string - Optional subject filter (e.g., 'english', 'social_studies')
 * - showOnlyGeneratable: boolean - Only show AI-generatable activities
 * - compact: boolean - Use compact layout
 */
export default function ActivityCategorySelector({
  onSelect,
  selectedType = null,
  subject = 'all',
  showOnlyGeneratable = false,
  compact = false
}) {
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [showAllActivities, setShowAllActivities] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Filter activities based on current filters
  const filteredActivities = useMemo(() => {
    let activities = getAllActivities()

    // Filter by subject
    if (subject && subject !== 'all') {
      activities = activities.filter(
        a => a.subjects.includes(subject) || a.subjects.includes('general')
      )
    }

    // Filter by AI-generatable
    if (showOnlyGeneratable) {
      activities = activities.filter(a => a.aiGeneratable)
    }

    // Filter by goal
    if (selectedGoal && !showAllActivities) {
      activities = activities.filter(a => a.goals.includes(selectedGoal))
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      activities = activities.filter(
        a =>
          a.label.toLowerCase().includes(query) ||
          a.description.toLowerCase().includes(query)
      )
    }

    return activities
  }, [subject, showOnlyGeneratable, selectedGoal, showAllActivities, searchQuery])

  // Group activities by goal for the goal view
  const activitiesByGoal = useMemo(() => {
    const grouped = {}
    Object.keys(TEACHING_GOALS).forEach(goalId => {
      grouped[goalId] = getActivitiesByGoal(goalId).filter(a => {
        if (showOnlyGeneratable && !a.aiGeneratable) return false
        if (subject && subject !== 'all') {
          return a.subjects.includes(subject) || a.subjects.includes('general')
        }
        return true
      })
    })
    return grouped
  }, [subject, showOnlyGeneratable])

  const handleGoalSelect = (goalId) => {
    setSelectedGoal(goalId)
    setShowAllActivities(false)
  }

  const handleShowAll = () => {
    setSelectedGoal(null)
    setShowAllActivities(true)
  }

  const handleBack = () => {
    setSelectedGoal(null)
    setShowAllActivities(false)
    setSearchQuery('')
  }

  // Render activity card
  const renderActivityCard = (activity, isSelected) => (
    <button
      key={activity.id}
      onClick={() => onSelect(activity.id)}
      className={`p-3 border-2 rounded-lg text-left transition-all w-full ${
        isSelected
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
          : `${activity.bgClass} hover:shadow-md hover:scale-[1.02]`
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{activity.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{activity.label}</span>
            {activity.isNew && (
              <span className="px-1.5 py-0.5 bg-green-500 text-white text-xs font-medium rounded">
                NEW
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
            {activity.description}
          </p>
          <p className="text-xs text-gray-400 mt-1">{activity.estimatedTime}</p>
        </div>
        {isSelected && (
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )}
      </div>
    </button>
  )

  // Show goal selection or activity list
  if (!selectedGoal && !showAllActivities) {
    return (
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            What's your teaching goal?
          </h4>
          <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-3'}`}>
            {Object.entries(TEACHING_GOALS).map(([goalId, goal]) => {
              const count = activitiesByGoal[goalId]?.length || 0
              if (count === 0) return null

              return (
                <button
                  key={goalId}
                  onClick={() => handleGoalSelect(goalId)}
                  className="p-4 border-2 border-gray-200 rounded-lg text-left hover:border-blue-400 hover:bg-blue-50 transition-all group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{goal.icon}</span>
                    <span className="font-semibold text-gray-900 group-hover:text-blue-700">
                      {goal.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{goal.description}</p>
                  <p className="text-xs text-gray-400">{count} activities</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* See All Activities */}
        <div className="pt-3 border-t border-gray-200">
          <button
            onClick={handleShowAll}
            className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            See All Activities ({getAllActivities().filter(a => {
              if (showOnlyGeneratable && !a.aiGeneratable) return false
              if (subject && subject !== 'all') {
                return a.subjects.includes(subject) || a.subjects.includes('general')
              }
              return true
            }).length})
          </button>
        </div>
      </div>
    )
  }

  // Show activities for selected goal or all activities
  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to goals
        </button>
        <span className="text-sm text-gray-500">
          {filteredActivities.length} activities
        </span>
      </div>

      {/* Title */}
      <h4 className="text-sm font-semibold text-gray-700">
        {showAllActivities
          ? 'All Activities'
          : TEACHING_GOALS[selectedGoal]?.label}
      </h4>

      {/* Search (only in "all" view) */}
      {showAllActivities && (
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activities..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Activity Grid */}
      <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
        {filteredActivities.map(activity =>
          renderActivityCard(activity, selectedType === activity.id)
        )}
      </div>

      {filteredActivities.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No activities match your filters.</p>
          <button
            onClick={handleBack}
            className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Compact Activity Selector (for inline use)
 * Shows just the activity type cards without goal selection
 */
export function ActivityTypeGrid({ onSelect, selectedType, activities = null }) {
  const activityList = activities || getAllActivities()

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {activityList.map(activity => (
        <button
          key={activity.id}
          onClick={() => onSelect(activity.id)}
          className={`p-3 border-2 rounded-lg text-center transition-all ${
            selectedType === activity.id
              ? 'border-blue-500 bg-blue-50'
              : `${activity.bgClass} hover:shadow-md`
          }`}
        >
          <span className="text-2xl block mb-1">{activity.icon}</span>
          <span className="text-sm font-medium text-gray-900 block">{activity.label}</span>
          {activity.isNew && (
            <span className="inline-block mt-1 px-1.5 py-0.5 bg-green-500 text-white text-xs font-medium rounded">
              NEW
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

/**
 * Subject Filter Pills
 */
export function SubjectFilter({ selected, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(SUBJECTS).map(([subjectId, subject]) => (
        <button
          key={subjectId}
          onClick={() => onChange(subjectId)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selected === subjectId
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {subject.label}
        </button>
      ))}
    </div>
  )
}
