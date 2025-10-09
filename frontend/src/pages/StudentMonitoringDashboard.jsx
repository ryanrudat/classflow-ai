import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { presentationAPI, slidesAPI } from '../services/api'
import { useSocket } from '../hooks/useSocket'

/**
 * StudentMonitoringDashboard - Real-time monitoring of student progress through slides
 * Shows which students are on which slides, completion rates, time spent, and stuck students
 */
export default function StudentMonitoringDashboard() {
  const { deckId } = useParams()
  const navigate = useNavigate()
  const [deck, setDeck] = useState(null)
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStuck, setFilterStuck] = useState(false)
  const [sortBy, setSortBy] = useState('name') // 'name', 'progress', 'time'

  const { on, off } = useSocket()

  useEffect(() => {
    loadData()

    // Listen for real-time student updates
    const handleStudentSlideChanged = ({ studentId, slideNumber, slideId }) => {
      setStudents(prev =>
        prev.map(s =>
          s.id === studentId
            ? { ...s, currentSlide: slideNumber, currentSlideId: slideId }
            : s
        )
      )
    }

    const handleStudentSlideCompleted = ({ studentId, slideId, timeSpent }) => {
      setStudents(prev =>
        prev.map(s => {
          if (s.id !== studentId) return s

          const completedSlides = s.completedSlides || []
          if (!completedSlides.find(cs => cs.slideId === slideId)) {
            completedSlides.push({ slideId, timeSpent, completedAt: new Date() })
          }

          return { ...s, completedSlides, stuck: false }
        })
      )
    }

    on('student-slide-changed', handleStudentSlideChanged)
    on('student-slide-completed', handleStudentSlideCompleted)

    // Refresh data every 30 seconds
    const interval = setInterval(loadData, 30000)

    return () => {
      off('student-slide-changed', handleStudentSlideChanged)
      off('student-slide-completed', handleStudentSlideCompleted)
      clearInterval(interval)
    }
  }, [deckId, on, off])

  const loadData = async () => {
    try {
      const [deckData, progressData] = await Promise.all([
        slidesAPI.getDeck(deckId),
        presentationAPI.getProgress(deckId)
      ])

      setDeck(deckData)
      setStudents(progressData.students || [])
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStudentProgress = (student) => {
    const totalSlides = deck?.slides?.length || 1
    const completed = student.completedSlides?.length || 0
    return Math.round((completed / totalSlides) * 100)
  }

  const getStudentTimeSpent = (student) => {
    const totalSeconds = student.completedSlides?.reduce(
      (sum, slide) => sum + (slide.timeSpent || 0),
      0
    ) || 0
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getProgressColor = (progress) => {
    if (progress < 30) return 'bg-red-500'
    if (progress < 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getSortedStudents = () => {
    let sorted = [...students]

    if (filterStuck) {
      sorted = sorted.filter(s => s.stuck)
    }

    switch (sortBy) {
      case 'progress':
        sorted.sort((a, b) => getStudentProgress(b) - getStudentProgress(a))
        break
      case 'time':
        sorted.sort((a, b) => {
          const timeA = a.completedSlides?.reduce((sum, s) => sum + (s.timeSpent || 0), 0) || 0
          const timeB = b.completedSlides?.reduce((sum, s) => sum + (s.timeSpent || 0), 0) || 0
          return timeB - timeA
        })
        break
      default:
        sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    }

    return sorted
  }

  const getSlideDistribution = () => {
    const distribution = {}
    deck?.slides?.forEach((slide, index) => {
      const slideNum = index + 1
      const count = students.filter(s => s.currentSlide === slideNum).length
      distribution[slideNum] = count
    })
    return distribution
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const sortedStudents = getSortedStudents()
  const slideDistribution = getSlideDistribution()
  const stuckCount = students.filter(s => s.stuck).length
  const averageProgress = students.length > 0
    ? Math.round(students.reduce((sum, s) => sum + getStudentProgress(s), 0) / students.length)
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{deck?.title}</h1>
              <p className="text-gray-600 mt-1">Student Progress Monitoring</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/present/${deckId}`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Presentation
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats overview */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-blue-600">{students.length}</div>
            <div className="text-sm text-gray-600 mt-1">Total Students</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-green-600">{averageProgress}%</div>
            <div className="text-sm text-gray-600 mt-1">Average Progress</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-red-600">{stuckCount}</div>
            <div className="text-sm text-gray-600 mt-1">Students Stuck</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-purple-600">{deck?.slides?.length}</div>
            <div className="text-sm text-gray-600 mt-1">Total Slides</div>
          </div>
        </div>

        {/* Slide distribution chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Slide Distribution</h2>
          <div className="flex items-end gap-2 h-32">
            {Object.entries(slideDistribution).map(([slideNum, count]) => {
              const maxCount = Math.max(...Object.values(slideDistribution), 1)
              const height = (count / maxCount) * 100
              return (
                <div key={slideNum} className="flex-1 flex flex-col items-center">
                  <div className="text-xs font-medium text-gray-700 mb-1">{count}</div>
                  <div
                    className="w-full bg-blue-500 rounded-t transition-all"
                    style={{ height: `${height}%` }}
                  />
                  <div className="text-xs text-gray-600 mt-2">{slideNum}</div>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-gray-500 mt-4 text-center">
            Number of students currently on each slide
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filterStuck}
                onChange={(e) => setFilterStuck(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">Show only stuck students</span>
            </label>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="name">Name</option>
                <option value="progress">Progress</option>
                <option value="time">Time Spent</option>
              </select>
            </div>
          </div>

          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Student list */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Slide</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time Spent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedStudents.map((student) => {
                const progress = getStudentProgress(student)
                return (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{student.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-700">
                        Slide {student.currentSlide || 1} / {deck?.slides?.length}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${getProgressColor(progress)}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="text-sm font-medium text-gray-700 w-12">
                          {progress}%
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-700">{getStudentTimeSpent(student)}</div>
                    </td>
                    <td className="px-6 py-4">
                      {student.stuck ? (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                          ⚠️ Stuck
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                          ✓ On Track
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}

              {sortedStudents.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    {filterStuck ? 'No stuck students' : 'No students connected yet'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
