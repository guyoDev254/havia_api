import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  MentorshipStatus,
  MentorshipType,
  MentorshipTheme,
  MentorshipStyle,
  TaskStatus,
  EvaluationType,
  MatchStatus,
  SessionStatus,
  CohortApplicationStatus,
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { BadgesService } from '../badges/badges.service';
import { CreateMentorProfileDto } from './dto/create-mentor-profile.dto';
import { CreateMenteeProfileDto } from './dto/create-mentee-profile.dto';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { CreateCohortApplicationDto } from './dto/create-cohort-application.dto';
import { UpdateCohortApplicationDto } from './dto/update-cohort-application.dto';
import { MentorshipPipelineService, MENTEE_COMMITMENT_MIN } from './mentorship-pipeline.service';

@Injectable()
export class MentorshipService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private badgesService: BadgesService,
    private pipeline: MentorshipPipelineService,
  ) {}

  private async getDefaultCycleId(): Promise<string | null> {
    // Prefer ACTIVE cycle, otherwise the nearest UPCOMING cycle.
    const active = await this.prisma.mentorshipCycle.findFirst({
      where: { status: 'ACTIVE' as any },
      orderBy: { startDate: 'desc' },
      select: { id: true },
    });
    if (active?.id) return active.id;

    const upcoming = await this.prisma.mentorshipCycle.findFirst({
      where: { status: 'UPCOMING' as any },
      orderBy: { startDate: 'asc' },
      select: { id: true },
    });
    return upcoming?.id ?? null;
  }

  // ==================== CYCLE INTEREST (ENROLL/INQUIRE) ====================

  async getMyCycleInterest(userId: string, cycleId: string) {
    const record = await this.prisma.mentorshipCycleInterest.findUnique({
      where: { cycleId_userId: { cycleId, userId } },
      select: { status: true, role: true, createdAt: true, updatedAt: true },
    });
    return record ?? { status: 'NONE' };
  }

  async setCycleInterest(userId: string, cycleId: string, interested: boolean) {
    const cycle = await this.prisma.mentorshipCycle.findUnique({ where: { id: cycleId } });
    if (!cycle) throw new NotFoundException('Cycle not found');

    const [mentorProfile, menteeProfile, user] = await Promise.all([
      this.prisma.mentorProfile.findUnique({ where: { userId }, select: { userId: true } }),
      this.prisma.menteeProfile.findUnique({ where: { userId }, select: { userId: true } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
    ]);

    // Default to MENTEE for uncategorized users so admin can still see them in the mentee pool.
    // Mentor role is only set if a verified mentor profile exists (or role explicitly says MENTOR).
    const role =
      mentorProfile || user?.role === 'MENTOR'
        ? 'MENTOR'
        : menteeProfile || user?.role === 'MENTEE'
        ? 'MENTEE'
        : 'MENTEE';

    const status = interested ? 'INTERESTED' : 'WITHDRAWN';

    const record = await this.prisma.mentorshipCycleInterest.upsert({
      where: { cycleId_userId: { cycleId, userId } },
      create: { cycleId, userId, role, status },
      update: { role, status },
    });

    // Notify mentorship admins (and super admin) when someone expresses interest.
    if (interested) {
      const admins = await this.prisma.user.findMany({
        where: {
          isActive: true,
          role: { in: ['SUPER_ADMIN', 'MENTORSHIP_ADMIN', 'PLATFORM_ADMIN', 'ADMIN'] as any },
        },
        select: { id: true },
      });

      await Promise.all(
        admins.map((a) =>
          this.notificationsService.createAndSend(a.id, {
            title: 'New mentorship cycle interest',
            message: `A ${role ?? 'user'} showed interest in "${cycle.name}".`,
            type: 'SYSTEM_ANNOUNCEMENT' as any,
            link: `/mentorships/cycles/${cycleId}`,
          }),
        ),
      );
    }

    return record;
  }

  // ==================== MENTOR PROFILE MANAGEMENT ====================

  async createMentorProfile(userId: string, dto: CreateMentorProfileDto) {
    // Check if profile already exists
    const existing = await this.prisma.mentorProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new BadRequestException('Mentor profile already exists');
    }

    // Extract commitmentAgreed from DTO (it's not a field in MentorProfile model)
    const { commitmentAgreed, ...profileData } = dto;

    return this.prisma.mentorProfile.create({
      data: {
        userId,
        ...profileData,
        // MVP: make mentors immediately discoverable in mobile "Find a Mentor".
        // (Admin can still unverify/unlist later if needed.)
        isVerified: true,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
            skills: true,
            occupation: true,
          },
        },
      },
    });
  }

  async getMentorProfile(userId: string) {
    const profile = await this.prisma.mentorProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
            skills: true,
            occupation: true,
            location: true,
            education: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Mentor profile not found');
    }

    return profile;
  }

  async updateMentorProfile(userId: string, dto: Partial<CreateMentorProfileDto>) {
    // Extract commitmentAgreed from DTO (it's not a field in MentorProfile model)
    const { commitmentAgreed, ...profileData } = dto;

    return this.prisma.mentorProfile.update({
      where: { userId },
      data: profileData,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
          },
        },
      },
    });
  }

  // ==================== MENTEE PROFILE MANAGEMENT ====================

  async createMenteeProfile(userId: string, dto: CreateMenteeProfileDto) {
    const existing = await this.prisma.menteeProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new BadRequestException('Mentee profile already exists');
    }

    return this.prisma.menteeProfile.create({
      data: {
        userId,
        ...dto,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
            skills: true,
          },
        },
      },
    });
  }

  async getMenteeProfile(userId: string) {
    const profile = await this.prisma.menteeProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
            skills: true,
            interests: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Mentee profile not found');
    }

    return profile;
  }

  async updateMenteeProfile(userId: string, dto: Partial<CreateMenteeProfileDto>) {
    return this.prisma.menteeProfile.update({
      where: { userId },
      data: dto,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
          },
        },
      },
    });
  }

  // ==================== CYCLE MANAGEMENT ====================

  async createCycle(dto: CreateCycleDto) {
    const maxCohortSize = dto.maxCohortSize ?? 20;
    const totalWeeks = dto.totalWeeks ?? 12;

    const cycle = await this.prisma.mentorshipCycle.create({
      data: {
        name: dto.name,
        description: dto.description,
        benefits: dto.benefits,
        expectedOutcomes: dto.expectedOutcomes,
        requirements: dto.requirements,
        targetGroup: dto.targetGroup,
        targetGroupEnum: dto.targetGroupEnum ?? undefined,
        conditions: dto.conditions,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        maxMentorships: dto.maxMentorships,
        maxCohortSize,
        totalWeeks,
      },
    });

    const phasesToCreate =
      dto.phases && dto.phases.length > 0
        ? dto.phases
        : [
            { phaseOrder: 1, name: 'Foundation', startWeek: 1, endWeek: 4, description: 'Core skills training, weekly check-ins, small assignments' },
            { phaseOrder: 2, name: 'Application', startWeek: 5, endWeek: 8, description: 'Real project, team collaboration, mentorship sessions' },
            { phaseOrder: 3, name: 'Professionalization', startWeek: 9, endWeek: 12, description: 'Portfolio building, public demo day, certification, LinkedIn' },
          ];

    await this.prisma.cohortPhase.createMany({
      data: phasesToCreate.map((p) => ({
        cycleId: cycle.id,
        phaseOrder: p.phaseOrder,
        name: p.name,
        startWeek: p.startWeek,
        endWeek: p.endWeek,
        description: p.description,
      })),
    });

    return this.prisma.mentorshipCycle.findUnique({
      where: { id: cycle.id },
      include: { phases: true },
    });
  }

  async getCycles() {
    return this.prisma.mentorshipCycle.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        _count: {
          select: {
            programs: true,
            mentorships: true,
            applications: true,
            alumni: true,
          },
        },
        phases: { orderBy: { phaseOrder: 'asc' }, select: { id: true, phaseOrder: true, name: true, startWeek: true, endWeek: true } },
      },
    });
  }

  async getCycleById(id: string) {
    const cycle = await this.prisma.mentorshipCycle.findUnique({
      where: { id },
      include: {
        programs: {
          include: {
            mentorship: {
              include: {
                mentor: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
                mentee: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            tasks: true,
            progress: true,
          },
        },
        mentorships: {
          include: {
            mentor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            mentee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            progress: { orderBy: { week: 'asc' } },
          },
          orderBy: { createdAt: 'desc' },
        },
        matches: {
          include: {
            mentor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            mentee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        interests: {
          where: { status: 'INTERESTED' },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        phases: { orderBy: { phaseOrder: 'asc' } },
        _count: {
          select: {
            programs: true,
            mentorships: true,
            applications: true,
            alumni: true,
          },
        },
      },
    });

    if (!cycle) {
      throw new NotFoundException('Cycle not found');
    }

    return cycle;
  }

  async getCyclePhases(cycleId: string) {
    const cycle = await this.prisma.mentorshipCycle.findUnique({
      where: { id: cycleId },
      select: { id: true },
    });
    if (!cycle) throw new NotFoundException('Cycle not found');
    return this.prisma.cohortPhase.findMany({
      where: { cycleId },
      orderBy: { phaseOrder: 'asc' },
    });
  }

  // ==================== MANUAL ADMIN ASSIGNMENT ====================

  async manualAssignMentorship(cycleId: string, mentorId: string, menteeId: string) {
    if (mentorId === menteeId) {
      throw new BadRequestException('Mentor and mentee cannot be the same user');
    }

    const cycle = await this.prisma.mentorshipCycle.findUnique({ where: { id: cycleId } });
    if (!cycle) throw new NotFoundException('Cycle not found');

    const cohortCap = (cycle as any).maxCohortSize ?? cycle.maxMentorships ?? 20;
    const currentCount = await this.prisma.mentorship.count({
      where: {
        cycleId,
        status: { in: [MentorshipStatus.PENDING, MentorshipStatus.ACTIVE] },
      },
    });
    if (currentCount >= cohortCap) {
      throw new BadRequestException(
        `Cohort is full (max ${cohortCap}). Select a manageable cohort size (10–20 recommended).`,
      );
    }

    const [mentorProfile, menteeProfile, acceptedApplication] = await Promise.all([
      this.prisma.mentorProfile.findUnique({
        where: { userId: mentorId },
        select: { isActive: true, isVerified: true, currentMentees: true, maxMentees: true },
      }),
      this.prisma.menteeProfile.findUnique({
        where: { userId: menteeId },
        select: { isActive: true },
      }),
      this.prisma.cohortApplication.findUnique({
        where: { cycleId_userId: { cycleId, userId: menteeId } },
        select: { status: true },
      }),
    ]);

    if (!mentorProfile || !mentorProfile.isActive || !mentorProfile.isVerified) {
      throw new BadRequestException('Selected mentor must have an active, verified mentor profile');
    }
    const menteeIsAcceptedApplicant = acceptedApplication?.status === CohortApplicationStatus.ACCEPTED;
    if (!menteeProfile || !menteeProfile.isActive) {
      if (!menteeIsAcceptedApplicant) {
        throw new BadRequestException('Selected mentee must have an active mentee profile or be an accepted applicant for this cycle');
      }
      // Ensure a mentee profile exists for accepted cohort applicants so the rest of the system works
      await this.prisma.menteeProfile.upsert({
        where: { userId: menteeId },
        create: {
          userId: menteeId,
          isActive: true,
          learningPreference: [],
        },
        update: { isActive: true },
      });
    }
    if (mentorProfile.currentMentees >= mentorProfile.maxMentees) {
      throw new BadRequestException('Mentor has reached maximum mentees');
    }

    const [existingPair, existingMenteeInCycle] = await Promise.all([
      this.prisma.mentorship.findFirst({
        where: {
          cycleId,
          mentorId,
          menteeId,
          status: { in: [MentorshipStatus.PENDING, MentorshipStatus.ACTIVE] },
        },
      }),
      this.prisma.mentorship.findFirst({
        where: {
          cycleId,
          menteeId,
          status: { in: [MentorshipStatus.PENDING, MentorshipStatus.ACTIVE] },
        },
      }),
    ]);
    if (existingPair) {
      throw new BadRequestException('An active/pending mentorship already exists for this pair in this cycle');
    }
    if (existingMenteeInCycle) {
      throw new BadRequestException('This mentee is already assigned to a mentor in this cycle');
    }

    // Create (or reuse) a match record as an audit trail for manual assignment.
    const match = await this.prisma.mentorshipMatch.upsert({
      where: {
        mentorId_menteeId_cycleId: {
          mentorId,
          menteeId,
          cycleId,
        },
      },
      create: {
        mentorId,
        menteeId,
        cycleId,
        matchScore: 100,
        skillMatch: 40,
        industryRelevance: 20,
        availabilityMatch: 20,
        communicationMatch: 10,
        personalityFit: 10,
        status: MatchStatus.APPROVED,
        mentorApproved: true,
        menteeApproved: true,
        matchedAt: new Date(),
      },
      update: {
        status: MatchStatus.APPROVED,
        mentorApproved: true,
        menteeApproved: true,
        matchedAt: new Date(),
      },
    });

    const mentorship = await this.prisma.mentorship.create({
      data: {
        mentorId,
        menteeId,
        cycleId,
        matchId: match.id,
        status: MentorshipStatus.ACTIVE,
        startedAt: new Date(),
      },
      include: {
        mentor: { select: { id: true, firstName: true, lastName: true } },
        mentee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.prisma.mentorProfile.update({
      where: { userId: mentorId },
      data: { currentMentees: { increment: 1 }, totalMentees: { increment: 1 } },
    });

    await this.createProgram(mentorship.id, cycleId);

    await Promise.all([
      this.notificationsService.createAndSend(mentorId, {
        title: 'New mentorship assigned',
        message: `You have been assigned a new mentee: ${mentorship.mentee.firstName} ${mentorship.mentee.lastName}.`,
        type: 'MENTORSHIP_REQUEST' as any,
        link: `/mentorship/program/${mentorship.id}`,
        mentorshipId: mentorship.id,
      }),
      this.notificationsService.createAndSend(menteeId, {
        title: 'Your mentor has been assigned',
        message: `You have been assigned a mentor: ${mentorship.mentor.firstName} ${mentorship.mentor.lastName}.`,
        type: 'MENTORSHIP_REQUEST' as any,
        link: `/mentorship/program/${mentorship.id}`,
        mentorshipId: mentorship.id,
      }),
    ]);

    return mentorship;
  }

  // ==================== MATCHING ALGORITHM (Outcome pipeline: weighted compatibility) ====================

  async calculateMatchScore(
    mentorId: string,
    menteeId: string,
    cycleId?: string,
  ): Promise<{
    matchScore: number;
    skillMatch: number;
    industryRelevance: number;
    availabilityMatch: number;
    communicationMatch: number;
    personalityFit: number;
  }> {
    const c = await this.pipeline.calculateCompatibilityScore(mentorId, menteeId);
    // Map to legacy component scale: skill 0–40, industry 0–20, availability 0–20, communication 0–10, personality 0–10
    return {
      matchScore: Math.round(c.compatibilityScore * 100) / 100,
      skillMatch: Math.round(c.skillMatchScore * 40 * 100) / 100,
      industryRelevance: Math.round(c.goalAlignmentScore * 20 * 100) / 100,
      availabilityMatch: Math.round(c.availabilityOverlapScore * 20 * 100) / 100,
      communicationMatch: Math.round(c.timezoneScore * 10 * 100) / 100,
      personalityFit: Math.round(c.mentorScoreNormalized * 10 * 100) / 100,
    };
  }

  async findMatches(menteeId: string, cycleId: string, minScore = 70) {
    if (!cycleId) {
      throw new BadRequestException('cycleId is required. All matches must belong to a cycle.');
    }

    const cycle = await this.prisma.mentorshipCycle.findUnique({
      where: { id: cycleId },
    });

    if (!cycle) {
      throw new NotFoundException('Cycle not found');
    }

    const mentee = await this.prisma.menteeProfile.findUnique({
      where: { userId: menteeId },
    });

    if (!mentee) {
      throw new NotFoundException('Mentee profile not found');
    }

    // Outcome pipeline: reject low-commitment mentees (score < 50)
    const app = await this.prisma.cohortApplication.findUnique({
      where: { cycleId_userId: { cycleId, userId: menteeId } },
    });
    const { score: commitmentScore } = await this.pipeline.calculateMenteeCommitmentScore(menteeId, app?.id);
    if (commitmentScore < MENTEE_COMMITMENT_MIN) {
      throw new BadRequestException(
        `Commitment score too low (${commitmentScore.toFixed(0)}). Minimum ${MENTEE_COMMITMENT_MIN}. Complete your profile, add portfolio links, and availability to improve.`,
      );
    }

    // Get all active mentors
    const mentors = await this.prisma.mentorProfile.findMany({
      where: {
        isActive: true,
        isVerified: true,
        currentMentees: { lt: this.prisma.mentorProfile.fields.maxMentees },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
            skills: true,
            occupation: true,
            bio: true,
          },
        },
      },
    });

    // Calculate match scores for each mentor
    const matches = await Promise.all(
      mentors.map(async (mentor) => {
        const scores = await this.calculateMatchScore(mentor.userId, menteeId, cycleId);
        return {
          mentor,
          ...scores,
        };
      }),
    );

    // Filter by minimum score and sort
    const filteredMatches = matches
      .filter((m) => m.matchScore >= minScore)
      .sort((a, b) => b.matchScore - a.matchScore);

    // Create or get match records
    const matchRecords = await Promise.all(
      filteredMatches.map(async (match) => {
        const existing = await this.prisma.mentorshipMatch.findUnique({
          where: {
            mentorId_menteeId_cycleId: {
              mentorId: match.mentor.userId,
              menteeId,
              cycleId,
            },
          },
        });

        if (existing) {
          return existing.id;
        }

        const created = await this.prisma.mentorshipMatch.create({
          data: {
            mentorId: match.mentor.userId,
            menteeId,
            cycleId,
            matchScore: match.matchScore,
            skillMatch: match.skillMatch,
            industryRelevance: match.industryRelevance,
            availabilityMatch: match.availabilityMatch,
            communicationMatch: match.communicationMatch,
            personalityFit: match.personalityFit,
            status: MatchStatus.PENDING,
          },
        });
        return created.id;
      }),
    );

    // Return all matches with consistent include (mentor + mentee) for mobile/admin consistency
    if (matchRecords.length === 0) return [];

    return this.prisma.mentorshipMatch.findMany({
      where: { id: { in: matchRecords } },
      include: {
        mentor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
            skills: true,
            occupation: true,
            bio: true,
          },
        },
        mentee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
          },
        },
      },
      orderBy: { matchScore: 'desc' },
    });
  }

  async approveMatch(matchId: string, userId: string, isMentor: boolean) {
    const match = await this.prisma.mentorshipMatch.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    if (isMentor && match.mentorId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    if (!isMentor && match.menteeId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    const updateData: any = {};
    if (isMentor) {
      updateData.mentorApproved = true;
    } else {
      updateData.menteeApproved = true;
    }

    // If both approved, create mentorship
    const updated = await this.prisma.mentorshipMatch.update({
      where: { id: matchId },
      data: updateData,
    });

    if (updated.mentorApproved && updated.menteeApproved) {
      // Create mentorship from match
      const mentorship = await this.createMentorshipFromMatch(matchId);
      await this.prisma.mentorshipMatch.update({
        where: { id: matchId },
        data: {
          status: MatchStatus.APPROVED,
          matchedAt: new Date(),
        },
      });
      return mentorship;
    }

    return updated;
  }

  async createMentorshipFromMatch(matchId: string) {
    const match = await this.prisma.mentorshipMatch.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    if (!match.cycleId) {
      throw new BadRequestException('Match must belong to a cycle to create mentorship');
    }

    const mentee = await this.prisma.menteeProfile.findUnique({
      where: { userId: match.menteeId },
    });

    const mentorship = await this.prisma.mentorship.create({
      data: {
        mentorId: match.mentorId,
        menteeId: match.menteeId,
        cycleId: match.cycleId, // REQUIRED: All mentorships must belong to a cycle
        matchId: match.id,
        status: MentorshipStatus.ACTIVE,
        goals: mentee?.careerGoals || '',
        startedAt: new Date(),
      },
      include: {
        mentor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
          },
        },
        mentee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
          },
        },
      },
    });

    // Update mentor current mentees count
    await this.prisma.mentorProfile.update({
      where: { userId: match.mentorId },
      data: {
        currentMentees: { increment: 1 },
        totalMentees: { increment: 1 },
      },
    });

    // Create program for the cycle (always required now)
    await this.createProgram(mentorship.id, match.cycleId);

    // Send notifications
    await this.notificationsService.create(match.mentorId, {
      title: 'Mentorship Match Approved',
      message: `Your mentorship with ${mentorship.mentee.firstName} ${mentorship.mentee.lastName} has been approved and started!`,
      type: 'MENTORSHIP_REQUEST' as any,
      mentorshipId: mentorship.id,
    });

    await this.notificationsService.create(match.menteeId, {
      title: 'Mentorship Started',
      message: `Your mentorship with ${mentorship.mentor.firstName} ${mentorship.mentor.lastName} has started!`,
      type: 'MENTORSHIP_REQUEST' as any,
      mentorshipId: mentorship.id,
    });

    return mentorship;
  }

  // ==================== PROGRAM MANAGEMENT ====================

  async createProgram(mentorshipId: string, cycleId: string) {
    const cycle = await this.prisma.mentorshipCycle.findUnique({
      where: { id: cycleId },
    });

    if (!cycle) {
      throw new NotFoundException('Cycle not found');
    }

    const program = await this.prisma.mentorshipProgram.create({
      data: {
        mentorshipId,
        cycleId,
        week: 1,
        status: 'ACTIVE',
        startedAt: new Date(),
      },
    });

    // Generate initial tasks for week 1
    await this.generateTasks(mentorshipId, program.id, 1);

    return program;
  }

  async getProgram(mentorshipId: string, cycleId: string) {
    return this.prisma.mentorshipProgram.findUnique({
      where: {
        mentorshipId_cycleId: {
          mentorshipId,
          cycleId,
        },
      },
      include: {
        tasks: true,
        progress: true,
        evaluations: true,
        mentorship: {
          include: {
            mentor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
              },
            },
            mentee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
              },
            },
          },
        },
      },
    });
  }

  // ==================== TASK MANAGEMENT ====================

  async createTask(
    mentorUserId: string,
    data: {
      mentorshipId: string;
      programId?: string;
      week: number;
      title: string;
      description?: string;
      type?: string;
      dueDate?: string;
    },
  ) {
    // Verify the user is the mentor for this mentorship and get cycleId
    const mentorship = await this.prisma.mentorship.findUnique({
      where: { id: data.mentorshipId },
      select: { mentorId: true, status: true, cycleId: true },
    });

    if (!mentorship) {
      throw new NotFoundException('Mentorship not found');
    }

    if (!mentorship.cycleId) {
      throw new BadRequestException('Mentorship must belong to a cycle');
    }

    if (mentorship.mentorId !== mentorUserId) {
      throw new ForbiddenException('Only the mentor can create tasks');
    }

    if (mentorship.status !== 'ACTIVE') {
      throw new BadRequestException('Can only create tasks for active mentorships');
    }

    const task = await this.prisma.mentorshipTask.create({
      data: {
        mentorshipId: data.mentorshipId,
        cycleId: mentorship.cycleId, // REQUIRED: All tasks must belong to a cycle
        programId: data.programId,
        week: data.week,
        title: data.title,
        description: data.description,
        type: (data.type as any) || 'CUSTOM',
        status: TaskStatus.PENDING,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        aiGenerated: false,
      },
    });

    // Update progress
    const [totalTasks, completedTasks] = await Promise.all([
      this.prisma.mentorshipTask.count({
        where: { mentorshipId: data.mentorshipId, week: data.week },
      }),
      this.prisma.mentorshipTask.count({
        where: { mentorshipId: data.mentorshipId, week: data.week, status: TaskStatus.COMPLETED },
      }),
    ]);

    await this.prisma.mentorshipProgress.upsert({
      where: {
        mentorshipId_week: {
          mentorshipId: data.mentorshipId,
          week: data.week,
        },
      },
      create: {
        mentorshipId: data.mentorshipId,
        programId: data.programId ?? undefined,
        week: data.week,
        tasksCompleted: completedTasks,
        totalTasks,
      },
      update: {
        totalTasks,
        tasksCompleted: completedTasks,
      },
    });

    // Notify mentee
    const mentorshipWithMentee = await this.prisma.mentorship.findUnique({
      where: { id: data.mentorshipId },
      include: { mentee: true },
    });

    if (mentorshipWithMentee) {
      await this.notificationsService.create(mentorshipWithMentee.menteeId, {
        title: 'New Task Assigned',
        message: `Your mentor assigned a new task: ${data.title}`,
        type: 'MENTORSHIP_REQUEST' as any,
        mentorshipId: data.mentorshipId,
      });
    }

    return task;
  }

  async generateTasks(mentorshipId: string, programId: string, week: number) {
    const mentorship = await this.prisma.mentorship.findUnique({
      where: { id: mentorshipId },
      include: {
        mentee: {
          include: {
            menteeProfile: true,
          },
        },
      },
    });

    if (!mentorship) {
      throw new NotFoundException('Mentorship not found');
    }

    if (!mentorship.cycleId) {
      throw new BadRequestException('Mentorship must belong to a cycle to generate tasks');
    }

    // Generate AI-based tasks (simplified for now)
    const taskTemplates = [
      {
        title: `Week ${week} Learning Task`,
        description: `Complete the learning module for week ${week}`,
        type: 'learning',
      },
      {
        title: `Week ${week} Practice Task`,
        description: `Practice the skills learned this week`,
        type: 'practice',
      },
      {
        title: `Week ${week} Reflection`,
        description: `Reflect on your progress and challenges`,
        type: 'reflection',
      },
    ];

    const tasks = await Promise.all(
      taskTemplates.map((template) =>
        this.prisma.mentorshipTask.create({
          data: {
            mentorshipId,
            cycleId: mentorship.cycleId, // REQUIRED: All tasks must belong to a cycle
            programId,
            week,
            title: template.title,
            description: template.description,
            type: template.type,
            status: TaskStatus.PENDING,
            aiGenerated: true,
            dueDate: new Date(Date.now() + week * 7 * 24 * 60 * 60 * 1000),
          },
        }),
      ),
    );

    return tasks;
  }

  async getTasks(mentorshipId: string, week?: number) {
    const where: any = { mentorshipId };
    if (week) {
      where.week = week;
    }

    return this.prisma.mentorshipTask.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateTaskStatus(
    taskId: string,
    actorUserId: string,
    status: TaskStatus,
    mentorFeedback?: string,
  ) {
    // Get the task with mentorship info to check permissions
    const task = await this.prisma.mentorshipTask.findUnique({
      where: { id: taskId },
      include: {
        mentorship: {
          select: {
            id: true,
            mentorId: true,
            menteeId: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const isMentor = task.mentorship.mentorId === actorUserId;
    const isMentee = task.mentorship.menteeId === actorUserId;

    if (!isMentor && !isMentee) {
      throw new ForbiddenException('You are not authorized to update this task');
    }

    // Permission logic:
    // - Mentee can mark tasks as IN_PROGRESS or COMPLETED
    // - Mentor can provide feedback on completed tasks (but status should already be COMPLETED)
    // - Mentor can also mark tasks as COMPLETED (to acknowledge completion)
    // - Mentor can mark tasks as SKIPPED if needed

    if (isMentee) {
      // Mentee can mark as IN_PROGRESS or COMPLETED
      if (status !== TaskStatus.IN_PROGRESS && status !== TaskStatus.COMPLETED) {
        throw new ForbiddenException('Mentees can only mark tasks as IN_PROGRESS or COMPLETED');
      }
    }

    // If mentor is providing feedback, task should be completed by mentee first
    if (isMentor && mentorFeedback && task.status !== TaskStatus.COMPLETED) {
      // Mentor can still mark as completed if mentee hasn't
      // This allows mentor to acknowledge completion directly
    }

    const updated = await this.prisma.mentorshipTask.update({
      where: { id: taskId },
      data: {
        status,
        completedAt: status === TaskStatus.COMPLETED ? new Date() : null,
        mentorFeedback: isMentor ? mentorFeedback : undefined, // Only mentor can set feedback
      },
    });

    // Keep weekly progress in sync so UI can show real-time progress without manual updates.
    // Progress is stored per mentorship + week (unique), and optionally linked to the programId.
    try {
      const [totalTasks, completedTasks] = await Promise.all([
        this.prisma.mentorshipTask.count({
          where: { mentorshipId: updated.mentorshipId, week: updated.week },
        }),
        this.prisma.mentorshipTask.count({
          where: { mentorshipId: updated.mentorshipId, week: updated.week, status: TaskStatus.COMPLETED },
        }),
      ]);

      const progressScore = await this.pipeline.computeWeeklyProgressScore(
        updated.mentorshipId,
        updated.week,
      );
      await this.prisma.mentorshipProgress.upsert({
        where: {
          mentorshipId_week: {
            mentorshipId: updated.mentorshipId,
            week: updated.week,
          },
        },
        create: {
          mentorshipId: updated.mentorshipId,
          programId: updated.programId ?? undefined,
          week: updated.week,
          tasksCompleted: completedTasks,
          totalTasks,
          progressScore,
        },
        update: {
          tasksCompleted: completedTasks,
          totalTasks,
          programId: updated.programId ?? undefined,
          progressScore,
        },
      });

      await this.prisma.mentorship.update({
        where: { id: updated.mentorshipId },
        data: { lastActivityAt: new Date() },
      });

      // If a week is fully completed, advance the program week and generate next week's tasks.
      if (
        totalTasks > 0 &&
        completedTasks === totalTasks &&
        updated.programId &&
        updated.week < 8
      ) {
        const program = await this.prisma.mentorshipProgram.findUnique({
          where: { id: updated.programId },
          select: { id: true, week: true },
        });

        // Only advance if the program is currently on this week
        if (program && program.week === updated.week) {
          const nextWeek = updated.week + 1;

          await this.prisma.mentorshipProgram.update({
            where: { id: program.id },
            data: { week: nextWeek },
          });

          const existingNextWeekTasks = await this.prisma.mentorshipTask.count({
            where: {
              mentorshipId: updated.mentorshipId,
              programId: updated.programId,
              week: nextWeek,
            },
          });

          if (existingNextWeekTasks === 0) {
            await this.generateTasks(updated.mentorshipId, updated.programId, nextWeek);
          }
        }
      }
    } catch (e) {
      // Do not block task updates if progress update fails
      // eslint-disable-next-line no-console
      console.error('Failed to update mentorship progress after task update', e);
    }

    return updated;
  }

  async getSessions(mentorshipId: string) {
    const mentorship = await this.prisma.mentorship.findUnique({
      where: { id: mentorshipId },
      select: { id: true, mentorId: true, menteeId: true },
    });

    if (!mentorship) {
      throw new NotFoundException('Mentorship not found');
    }

    const sessions = await this.prisma.mentorshipSession.findMany({
      where: { mentorshipId },
      orderBy: { scheduledDate: 'desc' },
    });

    return sessions;
  }

  /**
   * Create a new session (mentor only)
   */
  async createSession(mentorshipId: string, userId: string, dto: CreateSessionDto) {
    const mentorship = await this.prisma.mentorship.findUnique({
      where: { id: mentorshipId },
      include: {
        mentor: { select: { id: true, firstName: true, lastName: true } },
        mentee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!mentorship) {
      throw new NotFoundException('Mentorship not found');
    }

    // Only mentors can create sessions
    if (mentorship.mentorId !== userId) {
      throw new ForbiddenException('Only mentors can create sessions');
    }

    if (mentorship.status !== MentorshipStatus.ACTIVE) {
      throw new BadRequestException('Can only create sessions for active mentorships');
    }

    const scheduledDate = new Date(dto.scheduledDate);
    if (isNaN(scheduledDate.getTime())) {
      throw new BadRequestException('Invalid date format for scheduledDate');
    }

    // Validate that the date is in the future
    const now = new Date();
    if (scheduledDate < now) {
      throw new BadRequestException('Cannot schedule sessions in the past');
    }

    // Validate online session requirements
    if (dto.isOnline && !dto.onlineLink) {
      throw new BadRequestException('Online link is required for online sessions');
    }

    const session = await this.prisma.mentorshipSession.create({
      data: {
        mentorshipId,
        scheduledDate,
        status: SessionStatus.SCHEDULED,
        topics: dto.topics || null,
        notes: dto.notes || null,
        duration: dto.duration || null,
        location: dto.location || null,
        isOnline: dto.isOnline || false,
        onlineLink: dto.onlineLink || null,
      },
    });

    // Activation: first meeting within 72h → set firstMeetingScheduledAt and optionally activatedAt
    const existingSessions = await this.prisma.mentorshipSession.count({
      where: { mentorshipId },
    });
    if (existingSessions === 1 && !mentorship.firstMeetingScheduledAt) {
      const startedAt = mentorship.startedAt || mentorship.createdAt;
      const hoursToMeeting = (scheduledDate.getTime() - new Date(startedAt).getTime()) / (1000 * 60 * 60);
      await this.prisma.mentorship.update({
        where: { id: mentorshipId },
        data: {
          firstMeetingScheduledAt: scheduledDate,
          ...(hoursToMeeting <= 72 && { activatedAt: new Date() }),
          lastActivityAt: new Date(),
        },
      });
      if (hoursToMeeting > 72) {
        await this.prisma.mentorshipIntervention.create({
          data: {
            mentorshipId,
            type: 'ACTIVATION_72H_FAILED',
            notes: `First meeting scheduled ${hoursToMeeting.toFixed(0)}h after start (max 72h).`,
            metadata: { hoursToMeeting, scheduledDate: scheduledDate.toISOString() },
          },
        });
      }
    } else {
      await this.prisma.mentorship.update({
        where: { id: mentorshipId },
        data: { lastActivityAt: new Date() },
      });
    }

    await this.notificationsService.createAndSend(mentorship.menteeId, {
      title: 'New Session Scheduled',
      message: `${mentorship.mentor.firstName} ${mentorship.mentor.lastName} scheduled a session for ${scheduledDate.toLocaleDateString()}.`,
      type: 'MENTORSHIP_REQUEST' as any,
      mentorshipId: mentorship.id,
    });

    return session;
  }

  /**
   * Update a session (mentor only, upcoming sessions only)
   */
  async updateSession(sessionId: string, userId: string, dto: UpdateSessionDto) {
    const session = await this.prisma.mentorshipSession.findUnique({
      where: { id: sessionId },
      include: {
        mentorship: {
          include: {
            mentor: { select: { id: true, firstName: true, lastName: true } },
            mentee: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Only mentors can update sessions
    if (session.mentorship.mentorId !== userId) {
      throw new ForbiddenException('Only mentors can update sessions');
    }

    // Only upcoming scheduled sessions can be edited
    const now = new Date();
    const isPast = session.scheduledDate < now;
    if (session.status !== SessionStatus.SCHEDULED || isPast) {
      throw new BadRequestException('Only upcoming scheduled sessions can be edited');
    }

    const updateData: any = {};

    if (dto.scheduledDate) {
      const scheduledDate = new Date(dto.scheduledDate);
      if (isNaN(scheduledDate.getTime())) {
        throw new BadRequestException('Invalid date format for scheduledDate');
      }

      // Validate that the date is in the future
      if (scheduledDate < now) {
        throw new BadRequestException('Cannot schedule sessions in the past');
      }

      updateData.scheduledDate = new Date(dto.scheduledDate);
    }

    if (dto.topics !== undefined) {
      updateData.topics = dto.topics || null;
    }

    if (dto.notes !== undefined) {
      updateData.notes = dto.notes || null;
    }

    if (dto.duration !== undefined) {
      updateData.duration = dto.duration || null;
    }

    if (dto.isOnline !== undefined) {
      updateData.isOnline = dto.isOnline;
      // If switching to online, validate onlineLink
      if (dto.isOnline && !dto.onlineLink && !session.onlineLink) {
        throw new BadRequestException('Online link is required for online sessions');
      }
      // If switching to offline, clear onlineLink
      if (!dto.isOnline) {
        updateData.onlineLink = null;
      }
    }

    if (dto.location !== undefined) {
      updateData.location = dto.location || null;
    }

    if (dto.onlineLink !== undefined) {
      updateData.onlineLink = dto.onlineLink || null;
      // Validate that onlineLink is provided if session is online
      const willBeOnline = dto.isOnline !== undefined ? dto.isOnline : session.isOnline;
      if (willBeOnline && !dto.onlineLink) {
        throw new BadRequestException('Online link is required for online sessions');
      }
    }

    const updated = await this.prisma.mentorshipSession.update({
      where: { id: sessionId },
      data: updateData,
    });

    // Notify the mentee if the date changed
    if (dto.scheduledDate) {
      await this.notificationsService.createAndSend(session.mentorship.menteeId, {
        title: 'Session Updated',
        message: `${session.mentorship.mentor.firstName} ${session.mentorship.mentor.lastName} updated the session schedule.`,
        type: 'MENTORSHIP_REQUEST' as any,
        mentorshipId: session.mentorshipId,
      });
    }

    return updated;
  }

  /**
   * Cancel a session (mentor only, scheduled sessions only)
   */
  async cancelSession(sessionId: string, userId: string) {
    const session = await this.prisma.mentorshipSession.findUnique({
      where: { id: sessionId },
      include: {
        mentorship: {
          include: {
            mentor: { select: { id: true, firstName: true, lastName: true } },
            mentee: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Only mentors can cancel sessions
    if (session.mentorship.mentorId !== userId) {
      throw new ForbiddenException('Only mentors can cancel sessions');
    }

    // Only scheduled sessions can be cancelled
    if (session.status !== SessionStatus.SCHEDULED) {
      throw new BadRequestException('Only scheduled sessions can be cancelled');
    }

    const cancelled = await this.prisma.mentorshipSession.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.CANCELLED,
      },
    });

    // Notify the mentee
    await this.notificationsService.createAndSend(session.mentorship.menteeId, {
      title: 'Session Cancelled',
      message: `${session.mentorship.mentor.firstName} ${session.mentorship.mentor.lastName} cancelled the scheduled session.`,
      type: 'MENTORSHIP_REQUEST' as any,
      mentorshipId: session.mentorshipId,
    });

    return cancelled;
  }

  /**
   * Mark a session as completed (mentor only)
   */
  async completeSession(sessionId: string, userId: string, notes?: string) {
    const session = await this.prisma.mentorshipSession.findUnique({
      where: { id: sessionId },
      include: {
        mentorship: {
          include: {
            mentor: { select: { id: true, firstName: true, lastName: true } },
            mentee: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Only mentors can complete sessions
    if (session.mentorship.mentorId !== userId) {
      throw new ForbiddenException('Only mentors can complete sessions');
    }

    // Only scheduled sessions can be completed
    if (session.status !== SessionStatus.SCHEDULED) {
      throw new BadRequestException('Only scheduled sessions can be completed');
    }

    const completed = await this.prisma.mentorshipSession.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.COMPLETED,
        actualDate: new Date(),
        completedBy: userId,
        notes: notes || session.notes,
      },
    });

    // Increment sessions completed count
    await this.prisma.mentorship.update({
      where: { id: session.mentorshipId },
      data: {
        sessionsCompleted: { increment: 1 },
      },
    });

    // Notify the mentee
    await this.notificationsService.createAndSend(session.mentorship.menteeId, {
      title: 'Session Completed',
      message: `${session.mentorship.mentor.firstName} ${session.mentorship.mentor.lastName} marked the session as completed.`,
      type: 'MENTORSHIP_REQUEST' as any,
      mentorshipId: session.mentorshipId,
    });

    return completed;
  }

  /**
   * Request a session (mentee only)
   * Mentees can request sessions, which mentors can then approve and schedule
   */
  async requestSession(
    mentorshipId: string,
    menteeUserId: string,
    data: { requestedDate?: string; notes?: string },
  ) {
    const mentorship = await this.prisma.mentorship.findUnique({
      where: { id: mentorshipId },
      include: {
        mentor: { select: { id: true, firstName: true, lastName: true } },
        mentee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!mentorship) {
      throw new NotFoundException('Mentorship not found');
    }

    // Only mentees can request sessions
    if (mentorship.menteeId !== menteeUserId) {
      throw new ForbiddenException('Only mentees can request sessions');
    }

    if (mentorship.status !== MentorshipStatus.ACTIVE) {
      throw new BadRequestException('Can only request sessions for active mentorships');
    }

    // Parse requested date if provided, otherwise use a placeholder date
    const requestedDate = data.requestedDate 
      ? new Date(data.requestedDate)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default to 7 days from now

    if (isNaN(requestedDate.getTime())) {
      throw new BadRequestException('Invalid date format for requestedDate');
    }

    // Extract topics from notes if provided
    let topics: string | null = null;
    let cleanedNotes: string | null = null;
    
    if (data.notes) {
      const topicsMatch = data.notes.match(/Topics:\s*(.+?)(?:\n|$)/i);
      if (topicsMatch) {
        topics = topicsMatch[1].trim();
      }
      
      cleanedNotes = data.notes
        .replace(/Topics:\s*.+?(?:\n|$)/gi, '')
        .trim();
      
      if (cleanedNotes === '') {
        cleanedNotes = `Session requested by mentee for ${requestedDate.toLocaleDateString()}`;
      }
    } else {
      cleanedNotes = `Session requested by mentee for ${requestedDate.toLocaleDateString()}`;
    }

    // Create a session request (status: REQUESTED)
    const sessionRequest = await this.prisma.mentorshipSession.create({
      data: {
        mentorshipId,
        scheduledDate: requestedDate,
        status: SessionStatus.REQUESTED,
        topics: topics,
        notes: cleanedNotes,
      },
      include: {
        mentorship: {
          include: {
            mentor: { select: { id: true, firstName: true, lastName: true } },
            mentee: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    // Notify mentor about the session request
    await this.notificationsService.createAndSend(mentorship.mentorId, {
      title: 'New Session Request',
      message: `${mentorship.mentee.firstName} ${mentorship.mentee.lastName} has requested a session for ${requestedDate.toLocaleDateString()}.`,
      type: 'MENTORSHIP_REQUEST' as any,
      mentorshipId: mentorship.id,
      link: `/mentorship/${mentorshipId}/sessions`,
    });

    return {
      ...sessionRequest,
      message: 'Session request sent to mentor. They will review and schedule if available.',
    };
  }

  async recordSession(
    mentorshipId: string,
    actorUserId: string,
    data: { nextSessionDate?: string; sessionCompleted?: boolean; notes?: string },
  ) {
    const mentorship = await this.prisma.mentorship.findUnique({
      where: { id: mentorshipId },
      include: {
        mentor: { select: { id: true, firstName: true, lastName: true } },
        mentee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!mentorship) {
      throw new NotFoundException('Mentorship not found');
    }

    const isParticipant = mentorship.mentorId === actorUserId || mentorship.menteeId === actorUserId;
    if (!isParticipant) {
      throw new ForbiddenException('You are not allowed to update this mentorship');
    }

    // Build update data object - only include fields that are being updated
    const updateData: any = {};

    // Handle session completion
    // Only mentors can mark sessions as complete
    if (data.sessionCompleted) {
      const isMentor = mentorship.mentorId === actorUserId;
      
      // Only mentors can mark sessions as complete
      if (!isMentor) {
        throw new ForbiddenException('Only mentors can mark sessions as complete');
      }
      
      // Find the most recent scheduled session that hasn't been completed
      const nextSession = await this.prisma.mentorshipSession.findFirst({
        where: {
          mentorshipId,
          status: SessionStatus.SCHEDULED,
          scheduledDate: { lte: new Date() }, // Can complete if scheduled date has passed or is today
        },
        orderBy: { scheduledDate: 'desc' },
      });

      if (nextSession) {
        // Mark the session as completed
        await this.prisma.mentorshipSession.update({
          where: { id: nextSession.id },
          data: {
            status: SessionStatus.COMPLETED,
            actualDate: new Date(),
            completedBy: actorUserId,
            notes: data.notes || nextSession.notes,
          },
        });
      } else {
        // If no scheduled session found, create a completed session record
        // This handles cases where sessions weren't scheduled in advance
        await this.prisma.mentorshipSession.create({
          data: {
            mentorshipId,
            scheduledDate: mentorship.nextSessionDate || new Date(),
            actualDate: new Date(),
            status: SessionStatus.COMPLETED,
            completedBy: actorUserId,
            notes: data.notes,
          },
        });
      }

      // Increment sessions completed count (only if not already completed)
      // Check if we're completing a new session or updating an existing one
      const wasAlreadyCompleted = nextSession?.status === SessionStatus.COMPLETED;
      if (!wasAlreadyCompleted) {
        updateData.sessionsCompleted = mentorship.sessionsCompleted + 1;
      }
      
      // Notify the other party when a session is completed
      const otherPartyId = isMentor ? mentorship.menteeId : mentorship.mentorId;
      const actorName = isMentor
        ? `${mentorship.mentor.firstName} ${mentorship.mentor.lastName}`
        : `${mentorship.mentee.firstName} ${mentorship.mentee.lastName}`;
      const actorRole = isMentor ? 'mentor' : 'mentee';

      await this.notificationsService.createAndSend(otherPartyId, {
        title: 'Session Completed',
        message: `Your ${actorRole} marked the session as completed.`,
        type: 'MENTORSHIP_REQUEST' as any,
        mentorshipId: mentorship.id,
      });
    }

    // Handle next session date
    // Only mentors can schedule sessions directly or approve session requests
    // Mentees must make requests instead
    if (data.nextSessionDate !== undefined) {
      const isMentor = mentorship.mentorId === actorUserId;
      
      // Only mentors can schedule sessions directly
      if (!isMentor) {
        throw new ForbiddenException('Only mentors can schedule sessions. Please request a session instead.');
      }
      
      if (data.nextSessionDate) {
        const nextDate = new Date(data.nextSessionDate);
        if (isNaN(nextDate.getTime())) {
          throw new BadRequestException('Invalid date format for nextSessionDate');
        }
        
        // Validate that the date is not too far in the past (allow same day)
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const sessionDate = new Date(nextDate);
        sessionDate.setHours(0, 0, 0, 0);
        
        if (sessionDate < now) {
          throw new BadRequestException('Cannot schedule sessions in the past');
        }
        
        updateData.nextSessionDate = nextDate;

        // Extract topics and other details from notes if provided
        let topics: string | null = null;
        let duration: number | null = null;
        let cleanedNotes: string | null = null;
        
        if (data.notes) {
          // Parse topics from notes (format: "Topics: ...")
          const topicsMatch = data.notes.match(/Topics:\s*(.+?)(?:\n|$)/i);
          if (topicsMatch) {
            topics = topicsMatch[1].trim();
          }
          
          // Parse duration from notes (format: "Duration: X minutes")
          const durationMatch = data.notes.match(/Duration:\s*(\d+)\s*minutes?/i);
          if (durationMatch) {
            duration = parseInt(durationMatch[1]);
          }
          
          // Clean notes - remove parsed fields
          cleanedNotes = data.notes
            .replace(/Topics:\s*.+?(?:\n|$)/gi, '')
            .replace(/Location:\s*.+?(?:\n|$)/gi, '')
            .replace(/Meeting Link:\s*.+?(?:\n|$)/gi, '')
            .replace(/Duration:\s*\d+\s*minutes?/gi, '')
            .trim();
          
          if (cleanedNotes === '') {
            cleanedNotes = null;
          }
        }

        // Check if there's a REQUESTED session that can be approved
        const requestedSession = await this.prisma.mentorshipSession.findFirst({
          where: {
            mentorshipId,
            status: SessionStatus.REQUESTED,
          },
          orderBy: { createdAt: 'desc' },
        });

        if (requestedSession) {
          // Approve the requested session by updating it to SCHEDULED
          await this.prisma.mentorshipSession.update({
            where: { id: requestedSession.id },
            data: {
              scheduledDate: nextDate,
              status: SessionStatus.SCHEDULED,
              topics: topics || requestedSession.topics,
              duration: duration || requestedSession.duration,
              notes: cleanedNotes || requestedSession.notes,
            },
          });

          // Notify mentee that their session request was approved
          await this.notificationsService.createAndSend(mentorship.menteeId, {
            title: 'Session Request Approved',
            message: `${mentorship.mentor.firstName} ${mentorship.mentor.lastName} has approved your session request and scheduled it for ${nextDate.toLocaleDateString()}.`,
            type: 'MENTORSHIP_REQUEST' as any,
            mentorshipId: mentorship.id,
          });
        } else {
          // No requested session, check for existing scheduled session
          const existingScheduled = await this.prisma.mentorshipSession.findFirst({
            where: {
              mentorshipId,
              status: SessionStatus.SCHEDULED,
              scheduledDate: { gte: now },
            },
            orderBy: { scheduledDate: 'asc' },
          });

          if (existingScheduled) {
            // Update the existing scheduled session
            await this.prisma.mentorshipSession.update({
              where: { id: existingScheduled.id },
              data: {
                scheduledDate: nextDate,
                topics: topics !== null ? topics : existingScheduled.topics,
                duration: duration !== null ? duration : existingScheduled.duration,
                notes: cleanedNotes !== null ? cleanedNotes : existingScheduled.notes,
              },
            });
          } else {
            // Create a new scheduled session
            await this.prisma.mentorshipSession.create({
              data: {
                mentorshipId,
                scheduledDate: nextDate,
                status: SessionStatus.SCHEDULED,
                topics: topics || null,
                duration: duration || null,
                notes: cleanedNotes || null,
              },
            });
          }
        }

        // Notify the other party when a session is scheduled
        const otherPartyId = mentorship.mentorId === actorUserId ? mentorship.menteeId : mentorship.mentorId;
        const actorName = mentorship.mentorId === actorUserId 
          ? `${mentorship.mentor.firstName} ${mentorship.mentor.lastName}`
          : `${mentorship.mentee.firstName} ${mentorship.mentee.lastName}`;

        // Format date for notification
        const formattedDate = nextDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        const formattedTime = nextDate.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });

        await this.notificationsService.createAndSend(otherPartyId, {
          title: 'Session Scheduled',
          message: `${actorName} scheduled the next session for ${formattedDate} at ${formattedTime}.`,
          type: 'MENTORSHIP_REQUEST' as any,
          mentorshipId: mentorship.id,
        });
      } else {
        // Explicitly clear the next session date if empty string/null is passed
        updateData.nextSessionDate = null;
        
        // Cancel any upcoming scheduled sessions
        await this.prisma.mentorshipSession.updateMany({
          where: {
            mentorshipId,
            status: SessionStatus.SCHEDULED,
            scheduledDate: { gte: new Date() },
          },
          data: {
            status: SessionStatus.CANCELLED,
          },
        });
      }
    }

    // Handle notes
    if (data.notes !== undefined) {
      updateData.notes = data.notes || null;
    }

    // Activate mentorship if it was pending
    if (mentorship.status === 'PENDING' && (data.sessionCompleted || data.nextSessionDate)) {
      updateData.status = 'ACTIVE';
      updateData.startedAt = new Date();
    }

    // Update the mentorship
    const updated = await this.prisma.mentorship.update({
      where: { id: mentorshipId },
      data: updateData,
      include: {
        mentor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
          },
        },
        mentee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
          },
        },
        sessions: {
          orderBy: { scheduledDate: 'desc' },
          take: 20,
        },
      },
    });

    return updated;
  }

  // ==================== PROGRESS TRACKING ====================

  async updateProgress(
    mentorshipId: string,
    programId: string,
    week: number,
    data: {
      tasksCompleted?: number;
      totalTasks?: number;
      engagementScore?: number;
      skillImprovement?: number;
      notes?: string;
    },
  ) {
    return this.prisma.mentorshipProgress.upsert({
      where: {
        mentorshipId_week: {
          mentorshipId,
          week,
        },
      },
      create: {
        mentorshipId,
        programId,
        week,
        ...data,
      },
      update: data,
    });
  }

  async getProgress(mentorshipId: string) {
    return this.prisma.mentorshipProgress.findMany({
      where: { mentorshipId },
      orderBy: { week: 'asc' },
    });
  }

  // ==================== EVALUATIONS ====================

  async submitEvaluation(
    mentorshipId: string,
    programId: string,
    evaluatorId: string,
    type: EvaluationType,
    data: {
      engagementRating?: number;
      progressRating?: number;
      satisfactionRating?: number;
      skillImprovement?: number;
      feedback?: string;
      challenges?: string;
      recommendations?: string;
    },
  ) {
    const mentorship = await this.prisma.mentorship.findUnique({
      where: { id: mentorshipId },
    });

    if (!mentorship) {
      throw new NotFoundException('Mentorship not found');
    }

    const isMentor = mentorship.mentorId === evaluatorId;

    const evaluation = await this.prisma.mentorshipEvaluation.upsert({
      where: {
        mentorshipId_type_evaluatorId: {
          mentorshipId,
          type,
          evaluatorId,
        },
      },
      create: {
        mentorshipId,
        programId,
        type,
        evaluatorId,
        isMentor,
        ...data,
        submittedAt: new Date(),
      },
      update: {
        ...data,
        submittedAt: new Date(),
      },
    });

    // If mentee submitted evaluation, update mentor rating
    if (!isMentor && (data.satisfactionRating || data.engagementRating || data.progressRating)) {
      await this.updateMentorRating(mentorship.mentorId);
    }

    return evaluation;
  }

  /**
   * Calculate and update mentor rating based on all mentee evaluations
   */
  private async updateMentorRating(mentorId: string) {
    // Get all mentee evaluations for this mentor's active/completed mentorships
    const mentorships = await this.prisma.mentorship.findMany({
      where: {
        mentorId,
        status: { in: [MentorshipStatus.ACTIVE, MentorshipStatus.COMPLETED] },
      },
      include: {
        evaluations: {
          where: {
            isMentor: false, // Only mentee evaluations
          },
        },
      },
    });

    // Collect all ratings from mentee evaluations
    const ratings: number[] = [];
    mentorships.forEach((mentorship) => {
      mentorship.evaluations.forEach((evaluation) => {
        // Use satisfaction rating as primary, fallback to average of all ratings
        if (evaluation.satisfactionRating) {
          ratings.push(evaluation.satisfactionRating);
        } else if (evaluation.engagementRating || evaluation.progressRating || evaluation.skillImprovement) {
          const ratingValues = [
            evaluation.engagementRating,
            evaluation.progressRating,
            evaluation.skillImprovement,
          ].filter((r) => r !== null && r !== undefined) as number[];
          if (ratingValues.length > 0) {
            const avg = ratingValues.reduce((sum, r) => sum + r, 0) / ratingValues.length;
            ratings.push(avg);
          }
        }
      });
    });

    // Calculate average rating (scale 1-5, convert to 0-5 scale for storage)
    let averageRating = 0;
    if (ratings.length > 0) {
      const sum = ratings.reduce((acc, r) => acc + r, 0);
      averageRating = sum / ratings.length;
    }

    // Update mentor profile rating
    await this.prisma.mentorProfile.update({
      where: { userId: mentorId },
      data: { rating: averageRating },
    });
  }

  async getEvaluations(mentorshipId: string) {
    return this.prisma.mentorshipEvaluation.findMany({
      where: { mentorshipId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Submit simple feedback from mentee about mentor (doesn't require programId)
   */
  async submitMentorFeedback(
    mentorshipId: string,
    menteeId: string,
    data: {
      rating: number; // 1-5 overall rating
      feedback?: string;
      wouldRecommend?: boolean;
    },
  ) {
    const mentorship = await this.prisma.mentorship.findUnique({
      where: { id: mentorshipId },
      include: {
        programs: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!mentorship) {
      throw new NotFoundException('Mentorship not found');
    }

    if (mentorship.menteeId !== menteeId) {
      throw new ForbiddenException('Only the mentee can submit feedback about the mentor');
    }

    // Create or update a FINAL evaluation with the feedback
    // Use a default programId if available, otherwise null
    const programId = mentorship.programs?.[0]?.id || null;

    const evaluation = await this.prisma.mentorshipEvaluation.upsert({
      where: {
        mentorshipId_type_evaluatorId: {
          mentorshipId,
          type: EvaluationType.FINAL,
          evaluatorId: menteeId,
        },
      },
      create: {
        mentorshipId,
        programId,
        type: EvaluationType.FINAL,
        evaluatorId: menteeId,
        isMentor: false,
        satisfactionRating: data.rating,
        feedback: data.feedback,
        submittedAt: new Date(),
      },
      update: {
        satisfactionRating: data.rating,
        feedback: data.feedback,
        submittedAt: new Date(),
      },
    });

    // Update mentor rating
    await this.updateMentorRating(mentorship.mentorId);

    return evaluation;
  }

  // ==================== CERTIFICATE GENERATION ====================

  async generateCertificate(mentorshipId: string) {
    const mentorship = await this.prisma.mentorship.findUnique({
      where: { id: mentorshipId },
      include: {
        mentor: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        mentee: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!mentorship) {
      throw new NotFoundException('Mentorship not found');
    }

    if (mentorship.status !== MentorshipStatus.COMPLETED) {
      throw new BadRequestException('Mentorship must be completed to generate certificate');
    }

    const certificateNumber = `CERT-${Date.now()}-${mentorshipId.slice(0, 8).toUpperCase()}`;

    const certificate = await this.prisma.certificate.create({
      data: {
        mentorshipId,
        certificateNumber,
      },
    });

    await this.prisma.mentorship.update({
      where: { id: mentorshipId },
      data: {
        certificateId: certificate.id,
      },
    });

    return certificate;
  }

  // ==================== LEGACY METHODS (for backward compatibility) ====================

  async findAll(filters?: {
    status?: MentorshipStatus;
    mentorId?: string;
    menteeId?: string;
    userId?: string;
  }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.userId) {
      where.OR = [{ mentorId: filters.userId }, { menteeId: filters.userId }];
    } else {
      if (filters?.mentorId) where.mentorId = filters.mentorId;
      if (filters?.menteeId) where.menteeId = filters.menteeId;
    }

    return this.prisma.mentorship.findMany({
      where,
      include: {
        mentor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            bio: true,
            skills: true,
            occupation: true,
          },
        },
        mentee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            bio: true,
            skills: true,
            occupation: true,
          },
        },
        cycle: true,
        match: true,
        sessions: {
          orderBy: { scheduledDate: 'desc' },
          take: 20,
        },
        certificate: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const mentorship = await this.prisma.mentorship.findUnique({
      where: { id },
      include: {
        mentor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            bio: true,
            skills: true,
            interests: true,
            education: true,
            occupation: true,
          },
        },
        mentee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            bio: true,
            skills: true,
            interests: true,
            education: true,
            occupation: true,
          },
        },
        cycle: true,
        match: true,
        programs: {
          include: {
            tasks: true,
            progress: true,
          },
        },
        sessions: {
          orderBy: { scheduledDate: 'desc' },
        },
        certificate: true,
      },
    });

    if (!mentorship) {
      throw new NotFoundException('Mentorship not found');
    }

    return mentorship;
  }

  async requestMentorship(menteeId: string, mentorId: string, cycleId: string, goals?: string) {
    if (menteeId === mentorId) {
      throw new ForbiddenException('Cannot request mentorship from yourself');
    }

    if (!cycleId) {
      throw new BadRequestException('cycleId is required. All mentorships must belong to a cycle.');
    }

    // Verify cycle exists
    const cycle = await this.prisma.mentorshipCycle.findUnique({
      where: { id: cycleId },
    });

    if (!cycle) {
      throw new NotFoundException('Cycle not found');
    }

    // Log for debugging
    console.log('Requesting mentorship:', { menteeId, mentorId, cycleId, goals });

    // Verify both users exist
    const [mentor, mentee] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: mentorId }, select: { id: true } }),
      this.prisma.user.findUnique({ where: { id: menteeId }, select: { id: true } }),
    ]);

    console.log('User lookup results:', { mentor: mentor?.id, mentee: mentee?.id });

    if (!mentor) {
      console.error('Mentor not found for ID:', mentorId);
      throw new NotFoundException('Mentor not found');
    }

    if (!mentee) {
      console.error('Mentee not found for ID:', menteeId);
      throw new NotFoundException('Mentee not found');
    }

    // Check if mentorship already exists in this cycle
    const existing = await this.prisma.mentorship.findFirst({
      where: {
        mentorId,
        menteeId,
        cycleId,
        status: { in: [MentorshipStatus.PENDING, MentorshipStatus.ACTIVE] },
      },
    });

    if (existing) {
      throw new ForbiddenException('Mentorship request already exists for this cycle');
    }

    const mentorship = await this.prisma.mentorship.create({
      data: {
        mentorId,
        menteeId,
        cycleId, // REQUIRED: All mentorships must belong to a cycle
        goals,
        status: MentorshipStatus.PENDING,
      },
      include: {
        mentor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            bio: true,
          },
        },
        mentee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            bio: true,
          },
        },
      },
    });

    // Create notification for mentor
    await this.notificationsService.create(mentorId, {
      title: 'New Mentorship Request',
      message: `You have a new mentorship request from ${mentorship.mentee.firstName} ${mentorship.mentee.lastName}`,
      type: 'MENTORSHIP_REQUEST' as any,
      mentorshipId: mentorship.id,
    });

    return mentorship;
  }

  async acceptMentorship(mentorId: string, mentorshipId: string) {
    const mentorship = await this.prisma.mentorship.findUnique({
      where: { id: mentorshipId },
      include: {
        programs: {
          select: { id: true },
        },
        mentor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        mentee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
    });

    if (!mentorship) {
      throw new NotFoundException('Mentorship not found');
    }

    if (mentorship.mentorId !== mentorId) {
      throw new ForbiddenException('Not authorized to accept this mentorship');
    }

    // Ensure the mentorship is attached to a cycle so program/tasks can be generated.
    const cycleId = mentorship.cycleId ?? (await this.getDefaultCycleId());

    // Enforce mentor capacity (best-effort, MVP)
    const mentorProfile = await this.prisma.mentorProfile.findUnique({
      where: { userId: mentorId },
      select: { currentMentees: true, maxMentees: true, isActive: true, isVerified: true },
    });
    if (!mentorProfile || !mentorProfile.isActive || !mentorProfile.isVerified) {
      throw new ForbiddenException('Mentor profile must be active and verified');
    }
    if (mentorProfile.currentMentees >= mentorProfile.maxMentees) {
      throw new BadRequestException('Mentor has reached maximum mentees');
    }

    const updatedMentorship = await this.prisma.mentorship.update({
      where: { id: mentorshipId },
      data: {
        status: MentorshipStatus.ACTIVE,
        startedAt: new Date(),
        cycleId: cycleId ?? undefined,
      },
      include: {
        mentor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        mentee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
    });

    // Start the program if we have a cycle and no program yet.
    if (cycleId && (!mentorship.programs || mentorship.programs.length === 0)) {
      await this.createProgram(updatedMentorship.id, cycleId);
    }

    // Update mentor counts on acceptance (request-flow doesn't do it at creation time)
    await this.prisma.mentorProfile.update({
      where: { userId: mentorId },
      data: {
        currentMentees: { increment: 1 },
        totalMentees: { increment: 1 },
      },
    });

    // Create notification for mentee
    await this.notificationsService.create(mentorship.menteeId, {
      title: 'Mentorship Accepted',
      message: `${mentorship.mentor.firstName} ${mentorship.mentor.lastName} accepted your mentorship request`,
      type: 'MENTORSHIP_REQUEST' as any,
      mentorshipId: mentorshipId,
    });

    return updatedMentorship;
  }

  async completeMentorship(userId: string, mentorshipId: string) {
    const mentorship = await this.prisma.mentorship.findUnique({
      where: { id: mentorshipId },
    });

    if (!mentorship) {
      throw new NotFoundException('Mentorship not found');
    }

    if (mentorship.mentorId !== userId && mentorship.menteeId !== userId) {
      throw new ForbiddenException('Not authorized to complete this mentorship');
    }

    const updated = await this.prisma.mentorship.update({
      where: { id: mentorshipId },
      data: {
        status: MentorshipStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    // Generate certificate
    try {
      await this.generateCertificate(mentorshipId);
    } catch (error) {
      // Certificate generation is optional
      console.error('Certificate generation failed:', error);
    }

    // NorthernBox: add graduate to cohort alumni when mentorship was part of a cycle
    if (mentorship.cycleId) {
      try {
        await this.createAlumniOnCompletion(mentorship.cycleId, mentorship.menteeId, mentorshipId);
      } catch (e) {
        console.error('Alumni record creation failed:', e);
      }
    }

    // Check and award badges automatically for both mentor and mentee
    const userIdsToCheck = [mentorship.menteeId];
    if (mentorship.mentorId) {
      userIdsToCheck.push(mentorship.mentorId);
    }

    for (const userId of userIdsToCheck) {
      this.badgesService.checkAndAwardBadges(userId, {
        type: 'MENTORSHIP_COMPLETED',
        data: { mentorshipId },
      }).catch(err => {
        // Don't break the flow if badge awarding fails
        console.error(`Error awarding badges for mentorship completion (user ${userId}):`, err);
      });
    }

    // Update mentor current mentees count
    if (mentorship.mentorId) {
      await this.prisma.mentorProfile.updateMany({
        where: { userId: mentorship.mentorId },
        data: {
          currentMentees: { decrement: 1 },
        },
      });
    }

    return updated;
  }

  async getMentors(search?: string) {
    const whereClause: any = {
      isActive: true,
      isVerified: true,
    };

    if (search) {
      whereClause.OR = [
        {
          user: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { bio: { contains: search, mode: 'insensitive' } },
              { occupation: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
        {
          bio: { contains: search, mode: 'insensitive' },
        },
      ];
    }

    const profiles = await this.prisma.mentorProfile.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
            bio: true,
            skills: true,
            interests: true,
            education: true,
            occupation: true,
            location: true,
            points: true,
          },
        },
      },
      orderBy: {
        rating: 'desc',
      },
      take: 50,
    });

    return profiles.map((profile) => {
      // Extract profile.id to avoid overwriting user.id
      const { id: profileId, ...profileWithoutId } = profile;
      // Use user.id explicitly to ensure we return the user ID, not profile ID
      const userId = profile.user.id;
      return {
        ...profile.user,
        ...profileWithoutId,
        // Ensure id is the user ID, not the profile ID
        id: userId,
        expertise: profile.user.skills || [],
        company: profile.company || profile.user.occupation || '',
      };
    });
  }

  async applyMentor(
    userId: string,
    data: { bio?: string; expertise?: string; availability?: string; goals?: string },
  ) {
    // This is a simplified version - in production, use createMentorProfile
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: any = {};
    if (data.bio) updateData.bio = data.bio;
    if (data.expertise) {
      updateData.skills = [
        ...(user.skills || []),
        ...data.expertise.split(',').map((e) => e.trim()),
      ];
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        bio: true,
        skills: true,
        occupation: true,
      },
    });
  }

  // ==================== COHORT APPLICATIONS (Structured NorthernBox) ====================

  async createOrUpdateCohortApplication(userId: string, cycleId: string, dto: CreateCohortApplicationDto) {
    const cycle = await this.prisma.mentorshipCycle.findUnique({ where: { id: cycleId } });
    if (!cycle) throw new NotFoundException('Cycle not found');
    if ((cycle as any).status !== 'UPCOMING' && (cycle as any).status !== 'ACTIVE') {
      throw new BadRequestException('Applications are only open for UPCOMING or ACTIVE cycles');
    }

    return this.prisma.cohortApplication.upsert({
      where: { cycleId_userId: { cycleId, userId } },
      create: {
        cycleId,
        userId,
        ...dto,
        status: CohortApplicationStatus.DRAFT,
      },
      update: dto,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, profileImage: true },
        },
      },
    });
  }

  async submitCohortApplication(userId: string, cycleId: string) {
    const app = await this.prisma.cohortApplication.findUnique({
      where: { cycleId_userId: { cycleId, userId } },
    });
    if (!app) throw new NotFoundException('Application not found. Save a draft first.');
    if (app.status !== CohortApplicationStatus.DRAFT) {
      throw new BadRequestException('Application already submitted');
    }
    if (!app.shortBio || !app.whyJoin || !app.proofOfInterestType || !app.proofOfInterestValue || !app.availabilityCommitment) {
      throw new BadRequestException('Complete all required fields: short bio, why join, proof of interest, availability commitment');
    }

    return this.prisma.cohortApplication.update({
      where: { id: app.id },
      data: { status: CohortApplicationStatus.SUBMITTED, submittedAt: new Date() },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async getMyCohortApplication(userId: string, cycleId: string) {
    return this.prisma.cohortApplication.findUnique({
      where: { cycleId_userId: { cycleId, userId } },
      include: {
        cycle: { select: { id: true, name: true, status: true } },
      },
    });
  }

  async getCohortApplicationsByCycle(cycleId: string, status?: CohortApplicationStatus) {
    const cycle = await this.prisma.mentorshipCycle.findUnique({ where: { id: cycleId } });
    if (!cycle) throw new NotFoundException('Cycle not found');

    return this.prisma.cohortApplication.findMany({
      where: { cycleId, ...(status ? { status } : {}) },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, profileImage: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async updateCohortApplication(applicationId: string, dto: UpdateCohortApplicationDto) {
    return this.prisma.cohortApplication.update({
      where: { id: applicationId },
      data: dto,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        cycle: { select: { id: true, name: true } },
      },
    });
  }

  // ==================== ACCOUNTABILITY (Weekly attendance, 2-week rule) ====================

  async recordWeekAttendance(mentorshipId: string, week: number, attended: boolean, excusedAbsence?: boolean) {
    const mentorship = await this.prisma.mentorship.findUnique({
      where: { id: mentorshipId },
      select: { id: true, cycleId: true },
    });
    if (!mentorship) throw new NotFoundException('Mentorship not found');

    const progress = await this.prisma.mentorshipProgress.upsert({
      where: { mentorshipId_week: { mentorshipId, week } },
      create: {
        mentorshipId,
        week,
        attended,
        excusedAbsence: excusedAbsence ?? false,
      },
      update: {
        attended,
        excusedAbsence: excusedAbsence ?? false,
      },
    });

    if (mentorship.cycleId) {
      await this.checkConsecutiveAbsencesAndDrop(mentorship.cycleId);
    }
    return progress;
  }

  async checkConsecutiveAbsencesAndDrop(cycleId: string) {
    const activeMentorships = await this.prisma.mentorship.findMany({
      where: { cycleId, status: MentorshipStatus.ACTIVE },
      select: { id: true },
    });

    for (const m of activeMentorships) {
      const progressRecords = await this.prisma.mentorshipProgress.findMany({
        where: { mentorshipId: m.id, attended: false, excusedAbsence: { not: true } },
        select: { week: true },
      });
      const absentWeeks = new Set(progressRecords.map((r) => r.week));
      let hasConsecutive = false;
      for (const w of absentWeeks) {
        if (absentWeeks.has(w + 1)) {
          hasConsecutive = true;
          break;
        }
      }
      if (hasConsecutive) {
        await this.prisma.mentorship.update({
          where: { id: m.id },
          data: { status: MentorshipStatus.DROPPED },
        });
      }
    }
  }

  // ==================== GRADUATION & ALUMNI ====================

  async createAlumniOnCompletion(cycleId: string, userId: string, mentorshipId: string) {
    const existing = await this.prisma.cohortAlumni.findUnique({
      where: { cycleId_userId: { cycleId, userId } },
    });
    if (existing) return existing;
    return this.prisma.cohortAlumni.create({
      data: {
        cycleId,
        userId,
        mentorshipId,
        joinedAlumniGroup: true,
        canMentorFutureCohorts: false,
        showcased: false,
      },
    });
  }

  async getAlumniByCycle(cycleId: string) {
    const cycle = await this.prisma.mentorshipCycle.findUnique({ where: { id: cycleId } });
    if (!cycle) throw new NotFoundException('Cycle not found');
    return this.prisma.cohortAlumni.findMany({
      where: { cycleId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, profileImage: true, occupation: true },
        },
      },
      orderBy: { graduatedAt: 'desc' },
    });
  }

  async getShowcasedAlumni() {
    return this.prisma.cohortAlumni.findMany({
      where: { showcased: true },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, profileImage: true, occupation: true },
        },
        cycle: { select: { id: true, name: true } },
      },
      orderBy: { graduatedAt: 'desc' },
      take: 50,
    });
  }

  async updateAlumni(alumniId: string, data: { joinedAlumniGroup?: boolean; canMentorFutureCohorts?: boolean; showcased?: boolean }) {
    return this.prisma.cohortAlumni.update({
      where: { id: alumniId },
      data,
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        cycle: { select: { id: true, name: true } },
      },
    });
  }

  // ==================== OUTCOME PIPELINE: SCORES & OUTCOMES ====================

  async getMenteeCommitmentScore(menteeId: string, applicationId?: string) {
    return this.pipeline.calculateMenteeCommitmentScore(menteeId, applicationId);
  }

  async getMentorScore(mentorId: string) {
    return this.pipeline.calculateMentorScore(mentorId);
  }

  async createOutcome(
    actorUserId: string,
    data: {
      menteeId: string;
      mentorshipId?: string;
      cycleId?: string;
      outcomeType: string;
      title?: string;
      description?: string;
      date?: string;
    },
  ) {
    const mentorship = data.mentorshipId
      ? await this.prisma.mentorship.findUnique({
          where: { id: data.mentorshipId },
          select: { mentorId: true, menteeId: true, cycleId: true },
        })
      : null;
    if (data.mentorshipId && !mentorship) throw new NotFoundException('Mentorship not found');
    const isMentor = mentorship && mentorship.mentorId === actorUserId;
    const isMentee = mentorship && mentorship.menteeId === actorUserId;
    if (!isMentor && !isMentee && data.menteeId !== actorUserId) {
      throw new ForbiddenException('Only the mentee or their mentor can record outcomes for this mentee');
    }
    const cycleId = data.cycleId ?? mentorship?.cycleId ?? undefined;
    return this.prisma.mentorshipOutcome.create({
      data: {
        menteeId: data.menteeId,
        mentorshipId: data.mentorshipId ?? undefined,
        cycleId: cycleId ?? undefined,
        outcomeType: data.outcomeType,
        title: data.title ?? undefined,
        description: data.description ?? undefined,
        date: data.date ? new Date(data.date) : undefined,
        verified: false,
      },
      include: {
        mentee: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async listOutcomes(filters: { menteeId?: string; mentorshipId?: string; cycleId?: string }) {
    const where: any = {};
    if (filters.menteeId) where.menteeId = filters.menteeId;
    if (filters.mentorshipId) where.mentorshipId = filters.mentorshipId;
    if (filters.cycleId) where.cycleId = filters.cycleId;
    return this.prisma.mentorshipOutcome.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        mentee: { select: { id: true, firstName: true, lastName: true } },
        mentorship: { select: { id: true, cycleId: true } },
      },
    });
  }

  getOutcomeTypes(): readonly string[] {
    return this.pipeline.getOutcomeTypes();
  }

  async verifyOutcome(outcomeId: string, verifiedBy: string) {
    return this.prisma.mentorshipOutcome.update({
      where: { id: outcomeId },
      data: { verified: true, verifiedAt: new Date(), verifiedBy },
      include: {
        mentee: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }
}
