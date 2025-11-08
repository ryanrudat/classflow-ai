import { useState, useEffect } from 'react'
import axios from 'axios'
import { useSocket } from '../hooks/useSocket'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/**
 * LivePoll Component
 * Real-time polling for students with live results
 *
 * viewMode: 'teacher' shows results in real-time
 * viewMode: 'student' shows voting interface
 */
export default function LivePoll({ activity, viewMode = 'student', sessionId, studentId, onSubmit }) {
  const content = activity.content
  const question = content.question || ''
  const options = content.options || []

  const [selectedOption, setSelectedOption] = useState(null)
  const [hasVoted, setHasVoted] = useState(false)
  const [results, setResults] = useState({})
  const [totalVotes, setTotalVotes] = useState(0)

  const { on, off, emit } = useSocket()

  // Load initial results
  useEffect(() => {
    async function loadResults() {
      try {
        const token = viewMode === 'teacher' ? localStorage.getItem('token') : localStorage.getItem('studentToken')
        const response = await axios.get(
          `${API_URL}/api/activities/${activity.id}/poll/results`,
          {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          }
        )
        setResults(response.data.results || {})
        setTotalVotes(response.data.totalVotes || 0)
      } catch (error) {
        console.error('Failed to load poll results:', error)
      }
    }
    loadResults()
  }, [activity.id, viewMode])

  // Listen for real-time poll updates
  useEffect(() => {
    if (!sessionId) return

    const handlePollUpdate = (data) => {
      if (data.activityId === activity.id) {
        setResults(data.results)
        setTotalVotes(data.totalVotes)
      }
    }

    on('poll-updated', handlePollUpdate)

    return () => {
      off('poll-updated', handlePollUpdate)
    }
  }, [sessionId, activity.id, on, off])

  const handleVote = async (optionId) => {
    setSelectedOption(optionId)
    setHasVoted(true)

    const studentToken = localStorage.getItem('studentToken')

    try {
      await axios.post(
        `${API_URL}/api/activities/${activity.id}/poll/vote`,
        { optionId, studentId },
        {
          headers: studentToken ? { 'Authorization': `Bearer ${studentToken}` } : {}
        }
      )

      // Emit vote via WebSocket for instant update
      emit('poll-vote', {
        sessionId,
        activityId: activity.id,
        optionId,
        studentId
      })

      if (onSubmit) {
        onSubmit({
          type: 'poll',
          optionId
        })
      }
    } catch (error) {
      console.error('Failed to submit vote:', error)
      setHasVoted(false)
    }
  }

  const getPercentage = (optionId) => {
    if (totalVotes === 0) return 0
    const votes = results[optionId] || 0
    return Math.round((votes / totalVotes) * 100)
  }

  const getVoteCount = (optionId) => {
    return results[optionId] || 0
  }

  // Teacher view - Real-time results
  if (viewMode === 'teacher') {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">{question}</h2>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-gray-600">Live Results</span>
          </div>
        </div>

        <div className="mb-4 text-sm text-gray-600">
          <span className="font-semibold">{totalVotes}</span> {totalVotes === 1 ? 'vote' : 'votes'} received
        </div>

        <div className="space-y-4">
          {options.map((option, index) => {
            const votes = getVoteCount(option.id)
            const percentage = getPercentage(option.id)
            const isLeading = votes > 0 && votes === Math.max(...Object.values(results))

            return (
              <div key={option.id} className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{option.text}</span>
                    {isLeading && totalVotes > 0 && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                        Leading
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    {votes} {votes === 1 ? 'vote' : 'votes'} ({percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 flex items-center justify-center text-sm font-semibold text-white ${
                      isLeading ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  >
                    {percentage > 15 && `${percentage}%`}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Student view - Voting interface
  return (
    <div className="card">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{question}</h2>
      {content.description && (
        <p className="text-gray-600 mb-6">{content.description}</p>
      )}

      {!hasVoted ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 mb-4">Select one option:</p>
          {options.map((option, index) => (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              className="w-full p-4 text-left border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full border-2 border-gray-400 flex items-center justify-center">
                  <span className="text-sm font-semibold text-gray-600">{String.fromCharCode(65 + index)}</span>
                </div>
                <span className="font-medium text-gray-900">{option.text}</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
            <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-semibold text-green-900">Vote Submitted!</p>
              <p className="text-sm text-green-700">You voted for: {options.find(o => o.id === selectedOption)?.text}</p>
            </div>
          </div>

          {/* Show live results after voting */}
          <div className="mt-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              Live Results
              <span className="flex items-center gap-1 text-xs text-green-600">
                <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                Live
              </span>
            </h3>
            <div className="space-y-3">
              {options.map((option) => {
                const percentage = getPercentage(option.id)
                const isMyVote = option.id === selectedOption

                return (
                  <div key={option.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm ${isMyVote ? 'font-semibold text-blue-900' : 'text-gray-700'}`}>
                        {option.text} {isMyVote && '(Your vote)'}
                      </span>
                      <span className="text-sm font-semibold text-gray-600">{percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isMyVote ? 'bg-blue-500' : 'bg-gray-400'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
