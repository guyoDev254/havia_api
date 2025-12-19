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
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateMentorProfileDto } from './dto/create-mentor-profile.dto';
import { CreateMenteeProfileDto } from './dto/create-mentee-profile.dto';
import { CreateCycleDto } from './dto/create-cycle.dto';

@Injectable()
export class MentorshipService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
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

    return this.prisma.mentorProfile.create({
      data: {
        userId,
        ...dto,
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
    return this.prisma.mentorProfile.update({
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
    return this.prisma.mentorshipCycle.create({
      data: {
        name: dto.name,
        description: dto.description,
        benefits: dto.benefits,
        expectedOutcomes: dto.expectedOutcomes,
        requirements: dto.requirements,
        targetGroup: dto.targetGroup,
        conditions: dto.conditions,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        maxMentorships: dto.maxMentorships,
      },
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
          },
        },
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
        _count: {
          select: {
            programs: true,
            mentorships: true,
          },
        },
      },
    });

    if (!cycle) {
      throw new NotFoundException('Cycle not found');
    }

    return cycle;
  }

  // ==================== MANUAL ADMIN ASSIGNMENT ====================

  async manualAssignMentorship(cycleId: string, mentorId: string, menteeId: string) {
    if (mentorId === menteeId) {
      throw new BadRequestException('Mentor and mentee cannot be the same user');
    }

    const cycle = await this.prisma.mentorshipCycle.findUnique({ where: { id: cycleId } });
    if (!cycle) throw new NotFoundException('Cycle not found');

    const [mentorProfile, menteeProfile] = await Promise.all([
      this.prisma.mentorProfile.findUnique({
        where: { userId: mentorId },
        select: { isActive: true, isVerified: true, currentMentees: true, maxMentees: true },
      }),
      this.prisma.menteeProfile.findUnique({
        where: { userId: menteeId },
        select: { isActive: true },
      }),
    ]);

    if (!mentorProfile || !mentorProfile.isActive || !mentorProfile.isVerified) {
      throw new BadRequestException('Selected mentor must have an active, verified mentor profile');
    }
    if (!menteeProfile || !menteeProfile.isActive) {
      throw new BadRequestException('Selected mentee must have an active mentee profile');
    }
    if (mentorProfile.currentMentees >= mentorProfile.maxMentees) {
      throw new BadRequestException('Mentor has reached maximum mentees');
    }

    const existing = await this.prisma.mentorship.findFirst({
      where: {
        cycleId,
        mentorId,
        menteeId,
        status: { in: [MentorshipStatus.PENDING, MentorshipStatus.ACTIVE] },
      },
    });
    if (existing) {
      throw new BadRequestException('An active/pending mentorship already exists for this pair in this cycle');
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

  // ==================== MATCHING ALGORITHM ====================

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
    const mentor = await this.prisma.mentorProfile.findUnique({
      where: { userId: mentorId },
      include: {
        user: {
          select: {
            skills: true,
            occupation: true,
            interests: true,
          },
        },
      },
    });

    const mentee = await this.prisma.menteeProfile.findUnique({
      where: { userId: menteeId },
      include: {
        user: {
          select: {
            skills: true,
            interests: true,
          },
        },
      },
    });

    if (!mentor || !mentee) {
      throw new NotFoundException('Mentor or mentee profile not found');
    }

    // Skill Match (40%)
    const mentorSkills = mentor.user.skills || [];
    const menteeSkills = mentee.user.skills || [];
    const commonSkills = mentorSkills.filter((s) => menteeSkills.includes(s));
    const skillMatch =
      mentorSkills.length > 0
        ? (commonSkills.length / Math.max(mentorSkills.length, menteeSkills.length)) * 40
        : 20; // Default 50% if no skills

    // Industry Relevance (20%)
    const industryRelevance = mentor.mentorshipThemes.some((theme) =>
      mentee.fieldOfInterest?.toLowerCase().includes(theme.toLowerCase()),
    )
      ? 20
      : 10;

    // Availability Match (20%)
    // Simplified: if both have availability set, give full score
    const availabilityMatch =
      mentor.weeklyAvailability && mentee.availability ? 20 : 10;

    // Communication Style Match (10%)
    // Simplified: if mentee prefers matches mentor style
    const communicationMatch = 8; // Default score

    // Personality Fit (10%)
    const commonInterests = (mentor.user.interests || []).filter((i) =>
      (mentee.user.interests || []).includes(i),
    );
    const personalityFit =
      commonInterests.length > 0
        ? (commonInterests.length / Math.max(mentor.user.interests?.length || 1, mentee.user.interests?.length || 1)) * 10
        : 5;

    const matchScore =
      skillMatch + industryRelevance + availabilityMatch + communicationMatch + personalityFit;

    return {
      matchScore: Math.round(matchScore * 100) / 100,
      skillMatch: Math.round(skillMatch * 100) / 100,
      industryRelevance: Math.round(industryRelevance * 100) / 100,
      availabilityMatch: Math.round(availabilityMatch * 100) / 100,
      communicationMatch: Math.round(communicationMatch * 100) / 100,
      personalityFit: Math.round(personalityFit * 100) / 100,
    };
  }

  async findMatches(menteeId: string, cycleId?: string, minScore = 70) {
    const mentee = await this.prisma.menteeProfile.findUnique({
      where: { userId: menteeId },
    });

    if (!mentee) {
      throw new NotFoundException('Mentee profile not found');
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

    // Create match records
    const matchRecords = await Promise.all(
      filteredMatches.map(async (match) => {
        const existing = await this.prisma.mentorshipMatch.findUnique({
          where: {
            mentorId_menteeId_cycleId: {
              mentorId: match.mentor.userId,
              menteeId,
              cycleId: cycleId || null,
            },
          },
        });

        if (existing) {
          return existing;
        }

        return this.prisma.mentorshipMatch.create({
          data: {
            mentorId: match.mentor.userId,
            menteeId,
            cycleId: cycleId || null,
            matchScore: match.matchScore,
            skillMatch: match.skillMatch,
            industryRelevance: match.industryRelevance,
            availabilityMatch: match.availabilityMatch,
            communicationMatch: match.communicationMatch,
            personalityFit: match.personalityFit,
            status: MatchStatus.PENDING,
          },
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
          },
        });
      }),
    );

    return matchRecords;
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

    const mentee = await this.prisma.menteeProfile.findUnique({
      where: { userId: match.menteeId },
    });

    const mentorship = await this.prisma.mentorship.create({
      data: {
        mentorId: match.mentorId,
        menteeId: match.menteeId,
        cycleId: match.cycleId,
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

    // Create program for the cycle
    if (match.cycleId) {
      await this.createProgram(mentorship.id, match.cycleId);
    }

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
    // Verify the user is the mentor for this mentorship
    const mentorship = await this.prisma.mentorship.findUnique({
      where: { id: data.mentorshipId },
      select: { mentorId: true, status: true },
    });

    if (!mentorship) {
      throw new NotFoundException('Mentorship not found');
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
        },
        update: {
          tasksCompleted: completedTasks,
          totalTasks,
          programId: updated.programId ?? undefined,
        },
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
    // Both mentor and mentee can mark sessions as complete
    // This allows either party to confirm the session happened
    if (data.sessionCompleted) {
      const isMentor = mentorship.mentorId === actorUserId;
      
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
    if (data.nextSessionDate !== undefined) {
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

        // Create or update a scheduled session record
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
              notes: data.notes || existingScheduled.notes,
            },
          });
        } else {
          // Create a new scheduled session
          await this.prisma.mentorshipSession.create({
            data: {
              mentorshipId,
              scheduledDate: nextDate,
              status: SessionStatus.SCHEDULED,
              notes: data.notes,
            },
          });
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

    return this.prisma.mentorshipEvaluation.upsert({
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
  }

  async getEvaluations(mentorshipId: string) {
    return this.prisma.mentorshipEvaluation.findMany({
      where: { mentorshipId },
      orderBy: { createdAt: 'desc' },
    });
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

  async requestMentorship(menteeId: string, mentorId: string, goals?: string) {
    if (menteeId === mentorId) {
      throw new ForbiddenException('Cannot request mentorship from yourself');
    }

    // Check if mentorship already exists
    const existing = await this.prisma.mentorship.findFirst({
      where: {
        mentorId,
        menteeId,
        status: { in: [MentorshipStatus.PENDING, MentorshipStatus.ACTIVE] },
      },
    });

    if (existing) {
      throw new ForbiddenException('Mentorship request already exists');
    }

    const defaultCycleId = await this.getDefaultCycleId();
    const mentorship = await this.prisma.mentorship.create({
      data: {
        mentorId,
        menteeId,
        goals,
        cycleId: defaultCycleId,
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

    return profiles.map((profile) => ({
      ...profile.user,
      ...profile,
      expertise: profile.user.skills || [],
      company: profile.company || profile.user.occupation || '',
    }));
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
}
