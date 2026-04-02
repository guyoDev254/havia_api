# NorthernBox Mentorship Cohort System (Structured Model)

This document describes the **structured talent pipeline** for mentorship cohorts: target groups, applications, phases, accountability, and alumni.

## 1. Target group

Before opening applications, define who the cohort is for:

- **STUDENTS** – different entry requirements, learning outcomes, intensity
- **JUNIOR_DEVELOPERS** – portfolio/GitHub, problem-solving, consistency
- **NGO_STAFF** / **COMMUNITY_LEADERS** – community use case, institutional backing, local impact
- **OTHER**

Each cycle has optional `targetGroupEnum` and free-text `targetGroup`, plus `maxCohortSize` (default 20, recommend 10–20) and `totalWeeks` (e.g. 12).

## 2. Structured application

Applications filter for **commitment**, not just talent.

**Minimum:**

- Short bio  
- Why they want to join  
- Proof of interest: type (GITHUB | CV | SCHOOL | PROJECT_IDEA) + URL/text  
- Availability commitment  

**Optional (advanced cohorts):**

- Technical task URL  
- 2–3 min video intro URL  

**Flow:** User creates/updates draft via `POST /mentorship/cycles/:id/apply`, then `POST /mentorship/cycles/:id/apply/submit`. Status: DRAFT → SUBMITTED → UNDER_REVIEW → ACCEPTED | REJECTED. Admin sets status, screening score, and notes.

## 3. Screening & selection

- **Criteria:** Transparent (e.g. commitment, digital literacy, growth mindset for students; portfolio for developers; community use case for NGOs).
- **Cohort size:** Enforced at assignment time: `maxCohortSize` (or `maxMentorships`) – assignment fails when cohort is full.
- Admin: list applications per cycle, filter by status, update status/score/notes.

## 4. Cohort structure (e.g. 12 weeks)

Three phases (defaults created when cycle is created):

| Phase   | Weeks  | Focus                                                                 |
|--------|--------|-----------------------------------------------------------------------|
| 1 – Foundation           | 1–4   | Core skills, weekly check-ins, small assignments                      |
| 2 – Application          | 5–8   | Real project, team collaboration, mentorship sessions                |
| 3 – Professionalization  | 9–12  | Portfolio, public demo day, certification/recognition, LinkedIn       |

Phases are stored in `CohortPhase` and returned with the cycle and via `GET /mentorship/cycles/:id/phases`.

## 5. Accountability

- **Weekly attendance:** Stored on `MentorshipProgress` as `attended` (boolean) and `excusedAbsence` (boolean).
- **Rule:** Two consecutive weeks with `attended === false` and not excused → mentorship status set to **DROPPED**.
- **Recording:** Mentor (or admin) calls `PUT /mentorship/progress/:mentorshipId/:week/attendance` with `{ attended, excusedAbsence }`. The service runs the consecutive-absence check after each update.
- **Cron (optional):** Call `POST /admin/mentorship/cron/check-absent` (admin auth) periodically (e.g. weekly) to run the dropout check for all active cycles.

## 6. Graduation & alumni

- On **mentorship completion** (and if the mentorship has a `cycleId`), a **CohortAlumni** record is created for the mentee.
- Alumni: `joinedAlumniGroup`, `canMentorFutureCohorts`, `showcased` (admin can update).
- **Public:** `GET /mentorship/alumni` returns showcased alumni (or by `cycleId`).
- Admin: `GET /admin/mentorship/cycles/:id/alumni`, `PUT /admin/mentorship/alumni/:id`.

## API summary

| Area           | Endpoint / action |
|----------------|-------------------|
| Phases         | `GET /mentorship/cycles/:id/phases` |
| Application    | `GET/POST /mentorship/cycles/:id/apply`, `POST .../apply/submit` |
| Attendance     | `PUT /mentorship/progress/:mentorshipId/:week/attendance` |
| Alumni         | `GET /mentorship/alumni?cycleId=` |
| Admin apps     | `GET /admin/mentorship/cycles/:id/applications`, `PUT /admin/mentorship/applications/:id` |
| Admin attendance | `PUT /admin/mentorship/attendance` |
| Admin alumni   | `GET /admin/mentorship/cycles/:id/alumni`, `PUT /admin/mentorship/alumni/:id` |
| Cron           | `POST /admin/mentorship/cron/check-absent` |

## Data flow (API ↔ Admin ↔ App)

- **Cycles list:** `GET /mentorship/cycles` and `GET /admin/mentorship/cycles` both use the same service `getCycles()`, which returns `phases` (id, phaseOrder, name, startWeek, endWeek) and `_count` (programs, mentorships, applications, alumni). Admin and app can show target group, cohort size, and phase count without an extra request.
- **Cycle by ID:** `getCycleById(id)` returns the same shape for both app (`GET /mentorship/cycles/:id`) and admin (`GET /admin/mentorship/cycles/:id`): cycle with `phases`, `_count`, `mentorships` (with `progress` for attendance). Use `maxCohortSize` or `maxMentorships`, and `targetGroupEnum` or `targetGroup` for display.
- **Cohort application:** App uses `GET /mentorship/cycles/:id/apply` (returns `CohortApplication | null` when no application). App sends draft via `POST .../apply` with `CreateCohortApplicationDto`; submit via `POST .../apply/submit`. Admin lists via `GET /admin/mentorship/cycles/:id/applications?status=`, updates via `PUT /admin/mentorship/applications/:id` with `{ status?, screeningScore?, screeningNotes? }`. Enum values: `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`.
- **Attendance:** App: `PUT /mentorship/progress/:mentorshipId/:week/attendance` with `{ attended, excusedAbsence }`. Admin: `PUT /admin/mentorship/attendance` with `{ mentorshipId, week, attended, excusedAbsence }`. Same backend `recordWeekAttendance`.
- **Alumni:** App: `GET /mentorship/alumni` (showcased) or `?cycleId=` (by cycle). Admin: `GET /admin/mentorship/cycles/:id/alumni`, `PUT /admin/mentorship/alumni/:id` with `{ showcased?, canMentorFutureCohorts? }`.
- **Create cycle (admin):** `POST /admin/mentorship/cycles` with `name`, `startDate`, `endDate`, and optionally `targetGroupEnum`, `maxCohortSize`, `totalWeeks` (and other CreateCycleDto fields). Enum `targetGroupEnum`: `STUDENTS`, `JUNIOR_DEVELOPERS`, `NGO_STAFF`, `COMMUNITY_LEADERS`, `OTHER`.

## Principle

NorthernBox runs as a **structured talent pipeline**, not a casual community: defined target group, filtered applications, clear phases, accountability (attendance → dropout), and graduation with alumni and showcase.

## Remaining / roadmap

See **MENTORSHIP_REMAINING.md** for a checklist of what was completed (P0–P2) and what is still optional (e.g. application deadline, certificates, E2E testing).
