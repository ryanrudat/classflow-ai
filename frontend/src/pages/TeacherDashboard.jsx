import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { sessionsAPI } from '../services/api'
import { useSocket } from '../hooks/useSocket'
import { useNotifications } from '../components/Toast'
import SessionJoinCard from '../components/SessionJoinCard'
import ConfirmDialog from '../components/ConfirmDialog'

/**
 * Teacher Dashboard — sessions and the speaking activity.
 *
 * A session is one class period. Students join with the code, then start the
 * speaking activity. Topics for the speaking activity are managed on the
 * speaking-activity page for the session.
 */
export default function TeacherDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { notifySuccess, notifyError, notifySessionCreated } = useNotifications()
  const { joinSession, leaveSession, on, off, isConnected } = useSocket()

  const [sessions, setSessions] = useState([])
  // Preselect when returning from the speaking-activity page
  const [selectedId, setSelectedId] = useState(location.state?.selectedSessionId ?? null)
  const [students, setStudents] = useState([])
  const [onlineIds, setOnlineIds] = useState(() => new Set())
  const [showCreate, setShowCreate] = useState(false)
  const [busy, setBusy] = useState(false)
  const [createError, setCreateError] = useState('')
  const [confirm, setConfirm] = useState(null)

  const selected = sessions.find((s) => s.id === selectedId) || null

  const loadSessions = useCallback(async () => {
    try {
      const data = await sessionsAPI.getAll()
      setSessions(data.sessions || [])
      return data.sessions || []
    } catch (err) {
      notifyError('Could not load sessions')
      return []
    }
  }, [notifyError])

  useEffect(() => {
    loadSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Roster for the selected session, refreshed every 10 seconds
  useEffect(() => {
    if (!selectedId) {
      setStudents([])
      return
    }
    let cancelled = false
    const load = async () => {
      try {
        const data = await sessionsAPI.getStudents(selectedId)
        if (!cancelled) setStudents(data.students || [])
      } catch {
        // keep the last good list
      }
    }
    load()
    const timer = setInterval(load, 10000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [selectedId])

  // Presence: who is connected right now
  useEffect(() => {
    if (!selectedId || !isConnected) return
    joinSession(selectedId, 'teacher')

    const handleOnline = ({ students: list }) =>
      setOnlineIds(new Set((list || []).map((s) => s.studentId).filter(Boolean)))
    const handleJoined = ({ role, studentId }) => {
      if (role === 'student' && studentId) {
        setOnlineIds((prev) => new Set(prev).add(studentId))
      }
    }
    const handleLeft = ({ studentId }) => {
      if (!studentId) return
      setOnlineIds((prev) => {
        const next = new Set(prev)
        next.delete(studentId)
        return next
      })
    }

    on('students-online', handleOnline)
    on('user-joined', handleJoined)
    on('user-left', handleLeft)

    return () => {
      off('students-online', handleOnline)
      off('user-joined', handleJoined)
      off('user-left', handleLeft)
      leaveSession(selectedId)
      setOnlineIds(new Set())
    }
  }, [selectedId, isConnected, joinSession, leaveSession, on, off])

  async function runAction(fn, successMessage) {
    setBusy(true)
    try {
      await fn()
      await loadSessions()
      if (successMessage) notifySuccess(successMessage)
    } catch (err) {
      notifyError(err.response?.data?.message || 'That did not work. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleCreate({ title, subject }) {
    setBusy(true)
    setCreateError('')
    try {
      const data = await sessionsAPI.create({ title, subject })
      const list = await loadSessions()
      setSelectedId(data.session?.id || list[0]?.id || null)
      setShowCreate(false)
      notifySessionCreated()
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create session')
    } finally {
      setBusy(false)
    }
  }

  function handleEnd(session) {
    setConfirm({
      title: 'End session?',
      message: 'Students will no longer be able to join or continue speaking. You can reactivate it later.',
      confirmText: 'End session',
      severity: 'warning',
      onConfirm: () => {
        setConfirm(null)
        runAction(() => sessionsAPI.end(session.id), 'Session ended')
      },
      onCancel: () => setConfirm(null)
    })
  }

  const live = sessions.filter((s) => s.status !== 'ended')
  const ended = sessions.filter((s) => s.status === 'ended')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
          <p className="text-sm text-gray-600">One session per class period. Students join with the code.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          New session
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Session list */}
        <aside className="lg:col-span-1 space-y-4">
          <SessionList
            title="Live"
            sessions={live}
            selectedId={selectedId}
            onSelect={setSelectedId}
            emptyText="No live sessions. Create one to get a join code."
          />
          <SessionList
            title="Ended"
            sessions={ended}
            selectedId={selectedId}
            onSelect={setSelectedId}
            emptyText="No ended sessions yet."
          />
        </aside>

        {/* Selected session */}
        <section className="lg:col-span-2">
          {!selected ? (
            <div className="card text-center text-gray-500 py-16">
              Select a session, or create a new one.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="card">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selected.title}</h2>
                    <p className="text-sm text-gray-600">
                      {selected.subject}
                      <span className="mx-2 text-gray-300">·</span>
                      <StatusPill status={selected.status} />
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="btn-primary"
                      onClick={() => navigate(`/speaking/dashboard/${selected.id}`)}
                    >
                      Speaking activity
                    </button>
                    {selected.status === 'active' && (
                      <button
                        className="btn-secondary"
                        disabled={busy}
                        onClick={() => runAction(() => sessionsAPI.pause(selected.id), 'Session paused')}
                      >
                        Pause
                      </button>
                    )}
                    {selected.status === 'paused' && (
                      <button
                        className="btn-secondary"
                        disabled={busy}
                        onClick={() => runAction(() => sessionsAPI.resume(selected.id), 'Session resumed')}
                      >
                        Resume
                      </button>
                    )}
                    {selected.status !== 'ended' && (
                      <button className="btn-secondary" disabled={busy} onClick={() => handleEnd(selected)}>
                        End
                      </button>
                    )}
                    {selected.status === 'ended' && (
                      <button
                        className="btn-secondary"
                        disabled={busy}
                        onClick={() => runAction(() => sessionsAPI.reactivate(selected.id), 'Session reactivated')}
                      >
                        Reactivate
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {selected.status === 'active' && <SessionJoinCard session={selected} />}

              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">
                    Students <span className="text-gray-400 font-normal">({students.length})</span>
                  </h3>
                  <span className="text-xs text-gray-500">
                    {isConnected ? `${onlineIds.size} connected` : 'Reconnecting…'}
                  </span>
                </div>
                {students.length === 0 ? (
                  <p className="text-sm text-gray-500">No students have joined this period yet.</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {students.map((s) => (
                      <li key={s.id} className="py-2 flex items-center gap-3">
                        <span
                          className={`inline-block w-2.5 h-2.5 rounded-full ${onlineIds.has(s.id) ? 'bg-green-500' : 'bg-gray-300'}`}
                          aria-label={onlineIds.has(s.id) ? 'connected' : 'not connected'}
                        />
                        <span className="text-gray-900">{s.student_name}</span>
                        <span className="ml-auto text-xs text-gray-400">
                          joined {new Date(s.joined_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {showCreate && (
        <CreateSessionModal
          onClose={() => {
            setShowCreate(false)
            setCreateError('')
          }}
          onCreate={handleCreate}
          loading={busy}
          error={createError}
        />
      )}

      {confirm && <ConfirmDialog isOpen {...confirm} />}
    </div>
  )
}

function SessionList({ title, sessions, selectedId, onSelect, emptyText }) {
  return (
    <div className="card">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{title}</h3>
      {sessions.length === 0 ? (
        <p className="text-sm text-gray-500">{emptyText}</p>
      ) : (
        <ul className="space-y-1">
          {sessions.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => onSelect(s.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  s.id === selectedId ? 'bg-blue-50 text-blue-900' : 'hover:bg-gray-50 text-gray-800'
                }`}
                aria-current={s.id === selectedId ? 'true' : undefined}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{s.title}</span>
                  <StatusPill status={s.status} />
                </div>
                <div className="text-xs text-gray-500 flex gap-2">
                  <span>{s.subject}</span>
                  {s.join_code && s.status !== 'ended' && (
                    <span className="font-mono">{s.join_code}</span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function StatusPill({ status }) {
  const styles = {
    active: 'bg-green-100 text-green-800',
    paused: 'bg-amber-100 text-amber-800',
    ended: 'bg-gray-100 text-gray-600'
  }
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${styles[status] || styles.ended}`}>
      {status}
    </span>
  )
}

function CreateSessionModal({ onClose, onCreate, loading, error }) {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('History of Science')

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    onCreate({ title: title.trim(), subject: subject.trim() || 'History of Science' })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">New session</h2>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="session-title" className="block text-sm font-medium text-gray-700 mb-2">
              Session title
            </label>
            <input
              id="session-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              placeholder="e.g., Period 3 — Block 1: Flight Past"
              required
              autoFocus
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="session-subject" className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <input
              id="session-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input-field"
              disabled={loading}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Creating…' : 'Create session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
