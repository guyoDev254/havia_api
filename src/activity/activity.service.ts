import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  async createActivity(userId: string, data: {
    type: 'EVENT_CREATED' | 'EVENT_RSVP' | 'CLUB_JOINED' | 'CLUB_CREATED' | 'BADGE_EARNED' | 'MENTORSHIP_STARTED' | 'MENTORSHIP_COMPLETED' | 'POST_CREATED' | 'COMMENT_ADDED';
    title: string;
    description?: string;
    link?: string;
    eventId?: string;
    clubId?: string;
    badgeId?: string;
    mentorshipId?: string;
    metadata?: any;
  }) {
    return this.prisma.activity.create({
      data: {
        userId,
        type: data.type,
        title: data.title,
        description: data.description,
        link: data.link,
        eventId: data.eventId,
        clubId: data.clubId,
        badgeId: data.badgeId,
        mentorshipId: data.mentorshipId,
        metadata: data.metadata || {},
      },
    });
  }

  async getActivityFeed(userId: string, limit: number = 20, offset: number = 0) {
    // Get users that the current user is following
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = following.map(f => f.followingId);
    // Include current user's own activities
    followingIds.push(userId);

    // Get activities from followed users
    const activities = await this.prisma.activity.findMany({
      where: {
        userId: { in: followingIds },
      },
      take: limit,
      skip: offset,
      orderBy: {
        createdAt: 'desc',
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

    return activities;
  }

  async getUserActivities(userId: string, limit: number = 20, offset: number = 0) {
    return this.prisma.activity.findMany({
      where: { userId },
      take: limit,
      skip: offset,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

