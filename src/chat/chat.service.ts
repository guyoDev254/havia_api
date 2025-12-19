import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EncryptionService } from '../common/services/encryption.service';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private encryptionService: EncryptionService,
  ) {}

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
        // Decrypt last message content for preview
        const decryptedMessage = {
          ...message,
          content: this.encryptionService.decrypt(message.content),
        };
        conversations.set(partnerId, {
          partner,
          lastMessage: decryptedMessage,
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
    const messages = await this.prisma.message.findMany({
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

    // Decrypt message content
    return messages.map((message) => ({
      ...message,
      content: this.encryptionService.decrypt(message.content),
    }));
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

    // Encrypt message content before storing
    const encryptedContent = this.encryptionService.encrypt(content);

    const message = await this.prisma.message.create({
      data: {
        senderId,
        receiverId,
        content: encryptedContent, // Store encrypted content
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

    // Create notification and send push notification for the receiver
    await this.notificationsService.createAndSend(receiverId, {
      title: 'New Message',
      message: `${sender?.firstName} ${sender?.lastName} sent you a message`,
      type: 'OTHER',
      link: `/chat/${senderId}`,
    });

    // Return message with decrypted content for the response
    return {
      ...message,
      content, // Return decrypted content to the sender
    };
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

