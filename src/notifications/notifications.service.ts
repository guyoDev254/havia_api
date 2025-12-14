import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, unreadOnly?: boolean) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { isRead: false }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        isRead: true,
        link: true,
        eventId: true,
        clubId: true,
        mentorshipId: true,
        badgeId: true,
        createdAt: true,
      },
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        isRead: true,
      },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }

  async create(
    userId: string,
    data: {
      title: string;
      message: string;
      type: NotificationType;
      link?: string;
      eventId?: string;
      clubId?: string;
      mentorshipId?: string;
      badgeId?: string;
    },
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        ...data,
      },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }
}

