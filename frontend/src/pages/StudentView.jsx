import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { sessionsAPI } from '../services/api'
import { useSocket } from '../hooks/useSocket'

const STORAGE_KEY = 'student_session'

function readStoredSession() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null')
  } catch {
    return null
  }
}

function detectDevice() {
  const ua = navigator.userAgent || ''
  if (/iPad|Tablet/i.test(ua)) return 'tablet'
  if (/Mobi|Android|iPhone/i.test(ua)) return 'mobile'
  if (/CrOS/i.test(ua)) return 'chromebook'
  return 'laptop'
}

/**
 * Student join page.
 * Join with a class code and a name, then start the speaking activity.
 * The join is kept in sessionStorage for this tab so a refresh does not
 * lose the student's place.
 */
export default function StudentView() {
  const { joinCode } = useParams()
  const navigate = useNavigate()
  const { joinSession, leaveSession } = useSocket()

  const [stored] = useState(readStoredSession)
  const [session, setSession] = useState(stored?.session || null)
  const [student, setStudent] = useState(stored?.student || null)
  const [code, setCode] = useState(joinCode || '')
  const [studentName, setStudentName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleJoin(e) {
    e.preventDefault()
    if (!code.trim() || !studentName.trim()) {
      setError('Enter the class code and your name.')
      return
    }
    try {
      setLoading(true)
      setError('')
      const data = await sessionsAPI.join(code.trim().toUpperCase(), studentName.trim(), detectDevice())
      setSession(data.session)
      setStudent(data.student)
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ session: data.session, student: data.student }))
    } catch (err) {
      setError(err.response?.data?.message || 'Could not join. Check the code and try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleLeave() {
    if (session) leaveSession(session.id)
    sessionStorage.removeItem(STORAGE_KEY)
    setSession(null)
    setStudent(null)
  }

  // Presence for the teacher's dashboard
  useEffect(() => {
    if (!session || !student) return
    joinSession(session.id, 'student', student.id, student.student_name)
    return () => leaveSession(session.id)
  }, [session, student, joinSession, leaveSession])

  if (session && student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="card w-full max-w-md text-center">
          <p className="text-sm text-gray-500 mb-1">You're in</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{session.title}</h1>
          <p className="text-gray-600 mb-6">Hi, {student.student_name}</p>

          <button
            onClick={() =>
              navigate(`/speak/${session.id}`, {
                state: { studentId: student.id, studentName: student.student_name }
              })
            }
            className="w-full px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            Start speaking activity
          </button>
          <p className="text-xs text-gray-500 mt-3">Explain what you learned today. Your teacher can see you have joined.</p>

          <button
            onClick={handleLeave}
            className="mt-6 text-sm text-gray-500 hover:text-gray-700 underline focus:outline-none focus:ring-2 focus:ring-gray-400 rounded"
          >
            Leave session
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">Join your class</h1>
        <p className="text-sm text-gray-600 mb-6 text-center">Enter the code your teacher shows you.</p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label htmlFor="join-code" className="block text-sm font-medium text-gray-700 mb-2">
              Class code
            </label>
            <input
              id="join-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="input-field text-center text-2xl font-mono tracking-widest uppercase"
              placeholder="ABC123"
              maxLength={8}
              autoComplete="off"
              autoCapitalize="characters"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="student-name" className="block text-sm font-medium text-gray-700 mb-2">
              Your name
            </label>
            <input
              id="student-name"
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="input-field"
              placeholder="First name"
              autoComplete="given-name"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn-primary w-full py-3 text-lg" disabled={loading}>
            {loading ? 'Joining…' : 'Join'}
          </button>
        </form>
      </div>
    </div>
  )
}
