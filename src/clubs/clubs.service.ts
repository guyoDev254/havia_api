import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClubCategory } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ClubsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async findAll(category?: ClubCategory, limit?: number) {
    return this.prisma.club.findMany({
      where: {
        isActive: true,
        ...(category && { category }),
      },
      ...(limit && { take: limit }),
      include: {
        members: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
          take: 5,
        },
        _count: {
          select: {
            members: true,
            events: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const club = await this.prisma.club.findUnique({
      where: { id },
      include: {
        members: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            bio: true,
          },
        },
        managers: {
          where: {
            isActive: true,
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                profileImage: true,
                role: true,
              },
            },
          },
        },
        events: {
          where: {
            status: 'UPCOMING',
          },
          take: 5,
          orderBy: {
            startDate: 'asc',
          },
        },
        _count: {
          select: {
            members: true,
            events: true,
          },
        },
      },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    return club;
  }

  async create(userId: string, data: any) {
    return this.prisma.club.create({
      data: {
        ...data,
        createdBy: userId,
        members: {
          connect: { id: userId },
        },
      },
      include: {
        members: {
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

  async joinClub(userId: string, clubId: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      include: {
        members: {
          where: { id: userId },
        },
      },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    if (club.members.length > 0) {
      throw new ForbiddenException('Already a member of this club');
    }

    const updatedClub = await this.prisma.club.update({
      where: { id: clubId },
      data: {
        members: {
          connect: { id: userId },
        },
      },
      include: {
        members: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        _count: {
          select: {
            members: true,
            events: true,
          },
        },
      },
    });

    // Create notification for club creator
    if (club.createdBy !== userId) {
      await this.notificationsService.create(club.createdBy, {
        title: 'New Member Joined',
        message: `A new member joined ${club.name}`,
        type: 'CLUB_UPDATE' as any,
        clubId: clubId,
      });
    }

    return updatedClub;
  }

  async leaveClub(userId: string, clubId: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    if (club.createdBy === userId) {
      throw new ForbiddenException('Cannot leave club you created');
    }

    return this.prisma.club.update({
      where: { id: clubId },
      data: {
        members: {
          disconnect: { id: userId },
        },
      },
    });
  }

  async getMembers(clubId: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      include: {
        members: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            bio: true,
            occupation: true,
            points: true,
          },
        },
      },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    return club.members;
  }

  async checkMembership(userId: string, clubId: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      include: {
        members: {
          where: { id: userId },
          select: { id: true },
        },
      },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    return { isMember: club.members.length > 0 };
  }

  async assignManager(clubId: string, userId: string, assignedBy: string) {
    // Check if club exists
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if already a manager
    const existingManager = await this.prisma.clubManager.findUnique({
      where: {
        userId_clubId: {
          userId,
          clubId,
        },
      },
    });

    if (existingManager) {
      throw new BadRequestException('User is already a manager of this club');
    }

    // Create club manager
    const clubManager = await this.prisma.clubManager.create({
      data: {
        userId,
        clubId,
        assignedBy,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
            role: true,
          },
        },
        club: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Update user role to CLUB_MANAGER if not already
    if (user.role !== 'CLUB_MANAGER' && user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { role: 'CLUB_MANAGER' },
      });
    }

    // Send notification to the new manager
    await this.notificationsService.create(userId, {
      title: 'Club Manager Assignment',
      message: `You have been assigned as a manager of ${club.name}`,
      type: 'CLUB_UPDATE' as any,
      clubId: clubId,
    });

    return clubManager;
  }

  async removeManager(clubId: string, userId: string) {
    const clubManager = await this.prisma.clubManager.findUnique({
      where: {
        userId_clubId: {
          userId,
          clubId,
        },
      },
    });

    if (!clubManager) {
      throw new NotFoundException('Club manager not found');
    }

    await this.prisma.clubManager.delete({
      where: {
        userId_clubId: {
          userId,
          clubId,
        },
      },
    });

    // Check if user is still managing other clubs
    const otherManagedClubs = await this.prisma.clubManager.count({
      where: {
        userId,
        isActive: true,
      },
    });

    // If no other clubs, revert role to MEMBER (unless they have other elevated roles)
    if (otherManagedClubs === 0) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (user && user.role === 'CLUB_MANAGER') {
        await this.prisma.user.update({
          where: { id: userId },
          data: { role: 'MEMBER' },
        });
      }
    }

    return { message: 'Club manager removed successfully' };
  }

  async getManagers(clubId: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    const managers = await this.prisma.clubManager.findMany({
      where: {
        clubId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
            role: true,
            phone: true,
            occupation: true,
          },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });

    return managers;
  }

  async getManagedClubs(userId: string) {
    const managedClubs = await this.prisma.clubManager.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        club: {
          include: {
            _count: {
              select: {
                members: true,
                events: true,
              },
            },
          },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });

    return managedClubs;
  }

  async isManager(userId: string, clubId: string) {
    const clubManager = await this.prisma.clubManager.findUnique({
      where: {
        userId_clubId: {
          userId,
          clubId,
        },
      },
    });

    return { isManager: !!clubManager && clubManager.isActive };
  }
}

