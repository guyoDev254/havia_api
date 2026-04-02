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

  /**
   * Automatically check and award badges based on user actions
   * This method checks various criteria and awards badges accordingly
   */
  async checkAndAwardBadges(userId: string, action: {
    type: 'CLUB_JOINED' | 'EVENT_REGISTERED' | 'EVENT_ATTENDED' | 'MENTORSHIP_COMPLETED' | 'FIRST_POST' | 'CLUB_CREATED' | 'USER_REGISTERED';
    data?: any;
  }) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          userBadges: {
            select: { badgeId: true },
          },
          clubMemberships: {
            where: { isActive: true },
            select: { clubId: true },
          },
          eventRegistrations: {
            where: { status: 'CONFIRMED' },
            select: { eventId: true },
          },
          mentorSessions: {
            where: { status: 'COMPLETED' },
            select: { id: true },
          },
          menteeSessions: {
            where: { status: 'COMPLETED' },
            select: { id: true },
          },
          posts: {
            where: { isDeleted: false },
            select: { id: true },
          },
        },
      });

      if (!user) return;

      const allBadges = await this.prisma.badge.findMany();
      const userBadgeIds = new Set(user.userBadges.map(ub => ub.badgeId));

      // Check each badge to see if user qualifies
      for (const badge of allBadges) {
        // Skip if user already has this badge
        if (userBadgeIds.has(badge.id)) continue;

        let shouldAward = false;

        // Check badge criteria based on badge name/description patterns
        const badgeName = badge.name.toLowerCase();
        const badgeDesc = (badge.description || '').toLowerCase();

        // Participation badges - Club related
        if (badgeName.includes('first club') || badgeName.includes('club member')) {
          if (user.clubMemberships.length >= 1) {
            shouldAward = true;
          }
        } else if (badgeName.includes('club enthusiast') || badgeName.includes('5 clubs')) {
          if (user.clubMemberships.length >= 5) {
            shouldAward = true;
          }
        } else if (badgeName.includes('club master') || badgeName.includes('10 clubs')) {
          if (user.clubMemberships.length >= 10) {
            shouldAward = true;
          }
        }

        // Participation badges - Event related
        if (badgeName.includes('first event') || badgeName.includes('event attendee')) {
          if (user.eventRegistrations.length >= 1) {
            shouldAward = true;
          }
        } else if (badgeName.includes('event regular') || badgeName.includes('5 events')) {
          if (user.eventRegistrations.length >= 5) {
            shouldAward = true;
          }
        } else if (badgeName.includes('event champion') || badgeName.includes('10 events')) {
          if (user.eventRegistrations.length >= 10) {
            shouldAward = true;
          }
        }

        // Mentorship badges
        if (badgeName.includes('mentorship') || badgeName.includes('mentor')) {
          if (badgeName.includes('completed') || badgeName.includes('graduate')) {
            const completedMentorships = [...user.mentorSessions, ...user.menteeSessions];
            if (completedMentorships.length >= 1) {
              shouldAward = true;
            }
          }
        }

        // First post badge
        if (badgeName.includes('first post') || badgeName.includes('content creator')) {
          if (user.posts.length >= 1) {
            shouldAward = true;
          }
        }

        // Action-specific badges
        if (action.type === 'CLUB_JOINED' && (badgeName.includes('club') || badgeDesc.includes('join'))) {
          if (user.clubMemberships.length >= 1) {
            shouldAward = true;
          }
        } else if (action.type === 'EVENT_REGISTERED' && (badgeName.includes('event') || badgeDesc.includes('register'))) {
          if (user.eventRegistrations.length >= 1) {
            shouldAward = true;
          }
        } else if (action.type === 'MENTORSHIP_COMPLETED' && (badgeName.includes('mentorship') || badgeDesc.includes('complete'))) {
          const completedMentorships = [...user.mentorSessions, ...user.menteeSessions];
          if (completedMentorships.length >= 1) {
            shouldAward = true;
          }
        } else if (action.type === 'FIRST_POST' && (badgeName.includes('post') || badgeName.includes('content'))) {
          if (user.posts.length >= 1) {
            shouldAward = true;
          }
        } else if (action.type === 'USER_REGISTERED' && (badgeName.includes('new member') || badgeName.includes('membership') || badgeDesc.includes('new member') || badgeDesc.includes('joined') || badgeDesc.includes('welcome'))) {
          shouldAward = true;
        }

        // Award the badge if criteria met
        if (shouldAward) {
          try {
            await this.awardBadge(userId, badge.id);
          } catch (error) {
            // Silently fail if badge already awarded (race condition)
            // or other non-critical errors
            console.error(`Failed to award badge ${badge.id} to user ${userId}:`, error);
          }
        }
      }
    } catch (error) {
      // Don't throw - badge awarding should not break the main flow
      console.error(`Error checking badges for user ${userId}:`, error);
    }
  }
}

