// The Archive Apprentice model call.
// The model receives the pack and the student's confirmed transcript and may
// ONLY (a) map what was said onto pack concept IDs, (b) draft the four-box
// notebook in the student's words, (c) flag overclaim / off-topic, and
// (d) suggest one prompt ID from the server-provided candidate list.
// Every ID is validated here against the pack; anything else is discarded.
import Anthropic from '@anthropic-ai/sdk'
import { candidatePromptIds, promptById } from './speakingEngine.js'
import { NOTEBOOK_FIELDS } from './packService.js'

export const MODEL = process.env.SPEAKING_MODEL || 'claude-opus-5'
const MAX_BOX_CHARS = 140
const REQUEST_TIMEOUT_MS = 45_000

let client = null
function getClient() {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY,
      timeout: REQUEST_TIMEOUT_MS,
      maxRetries: 1
    })
  }
  return client
}

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    coveredConceptIds: { type: 'array', items: { type: 'string' } },
    overclaim: { type: 'boolean' },
    offTopic: { type: 'boolean' },
    notebook: {
      type: 'object',
      properties: {
        claim: { type: 'string' },
        because: { type: 'string' },
        notProved: { type: 'string' },
        nextEvidence: { type: 'string' }
      },
      required: ['claim', 'because', 'notProved', 'nextEvidence'],
      additionalProperties: false
    },
    nextPromptId: { anyOf: [{ type: 'string' }, { type: 'null' }] }
  },
  required: ['coveredConceptIds', 'overclaim', 'offTopic', 'notebook', 'nextPromptId'],
  additionalProperties: false
}

/**
 * Stable, cacheable system text for a pack (no per-turn content).
 */
function buildSystem(pack) {
  const concepts = pack.concepts.map((c) => `- ${c.id} (${c.kind}): ${c.label}`).join('\n')
  const evidence = pack.evidence.map((e) => `- ${e.id}: ${e.label} — ${e.detail}`).join('\n')
  const claims = pack.claims
    .map((c) => `- ${c.id}: "${c.text}" (evidence: ${c.evidenceIds.join(', ')}) — does NOT prove: ${c.doesNotProve}`)
    .join('\n')
  const prompts = [
    ...pack.probes.map((p) => `- ${p.id} (probe → ${p.targetsConceptId}): "${p.text}"`),
    ...pack.repairs.map((r) => `- ${r.id} (repair, trigger=${r.trigger} → ${r.targetsConceptId}): "${r.text}"`),
    `- reteach: "${pack.prompts.reteach}"`,
    `- done: "${pack.prompts.done}"`
  ].join('\n')
  const offLimits = pack.offLimits.map((o) => `- ${o}`).join('\n')

  return `You are the Archive Apprentice, an AI that RECORDS what a student explains. You are not a teacher, not a grader, and not a character. You never praise, never correct facts, never add information, and never pretend to be a person.

The student is an English learner (CEFR A2–B1, age 12–15) explaining evidence aloud. Their transcript may contain speech-recognition errors and simple English. Judge the MEANING, not the grammar.

Your ONLY job each turn:
1. Map what the student said onto the concept IDs below (coveredConceptIds). Include an ID only if the student actually expressed it in this turn. Never invent IDs.
2. Set overclaim=true only if the student said the evidence PROVES / definitely shows / must mean something, with no limit or doubt.
3. Set offTopic=true only if the turn says nothing about the object, the evidence, or the question.
4. Update the four-box notebook. Keep the student's own words where possible, simple English, at most about 15 words per box. Keep any existing box text unless the student changed or improved it. Never write something the student did not say. Leave a box empty ("") if the student has not covered it yet.
5. Suggest nextPromptId from the CANDIDATE list given in the user message, or null to let the system choose. Prefer a repair when there is an overclaim, otherwise a probe that targets a concept the student has not covered.

Never introduce content from this list, even if the student asks:
${offLimits}

PACK: ${pack.title}
Central question: ${pack.centralQuestion}

CONCEPTS (the only IDs you may use):
${concepts}

EVIDENCE:
${evidence}

TEACHER-APPROVED CLAIMS (with their limits — for your reference when judging overclaim; do not tell the student):
${claims}

PROMPTS (the only prompt IDs that exist):
${prompts}`
}

function buildUserMessage({ attempt, stateBefore, promptText, transcript, candidates }) {
  const nb = attempt.notebook || {}
  return `STATE: ${stateBefore}
PROMPT THE STUDENT WAS ANSWERING: "${promptText}"
CONCEPTS ALREADY COVERED IN EARLIER TURNS: ${(attempt.covered_concept_ids || []).join(', ') || '(none)'}
CURRENT NOTEBOOK:
- claim: "${nb.claim || ''}"
- because: "${nb.because || ''}"
- notProved: "${nb.notProved || ''}"
- nextEvidence: "${nb.nextEvidence || ''}"
CANDIDATE nextPromptId VALUES: ${candidates.join(', ') || '(none — return null)'}

STUDENT SAID (confirmed transcript):
"""
${transcript}
"""

Return the JSON object.`
}

function extractJson(response) {
  if (response.stop_reason === 'refusal') return null
  const block = response.content.find((b) => b.type === 'text')
  if (!block) return null
  try {
    return JSON.parse(block.text)
  } catch {
    return null
  }
}

/**
 * Validate and sanitise model output against the pack. Returns null when unusable.
 */
export function sanitiseAnalysis(raw, pack, attempt, stateBefore) {
  if (!raw || typeof raw !== 'object') return null
  const conceptIds = new Set(pack.concepts.map((c) => c.id))
  const covered = Array.isArray(raw.coveredConceptIds)
    ? [...new Set(raw.coveredConceptIds.filter((id) => conceptIds.has(id)))]
    : []
  const cumulative = new Set([...(attempt.covered_concept_ids || []), ...covered])
  const unresolved = pack.concepts.map((c) => c.id).filter((id) => !cumulative.has(id))

  const prev = attempt.notebook || {}
  const notebook = {}
  for (const key of NOTEBOOK_FIELDS) {
    const v = raw.notebook && typeof raw.notebook[key] === 'string' ? raw.notebook[key].trim() : ''
    // never lose a student's earlier note
    notebook[key] = (v || prev[key] || '').slice(0, MAX_BOX_CHARS)
  }

  const candidates = new Set(candidatePromptIds(pack, stateBefore))
  const nextPromptId =
    typeof raw.nextPromptId === 'string' && candidates.has(raw.nextPromptId) && promptById(pack, raw.nextPromptId)
      ? raw.nextPromptId
      : null

  return {
    coveredConceptIds: covered,
    unresolvedConceptIds: unresolved,
    overclaim: raw.overclaim === true,
    offTopic: raw.offTopic === true,
    notebook,
    nextPromptId,
    fallback: false
  }
}

/**
 * Run the apprentice on one confirmed student turn.
 * Never throws for model problems: returns { analysis: null, error } so the
 * caller can apply the authored fallback.
 */
export async function analyseTurn({ pack, attempt, stateBefore, promptText, transcript }) {
  const started = Date.now()
  const candidates = candidatePromptIds(pack, stateBefore)
  try {
    const response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 4096,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      thinking: { type: 'adaptive' },
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: OUTPUT_SCHEMA }
      },
      system: [{ type: 'text', text: buildSystem(pack), cache_control: { type: 'ephemeral' } }],
      messages: [
        { role: 'user', content: buildUserMessage({ attempt, stateBefore, promptText, transcript, candidates }) }
      ]
    })
    const latencyMs = Date.now() - started
    if (response.stop_reason === 'refusal') {
      return { analysis: null, latencyMs, model: response.model || MODEL, error: 'refusal' }
    }
    const raw = extractJson(response)
    const analysis = sanitiseAnalysis(raw, pack, attempt, stateBefore)
    if (!analysis) {
      return { analysis: null, latencyMs, model: response.model || MODEL, error: 'unparseable_output' }
    }
    return { analysis, latencyMs, model: response.model || MODEL, error: null }
  } catch (err) {
    const latencyMs = Date.now() - started
    let kind = 'api_error'
    if (err instanceof Anthropic.RateLimitError) kind = 'rate_limited'
    else if (err instanceof Anthropic.AuthenticationError) kind = 'auth_error'
    else if (err instanceof Anthropic.BadRequestError) kind = `bad_request: ${err.message}`
    else if (err instanceof Anthropic.APIConnectionError) kind = 'connection_error'
    else if (err instanceof Anthropic.APIError) kind = `api_error_${err.status}`
    else kind = `error: ${err.message}`
    console.error('Apprentice model error:', kind)
    return { analysis: null, latencyMs, model: MODEL, error: kind }
  }
}
