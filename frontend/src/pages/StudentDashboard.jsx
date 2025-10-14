import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudentAuthStore } from '../stores/studentAuthStore'
import { studentAuthAPI } from '../services/api'

export default function StudentDashboard() {
  const navigate = useNavigate()
  const { student, logout, isAuthenticated } = useStudentAuthStore()
  const [profileData, setProfileData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [joinCode, setJoinCode] = useState('')

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/student/auth')
      return
    }

    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const data = await studentAuthAPI.me()
      setProfileData(data)
    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinSession = () => {
    if (joinCode.trim()) {
      navigate(`/join/${joinCode.toUpperCase()}`)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/student/auth')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  const recentSessions = profileData?.recentSessions || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ClassFlow AI</h1>
            <p className="text-sm text-gray-600">Student Portal</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Welcome Card */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome back, {student?.display_name || 'Student'}! 👋
          </h2>
          <p className="text-gray-600 mt-2">
            {student?.email}
          </p>
        </div>

        {/* Join Session Card */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Join a Session</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter session code (e.g. ABC123)"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-mono uppercase"
              maxLength={6}
            />
            <button
              onClick={handleJoinSession}
              disabled={!joinCode.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Join Session
            </button>
          </div>
        </div>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Sessions</h3>
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all"
                >
                  <div>
                    <h4 className="font-semibold text-gray-900">{session.title}</h4>
                    <p className="text-sm text-gray-600">
                      {session.subject && `${session.subject} • `}
                      {session.period && `${session.period} • `}
                      Joined {new Date(session.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/join/${session.id}`)}
                    className="px-4 py-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors font-semibold"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {recentSessions.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No sessions yet
            </h3>
            <p className="text-gray-600">
              Enter a session code above to join your first class!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
