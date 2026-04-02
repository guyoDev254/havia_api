/**
 * Outcome-focused mentorship pipeline (NorthernBox).
 * Optimizes for mentee outcome progression, not just matching.
 *
 * Phases: Intake → Scoring → Matching → Activation → Monitoring → Intervention
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const MENTEE_COMMITMENT_MIN = 50; // Reject below this
export const ACTIVATION_HOURS = 72;
export const PROGRESS_INTERVENTION_THRESHOLD = 40; // progressScore < 40 for 2 weeks → intervene
export const INACTIVITY_ALERT_DAYS = 14;
export const INACTIVITY_REASSIGN_DAYS = 30;
export const INACTIVITY_TERMINATE_DAYS = 45;

export const OUTCOME_TYPES = [
  'GOT_INTERNSHIP',
  'BUILT_PROJECT',
  'GOT_JOB',
  'LEARNED_SKILL',
  'PUBLISHED_PORTFOLIO',
  'PROMOTED',
  'OTHER',
] as const;

@Injectable()
export class MentorshipPipelineService {
  constructor(private prisma: PrismaService) {}

  // ---------- Phase 2: Scoring ----------

  /**
   * Mentee commitment score 0–100.
   * commitmentScore = applicationCompletion*0.2 + portfolio*0.3 + assessment*0.3 + availability*0.2
   * Reject mentees below 50.
   */
  async calculateMenteeCommitmentScore(
    menteeId: string,
    applicationId?: string,
  ): Promise<{ score: number; breakdown: { application: number; portfolio: number; assessment: number; availability: number } }> {
    const mentee = await this.prisma.menteeProfile.findUnique({
      where: { userId: menteeId },
    });
    if (!mentee) throw new NotFoundException('Mentee profile not found');

    let applicationScore = 50; // default
    if (applicationId) {
      const app = await this.prisma.cohortApplication.findUnique({
        where: { id: applicationId },
      });
      if (app) {
        const hasShortBio = !!app.shortBio?.trim();
        const hasWhyJoin = !!app.whyJoin?.trim();
        const hasProof = !!app.proofOfInterestValue?.trim() || !!app.technicalTaskUrl?.trim();
        const hasAvailability = !!app.availabilityCommitment?.trim();
        const submitted = app.status === 'SUBMITTED' || app.status === 'UNDER_REVIEW' || app.status === 'ACCEPTED';
        applicationScore = Math.min(100, (hasShortBio ? 20 : 0) + (hasWhyJoin ? 20 : 0) + (hasProof ? 30 : 0) + (hasAvailability ? 15 : 0) + (submitted ? 15 : 0));
      }
    }

    const portfolioCount = (mentee.portfolioLinks && mentee.portfolioLinks.length) || 0;
    const portfolioScore = Math.min(100, portfolioCount * 25); // 0, 25, 50, 75, 100 for 0-4+ links

    const skillLevel = mentee.skillLevel ?? 0;
    const assessmentScore = Math.min(100, skillLevel * 20); // 0-5 → 0-100

    const hours = mentee.availabilityHoursPerWeek ?? 0;
    const availabilityScore = hours >= 5 ? 100 : hours >= 3 ? 70 : hours >= 1 ? 40 : 0;

    const score =
      applicationScore * 0.2 +
      portfolioScore * 0.3 +
      assessmentScore * 0.3 +
      availabilityScore * 0.2;

    const breakdown = {
      application: Math.round(applicationScore * 100) / 100,
      portfolio: Math.round(portfolioScore * 100) / 100,
      assessment: Math.round(assessmentScore * 100) / 100,
      availability: Math.round(availabilityScore * 100) / 100,
    };

    return {
      score: Math.round(score * 100) / 100,
      breakdown,
    };
  }

  /**
   * Mentor quality score 0–100.
   * mentorScore = experienceYears*5 + previousSuccess*20 + availability*15 + feedbackRating*20
   */
  async calculateMentorScore(mentorId: string): Promise<{ score: number; breakdown: Record<string, number> }> {
    const mentor = await this.prisma.mentorProfile.findUnique({
      where: { userId: mentorId },
    });
    if (!mentor) throw new NotFoundException('Mentor profile not found');

    const experienceYears = mentor.yearsOfExperience ?? 0;
    const experienceScore = Math.min(25, experienceYears * 5); // cap 25

    const completedMentorships = await this.prisma.mentorship.count({
      where: { mentorId, status: 'COMPLETED' },
    });
    const previousSuccess = Math.min(100, completedMentorships * 20); // 5+ = 100
    const successScore = (previousSuccess / 100) * 20;

    const avail = mentor.weeklyAvailability ?? 0;
    const availabilityScore = avail >= 3 ? 15 : avail >= 1 ? 10 : 5;

    const rating = mentor.rating ?? 0;
    const feedbackScore = (rating / 5) * 20; // assume 0-5 scale

    const score = experienceScore + successScore + availabilityScore + feedbackScore;
    return {
      score: Math.round(Math.min(100, score) * 100) / 100,
      breakdown: {
        experience: experienceScore,
        success: successScore,
        availability: availabilityScore,
        feedback: feedbackScore,
      },
    };
  }

  /**
   * Compatibility score for matching (weighted).
   * compatibilityScore = skillMatch*0.35 + goalAlignment*0.25 + availabilityOverlap*0.20 + timezone*0.10 + mentorScoreNorm*0.10
   */
  async calculateCompatibilityScore(
    mentorId: string,
    menteeId: string,
  ): Promise<{
    compatibilityScore: number;
    skillMatchScore: number;
    goalAlignmentScore: number;
    availabilityOverlapScore: number;
    timezoneScore: number;
    mentorScoreNormalized: number;
  }> {
    const [mentor, mentee, mentorScoreResult] = await Promise.all([
      this.prisma.mentorProfile.findUnique({
        where: { userId: mentorId },
        include: { user: { select: { skills: true } } },
      }),
      this.prisma.menteeProfile.findUnique({
        where: { userId: menteeId },
        include: { user: { select: { skills: true } } },
      }),
      this.calculateMentorScore(mentorId),
    ]);

    if (!mentor || !mentee) throw new NotFoundException('Mentor or mentee profile not found');

    const mentorSkills = ((mentor as any).user?.skills || []).concat((mentor.mentorshipThemes || []) as string[]);
    const menteeGoals = (mentee.goals && mentee.goals.length) ? mentee.goals : (mentee.careerGoals ? [mentee.careerGoals] : []);
    const menteeSkillGoals = (mentee.skills && mentee.skills.length) ? mentee.skills : ((mentee as any).user?.skills || []);

    const intersection = mentorSkills.filter((s) =>
      menteeSkillGoals.some((g) => String(g).toLowerCase().includes(String(s).toLowerCase())) ||
      menteeGoals.some((g) => String(g).toLowerCase().includes(String(s).toLowerCase())),
    );
    const skillMatchScore =
      menteeGoals.length > 0 || menteeSkillGoals.length > 0
        ? Math.min(1, intersection.length / Math.max(menteeGoals.length || menteeSkillGoals.length, 1))
        : 0.5;

    const goalAlignmentScore = menteeGoals.length > 0 && mentorSkills.length > 0
      ? Math.min(1, intersection.length / Math.max(menteeGoals.length, 1))
      : 0.5;

    const mentorHours = mentor.weeklyAvailability ?? 0;
    const menteeHours = mentee.availabilityHoursPerWeek ?? 0;
    const maxHours = Math.max(mentorHours, menteeHours, 1);
    const overlappingHours = Math.min(mentorHours, menteeHours);
    const availabilityOverlapScore = overlappingHours / maxHours;

    const mentorTz = mentor.timezone || '';
    const menteeTz = mentee.timezone || '';
    const timezoneScore = !mentorTz || !menteeTz ? 0.5 : mentorTz === menteeTz ? 1 : 0.7;

    const mentorScoreNormalized = mentorScoreResult.score / 100;

    const compatibilityScore =
      skillMatchScore * 0.35 +
      goalAlignmentScore * 0.25 +
      availabilityOverlapScore * 0.2 +
      timezoneScore * 0.1 +
      mentorScoreNormalized * 0.1;

    return {
      compatibilityScore: Math.round(compatibilityScore * 100) / 100,
      skillMatchScore: Math.round(skillMatchScore * 100) / 100,
      goalAlignmentScore: Math.round(goalAlignmentScore * 100) / 100,
      availabilityOverlapScore: Math.round(availabilityOverlapScore * 100) / 100,
      timezoneScore: Math.round(timezoneScore * 100) / 100,
      mentorScoreNormalized: Math.round(mentorScoreNormalized * 100) / 100,
    };
  }

  /**
   * Weekly progress score 0–100.
   * progressScore = meetingsCompleted*20 + tasksCompleted*30 + skillAssessmentsImproved*30 + mentorFeedback*20
   * Uses cycle startDate for week boundaries when available.
   */
  async computeWeeklyProgressScore(
    mentorshipId: string,
    week: number,
  ): Promise<number> {
    const mentorship = await this.prisma.mentorship.findUnique({
      where: { id: mentorshipId },
      select: { cycleId: true, cycle: { select: { startDate: true } } },
    });
    const cycleStart = mentorship?.cycle?.startDate;
    let weekStart: Date;
    let weekEnd: Date;
    if (cycleStart) {
      weekStart = new Date(cycleStart);
      weekStart.setDate(weekStart.getDate() + 7 * (week - 1));
      weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
    } else {
      weekEnd = new Date();
      weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
    }

    const [sessions, tasks, progress, evaluations] = await Promise.all([
      this.prisma.mentorshipSession.count({
        where: {
          mentorshipId,
          status: 'COMPLETED',
          actualDate: { gte: weekStart, lt: weekEnd },
        },
      }),
      this.prisma.mentorshipTask.findMany({
        where: { mentorshipId, week },
      }),
      this.prisma.mentorshipProgress.findUnique({
        where: { mentorshipId_week: { mentorshipId, week } },
      }),
      this.prisma.mentorshipEvaluation.findMany({
        where: { mentorshipId },
      }),
    ]);

    const meetingsScore = Math.min(1, sessions / 2) * 20; // 2 meetings = full 20
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
    const tasksScore = totalTasks > 0 ? (completedTasks / totalTasks) * 30 : 0;
    const skillImprovement = progress?.skillImprovement ?? 0;
    const skillScore = (skillImprovement / 100) * 30;
    const avgRating =
      evaluations.length > 0
        ? evaluations.reduce((s, e) => s + (e.progressRating || 0) + (e.engagementRating || 0), 0) / (evaluations.length * 2)
        : 2.5;
    const feedbackScore = (avgRating / 5) * 20;

    const score = meetingsScore + tasksScore + skillScore + feedbackScore;
    return Math.round(Math.min(100, score) * 100) / 100;
  }

  /**
   * Check if mentorship was activated (first meeting scheduled within 72h of start).
   */
  async checkActivation72h(mentorshipId: string): Promise<{ activated: boolean; firstMeetingScheduledAt?: Date }> {
    const mentorship = await this.prisma.mentorship.findUnique({
      where: { id: mentorshipId },
      include: { sessions: { orderBy: { scheduledDate: 'asc' }, take: 1 } },
    });
    if (!mentorship || !mentorship.startedAt) return { activated: false };

    const firstSession = mentorship.sessions[0];
    if (!firstSession) return { activated: false };

    const hoursSinceStart = (firstSession.scheduledDate.getTime() - mentorship.startedAt.getTime()) / (1000 * 60 * 60);
    const activated = hoursSinceStart <= ACTIVATION_HOURS;
    return {
      activated,
      firstMeetingScheduledAt: firstSession.scheduledDate,
    };
  }

  /**
   * Outcome types for dropdowns/validation.
   */
  getOutcomeTypes(): readonly string[] {
    return OUTCOME_TYPES;
  }
}
