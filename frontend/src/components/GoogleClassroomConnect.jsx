import { useState, useEffect } from 'react'
import { googleClassroomAPI } from '../services/api'

/**
 * GoogleClassroomConnect Component
 *
 * Allows teachers to:
 * - Connect their Google Classroom account
 * - Import class rosters
 * - Share activities to Google Classroom
 * - Sync grades
 */
export default function GoogleClassroomConnect({ sessionId, onRosterImported }) {
  const [connected, setConnected] = useState(false)
  const [googleEmail, setGoogleEmail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [error, setError] = useState(null)

  // Check connection status on mount
  useEffect(() => {
    checkConnection()
  }, [])

  // Check for OAuth callback success/error
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('google_connected') === 'true') {
      setConnected(true)
      checkConnection()
      // Remove query params
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (params.get('google_error')) {
      setError('Failed to connect to Google Classroom. Please try again.')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  async function checkConnection() {
    try {
      setLoading(true)
      const status = await googleClassroomAPI.getStatus()
      setConnected(status.connected)
      setGoogleEmail(status.googleEmail)

      if (status.connected) {
        await loadCourses()
      }
    } catch (err) {
      console.error('Error checking Google Classroom connection:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleConnect() {
    try {
      setLoading(true)
      setError(null)
      const { authUrl } = await googleClassroomAPI.getAuthUrl()
      // Redirect to Google OAuth
      window.location.href = authUrl
    } catch (err) {
      console.error('Error initiating Google auth:', err)
      setError('Failed to connect to Google Classroom')
      setLoading(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('Are you sure you want to disconnect Google Classroom?')) {
      return
    }

    try {
      setLoading(true)
      await googleClassroomAPI.disconnect()
      setConnected(false)
      setGoogleEmail(null)
      setCourses([])
      setSelectedCourse(null)
    } catch (err) {
      console.error('Error disconnecting Google Classroom:', err)
      setError('Failed to disconnect Google Classroom')
    } finally {
      setLoading(false)
    }
  }

  async function loadCourses() {
    try {
      const { courses: classList } = await googleClassroomAPI.getCourses()
      setCourses(classList || [])
    } catch (err) {
      console.error('Error loading courses:', err)
      setError('Failed to load Google Classroom courses')
    }
  }

  async function handleImportRoster() {
    if (!selectedCourse || !sessionId) {
      setError('Please select a course')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const result = await googleClassroomAPI.importRoster(selectedCourse, sessionId)
      alert(result.message)

      if (onRosterImported) {
        onRosterImported(result.students)
      }
    } catch (err) {
      console.error('Error importing roster:', err)
      setError(err.response?.data?.message || 'Failed to import roster')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !connected) {
    return (
      <div className="card">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-600 border-t-transparent" />
          <span className="text-gray-600">Checking Google Classroom connection...</span>
        </div>
      </div>
    )
  }

  if (!connected) {
    return (
      <div className="card">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <svg className="w-12 h-12 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23,2H1A1,1 0 0,0 0,3V17A1,1 0 0,0 1,18H9V20H7V22H17V20H15V18H23A1,1 0 0,0 24,17V3A1,1 0 0,0 23,2M22,16H2V4H22V16M12.63,7.46L10.7,11.96L10.67,12L10.7,12.04L12.63,16.54L11.31,17.13L7.89,10L11.31,2.87L12.63,7.46M16.11,10L12.69,17.13L11.37,16.54L13.3,12.04L13.33,12L13.3,11.96L11.37,7.46L12.69,2.87L16.11,10Z" />
            </svg>
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Connect Google Classroom
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Import rosters, share activities, and sync grades automatically
            </p>

            {error && (
              <div className="bg-red-50 text-red-600 p-2 rounded text-sm mb-3">
                {error}
              </div>
            )}

            <button
              onClick={handleConnect}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56,12.25C22.56,11.47 22.49,10.72 22.37,10H12V14.26H17.92C17.66,15.63 16.88,16.79 15.71,17.57V20.33H19.28C21.36,18.42 22.56,15.6 22.56,12.25Z" />
                <path d="M12,23C14.97,23 17.46,22.02 19.28,20.33L15.71,17.57C14.73,18.22 13.48,18.62 12,18.62C9.13,18.62 6.71,16.7 5.84,14.09H2.18V16.95C3.99,20.52 7.7,23 12,23Z" />
                <path d="M5.84,14.09C5.62,13.44 5.5,12.74 5.5,12C5.5,11.26 5.62,10.56 5.84,9.91V7.05H2.18C1.43,8.55 1,10.22 1,12C1,13.78 1.43,15.45 2.18,16.95L5.84,14.09Z" />
                <path d="M12,5.38C13.62,5.38 15.06,5.94 16.21,7.03L19.36,3.88C17.45,2.09 14.97,1 12,1C7.7,1 3.99,3.48 2.18,7.05L5.84,9.91C6.71,7.3 9.13,5.38 12,5.38Z" />
              </svg>
              Connect with Google
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Google Classroom Connected</h3>
            <p className="text-sm text-gray-600">{googleEmail}</p>
          </div>
        </div>

        <button
          onClick={handleDisconnect}
          disabled={loading}
          className="text-sm text-red-600 hover:text-red-700 font-medium"
        >
          Disconnect
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {sessionId && (
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">Import Roster</h4>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Course
              </label>
              <select
                value={selectedCourse || ''}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="input-field"
                disabled={loading}
              >
                <option value="">-- Choose a course --</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleImportRoster}
              disabled={!selectedCourse || loading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? 'Importing...' : 'Import Students from Google Classroom'}
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-2">
            Students will be automatically added to this session
          </p>
        </div>
      )}
    </div>
  )
}
