import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { sessionsAPI, speakingAPI } from '../services/api'
import { useToast } from '../components/Toast'
import ConfirmDialog from '../components/ConfirmDialog'

/**
 * Teacher speaking dashboard for one session.
 *
 * Shows which pack the session uses, who has joined, where each student is in
 * the speaking activity, and a review panel with the notebook and every turn.
 * The server owns all state (see docs/SPEAKING_PACKS.md); this page only reads
 * it, assigns a pack, and can end an attempt.
 *
 * Nothing here is a grade. There are no scores, rankings, or percentages.
 */

const POLL_MS = 5000

const STATE_LABELS = {
  NOT_STARTED: 'Not started',
  PLAN: 'Planning',
  FIRST_TEACH: 'Explaining',
  PROBE: 'Answering a question',
  REPAIR: 'Repairing',
  RETEACH: 'Re-teaching',
  DONE: 'Done'
}

const STATE_STYLES = {
  NOT_STARTED: 'bg-gray-100 text-gray-500',
  PLAN: 'bg-gray-100 text-gray-700',
  FIRST_TEACH: 'bg-blue-100 text-blue-800',
  PROBE: 'bg-indigo-100 text-indigo-800',
  REPAIR: 'bg-amber-100 text-amber-800',
  RETEACH: 'bg-purple-100 text-purple-800',
  DONE: 'bg-green-100 text-green-800'
}

const CLOSURE_LABELS = {
  completed: 'Finished all the steps',
  max_turns: 'Reached the turn limit',
  student_end: 'The student ended it',
  teacher_end: 'You ended it',
  session_ended: 'The session ended'
}

const REPAIR_TRIGGER_LABELS = {
  overclaim: 'when the student overclaims',
  missing_link: 'when an idea has no evidence'
}

const NOTEBOOK_KEYS = ['claim', 'because', 'notProved', 'nextEvidence']
const DEFAULT_NOTEBOOK_LABELS = {
  claim: 'I think',
  because: 'Because (evidence)',
  notProved: 'Not proved',
  nextEvidence: 'Next evidence'
}

function isPausedError(err) {
  return err?.response?.status === 423
}

function messageFrom(err, fallback) {
  return err?.response?.data?.message || fallback
}

function formatTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function SpeakingDashboard() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  // useToast returns a fresh object each render; keep a stable handle for effects
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [session, setSession] = useState(null)

  const [pack, setPack] = useState(null)
  const [packLoaded, setPackLoaded] = useState(false)
  const [packError, setPackError] = useState(false)

  const [packs, setPacks] = useState(null) // null until loaded
  const [packsError, setPacksError] = useState(false)
  const [selectedPackId, setSelectedPackId] = useState('')
  const [changingPack, setChangingPack] = useState(false)

  const [attempts, setAttempts] = useState([])
  const [attemptsLoaded, setAttemptsLoaded] = useState(false)
  const [students, setStudents] = useState([])
  const [pollOk, setPollOk] = useState(true)

  const [paused, setPaused] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)

  const [reviewRow, setReviewRow] = useState(null) // { attemptId, studentName }
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)

  const retryEverything = useCallback(() => {
    setPaused(false)
    setRefreshTick((t) => t + 1)
  }, [])

  // Session title and status
  useEffect(() => {
    let cancelled = false
    sessionsAPI
      .get(sessionId)
      .then((data) => {
        if (!cancelled) setSession(data.session || null)
      })
      .catch((err) => {
        if (cancelled) return
        if (isPausedError(err)) {
          setPaused(true)
          return
        }
        toastRef.current.error('Could not load the session', messageFrom(err, 'Could not load the session.'))
      })
    return () => {
      cancelled = true
    }
  }, [sessionId, refreshTick])

  // The pack this session uses (full pack — teacher endpoint)
  const loadPack = useCallback(async () => {
    setPackError(false)
    try {
      const data = await speakingAPI.getSessionPack(sessionId)
      setPack(data.pack || null)
      setPackLoaded(true)
    } catch (err) {
      if (isPausedError(err)) {
        setPaused(true)
        return
      }
      setPackError(true)
      toastRef.current.error('Could not load the pack', messageFrom(err, 'Could not load the pack. Try again.'))
    }
  }, [sessionId])

  useEffect(() => {
    loadPack()
  }, [loadPack, refreshTick])

  // All packs, for the picker
  const loadPacks = useCallback(async () => {
    setPacksError(false)
    try {
      const data = await speakingAPI.listPacks()
      const list = data.packs || []
      setPacks(list)
      setSelectedPackId((current) => current || list[0]?.id || '')
    } catch (err) {
      if (isPausedError(err)) {
        setPaused(true)
        return
      }
      setPacksError(true)
      toastRef.current.error('Could not load the pack list', messageFrom(err, 'Could not load the pack list. Try again.'))
    }
  }, [])

  useEffect(() => {
    loadPacks()
  }, [loadPacks, refreshTick])

  // Live roster + attempts, every 5 seconds. Transient failures are ignored;
  // a 423 means the session is paused or ended.
  useEffect(() => {
    if (paused) return
    let cancelled = false

    const poll = async () => {
      const [a, s] = await Promise.allSettled([
        speakingAPI.listAttempts(sessionId),
        sessionsAPI.getStudents(sessionId)
      ])
      if (cancelled) return
      if (a.status === 'fulfilled') {
        setAttempts(a.value.attempts || [])
        setAttemptsLoaded(true)
      }
      if (s.status === 'fulfilled') {
        setStudents(s.value.students || [])
      }
      const failures = [a, s].filter((r) => r.status === 'rejected').map((r) => r.reason)
      if (failures.some(isPausedError)) {
        setPaused(true)
        return
      }
      setPollOk(failures.length === 0)
    }

    poll()
    const timer = setInterval(poll, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [sessionId, paused, refreshTick])

  // Every joined student appears, even with no attempt yet
  const rows = useMemo(() => {
    const byStudent = new Map(attempts.map((a) => [String(a.studentId), a]))
    const list = students.map((s) => ({
      key: `s-${s.id}`,
      studentName: s.student_name || 'Student',
      attempt: byStudent.get(String(s.id)) || null
    }))
    const known = new Set(students.map((s) => String(s.id)))
    for (const a of attempts) {
      if (!known.has(String(a.studentId))) {
        list.push({ key: `a-${a.id}`, studentName: a.studentName || 'Student', attempt: a })
      }
    }
    return list.sort((x, y) => x.studentName.localeCompare(y.studentName, undefined, { sensitivity: 'base' }))
  }, [students, attempts])

  const conceptMap = useMemo(() => {
    const map = {}
    for (const c of pack?.concepts || []) map[c.id] = c.label
    return map
  }, [pack])

  const notebookLabels = pack?.student?.notebookLabels || DEFAULT_NOTEBOOK_LABELS

  const hasAttempts = attempts.length > 0
  const startedCount = attempts.length
  const doneCount = attempts.filter((a) => a.state === 'DONE').length
  const reviewCount = attempts.filter((a) => a.needsTeacherReview).length

  function goBack() {
    navigate('/dashboard', { state: { selectedSessionId: sessionId } })
  }

  async function assignPack(packId) {
    setBusy(true)
    try {
      const data = await speakingAPI.assignPack(sessionId, packId)
      if (packId) {
        setPack(data.pack || null)
        toast.success('Pack set', 'Students get this pack when they start.')
      } else {
        setPack(null)
        toast.success('Pack removed', 'This session has no pack now.')
      }
      setChangingPack(false)
      // Re-read so the card always shows the full teacher pack
      loadPack()
    } catch (err) {
      if (isPausedError(err)) {
        setPaused(true)
        return
      }
      toast.error('Could not change the pack', messageFrom(err, 'Could not change the pack. Try again.'))
    } finally {
      setBusy(false)
    }
  }

  function handleRemovePack() {
    setConfirm({
      title: 'Remove this pack?',
      message: 'Students will not be able to start the speaking activity until you choose a pack.',
      confirmText: 'Remove pack',
      cancelText: 'Keep it',
      severity: 'warning',
      onConfirm: () => {
        setConfirm(null)
        assignPack(null)
      },
      onCancel: () => setConfirm(null)
    })
  }

  // Merge an attempt returned by the server into the live list
  const mergeAttempt = useCallback((attempt) => {
    if (!attempt?.id) return
    setAttempts((prev) => {
      const idx = prev.findIndex((a) => a.id === attempt.id)
      if (idx === -1) return prev
      const next = prev.slice()
      next[idx] = { ...prev[idx], ...attempt }
      return next
    })
  }, [])

  const reviewListEntry = reviewRow ? attempts.find((a) => a.id === reviewRow.attemptId) : null

  // Stable handlers for the review panel so its effects do not re-run every render
  const closeReview = useCallback(() => setReviewRow(null), [])
  const markPaused = useCallback(() => setPaused(true), [])

  if (paused) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="card w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Session paused</h1>
          <p className="text-gray-600 mb-2">
            The speaking activity is on hold, so this page cannot update right now. Nothing here is lost.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Students see: &ldquo;Your teacher has paused the session.&rdquo; Resume the session from the sessions page,
            then try again.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button className="btn-primary flex-1" onClick={retryEverything}>
              Try again
            </button>
            <button className="btn-secondary flex-1" onClick={goBack}>
              Back to sessions
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Speaking activity</h1>
          <p className="text-sm text-gray-600 flex items-center gap-2 flex-wrap">
            <span>{session?.title || 'Loading session…'}</span>
            {session?.status && <SessionStatusPill status={session.status} />}
            {session?.join_code && session.status !== 'ended' && (
              <span className="font-mono text-xs text-gray-500">code {session.join_code}</span>
            )}
          </p>
        </div>
        <button className="btn-secondary" onClick={goBack}>
          Back to sessions
        </button>
      </div>

      <div className="space-y-6">
        {/* Pack card */}
        <div className="card">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
            <h2 className="font-semibold text-gray-900">Pack</h2>
            {pack && !changingPack && (
              <div className="flex flex-col items-end gap-1">
                <button
                  className="btn-secondary"
                  disabled={busy || !attemptsLoaded || hasAttempts}
                  onClick={() => {
                    setSelectedPackId(pack.id)
                    setChangingPack(true)
                  }}
                >
                  Change pack
                </button>
                {attemptsLoaded && hasAttempts && (
                  <span className="text-xs text-gray-500 text-right max-w-xs">
                    Locked: {startedCount} {startedCount === 1 ? 'student has' : 'students have'} already started
                    with this pack. Each attempt records the pack it used, so the pack cannot change now.
                  </span>
                )}
                {!attemptsLoaded && <span className="text-xs text-gray-400">Checking for attempts…</span>}
              </div>
            )}
          </div>

          {packError ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-red-700">Could not load the pack for this session.</p>
              <button className="btn-secondary" onClick={loadPack}>
                Try again
              </button>
            </div>
          ) : !packLoaded ? (
            <p className="text-sm text-gray-500">Loading pack…</p>
          ) : !pack || changingPack ? (
            <PackPicker
              packs={packs}
              packsError={packsError}
              onRetry={loadPacks}
              selectedPackId={selectedPackId}
              onSelect={setSelectedPackId}
              currentPackId={pack?.id || null}
              busy={busy}
              onUse={() => selectedPackId && assignPack(selectedPackId)}
              onRemove={pack ? handleRemovePack : null}
              onCancel={pack ? () => setChangingPack(false) : null}
            />
          ) : (
            <PackSummary pack={pack} conceptMap={conceptMap} />
          )}
        </div>

        {/* Live table */}
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="font-semibold text-gray-900">
              Students <span className="text-gray-400 font-normal">({rows.length})</span>
            </h2>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>
                {startedCount} started · {doneCount} done
                {reviewCount > 0 && (
                  <>
                    {' · '}
                    <span className="text-amber-700">
                      {reviewCount} to check
                    </span>
                  </>
                )}
              </span>
              <span>{pollOk ? 'Updates every 5 seconds' : 'Reconnecting…'}</span>
              <button className="btn-secondary py-1 min-h-0 text-xs" onClick={() => setRefreshTick((t) => t + 1)}>
                Refresh
              </button>
            </div>
          </div>

          {!attemptsLoaded && rows.length === 0 ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-gray-500">
              No students have joined this session yet. When they join with the code, they appear here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                    <th className="py-2 pr-4 font-semibold">Student</th>
                    <th className="py-2 pr-4 font-semibold">Where they are</th>
                    <th className="py-2 pr-4 font-semibold">Turn</th>
                    <th className="py-2 pr-4 font-semibold">
                      <span className="sr-only">Needs a look</span>
                      <span aria-hidden="true">Check</span>
                    </th>
                    <th className="py-2 pr-0 font-semibold">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row) => {
                    const a = row.attempt
                    const clickable = Boolean(a)
                    const open = () => clickable && setReviewRow({ attemptId: a.id, studentName: row.studentName })
                    return (
                      <tr
                        key={row.key}
                        className={
                          clickable
                            ? 'cursor-pointer hover:bg-gray-50 focus:outline-none focus:bg-blue-50'
                            : 'text-gray-400'
                        }
                        role={clickable ? 'button' : undefined}
                        tabIndex={clickable ? 0 : undefined}
                        aria-label={clickable ? `Review ${row.studentName}` : undefined}
                        onClick={open}
                        onKeyDown={(e) => {
                          if (!clickable) return
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            open()
                          }
                        }}
                      >
                        <td className="py-2.5 pr-4 font-medium text-gray-900 whitespace-nowrap">
                          <span className={clickable ? '' : 'text-gray-500'}>{row.studentName}</span>
                        </td>
                        <td className="py-2.5 pr-4">
                          <StatePill state={a ? a.state : 'NOT_STARTED'} />
                        </td>
                        <td className="py-2.5 pr-4 whitespace-nowrap text-gray-700">
                          {a ? `Turn ${a.turnCount ?? 0} of ${a.maxTurns ?? pack?.maxTurns ?? '—'}` : '—'}
                        </td>
                        <td className="py-2.5 pr-4">{a?.needsTeacherReview ? <ReviewFlag /> : null}</td>
                        <td className="py-2.5 pr-0 whitespace-nowrap text-gray-500">{a ? formatTime(a.updatedAt) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {rows.length > 0 && (
            <p className="mt-3 text-xs text-gray-400">Click a student who has started to see their notebook and turns.</p>
          )}
        </div>
      </div>

      {reviewRow && (
        <ReviewPanel
          attemptId={reviewRow.attemptId}
          studentName={reviewRow.studentName}
          listUpdatedAt={reviewListEntry?.updatedAt || null}
          conceptMap={conceptMap}
          fallbackLabels={notebookLabels}
          onClose={closeReview}
          onAttemptChanged={mergeAttempt}
          onPaused={markPaused}
        />
      )}

      {confirm && <ConfirmDialog isOpen {...confirm} />}
    </div>
  )
}

/* ---------- Pack card pieces ---------- */

function PackPicker({
  packs,
  packsError,
  onRetry,
  selectedPackId,
  onSelect,
  currentPackId,
  busy,
  onUse,
  onRemove,
  onCancel
}) {
  if (packsError) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-red-700">Could not load the list of packs.</p>
        <button className="btn-secondary" onClick={onRetry}>
          Try again
        </button>
      </div>
    )
  }
  if (packs === null) {
    return <p className="text-sm text-gray-500">Loading packs…</p>
  }
  if (packs.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-gray-600">No packs are available yet. Add one in the backend packs folder.</p>
        <button className="btn-secondary" onClick={onRetry}>
          Check again
        </button>
      </div>
    )
  }

  const sameAsCurrent = currentPackId && selectedPackId === currentPackId

  return (
    <div>
      <p className="text-sm text-gray-600 mb-3">
        {currentPackId
          ? 'Choose a different pack for this session.'
          : 'This session has no pack yet. Choose one so students can start.'}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <label htmlFor="pack-select" className="block text-sm font-medium text-gray-700 mb-2">
            Pack
          </label>
          <select
            id="pack-select"
            className="input-field"
            value={selectedPackId}
            onChange={(e) => onSelect(e.target.value)}
            disabled={busy}
          >
            {packs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} — {p.blockId} · v{p.version} · {p.maxTurns} turns
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" disabled={busy || !selectedPackId || sameAsCurrent} onClick={onUse}>
            {busy ? 'Saving…' : 'Use this pack'}
          </button>
          {onRemove && (
            <button className="btn-secondary" disabled={busy} onClick={onRemove}>
              Remove pack
            </button>
          )}
          {onCancel && (
            <button className="btn-secondary" disabled={busy} onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </div>
      {sameAsCurrent && <p className="mt-2 text-xs text-gray-500">This is the pack the session already uses.</p>}
    </div>
  )
}

function PackSummary({ pack, conceptMap }) {
  const prompts = pack.prompts || {}
  const probes = pack.probes || []
  const repairs = pack.repairs || []
  const evidence = pack.evidence || []
  const terms = pack.student?.terms || []
  const offLimits = pack.offLimits || []

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900">{pack.title}</h3>
      <p className="text-xs text-gray-500 mb-2">
        {pack.blockId} · version {pack.assignedVersion ?? pack.version}
        {pack.assignedVersion != null && pack.assignedVersion !== pack.version && (
          <span className="text-amber-700"> (the pack file is now version {pack.version})</span>
        )}
        {' '}· up to {pack.maxTurns} turns per student
      </p>
      {pack.centralQuestion && (
        <p className="text-gray-800 mb-4">
          <span className="text-xs uppercase tracking-wide text-gray-500 mr-2">Central question</span>
          {pack.centralQuestion}
        </p>
      )}

      <details className="group border border-gray-200 rounded-lg">
        <summary className="cursor-pointer select-none px-4 py-3 font-medium text-gray-800 flex items-center justify-between">
          <span>What the apprentice can ask</span>
          <span className="text-xs text-gray-500 group-open:hidden">Show</span>
          <span className="text-xs text-gray-500 hidden group-open:inline">Hide</span>
        </summary>
        <div className="px-4 pb-4 space-y-5 text-sm">
          <p className="text-xs text-gray-500">
            The apprentice only uses these authored lines. It never writes its own questions. This part is for you,
            not for students.
          </p>

          <PackSection title="Opening and re-teach prompts">
            <ul className="space-y-1.5">
              {prompts.firstTeach && <PromptLine label="First" text={prompts.firstTeach} />}
              {prompts.reteach && <PromptLine label="Re-teach" text={prompts.reteach} />}
              {prompts.done && <PromptLine label="Done" text={prompts.done} />}
            </ul>
          </PackSection>

          <PackSection title="Probes (follow-up questions)">
            {probes.length === 0 ? (
              <p className="text-gray-500">None.</p>
            ) : (
              <ul className="space-y-1.5">
                {probes.map((p) => (
                  <li key={p.id} className="text-gray-800">
                    &ldquo;{p.text}&rdquo;
                    {p.targetsConceptId && (
                      <span className="block text-xs text-gray-500">
                        Aims at: {conceptMap[p.targetsConceptId] || p.targetsConceptId}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </PackSection>

          <PackSection title="Repairs (used after an overclaim or a missing reason)">
            {repairs.length === 0 ? (
              <p className="text-gray-500">None.</p>
            ) : (
              <ul className="space-y-1.5">
                {repairs.map((r) => (
                  <li key={r.id} className="text-gray-800">
                    &ldquo;{r.text}&rdquo;
                    <span className="block text-xs text-gray-500">
                      Used {REPAIR_TRIGGER_LABELS[r.trigger] || `when: ${r.trigger}`}
                      {r.targetsConceptId && ` · aims at: ${conceptMap[r.targetsConceptId] || r.targetsConceptId}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </PackSection>

          <PackSection title="Evidence students see">
            {evidence.length === 0 ? (
              <p className="text-gray-500">None.</p>
            ) : (
              <ul className="list-disc pl-5 space-y-1">
                {evidence.map((e) => (
                  <li key={e.id} className="text-gray-800">
                    {e.label}
                    {e.detail && <span className="text-gray-500"> — {e.detail}</span>}
                  </li>
                ))}
              </ul>
            )}
          </PackSection>

          <PackSection title="Key words">
            {terms.length === 0 ? (
              <p className="text-gray-500">None.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {terms.map((t) => (
                  <li key={t.term} className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-gray-800">
                    <span className="font-medium">{t.term}</span>
                    {t.gloss && <span className="text-gray-500"> — {t.gloss}</span>}
                  </li>
                ))}
              </ul>
            )}
          </PackSection>

          {pack.peerQuestion && (
            <PackSection title="Partner question (shown when done)">
              <p className="text-gray-800">{pack.peerQuestion}</p>
            </PackSection>
          )}

          {offLimits.length > 0 && (
            <PackSection title="The apprentice must not bring up">
              <ul className="list-disc pl-5 space-y-1">
                {offLimits.map((o, i) => (
                  <li key={i} className="text-gray-800">
                    {o}
                  </li>
                ))}
              </ul>
            </PackSection>
          )}
        </div>
      </details>
    </div>
  )
}

function PackSection({ title, children }) {
  return (
    <section>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">{title}</h4>
      {children}
    </section>
  )
}

function PromptLine({ label, text }) {
  return (
    <li className="text-gray-800">
      <span className="inline-block text-xs text-gray-500 w-16">{label}</span>
      &ldquo;{text}&rdquo;
    </li>
  )
}

/* ---------- Table pieces ---------- */

function StatePill({ state }) {
  const label = STATE_LABELS[state] || state || 'Unknown'
  const style = STATE_STYLES[state] || STATE_STYLES.NOT_STARTED
  return <span className={`inline-block text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${style}`}>{label}</span>
}

function SessionStatusPill({ status }) {
  const styles = {
    active: 'bg-green-100 text-green-800',
    paused: 'bg-amber-100 text-amber-800',
    ended: 'bg-gray-100 text-gray-600'
  }
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full capitalize ${styles[status] || styles.ended}`}>{status}</span>
  )
}

function ReviewFlag() {
  return (
    <span className="inline-flex items-center gap-1 text-amber-700" title="Worth a look: the apprentice used a fallback on a turn">
      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M3 2.5a.75.75 0 011.5 0V3h9.75a.75.75 0 01.6 1.2L12.9 7l1.95 2.8a.75.75 0 01-.6 1.2H4.5v6.5a.75.75 0 01-1.5 0v-15z" />
      </svg>
      <span className="sr-only">Needs a look</span>
    </span>
  )
}

/* ---------- Review panel ---------- */

function ReviewPanel({
  attemptId,
  studentName,
  listUpdatedAt,
  conceptMap,
  fallbackLabels,
  onClose,
  onAttemptChanged,
  onPaused
}) {
  const toast = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [data, setData] = useState(null) // { attempt, turns }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [ending, setEnding] = useState(false)

  const load = useCallback(async () => {
    setError(false)
    try {
      const result = await speakingAPI.review(attemptId)
      setData({ attempt: result.attempt, turns: result.turns || [] })
    } catch (err) {
      if (isPausedError(err)) {
        onPaused()
        return
      }
      setError(true)
      toastRef.current.error('Could not load this attempt', messageFrom(err, 'Could not load this attempt. Try again.'))
    } finally {
      setLoading(false)
    }
  }, [attemptId, onPaused])

  // Load on open, and again whenever the live list says this attempt changed
  useEffect(() => {
    load()
  }, [load, listUpdatedAt])

  // Escape closes the panel (but not while the confirm dialog is up — it handles its own Escape)
  useEffect(() => {
    if (confirmEnd) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, confirmEnd])

  const applyAttempt = useCallback(
    (attempt) => {
      if (!attempt) return
      setData((prev) => ({ attempt: { ...(prev?.attempt || {}), ...attempt }, turns: prev?.turns || [] }))
      onAttemptChanged(attempt)
    },
    [onAttemptChanged]
  )

  async function endAttempt() {
    setConfirmEnd(false)
    setEnding(true)
    try {
      const result = await speakingAPI.teacherEnd(attemptId)
      applyAttempt(result.attempt)
      toast.success('Attempt ended', `${studentName}'s attempt is now closed.`)
    } catch (err) {
      const status = err?.response?.status
      if (status === 409 && err.response?.data?.attempt) {
        // The server already moved on; take its version and carry on
        applyAttempt(err.response.data.attempt)
        toast.info('Already changed', messageFrom(err, 'This attempt had already changed. Showing the latest.'))
      } else if (isPausedError(err)) {
        onPaused()
      } else {
        toast.error('Could not end the attempt', messageFrom(err, 'Could not end the attempt. Try again.'))
      }
    } finally {
      setEnding(false)
    }
  }

  const attempt = data?.attempt || null
  const turns = data?.turns || []
  const labels = attempt?.pack?.student?.notebookLabels || fallbackLabels || DEFAULT_NOTEBOOK_LABELS
  const notebook = attempt?.notebook || {}
  const isDone = attempt?.state === 'DONE'

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="review-title">
      <div className="absolute inset-0 bg-black bg-opacity-40" onClick={onClose} aria-hidden="true" />
      <aside className="relative bg-white w-full max-w-2xl h-full shadow-xl overflow-y-auto animate-slide-in-right flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-start justify-between gap-4 z-10">
          <div>
            <h2 id="review-title" className="text-xl font-bold text-gray-900">
              {studentName}
            </h2>
            {attempt && (
              <p className="text-sm text-gray-600 flex flex-wrap items-center gap-2 mt-1">
                <StatePill state={attempt.state} />
                <span>
                  Turn {attempt.turnCount ?? 0} of {attempt.maxTurns ?? '—'}
                </span>
                {attempt.closureReason && (
                  <span className="text-gray-500">· {CLOSURE_LABELS[attempt.closureReason] || attempt.closureReason}</span>
                )}
              </p>
            )}
          </div>
          <button className="btn-icon text-gray-500 hover:bg-gray-100" onClick={onClose} aria-label="Close review">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-6 flex-1">
          {loading && !data ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : error && !data ? (
            <div className="space-y-3">
              <p className="text-sm text-red-700">Could not load this attempt.</p>
              <div className="flex gap-2">
                <button className="btn-primary" onClick={load}>
                  Try again
                </button>
                <button className="btn-secondary" onClick={onClose}>
                  Close
                </button>
              </div>
            </div>
          ) : attempt ? (
            <>
              {attempt.needsTeacherReview && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900 flex items-start gap-2">
                  <ReviewFlag />
                  <span>
                    Worth a look: on at least one turn the apprentice could not use the student's words, so it used a
                    fixed prompt and left the notebook unchanged.
                  </span>
                </div>
              )}

              {/* Notebook */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">Notebook</h3>
                  {error && (
                    <button className="text-xs text-blue-700 underline" onClick={load}>
                      Refresh failed — try again
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {NOTEBOOK_KEYS.map((key) => (
                    <div key={key} className="rounded-lg border border-gray-200 bg-gray-50 p-3 min-h-[72px]">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                        {labels[key] || DEFAULT_NOTEBOOK_LABELS[key]}
                      </div>
                      {notebook[key] ? (
                        <p className="text-gray-900">{notebook[key]}</p>
                      ) : (
                        <p className="text-gray-400 italic">Nothing yet</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Turns */}
              <section>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Turns <span className="text-gray-400 font-normal">({turns.length})</span>
                </h3>
                {turns.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    {attempt.state === 'PLAN'
                      ? 'The student is still on the plan screen.'
                      : 'No turns recorded yet.'}
                  </p>
                ) : (
                  <ol className="space-y-4">
                    {turns.map((turn, i) => (
                      <TurnCard key={turn.id || turn.turnId || i} turn={turn} index={i + 1} conceptMap={conceptMap} />
                    ))}
                  </ol>
                )}
              </section>
            </>
          ) : (
            <p className="text-sm text-gray-500">Nothing to show for this attempt yet.</p>
          )}
        </div>

        {/* Footer */}
        {attempt && (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-gray-500">Updated {formatTime(attempt.updatedAt)}</span>
            <div className="flex gap-2">
              {!isDone && (
                <button className="btn-secondary" disabled={ending} onClick={() => setConfirmEnd(true)}>
                  {ending ? 'Ending…' : 'End this attempt'}
                </button>
              )}
              <button className="btn-primary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        )}
      </aside>

      <ConfirmDialog
        isOpen={confirmEnd}
        title="End this attempt?"
        message={`${studentName} will stop here. Their notebook and turns are kept, and they will see that you ended it.`}
        confirmText="End attempt"
        cancelText="Keep going"
        severity="warning"
        onConfirm={endAttempt}
        onCancel={() => setConfirmEnd(false)}
      />
    </div>
  )
}

function TurnCard({ turn, index, conceptMap }) {
  const covered = (turn.coveredConceptIds || []).map((id) => conceptMap[id] || id)
  const unresolved = (turn.unresolvedConceptIds || []).map((id) => conceptMap[id] || id)
  const edited = Boolean(turn.transcriptEdited) || (Boolean(turn.rawAsr) && turn.rawAsr !== turn.text)
  const fallback = Boolean(turn.model?.fallback)

  return (
    <li className="rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Turn {index} · {STATE_LABELS[turn.stateBefore] || turn.stateBefore}
        </span>
        <span className="text-xs text-gray-400">{formatTime(turn.createdAt)}</span>
      </div>

      {turn.prompt?.text && (
        <p className="text-sm text-gray-600 mb-2">
          <span className="text-xs uppercase tracking-wide text-gray-400 mr-2">Apprentice</span>
          &ldquo;{turn.prompt.text}&rdquo;
        </p>
      )}

      <div className="bg-gray-50 rounded-lg px-3 py-2 mb-2">
        <span className="text-xs uppercase tracking-wide text-gray-400 mr-2">Student</span>
        <span className="text-gray-900">{turn.text || <span className="text-gray-400 italic">(nothing recorded)</span>}</span>
        {edited && turn.rawAsr && (
          <p className="text-xs text-gray-500 mt-1">
            edited from: <span className="italic">{turn.rawAsr}</span>
          </p>
        )}
      </div>

      {(turn.overclaim || turn.offTopic || fallback) && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {turn.overclaim && <Badge className="bg-amber-100 text-amber-800">Overclaim</Badge>}
          {turn.offTopic && <Badge className="bg-gray-100 text-gray-700">Off topic — redirected</Badge>}
          {fallback && <Badge className="bg-purple-100 text-purple-800">Fixed prompt used</Badge>}
        </div>
      )}

      {covered.length > 0 && (
        <div className="text-sm">
          <span className="text-xs uppercase tracking-wide text-gray-400 mr-2">Covered</span>
          <ul className="inline-flex flex-wrap gap-1.5 align-middle">
            {covered.map((label, i) => (
              <li key={i}>
                <Badge className="bg-green-50 text-green-800 border border-green-200">{label}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
      {unresolved.length > 0 && (
        <p className="text-xs text-gray-500 mt-1.5">Still open: {unresolved.join(' · ')}</p>
      )}

      {turn.nextPrompt?.text && (
        <p className="text-xs text-gray-500 mt-2">
          Next the apprentice asked: &ldquo;{turn.nextPrompt.text}&rdquo;
        </p>
      )}
    </li>
  )
}

function Badge({ className = '', children }) {
  return <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${className}`}>{children}</span>
}
