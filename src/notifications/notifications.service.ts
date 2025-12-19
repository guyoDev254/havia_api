import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import { Expo } from 'expo-server-sdk';

@Injectable()
export class NotificationsService {
  private expo: Expo;

  constructor(private prisma: PrismaService) {
    this.expo = new Expo();
  }

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
    try {
      return await this.prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      });
    } catch (error) {
      console.error('Error getting unread count:', error);
      // Return 0 on error to prevent app crashes
      return 0;
    }
  }

  async registerPushToken(userId: string, token: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { expoPushToken: token },
      select: {
        id: true,
        email: true,
        expoPushToken: true,
      },
    });
  }

  async removePushToken(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { expoPushToken: null },
      select: {
        id: true,
        email: true,
      },
    });
  }

  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: any,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        expoPushToken: true,
        pushNotificationsEnabled: true,
      },
    });

    if (!user || !user.expoPushToken || !user.pushNotificationsEnabled) {
      return { success: false, reason: 'No push token or notifications disabled' };
    }

    // Validate Expo push token
    if (!Expo.isExpoPushToken(user.expoPushToken)) {
      console.error('Invalid Expo push token:', user.expoPushToken);
      return { success: false, reason: 'Invalid push token' };
    }

    try {
      const messages = [
        {
          to: user.expoPushToken,
          sound: 'default' as const,
          title,
          body,
          data: data || {},
          badge: 1,
        },
      ];

      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error('Error sending push notification chunk:', error);
        }
      }

      return { success: true, tickets };
    } catch (error) {
      console.error('Error sending push notification:', error);
      return { success: false, error: error.message };
    }
  }

  async createAndSend(
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
    // Create notification in database
    const notification = await this.create(userId, data);

    // Send push notification
    await this.sendPushNotification(userId, data.title, data.message, {
      notificationId: notification.id,
      type: data.type,
      link: data.link,
      eventId: data.eventId,
      clubId: data.clubId,
      mentorshipId: data.mentorshipId,
      badgeId: data.badgeId,
    });

    return notification;
  }
}

