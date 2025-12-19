import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePartnerApplicationDto } from './dto/create-partner-application.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { ReviewApplicationDto } from './dto/review-application.dto';
import { CreateMemberRequestDto } from './dto/create-member-request.dto';
import { ReviewMemberRequestDto } from './dto/review-member-request.dto';
import { CreatePartnerProgramDto } from './dto/create-partner-program.dto';
import {
  CommunityPartnerStatus,
  PartnerApplicationStatus,
  CommunityPartnerRole,
} from '@prisma/client';
import { AuditService } from '../common/services/audit.service';

@Injectable()
export class CommunityPartnersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // Application Management
  async createApplication(userId: string, dto: CreatePartnerApplicationDto) {
    // Check if user already has a pending application
    const existingApp = await this.prisma.partnerApplication.findFirst({
      where: {
        applicantId: userId,
        status: PartnerApplicationStatus.PENDING,
      },
    });

    if (existingApp) {
      throw new BadRequestException('You already have a pending application');
    }

    return this.prisma.partnerApplication.create({
      data: {
        ...dto,
        applicantId: userId,
        status: PartnerApplicationStatus.PENDING,
      },
    });
  }

  async getApplications(
    page = 1,
    limit = 20,
    status?: PartnerApplicationStatus,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) {
      where.status = status;
    }

    const [applications, total] = await Promise.all([
      this.prisma.partnerApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          applicant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImage: true,
            },
          },
          partner: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.partnerApplication.count({ where }),
    ]);

    return {
      applications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async reviewApplication(
    applicationId: string,
    adminId: string,
    dto: ReviewApplicationDto,
  ) {
    const application = await this.prisma.partnerApplication.findUnique({
      where: { id: applicationId },
      include: { applicant: true },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.status !== PartnerApplicationStatus.PENDING) {
      throw new BadRequestException('Application has already been reviewed');
    }

    if (dto.status === PartnerApplicationStatus.APPROVED) {
      // Create the partner
      const partner = await this.prisma.communityPartner.create({
        data: {
          name: application.name,
          description: application.description,
          focusArea: application.focusArea,
          location: application.location,
          website: application.website,
          contactEmail: application.contactEmail,
          contactPhone: application.contactPhone,
          status: CommunityPartnerStatus.APPROVED,
          applicationStatus: PartnerApplicationStatus.APPROVED,
          ownerId: application.applicantId,
          verifiedAt: new Date(),
          verifiedBy: adminId,
          reviewedAt: new Date(),
          reviewedBy: adminId,
          lastActivityAt: new Date(),
        },
      });

      // Create owner admin
      await this.prisma.partnerAdmin.create({
        data: {
          partnerId: partner.id,
          userId: application.applicantId,
          role: CommunityPartnerRole.OWNER,
          assignedBy: adminId,
        },
      });

      // Update application
      await this.prisma.partnerApplication.update({
        where: { id: applicationId },
        data: {
          status: dto.status,
          applicationNotes: dto.applicationNotes,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          partnerId: partner.id,
        },
      });

      // Log audit
      await this.auditService.logAction({
        adminId,
        userId: application.applicantId,
        action: 'APPROVE_PARTNER_APPLICATION',
        entity: 'PARTNER_APPLICATION',
        entityId: applicationId,
        changes: {
          before: { status: application.status },
          after: { status: dto.status, partnerId: partner.id },
        },
        reason: dto.applicationNotes,
      });

      return { partner, application };
    } else {
      // Reject application
      const updated = await this.prisma.partnerApplication.update({
        where: { id: applicationId },
        data: {
          status: dto.status,
          applicationNotes: dto.applicationNotes,
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
      });

      // Log audit
      await this.auditService.logAction({
        adminId,
        userId: application.applicantId,
        action: 'REJECT_PARTNER_APPLICATION',
        entity: 'PARTNER_APPLICATION',
        entityId: applicationId,
        changes: {
          before: { status: application.status },
          after: { status: dto.status },
        },
        reason: dto.applicationNotes,
      });

      return { application: updated };
    }
  }

  // Partner Management
  async getAllPartners(
    page = 1,
    limit = 20,
    status?: CommunityPartnerStatus,
    search?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { focusArea: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const [partners, total] = await Promise.all([
      this.prisma.communityPartner.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              members: true,
              events: true,
              programs: true,
            },
          },
        },
      }),
      this.prisma.communityPartner.count({ where }),
    ]);

    return {
      partners,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPartnerById(id: string) {
    const partner = await this.prisma.communityPartner.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
          },
        },
        admins: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            events: true,
            programs: true,
            memberRequests: true,
          },
        },
      },
    });

    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    return partner;
  }

  async updatePartner(id: string, dto: UpdatePartnerDto, adminId?: string) {
    const partner = await this.prisma.communityPartner.findUnique({
      where: { id },
    });

    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    const updated = await this.prisma.communityPartner.update({
      where: { id },
      data: dto,
    });

    if (adminId) {
      await this.auditService.logAction({
        adminId,
        action: 'UPDATE_PARTNER',
        entity: 'COMMUNITY_PARTNER',
        entityId: id,
        changes: {
          before: partner,
          after: updated,
        },
      });
    }

    return updated;
  }

  async suspendPartner(id: string, reason: string, adminId: string) {
    const partner = await this.prisma.communityPartner.findUnique({
      where: { id },
    });

    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    const updated = await this.prisma.communityPartner.update({
      where: { id },
      data: {
        status: CommunityPartnerStatus.SUSPENDED,
        suspendedAt: new Date(),
        suspendedBy: adminId,
        suspensionReason: reason,
      },
    });

    await this.auditService.logAction({
      adminId,
      userId: partner.ownerId,
      action: 'SUSPEND_PARTNER',
      entity: 'COMMUNITY_PARTNER',
      entityId: id,
      reason,
      changes: {
        before: { status: partner.status },
        after: { status: CommunityPartnerStatus.SUSPENDED },
      },
    });

    return updated;
  }

  // Member Management
  async requestToJoin(partnerId: string, userId: string, dto: CreateMemberRequestDto) {
    const partner = await this.prisma.communityPartner.findUnique({
      where: { id: partnerId },
    });

    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    if (partner.status !== CommunityPartnerStatus.APPROVED) {
      throw new BadRequestException('Partner is not accepting new members');
    }

    // Check if already a member
    const existingMember = await this.prisma.partnerMember.findUnique({
      where: {
        userId_partnerId: {
          userId,
          partnerId,
        },
      },
    });

    if (existingMember) {
      throw new BadRequestException('You are already a member of this partner');
    }

    // Check if request already exists
    const existingRequest = await this.prisma.partnerMemberRequest.findUnique({
      where: {
        userId_partnerId: {
          userId,
          partnerId,
        },
      },
    });

    if (existingRequest) {
      throw new BadRequestException('You already have a pending request');
    }

    return this.prisma.partnerMemberRequest.create({
      data: {
        partnerId,
        userId,
        message: dto.message,
        status: 'PENDING',
      },
    });
  }

  async getMemberRequests(partnerId: string, status?: string) {
    const where: any = { partnerId };
    if (status) {
      where.status = status;
    }

    return this.prisma.partnerMemberRequest.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
    });
  }

  async reviewMemberRequest(
    requestId: string,
    partnerId: string,
    reviewerId: string,
    dto: ReviewMemberRequestDto,
  ) {
    // Check if reviewer is partner admin
    const reviewer = await this.prisma.partnerAdmin.findFirst({
      where: {
        partnerId,
        userId: reviewerId,
        isActive: true,
      },
    });

    if (!reviewer) {
      throw new ForbiddenException('Only partner admins can review member requests');
    }

    const request = await this.prisma.partnerMemberRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request) {
      throw new NotFoundException('Member request not found');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request has already been reviewed');
    }

    if (dto.status === 'APPROVED') {
      // Create member
      await this.prisma.partnerMember.create({
        data: {
          partnerId,
          userId: request.userId,
          role: CommunityPartnerRole.MEMBER,
          approvedBy: reviewerId,
          approvedAt: new Date(),
        },
      });

      // Update partner member count
      await this.prisma.communityPartner.update({
        where: { id: partnerId },
        data: {
          memberCount: { increment: 1 },
        },
      });
    }

    // Update request
    return this.prisma.partnerMemberRequest.update({
      where: { id: requestId },
      data: {
        status: dto.status,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        rejectionReason: dto.status === 'REJECTED' ? dto.rejectionReason : null,
      },
    });
  }

  // Program Management
  async createProgram(partnerId: string, dto: CreatePartnerProgramDto, creatorId: string) {
    // Check if creator is partner admin
    const admin = await this.prisma.partnerAdmin.findFirst({
      where: {
        partnerId,
        userId: creatorId,
        isActive: true,
      },
    });

    if (!admin) {
      throw new ForbiddenException('Only partner admins can create programs');
    }

    const partner = await this.prisma.communityPartner.findUnique({
      where: { id: partnerId },
    });

    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    // If paid program, requires platform admin approval
    const requiresApproval = dto.isPaid === true;

    const program = await this.prisma.communityPartnerProgram.create({
      data: {
        ...dto,
        partnerId,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        requiresApproval,
      },
    });

    // Update partner program count
    await this.prisma.communityPartner.update({
      where: { id: partnerId },
      data: {
        programCount: { increment: 1 },
        lastActivityAt: new Date(),
        monthlyActivityCount: { increment: 1 },
      },
    });

    return program;
  }

  async getPartnerPrograms(partnerId: string) {
    return this.prisma.communityPartnerProgram.findMany({
      where: { partnerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Engagement Tracking
  async updateEngagement(partnerId: string) {
    const partner = await this.prisma.communityPartner.findUnique({
      where: { id: partnerId },
      include: {
        _count: {
          select: {
            members: true,
            events: true,
            programs: true,
          },
        },
      },
    });

    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    // Calculate engagement score (simplified)
    const engagementScore =
      partner.memberCount * 0.3 +
      partner.eventCount * 0.4 +
      partner.programCount * 0.3 +
      partner.monthlyActivityCount * 0.1;

    return this.prisma.communityPartner.update({
      where: { id: partnerId },
      data: {
        engagementScore,
        memberCount: partner._count.members,
        eventCount: partner._count.events,
        programCount: partner._count.programs,
      },
    });
  }

  // Get user's partners
  async getUserPartners(userId: string) {
    const memberships = await this.prisma.partnerMember.findMany({
      where: { userId, isActive: true },
      include: {
        partner: {
          include: {
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            _count: {
              select: {
                members: true,
                events: true,
                programs: true,
              },
            },
          },
        },
      },
    });

    return memberships.map((m) => m.partner);
  }
}

