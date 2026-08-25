// Speaking packs: load, validate, and project.
// Packs are hand-authored JSON files in backend/packs/. See docs/SPEAKING_PACKS.md
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const here = path.dirname(fileURLToPath(import.meta.url))
const PACKS_DIR = path.resolve(here, '../../packs')

const REPAIR_TRIGGERS = ['overclaim', 'missing_link', 'off_topic']
const NOTEBOOK_KEYS = ['claim', 'because', 'notProved', 'nextEvidence']

let cache = null

function fail(packLabel, msg) {
  throw new Error(`Pack ${packLabel}: ${msg}`)
}

function assertString(pack, obj, key, label) {
  if (typeof obj[key] !== 'string' || !obj[key].trim()) fail(pack.id || '?', `${label}.${key} must be a non-empty string`)
}

function assertArray(pack, obj, key, label, min = 1) {
  if (!Array.isArray(obj[key]) || obj[key].length < min) fail(pack.id || '?', `${label}.${key} must be an array with at least ${min} item(s)`)
}

function assertUniqueIds(pack, items, label) {
  const seen = new Set()
  for (const it of items) {
    if (typeof it.id !== 'string' || !it.id) fail(pack.id, `${label} item is missing an id`)
    if (seen.has(it.id)) fail(pack.id, `${label} has duplicate id ${it.id}`)
    seen.add(it.id)
  }
  return seen
}

/**
 * Validate a pack object. Throws with a precise message on the first problem.
 */
export function validatePack(pack) {
  if (!pack || typeof pack !== 'object') throw new Error('Pack must be an object')
  const label = pack.id || '?'
  for (const k of ['id', 'blockId', 'title', 'centralQuestion']) assertString(pack, pack, k, 'pack')
  if (!/^[a-z0-9-]+$/.test(pack.id)) fail(label, 'id must be a lowercase slug (a-z, 0-9, -)')
  if (!Number.isInteger(pack.version) || pack.version < 1) fail(label, 'version must be a positive integer')
  if (!Number.isInteger(pack.maxTurns) || pack.maxTurns < 2 || pack.maxTurns > 12) fail(label, 'maxTurns must be an integer between 2 and 12')
  assertString(pack, pack, 'peerQuestion', 'pack')

  // student-safe block
  if (!pack.student || typeof pack.student !== 'object') fail(label, 'student block is required')
  assertString(pack, pack.student, 'intro', 'student')
  assertArray(pack, pack.student, 'terms', 'student', 1)
  if (pack.student.terms.length > 8) fail(label, 'student.terms should be 4–6 items (max 8)')
  for (const t of pack.student.terms) {
    assertString(pack, t, 'term', 'student.terms[]')
    assertString(pack, t, 'gloss', 'student.terms[]')
  }
  if (!pack.student.frames || !Array.isArray(pack.student.frames.support) || !Array.isArray(pack.student.frames.challenge)) {
    fail(label, 'student.frames.support and student.frames.challenge must be arrays')
  }
  if (!pack.student.notebookLabels) fail(label, 'student.notebookLabels is required')
  for (const k of NOTEBOOK_KEYS) assertString(pack, pack.student.notebookLabels, k, 'student.notebookLabels')

  // evidence / claims / concepts
  assertArray(pack, pack, 'evidence', 'pack', 1)
  const evidenceIds = assertUniqueIds(pack, pack.evidence, 'evidence')
  for (const e of pack.evidence) {
    assertString(pack, e, 'label', 'evidence[]')
    assertString(pack, e, 'detail', 'evidence[]')
  }

  assertArray(pack, pack, 'claims', 'pack', 1)
  assertUniqueIds(pack, pack.claims, 'claims')
  for (const c of pack.claims) {
    assertString(pack, c, 'text', 'claims[]')
    assertString(pack, c, 'doesNotProve', 'claims[]')
    assertArray(pack, c, 'evidenceIds', 'claims[]', 1)
    for (const id of c.evidenceIds) if (!evidenceIds.has(id)) fail(label, `claim ${c.id} references unknown evidence ${id}`)
  }

  assertArray(pack, pack, 'concepts', 'pack', 2)
  const conceptIds = assertUniqueIds(pack, pack.concepts, 'concepts')
  for (const c of pack.concepts) {
    assertString(pack, c, 'label', 'concepts[]')
    assertString(pack, c, 'kind', 'concepts[]')
  }

  // prompts
  if (!pack.prompts) fail(label, 'prompts block is required')
  for (const k of ['firstTeach', 'reteach', 'done']) assertString(pack, pack.prompts, k, 'prompts')

  assertArray(pack, pack, 'probes', 'pack', 1)
  const probeIds = assertUniqueIds(pack, pack.probes, 'probes')
  for (const p of pack.probes) {
    assertString(pack, p, 'text', 'probes[]')
    if (!conceptIds.has(p.targetsConceptId)) fail(label, `probe ${p.id} targets unknown concept ${p.targetsConceptId}`)
  }

  assertArray(pack, pack, 'repairs', 'pack', 1)
  const repairIds = assertUniqueIds(pack, pack.repairs, 'repairs')
  for (const r of pack.repairs) {
    assertString(pack, r, 'text', 'repairs[]')
    if (!REPAIR_TRIGGERS.includes(r.trigger)) fail(label, `repair ${r.id} has unknown trigger ${r.trigger}`)
    if (!conceptIds.has(r.targetsConceptId)) fail(label, `repair ${r.id} targets unknown concept ${r.targetsConceptId}`)
  }
  for (const id of probeIds) if (repairIds.has(id)) fail(label, `id ${id} is used by both a probe and a repair`)
  for (const id of ['first_teach', 'reteach', 'done']) {
    if (probeIds.has(id) || repairIds.has(id)) fail(label, `id ${id} is reserved`)
  }

  if (!Array.isArray(pack.offLimits)) fail(label, 'offLimits must be an array')
  return true
}

/**
 * Load every pack from disk (cached). Throws if any pack is invalid so the
 * server refuses to start with a bad pack rather than failing mid-lesson.
 */
export function loadPacks({ force = false } = {}) {
  if (cache && !force) return cache
  const packs = new Map()
  if (!fs.existsSync(PACKS_DIR)) {
    console.warn(`⚠️ No packs directory at ${PACKS_DIR}`)
    cache = packs
    return cache
  }
  for (const file of fs.readdirSync(PACKS_DIR).filter((f) => f.endsWith('.json')).sort()) {
    const raw = fs.readFileSync(path.join(PACKS_DIR, file), 'utf8')
    let pack
    try {
      pack = JSON.parse(raw)
    } catch (e) {
      throw new Error(`Pack file ${file} is not valid JSON: ${e.message}`)
    }
    validatePack(pack)
    if (packs.has(pack.id)) throw new Error(`Duplicate pack id ${pack.id} (${file})`)
    packs.set(pack.id, Object.freeze(pack))
  }
  cache = packs
  console.log(`📦 Loaded ${packs.size} speaking pack(s): ${[...packs.keys()].join(', ') || '(none)'}`)
  return cache
}

export function getPack(id) {
  return loadPacks().get(id) || null
}

export function listPacks() {
  return [...loadPacks().values()].map((p) => ({
    id: p.id,
    version: p.version,
    blockId: p.blockId,
    title: p.title,
    maxTurns: p.maxTurns
  }))
}

/**
 * The only view of a pack a student may receive.
 */
export function studentProjection(pack) {
  if (!pack) return null
  return {
    id: pack.id,
    version: pack.version,
    title: pack.title,
    centralQuestion: pack.centralQuestion,
    student: pack.student,
    evidence: pack.evidence.map((e) => ({ id: e.id, label: e.label, detail: e.detail, imageUrl: e.imageUrl || null })),
    peerQuestion: pack.peerQuestion,
    maxTurns: pack.maxTurns
  }
}

export function conceptIdSet(pack) {
  return new Set(pack.concepts.map((c) => c.id))
}

export const NOTEBOOK_FIELDS = NOTEBOOK_KEYS
