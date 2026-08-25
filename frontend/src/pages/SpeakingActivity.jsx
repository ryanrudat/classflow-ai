import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { speakingAPI } from '../services/api'
import { useToast } from '../components/Toast'
import ConfirmDialog from '../components/ConfirmDialog'

/**
 * Student speaking activity (pack-driven), route /speak/:sessionId.
 *
 * The server owns the state machine. This page renders attempt.state:
 *   PLAN  → plan screen (topic, evidence, terms, sentence starters)
 *   FIRST_TEACH / PROBE / REPAIR / RETEACH → turn screen (prompt, notebook, recorder)
 *   DONE  → final note + partner question
 *
 * Every request carries attempt.stateVersion. A 409 with an attempt in the
 * body means we are out of step: adopt the server's attempt and continue.
 * A 423 means the teacher paused or ended the session: show a calm notice
 * and keep everything the student has typed or recorded.
 */

const STORAGE_KEY = 'student_session'
const TURN_STATES = ['FIRST_TEACH', 'PROBE', 'REPAIR', 'RETEACH']
const NOTEBOOK_KEYS = ['claim', 'because', 'notProved', 'nextEvidence']
const DEFAULT_LABELS = {
  claim: 'I think',
  because: 'Because (evidence)',
  notProved: 'Not proved',
  nextEvidence: 'Next evidence'
}
const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
const MAX_RECORDING_SECONDS = 120
const NO_PACK_POLL_MS = 10000
const HIGHLIGHT_MS = 1800

function readStoredJoin() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null')
  } catch {
    return null
  }
}

function newTurnId() {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
    if (typeof crypto.getRandomValues === 'function') {
      const bytes = crypto.getRandomValues(new Uint8Array(16))
      bytes[6] = (bytes[6] & 0x0f) | 0x40
      bytes[8] = (bytes[8] & 0x3f) | 0x80
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    }
  }
  return `turn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return ''
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) || ''
}

function extensionFor(mime) {
  const m = (mime || '').toLowerCase()
  if (m.includes('mp4')) return 'mp4'
  if (m.includes('ogg')) return 'ogg'
  return 'webm'
}

function formatSeconds(total) {
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function isPausedError(err) {
  return err?.response?.status === 423
}

function isResyncError(err) {
  return err?.response?.status === 409 && Boolean(err.response?.data?.attempt)
}

function isNoPackError(err) {
  return err?.response?.status === 409 && !err.response?.data?.attempt
}

export default function SpeakingActivity() {
  const { sessionId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()

  // Identity: router state first, then the join stored for this tab so a
  // refresh does not drop the student out of the activity.
  const storedJoin = readStoredJoin()
  const storedStudent = storedJoin?.session?.id === sessionId ? storedJoin.student : null
  const studentId = location.state?.studentId || storedStudent?.id
  const studentName = location.state?.studentName || storedStudent?.student_name

  const [attempt, setAttempt] = useState(null)
  const [phase, setPhase] = useState('loading') // 'loading' | 'no-pack' | 'error' | 'ready'
  const [paused, setPaused] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [highlightKeys, setHighlightKeys] = useState([])

  const attemptIdRef = useRef(null)
  const previousNotebookRef = useRef(null)
  const highlightTimerRef = useRef(null)

  useEffect(() => {
    attemptIdRef.current = attempt?.id || null
  }, [attempt])

  useEffect(() => () => clearTimeout(highlightTimerRef.current), [])

  // Adopt an attempt from the server. Notebook boxes whose text changed get a
  // short highlight so the student can see what the apprentice wrote.
  const applyAttempt = useCallback((next) => {
    if (!next) return
    const prev = previousNotebookRef.current
    if (prev && next.notebook) {
      const changed = NOTEBOOK_KEYS.filter((key) => (prev[key] || '') !== (next.notebook[key] || ''))
      if (changed.length > 0) {
        setHighlightKeys(changed)
        clearTimeout(highlightTimerRef.current)
        highlightTimerRef.current = setTimeout(() => setHighlightKeys([]), HIGHLIGHT_MS)
      }
    }
    previousNotebookRef.current = next.notebook || null
    setAttempt(next)
  }, [])

  // Create or fetch the attempt. Throws so callers can decide what to show.
  const loadAttempt = useCallback(async () => {
    const data = attemptIdRef.current
      ? await speakingAPI.getAttempt(attemptIdRef.current, studentId)
      : await speakingAPI.startAttempt(sessionId, studentId)
    applyAttempt(data.attempt)
    setPhase('ready')
    setPaused(false)
  }, [sessionId, studentId, applyAttempt])

  const retryStart = useCallback(
    async ({ quiet = false } = {}) => {
      setBusy(true)
      try {
        await loadAttempt()
      } catch (err) {
        if (isPausedError(err)) {
          setPaused(true)
          if (!quiet) toast.info('Still paused', 'Your teacher has not started again yet.')
        } else if (isResyncError(err)) {
          // Out of step: the server sent the current attempt, so use it.
          applyAttempt(err.response.data.attempt)
          setPhase('ready')
          setPaused(false)
        } else if (isNoPackError(err)) {
          setPhase('no-pack')
          if (!quiet) toast.info('Not yet', "Your teacher hasn't chosen today's topic yet.")
        } else {
          setPhase((p) => (p === 'ready' ? p : 'error'))
          if (!quiet) toast.error('Could not connect', 'Please check your connection and try again.')
        }
      } finally {
        setBusy(false)
      }
    },
    [loadAttempt, applyAttempt, toast]
  )

  // Shared handling for 423 (paused) and 409 (out of step).
  // Returns 'paused' | 'resynced' | 'failed'.
  const handleApiError = useCallback(
    (err, title, message) => {
      if (isPausedError(err)) {
        setPaused(true)
        return 'paused'
      }
      if (isResyncError(err)) {
        applyAttempt(err.response.data.attempt)
        return 'resynced'
      }
      toast.error(title, message)
      return 'failed'
    },
    [applyAttempt, toast]
  )

  // Start on mount
  useEffect(() => {
    if (!studentId) return
    retryStart({ quiet: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, sessionId])

  // While there is no pack, check again every 10 seconds
  useEffect(() => {
    if (phase !== 'no-pack') return
    const timer = setInterval(() => retryStart({ quiet: true }), NO_PACK_POLL_MS)
    return () => clearInterval(timer)
  }, [phase, retryStart])

  async function handleReady() {
    if (!attempt) return
    setBusy(true)
    try {
      const data = await speakingAPI.ready(attempt.id, studentId, attempt.stateVersion)
      applyAttempt(data.attempt)
    } catch (err) {
      handleApiError(err, 'Could not start', 'Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleFinish() {
    setConfirmFinish(false)
    if (!attempt) return
    setBusy(true)
    try {
      const data = await speakingAPI.studentEnd(attempt.id, studentId)
      applyAttempt(data.attempt)
    } catch (err) {
      handleApiError(err, 'Could not finish', 'Please try again.')
    } finally {
      setBusy(false)
    }
  }

  // ---- Screens ----

  if (!studentId) {
    return (
      <Shell>
        <div className="card w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Join your class first</h1>
          <p className="text-gray-600 mb-6">Enter the code your teacher shows you, then come back here.</p>
          <button type="button" onClick={() => navigate('/join')} className="btn-primary w-full text-lg">
            Go to join page
          </button>
        </div>
      </Shell>
    )
  }

  let content = null

  if (phase === 'loading' && !attempt) {
    content = (
      <Shell>
        <div className="card w-full max-w-md text-center" role="status" aria-live="polite">
          <Spinner />
          <p className="text-gray-600 mt-3">Getting ready…</p>
        </div>
      </Shell>
    )
  } else if (phase === 'no-pack') {
    content = (
      <Shell>
        <div className="card w-full max-w-md text-center" role="status" aria-live="polite">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your teacher hasn't chosen today's topic yet</h1>
          <p className="text-gray-600 mb-6">This page checks again by itself. You can also try now.</p>
          <button type="button" onClick={() => retryStart()} className="btn-primary w-full text-lg" disabled={busy}>
            {busy ? 'Checking…' : 'Retry'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/join')}
            className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline rounded"
          >
            Back
          </button>
        </div>
      </Shell>
    )
  } else if (phase === 'error') {
    content = (
      <Shell>
        <div className="card w-full max-w-md text-center" role="alert">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">We could not start the activity</h1>
          <p className="text-gray-600 mb-6">Check your connection and try again.</p>
          <button type="button" onClick={() => retryStart()} className="btn-primary w-full text-lg" disabled={busy}>
            {busy ? 'Trying…' : 'Try again'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/join')}
            className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline rounded"
          >
            Back to join page
          </button>
        </div>
      </Shell>
    )
  } else if (attempt?.state === 'PLAN') {
    content = <PlanScreen attempt={attempt} studentName={studentName} busy={busy} onReady={handleReady} />
  } else if (attempt && TURN_STATES.includes(attempt.state)) {
    content = (
      <TurnScreen
        attempt={attempt}
        studentId={studentId}
        studentName={studentName}
        busy={busy}
        highlightKeys={highlightKeys}
        onAttempt={applyAttempt}
        onApiError={handleApiError}
        onFinishRequest={() => setConfirmFinish(true)}
      />
    )
  } else if (attempt?.state === 'DONE') {
    content = <DoneScreen attempt={attempt} studentName={studentName} onBack={() => navigate('/join')} />
  } else if (attempt) {
    content = (
      <Shell>
        <div className="card w-full max-w-md text-center" role="alert">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Something is out of step</h1>
          <p className="text-gray-600 mb-6">Let's get the latest from your teacher's session.</p>
          <button type="button" onClick={() => retryStart()} className="btn-primary w-full" disabled={busy}>
            {busy ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </Shell>
    )
  }

  return (
    <>
      <div aria-hidden={paused || undefined}>{content}</div>

      {paused && <PausedNotice busy={busy} onRetry={() => retryStart()} />}

      <ConfirmDialog
        isOpen={confirmFinish}
        title="Finish now?"
        message="Your note will be saved as it is. You cannot add more after this."
        confirmText="Finish"
        cancelText="Keep going"
        severity="warning"
        onConfirm={handleFinish}
        onCancel={() => setConfirmFinish(false)}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      {children}
    </div>
  )
}

function Spinner() {
  return (
    <div
      className="mx-auto h-8 w-8 rounded-full border-4 border-gray-200 border-t-primary-600 animate-spin motion-reduce:animate-none"
      aria-hidden="true"
    />
  )
}

function PausedNotice({ busy, onRetry }) {
  const buttonRef = useRef(null)
  useEffect(() => {
    buttonRef.current?.focus()
  }, [])

  return (
    <div
      className="fixed inset-0 z-40 bg-gray-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paused-title"
    >
      <div className="card w-full max-w-md text-center" role="status" aria-live="polite">
        <h1 id="paused-title" className="text-2xl font-bold text-gray-900 mb-2">
          Your teacher has paused the session
        </h1>
        <p className="text-gray-600 mb-6">Your work is safe. Wait a moment, then try again.</p>
        <button ref={buttonRef} type="button" onClick={onRetry} className="btn-primary w-full text-lg" disabled={busy}>
          {busy ? 'Checking…' : 'Try again'}
        </button>
      </div>
    </div>
  )
}

function PageHeader({ title, studentName, right }) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 truncate">{studentName ? `Hi, ${studentName}` : 'Speaking activity'}</p>
          <h1 className="text-lg font-semibold text-gray-900 truncate">{title}</h1>
        </div>
        {right}
      </div>
    </header>
  )
}

// ---------------------------------------------------------------------------
// Shared content: notebook, evidence, terms, sentence starters
// ---------------------------------------------------------------------------

function Notebook({ labels, notebook, highlightKeys = [] }) {
  const merged = { ...DEFAULT_LABELS, ...(labels || {}) }
  return (
    <div className="card">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Your note</h2>
      <dl className="space-y-3">
        {NOTEBOOK_KEYS.map((key) => {
          const value = (notebook?.[key] || '').trim()
          const lit = highlightKeys.includes(key)
          return (
            <div
              key={key}
              className={`rounded-lg border px-3 py-2 transition-colors duration-700 motion-reduce:transition-none ${
                lit ? 'bg-amber-50 border-amber-300' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <dt className="text-xs font-medium text-gray-500">{merged[key]}</dt>
              <dd className={`mt-1 leading-snug ${value ? 'text-gray-900' : 'text-gray-300'}`}>
                {value || '—'}
                {lit && <span className="sr-only"> (updated)</span>}
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}

function EvidenceCards({ evidence }) {
  if (!evidence?.length) return null
  return (
    <section aria-labelledby="evidence-heading">
      <h3 id="evidence-heading" className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Evidence
      </h3>
      <ul className="grid gap-3 sm:grid-cols-2">
        {evidence.map((item) => (
          <li key={item.id} className="rounded-lg border border-gray-200 bg-white p-3">
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt={item.label || ''}
                loading="lazy"
                className="w-full max-h-48 object-cover rounded-md mb-2"
              />
            )}
            <p className="font-medium text-gray-900">{item.label}</p>
            {item.detail && <p className="text-sm text-gray-600 mt-1">{item.detail}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}

function Terms({ terms }) {
  if (!terms?.length) return null
  return (
    <section aria-labelledby="terms-heading">
      <h3 id="terms-heading" className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Useful words
      </h3>
      <dl className="grid gap-2 sm:grid-cols-2">
        {terms.map((t) => (
          <div key={t.term} className="flex gap-2 text-sm">
            <dt className="font-semibold text-gray-900 shrink-0">{t.term}</dt>
            <dd className="text-gray-600">{t.gloss}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function Frames({ frames, showChallenge, onToggleChallenge }) {
  const support = frames?.support || []
  const challenge = frames?.challenge || []
  if (!support.length && !challenge.length) return null
  return (
    <section aria-labelledby="frames-heading">
      <h3 id="frames-heading" className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Sentence starters
      </h3>
      <ul className="space-y-2">
        {support.map((frame) => (
          <li key={frame} className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-gray-800">
            {frame}
          </li>
        ))}
        {showChallenge &&
          challenge.map((frame) => (
            <li key={frame} className="rounded-lg bg-purple-50 border border-purple-100 px-3 py-2 text-gray-800">
              {frame}
            </li>
          ))}
      </ul>
      {challenge.length > 0 && (
        <button
          type="button"
          onClick={onToggleChallenge}
          aria-expanded={showChallenge}
          className="mt-3 text-sm font-medium text-purple-700 hover:text-purple-900 underline rounded"
        >
          {showChallenge ? 'Hide the challenge' : 'Try a challenge'}
        </button>
      )}
    </section>
  )
}

function SupportContent({ pack, showChallenge, onToggleChallenge }) {
  const student = pack?.student || {}
  return (
    <div className="space-y-6">
      <EvidenceCards evidence={pack?.evidence} />
      <Terms terms={student.terms} />
      <Frames frames={student.frames} showChallenge={showChallenge} onToggleChallenge={onToggleChallenge} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// PLAN
// ---------------------------------------------------------------------------

function PlanScreen({ attempt, studentName, busy, onReady }) {
  const pack = attempt.pack || {}
  const student = pack.student || {}
  const [showChallenge, setShowChallenge] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title={pack.title || 'Speaking activity'} studentName={studentName} />
      <main className="max-w-3xl mx-auto p-4 space-y-4">
        <section className="card">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Today's question</p>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 leading-snug">{pack.centralQuestion}</h2>
          {student.intro && <p className="mt-4 text-gray-700 leading-relaxed">{student.intro}</p>}
        </section>

        <section className="card">
          <SupportContent
            pack={pack}
            showChallenge={showChallenge}
            onToggleChallenge={() => setShowChallenge((v) => !v)}
          />
        </section>

        <div className="sticky bottom-0 pb-4 pt-2 bg-gradient-to-t from-gray-50 to-transparent">
          <button
            type="button"
            onClick={onReady}
            disabled={busy}
            className="w-full px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy ? 'Starting…' : "I'm ready to explain"}
          </button>
        </div>
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TURN (FIRST_TEACH, PROBE, REPAIR, RETEACH)
// ---------------------------------------------------------------------------

function TurnScreen({ attempt, studentId, studentName, busy, highlightKeys, onAttempt, onApiError, onFinishRequest }) {
  const toast = useToast()
  const pack = attempt.pack || {}
  const student = pack.student || {}

  const [inputMode, setInputMode] = useState('voice') // 'voice' | 'type'
  const [micNote, setMicNote] = useState('')
  const [recState, setRecState] = useState('idle') // idle | recording | transcribing | transcribe-failed | confirm
  const [seconds, setSeconds] = useState(0)
  const [rawAsr, setRawAsr] = useState('')
  const [transcript, setTranscript] = useState('')
  const [typed, setTyped] = useState('')
  const [sending, setSending] = useState(false)
  const [supportOpen, setSupportOpen] = useState(attempt.state !== 'RETEACH')
  const [showChallenge, setShowChallenge] = useState(false)

  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const mimeRef = useRef('')
  const lastBlobRef = useRef(null)
  const turnIdRef = useRef(null)
  const timerRef = useRef(null)
  const confirmTextRef = useRef(null)
  const typedTextRef = useRef(null)

  const locked = sending || busy
  const turnNumber = Math.min((attempt.turnCount || 0) + 1, attempt.maxTurns || pack.maxTurns || 1)
  const maxTurns = attempt.maxTurns || pack.maxTurns || turnNumber

  // Support panel: open in the first step, folded in the reduced-support step.
  useEffect(() => {
    if (attempt.state === 'FIRST_TEACH') setSupportOpen(true)
    else if (attempt.state === 'RETEACH') setSupportOpen(false)
  }, [attempt.state])

  // Recording timer with a soft cap
  useEffect(() => {
    if (recState !== 'recording') return
    setSeconds(0)
    const started = Date.now()
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - started) / 1000)
      setSeconds(elapsed)
      if (elapsed >= MAX_RECORDING_SECONDS) stopRecording()
    }, 250)
    return () => clearInterval(timerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recState])

  // Focus the transcript when it is ready to check
  useEffect(() => {
    if (recState === 'confirm') confirmTextRef.current?.focus()
  }, [recState])

  useEffect(() => {
    if (inputMode === 'type') typedTextRef.current?.focus()
  }, [inputMode])

  // Release the microphone if the page goes away mid-recording
  useEffect(
    () => () => {
      const rec = recorderRef.current
      if (rec && rec.state !== 'inactive') {
        rec.onstop = null
        rec.ondataavailable = null
        try {
          rec.stop()
        } catch {
          // already stopped
        }
      }
      streamRef.current?.getTracks().forEach((t) => t.stop())
      clearInterval(timerRef.current)
    },
    []
  )

  function switchToTyping(note) {
    setMicNote(note || '')
    setInputMode('type')
    setRecState('idle')
  }

  async function startRecording() {
    if (locked) return
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      switchToTyping('Recording does not work in this browser. You can type instead.')
      return
    }
    setRawAsr('')
    setTranscript('')
    turnIdRef.current = null
    lastBlobRef.current = null

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = pickMimeType()
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      const actualMime = recorder.mimeType || mime || 'audio/webm'
      mimeRef.current = actualMime
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        recorderRef.current = null
        const blob = new Blob(chunksRef.current, { type: actualMime })
        chunksRef.current = []
        handleRecordingDone(blob)
      }
      recorder.onerror = () => {
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        recorderRef.current = null
        toast.error('Recording stopped', 'Something went wrong with the microphone. Try again or type instead.')
        setRecState('idle')
      }

      recorderRef.current = recorder
      streamRef.current = stream
      recorder.start(500)
      setRecState('recording')
    } catch (err) {
      const denied = err?.name === 'NotAllowedError' || err?.name === 'SecurityError'
      switchToTyping(
        denied
          ? 'The microphone is not allowed here. You can type instead.'
          : 'The microphone did not work. You can type instead.'
      )
    }
  }

  function stopRecording() {
    const rec = recorderRef.current
    if (rec && rec.state !== 'inactive') {
      setRecState('transcribing')
      rec.stop()
    }
  }

  function handleRecordingDone(blob) {
    if (!blob || blob.size < 500) {
      toast.info('Nothing recorded', 'Tap Speak and try again.')
      setRecState('idle')
      return
    }
    lastBlobRef.current = blob
    transcribe(blob)
  }

  async function transcribe(blob) {
    setRecState('transcribing')
    try {
      const filename = `recording.${extensionFor(blob.type || mimeRef.current)}`
      const data = await speakingAPI.transcribe(attempt.id, studentId, blob, filename)
      const raw = (data?.rawAsr || '').trim()
      setRawAsr(raw)
      setTranscript(raw)
      turnIdRef.current = newTurnId()
      setRecState('confirm')
    } catch (err) {
      onApiError(err, 'Could not hear that', 'Please try again, or type instead.')
      setRecState('transcribe-failed')
    }
  }

  async function send(text, raw) {
    const trimmed = (text || '').trim()
    if (!trimmed || locked) return
    if (!turnIdRef.current) turnIdRef.current = newTurnId()
    setSending(true)
    try {
      const data = await speakingAPI.submitTurn(attempt.id, {
        studentId,
        turnId: turnIdRef.current,
        stateVersion: attempt.stateVersion,
        text: trimmed,
        rawAsr: raw
      })
      turnIdRef.current = null
      lastBlobRef.current = null
      setRawAsr('')
      setTranscript('')
      setTyped('')
      setRecState('idle')
      onAttempt(data.attempt)
    } catch (err) {
      const result = onApiError(err, 'Could not send', 'Check your connection and try again.')
      if (result === 'resynced') {
        toast.info('Updated', 'Something changed. Check the question, then send again.')
      }
    } finally {
      setSending(false)
    }
  }

  function recordAgain() {
    setRawAsr('')
    setTranscript('')
    turnIdRef.current = null
    lastBlobRef.current = null
    startRecording()
  }

  const statusText = sending
    ? 'The apprentice is writing your note…'
    : recState === 'recording'
      ? `Recording · ${formatSeconds(seconds)}`
      : recState === 'transcribing'
        ? 'Listening…'
        : ''

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={pack.title || 'Speaking activity'}
        studentName={studentName}
        right={
          <div className="flex items-center gap-4 shrink-0">
            <span className="text-xs text-gray-500">
              Turn {turnNumber} of {maxTurns}
            </span>
            <button
              type="button"
              onClick={onFinishRequest}
              disabled={locked || recState === 'recording'}
              className="text-sm text-gray-500 hover:text-gray-800 underline rounded disabled:opacity-50"
            >
              Finish
            </button>
          </div>
        }
      />

      <main className="max-w-5xl mx-auto p-4 space-y-4">
        {/* Apprentice prompt */}
        <section className="card border-l-4 border-l-purple-400">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Archive Apprentice · AI
          </p>
          <p className="text-xl md:text-2xl font-medium text-gray-900 leading-snug" aria-live="polite">
            {attempt.prompt?.text || 'Tell me what you can see, and what you think.'}
          </p>
        </section>

        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          {/* Notebook */}
          <aside className="order-2 md:order-1">
            <Notebook labels={student.notebookLabels} notebook={attempt.notebook} highlightKeys={highlightKeys} />
          </aside>

          {/* Speaking area */}
          <section className="order-1 md:order-2 space-y-4">
            <div className="card">
              <p className="min-h-[1.5rem] text-sm text-gray-600" role="status" aria-live="polite">
                {statusText}
              </p>

              {sending ? (
                <div className="py-6 text-center">
                  <Spinner />
                </div>
              ) : inputMode === 'voice' ? (
                <VoiceInput
                  recState={recState}
                  seconds={seconds}
                  transcript={transcript}
                  rawAsr={rawAsr}
                  locked={locked}
                  textRef={confirmTextRef}
                  onTranscriptChange={setTranscript}
                  onStart={startRecording}
                  onStop={stopRecording}
                  onSend={() => send(transcript, rawAsr || null)}
                  onRecordAgain={recordAgain}
                  onRetryTranscribe={() => lastBlobRef.current && transcribe(lastBlobRef.current)}
                  onTypeInstead={() => switchToTyping('')}
                />
              ) : (
                <TypeInput
                  value={typed}
                  note={micNote}
                  locked={locked}
                  textRef={typedTextRef}
                  onChange={setTyped}
                  onSend={() => send(typed, null)}
                  onSpeakInstead={() => {
                    setMicNote('')
                    setInputMode('voice')
                    setRecState('idle')
                  }}
                />
              )}
            </div>

            {/* More support */}
            <div className="card">
              <button
                type="button"
                onClick={() => setSupportOpen((v) => !v)}
                aria-expanded={supportOpen}
                aria-controls="support-panel"
                className="w-full flex items-center justify-between text-left font-medium text-gray-800 rounded"
              >
                <span>More support</span>
                <span aria-hidden="true" className="text-gray-400">
                  {supportOpen ? '−' : '+'}
                </span>
              </button>
              {supportOpen && (
                <div id="support-panel" className="mt-4">
                  <SupportContent
                    pack={pack}
                    showChallenge={showChallenge}
                    onToggleChallenge={() => setShowChallenge((v) => !v)}
                  />
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

function VoiceInput({
  recState,
  seconds,
  transcript,
  rawAsr,
  locked,
  textRef,
  onTranscriptChange,
  onStart,
  onStop,
  onSend,
  onRecordAgain,
  onRetryTranscribe,
  onTypeInstead
}) {
  if (recState === 'confirm') {
    return (
      <div className="space-y-3">
        <label htmlFor="transcript" className="block font-semibold text-gray-900">
          Is this what you said?
        </label>
        {!rawAsr && (
          <p className="text-sm text-gray-600">We did not catch any words. Type what you said, or record again.</p>
        )}
        <textarea
          id="transcript"
          ref={textRef}
          value={transcript}
          onChange={(e) => onTranscriptChange(e.target.value)}
          rows={4}
          className="input-field"
          disabled={locked}
        />
        <p className="text-xs text-gray-500">You can fix any words before you send.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onSend}
            disabled={locked || !transcript.trim()}
            className="btn-primary flex-1 text-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Yes, send
          </button>
          <button type="button" onClick={onRecordAgain} disabled={locked} className="btn-secondary flex-1">
            Record again
          </button>
        </div>
      </div>
    )
  }

  if (recState === 'transcribe-failed') {
    return (
      <div className="space-y-3">
        <p className="font-semibold text-gray-900">We could not hear that.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={onRetryTranscribe} disabled={locked} className="btn-primary flex-1">
            Try again
          </button>
          <button type="button" onClick={onRecordAgain} disabled={locked} className="btn-secondary flex-1">
            Record again
          </button>
        </div>
        <button
          type="button"
          onClick={onTypeInstead}
          className="text-sm text-gray-500 hover:text-gray-800 underline rounded"
        >
          Type instead
        </button>
      </div>
    )
  }

  if (recState === 'transcribing') {
    return (
      <div className="py-6 text-center">
        <Spinner />
      </div>
    )
  }

  const recording = recState === 'recording'

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <button
        type="button"
        onClick={recording ? onStop : onStart}
        disabled={locked}
        aria-label={recording ? 'Stop recording' : 'Start speaking'}
        className={`relative h-28 w-28 rounded-full text-white text-xl font-semibold shadow-md transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed ${
          recording
            ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-300'
            : 'bg-purple-600 hover:bg-purple-700 focus-visible:ring-purple-300'
        }`}
      >
        {recording && (
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-red-400 opacity-40 animate-ping motion-reduce:animate-none"
          />
        )}
        <span className="relative">{recording ? 'Done' : 'Speak'}</span>
      </button>
      <p className="text-sm text-gray-600 text-center">
        {recording ? (
          <>
            <span className="font-mono">{formatSeconds(seconds)}</span> · Tap Done when you finish
          </>
        ) : (
          'Tap Speak, say your answer, then tap Done.'
        )}
      </p>
      {!recording && (
        <button
          type="button"
          onClick={onTypeInstead}
          disabled={locked}
          className="text-sm text-gray-500 hover:text-gray-800 underline rounded"
        >
          Type instead
        </button>
      )}
    </div>
  )
}

function TypeInput({ value, note, locked, textRef, onChange, onSend, onSpeakInstead }) {
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        onSend()
      }}
    >
      {note && (
        <p className="text-sm text-gray-600 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2" role="status">
          {note}
        </p>
      )}
      <label htmlFor="typed-answer" className="block font-semibold text-gray-900">
        Type your answer
      </label>
      <textarea
        id="typed-answer"
        ref={textRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="input-field"
        placeholder="I can see…"
        disabled={locked}
      />
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="submit"
          disabled={locked || !value.trim()}
          className="btn-primary flex-1 text-lg disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Send
        </button>
        <button type="button" onClick={onSpeakInstead} disabled={locked} className="btn-secondary flex-1">
          Speak instead
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// DONE
// ---------------------------------------------------------------------------

function DoneScreen({ attempt, studentName, onBack }) {
  const pack = attempt.pack || {}
  const student = pack.student || {}
  const endedByTeacher = attempt.closureReason === 'teacher_end' || attempt.closureReason === 'session_ended'

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title={pack.title || 'Speaking activity'} studentName={studentName} />
      <main className="max-w-3xl mx-auto p-4 space-y-4">
        <section className="card text-center" aria-live="polite">
          <h2 className="text-2xl font-bold text-gray-900">Your note is in the archive.</h2>
          <p className="text-gray-600 mt-2">
            {endedByTeacher ? 'Your teacher closed the activity. Thank you for your work.' : 'Thank you for your work.'}
          </p>
        </section>

        <Notebook labels={student.notebookLabels} notebook={attempt.notebook} />

        {pack.peerQuestion && (
          <section className="rounded-lg bg-amber-50 border-2 border-amber-300 p-6">
            <h3 className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">Now teach a partner</h3>
            <p className="text-lg font-medium text-gray-900 leading-snug">{pack.peerQuestion}</p>
          </section>
        )}

        <button type="button" onClick={onBack} className="btn-secondary w-full text-lg">
          Back
        </button>
      </main>
    </div>
  )
}
