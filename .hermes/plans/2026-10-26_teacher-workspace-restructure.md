# Teacher Workspace Restructure Implementation Plan

> **For Hermes:** Execute only after يوسف explicitly says to begin. Keep this project isolated; do not commit, push, change production data, or deploy without separate authorization.

**Goal:** Make `/teacher` the teacher’s single, clear work hub for today’s classes, assigned students, meeting links/recordings, and lesson review workflow—without duplicating or bypassing admin controls.

**Architecture:** Keep the existing protected `/teacher` route and make `TeacherStudio` the hub. Bring teacher roster/classes and curriculum work into a consistent teacher navigation and shared page shell, while retaining existing Supabase tables, RLS, RPCs, and database-enforced approval rules. Administration remains the owner of student/subject assignments and schedule creation; teachers act only on their own assigned classes and lessons.

**Tech Stack:** React 19, React Router 7, Supabase JS, existing CSS/theme variables, Node test runner, Vite.

---

## Audit findings (verified from repository; not runtime/UAT claims)

- `src/App.jsx` exposes separate `/teacher`, `/teacher/curriculum/*`, and `/account` routes; teacher classes and meeting links are currently under the parent-oriented `/account` area, while curriculum has another route.
- `src/components/TeacherStudio.jsx` already reads actual assigned students and teacher-owned schedule slots. Its “today” panel links out to `/account` for the full class workflow.
- `TeacherStudio.jsx` renders a permanently empty follow-up card rather than deriving a real list. Its mastery KPI counts completed learning-record rows over all rows and labels this as a percentage, which is not necessarily a student mastery rate. The “available subjects” count uses all curriculum keys, not the teacher’s assigned subjects.
- `src/components/myspace/TeacherRoster.jsx` separately owns student listing, classes, live-link editing, live countdown, and lesson recording upload/review submission. This is the most natural existing source for a consolidated teacher “Classes” view.
- `src/components/teacher/TeacherCurriculum.jsx` owns teacher-assigned subject lookup, teacher-authored lessons, draft/submitted/rejected/approved states and editing.
- `src/components/myspace/AssignStudents.jsx` and the admin schedule tab in `src/components/AdminDashboard.jsx` provide administration-side student assignment and per-child schedule configuration. Keep these duties admin-only.
- `src/components/LiveJoin.jsx` shows a live link only inside a scheduled live lesson’s configured join window. Teacher meeting URLs are saved through `set_slot_meeting_url`.
- Existing database workflow in `supabase/migrations/20261025120000_per_child_schedule_live.sql`, `20261024220000_teacher_assignments.sql`, and `20261028090000_teacher_curriculum_workflow.sql` already defines ownership/RLS and review boundaries. No schema migration is justified by the UX audit alone.
- Git was clean at inspection (`main...origin/main`, HEAD `9ddf003`). This is a point-in-time observation; re-check before implementation.

## Product decisions proposed

1. `/teacher` is the canonical teacher landing page and primary navigation shell.
2. Hub sections: **الرئيسية** (next/upcoming class + actionable alerts), **حصصي** (schedule, class link, recording), **طلابي** (assigned students and honest progress), **مناهجي** (assigned subjects and lesson workflow). Prefer a compact tab/section navigation on mobile and a clear sidebar or top navigation on wider screens.
3. Keep management actions out of teacher controls: teachers cannot assign children, edit times, change slot type, or publish lessons. Administration continues to assign children/subjects and create/edit schedule slots.
4. Replace any unsupported metric or empty “follow-up” promise with truthful states. If there is no reliable, agreed learning signal, omit the KPI rather than infer risk or mastery.
5. Keep existing `/teacher/curriculum/*` deep links working. Preserve `/account` for families; do not redirect parent-facing routes into teacher views.

## Implementation sequence

### Phase 1 — Define teacher information architecture and shared navigation

**Files:** `src/components/TeacherStudio.jsx`, `src/components/teacher/TeacherCurriculum.jsx`, `src/App.jsx`, likely new `src/components/teacher/TeacherLayout.jsx` and focused stylesheet after inspecting existing CSS conventions.

- Add a teacher-only navigation shell that links to the hub, classes/students, and curriculum. Use active states, accessible names, RTL layout, responsive collapse, and existing theme variables.
- Keep route guards unchanged (`teacher` and `admin` as currently configured); do not broaden roles.
- Ensure nested curriculum pages retain a visible route back to `/teacher` and share the shell rather than looking like a separate application.
- Decide whether `TeacherRoster` becomes `/teacher/classes` with a student subsection or remains a single page with internal sections; prefer minimal route churn and preserve all current deep links.

### Phase 2 — Consolidate classes and live-session actions

**Files:** `src/components/myspace/TeacherRoster.jsx`, `src/components/TeacherStudio.jsx`, `src/App.jsx`, `src/context/AppContext.jsx` only if a shared data helper is demonstrably needed.

- Make the hub show the next assigned class and urgent actionable state: meeting link missing, class starting soon, or no scheduled classes. Link directly into the relevant class card/action.
- Move/reuse the existing teacher classes UI under the teacher route. Keep per-class student, subject/lesson, Cairo/local time display, live join URL save, and recording upload/review submission together on the class card or details view.
- Avoid duplicate network fetches/KPIs on both hub and roster; share existing context data where possible, otherwise extract a small hook with focused tests.
- Do not change the meeting URL RPC, live-window logic, storage access, or recording approval semantics without a separately demonstrated defect.

### Phase 3 — Make student and curriculum workflows coherent

**Files:** `src/components/myspace/TeacherRoster.jsx`, `src/components/teacher/TeacherCurriculum.jsx`, `src/components/TeacherStudio.jsx`.

- Keep teacher’s assigned-student list read-only for assignment, with honest completion data and a clear route to the student’s scheduled class/lesson context where supported.
- Remove or implement the static empty follow-up card; do not show fabricated “at risk” or “automatic tracking” claims.
- Correct the mastery KPI: either label the exact computed measure precisely, derive a validated per-student measure, or remove it. Show loading, error, empty, and data states distinctly.
- Change the subjects KPI to assigned subjects (from `teacher_subjects`) or remove it. Do not count the platform-wide curriculum as “my subjects.”
- Keep lesson states and rejection note visible, with one obvious action to resume editing/resubmit. Respect existing draft → submitted → approval/rejection workflow.

### Phase 4 — Simplify admin handoff without expanding teacher permissions

**Files:** `src/components/AdminDashboard.jsx`, `src/components/myspace/AssignStudents.jsx`, `src/components/TeacherStudio.jsx` (only if audit proves necessary).

- In admin student assignment and schedule editing, expose clear cross-links/labels indicating where the teacher sees their assigned work.
- Preserve separate responsibility for student assignment, subject assignment, and per-child scheduling; do not combine these into a teacher-editable schedule form.
- Improve empty/error/success feedback only where current controls can report a truthful result.

### Phase 5 — Tests, accessibility, and verification

**Tests:** Add focused tests beside extracted utilities/hooks/components using current repository conventions. Inspect existing test setup before choosing test library.

- Test role-protected route behavior and teacher navigation/deep links.
- Test KPI calculations for loading, no records, mixed completion, assigned subjects, and query error—no NaN or misleading percentage.
- Test class action visibility and meeting-link/recording states; test that teacher UI exposes no schedule-edit or assignment controls.
- Test lesson workflow status ordering, rejected note/resubmit path, and empty/loading/error states.
- Check RTL, keyboard focus, semantic headings/labels, responsive layout and contrast using existing theme tokens.
- Run focused tests, then repository suite (`node --test server/server.test.js src/utils/*.test.js src/lib/*.test.js src/context/*.test.js` if still applicable), `npm run build`, and lint on changed files according to package scripts.
- Perform local browser verification for teacher and admin roles using authorized test accounts only. Do not use production customer accounts or write production data without explicit approval.
- Inspect computed styles and browser console/network errors, not screenshots alone. Validate live join window with deterministic test time/unit tests rather than waiting for a real class.

## Acceptance criteria

- Teacher can reach today/next class, assigned students, meeting-link action, recording submission, and lesson work from `/teacher` without detouring through the parent `/account` experience.
- Every teacher-visible class and student is limited by current RLS/ownership; no new access is granted by client-side navigation.
- Teacher cannot edit timetable/assignments or publish/approve curriculum; existing database enforcement remains intact.
- No hard-coded empty follow-up claim, platform-wide subject count presented as teacher’s subjects, or ambiguous mastery percentage remains.
- Loading, empty, error, and success states are distinct and accurate.
- Existing `/teacher/curriculum/*`, `/account`, and family-facing flows remain functional.
- Focused tests, full relevant tests, build, lint, and local browser role-based checks pass; results are reported with actual tool output.

## Risks and guardrails

- The per-child schedule and teacher assignment are separate relations. Consolidating UI must not accidentally imply that assignment alone creates a schedule or grants editing rights.
- `TeacherStudio` and `TeacherRoster` independently fetch overlapping student/learning data today. Consolidation could create stale state or duplicate calls; establish a single owner for each dataset.
- The current roster includes an exam-unlock control. Confirm the intended policy/role before moving it; do not broaden teacher authority during visual refactoring.
- Recording upload handles child privacy attestations and review. Preserve consent, validation, storage path restrictions, and review state.
- Keep database changes out of scope unless implementation uncovers a specific authorization/data-model gap. Any required migration must be new and timestamped; never edit old migrations/schema snapshots.
- No changes to Obsidian vault, production, commit, push, or deployment as part of this plan.

## Next concrete action

After يوسف says “ابدأ”, re-check `git status`, read the current teacher route/CSS/test conventions and recording hook/storage policies, then implement Phase 1 only and verify before proceeding to Phase 2. Do not edit production or deploy without separate authorization.
