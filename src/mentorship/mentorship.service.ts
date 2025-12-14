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
          },
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
    status: TaskStatus,
    mentorFeedback?: string,
  ) {
    return this.prisma.mentorshipTask.update({
      where: { id: taskId },
      data: {
        status,
        completedAt: status === TaskStatus.COMPLETED ? new Date() : null,
        mentorFeedback,
      },
    });
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

    const mentorship = await this.prisma.mentorship.create({
      data: {
        mentorId,
        menteeId,
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

    const updatedMentorship = await this.prisma.mentorship.update({
      where: { id: mentorshipId },
      data: {
        status: MentorshipStatus.ACTIVE,
        startedAt: new Date(),
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
