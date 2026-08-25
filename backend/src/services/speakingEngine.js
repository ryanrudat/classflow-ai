// Server-owned state machine for a speaking attempt.
// PLAN → FIRST_TEACH → PROBE → REPAIR → RETEACH → DONE (see docs/SPEAKING_PACKS.md)
// The model never chooses a state; it may only suggest a prompt from the
// candidate list for the current state, and the server checks that.

export const STATES = ['PLAN', 'FIRST_TEACH', 'PROBE', 'REPAIR', 'RETEACH', 'DONE']
export const SPEAKING_STATES = ['FIRST_TEACH', 'PROBE', 'REPAIR', 'RETEACH']

const RESERVED = {
  first_teach: (pack) => ({ id: 'first_teach', text: pack.prompts.firstTeach }),
  reteach: (pack) => ({ id: 'reteach', text: pack.prompts.reteach }),
  done: (pack) => ({ id: 'done', text: pack.prompts.done })
}

export function findProbe(pack, id) {
  return pack.probes.find((p) => p.id === id) || null
}

export function findRepair(pack, id) {
  return pack.repairs.find((r) => r.id === id) || null
}

/** Probe that targets the first unresolved concept, else the first probe. */
export function chooseProbe(pack, unresolvedConceptIds) {
  for (const cid of unresolvedConceptIds) {
    const p = pack.probes.find((x) => x.targetsConceptId === cid)
    if (p) return p
  }
  return pack.probes[0]
}

/** Repair for a trigger, else the first repair. */
export function chooseRepair(pack, trigger) {
  return pack.repairs.find((r) => r.trigger === trigger) || pack.repairs[0]
}

/**
 * Prompt IDs the model is allowed to suggest after a turn in `stateBefore`.
 * Everything else is ignored and the server picks.
 */
export function candidatePromptIds(pack, stateBefore) {
  switch (stateBefore) {
    case 'FIRST_TEACH':
      return pack.probes.map((p) => p.id)
    case 'PROBE':
      return [...pack.repairs.map((r) => r.id), 'reteach']
    case 'REPAIR':
      return ['reteach']
    case 'RETEACH':
      return ['done']
    default:
      return []
  }
}

export function promptById(pack, id) {
  if (RESERVED[id]) return RESERVED[id](pack)
  const probe = findProbe(pack, id)
  if (probe) return { id: probe.id, text: probe.text }
  const repair = findRepair(pack, id)
  if (repair) return { id: repair.id, text: repair.text }
  return null
}

/**
 * Decide the transition after a student turn.
 *
 * @param {object} pack
 * @param {object} attempt   row: { state, turn_count, current_prompt_id, current_prompt_text }
 * @param {object} analysis  validated model output: { overclaim, offTopic, unresolvedConceptIds, nextPromptId }
 * @returns {{ nextState: string, prompt: {id,text}|null, closureReason: string|null }}
 */
export function decideTransition(pack, attempt, analysis) {
  const stateBefore = attempt.state
  const turnCountAfter = (attempt.turn_count || 0) + 1
  const unresolved = analysis.unresolvedConceptIds || []
  const candidates = new Set(candidatePromptIds(pack, stateBefore))
  const suggested = analysis.nextPromptId && candidates.has(analysis.nextPromptId) ? analysis.nextPromptId : null

  // Off-topic: redirect with the same prompt, stay in state (still counts as a turn).
  if (analysis.offTopic && stateBefore !== 'RETEACH') {
    if (turnCountAfter >= pack.maxTurns) {
      return { nextState: 'DONE', prompt: RESERVED.done(pack), closureReason: 'max_turns' }
    }
    return {
      nextState: stateBefore,
      prompt: { id: attempt.current_prompt_id, text: attempt.current_prompt_text },
      closureReason: null
    }
  }

  let nextState
  let prompt

  switch (stateBefore) {
    case 'FIRST_TEACH': {
      // Always probe first (spec sequence: first teach → probe → repair → re-teach).
      // An overclaim now steers the probe toward the limit concept; the repair
      // decision is made after the student answers the probe.
      nextState = 'PROBE'
      if (suggested && findProbe(pack, suggested)) {
        prompt = promptById(pack, suggested)
      } else if (analysis.overclaim) {
        const limitConcept = pack.concepts.find((c) => c.kind === 'limit')
        const p = (limitConcept && pack.probes.find((x) => x.targetsConceptId === limitConcept.id)) || chooseProbe(pack, unresolved)
        prompt = { id: p.id, text: p.text }
      } else {
        const p = chooseProbe(pack, unresolved)
        prompt = { id: p.id, text: p.text }
      }
      break
    }
    case 'PROBE': {
      const stillUnresolvedKinds = new Set(
        pack.concepts.filter((c) => unresolved.includes(c.id)).map((c) => c.kind)
      )
      if (suggested && findRepair(pack, suggested)) {
        nextState = 'REPAIR'
        prompt = promptById(pack, suggested)
      } else if (analysis.overclaim) {
        nextState = 'REPAIR'
        const r = chooseRepair(pack, 'overclaim')
        prompt = { id: r.id, text: r.text }
      } else if (stillUnresolvedKinds.has('link') && pack.repairs.some((r) => r.trigger === 'missing_link')) {
        nextState = 'REPAIR'
        const r = chooseRepair(pack, 'missing_link')
        prompt = { id: r.id, text: r.text }
      } else {
        nextState = 'RETEACH'
        prompt = RESERVED.reteach(pack)
      }
      break
    }
    case 'REPAIR': {
      nextState = 'RETEACH'
      prompt = RESERVED.reteach(pack)
      break
    }
    case 'RETEACH': {
      return { nextState: 'DONE', prompt: RESERVED.done(pack), closureReason: 'completed' }
    }
    default:
      throw new Error(`No turn allowed in state ${stateBefore}`)
  }

  // Turn cap: never leave the student in a loop.
  if (turnCountAfter >= pack.maxTurns && nextState !== 'DONE') {
    return { nextState: 'DONE', prompt: RESERVED.done(pack), closureReason: 'max_turns' }
  }

  return { nextState, prompt, closureReason: null }
}

/**
 * Authored fallback when the model output is unusable: keep the notebook,
 * move on deterministically so the student is never stuck.
 */
export function fallbackAnalysis(pack, attempt) {
  return {
    coveredConceptIds: [],
    unresolvedConceptIds: pack.concepts
      .map((c) => c.id)
      .filter((id) => !(attempt.covered_concept_ids || []).includes(id)),
    overclaim: false,
    offTopic: false,
    notebook: null,
    nextPromptId: null,
    fallback: true
  }
}
