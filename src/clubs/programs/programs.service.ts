import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProgramType, ProgramStatus, ClubRole } from '@prisma/client';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';

@Injectable()
export class ProgramsService {
  constructor(private prisma: PrismaService) {}

  async create(clubId: string, userId: string, data: CreateProgramDto) {
    // Check if club exists and user has permission
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      include: {
        memberships: {
          where: { userId },
        },
        managers: {
          where: {
            userId,
            isActive: true,
          },
        },
        lead: {
          select: { id: true },
        },
      },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // Check permissions: Lead, Admin, or Manager can create programs
    const isLead = club.lead?.id === userId || club.createdBy === userId;
    const isManager = club.managers.length > 0;
    const membership = club.memberships[0];
    const isAdmin = membership && (membership.role === ClubRole.ADMIN || membership.role === ClubRole.LEAD);

    if (!isLead && !isManager && !isAdmin) {
      throw new ForbiddenException('Only club leads, admins, or managers can create programs');
    }

    // Validate payment fields
    if (data.isPaid && (!data.price || data.price <= 0)) {
      throw new BadRequestException('Price is required for paid programs');
    }
    if (!data.isPaid) {
      data.price = null;
      data.currency = null;
      data.paymentLink = null;
    }

    const program = await this.prisma.clubProgram.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type || 'OTHER',
        status: data.status || 'DRAFT',
        image: data.image,
        clubId,
        createdBy: userId,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        duration: data.duration,
        maxParticipants: data.maxParticipants || 0,
        isPaid: data.isPaid || false,
        price: data.isPaid ? data.price : null,
        currency: data.isPaid ? (data.currency || 'KES') : null,
        paymentLink: data.isPaid ? data.paymentLink : null,
        objectives: data.objectives || [],
        curriculum: data.curriculum,
        requirements: data.requirements,
      },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        _count: {
          select: {
            participants: true,
          },
        },
      },
    });

    return program;
  }

  async findAll(clubId: string, status?: ProgramStatus, type?: ProgramType) {
    const where: any = { clubId };
    if (status) where.status = status;
    if (type) where.type = type;

    return this.prisma.clubProgram.findMany({
      where,
      include: {
        club: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        _count: {
          select: {
            participants: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const program = await this.prisma.clubProgram.findUnique({
      where: { id },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            logo: true,
            banner: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
                email: true,
              },
            },
          },
          take: 20,
        },
        _count: {
          select: {
            participants: true,
          },
        },
      },
    });

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    return program;
  }

  async update(id: string, userId: string, data: UpdateProgramDto) {
    const program = await this.prisma.clubProgram.findUnique({
      where: { id },
      include: {
        club: {
          include: {
            memberships: {
              where: { userId },
            },
            managers: {
              where: {
                userId,
                isActive: true,
              },
            },
            lead: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    // Check permissions
    const isCreator = program.createdBy === userId;
    const club = program.club;
    const isLead = club.lead?.id === userId || club.createdBy === userId;
    const isManager = club.managers.length > 0;
    const membership = club.memberships[0];
    const isAdmin = membership && (membership.role === ClubRole.ADMIN || membership.role === ClubRole.LEAD);

    if (!isCreator && !isLead && !isManager && !isAdmin) {
      throw new ForbiddenException('Only program creator, club leads, admins, or managers can update programs');
    }

    // Validate payment fields
    if (data.isPaid !== undefined && data.isPaid && (!data.price || data.price <= 0)) {
      throw new BadRequestException('Price is required for paid programs');
    }
    if (data.isPaid === false) {
      data.price = null;
      data.currency = null;
      data.paymentLink = null;
    }

    return this.prisma.clubProgram.update({
      where: { id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        price: data.isPaid !== undefined && !data.isPaid ? null : data.price,
        currency: data.isPaid !== undefined && !data.isPaid ? null : data.currency,
        paymentLink: data.isPaid !== undefined && !data.isPaid ? null : data.paymentLink,
      },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        _count: {
          select: {
            participants: true,
          },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    const program = await this.prisma.clubProgram.findUnique({
      where: { id },
      include: {
        club: {
          include: {
            memberships: {
              where: { userId },
            },
            managers: {
              where: {
                userId,
                isActive: true,
              },
            },
            lead: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    // Check permissions
    const isCreator = program.createdBy === userId;
    const club = program.club;
    const isLead = club.lead?.id === userId || club.createdBy === userId;
    const isManager = club.managers.length > 0;
    const membership = club.memberships[0];
    const isAdmin = membership && (membership.role === ClubRole.ADMIN || membership.role === ClubRole.LEAD);

    if (!isCreator && !isLead && !isManager && !isAdmin) {
      throw new ForbiddenException('Only program creator, club leads, admins, or managers can delete programs');
    }

    await this.prisma.clubProgram.delete({
      where: { id },
    });

    return { message: 'Program deleted successfully' };
  }

  async enroll(programId: string, userId: string) {
    const program = await this.prisma.clubProgram.findUnique({
      where: { id: programId },
      include: {
        participants: {
          where: { userId },
        },
      },
    });

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    // Check if user is already enrolled
    if (program.participants.length > 0) {
      throw new BadRequestException('Already enrolled in this program');
    }

    // Check if user is a member of the club
    const membership = await this.prisma.clubMember.findUnique({
      where: {
        userId_clubId: {
          userId,
          clubId: program.clubId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You must be a member of the club to enroll in programs');
    }

    // Check max participants
    if (program.maxParticipants > 0) {
      const participantCount = await this.prisma.clubProgramParticipant.count({
        where: {
          programId,
          status: { in: ['REGISTERED', 'ACTIVE'] },
        },
      });

      if (participantCount >= program.maxParticipants) {
        throw new BadRequestException('Program is full');
      }
    }

    const participant = await this.prisma.clubProgramParticipant.create({
      data: {
        programId,
        userId,
        status: 'REGISTERED',
      },
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
    });

    return participant;
  }

  async unenroll(programId: string, userId: string) {
    const participant = await this.prisma.clubProgramParticipant.findUnique({
      where: {
        programId_userId: {
          programId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new NotFoundException('Not enrolled in this program');
    }

    await this.prisma.clubProgramParticipant.delete({
      where: {
        programId_userId: {
          programId,
          userId,
        },
      },
    });

    return { message: 'Successfully unenrolled from program' };
  }

  async updateParticipantStatus(programId: string, participantId: string, userId: string, status: string) {
    const program = await this.prisma.clubProgram.findUnique({
      where: { id: programId },
      include: {
        club: {
          include: {
            memberships: {
              where: { userId },
            },
            managers: {
              where: {
                userId,
                isActive: true,
              },
            },
            lead: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    // Check permissions - only program creator, club leads, admins, or managers can update participant status
    const isCreator = program.createdBy === userId;
    const club = program.club;
    const isLead = club.lead?.id === userId || club.createdBy === userId;
    const isManager = club.managers.length > 0;
    const membership = club.memberships[0];
    const isAdmin = membership && (membership.role === ClubRole.ADMIN || membership.role === ClubRole.LEAD);

    if (!isCreator && !isLead && !isManager && !isAdmin) {
      throw new ForbiddenException('Only program creator, club leads, admins, or managers can update participant status');
    }

    const participant = await this.prisma.clubProgramParticipant.findUnique({
      where: { id: participantId },
    });

    if (!participant || participant.programId !== programId) {
      throw new NotFoundException('Participant not found');
    }

    const updateData: any = { status };
    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
      updateData.progress = 100;
    }

    return this.prisma.clubProgramParticipant.update({
      where: { id: participantId },
      data: updateData,
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
    });
  }
}

