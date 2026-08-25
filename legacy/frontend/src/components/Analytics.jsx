import { useState, useEffect } from 'react'
import { analyticsAPI } from '../services/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = {
  advanced: '#10b981',
  'on-track': '#3b82f6',
  struggling: '#ef4444',
  'limited-data': '#f59e0b',
  'no-data': '#9ca3af'
}

const PERFORMANCE_LABELS = {
  advanced: 'Advanced',
  'on-track': 'On Track',
  struggling: 'Struggling',
  'limited-data': 'Limited Data',
  'no-data': 'No Data'
}

export default function Analytics({ sessionId }) {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [studentDetails, setStudentDetails] = useState(null)

  useEffect(() => {
    if (!sessionId) return
    loadAnalytics()
  }, [sessionId])

  async function loadAnalytics() {
    try {
      setLoading(true)
      setError('')
      const data = await analyticsAPI.getSessionAnalytics(sessionId)
      setAnalytics(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  async function loadStudentDetails(studentId) {
    try {
      const data = await analyticsAPI.getStudentAnalytics(studentId)
      setStudentDetails(data)
      setSelectedStudent(studentId)
    } catch (err) {
      setError('Failed to load student details')
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="text-center py-8 text-gray-500">Loading analytics...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <div className="text-red-600 text-center py-4">{error}</div>
      </div>
    )
  }

  if (!analytics || analytics.students.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-8 text-gray-500">
          No student data yet. Students need to complete activities first.
        </div>
      </div>
    )
  }

  const { students, summary } = analytics

  // Prepare data for performance distribution chart
  const performanceDistribution = [
    { name: 'Advanced', value: students.filter(s => s.performanceLevel === 'advanced').length, color: COLORS.advanced },
    { name: 'On Track', value: students.filter(s => s.performanceLevel === 'on-track').length, color: COLORS['on-track'] },
    { name: 'Struggling', value: students.filter(s => s.performanceLevel === 'struggling').length, color: COLORS.struggling },
    { name: 'Limited Data', value: students.filter(s => s.performanceLevel === 'limited-data').length, color: COLORS['limited-data'] },
    { name: 'No Data', value: students.filter(s => s.performanceLevel === 'no-data').length, color: COLORS['no-data'] }
  ].filter(item => item.value > 0)

  // Prepare data for student scores chart
  const studentScoresData = students
    .filter(s => s.correctnessRate !== null)
    .map(s => ({
      name: s.name.length > 15 ? s.name.substring(0, 12) + '...' : s.name,
      score: s.correctnessRate
    }))

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-blue-50 border-blue-200">
          <div className="text-sm text-blue-600 font-medium">Total Students</div>
          <div className="text-3xl font-bold text-blue-900">{summary.totalStudents}</div>
        </div>

        <div className="card bg-green-50 border-green-200">
          <div className="text-sm text-green-600 font-medium">Active Students</div>
          <div className="text-3xl font-bold text-green-900">{summary.activeStudents}</div>
        </div>

        <div className="card bg-purple-50 border-purple-200">
          <div className="text-sm text-purple-600 font-medium">Avg Correctness</div>
          <div className="text-3xl font-bold text-purple-900">{summary.avgCorrectness}%</div>
        </div>

        <div className="card bg-red-50 border-red-200">
          <div className="text-sm text-red-600 font-medium">Need Support</div>
          <div className="text-3xl font-bold text-red-900">{summary.strugglingCount}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Distribution */}
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Performance Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={performanceDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {performanceDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Student Scores */}
        {studentScoresData.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Student Scores</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={studentScoresData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="score" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Student Performance Cards */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Individual Student Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map(student => (
            <div
              key={student.id}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedStudent === student.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => loadStudentDetails(student.id)}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">{student.name}</h4>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full`}
                  style={{
                    backgroundColor: `${COLORS[student.performanceLevel]}20`,
                    color: COLORS[student.performanceLevel]
                  }}
                >
                  {PERFORMANCE_LABELS[student.performanceLevel]}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Activities:</span>
                  <span className="font-medium">{student.activitiesCompleted}</span>
                </div>

                {student.correctnessRate !== null && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Correctness:</span>
                    <span className="font-medium">{student.correctnessRate}%</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600">Responses:</span>
                  <span className="font-medium">
                    {student.correctResponses}/{student.totalResponses}
                  </span>
                </div>

                {student.avgTimeSpent !== null && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Time:</span>
                    <span className="font-medium">{student.avgTimeSpent}s</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Student Details Modal */}
      {selectedStudent && studentDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {studentDetails.student.name} - Detailed Analytics
                </h2>
                <button
                  onClick={() => {
                    setSelectedStudent(null)
                    setStudentDetails(null)
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="card bg-blue-50">
                  <div className="text-sm text-blue-600">Total Responses</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {studentDetails.stats.totalResponses}
                  </div>
                </div>

                <div className="card bg-green-50">
                  <div className="text-sm text-green-600">Correct</div>
                  <div className="text-2xl font-bold text-green-900">
                    {studentDetails.stats.correctResponses}
                  </div>
                </div>

                <div className="card bg-red-50">
                  <div className="text-sm text-red-600">Incorrect</div>
                  <div className="text-2xl font-bold text-red-900">
                    {studentDetails.stats.incorrectResponses}
                  </div>
                </div>

                <div className="card bg-purple-50">
                  <div className="text-sm text-purple-600">Accuracy</div>
                  <div className="text-2xl font-bold text-purple-900">
                    {studentDetails.stats.correctnessRate}%
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Performance by Type</h3>
                <div className="space-y-2">
                  {Object.entries(studentDetails.byType).map(([type, stats]) => (
                    <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium capitalize">{type}</span>
                      <span className="text-sm text-gray-600">
                        {stats.correct}/{stats.total} correct ({Math.round((stats.correct / stats.total) * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Recent Activity</h3>
                <div className="space-y-2">
                  {studentDetails.recentActivity.map((activity, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium capitalize">{activity.type}</span>
                        <span className="text-sm text-gray-500 ml-2">({activity.difficulty})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {activity.isCorrect !== null && (
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${
                              activity.isCorrect
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {activity.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                          </span>
                        )}
                        {activity.timeSpent && (
                          <span className="text-sm text-gray-600">{activity.timeSpent}s</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
