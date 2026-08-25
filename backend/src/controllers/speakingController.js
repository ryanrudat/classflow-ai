// Speaking packs — attempts and turns. See docs/SPEAKING_PACKS.md
import multer from 'multer'
import pool from '../database/db.js'
import { getPack, listPacks as listPackSummaries, studentProjection } from '../services/packService.js'
import { SPEAKING_STATES, decideTransition, fallbackAnalysis, promptById } from '../services/speakingEngine.js'
import { analyseTurn, MODEL } from '../services/apprenticeService.js'
import { transcribeStudentSpeech } from '../services/reverseTutoringService.js'

export const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream' || file.mimetype === 'video/webm' || file.mimetype === 'video/mp4') {
      cb(null, true)
    } else {
      cb(new Error('Only audio files are allowed'))
    }
  }
})

const MAX_TEXT_CHARS = 2000

// ---------- helpers ----------

function emptyNotebook() {
  return { claim: '', because: '', notProved: '', nextEvidence: '' }
}

async function loadSession(id, db = pool) {
  const r = await db.query(
    'SELECT id, title, teacher_id, status, grace_period_ends_at FROM sessions WHERE id = $1',
    [id]
  )
  return r.rows[0] || null
}

function sessionOpen(session) {
  if (!session) return false
  if (session.status === 'active') return true
  if (session.grace_period_ends_at && new Date() < new Date(session.grace_period_ends_at)) return true
  return false
}

async function loadStudent(studentId, sessionId, db = pool) {
  if (!studentId || !sessionId) return null
  const r = await db.query(
    'SELECT id, session_id, student_name FROM session_students WHERE id = $1 AND session_id = $2',
    [studentId, sessionId]
  )
  return r.rows[0] || null
}

async function loadSessionPack(sessionId, db = pool) {
  const r = await db.query('SELECT pack_id, pack_version FROM speaking_session_packs WHERE session_id = $1', [sessionId])
  return r.rows[0] || null
}

async function loadAttempt(id, db = pool, { forUpdate = false } = {}) {
  const r = await db.query(`SELECT * FROM speaking_attempts WHERE id = $1${forUpdate ? ' FOR UPDATE' : ''}`, [id])
  return r.rows[0] || null
}

function formatAttempt(row, pack) {
  return {
    id: row.id,
    sessionId: row.session_id,
    studentId: row.student_id,
    packId: row.pack_id,
    packVersion: row.pack_version,
    state: row.state,
    stateVersion: row.state_version,
    turnCount: row.turn_count,
    maxTurns: pack ? pack.maxTurns : null,
    prompt: row.current_prompt_id ? { id: row.current_prompt_id, text: row.current_prompt_text } : null,
    notebook: { ...emptyNotebook(), ...(row.notebook || {}) },
    coveredConceptIds: row.covered_concept_ids || [],
    needsTeacherReview: row.needs_teacher_review,
    closureReason: row.closure_reason,
    pack: studentProjection(pack),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function formatTurn(row) {
  return {
    id: row.id,
    turnId: row.client_turn_id,
    stateBefore: row.state_before,
    stateAfter: row.state_after,
    prompt: row.prompt_id ? { id: row.prompt_id, text: row.prompt_text } : null,
    rawAsr: row.raw_asr,
    text: row.confirmed_text,
    transcriptEdited: row.transcript_edited,
    coveredConceptIds: row.covered_concept_ids || [],
    unresolvedConceptIds: row.unresolved_concept_ids || [],
    overclaim: row.overclaim,
    offTopic: row.off_topic,
    notebookAfter: row.notebook_after,
    nextPrompt: row.next_prompt_id ? { id: row.next_prompt_id, text: row.next_prompt_text } : null,
    model: { name: row.model_name, latencyMs: row.model_latency_ms, fallback: row.model_fallback, error: row.model_error },
    createdAt: row.created_at
  }
}

function teacherOwns(session, req) {
  return req.user && session && session.teacher_id === req.user.userId
}

/** Resolve the caller as either the owning teacher or the attempt's student. */
async function authoriseAttempt(req, res, attempt, { allowTeacher = true } = {}) {
  const session = await loadSession(attempt.session_id)
  if (!session) {
    res.status(404).json({ message: 'Session not found' })
    return null
  }
  if (allowTeacher && teacherOwns(session, req)) return { session, role: 'teacher' }
  const studentId = req.body?.studentId || req.query?.studentId
  if (studentId && studentId === attempt.student_id) return { session, role: 'student' }
  res.status(403).json({ message: 'Not allowed for this attempt' })
  return null
}

// ---------- teacher: packs ----------

export async function listPacks(req, res) {
  res.json({ packs: listPackSummaries() })
}

export async function getSessionPack(req, res) {
  try {
    const { sessionId } = req.params
    const session = await loadSession(sessionId)
    if (!session) return res.status(404).json({ message: 'Session not found' })

    const assigned = await loadSessionPack(sessionId)
    const pack = assigned ? getPack(assigned.pack_id) : null

    if (teacherOwns(session, req)) {
      return res.json({ pack: pack ? { ...pack, assignedVersion: assigned.pack_version } : null })
    }

    const student = await loadStudent(req.query.studentId, sessionId)
    if (!student) return res.status(403).json({ message: 'Join the session first' })
    return res.json({ pack: studentProjection(pack) })
  } catch (error) {
    console.error('getSessionPack error:', error)
    res.status(500).json({ message: 'Failed to load pack' })
  }
}

export async function assignPack(req, res) {
  try {
    const { sessionId } = req.params
    const { packId } = req.body
    const session = await loadSession(sessionId)
    if (!session) return res.status(404).json({ message: 'Session not found' })
    if (!teacherOwns(session, req)) return res.status(403).json({ message: 'Not your session' })

    const attempts = await pool.query('SELECT COUNT(*)::int AS n FROM speaking_attempts WHERE session_id = $1', [sessionId])
    if (attempts.rows[0].n > 0) {
      return res.status(409).json({ message: 'Students have already started this pack. Create a new session to use a different pack.' })
    }

    if (!packId) {
      await pool.query('DELETE FROM speaking_session_packs WHERE session_id = $1', [sessionId])
      return res.json({ pack: null })
    }

    const pack = getPack(packId)
    if (!pack) return res.status(404).json({ message: 'Unknown pack' })

    await pool.query(
      `INSERT INTO speaking_session_packs (session_id, pack_id, pack_version)
       VALUES ($1, $2, $3)
       ON CONFLICT (session_id) DO UPDATE SET pack_id = EXCLUDED.pack_id, pack_version = EXCLUDED.pack_version, assigned_at = NOW()`,
      [sessionId, pack.id, pack.version]
    )
    res.json({ pack: { ...pack, assignedVersion: pack.version } })
  } catch (error) {
    console.error('assignPack error:', error)
    res.status(500).json({ message: 'Failed to assign pack' })
  }
}

// ---------- student: attempts ----------

export async function startAttempt(req, res) {
  try {
    const { sessionId, studentId } = req.body
    if (!sessionId || !studentId) return res.status(400).json({ message: 'sessionId and studentId are required' })

    const session = await loadSession(sessionId)
    if (!session) return res.status(404).json({ message: 'Session not found' })
    if (!sessionOpen(session)) return res.status(423).json({ message: 'The session is paused or has ended', code: 'SESSION_CLOSED' })

    const student = await loadStudent(studentId, sessionId)
    if (!student) return res.status(403).json({ message: 'Join the session first' })

    const assigned = await loadSessionPack(sessionId)
    const pack = assigned ? getPack(assigned.pack_id) : null
    if (!pack) return res.status(409).json({ message: 'No pack has been chosen for this session yet', code: 'NO_PACK' })

    await pool.query(
      `INSERT INTO speaking_attempts (session_id, student_id, pack_id, pack_version, notebook)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (session_id, student_id, pack_id, pack_version) DO NOTHING`,
      [sessionId, studentId, pack.id, assigned.pack_version, JSON.stringify(emptyNotebook())]
    )
    const r = await pool.query(
      'SELECT * FROM speaking_attempts WHERE session_id = $1 AND student_id = $2 AND pack_id = $3 AND pack_version = $4',
      [sessionId, studentId, pack.id, assigned.pack_version]
    )
    res.json({ attempt: formatAttempt(r.rows[0], pack) })
  } catch (error) {
    console.error('startAttempt error:', error)
    res.status(500).json({ message: 'Failed to start the activity' })
  }
}

export async function getAttempt(req, res) {
  try {
    const attempt = await loadAttempt(req.params.id)
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' })
    const auth = await authoriseAttempt(req, res, attempt)
    if (!auth) return
    res.json({ attempt: formatAttempt(attempt, getPack(attempt.pack_id)) })
  } catch (error) {
    console.error('getAttempt error:', error)
    res.status(500).json({ message: 'Failed to load attempt' })
  }
}

export async function ready(req, res) {
  try {
    const attempt = await loadAttempt(req.params.id)
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' })
    const auth = await authoriseAttempt(req, res, attempt, { allowTeacher: false })
    if (!auth) return
    const pack = getPack(attempt.pack_id)
    if (!pack) return res.status(500).json({ message: 'Pack is no longer available' })

    if (attempt.state !== 'PLAN') {
      return res.status(409).json({ message: 'Already started', attempt: formatAttempt(attempt, pack) })
    }
    if (Number(req.body.stateVersion) !== attempt.state_version) {
      return res.status(409).json({ message: 'Out of date', attempt: formatAttempt(attempt, pack) })
    }
    if (!sessionOpen(auth.session)) return res.status(423).json({ message: 'The session is paused or has ended', code: 'SESSION_CLOSED' })

    const prompt = promptById(pack, 'first_teach')
    const r = await pool.query(
      `UPDATE speaking_attempts
       SET state = 'FIRST_TEACH', state_version = state_version + 1,
           current_prompt_id = $2, current_prompt_text = $3, updated_at = NOW()
       WHERE id = $1 AND state = 'PLAN'
       RETURNING *`,
      [attempt.id, prompt.id, prompt.text]
    )
    res.json({ attempt: formatAttempt(r.rows[0] || attempt, pack) })
  } catch (error) {
    console.error('ready error:', error)
    res.status(500).json({ message: 'Failed to start explaining' })
  }
}

export async function transcribe(req, res) {
  try {
    const attempt = await loadAttempt(req.params.id)
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' })
    const auth = await authoriseAttempt(req, res, attempt, { allowTeacher: false })
    if (!auth) return
    if (!sessionOpen(auth.session)) return res.status(423).json({ message: 'The session is paused or has ended', code: 'SESSION_CLOSED' })
    if (!req.file || !req.file.buffer || req.file.buffer.length < 100) {
      return res.status(400).json({ message: 'No audio received' })
    }
    const pack = getPack(attempt.pack_id)
    const context = pack
      ? `A student explains evidence about "${pack.title}". Key words: ${pack.student.terms.map((t) => t.term).join(', ')}.`
      : ''
    const result = await transcribeStudentSpeech(req.file.buffer, 'en', context)
    res.json({ rawAsr: (result.text || '').trim() })
  } catch (error) {
    console.error('transcribe error:', error)
    res.status(502).json({ message: 'Could not understand the recording. Try again, or type instead.', code: 'ASR_FAILED' })
  }
}

export async function submitTurn(req, res) {
  const { studentId, turnId, stateVersion } = req.body
  const text = typeof req.body.text === 'string' ? req.body.text.trim() : ''
  const rawAsr = typeof req.body.rawAsr === 'string' ? req.body.rawAsr : null

  if (!studentId || !turnId) return res.status(400).json({ message: 'studentId and turnId are required' })
  if (!text) return res.status(400).json({ message: 'Say or type something first' })
  if (text.length > MAX_TEXT_CHARS) return res.status(400).json({ message: 'That is too long for one turn' })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const attempt = await loadAttempt(req.params.id, client, { forUpdate: true })
    if (!attempt) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Attempt not found' })
    }
    if (attempt.student_id !== studentId) {
      await client.query('ROLLBACK')
      return res.status(403).json({ message: 'Not allowed for this attempt' })
    }
    const pack = getPack(attempt.pack_id)
    if (!pack) {
      await client.query('ROLLBACK')
      return res.status(500).json({ message: 'Pack is no longer available' })
    }

    // Idempotent replay
    const existing = await client.query(
      'SELECT * FROM speaking_turns WHERE attempt_id = $1 AND client_turn_id = $2',
      [attempt.id, turnId]
    )
    if (existing.rows[0]) {
      await client.query('COMMIT')
      return res.json({ attempt: formatAttempt(attempt, pack), turn: formatTurn(existing.rows[0]), replayed: true })
    }

    if (!SPEAKING_STATES.includes(attempt.state)) {
      await client.query('ROLLBACK')
      return res.status(409).json({ message: `No turn allowed in state ${attempt.state}`, attempt: formatAttempt(attempt, pack) })
    }
    if (Number(stateVersion) !== attempt.state_version) {
      await client.query('ROLLBACK')
      return res.status(409).json({ message: 'Out of date', attempt: formatAttempt(attempt, pack) })
    }
    const session = await loadSession(attempt.session_id, client)
    if (!sessionOpen(session)) {
      await client.query('ROLLBACK')
      return res.status(423).json({ message: 'The session is paused or has ended', code: 'SESSION_CLOSED' })
    }

    const stateBefore = attempt.state
    const promptText = attempt.current_prompt_text || ''

    // Model: map + notebook. Never throws; null analysis → authored fallback.
    const result = await analyseTurn({ pack, attempt, stateBefore, promptText, transcript: text })
    const analysis = result.analysis || fallbackAnalysis(pack, attempt)
    const usedFallback = !result.analysis

    const transition = decideTransition(pack, attempt, analysis)
    const cumulativeCovered = [...new Set([...(attempt.covered_concept_ids || []), ...analysis.coveredConceptIds])]
    const notebookAfter = analysis.notebook ? analysis.notebook : { ...emptyNotebook(), ...(attempt.notebook || {}) }
    const nextPrompt = transition.prompt

    const updated = await client.query(
      `UPDATE speaking_attempts
       SET state = $2, state_version = state_version + 1, turn_count = turn_count + 1,
           notebook = $3, covered_concept_ids = $4,
           current_prompt_id = $5, current_prompt_text = $6,
           needs_teacher_review = needs_teacher_review OR $7,
           closure_reason = COALESCE($8, closure_reason),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        attempt.id,
        transition.nextState,
        JSON.stringify(notebookAfter),
        JSON.stringify(cumulativeCovered),
        nextPrompt ? nextPrompt.id : null,
        nextPrompt ? nextPrompt.text : null,
        usedFallback,
        transition.closureReason
      ]
    )

    const turn = await client.query(
      `INSERT INTO speaking_turns
         (attempt_id, client_turn_id, state_before, state_after, prompt_id, prompt_text,
          raw_asr, confirmed_text, transcript_edited,
          covered_concept_ids, unresolved_concept_ids, overclaim, off_topic,
          notebook_after, next_prompt_id, next_prompt_text,
          model_name, model_latency_ms, model_fallback, model_error)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [
        attempt.id,
        turnId,
        stateBefore,
        transition.nextState,
        attempt.current_prompt_id,
        promptText,
        rawAsr,
        text,
        rawAsr !== null && rawAsr.trim() !== text,
        JSON.stringify(analysis.coveredConceptIds),
        JSON.stringify(analysis.unresolvedConceptIds),
        analysis.overclaim,
        analysis.offTopic,
        JSON.stringify(notebookAfter),
        nextPrompt ? nextPrompt.id : null,
        nextPrompt ? nextPrompt.text : null,
        result.model || MODEL,
        result.latencyMs || null,
        usedFallback,
        result.error || null
      ]
    )

    await client.query('COMMIT')
    res.json({ attempt: formatAttempt(updated.rows[0], pack), turn: formatTurn(turn.rows[0]) })
  } catch (error) {
    try { await client.query('ROLLBACK') } catch { /* ignore */ }
    console.error('submitTurn error:', error)
    res.status(500).json({ message: 'Could not record that turn. Please try again.' })
  } finally {
    client.release()
  }
}

export async function endAttempt(req, res) {
  try {
    const attempt = await loadAttempt(req.params.id)
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' })
    const auth = await authoriseAttempt(req, res, attempt)
    if (!auth) return
    const pack = getPack(attempt.pack_id)
    if (attempt.state === 'DONE') return res.json({ attempt: formatAttempt(attempt, pack) })

    const reason = auth.role === 'teacher' ? 'teacher_end' : 'student_end'
    const done = pack ? promptById(pack, 'done') : { id: 'done', text: '' }
    const r = await pool.query(
      `UPDATE speaking_attempts
       SET state = 'DONE', state_version = state_version + 1, closure_reason = $2,
           current_prompt_id = $3, current_prompt_text = $4, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [attempt.id, reason, done.id, done.text]
    )
    res.json({ attempt: formatAttempt(r.rows[0], pack) })
  } catch (error) {
    console.error('endAttempt error:', error)
    res.status(500).json({ message: 'Failed to end attempt' })
  }
}

// ---------- teacher: review ----------

export async function listAttempts(req, res) {
  try {
    const { sessionId } = req.params
    const session = await loadSession(sessionId)
    if (!session) return res.status(404).json({ message: 'Session not found' })
    if (!teacherOwns(session, req)) return res.status(403).json({ message: 'Not your session' })

    const r = await pool.query(
      `SELECT a.*, s.student_name
       FROM speaking_attempts a
       JOIN session_students s ON s.id = a.student_id
       WHERE a.session_id = $1
       ORDER BY s.student_name ASC`,
      [sessionId]
    )
    const attempts = r.rows.map((row) => {
      const pack = getPack(row.pack_id)
      return {
        id: row.id,
        studentId: row.student_id,
        studentName: row.student_name,
        state: row.state,
        turnCount: row.turn_count,
        maxTurns: pack ? pack.maxTurns : null,
        notebook: { ...emptyNotebook(), ...(row.notebook || {}) },
        needsTeacherReview: row.needs_teacher_review,
        closureReason: row.closure_reason,
        updatedAt: row.updated_at
      }
    })
    res.json({ attempts })
  } catch (error) {
    console.error('listAttempts error:', error)
    res.status(500).json({ message: 'Failed to load attempts' })
  }
}

export async function reviewAttempt(req, res) {
  try {
    const attempt = await loadAttempt(req.params.id)
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' })
    const session = await loadSession(attempt.session_id)
    if (!teacherOwns(session, req)) return res.status(403).json({ message: 'Not your session' })

    const pack = getPack(attempt.pack_id)
    const student = await pool.query('SELECT student_name FROM session_students WHERE id = $1', [attempt.student_id])
    const turns = await pool.query('SELECT * FROM speaking_turns WHERE attempt_id = $1 ORDER BY created_at ASC', [attempt.id])
    res.json({
      attempt: { ...formatAttempt(attempt, pack), studentName: student.rows[0]?.student_name || null },
      turns: turns.rows.map(formatTurn)
    })
  } catch (error) {
    console.error('reviewAttempt error:', error)
    res.status(500).json({ message: 'Failed to load review' })
  }
}
