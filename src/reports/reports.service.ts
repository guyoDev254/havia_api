import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { ReportType, ReportStatus, ReportEntityType } from '@prisma/client';
import { AdminService } from '../admin/admin.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../common/services/audit.service';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private adminService: AdminService,
    private notificationsService: NotificationsService,
    private auditService: AuditService,
  ) {}

  async createReport(userId: string, createReportDto: CreateReportDto) {
    const { entityType, entityId, reportedUserId, type, reason, description } = createReportDto;

    // Validate entity exists
    if (entityId) {
      const entityExists = await this.validateEntityExists(entityType, entityId);
      if (!entityExists) {
        throw new NotFoundException(`${entityType} not found`);
      }
    }

    // If reporting a user, ensure reportedUserId is set
    if (entityType === ReportEntityType.USER && !reportedUserId) {
      throw new BadRequestException('reportedUserId is required when reporting a user');
    }

    // Check if user is reporting themselves
    if (reportedUserId === userId) {
      throw new BadRequestException('You cannot report yourself');
    }

    // Check for duplicate reports (same user, same entity, pending status)
    const existingReport = await this.prisma.report.findFirst({
      where: {
        reporterId: userId,
        entityType,
        entityId: entityId || null,
        reportedUserId: reportedUserId || null,
        status: ReportStatus.PENDING,
      },
    });

    if (existingReport) {
      throw new BadRequestException('You have already reported this. Please wait for review.');
    }

    // Determine priority based on report type
    const priority = this.getReportPriority(type);

    // Create report
    const report = await this.prisma.report.create({
      data: {
        reporterId: userId,
        reportedUserId: reportedUserId || null,
        entityType,
        entityId: entityId || null,
        type,
        reason,
        description: description || null,
        priority,
        status: ReportStatus.PENDING,
      },
      include: {
        reporter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        reportedUser: reportedUserId
          ? {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            }
          : undefined,
      },
    });

    // Notify admins about new high-priority reports
    if (priority >= 3) {
      await this.notifyAdminsOfReport(report);
    }

    return report;
  }

  async getAllReports(
    page = 1,
    limit = 20,
    status?: ReportStatus,
    type?: ReportType,
    entityType?: ReportEntityType,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) {
      where.status = status;
    }
    if (type) {
      where.type = type;
    }
    if (entityType) {
      where.entityType = entityType;
    }

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip,
        take: limit,
        include: {
          reporter: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          reportedUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
      this.prisma.report.count({ where }),
    ]);

    return {
      reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getReportById(id: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: {
        reporter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        reportedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            strikeCount: true,
            isPostingRestricted: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return report;
  }

  async resolveReport(adminId: string, reportId: string, resolveDto: ResolveReportDto) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reportedUser: true,
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.status !== ReportStatus.PENDING && report.status !== ReportStatus.UNDER_REVIEW) {
      throw new BadRequestException('Report is already resolved');
    }

    // If issuing a strike and reporting a user
    if (resolveDto.issueStrike && report.reportedUserId && report.reportedUser) {
      await this.issueStrike(report.reportedUserId, adminId, report.type, report.reason);
    }

    // Update report
    const updatedReport = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: resolveDto.status,
        resolution: resolveDto.resolution || null,
        adminNotes: resolveDto.adminNotes || null,
        resolvedBy: adminId,
        resolvedAt: new Date(),
      },
      include: {
        reporter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        reportedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Log audit trail
    await this.auditService.logAction({
      adminId,
      userId: report.reportedUserId || undefined,
      action: 'RESOLVE_REPORT',
      entity: 'REPORT',
      entityId: reportId,
      changes: {
        before: { status: report.status },
        after: { status: resolveDto.status },
      },
      reason: resolveDto.resolution,
      metadata: {
        reportType: report.type,
        issueStrike: resolveDto.issueStrike || false,
        entityType: report.entityType,
        entityId: report.entityId,
      },
    });

    return updatedReport;
  }

  async issueStrike(userId: string, adminId: string, reportType: ReportType, reason: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const newStrikeCount = Math.min(user.strikeCount + 1, 3);
    const isPostingRestricted = newStrikeCount >= 3;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        strikeCount: newStrikeCount,
        isPostingRestricted,
        lastStrikeAt: new Date(),
      },
    });

    // Log audit
    await this.adminService.logAudit({
      adminId,
      userId,
      action: 'ISSUE_STRIKE',
      entity: 'USER',
      entityId: userId,
      changes: {
        before: { strikeCount: user.strikeCount, isPostingRestricted: user.isPostingRestricted },
        after: { strikeCount: newStrikeCount, isPostingRestricted },
      },
      reason: `Strike issued due to: ${reportType}. Reason: ${reason}`,
    });

    // Notify user about strike
    if (isPostingRestricted) {
      await this.notificationsService.createAndSend(
        userId,
        {
          title: 'Posting Restricted',
          message: `You have received ${newStrikeCount} strikes. Your posting privileges have been temporarily restricted.`,
          type: 'SYSTEM_ANNOUNCEMENT',
        },
      );
    } else {
      await this.notificationsService.createAndSend(
        userId,
        {
          title: 'Strike Issued',
          message: `You have received a strike (${newStrikeCount}/3). Please review our community guidelines.`,
          type: 'SYSTEM_ANNOUNCEMENT',
        },
      );
    }

    return {
      strikeCount: newStrikeCount,
      isPostingRestricted,
    };
  }

  async getReportsByUser(userId: string) {
    return this.prisma.report.findMany({
      where: {
        reportedUserId: userId,
      },
      include: {
        reporter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getReportStats() {
    const [total, pending, resolved, dismissed, escalated] = await Promise.all([
      this.prisma.report.count(),
      this.prisma.report.count({ where: { status: ReportStatus.PENDING } }),
      this.prisma.report.count({ where: { status: ReportStatus.RESOLVED } }),
      this.prisma.report.count({ where: { status: ReportStatus.DISMISSED } }),
      this.prisma.report.count({ where: { status: ReportStatus.ESCALATED } }),
    ]);

    const byType = await this.prisma.report.groupBy({
      by: ['type'],
      _count: {
        id: true,
      },
    });

    const byEntityType = await this.prisma.report.groupBy({
      by: ['entityType'],
      _count: {
        id: true,
      },
    });

    return {
      total,
      pending,
      resolved,
      dismissed,
      escalated,
      byType: byType.map((item) => ({
        type: item.type,
        count: item._count.id,
      })),
      byEntityType: byEntityType.map((item) => ({
        entityType: item.entityType,
        count: item._count.id,
      })),
    };
  }

  private async validateEntityExists(entityType: ReportEntityType, entityId: string): Promise<boolean> {
    switch (entityType) {
      case ReportEntityType.POST:
        const post = await this.prisma.post.findUnique({ where: { id: entityId } });
        return !!post;
      case ReportEntityType.COMMENT:
        const comment = await this.prisma.comment.findUnique({ where: { id: entityId } });
        return !!comment;
      case ReportEntityType.CLUB:
        const club = await this.prisma.club.findUnique({ where: { id: entityId } });
        return !!club;
      case ReportEntityType.EVENT:
        const event = await this.prisma.event.findUnique({ where: { id: entityId } });
        return !!event;
      case ReportEntityType.USER:
        const user = await this.prisma.user.findUnique({ where: { id: entityId } });
        return !!user;
      case ReportEntityType.MESSAGE:
        // Messages are encrypted, we can't easily validate
        return true;
      default:
        return false;
    }
  }

  private getReportPriority(type: ReportType): number {
    // High priority: harassment, hate speech, fake account
    const highPriorityTypes: ReportType[] = [ReportType.HARASSMENT, ReportType.HATE_SPEECH, ReportType.FAKE_ACCOUNT];
    if (highPriorityTypes.includes(type)) {
      return 3;
    }
    // Medium priority: inappropriate content, copyright
    const mediumPriorityTypes: ReportType[] = [ReportType.INAPPROPRIATE_CONTENT, ReportType.COPYRIGHT_VIOLATION];
    if (mediumPriorityTypes.includes(type)) {
      return 2;
    }
    // Low priority: spam, other
    return 1;
  }

  private async notifyAdminsOfReport(report: any) {
    // Get all admins with moderation permissions
    const admins = await this.prisma.user.findMany({
      where: {
        role: {
          in: ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'COMMUNITY_MANAGER', 'SUPPORT_ADMIN'],
        },
        isActive: true,
        pushNotificationsEnabled: true,
      },
      select: {
        id: true,
        expoPushToken: true,
      },
    });

    // Send notifications to admins
    for (const admin of admins) {
      if (admin.expoPushToken) {
        await this.notificationsService.createAndSend(
          admin.id,
          {
            title: 'High Priority Report',
            message: `New ${report.type} report requires attention`,
            type: 'SYSTEM_ANNOUNCEMENT',
            link: `/admin/moderation?reportId=${report.id}`,
          },
        );
      }
    }
  }
}

