# Cohort flow – end-to-end verification checklist

Use this to verify the mentorship cohort pipeline works before release.

## Prerequisites

- API: `cd havia_api && npm run start:dev`
- Admin: `cd havia_admin && npm run dev`
- App: `cd havia_app && npx expo start` (use dev build or Expo Go; set `EXPO_PUBLIC_API_URL` to your API, e.g. `http://192.168.x.x:8000` for device)
- At least one **verified** mentor (admin or seed) and one test user (mentee applicant)

---

## 1. Create and launch a cycle (Admin)

1. Log in to **Havia Admin**.
2. Go to **Mentorship → Cycles**.
3. Create a new cycle (name, dates, target group, max cohort size, e.g. 10).
4. Open the cycle → **Automation** (or cycle list) → click **Launch**.
5. Confirm: success message and “All active users (N) have been notified”.

---

## 2. Apply from the app (Mentee)

1. Log in to the **app** as a user who is **not** yet in the cohort.
2. Go to **Mentorship** tab → **Mentorship cycles** (or “See all” on cohorts).
3. Open the launched cycle.
4. Confirm: status “Open for applications”, **Apply to this cohort** is visible.
5. Tap **Apply** → fill required fields (short bio, why join, proof of interest type + value, availability).
6. Save draft → **Submit application**.
7. Confirm: “Your application has been submitted” and you’re taken back; on the cycle screen you see “Application submitted” (or “under review”).

---

## 3. Screen and accept (Admin)

1. In admin, open the cycle → **Applications** tab.
2. Confirm the application appears in the list.
3. Click **Screen** → review application details (all fields visible).
4. Set status to **ACCEPTED**, optional score/notes → Save.
5. Confirm: applicant receives email + in-app/push (if push is set up).

---

## 4. Assign mentor–mentee (Admin)

1. In the cycle, go to **Members & assign**.
2. Confirm the **accepted applicant** appears in the **Mentees** dropdown (even without a mentee profile).
3. Select a **mentor** and the **accepted mentee** → **Assign & start program**.
4. Confirm: success; mentee and mentor receive notifications.
5. Optional: try assigning the **same mentee** again with another mentor → should fail with “This mentee is already assigned to a mentor in this cycle”.

---

## 5. App: accepted and assigned

1. In the app, open the **same cycle** (as the accepted mentee).
2. Confirm: “You were accepted into this cohort” and **View my program** (no “Apply”).
3. Tap **View my program** → program screen (tasks, sessions, progress, evaluations).
4. From **Mentorship** tab, **My mentees** (as mentor) or **Active sessions** (as mentee), open the mentorship → same program/sessions/tasks.

---

## 6. Apply when already in cohort (App)

1. As the **same mentee**, go to **Mentorship → Cycles** → open the cycle.
2. Confirm: no **Apply** button; **View my program** is shown.
3. Manually open `/mentorship/cycles/[id]/apply` (e.g. deep link).
4. Confirm: “Your application is accepted. You cannot edit it anymore” and **Back to cohort**.

---

## 7. Dropout check (Admin + API)

1. In admin, **Mentorship → Automation**.
2. Click **Run dropout check now**.
3. Confirm: “Dropout check completed. Checked N active cycle(s).”
4. API: scheduled task runs weekly (Monday 6:00 AM); no manual step needed for cron.

---

## 8. Optional: attendance and completion

1. As mentor (or admin), record **attendance** for the mentorship (e.g. week 1–2).
2. Record **2 consecutive unexcused absences** for a mentee → run dropout check (or wait for next attendance save) → mentorship status should become **DROPPED**.
3. For a different mentorship: **Complete mentorship** (mentor or mentee) → confirm **CohortAlumni** is created and appears under **Alumni** tab and in app **Alumni** screen.

---

## Fixes applied for E2E

- **Assign without mentee profile:** Accepted cohort applicants (no MenteeProfile) can be assigned; API creates a minimal MenteeProfile when needed.
- **One mentee per cycle:** API rejects assigning a mentee who already has an active/pending mentorship in that cycle.
- **App “View my program”:** Cycle detail shows “View my program” when the user has an accepted application and a mentorship in that cycle; link goes to `/mentorship/program/[mentorshipId]`.

If any step fails, check API logs, admin network tab, and app console for errors.
