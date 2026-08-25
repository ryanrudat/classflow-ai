# Speaking Packs — contract (v1)

A **pack** is one unit's worth of speaking material, hand-authored as JSON in
`backend/packs/<id>.json`, validated at server start, immutable once assigned to
a session (an attempt records `pack_id` + `pack_version`). The AI never sees the
unit as prose; it sees the pack and may only *map* what the student said onto
pack IDs and *choose* among authored prompts. The server owns state.

## Pack JSON

```jsonc
{
  "id": "stage0-object-no-label",      // stable slug
  "version": 1,                        // bump when content changes
  "blockId": "stage_0",                // course block this belongs to
  "title": "The Object With No Label",
  "centralQuestion": "What can we say about this object from the evidence — and what can't we say yet?",

  "student": {                         // everything here is safe to show a student
    "intro": "...",                    // plan-screen text, A2 English
    "terms": [{ "term": "mark", "gloss": "a line or cut on a surface" }],   // 4–6
    "frames": {
      "support":   ["I can see ___.", "I think ___ because ___."],
      "challenge": ["The evidence shows ___, but it does not prove ___."]
    },
    "notebookLabels": { "claim": "I think", "because": "Because (evidence)", "notProved": "Not proved", "nextEvidence": "Next evidence" }
  },

  "evidence":  [{ "id": "ev_holes", "label": "Five small holes in a row", "detail": "...", "imageUrl": null }],
  "claims":    [{ "id": "claim_tool", "text": "The object was used as a tool", "evidenceIds": ["ev_holes"], "doesNotProve": "that the holes were made on purpose" }],

  "concepts":  [                       // the allowlist the model maps speech onto
    { "id": "c_observe_holes", "label": "Describes the holes", "kind": "observation" },
    { "id": "c_infer_use",     "label": "Suggests a use",      "kind": "inference" },
    { "id": "c_limit",         "label": "Says what is not proved", "kind": "limit" }
  ],

  "prompts": {                         // authored, server-issued
    "firstTeach": "Look at the object. Tell me what you can see, and what you think it was for.",
    "reteach":    "Now explain the whole thing again in your own words — what you see, what you think, and what is not proved.",
    "done":       "Your note is recorded. Now teach a partner."
  },
  "probes":  [{ "id": "probe_limit_01", "text": "What does this evidence not prove yet?", "targetsConceptId": "c_limit" }],
  "repairs": [{ "id": "repair_overclaim_01", "trigger": "overclaim", "text": "You said the holes prove it was a tool. Can you make that more careful?", "targetsConceptId": "c_limit" }],

  "offLimits": ["what the object really is", "dates or places"],   // model must not introduce
  "maxTurns": 6,
  "peerQuestion": "Ask your partner: what is one thing the evidence does NOT prove?"
}
```

**Student-safe projection** (what `GET .../pack` returns to a student and what
is embedded in `attempt.pack`): `id, version, title, centralQuestion, student,
evidence, peerQuestion, maxTurns`. Never `claims`, `concepts`, `probes`,
`repairs`, `offLimits`, `prompts`.

## State machine (server-owned)

```
PLAN ──ready──▶ FIRST_TEACH ──turn──▶ PROBE ──turn──▶ REPAIR ──turn──▶ RETEACH ──turn──▶ DONE
                                                  └──(no defect)─────────▶ RETEACH
```

- Every student turn: confirm transcript → model maps to concept IDs + drafts
  the four-box notebook → server validates every ID against the pack → server
  picks the next state and the next authored prompt.
- `FIRST_TEACH` always leads to a `PROBE`. The probe targets the first
  unresolved concept (or the `limit` concept if the first teach overclaimed).
- After the probe answer: `REPAIR` if the answer overclaims, or if a `link`
  concept is still unresolved and the pack has a `missing_link` repair;
  otherwise straight to `RETEACH`. `REPAIR` prompt = repair matching the trigger.
- `DONE` when `RETEACH` is answered, when `turnCount >= maxTurns`, or on
  end (`closureReason`: `completed`, `max_turns`, `student_end`,
  `teacher_end`, `session_ended`).
- Invalid or refused model output → authored fallback (prompt for the state,
  notebook unchanged, `needs_teacher_review = true`). The turn always completes.
- Off-topic speech is **redirected** (same prompt again), never warned or blocked.

## Model call

`claude-opus-5`, adaptive thinking at `effort: "low"`, JSON output constrained
by `output_config.format` (json_schema), `fallbacks: "default"`. Model may only
return IDs from the pack; `nextPromptId` must be from the candidate list the
server passes for the current state, otherwise the server chooses.

```jsonc
// model output schema
{
  "coveredConceptIds": ["c_observe_holes"],
  "unresolvedConceptIds": ["c_limit"],
  "overclaim": true,
  "offTopic": false,
  "notebook": { "claim": "...", "because": "...", "notProved": "...", "nextEvidence": "..." },  // A2 English, ≤ 15 words each, student's own words where possible
  "nextPromptId": "repair_overclaim_01"
}
```

## HTTP API

Student routes carry `studentId` (a `session_students.id` for that session)
— same identity model as the join flow. Teacher routes need the teacher JWT and
session ownership.

| Method | Path | Who | Body / query | Returns |
|---|---|---|---|---|
| GET | `/api/speaking/packs` | teacher | — | `{ packs: [{ id, version, blockId, title, maxTurns }] }` |
| GET | `/api/speaking/sessions/:sessionId/pack` | teacher, or student `?studentId=` | — | `{ pack }` (full for teacher, projection for student) or `{ pack: null }` |
| PUT | `/api/speaking/sessions/:sessionId/pack` | teacher | `{ packId }` (null to unassign) | `{ pack }` |
| POST | `/api/speaking/attempts` | student | `{ sessionId, studentId }` | `{ attempt }` — creates or returns the existing attempt |
| GET | `/api/speaking/attempts/:id` | student `?studentId=` / teacher | — | `{ attempt }` |
| POST | `/api/speaking/attempts/:id/ready` | student | `{ studentId, stateVersion }` | `{ attempt }` (PLAN → FIRST_TEACH) |
| POST | `/api/speaking/attempts/:id/transcribe` | student | multipart `audio`, `studentId` | `{ rawAsr }` |
| POST | `/api/speaking/attempts/:id/turns` | student | `{ studentId, turnId, stateVersion, text, rawAsr? }` | `{ attempt, turn }` |
| POST | `/api/speaking/attempts/:id/end` | student `{ studentId }` / teacher | `{ reason? }` | `{ attempt }` |
| GET | `/api/speaking/sessions/:sessionId/attempts` | teacher | — | `{ attempts: [{ id, studentId, studentName, state, turnCount, maxTurns, notebook, needsTeacherReview, closureReason, updatedAt }] }` |
| GET | `/api/speaking/attempts/:id/review` | teacher | — | `{ attempt, turns: [turn] }` |

Errors: `409 { message, attempt }` on `stateVersion` mismatch (client re-syncs
from `attempt`); `409` when the session has no pack; `403` when `studentId` does
not belong to the session; `423` when the session is paused/ended.
Idempotency: a repeated `turnId` returns the stored result without reprocessing.

### `attempt` shape

```jsonc
{
  "id": "…", "sessionId": "…", "studentId": "…",
  "packId": "stage0-object-no-label", "packVersion": 1,
  "state": "PROBE", "stateVersion": 3, "turnCount": 1, "maxTurns": 6,
  "prompt": { "id": "probe_limit_01", "text": "What does this evidence not prove yet?" },   // null in PLAN/DONE
  "notebook": { "claim": "", "because": "", "notProved": "", "nextEvidence": "" },
  "coveredConceptIds": ["c_observe_holes"],
  "needsTeacherReview": false, "closureReason": null,
  "pack": { /* student projection */ },
  "createdAt": "…", "updatedAt": "…"
}
```

### `turn` shape

```jsonc
{
  "id": "…", "turnId": "client-uuid", "stateBefore": "FIRST_TEACH", "stateAfter": "PROBE",
  "prompt": { "id": "first_teach", "text": "…" },
  "rawAsr": "…", "text": "…", "transcriptEdited": false,
  "coveredConceptIds": [], "unresolvedConceptIds": [], "overclaim": false, "offTopic": false,
  "notebookAfter": { … }, "nextPrompt": { "id": "…", "text": "…" },
  "model": { "name": "claude-opus-5", "latencyMs": 1200, "fallback": false },
  "createdAt": "…"
}
```

## Storage (migration 029, additive)

`speaking_session_packs` (session → pack id/version), `speaking_attempts`
(one per student × session × pack version), `speaking_turns` (one per turn;
raw ASR and confirmed text in separate columns; model metadata per turn).
Nothing writes to any pre-existing table.
