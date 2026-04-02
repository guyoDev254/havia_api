# NorthernBox Mentorship: Outcome-Focused Pipeline

The system is designed to **optimize for mentee outcome progression (OPS)**, not just matching.

## Core principle

- **Success = Quality Mentors × Quality Mentees × Structured Matching × Active Monitoring × Aggressive Intervention**

## Implemented phases

### 1. Intake (profile system)

- **MenteeProfile**: `goals[]`, `skills[]`, `skillLevel` (0–5), `availabilityHoursPerWeek`, `timezone`, `portfolioLinks[]`, `commitmentScore` (calculated).
- **MentorProfile**: `timezone`, `mentorScore` (calculated).
- DTOs and API support these fields.

### 2. Scoring

- **Mentee commitment score (0–100)**  
  `commitmentScore = applicationCompletion*0.2 + portfolio*0.3 + assessment*0.3 + availability*0.2`  
  **Mentees with score &lt; 50 are rejected from matching** (find-matches and admin automated matching).
- **Mentor quality score (0–100)**  
  `mentorScore = experience*5 + previousSuccess*20 + availability*15 + feedbackRating*20`
- **Endpoints**: `GET /mentorship/pipeline/commitment-score`, `GET /mentorship/pipeline/mentor-score`

### 3. Matching (weighted compatibility)

- **Compatibility**  
  `skillMatch*0.35 + goalAlignment*0.25 + availabilityOverlap*0.20 + timezone*0.10 + mentorScoreNorm*0.10`
- **Skill match**: intersection of mentor skills/themes with mentee goals/skills.
- **Best-mentor-per-mentee**: admin automated matching assigns each mentee to the single best available mentor (by compatibility).
- Legacy `calculateMatchScore` now uses this pipeline and maps to existing DB component fields.

### 4. Activation (first 72 hours)

- When the **first session** is created for a mentorship, `firstMeetingScheduledAt` is set.
- If that first meeting is scheduled within **72 hours** of `startedAt`, `activatedAt` is set.
- If not, an intervention `ACTIVATION_72H_FAILED` is logged.
- `lastActivityAt` is updated on session create and on task completion.

### 5. Monitoring (weekly progress score)

- **Progress score (0–100)**  
  `meetingsCompleted*20 + tasksCompleted*30 + skillAssessmentsImproved*30 + mentorFeedback*20`
- Stored on `MentorshipProgress.progressScore` and recomputed when tasks are updated.
- Week boundaries use cycle `startDate` when available.

### 6. Intervention & outcomes

- **Interventions**  
  Table `mentorship_interventions`: e.g. `ACTIVATION_72H_FAILED`.  
  **Recommended next**: cron/job for `INACTIVITY_14D_ALERT`, `INACTIVITY_30D_REASSIGN`, `INACTIVITY_45D_TERMINATE`, and low `progressScore` for 2 consecutive weeks.
- **Outcomes**  
  Table `mentorship_outcomes`: `outcomeType` (e.g. GOT_INTERNSHIP, BUILT_PROJECT, GOT_JOB, LEARNED_SKILL, PUBLISHED_PORTFOLIO), `date`, `verified`.
- **Endpoints**:  
  `POST /mentorship/outcomes`, `GET /mentorship/outcomes`, `GET /mentorship/outcomes/types`,  
  `PUT /admin/mentorship/outcomes/:id/verify`

## Database changes (migration required)

- **MentorProfile**: `mentorScore`, `timezone`
- **MenteeProfile**: `goals`, `skills`, `skillLevel`, `availabilityHoursPerWeek`, `timezone`, `portfolioLinks`, `commitmentScore`
- **Mentorship**: `firstMeetingScheduledAt`, `activatedAt`, `lastActivityAt`
- **MentorshipProgress**: `progressScore`
- **MentorshipOutcome**: new table
- **MentorshipIntervention**: new table

Run:

```bash
npx prisma migrate dev --name outcome_pipeline
```

## Optional next steps

1. **Cron for interventions**  
   - Every day: find mentorships with `lastActivityAt` &gt; 14d → create alert and notify; &gt; 30d → flag for reassign; &gt; 45d → suggest terminate.  
   - Every week: find mentorships with `progressScore` &lt; 40 for two consecutive weeks → create intervention and notify.
2. **Store and refresh mentor score**  
   Periodically run `calculateMentorScore` and update `MentorProfile.mentorScore` (e.g. after session completion or monthly).
3. **Store commitment score**  
   On application submit or profile update, run `calculateMenteeCommitmentScore` and set `MenteeProfile.commitmentScore` so lists/filters can use it without recalculating.
