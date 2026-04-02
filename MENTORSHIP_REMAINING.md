# Mentorship & Cohort System – What’s Remaining for a Full Complete System

This list covers gaps and improvements to make the NorthernBox mentorship/cohort pipeline end-to-end and production-ready.

---

## Completed (implemented)

- **§1 Assign only accepted applicants (P0):** `getAvailableMentorsAndMentees` now includes users with ACCEPTED `CohortApplication` for the cycle in the mentee list (with `fromCohortApplication: true` in the response).
- **§2 Scheduled dropout check (P1):** Nest scheduled task runs every Monday at 6:00 AM (`MentorshipDropoutTask`). Admin Automation page has a “Run dropout check now” button that calls `POST /admin/mentorship/cron/check-absent`.
- **§4 App: “You’re in, mentor will be assigned” (P1):** Cycle detail screen shows “You’re in! Your mentor will be assigned soon. We’ll notify you when you can start.” when the user has ACCEPTED application but no mentorship in that cycle yet; and a “View my program” button when they do have a mentorship.
- **§5 Admin: Assign from Applications (P2):** Applications table has an “Assign” action for ACCEPTED rows that switches to the “Members & assign” tab with that applicant pre-selected as mentee.
- **§10 Cleanups:** Removed `console.log` from admin cycle detail page in `fetchAvailable`.

---

## 1. **Assign only accepted applicants (critical)** ✅ Done

**Current:** In admin **Members & assign**, the mentee dropdown is built from:
- Users with an active **MenteeProfile**, and  
- Users who tapped **“I’m interested”** for that cycle.

**Gap:** Someone with an **ACCEPTED** cohort application but no mentee profile and no “I’m interested” does **not** appear in the list, so you cannot assign them.

**Recommendation:**
- In **getAvailableMentorsAndMentees** (admin), include users who have an **ACCEPTED** `CohortApplication` for that `cycleId` in the mentee list (with a flag like `fromCohortApplication: true`).
- Optionally, when an application is set to ACCEPTED, ensure the user is in the “available mentees” pool (e.g. create a minimal MenteeProfile or a separate “accepted applicant” view) so assign always shows accepted applicants.

---

## 2. **Scheduled dropout check (attendance → DROPPED)** ✅ Done

**Current:**  
- Logic exists: 2 consecutive unexcused absences → mentorship status **DROPPED**.  
- `PUT /mentorship/progress/:mentorshipId/:week/attendance` (and admin equivalent) runs the check after each update.  
- `POST /admin/mentorship/cron/check-absent` exists to run the check for all active cycles (e.g. for missed manual updates).

**Gap:** No scheduled task calls this endpoint. It’s only usable via manual or external cron.

**Recommendation:**
- Add a Nest scheduled task (e.g. weekly) that calls the same “check consecutive absences” logic, or call `POST /admin/mentorship/cron/check-absent` from a cron job / workflow runner.
- Optionally add an admin UI button (e.g. on Automation or the cycle’s Attendance tab): “Run dropout check now”.

---

## 3. **Mentee profile and cohort application**

**Current:** Submitting a cohort application does **not** create or update a **MenteeProfile**. Assignment requires the user to appear in “available” (profile or “I’m interested” or, once implemented, accepted application).

**Recommendation (optional but useful):**
- When a cohort application is set to **ACCEPTED**, ensure the user can be assigned:
  - Either by including ACCEPTED applicants in **getAvailableMentorsAndMentees** (see §1), or  
  - By auto-creating a minimal MenteeProfile (or a “cohort mentee” flag) so they show in the existing list.  
- Prefer §1 (include ACCEPTED in available list) so one source of truth is cohort applications.

---

## 4. **App: Link from “Application accepted” to program** ✅ Done

**Current:** When an application is ACCEPTED, the user gets email + in-app/push with a link like `/mentorship/cycles/:id`. They may not yet have an active mentorship.

**Recommendation:**
- In the app, when the user opens that link and has ACCEPTED but no mentorship yet, show a short message: “You’re in! Your mentor will be assigned soon. We’ll notify you when you can start.”
- When they have an active mentorship for that cycle, show the usual cycle/program UI and link to the active mentorship.

---

## 5. **Admin: Assign from Applications tab** ✅ Done

**Current:** You open Applications → Screen → Accept, then go to Members & assign and pick mentor + mentee from dropdowns.

**Recommendation (UX):**
- From the Applications table, add an action like “Assign as mentee” for ACCEPTED rows that opens the assign flow with that user pre-selected as mentee (or deep-link to Members & assign with menteeId in query).

---

## 6. **Cycle status transitions**

**Current:** Cycles have UPCOMING / ACTIVE / COMPLETED. Launch sets status and notifies users.

**Gap:** No explicit “close applications” (e.g. set cycle to a state where new applications are not accepted) other than COMPLETED. Optionally: “APPLICATIONS_CLOSED” or re-use ACTIVE with an `applicationDeadline` that the app respects.

**Recommendation:**
- If you need “applications closed but cycle still running”, add an `applicationDeadline` (or similar) and have the app reject new submissions after that date; or add a status like APPLICATIONS_CLOSED and update docs and app accordingly.

---

## 7. **Alumni and certificates**

**Current:**  
- On mentorship completion (with `cycleId`), a **CohortAlumni** record is created.  
- Alumni are editable in admin (showcase, can mentor future cohorts).  
- App has an Alumni screen; `GET /mentorship/alumni` returns showcased alumni.  
- Certificate generation is called on completion but can fail without blocking completion.

**Recommendation:**
- Confirm certificate generation (template, storage, and user-facing download/link) is implemented and tested.
- If alumni can “mentor future cohorts”, ensure the next cycle’s “available mentors” or matching can include them (e.g. by role or flag).

---

## 8. **Matching vs manual assign**

**Current:**  
- Admin can **manually assign** mentor + mentee to a cycle (creates mentorship + program + notifications).  
- Matches (MentorshipMatch) exist; admin can approve matches, which creates mentorships.

**Gap:** For the **cohort pipeline**, the main flow is: apply → screen → accept → **manual assign**. Algorithmic matching may not consider cohort applications.

**Recommendation:**
- Document that for structured cohorts, “assign from accepted applicants” is the primary path; matching is an optional/secondary path.
- If you add “assign from Applications” (§5) and “accepted applicants in available list” (§1), the pipeline is consistent without changing matching logic.

---

## 9. **Testing and operations**

- **E2E:** Run through: create cycle → launch → user applies → admin screens and accepts → assign mentor–mentee → record attendance (including 2 absences → DROPPED) → complete mentorship → alumni appears.
- **Notifications:** Confirm email + push for: launch, application accepted/rejected, assignment, and (if applicable) session reminders.
- **Env:** Ensure production API URL, email, and push keys are set; cron or scheduler is configured for check-absent if you rely on it.

---

## 10. **Docs and small cleanups**

- **MENTORSHIP_COHORT_SYSTEM.md:** Add a “Remaining / roadmap” section that points to this file or a short checklist.
- ~~Remove or reduce `console.log` in admin~~ ✅ Done (cycle detail page).
- Ensure `.env.example` (app and API) list all required vars (e.g. `EXPO_PUBLIC_API_URL`, email, push). App has `.env.example`; API may add one if missing.

---

## Priority summary

| Priority | Item |
|----------|------|
| **P0**   | §1 Include ACCEPTED cohort applicants in “available mentees” for assign. |
| **P1**   | §2 Schedule or trigger dropout check (cron or admin button). |
| **P1**   | §4 App: “You’re in, mentor will be assigned” when ACCEPTED but not yet assigned. |
| **P2**   | §5 Admin: “Assign as mentee” from Applications row. |
| **P2**   | §7 Certificates and alumni-as-future-mentors flow. |
| **P3**   | §6 Application deadline / APPLICATIONS_CLOSED; §9 E2E and ops; §10 docs. |

Once P0 and P1 are done, the pipeline is logically complete: apply → screen → accept → assign (with accepted applicants in the list) → attendance → completion → alumni, with dropout checks and clear app messaging.
