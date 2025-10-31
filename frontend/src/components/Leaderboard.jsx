import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { useSocket } from '../hooks/useSocket'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/**
 * Leaderboard Component
 * Displays real-time student rankings across all activities
 * Teacher view: Can toggle name visibility
 * Student view: Highlights own position
 */
export default function Leaderboard({
  sessionId,
  instanceId,
  viewMode = 'teacher', // 'teacher' or 'student'
  currentStudentId = null,
  showHeader = true,
  maxEntries = 10
}) {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showNames, setShowNames] = useState(true)
  const [previousRanks, setPreviousRanks] = useState({})

  const { on, off, isConnected } = useSocket()
  const token = localStorage.getItem('token')

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const endpoint = viewMode === 'teacher'
        ? `${API_URL}/api/sessions/${sessionId}/instances/${instanceId}/leaderboard`
        : `${API_URL}/api/sessions/${sessionId}/instances/${instanceId}/my-score`

      const response = await axios.get(endpoint, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })

      const data = viewMode === 'teacher'
        ? response.data.leaderboard
        : response.data.leaderboard // Student endpoint also returns full leaderboard

      // Store previous ranks for animation
      const newPreviousRanks = {}
      leaderboard.forEach(entry => {
        newPreviousRanks[entry.student_id] = entry.rank
      })
      setPreviousRanks(newPreviousRanks)

      setLeaderboard(data || [])
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err)
      setError('Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }, [sessionId, instanceId, viewMode, token])

  // Initial load
  useEffect(() => {
    if (sessionId && instanceId) {
      fetchLeaderboard()
    }
  }, [sessionId, instanceId, fetchLeaderboard])

  // Real-time updates via WebSocket
  useEffect(() => {
    if (!isConnected || !sessionId || !instanceId) return

    const handleLeaderboardUpdate = (data) => {
      console.log('📊 Leaderboard updated:', data)

      // If specific student updated, refresh full leaderboard
      if (data.sessionInstanceId === instanceId) {
        fetchLeaderboard()
      }
    }

    const handleStudentResponded = (data) => {
      console.log('📝 Student responded, refreshing leaderboard')
      // Debounce: Wait a bit for score to be calculated
      setTimeout(() => {
        fetchLeaderboard()
      }, 500)
    }

    // Listen for events
    on('leaderboard-updated', handleLeaderboardUpdate)
    on('student-responded', handleStudentResponded)

    return () => {
      off('leaderboard-updated', handleLeaderboardUpdate)
      off('student-responded', handleStudentResponded)
    }
  }, [isConnected, sessionId, instanceId, on, off, fetchLeaderboard])

  // Determine rank change for animation
  const getRankChange = (studentId, currentRank) => {
    const previousRank = previousRanks[studentId]
    if (previousRank === undefined) return null
    if (previousRank > currentRank) return 'up'
    if (previousRank < currentRank) return 'down'
    return null
  }

  // Get medal emoji for top 3
  const getMedal = (rank) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return null
  }

  // Get rank display color
  const getRankColor = (rank) => {
    if (rank === 1) return 'text-yellow-600'
    if (rank === 2) return 'text-gray-500'
    if (rank === 3) return 'text-amber-700'
    return 'text-gray-400'
  }

  if (loading && leaderboard.length === 0) {
    return (
      <div className="card">
        {showHeader && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">Leaderboard</h3>
          </div>
        )}
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        {showHeader && (
          <h3 className="text-xl font-bold text-gray-900 mb-4">Leaderboard</h3>
        )}
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchLeaderboard}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (leaderboard.length === 0) {
    return (
      <div className="card">
        {showHeader && (
          <h3 className="text-xl font-bold text-gray-900 mb-4">Leaderboard</h3>
        )}
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-gray-500">No scores yet</p>
          <p className="text-sm text-gray-400 mt-1">Students will appear here as they complete activities</p>
        </div>
      </div>
    )
  }

  const displayedLeaderboard = leaderboard.slice(0, maxEntries)

  return (
    <div className="card">
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-gray-900">Leaderboard</h3>
            {isConnected && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                Live
              </span>
            )}
          </div>
          {viewMode === 'teacher' && (
            <button
              onClick={() => setShowNames(!showNames)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              {showNames ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Hide Names
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                  Show Names
                </>
              )}
            </button>
          )}
        </div>
      )}

      <div className="space-y-2">
        {displayedLeaderboard.map((entry, index) => {
          const isCurrentStudent = viewMode === 'student' && entry.student_id === currentStudentId
          const rankChange = getRankChange(entry.student_id, entry.rank)
          const medal = getMedal(entry.rank)
          const rankColorClass = getRankColor(entry.rank)

          return (
            <div
              key={entry.student_id}
              className={`
                flex items-center gap-3 p-4 rounded-lg border-2 transition-all duration-300
                ${isCurrentStudent
                  ? 'bg-blue-50 border-blue-300 shadow-md'
                  : 'bg-white border-gray-200 hover:border-gray-300'
                }
                ${rankChange === 'up' ? 'animate-bounce-once' : ''}
              `}
            >
              {/* Rank with medal */}
              <div className="flex-shrink-0 w-12 text-center">
                {medal ? (
                  <span className="text-3xl">{medal}</span>
                ) : (
                  <span className={`text-2xl font-bold ${rankColorClass}`}>
                    #{entry.rank}
                  </span>
                )}
              </div>

              {/* Rank change indicator */}
              <div className="flex-shrink-0 w-6">
                {rankChange === 'up' && (
                  <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {rankChange === 'down' && (
                  <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>

              {/* Student name/number */}
              <div className="flex-1 min-w-0">
                <p className={`font-semibold truncate ${isCurrentStudent ? 'text-blue-900' : 'text-gray-900'}`}>
                  {showNames ? entry.student_name : `Student #${index + 1}`}
                  {isCurrentStudent && <span className="ml-2 text-blue-600">(You)</span>}
                </p>
                <p className="text-sm text-gray-500">
                  {entry.activities_completed || 0} {entry.activities_completed === 1 ? 'activity' : 'activities'}
                </p>
              </div>

              {/* Score */}
              <div className="flex-shrink-0 text-right">
                <p className={`text-2xl font-bold ${isCurrentStudent ? 'text-blue-600' : 'text-gray-900'}`}>
                  {Math.round(entry.average_score || 0)}%
                </p>
                <p className="text-xs text-gray-500">
                  {Math.round(entry.total_score || 0)} pts
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Show "and X more" if there are more entries */}
      {leaderboard.length > maxEntries && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            and {leaderboard.length - maxEntries} more {leaderboard.length - maxEntries === 1 ? 'student' : 'students'}
          </p>
        </div>
      )}

      {/* Current student's position if not in top entries */}
      {viewMode === 'student' && currentStudentId && (
        <>
          {leaderboard.length > maxEntries && !displayedLeaderboard.find(e => e.student_id === currentStudentId) && (
            <>
              {(() => {
                const myEntry = leaderboard.find(e => e.student_id === currentStudentId)
                if (!myEntry) return null

                return (
                  <>
                    <div className="my-4 border-t border-gray-300"></div>
                    <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-12 text-center">
                          <span className="text-2xl font-bold text-blue-600">
                            #{myEntry.rank}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-blue-900">
                            {myEntry.student_name} <span className="text-blue-600">(You)</span>
                          </p>
                          <p className="text-sm text-gray-500">
                            {myEntry.activities_completed || 0} {myEntry.activities_completed === 1 ? 'activity' : 'activities'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">
                            {Math.round(myEntry.average_score || 0)}%
                          </p>
                          <p className="text-xs text-gray-500">
                            {Math.round(myEntry.total_score || 0)} pts
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )
              })()}
            </>
          )}
        </>
      )}
    </div>
  )
}
