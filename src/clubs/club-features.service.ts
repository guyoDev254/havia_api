import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateClubFeedDto } from './dto/create-club-feed.dto';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { CreateFundraisingDto } from './dto/create-fundraising.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { CreateFinancialContributionDto } from './dto/create-financial-contribution.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { VotePollDto } from './dto/vote-poll.dto';
import { ClubFeedType, ContributionStatus, FundraisingStatus, ProjectStatus } from '@prisma/client';

@Injectable()
export class ClubFeaturesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  // ==================== CLUB FEEDS ====================

  async createFeed(clubId: string, userId: string, dto: CreateClubFeedDto) {
    // Check if user is member or club is public
    const membership = await this.prisma.clubMember.findUnique({
      where: { userId_clubId: { userId, clubId } },
    });

    const club = await this.prisma.club.findUnique({ where: { id: clubId } });
    if (!club) throw new NotFoundException('Club not found');

    if (!membership && !club.isPublic) {
      throw new ForbiddenException('You must be a member to create feeds');
    }

    const feed = await this.prisma.clubFeed.create({
      data: {
        clubId,
        authorId: userId,
        type: dto.type,
        title: dto.title,
        content: dto.content,
        isPinned: dto.isPinned || false,
        isPublic: dto.isPublic !== undefined ? dto.isPublic : true,
        pollOptions: dto.pollOptions || [],
        pollType: dto.pollType,
        pollEndDate: dto.pollEndDate ? new Date(dto.pollEndDate) : null,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
    });

    // Update club activity
    await this.prisma.club.update({
      where: { id: clubId },
      data: {
        lastActivityAt: new Date(),
        activityCount: { increment: 1 },
      },
    });

    return feed;
  }

  async getFeeds(clubId: string, userId?: string, type?: ClubFeedType) {
    const where: any = { clubId };
    if (type) where.type = type;

    const feeds = await this.prisma.clubFeed.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
            pollVotes: true,
          },
        },
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Include user's vote if authenticated
    if (userId) {
      for (const feed of feeds) {
        if (feed.type === 'POLL') {
          const userVote = await this.prisma.clubPollVote.findFirst({
            where: { feedId: feed.id, userId },
          });
          (feed as any).userVote = userVote;
        }
      }
    }

    return feeds;
  }

  async votePoll(clubId: string, feedId: string, userId: string, dto: VotePollDto) {
    const feed = await this.prisma.clubFeed.findFirst({
      where: { id: feedId, clubId, type: 'POLL' },
    });

    if (!feed) throw new NotFoundException('Poll not found');
    if (feed.pollEndDate && new Date(feed.pollEndDate) < new Date()) {
      throw new BadRequestException('Poll has ended');
    }

    // Check if user already voted
    const existingVote = await this.prisma.clubPollVote.findFirst({
      where: { feedId, userId },
    });

    if (existingVote && feed.pollType === 'SINGLE_CHOICE') {
      throw new BadRequestException('You have already voted');
    }

    // Delete existing votes if multiple choice and re-voting
    if (existingVote && feed.pollType === 'MULTIPLE_CHOICE') {
      await this.prisma.clubPollVote.deleteMany({
        where: { feedId, userId },
      });
    }

    // Create new votes
    const votes = await Promise.all(
      dto.optionIndices.map(index =>
        this.prisma.clubPollVote.create({
          data: {
            feedId,
            userId,
            optionIndex: index,
          },
        })
      )
    );

    return votes;
  }

  // ==================== CONTRIBUTIONS ====================

  async createContribution(clubId: string, userId: string | null, dto: CreateContributionDto) {
    const club = await this.prisma.club.findUnique({ where: { id: clubId } });
    if (!club) throw new NotFoundException('Club not found');

    const contribution = await this.prisma.clubContribution.create({
      data: {
        clubId,
        contributorId: userId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        amount: dto.amount,
        currency: dto.currency || 'KES',
        hours: dto.hours,
        skills: dto.skills || [],
        resources: dto.resources || [],
        status: 'PENDING',
      },
      include: {
        contributor: userId
          ? {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
              },
            }
          : false,
      },
    });

    return contribution;
  }

  async getContributions(clubId: string, type?: string, status?: ContributionStatus) {
    const where: any = { clubId };
    if (type) where.type = type;
    if (status) where.status = status;

    return this.prisma.clubContribution.findMany({
      where,
      include: {
        contributor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveContribution(clubId: string, contributionId: string, adminId: string) {
    const contribution = await this.prisma.clubContribution.findFirst({
      where: { id: contributionId, clubId },
    });

    if (!contribution) throw new NotFoundException('Contribution not found');

    return this.prisma.clubContribution.update({
      where: { id: contributionId },
      data: {
        status: 'APPROVED',
        approvedBy: adminId,
        approvedAt: new Date(),
      },
    });
  }

  // ==================== FUNDRAISING ====================

  async createFundraising(clubId: string, userId: string, dto: CreateFundraisingDto) {
    // Check if user is club admin/lead
    const membership = await this.prisma.clubMember.findUnique({
      where: { userId_clubId: { userId, clubId } },
      include: { club: { include: { lead: true } } },
    });

    if (!membership || (membership.role !== 'LEAD' && membership.role !== 'ADMIN' && membership.club.leadId !== userId)) {
      throw new ForbiddenException('Only club leads and admins can create fundraising campaigns');
    }

    return this.prisma.clubFundraising.create({
      data: {
        clubId,
        createdBy: userId,
        title: dto.title,
        description: dto.description,
        goalAmount: dto.goalAmount,
        currency: dto.currency || 'KES',
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        image: dto.image,
        paymentLink: dto.paymentLink,
        templateType: dto.templateType,
        status: 'DRAFT',
      },
    });
  }

  async getFundraising(clubId: string, status?: FundraisingStatus) {
    const where: any = { clubId };
    if (status) where.status = status;

    return this.prisma.clubFundraising.findMany({
      where,
      include: {
        _count: {
          select: {
            contributions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==================== PROJECTS ====================

  async createProject(clubId: string, userId: string, dto: CreateProjectDto) {
    // Check if user is club admin/lead
    const membership = await this.prisma.clubMember.findUnique({
      where: { userId_clubId: { userId, clubId } },
      include: { club: { include: { lead: true } } },
    });

    if (!membership || (membership.role !== 'LEAD' && membership.role !== 'ADMIN' && membership.club.leadId !== userId)) {
      throw new ForbiddenException('Only club leads and admins can create projects');
    }

    return this.prisma.clubProject.create({
      data: {
        clubId,
        createdBy: userId,
        title: dto.title,
        description: dto.description,
        status: dto.status || 'PLANNING',
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        budget: dto.budget,
        currency: dto.currency || 'KES',
        templateType: dto.templateType,
        objectives: dto.objectives || [],
        deliverables: dto.deliverables || [],
      },
    });
  }

  async getProjects(clubId: string, status?: ProjectStatus) {
    const where: any = { clubId };
    if (status) where.status = status;

    return this.prisma.clubProject.findMany({
      where,
      include: {
        _count: {
          select: {
            milestones: true,
            attendance: true,
          },
        },
        milestones: {
          orderBy: { targetDate: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createMilestone(projectId: string, dto: CreateMilestoneDto) {
    return this.prisma.clubMilestone.create({
      data: {
        projectId,
        title: dto.title,
        description: dto.description,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
      },
    });
  }

  // ==================== ATTENDANCE ====================

  async recordAttendance(clubId: string, userId: string, dto: CreateAttendanceDto) {
    // Check if user is club admin/lead or recording own attendance
    const membership = await this.prisma.clubMember.findUnique({
      where: { userId_clubId: { userId, clubId } },
    });

    if (!membership && dto.userId !== userId) {
      throw new ForbiddenException('You can only record your own attendance or be a club admin');
    }

    // Check if attendance already exists for this date
    const existing = await this.prisma.clubAttendance.findFirst({
      where: {
        clubId,
        userId: dto.userId,
        date: new Date(dto.date),
      },
    });

    if (existing) {
      return this.prisma.clubAttendance.update({
        where: { id: existing.id },
        data: {
          projectId: dto.projectId,
          eventId: dto.eventId,
          status: dto.status || 'PRESENT',
          notes: dto.notes,
        },
      });
    }

    return this.prisma.clubAttendance.create({
      data: {
        clubId,
        projectId: dto.projectId,
        eventId: dto.eventId,
        userId: dto.userId,
        date: new Date(dto.date),
        status: dto.status || 'PRESENT',
        notes: dto.notes,
      },
    });
  }

  async getAttendance(clubId: string, projectId?: string, eventId?: string, startDate?: Date, endDate?: Date) {
    const where: any = { clubId };
    if (projectId) where.projectId = projectId;
    if (eventId) where.eventId = eventId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    return this.prisma.clubAttendance.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  // ==================== FINANCIAL CONTRIBUTIONS ====================

  async createFinancialContribution(clubId: string, userId: string | null, dto: CreateFinancialContributionDto) {
    const club = await this.prisma.club.findUnique({ where: { id: clubId } });
    if (!club) throw new NotFoundException('Club not found');

    const contribution = await this.prisma.clubFinancialContribution.create({
      data: {
        clubId,
        fundraisingId: dto.fundraisingId,
        contributorId: userId,
        amount: dto.amount,
        currency: dto.currency || 'KES',
        paymentMethod: dto.paymentMethod,
        paymentReference: dto.paymentReference,
        notes: dto.notes,
      },
    });

    // Update fundraising campaign if linked
    if (dto.fundraisingId) {
      await this.prisma.clubFundraising.update({
        where: { id: dto.fundraisingId },
        data: {
          currentAmount: { increment: dto.amount },
        },
      });
    }

    return contribution;
  }

  async getFinancialContributions(clubId: string, fundraisingId?: string) {
    const where: any = { clubId };
    if (fundraisingId) where.fundraisingId = fundraisingId;

    return this.prisma.clubFinancialContribution.findMany({
      where,
      include: {
        contributor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getContributionSummary(clubId: string) {
    const contributions = await this.prisma.clubFinancialContribution.findMany({
      where: { clubId },
    });

    const total = contributions.reduce((sum, c) => sum + c.amount, 0);
    const byMethod = contributions.reduce((acc, c) => {
      const method = c.paymentMethod || 'UNKNOWN';
      acc[method] = (acc[method] || 0) + c.amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalContributions: contributions.length,
      totalAmount: total,
      averageContribution: contributions.length > 0 ? total / contributions.length : 0,
      byMethod,
      recentContributions: contributions.slice(0, 10),
    };
  }

  // ==================== REPORTS ====================

  async createReport(clubId: string, userId: string, dto: CreateReportDto) {
    // Check if user is club admin/lead
    const membership = await this.prisma.clubMember.findUnique({
      where: { userId_clubId: { userId, clubId } },
      include: { club: { include: { lead: true } } },
    });

    if (!membership || (membership.role !== 'LEAD' && membership.role !== 'ADMIN' && membership.club.leadId !== userId)) {
      throw new ForbiddenException('Only club leads and admins can create reports');
    }

    return this.prisma.clubReport.create({
      data: {
        clubId,
        createdBy: userId,
        type: dto.type,
        title: dto.title,
        content: dto.content,
        periodStart: dto.periodStart ? new Date(dto.periodStart) : null,
        periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : null,
        data: dto.data,
        templateType: dto.templateType,
        isPublic: dto.isPublic || false,
      },
    });
  }

  async getReports(clubId: string, type?: string, isPublic?: boolean) {
    const where: any = { clubId };
    if (type) where.type = type;
    if (isPublic !== undefined) where.isPublic = isPublic;

    return this.prisma.clubReport.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async generateSimpleReport(clubId: string, type: string, periodStart?: Date, periodEnd?: Date) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      include: {
        _count: {
          select: {
            members: true,
            events: true,
            projects: true,
          },
        },
      },
    });

    if (!club) throw new NotFoundException('Club not found');

    let data: any = {};

    switch (type) {
      case 'ACTIVITY_SUMMARY':
        data = {
          totalMembers: club._count.members,
          totalEvents: club._count.events,
          totalProjects: club._count.projects,
          engagementScore: club.engagementScore,
          lastActivity: club.lastActivityAt,
        };
        break;

      case 'FINANCIAL_SUMMARY':
        const contributions = await this.getFinancialContributions(clubId);
        const summary = await this.getContributionSummary(clubId);
        data = summary;
        break;

      case 'PROJECT_UPDATE':
        const projects = await this.getProjects(clubId);
        data = {
          totalProjects: projects.length,
          activeProjects: projects.filter(p => p.status === 'ACTIVE').length,
          completedProjects: projects.filter(p => p.status === 'COMPLETED').length,
          projects: projects.map(p => ({
            title: p.title,
            status: p.status,
            progress: p.progress,
            budget: p.budget,
            budgetUsed: p.budgetUsed,
          })),
        };
        break;

      case 'MEMBERSHIP_REPORT':
        const members = await this.prisma.clubMember.findMany({
          where: { clubId, isActive: true },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });
        data = {
          totalMembers: members.length,
          newMembersLast30Days: members.filter(
            m => m.joinedAt && new Date(m.joinedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          ).length,
          members: members.map((m: any) => ({
            name: `${m.user?.firstName || ''} ${m.user?.lastName || ''}`,
            role: m.role,
            joinedAt: m.joinedAt,
          })),
        };
        break;
    }

    return {
      clubId,
      type,
      periodStart: periodStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      periodEnd: periodEnd || new Date(),
      data,
      generatedAt: new Date(),
    };
  }
}

