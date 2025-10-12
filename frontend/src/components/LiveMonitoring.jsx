import { useState, useEffect } from 'react'

/**
 * LiveMonitoring Component
 * Displays real-time student progress during an active activity
 * Shows student cards with at-a-glance metrics and status indicators
 */
export default function LiveMonitoring({ sessionId, activityId, onStudentClick }) {
  const [studentProgress, setStudentProgress] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch initial progress data
  useEffect(() => {
    if (!sessionId || !activityId) return

    const fetchProgress = async () => {
      try {
        setLoading(true)
        const token = localStorage.getItem('token')
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/sessions/${sessionId}/activities/${activityId}/progress`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        )

        if (!response.ok) throw new Error('Failed to fetch progress')

        const data = await response.json()
        setStudentProgress(data.studentProgress || [])
      } catch (err) {
        console.error('Error fetching progress:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchProgress()
  }, [sessionId, activityId])

  // Handle real-time updates via props (to be connected to WebSocket)
  const handleProgressUpdate = (update) => {
    setStudentProgress(prev => {
      const existingIndex = prev.findIndex(s => s.studentId === update.studentId)

      if (existingIndex >= 0) {
        // Update existing student
        const updated = [...prev]
        const student = updated[existingIndex]

        updated[existingIndex] = {
          ...student,
          currentQuestion: update.questionNumber,
          questionsAttempted: update.questionsAttempted,
          score: update.score,
          totalAttempts: (student.totalAttempts || 0) + 1,
          helpRequestCount: update.helpReceived ? (student.helpRequestCount || 0) + 1 : student.helpRequestCount,
          isComplete: update.questionsAttempted >= update.totalQuestions,
          status: determineStatus(update)
        }

        return updated
      } else {
        // Add new student
        return [...prev, {
          studentId: update.studentId,
          studentName: update.studentName,
          currentQuestion: update.questionNumber,
          questionsAttempted: update.questionsAttempted,
          totalQuestions: update.totalQuestions,
          correctCount: update.isCorrect ? 1 : 0,
          score: update.score,
          totalAttempts: 1,
          helpRequestCount: update.helpReceived ? 1 : 0,
          status: determineStatus(update),
          timeElapsed: 0,
          isComplete: false
        }]
      }
    })
  }

  // Determine student status based on their progress
  const determineStatus = (update) => {
    if (update.questionsAttempted >= update.totalQuestions) {
      return 'completed'
    } else if (update.helpReceived) {
      return 'needs-help'
    } else if (update.attemptNumber > 2) {
      return 'struggling'
    }
    return 'active'
  }

  // Expose update function for parent component
  useEffect(() => {
    // Store the update function in a way the parent can call it
    // This will be connected via WebSocket in the parent component
    window.handleLiveProgressUpdate = handleProgressUpdate

    return () => {
      delete window.handleLiveProgressUpdate
    }
  }, [])

  // Get status color and icon
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'completed':
        return {
          color: 'text-green-600 bg-green-100',
          icon: '✓',
          label: 'Completed'
        }
      case 'needs-help':
        return {
          color: 'text-yellow-600 bg-yellow-100',
          icon: '?',
          label: 'Needs Help'
        }
      case 'struggling':
        return {
          color: 'text-red-600 bg-red-100',
          icon: '!',
          label: 'Struggling'
        }
      default:
        return {
          color: 'text-blue-600 bg-blue-100',
          icon: '→',
          label: 'Active'
        }
    }
  }

  // Format time (seconds to MM:SS)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p className="font-medium">Error loading progress</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  if (studentProgress.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <p className="text-lg font-medium">No students working on this activity yet</p>
        <p className="text-sm">Progress will appear here as students start answering questions</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-gray-900">{studentProgress.length}</div>
          <div className="text-sm text-gray-600">Total Students</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-green-600">
            {studentProgress.filter(s => s.isComplete).length}
          </div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {studentProgress.filter(s => s.status === 'needs-help').length}
          </div>
          <div className="text-sm text-gray-600">Need Help</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-blue-600">
            {Math.round(
              studentProgress.reduce((sum, s) => sum + (s.score || 0), 0) / studentProgress.length
            ) || 0}%
          </div>
          <div className="text-sm text-gray-600">Avg Score</div>
        </div>
      </div>

      {/* Student Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {studentProgress.map((student) => {
          const statusDisplay = getStatusDisplay(student.status)

          return (
            <div
              key={student.studentId}
              onClick={() => onStudentClick && onStudentClick(student)}
              className="bg-white rounded-lg border-2 border-gray-200 hover:border-primary-400 transition-all cursor-pointer p-4 space-y-3"
            >
              {/* Student Name & Status */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {student.studentName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Question {student.currentQuestion}/{student.totalQuestions}
                  </p>
                </div>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full ${statusDisplay.color} flex items-center justify-center font-bold`}>
                  {statusDisplay.icon}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      student.status === 'completed' ? 'bg-green-500' :
                      student.status === 'needs-help' ? 'bg-yellow-500' :
                      student.status === 'struggling' ? 'bg-red-500' :
                      'bg-blue-500'
                    }`}
                    style={{
                      width: `${(student.questionsAttempted / student.totalQuestions) * 100}%`
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{student.questionsAttempted} answered</span>
                  <span>{student.totalQuestions - student.questionsAttempted} remaining</span>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{student.score}%</div>
                  <div className="text-xs text-gray-600">Score</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{student.totalAttempts}</div>
                  <div className="text-xs text-gray-600">Attempts</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-bold ${student.helpRequestCount > 0 ? 'text-yellow-600' : 'text-gray-900'}`}>
                    {student.helpRequestCount}
                  </div>
                  <div className="text-xs text-gray-600">Help</div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="text-center">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusDisplay.color}`}>
                  {statusDisplay.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
