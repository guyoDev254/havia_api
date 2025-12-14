import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BadgeType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BadgesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async findAll(type?: BadgeType) {
    return this.prisma.badge.findMany({
      where: {
        ...(type && { type }),
      },
      include: {
        _count: {
          select: {
            userBadges: true,
          },
        },
      },
      orderBy: {
        points: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const badge = await this.prisma.badge.findUnique({
      where: { id },
      include: {
        userBadges: {
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
          take: 10,
        },
        _count: {
          select: {
            userBadges: true,
          },
        },
      },
    });

    if (!badge) {
      throw new NotFoundException('Badge not found');
    }

    return badge;
  }

  async awardBadge(userId: string, badgeId: string) {
    const badge = await this.prisma.badge.findUnique({
      where: { id: badgeId },
    });

    if (!badge) {
      throw new NotFoundException('Badge not found');
    }

    // Check if user already has this badge
    const existing = await this.prisma.userBadge.findUnique({
      where: {
        userId_badgeId: {
          userId,
          badgeId,
        },
      },
    });

    if (existing) {
      throw new NotFoundException('User already has this badge');
    }

    // Award badge and update user points
    await this.prisma.userBadge.create({
      data: {
        userId,
        badgeId,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        points: {
          increment: badge.points,
        },
      },
    });

    // Create notification for user
    await this.notificationsService.create(userId, {
      title: 'Badge Earned!',
      message: `Congratulations! You earned the ${badge.name} badge`,
      type: 'BADGE_EARNED' as any,
      badgeId: badgeId,
    });

    return badge;
  }

  async getUserBadges(userId: string) {
    const userBadges = await this.prisma.userBadge.findMany({
      where: { userId },
      include: {
        badge: {
          include: {
            _count: {
              select: {
                userBadges: true,
              },
            },
          },
        },
      },
      orderBy: {
        earnedAt: 'desc',
      },
    });

    return userBadges.map((userBadge) => ({
      id: userBadge.id,
      badge: {
        id: userBadge.badge.id,
        name: userBadge.badge.name,
        description: userBadge.badge.description,
        icon: userBadge.badge.icon,
        image: userBadge.badge.image,
        type: userBadge.badge.type,
        points: userBadge.badge.points,
      },
      earnedAt: userBadge.earnedAt,
    }));
  }
}

