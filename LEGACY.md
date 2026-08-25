# Legacy code

On 25 August 2026 the app was cut down to its speaking core. Everything that is
not part of **teacher login → session → student join → speaking activity → teacher
review** was moved out of the build into `legacy/` (with `git mv`, so history is
intact). No database tables, columns, or rows were changed.

## What is live

| Area | Backend | Frontend |
|---|---|---|
| Teacher auth | `routes/auth.js`, `controllers/authController.js`, `middleware/auth.js` | `pages/Login.jsx`, `pages/Register.jsx`, `stores/authStore.js` |
| Sessions (one per class period) | `routes/sessions.js`, `controllers/sessionController.js`, `middleware/sessionStatus.js`, `utils/generateCode.js` | `pages/TeacherDashboard.jsx`, `components/SessionJoinCard.jsx` |
| Student join | `POST /api/sessions/join` | `pages/StudentView.jsx` |
| Speaking activity (reverse tutoring) | `routes/reverseTutoring.js`, `controllers/reverseTutoringController.js`, `services/reverseTutoringService.js`, `services/documentSummarizationService.js`, `utils/pptxParser.js` | `pages/ReverseTutoring.jsx`, `pages/ReverseTutoringDashboard.jsx`, `components/TopicDocument*.jsx` |
| Subjects / standards (used by the topic editor) | `routes/subjectsStandards.js` | — |
| Presence (who is connected) | `services/socketService.js`, `services/ioInstance.js` | `hooks/useSocket.js` |
| Database | `database/db.js`, `database/migrate.js` (reads repo-root `database/migrations/`) | — |

The Socket.IO layer now carries **presence only** (`join-session`, `leave-session`,
`user-joined`, `user-left`, `students-online`). It performs no database writes.

## What was removed from the build

Unmounted API surfaces (files under `legacy/backend/src/`):
`/api/ai`, `/api/activities`, analytics, `/api/upload`, `/api/student-help`,
`/api/students` (student accounts), `/api/collaboration` (tag-team),
`/api/google` (Google Classroom), `/api/library`, `/api/documents`,
`/api/videos`, `/api/media`, interactive video, matching, polls, lesson flows,
Learning Worlds. Also removed: the unauthenticated `/uploads` static mount, the
`remove-student` socket event (unauthenticated `DELETE`), screen lock, confusion
meter, activity push.

Removed from the frontend (files under `legacy/frontend/src/`): Library,
Learning Worlds, student accounts, every activity editor/player, leaderboard,
lesson flows, Google Classroom, tag-team lobby and partner chat, the old
`TeacherDashboard.jsx` (4,575 lines) and `StudentView.jsx` (1,055 lines).

The cache-first service worker (`legacy/frontend/public/service-worker.js`) is
no longer registered; `main.jsx` unregisters any copy still installed.

## Destructive scripts (quarantined — do not run)

Moved to `legacy/scripts/` and `legacy/backend/`:

- `cleanup_conversations.sql` — deletes **all** reverse-tutoring conversations and topics (cascades).
- `clear-cache.sql` — truncates `ai_cache`.
- `run-migration.sh`, `migrate-library.js`, `MIGRATION_INSTRUCTIONS.md` — apply migrations while bypassing the `migrations` tracking table.

Also moved (ad-hoc test scripts, not destructive): `legacy/scripts/check-latest-push.sh`,
`legacy/scripts/test-pushed-filter.js`, `legacy/backend/test-response-validation.js`,
`legacy/backend/test-rubric-individuality.js`.

## Database

Untouched. Tables belonging to removed features still exist (Learning Worlds,
collaboration, activities, library, videos, student accounts, Google Classroom
tokens, …). Dropping them is a separate, explicitly approved step with a backup
and a rollback window.

Known hazards to fix before any schema work:
`backend/src/database/migrate.js` runs on every `npm start`, applies each file
without a transaction, and marks a file as executed on any "already exists"
error. `database/schema.sql` is stale; the live schema must be dumped from the
database.

## Restoring something

`git mv legacy/<path> <path>` and re-add the route mount in
`backend/src/server.js` or the route in `frontend/src/App.jsx`.
