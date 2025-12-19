import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { CreatePartnerProgramDto } from './dto/create-partner-program.dto';
import { PartnerStatus } from '@prisma/client';
import { AdminService } from '../admin/admin.service';

@Injectable()
export class PartnershipsService {
  constructor(
    private prisma: PrismaService,
    private adminService: AdminService,
  ) {}

  async createPartner(adminId: string, createDto: CreatePartnerDto) {
    const partner = await this.prisma.partner.create({
      data: {
        name: createDto.name,
        description: createDto.description,
        type: createDto.type || 'other',
        logo: createDto.logo || null,
        website: createDto.website || null,
        contactEmail: createDto.contactEmail || null,
        contactPhone: createDto.contactPhone || null,
        notes: createDto.notes || null,
        status: PartnerStatus.PENDING,
        createdBy: adminId,
      },
      include: {
        programs: true,
        _count: {
          select: {
            programs: true,
          },
        },
      },
    });

    // Log audit
    await this.adminService.logAudit({
      adminId,
      action: 'CREATE_PARTNER',
      entity: 'PARTNER',
      entityId: partner.id,
      changes: {
        after: { name: partner.name, type: partner.type },
      },
    });

    return partner;
  }

  async getAllPartners(
    page = 1,
    limit = 20,
    status?: PartnerStatus,
    type?: string,
    search?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) {
      where.status = status;
    }
    if (type) {
      where.type = type;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [partners, total] = await Promise.all([
      this.prisma.partner.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              programs: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.partner.count({ where }),
    ]);

    // Calculate engagement scores
    const partnersWithEngagement = partners.map((partner) => ({
      ...partner,
      programsCount: partner._count.programs,
      engagement: partner.totalEngagement,
    }));

    return {
      partners: partnersWithEngagement,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPartnerById(id: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { id },
      include: {
        programs: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            programs: true,
          },
        },
      },
    });

    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    return {
      ...partner,
      programsCount: partner._count.programs,
      engagement: partner.totalEngagement,
    };
  }

  async updatePartner(adminId: string, id: string, updateDto: UpdatePartnerDto) {
    const existing = await this.prisma.partner.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Partner not found');
    }

    const partner = await this.prisma.partner.update({
      where: { id },
      data: {
        ...updateDto,
      },
      include: {
        programs: true,
        _count: {
          select: {
            programs: true,
          },
        },
      },
    });

    // Log audit
    await this.adminService.logAudit({
      adminId,
      action: 'UPDATE_PARTNER',
      entity: 'PARTNER',
      entityId: id,
      changes: {
        before: {
          name: existing.name,
          status: existing.status,
          type: existing.type,
        },
        after: {
          name: partner.name,
          status: partner.status,
          type: partner.type,
        },
      },
    });

    return partner;
  }

  async deletePartner(adminId: string, id: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { id },
    });

    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    await this.prisma.partner.delete({
      where: { id },
    });

    // Log audit
    await this.adminService.logAudit({
      adminId,
      action: 'DELETE_PARTNER',
      entity: 'PARTNER',
      entityId: id,
      changes: {
        before: { name: partner.name },
      },
    });

    return { message: 'Partner deleted successfully' };
  }

  async createProgram(adminId: string, createDto: CreatePartnerProgramDto) {
    // Verify partner exists
    const partner = await this.prisma.partner.findUnique({
      where: { id: createDto.partnerId },
    });

    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    const program = await this.prisma.partnerProgram.create({
      data: {
        partnerId: createDto.partnerId,
        title: createDto.title,
        description: createDto.description,
        type: createDto.type || 'other',
        url: createDto.url || null,
        startDate: createDto.startDate ? new Date(createDto.startDate) : null,
        endDate: createDto.endDate ? new Date(createDto.endDate) : null,
        isActive: createDto.isActive !== undefined ? createDto.isActive : true,
      },
    });

    // Update partner programs count
    await this.prisma.partner.update({
      where: { id: createDto.partnerId },
      data: {
        programsCount: {
          increment: 1,
        },
      },
    });

    // Log audit
    await this.adminService.logAudit({
      adminId,
      action: 'CREATE_PARTNER_PROGRAM',
      entity: 'PARTNER_PROGRAM',
      entityId: program.id,
      changes: {
        after: { title: program.title, partnerId: program.partnerId },
      },
    });

    return program;
  }

  async updateProgram(adminId: string, id: string, updateDto: Partial<CreatePartnerProgramDto>) {
    const existing = await this.prisma.partnerProgram.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Program not found');
    }

    const program = await this.prisma.partnerProgram.update({
      where: { id },
      data: {
        ...updateDto,
        startDate: updateDto.startDate ? new Date(updateDto.startDate) : undefined,
        endDate: updateDto.endDate ? new Date(updateDto.endDate) : undefined,
      },
    });

    // Log audit
    await this.adminService.logAudit({
      adminId,
      action: 'UPDATE_PARTNER_PROGRAM',
      entity: 'PARTNER_PROGRAM',
      entityId: id,
      changes: {
        before: { title: existing.title, isActive: existing.isActive },
        after: { title: program.title, isActive: program.isActive },
      },
    });

    return program;
  }

  async deleteProgram(adminId: string, id: string) {
    const program = await this.prisma.partnerProgram.findUnique({
      where: { id },
      include: {
        partner: true,
      },
    });

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    await this.prisma.partnerProgram.delete({
      where: { id },
    });

    // Update partner programs count
    await this.prisma.partner.update({
      where: { id: program.partnerId },
      data: {
        programsCount: {
          decrement: 1,
        },
      },
    });

    // Log audit
    await this.adminService.logAudit({
      adminId,
      action: 'DELETE_PARTNER_PROGRAM',
      entity: 'PARTNER_PROGRAM',
      entityId: id,
      changes: {
        before: { title: program.title },
      },
    });

    return { message: 'Program deleted successfully' };
  }

  async getPartnerStats() {
    const [total, active, inactive, pending] = await Promise.all([
      this.prisma.partner.count(),
      this.prisma.partner.count({ where: { status: PartnerStatus.ACTIVE } }),
      this.prisma.partner.count({ where: { status: PartnerStatus.INACTIVE } }),
      this.prisma.partner.count({ where: { status: PartnerStatus.PENDING } }),
    ]);

    const totalPrograms = await this.prisma.partnerProgram.count({
      where: { isActive: true },
    });

    const totalEngagement = await this.prisma.partner.aggregate({
      _sum: {
        totalEngagement: true,
      },
    });

    const byType = await this.prisma.partner.groupBy({
      by: ['type'],
      _count: {
        id: true,
      },
    });

    return {
      total,
      active,
      inactive,
      pending,
      totalPrograms,
      totalEngagement: totalEngagement._sum.totalEngagement || 0,
      byType: byType.map((item) => ({
        type: item.type,
        count: item._count.id,
      })),
    };
  }
}

