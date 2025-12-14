import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getConversations(userId: string) {
    const messages = await this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Group by conversation partner
    const conversations = new Map();
    messages.forEach((message) => {
      const partnerId = message.senderId === userId ? message.receiverId : message.senderId;
      const partner = message.senderId === userId ? message.receiver : message.sender;

      if (!conversations.has(partnerId)) {
        conversations.set(partnerId, {
          partner,
          lastMessage: message,
          unreadCount: 0,
        });
      }

      if (message.receiverId === userId && !message.isRead) {
        const conv = conversations.get(partnerId);
        conv.unreadCount++;
      }
    });

    return Array.from(conversations.values());
  }

  async getMessages(userId: string, otherUserId: string) {
    return this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async sendMessage(senderId: string, receiverId: string, content: string) {
    if (senderId === receiverId) {
      throw new NotFoundException('Cannot send message to yourself');
    }

    // Verify receiver exists
    const receiver = await this.prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver) {
      throw new NotFoundException('Receiver not found');
    }

    // Get sender info for notification
    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: {
        firstName: true,
        lastName: true,
      },
    });

    const message = await this.prisma.message.create({
      data: {
        senderId,
        receiverId,
        content,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
    });

    // Create notification for the receiver
    await this.prisma.notification.create({
      data: {
        userId: receiverId,
        title: 'New Message',
        message: `${sender?.firstName} ${sender?.lastName} sent you a message`,
        type: 'OTHER',
        link: `/chat/${senderId}`,
      },
    });

    return message;
  }

  async markAsRead(userId: string, messageId: string) {
    return this.prisma.message.updateMany({
      where: {
        id: messageId,
        receiverId: userId,
      },
      data: {
        isRead: true,
      },
    });
  }
}

