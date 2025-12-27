import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, MentorshipStatus, NotificationType, MatchStatus } from '@prisma/client';
import {
  ROLE_PERMISSIONS,
  getRolePermissions,
  Permission,
} from '../common/permissions/permissions.constant';
import { EncryptionService } from '../common/services/encryption.service';
import { EmailService } from '../common/services/email.service';
import { AuditService } from '../common/services/audit.service';
import { MentorshipService } from '../mentorship/mentorship.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
    private emailService: EmailService,
    private auditService: AuditService,
    private mentorshipService: MentorshipService,
    private notificationsService: NotificationsService,
  ) {}

  // Statistics
  async getStatistics() {
    const [users, clubs, events, mentorships, badges, notifications] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.club.count(),
      this.prisma.event.count(),
      this.prisma.mentorship.count(),
      this.prisma.badge.count(),
      this.prisma.notification.count(),
    ]);

    const activeUsers = await this.prisma.user.count({
      where: { isActive: true },
    });

    const upcomingEvents = await this.prisma.event.count({
      where: { status: 'UPCOMING' },
    });

    const activeMentorships = await this.prisma.mentorship.count({
      where: { status: 'ACTIVE' },
    });

    const unreadNotifications = await this.prisma.notification.count({
      where: { isRead: false },
    });

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentUsers = await this.prisma.user.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    });

    const recentEvents = await this.prisma.event.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    });

    const recentMentorships = await this.prisma.mentorship.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    });

    // Engagement metrics (DAU, WAU, MAU)
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    // DAU - Users who logged in today (using lastLoginAt or lastActivityAt if available)
    // For now, we'll use users active in last 24 hours
    const dau = await this.prisma.user.count({
      where: {
        isActive: true,
        updatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    // WAU - Users active in last 7 days
    const wau = await this.prisma.user.count({
      where: {
        isActive: true,
        updatedAt: {
          gte: weekAgo,
        },
      },
    });

    // MAU - Users active in last 30 days
    const mau = await this.prisma.user.count({
      where: {
        isActive: true,
        updatedAt: {
          gte: monthAgo,
        },
      },
    });

    // Reports/Moderation stats
    const pendingReports = await this.prisma.report.count({
      where: { status: 'PENDING' },
    });

    const totalReports = await this.prisma.report.count();
    const resolvedReports = await this.prisma.report.count({
      where: { status: 'RESOLVED' },
    });

    // Recent reports (last 7 days)
    const recentReports = await this.prisma.report.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    });

    // Content stats
    const totalPosts = await this.prisma.post.count();
    const recentPosts = await this.prisma.post.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    });

    const totalContent = await this.prisma.content?.count().catch(() => 0) || 0;
    const activeContent = await this.prisma.content?.count({
      where: { status: 'PUBLISHED' },
    }).catch(() => 0) || 0;

    // Partnerships stats
    const totalPartners = await this.prisma.partner?.count().catch(() => 0) || 0;
    const activePartners = await this.prisma.partner?.count({
      where: { status: 'ACTIVE' },
    }).catch(() => 0) || 0;

    return {
      users: {
        total: users,
        active: activeUsers,
        recent: recentUsers,
      },
      clubs: {
        total: clubs,
      },
      events: {
        total: events,
        upcoming: upcomingEvents,
        recent: recentEvents,
      },
      mentorships: {
        total: mentorships,
        active: activeMentorships,
        recent: recentMentorships,
      },
      badges: {
        total: badges,
      },
      notifications: {
        total: notifications,
        unread: unreadNotifications,
      },
      engagement: {
        dau,
        wau,
        mau,
      },
      moderation: {
        totalReports,
        pendingReports,
        resolvedReports,
        recentReports,
      },
      content: {
        totalPosts,
        recentPosts,
        totalContent,
        activeContent,
      },
      partnerships: {
        total: totalPartners,
        active: activePartners,
      },
    };
  }

  // User Management
  /**
   * Generate a random password
   */
  private generateRandomPassword(length: number = 12): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    const allChars = uppercase + lowercase + numbers + symbols;
    
    let password = '';
    // Ensure at least one of each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Send welcome email with password and verification link
   */
  private async sendWelcomeEmail(
    email: string,
    firstName: string,
    password: string,
    verificationToken: string,
  ): Promise<boolean> {
    const verifyLink = `${process.env.FRONTEND_URL || 'http://localhost:19006'}/verify-email?token=${verificationToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to NorthernBox</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0284c7 0%, #7c3aed 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">NorthernBox</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <h2 style="color: #111827; margin-top: 0;">Welcome to NorthernBox, ${firstName}!</h2>
            <p>Hello ${firstName},</p>
            <p>Your account has been created on NorthernBox. Here are your login credentials:</p>
            <div style="background: #ffffff; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 0;"><strong>Password:</strong> <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${password}</code></p>
            </div>
            <p style="color: #dc2626; font-weight: bold;">⚠️ Please change your password after your first login for security.</p>
            <p>Before you can access your account, please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyLink}" style="background: #0284c7; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Verify Email</a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
            <p style="color: #0284c7; font-size: 12px; word-break: break-all;">${verifyLink}</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">This verification link will expire in 24 hours.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} NorthernBox. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    return this.emailService.sendEmail(
      email,
      'Welcome to NorthernBox - Your Account Details',
      html,
    );
  }

  /**
   * Create a new user (admin only)
   * Regular admins can only create MEMBER or STUDENT roles
   * Super admins can create any role
   */
  async createUser(
    createUserDto: CreateUserDto,
    adminId: string,
    isSuperAdmin: boolean = false,
  ) {
    const { email, firstName, lastName, phone, role, educationLevel } = createUserDto as any;

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(phone ? [{ phone }] : []),
        ],
      },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email or phone already exists');
    }

    // Validate role permissions
    const defaultRole = role || UserRole.MEMBER;
    const allowedRolesForRegularAdmin: UserRole[] = [UserRole.MEMBER, UserRole.STUDENT];
    
    if (!isSuperAdmin && !allowedRolesForRegularAdmin.includes(defaultRole)) {
      throw new ForbiddenException(
        'You do not have permission to create users with this role. Only MEMBER and STUDENT roles are allowed.',
      );
    }

    // Generate random password
    const generatedPassword = this.generateRandomPassword(12);
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Determine if user is a student
    const isStudent = defaultRole === UserRole.STUDENT || educationLevel !== undefined;

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        phone,
        firstName,
        lastName,
        password: hashedPassword,
        role: defaultRole,
        isStudent,
        educationLevel: isStudent && educationLevel ? (educationLevel as any) : undefined,
        emailVerificationToken: verificationToken,
        isEmailVerified: false,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isStudent: true,
        educationLevel: true,
        createdAt: true,
      },
    });

    // Send welcome email with password and verification link
    await this.sendWelcomeEmail(email, firstName, generatedPassword, verificationToken);

    // Log audit trail
    await this.auditService.logAction({
      adminId,
      userId: user.id,
      action: 'CREATE_USER',
      entity: 'USER',
      entityId: user.id,
      changes: {
        before: null,
        after: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isStudent: user.isStudent,
          educationLevel: (user as any).educationLevel,
        },
      },
      metadata: {
        autoGeneratedPassword: true,
        emailSent: true,
        verificationTokenGenerated: true,
      },
    });

    return {
      user,
      message: 'User created successfully. Password and verification email have been sent.',
    };
  }

  async getAllUsers(
    page = 1,
    limit = 20,
    search?: string,
    role?: UserRole,
    status?: string,
    sortBy = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ];
    }
    
    if (role) {
      where.role = role;
    }

    if (status) {
      if (status === 'active') {
        where.isActive = true;
      } else if (status === 'inactive' || status === 'suspended') {
        where.isActive = false;
      }
    }

    // Map sortBy to Prisma field names
    const orderByField: any = {};
    if (sortBy === 'points') {
      orderByField.points = sortOrder;
    } else if (sortBy === 'firstName') {
      orderByField.firstName = sortOrder;
    } else {
      orderByField.createdAt = sortOrder;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          points: true,
          createdAt: true,
          _count: {
            select: {
              clubs: true,
              userBadges: true,
            },
          },
        },
        orderBy: orderByField,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        bio: true,
        profileImage: true,
        location: true,
        skills: true,
        interests: true,
        education: true,
        occupation: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        points: true,
        createdAt: true,
        updatedAt: true,
        clubMemberships: {
          where: {
            isActive: true,
          },
          select: {
            club: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
        },
        userBadges: {
          include: {
            badge: {
              select: {
                id: true,
                name: true,
                type: true,
                points: true,
              },
            },
          },
        },
        _count: {
          select: {
            posts: true,
            comments: true,
            attendedEvents: true,
            mentorSessions: true,
            menteeSessions: true,
          },
        },
        mentorSessions: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            status: true,
            mentee: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        menteeSessions: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            status: true,
            mentor: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Transform the data to match frontend expectations
    const activeMentorships = [
      ...user.mentorSessions.map((m) => ({
        id: m.id,
        status: m.status,
        mentee: m.mentee,
      })),
      ...user.menteeSessions.map((m) => ({
        id: m.id,
        status: m.status,
        mentor: m.mentor,
      })),
    ];

    return {
      ...user,
      activeMentorships,
      _count: {
        ...user._count,
        mentorships: (user._count.mentorSessions || 0) + (user._count.menteeSessions || 0),
        eventsAttended: user._count.attendedEvents,
      },
    };
  }

  async updateUser(id: string, data: any, adminId?: string) {
    const beforeUser = await this.prisma.user.findUnique({ where: { id } });
    if (!beforeUser) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        points: true,
      },
    });

    // Log audit trail
    if (adminId) {
      await this.auditService.logAction({
        adminId,
        userId: id,
        action: 'UPDATE_USER',
        entity: 'USER',
        entityId: id,
        changes: {
          before: beforeUser,
          after: updatedUser,
        },
      });
    }

    return updatedUser;
  }

  async deleteUser(id: string, adminId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const deletedUser = await this.prisma.user.delete({
      where: { id },
    });

    // Log audit trail
    if (adminId) {
      await this.auditService.logAction({
        adminId,
        userId: id,
        action: 'DELETE_USER',
        entity: 'USER',
        entityId: id,
        changes: {
          before: user,
          after: null,
        },
      });
    }

    return deletedUser;
  }

  async updateUserRole(id: string, role: UserRole, adminId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const oldRole = user.role;
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    // Log audit trail
    if (adminId) {
      await this.auditService.logAction({
        adminId,
        userId: id,
        action: 'CHANGE_ROLE',
        entity: 'USER',
        entityId: id,
        changes: {
          before: { role: oldRole },
          after: { role },
        },
      });
    }

    return updatedUser;
  }

  async suspendUser(id: string, reason?: string, duration?: number, adminId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const suspensionEndsAt = duration
      ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000)
      : null;

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    // Log audit trail
    if (adminId) {
      await this.auditService.logAction({
        adminId,
        userId: id,
        action: 'SUSPEND_USER',
        entity: 'USER',
        entityId: id,
        changes: {
          before: { isActive: user.isActive },
          after: { isActive: false },
        },
        reason,
        metadata: {
          duration,
          suspensionEndsAt: suspensionEndsAt?.toISOString(),
        },
      });
    }

    // Log the action
    if (adminId) {
      await this.auditService.logAction({
        adminId,
        userId: id,
        action: 'SUSPEND_USER',
        entity: 'USER',
        entityId: id,
        changes: {
          before: { isActive: user.isActive },
          after: { isActive: false },
        },
        reason,
        metadata: { duration, suspensionEndsAt },
      });
    }

    return updatedUser;
  }

  async banUser(id: string, reason?: string, adminId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    // Log audit trail
    if (adminId) {
      await this.auditService.logAction({
        adminId,
        userId: id,
        action: 'BAN_USER',
        entity: 'USER',
        entityId: id,
        changes: {
          before: { isActive: user.isActive },
          after: { isActive: false },
        },
        reason,
        metadata: {
          permanent: true,
        },
      });
    }

    // Log audit trail
    if (adminId) {
      await this.auditService.logAction({
        adminId,
        userId: id,
        action: 'BAN_USER',
        entity: 'USER',
        entityId: id,
        changes: {
          before: { isActive: user.isActive },
          after: { isActive: false, banned: true },
        },
        reason,
        metadata: {
          permanent: true,
        },
      });
    }

    return updatedUser;
  }

  async sendMessageToUser(userId: string, message: string, adminId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!adminId) {
      throw new BadRequestException('Admin ID is required to send messages');
    }

    // Encrypt message content before storing
    const encryptedContent = this.encryptionService.encrypt(message);

    // Create an actual message record in the messages table
    const messageRecord = await this.prisma.message.create({
      data: {
        senderId: adminId,
        receiverId: userId,
        content: encryptedContent, // Store encrypted content
        isRead: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
            role: true,
          },
        },
        receiver: {
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
    });

    // Get admin info for notification
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: {
        firstName: true,
        lastName: true,
      },
    });

    // Log audit trail
    await this.auditService.logAction({
      adminId,
      userId,
      action: 'SEND_MESSAGE',
      entity: 'USER',
      entityId: userId,
      metadata: {
        messageId: messageRecord.id,
        messageLength: message.length,
      },
    });

    // Create a notification for the user (in addition to the message)
    await this.prisma.notification.create({
      data: {
        userId,
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        title: 'Message from Admin',
        message: `${admin?.firstName || 'Admin'} ${admin?.lastName || ''} sent you a message`,
        isRead: false,
        link: `/chat/${adminId}`,
      },
    });

    // Send push notification
    try {
      const { NotificationsService } = await import('../notifications/notifications.service');
      const notificationsService = new NotificationsService(this.prisma);
      await notificationsService.createAndSend(userId, {
        title: 'Message from Admin',
        message: `${admin?.firstName || 'Admin'} ${admin?.lastName || ''} sent you a message`,
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        link: `/chat/${adminId}`,
      });
    } catch (error) {
      console.error('Error sending push notification:', error);
      // Don't fail if push notification fails
    }

    // Log the action
    if (adminId) {
      await this.auditService.logAction({
        adminId,
        userId,
        action: 'SEND_MESSAGE',
        entity: 'USER',
        entityId: userId,
        metadata: { message },
      });
    }

    // Return message with decrypted content
    return {
      ...messageRecord,
      content: message, // Return decrypted content
    };
  }

  async exportUserData(userId: string) {
    const user = await this.getUserById(userId);
    
    // Convert to CSV format
    const csvRows = [
      ['Field', 'Value'],
      ['ID', user.id],
      ['Email', user.email],
      ['Phone', user.phone || ''],
      ['First Name', user.firstName],
      ['Last Name', user.lastName],
      ['Role', user.role],
      ['Active', user.isActive ? 'Yes' : 'No'],
      ['Email Verified', user.isEmailVerified ? 'Yes' : 'No'],
      ['Points', user.points.toString()],
      ['Created At', user.createdAt.toISOString()],
      ['Updated At', user.updatedAt.toISOString()],
      ['Clubs Count', (user.clubMemberships?.length || 0).toString()],
      ['Badges Count', user.userBadges.length.toString()],
    ];

    return csvRows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  async exportAnalytics() {
    const stats = await this.getStatistics();
    const trends = await this.getTrendData(30);

    const csvRows = [
      ['Metric', 'Value'],
      ['Total Users', stats.users.total],
      ['Active Users', stats.users.active],
      ['New Users (Last 7 Days)', stats.users.recent],
      ['Total Clubs', stats.clubs.total],
      ['Total Events', stats.events.total],
      ['Upcoming Events', stats.events.upcoming],
      ['Total Mentorships', stats.mentorships.total],
      ['Active Mentorships', stats.mentorships.active],
      ['Total Badges', stats.badges.total],
      ['Daily Active Users', stats.engagement?.dau || 0],
      ['Weekly Active Users', stats.engagement?.wau || 0],
      ['Monthly Active Users', stats.engagement?.mau || 0],
      ['Total Reports', stats.moderation?.totalReports || 0],
      ['Pending Reports', stats.moderation?.pendingReports || 0],
      ['Resolved Reports', stats.moderation?.resolvedReports || 0],
    ];

    return csvRows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  async exportAllUsers(search?: string, role?: UserRole) {
    const users = await this.getAllUsers(1, 10000, search, role, undefined, 'createdAt', 'desc');
    
    const csvRows = [
      ['ID', 'Email', 'First Name', 'Last Name', 'Role', 'Active', 'Email Verified', 'Points', 'Created At'],
      ...users.users.map((user) => [
        user.id,
        user.email,
        user.firstName,
        user.lastName,
        user.role,
        user.isActive ? 'Yes' : 'No',
        user.isEmailVerified ? 'Yes' : 'No',
        user.points.toString(),
        user.createdAt.toISOString(),
      ]),
    ];

    return csvRows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  // Deprecated: Use auditService.logAction instead
  async logAudit(data: {
    adminId: string;
    userId?: string;
    action: string;
    entity: string;
    entityId?: string;
    changes?: any;
    reason?: string;
    metadata?: any;
  }) {
    return this.auditService.logAction(data);
  }

  async getAuditLogs(userId?: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where: any = {};
    
    if (userId) {
      where.userId = userId;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          admin: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAllAuditLogs(
    page = 1,
    limit = 50,
    filters?: {
      adminId?: string;
      userId?: string;
      action?: string;
      entity?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    return this.auditService.getAuditLogs(page, limit, filters);
  }

  async activateUser(id: string, adminId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { isActive: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    // Log audit trail
    if (adminId) {
      await this.auditService.logAction({
        adminId,
        userId: id,
        action: 'ACTIVATE_USER',
        entity: 'USER',
        entityId: id,
        changes: {
          before: { isActive: user.isActive },
          after: { isActive: true },
        },
      });
    }

    return updatedUser;
  }

  async getRoles() {
    return Object.keys(ROLE_PERMISSIONS).map((role) => ({
      role: role as UserRole,
      permissions: getRolePermissions(role as UserRole),
      isAdmin: ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'COMMUNITY_MANAGER', 'MENTORSHIP_ADMIN', 'CONTENT_MANAGER', 'PARTNERSHIP_MANAGER', 'DATA_ADMIN', 'SUPPORT_ADMIN', 'ADMIN', 'MODERATOR'].includes(role),
    }));
  }

  async getRolePermissions(role: UserRole) {
    return {
      role,
      permissions: getRolePermissions(role),
    };
  }

  // Club Management
  async getAllClubs(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    
    if (status) {
      where.status = status;
    }

    const [clubs, total] = await Promise.all([
      this.prisma.club.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              members: true,
              events: true,
            },
          },
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.club.count({ where }),
    ]);

    return {
      clubs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateClub(id: string, data: any) {
    return this.prisma.club.update({
      where: { id },
      data,
    });
  }

  async deleteClub(id: string, adminId?: string) {
    const club = await this.prisma.club.findUnique({ where: { id } });
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    const deletedClub = await this.prisma.club.delete({
      where: { id },
    });

    // Log audit trail
    if (adminId) {
      await this.auditService.logAction({
        adminId,
        action: 'DELETE_CLUB',
        entity: 'CLUB',
        entityId: id,
        changes: {
          before: club,
          after: null,
        },
      });
    }

    return deletedClub;
  }

  // Event Management
  async getAllEvents(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        skip,
        take: limit,
        include: {
          organizer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          club: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              attendees: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.event.count(),
    ]);

    return {
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateEvent(id: string, data: any) {
    return this.prisma.event.update({
      where: { id },
      data,
    });
  }

  async deleteEvent(id: string, adminId?: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const deletedEvent = await this.prisma.event.delete({
      where: { id },
    });

    // Log audit trail
    if (adminId) {
      await this.auditService.logAction({
        adminId,
        action: 'DELETE_EVENT',
        entity: 'EVENT',
        entityId: id,
        changes: {
          before: event,
          after: null,
        },
      });
    }

    return deletedEvent;
  }

  // Badge Management
  async getAllBadges() {
    return this.prisma.badge.findMany({
      include: {
        _count: {
          select: {
            userBadges: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async createBadge(data: any) {
    return this.prisma.badge.create({
      data,
    });
  }

  async updateBadge(id: string, data: any) {
    return this.prisma.badge.update({
      where: { id },
      data,
    });
  }

  async deleteBadge(id: string) {
    return this.prisma.badge.delete({
      where: { id },
    });
  }

  // Mentorship Management
  async getAllMentorships(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where = status ? { status: status as MentorshipStatus } : {};

    const [mentorships, total] = await Promise.all([
      this.prisma.mentorship.findMany({
        where,
        skip,
        take: limit,
        include: {
          mentor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImage: true,
            },
          },
          mentee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImage: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.mentorship.count({ where }),
    ]);

    return {
      mentorships,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMentorshipById(id: string) {
    const mentorship = await this.prisma.mentorship.findUnique({
      where: { id },
      include: {
        mentor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            bio: true,
            profileImage: true,
            skills: true,
            occupation: true,
          },
        },
        mentee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            bio: true,
            profileImage: true,
            skills: true,
            occupation: true,
          },
        },
        cycle: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
        match: {
          select: {
            matchScore: true,
            skillMatch: true,
            industryRelevance: true,
            availabilityMatch: true,
            communicationMatch: true,
            personalityFit: true,
          },
        },
        programs: {
          include: {
            tasks: {
              select: {
                id: true,
                title: true,
                status: true,
                week: true,
                type: true,
              },
            },
            progress: {
              select: {
                week: true,
                tasksCompleted: true,
                totalTasks: true,
                engagementScore: true,
                skillImprovement: true,
              },
            },
          },
        },
        progress: {
          select: {
            week: true,
            tasksCompleted: true,
            totalTasks: true,
            engagementScore: true,
            skillImprovement: true,
          },
        },
        sessions: {
          orderBy: { scheduledDate: 'desc' },
        },
        evaluations: {
          orderBy: { createdAt: 'desc' },
        },
        certificate: {
          select: {
            id: true,
            certificateNumber: true,
            issuedAt: true,
            pdfUrl: true,
          },
        },
      },
    });

    if (!mentorship) {
      throw new NotFoundException('Mentorship not found');
    }

    // Manually fetch evaluator user data for each evaluation
    // (MentorshipEvaluation doesn't have a relation, only evaluatorId)
    if (mentorship.evaluations && mentorship.evaluations.length > 0) {
      const evaluatorIds = [...new Set(mentorship.evaluations.map((e: any) => e.evaluatorId))];
      const evaluators = await this.prisma.user.findMany({
        where: { id: { in: evaluatorIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profileImage: true,
        },
      });
      
      const evaluatorMap = new Map(evaluators.map((u) => [u.id, u]));
      
      mentorship.evaluations = mentorship.evaluations.map((evaluation: any) => ({
        ...evaluation,
        evaluator: evaluatorMap.get(evaluation.evaluatorId) || null,
      }));
    }

    return mentorship;
  }

  async updateMentorship(id: string, data: any) {
    return this.prisma.mentorship.update({
      where: { id },
      data,
      include: {
        mentor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        mentee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async generateCertificate(mentorshipId: string) {
    const mentorship = await this.prisma.mentorship.findUnique({
      where: { id: mentorshipId },
      include: {
        certificate: true,
      },
    });

    if (!mentorship) {
      throw new NotFoundException('Mentorship not found');
    }

    if (mentorship.status !== 'COMPLETED') {
      throw new BadRequestException('Mentorship must be completed to generate certificate');
    }

    if (mentorship.certificate) {
      throw new BadRequestException('Certificate already exists for this mentorship');
    }

    // Generate certificate number
    const certificateNumber = `CERT-${Date.now()}-${mentorshipId.slice(0, 8).toUpperCase()}`;

    // Create certificate
    const certificate = await this.prisma.certificate.create({
      data: {
        mentorshipId,
        certificateNumber,
      },
    });

    // Link certificate to mentorship
    await this.prisma.mentorship.update({
      where: { id: mentorshipId },
      data: {
        certificateId: certificate.id,
      },
    });

    return certificate;
  }

  // Notification Management
  async getAllNotifications(page = 1, limit = 20, type?: string, unreadOnly?: boolean) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (type) where.type = type;
    if (unreadOnly) where.isRead = false;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createNotification(data: {
    userId: string;
    title: string;
    message: string;
    type: string;
    link?: string;
    eventId?: string;
    clubId?: string;
    mentorshipId?: string;
    badgeId?: string;
  }) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type as NotificationType,
        link: data.link,
        eventId: data.eventId,
        clubId: data.clubId,
        mentorshipId: data.mentorshipId,
        badgeId: data.badgeId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async sendSystemNotification(data: {
    title: string;
    message: string;
    type: string;
    link?: string;
  }) {
    // Get all active users
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    // Create notifications for all users
    const notifications = users.map((user) => ({
      userId: user.id,
      title: data.title,
      message: data.message,
      type: data.type as NotificationType,
      link: data.link,
    }));

    await this.prisma.notification.createMany({
      data: notifications,
    });

    return { sent: notifications.length };
  }

  // Mentor Management
  async getAllMentors() {
    return this.prisma.mentorProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
            skills: true,
            occupation: true,
            location: true,
            education: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getMentorById(userId: string) {
    const mentor = await this.prisma.mentorProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            profileImage: true,
            bio: true,
            skills: true,
            interests: true,
            education: true,
            occupation: true,
            location: true,
            points: true,
            createdAt: true,
          },
        },
      },
    });

    if (!mentor) {
      throw new NotFoundException('Mentor profile not found');
    }

    // Get mentorships separately
    const mentorships = await this.prisma.mentorship.findMany({
      where: { mentorId: userId },
      include: {
        mentee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
          },
        },
        cycle: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      ...mentor,
      mentorships,
    };
  }

  async verifyMentor(userId: string, isVerified: boolean) {
    return this.prisma.mentorProfile.update({
      where: { userId },
      data: { isVerified },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  // Mentee Management
  async getAllClubManagers() {
    return this.prisma.clubManager.findMany({
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
            phone: true,
            occupation: true,
          },
        },
        club: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });
  }

  async getAllMentees() {
    return this.prisma.menteeProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
            skills: true,
            interests: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getMenteeById(userId: string) {
    const mentee = await this.prisma.menteeProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            profileImage: true,
            bio: true,
            skills: true,
            interests: true,
            education: true,
            occupation: true,
            location: true,
            points: true,
            createdAt: true,
          },
        },
      },
    });

    if (!mentee) {
      throw new NotFoundException('Mentee profile not found');
    }

    // Get mentorships separately with sessions and progress
    const mentorships = await this.prisma.mentorship.findMany({
      where: { menteeId: userId },
      include: {
        mentor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
            phone: true,
          },
        },
        sessions: {
          orderBy: { scheduledDate: 'desc' },
        },
        progress: {
          orderBy: { week: 'desc' },
          select: {
            week: true,
            tasksCompleted: true,
            totalTasks: true,
            engagementScore: true,
            skillImprovement: true,
          },
        },
        cycle: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      ...mentee,
      mentorships,
    };
  }

  // Messages Management
  async getAllMessages(
    page = 1,
    limit = 50,
    search?: string,
    senderId?: string,
    receiverId?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      // Note: We can't search encrypted content directly
      // Search by sender/receiver names instead
      where.OR = [
        {
          sender: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
        {
          receiver: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    if (senderId) {
      where.senderId = senderId;
    }

    if (receiverId) {
      where.receiverId = receiverId;
    }

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImage: true,
              role: true,
            },
          },
          receiver: {
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
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.message.count({ where }),
    ]);

    // Decrypt message content for admin view
    const decryptedMessages = messages.map((message) => ({
      ...message,
      content: this.encryptionService.decrypt(message.content),
    }));

    return {
      messages: decryptedMessages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMessagesByUser(userId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
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
              email: true,
              profileImage: true,
              role: true,
            },
          },
          receiver: {
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
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.message.count({
        where: {
          OR: [
            { senderId: userId },
            { receiverId: userId },
          ],
        },
      }),
    ]);

    // Decrypt message content
    const decryptedMessages = messages.map((message) => ({
      ...message,
      content: this.encryptionService.decrypt(message.content),
    }));

    return {
      messages: decryptedMessages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMessageStats() {
    const [total, unread, today, thisWeek] = await Promise.all([
      this.prisma.message.count(),
      this.prisma.message.count({ where: { isRead: false } }),
      this.prisma.message.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      this.prisma.message.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      total,
      unread,
      today,
      thisWeek,
    };
  }

  async deleteMessage(messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return this.prisma.message.delete({
      where: { id: messageId },
    });
  }

  // Posts Management
  async getAllPosts(
    page = 1,
    limit = 50,
    search?: string,
    userId?: string,
    clubId?: string,
    isDeleted?: boolean,
    isHidden?: boolean,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.content = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (userId) {
      where.userId = userId;
    }

    if (clubId) {
      where.clubId = clubId;
    }

    if (isDeleted !== undefined) {
      where.isDeleted = isDeleted;
    }

    if (isHidden !== undefined) {
      where.isHidden = isHidden;
    }

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: {
          author: {
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
              category: true,
            },
          },
          parentPost: {
            select: {
              id: true,
              content: true,
              author: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          _count: {
            select: {
              reactions: true,
              comments: true,
              replies: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPostStats() {
    const [total, deleted, hidden, today, thisWeek] = await Promise.all([
      this.prisma.post.count(),
      this.prisma.post.count({ where: { isDeleted: true } }),
      this.prisma.post.count({ where: { isHidden: true } }),
      this.prisma.post.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      this.prisma.post.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      total,
      deleted,
      hidden,
      today,
      thisWeek,
      active: total - deleted - hidden,
    };
  }

  async deletePost(postId: string, adminId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Soft delete - mark as deleted
    const deletedPost = await this.prisma.post.update({
      where: { id: postId },
      data: { isDeleted: true },
    });

    // Log the action
    await this.logAudit({
      adminId,
      userId: post.userId,
      action: 'DELETE_POST',
      entity: 'POST',
      entityId: postId,
      metadata: { postContent: post.content.substring(0, 100) },
    });

    return deletedPost;
  }

  async hidePost(postId: string, adminId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const hiddenPost = await this.prisma.post.update({
      where: { id: postId },
      data: { isHidden: true },
    });

    // Log the action
    await this.logAudit({
      adminId,
      userId: post.userId,
      action: 'HIDE_POST',
      entity: 'POST',
      entityId: postId,
      metadata: { postContent: post.content.substring(0, 100) },
    });

    return hiddenPost;
  }

  async unhidePost(postId: string, adminId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const unhiddenPost = await this.prisma.post.update({
      where: { id: postId },
      data: { isHidden: false },
    });

    // Log the action
    await this.logAudit({
      adminId,
      userId: post.userId,
      action: 'UNHIDE_POST',
      entity: 'POST',
      entityId: postId,
    });

    return unhiddenPost;
  }

  async restorePost(postId: string, adminId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const restoredPost = await this.prisma.post.update({
      where: { id: postId },
      data: { isDeleted: false },
    });

    // Log the action
    await this.logAudit({
      adminId,
      userId: post.userId,
      action: 'RESTORE_POST',
      entity: 'POST',
      entityId: postId,
    });

    return restoredPost;
  }

  async permanentlyDeletePost(postId: string, adminId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Log before deletion
    await this.logAudit({
      adminId,
      userId: post.userId,
      action: 'PERMANENTLY_DELETE_POST',
      entity: 'POST',
      entityId: postId,
      metadata: { postContent: post.content.substring(0, 100) },
    });

    // Permanently delete
    return this.prisma.post.delete({
      where: { id: postId },
    });
  }

  // ==================== STUDENT MANAGEMENT ====================

  async getAllStudents(
    page = 1,
    limit = 20,
    search?: string,
    educationLevel?: string,
    status?: string,
    sortBy = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    const skip = (page - 1) * limit;
    const where: any = {
      isStudent: true,
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { schoolName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (educationLevel) {
      where.educationLevel = educationLevel;
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    const [students, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          studentProfile: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      students,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStudentById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        studentProfile: true,
        studentGoals: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        scholarshipApplications: {
          include: {
            scholarship: true,
          },
        },
        studyGroupMembers: {
          include: {
            studyGroup: true,
          },
        },
        courses: {
          include: {
            grades: {
              orderBy: { gradedAt: 'desc' },
            },
            assignments: {
              orderBy: { dueDate: 'asc' },
              take: 10,
            },
            _count: {
              select: {
                grades: true,
                assignments: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        assignments: {
          include: {
            course: {
              select: {
                id: true,
                courseCode: true,
                courseName: true,
              },
            },
          },
          orderBy: { dueDate: 'asc' },
          take: 20,
        },
        studySessions: {
          include: {
            course: {
              select: {
                id: true,
                courseCode: true,
                courseName: true,
              },
            },
          },
          orderBy: { startTime: 'desc' },
          take: 20,
        },
        academicCalendarEvents: {
          where: {
            isSystem: false,
          },
          orderBy: { startDate: 'asc' },
          take: 20,
        },
        _count: {
          select: {
            clubs: true,
            userBadges: true,
          },
        },
      },
    });
  }

  // Scholarships Management
  async getAllScholarships(
    page = 1,
    limit = 20,
    search?: string,
    level?: string,
    isActive?: boolean,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { provider: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (level) {
      where.level = level;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [scholarships, total] = await Promise.all([
      this.prisma.scholarship.findMany({
        where,
        skip,
        take: limit,
        orderBy: { deadline: 'asc' },
        include: {
          _count: {
            select: {
              applications: true,
            },
          },
        },
      }),
      this.prisma.scholarship.count({ where }),
    ]);

    return {
      scholarships,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createScholarship(data: {
    title: string;
    description: string;
    provider: string;
    amount?: string;
    eligibility: string[];
    requirements: string[];
    deadline: Date;
    applicationUrl?: string;
    category?: string;
    level?: string;
  }) {
    return this.prisma.scholarship.create({
      data: {
        ...data,
        level: data.level as any,
      },
    });
  }

  async updateScholarship(id: string, data: Partial<{
    title: string;
    description: string;
    provider: string;
    amount: string;
    eligibility: string[];
    requirements: string[];
    deadline: Date;
    applicationUrl: string;
    category: string;
    level: string;
    isActive: boolean;
  }>) {
    return this.prisma.scholarship.update({
      where: { id },
      data: {
        ...data,
        level: data.level as any,
      },
    });
  }

  async deleteScholarship(id: string) {
    return this.prisma.scholarship.delete({
      where: { id },
    });
  }

  async getScholarshipApplications(
    page = 1,
    limit = 20,
    scholarshipId?: string,
    status?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (scholarshipId) {
      where.scholarshipId = scholarshipId;
    }

    if (status) {
      where.status = status;
    }

    const [applications, total] = await Promise.all([
      this.prisma.scholarshipApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { submittedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImage: true,
            },
          },
          scholarship: true,
        },
      }),
      this.prisma.scholarshipApplication.count({ where }),
    ]);

    return {
      applications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateApplicationStatus(id: string, status: string) {
    return this.prisma.scholarshipApplication.update({
      where: { id },
      data: { status: status as any },
    });
  }

  // Study Groups Management
  async getAllStudyGroups(
    page = 1,
    limit = 20,
    search?: string,
    level?: string,
    subject?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (level) {
      where.level = level;
    }

    if (subject) {
      where.subject = { contains: subject, mode: 'insensitive' };
    }

    const [groups, total] = await Promise.all([
      this.prisma.studyGroup.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              members: true,
            },
          },
          members: {
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
            take: 5,
          },
        },
      }),
      this.prisma.studyGroup.count({ where }),
    ]);

    return {
      groups,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createStudyGroup(data: {
    name: string;
    description: string;
    subject: string;
    level: string;
    maxMembers?: number;
    isActive?: boolean;
    createdBy: string; // User ID who will be the leader
  }) {
    // Verify the user exists
    const user = await this.prisma.user.findUnique({
      where: { id: data.createdBy },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const studyGroup = await this.prisma.studyGroup.create({
      data: {
        name: data.name,
        description: data.description,
        subject: data.subject,
        level: data.level as any,
        maxMembers: data.maxMembers || 10,
        isActive: data.isActive !== false,
        createdBy: data.createdBy,
      },
    });

    // Add creator as leader
    await this.prisma.studyGroupMember.create({
      data: {
        studyGroupId: studyGroup.id,
        userId: data.createdBy,
        role: 'LEADER',
      },
    });

    // Return the full study group with members
    return this.getStudyGroupById(studyGroup.id);
  }

  async getStudyGroupById(id: string) {
    const studyGroup = await this.prisma.studyGroup.findUnique({
      where: { id },
      include: {
        members: {
          select: {
            id: true,
            userId: true,
            role: true,
            joinedAt: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                profileImage: true,
                educationLevel: true,
                schoolName: true,
              },
            },
          },
          orderBy: [
            { role: 'asc' }, // Leaders first
            { joinedAt: 'asc' },
          ],
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!studyGroup) {
      throw new NotFoundException('Study group not found');
    }

    return studyGroup;
  }

  async updateStudyGroup(id: string, data: {
    name?: string;
    description?: string;
    subject?: string;
    level?: string;
    maxMembers?: number;
    isActive?: boolean;
  }) {
    const studyGroup = await this.getStudyGroupById(id);

    // If updating maxMembers, ensure it's not less than current member count
    if (data.maxMembers !== undefined && data.maxMembers < studyGroup.members.length) {
      throw new BadRequestException(`Cannot set max members to ${data.maxMembers}. Group currently has ${studyGroup.members.length} members.`);
    }

    return this.prisma.studyGroup.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description && { description: data.description }),
        ...(data.subject && { subject: data.subject }),
        ...(data.level && { level: data.level as any }),
        ...(data.maxMembers && { maxMembers: data.maxMembers }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                profileImage: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });
  }

  async removeMemberFromStudyGroup(studyGroupId: string, userId: string) {
    const member = await this.prisma.studyGroupMember.findUnique({
      where: {
        studyGroupId_userId: {
          studyGroupId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this study group');
    }

    // Don't allow removing the leader if there are other members
    if (member.role === 'LEADER') {
      const studyGroup = await this.getStudyGroupById(studyGroupId);
      if (studyGroup.members.length > 1) {
        throw new BadRequestException('Cannot remove leader while group has other members. Delete the group instead.');
      }
    }

    return this.prisma.studyGroupMember.delete({
      where: {
        id: member.id,
      },
    });
  }

  async deleteStudyGroup(id: string) {
    // Delete all members first
    await this.prisma.studyGroupMember.deleteMany({
      where: { studyGroupId: id },
    });

    return this.prisma.studyGroup.delete({
      where: { id },
    });
  }

  async cancelStudyGroupMeetup(meetupId: string) {
    const meetup = await this.prisma.studyGroupMeetup.findUnique({
      where: { id: meetupId },
    });

    if (!meetup) {
      throw new NotFoundException('Meetup not found');
    }

    return this.prisma.studyGroupMeetup.update({
      where: { id: meetupId },
      data: {
        isCancelled: true,
        cancelledAt: new Date(),
      },
    });
  }

  // Academic Resources Management
  async getAllResources(
    page = 1,
    limit = 20,
    search?: string,
    type?: string,
    level?: string,
    subject?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (level) {
      where.level = level;
    }

    if (subject) {
      where.subject = { contains: subject, mode: 'insensitive' };
    }

    const [resources, total] = await Promise.all([
      this.prisma.academicResource.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.academicResource.count({ where }),
    ]);

    return {
      resources,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createResource(data: {
    title: string;
    description: string;
    type: string;
    subject?: string;
    level?: string;
    url?: string;
    fileUrl?: string;
    tags?: string[];
  }) {
    return this.prisma.academicResource.create({
      data: {
        ...data,
        type: data.type as any,
        level: data.level as any,
      },
    });
  }

  async updateResource(id: string, data: Partial<{
    title: string;
    description: string;
    type: string;
    subject: string;
    level: string;
    url: string;
    fileUrl: string;
    tags: string[];
    isActive: boolean;
  }>) {
    return this.prisma.academicResource.update({
      where: { id },
      data: {
        ...data,
        type: data.type as any,
        level: data.level as any,
      },
    });
  }

  async getResourceById(id: string) {
    const resource = await this.prisma.academicResource.findUnique({
      where: { id },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    return resource;
  }

  async deleteResource(id: string) {
    return this.prisma.academicResource.delete({
      where: { id },
    });
  }

  // Student Statistics
  async getStudentStats() {
    const [
      totalStudents,
      secondaryStudents,
      tvetStudents,
      universityStudents,
      outOfSchoolStudents,
      totalScholarships,
      activeScholarships,
      totalStudyGroups,
      activeStudyGroups,
      totalResources,
      totalApplications,
    ] = await Promise.all([
      this.prisma.user.count({ where: { isStudent: true } }),
      this.prisma.user.count({ where: { isStudent: true, educationLevel: 'SECONDARY' as any } }),
      this.prisma.user.count({ where: { isStudent: true, educationLevel: 'TVET' as any } }),
      this.prisma.user.count({ where: { isStudent: true, educationLevel: 'UNIVERSITY' as any } }),
      this.prisma.user.count({ where: { isStudent: true, educationLevel: 'OUT_OF_SCHOOL' as any } }),
      this.prisma.scholarship.count(),
      this.prisma.scholarship.count({ where: { isActive: true } }),
      this.prisma.studyGroup.count(),
      this.prisma.studyGroup.count({ where: { isActive: true } }),
      this.prisma.academicResource.count({ where: { isActive: true } }),
      this.prisma.scholarshipApplication.count(),
    ]);

    return {
      students: {
        total: totalStudents,
        secondary: secondaryStudents,
        tvet: tvetStudents,
        university: universityStudents,
        outOfSchool: outOfSchoolStudents,
      },
      scholarships: {
        total: totalScholarships,
        active: activeScholarships,
      },
      studyGroups: {
        total: totalStudyGroups,
        active: activeStudyGroups,
      },
      resources: {
        total: totalResources,
      },
      applications: {
        total: totalApplications,
      },
    };
  }

  async exportStudents(educationLevel?: string) {
    const where: any = { isStudent: true };
    if (educationLevel) {
      where.educationLevel = educationLevel;
    }

    const students = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        location: true,
        educationLevel: true,
        schoolName: true,
        grade: true,
        yearOfStudy: true,
        major: true,
        studentId: true,
        createdAt: true,
        studentProfile: {
          select: {
            gpa: true,
            achievements: true,
            extracurriculars: true,
            careerGoals: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const csvRows = [
      [
        'ID',
        'Email',
        'First Name',
        'Last Name',
        'Phone',
        'Location',
        'Education Level',
        'School Name',
        'Grade',
        'Year of Study',
        'Major',
        'Student ID',
        'GPA',
        'Achievements',
        'Extracurriculars',
        'Career Goals',
        'Created At',
      ],
      ...students.map((student) => [
        student.id,
        student.email,
        student.firstName,
        student.lastName,
        student.phone || '',
        student.location || '',
        student.educationLevel || '',
        student.schoolName || '',
        student.grade || '',
        student.yearOfStudy?.toString() || '',
        student.major || '',
        student.studentId || '',
        student.studentProfile?.gpa?.toString() || '',
        student.studentProfile?.achievements.join('; ') || '',
        student.studentProfile?.extracurriculars.join('; ') || '',
        student.studentProfile?.careerGoals || '',
        student.createdAt.toISOString(),
      ]),
    ];

    return csvRows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  // Get trend data for charts
  async getTrendData(days: number = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Generate date range
    const dates: Date[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }

    // Get user registrations per day
    const userTrends = await Promise.all(
      dates.map(async (date) => {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const count = await this.prisma.user.count({
          where: {
            createdAt: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
        });

        return {
          date: dayStart.toISOString().split('T')[0],
          users: count,
        };
      })
    );

    // Get events created per day
    const eventTrends = await Promise.all(
      dates.map(async (date) => {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const count = await this.prisma.event.count({
          where: {
            createdAt: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
        });

        return {
          date: dayStart.toISOString().split('T')[0],
          events: count,
        };
      })
    );

    // Get posts created per day
    const postTrends = await Promise.all(
      dates.map(async (date) => {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const count = await this.prisma.post.count({
          where: {
            createdAt: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
        });

        return {
          date: dayStart.toISOString().split('T')[0],
          posts: count,
        };
      })
    );

    // Combine trends
    const trends = dates.map((date, index) => {
      const dateStr = date.toISOString().split('T')[0];
      return {
        date: dateStr,
        users: userTrends[index].users,
        events: eventTrends[index].events,
        posts: postTrends[index].posts,
      };
    });

    return { trends };
  }

  // Get recent activity feed
  async getRecentActivity(limit: number = 20) {
    const activities: any[] = [];

    // Recent users
    const recentUsers = await this.prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true,
        profileImage: true,
      },
    });

    recentUsers.forEach((user) => {
      activities.push({
        type: 'user_registered',
        title: `${user.firstName} ${user.lastName} joined`,
        description: `New ${user.role.toLowerCase()} registered`,
        timestamp: user.createdAt,
        user: {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          image: user.profileImage,
        },
      });
    });

    // Recent events
    const recentEvents = await this.prisma.event.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        organizer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    recentEvents.forEach((event) => {
      activities.push({
        type: 'event_created',
        title: `New event: ${event.title}`,
        description: `Created by ${event.organizer?.firstName} ${event.organizer?.lastName}`,
        timestamp: event.createdAt,
        eventId: event.id,
      });
    });

    // Recent posts
    const recentPosts = await this.prisma.post.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
    });

    recentPosts.forEach((post) => {
      activities.push({
        type: 'post_created',
        title: `New post by ${post.author.firstName} ${post.author.lastName}`,
        description: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : ''),
        timestamp: post.createdAt,
        postId: post.id,
        user: {
          id: post.author.id,
          name: `${post.author.firstName} ${post.author.lastName}`,
          image: post.author.profileImage,
        },
      });
    });

    // Recent clubs
    const recentClubs = await this.prisma.club.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        createdAt: true,
        createdBy: true,
        creator: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    recentClubs.forEach((club) => {
      activities.push({
        type: 'club_created',
        title: `New club: ${club.name}`,
        description: `Created by ${club.creator?.firstName} ${club.creator?.lastName}`,
        timestamp: club.createdAt,
        clubId: club.id,
      });
    });

    // Sort by timestamp and limit
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return activities.slice(0, limit);
  }

  // ==================== MENTORSHIP AUTOMATION ====================

  // Cycle Management
  async createMentorshipCycle(data: {
    name: string;
    description?: string;
    benefits?: string;
    expectedOutcomes?: string;
    requirements?: string;
    targetGroup?: string;
    conditions?: string;
    startDate: string;
    endDate: string;
    maxMentorships?: number;
  }) {
    const created = await this.mentorshipService.createCycle(data);

    // Notify mentors/mentees that a new cycle is available (UPCOMING).
    // Keep it one-time and informational; launch notifications are handled separately.
    try {
      const [mentors, mentees] = await Promise.all([
        this.prisma.user.findMany({
          where: { isActive: true, role: { in: ['MENTOR', 'SUPER_ADMIN', 'MENTORSHIP_ADMIN'] as any } },
          select: { id: true },
        }),
        this.prisma.user.findMany({
          where: { isActive: true, role: { in: ['MENTEE', 'STUDENT', 'MEMBER'] as any } },
          select: { id: true },
        }),
      ]);

      const recipients = new Map<string, true>();
      mentors.forEach((u) => recipients.set(u.id, true));
      mentees.forEach((u) => recipients.set(u.id, true));

      await Promise.all(
        Array.from(recipients.keys()).map((userId) =>
          this.notificationsService.createAndSend(userId, {
            title: `New mentorship cycle: ${created.name}`,
            message:
              'A new mentorship cycle is available. Open the cycle to view details and tap “I’m interested” to enroll/inquire.',
            type: NotificationType.SYSTEM_ANNOUNCEMENT,
            link: `/mentorship/cycles/${created.id}`,
          }),
        ),
      );
    } catch (e) {
      // Do not block cycle creation if push fails
      // eslint-disable-next-line no-console
      console.error('Cycle created but notifications failed:', e);
    }

    return created;
  }

  async getAllMentorshipCycles() {
    return this.mentorshipService.getCycles();
  }

  async getMentorshipCycleById(id: string) {
    return this.mentorshipService.getCycleById(id);
  }

  async getAvailableMentorsAndMentees(cycleId?: string) {
    // Get all mentors with active profiles
    const mentorProfiles = await this.prisma.mentorProfile.findMany({
      where: {
        isActive: true,
        isVerified: true, // Only verified mentors for assignment
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
          },
        },
      },
    });

    // Get all mentees with active profiles
    const menteeProfiles = await this.prisma.menteeProfile.findMany({
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
          },
        },
      },
    });

    // Track which users already have profiles
    const mentorUserIds = new Set(mentorProfiles.map((m) => m.userId));
    const menteeUserIds = new Set(menteeProfiles.map((m) => m.userId));

    // Start with existing profiles
    const mentors = [...mentorProfiles];
    const mentees = [...menteeProfiles];
    let interestedUserIds: Set<string> = new Set();

    // If cycleId provided, also get users who expressed interest (even without full profiles)
    if (cycleId) {
      const interests = await this.prisma.mentorshipCycleInterest.findMany({
        where: {
          cycleId,
          status: 'INTERESTED',
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImage: true,
            },
          },
        },
      });

      // Add interested users who don't have profiles yet
      interests.forEach((interest) => {
        interestedUserIds.add(interest.userId);
        
        if (interest.role === 'MENTOR') {
          // Add to mentors if not already there
          if (!mentorUserIds.has(interest.userId)) {
            mentors.push({
              id: interest.userId,
              userId: interest.userId,
              isActive: true,
              isVerified: false,
              user: interest.user,
              _isInterestedOnly: true,
            } as any);
          }
        } else {
          // Default to MENTEE if role is MENTEE or undefined/null
          // Add to mentees if not already there
          if (!menteeUserIds.has(interest.userId)) {
            mentees.push({
              id: interest.userId,
              userId: interest.userId,
              isActive: true,
              user: interest.user,
              _isInterestedOnly: true,
            } as any);
          }
        }
      });
    }

    return {
      mentors: mentors.map((m) => ({
        id: m.userId,
        userId: m.userId,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        email: m.user.email,
        profileImage: m.user.profileImage,
        hasProfile: !(m as any)._isInterestedOnly, // Real profile if not interest-only
        isVerified: m.isVerified ?? false,
        hasExpressedInterest: cycleId ? interestedUserIds.has(m.userId) : false,
      })),
      mentees: mentees.map((m) => ({
        id: m.userId,
        userId: m.userId,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        email: m.user.email,
        profileImage: m.user.profileImage,
        hasProfile: !(m as any)._isInterestedOnly, // Real profile if not interest-only
        hasExpressedInterest: cycleId ? interestedUserIds.has(m.userId) : false,
      })),
    };
  }

  async manualAssignMentorshipToCycle(cycleId: string, mentorId: string, menteeId: string) {
    return this.mentorshipService.manualAssignMentorship(cycleId, mentorId, menteeId);
  }

  async launchMentorshipCycle(cycleId: string, adminId: string) {
    const cycle = await this.prisma.mentorshipCycle.findUnique({
      where: { id: cycleId },
    });

    if (!cycle) {
      throw new NotFoundException('Cycle not found');
    }

    // Update cycle status to ACTIVE
    const updatedCycle = await this.prisma.mentorshipCycle.update({
      where: { id: cycleId },
      data: { status: 'ACTIVE' },
    });

    // Get all active mentors and mentees
    const [mentors, mentees] = await Promise.all([
      this.prisma.mentorProfile.findMany({
        where: { isActive: true, isVerified: true },
        include: { user: true },
      }),
      this.prisma.menteeProfile.findMany({
        where: { isActive: true },
        include: { user: true },
      }),
    ]);

    // Send announcement notifications
    const notifications = [];
    for (const mentor of mentors) {
      notifications.push(
        this.notificationsService.createAndSend(mentor.userId, {
          title: `New Mentorship Cycle: ${cycle.name}`,
          message: `The ${cycle.name} mentorship cycle has been launched! Check your matches.`,
          type: NotificationType.SYSTEM_ANNOUNCEMENT,
          link: `/mentorship/cycles/${cycleId}`,
        }),
      );
    }

    for (const mentee of mentees) {
      notifications.push(
        this.notificationsService.createAndSend(mentee.userId, {
          title: `New Mentorship Cycle: ${cycle.name}`,
          message: `The ${cycle.name} mentorship cycle has been launched! Apply now to find your mentor.`,
          type: NotificationType.SYSTEM_ANNOUNCEMENT,
          link: `/mentorship/cycles/${cycleId}`,
        }),
      );
    }

    await Promise.all(notifications);

    return {
      cycle: updatedCycle,
      mentorsNotified: mentors.length,
      menteesNotified: mentees.length,
    };
  }

  // Program Announcements
  async createProgramAnnouncement(data: {
    title: string;
    message: string;
    targetAudience: 'ALL' | 'MENTORS' | 'MENTEES' | 'ACTIVE_MENTORSHIPS';
    cycleId?: string;
    sendImmediately?: boolean;
  }) {
    let targetUsers: any[] = [];

    if (data.targetAudience === 'ALL') {
      const [mentors, mentees] = await Promise.all([
        this.prisma.mentorProfile.findMany({
          where: { isActive: true },
          include: { user: true },
        }),
        this.prisma.menteeProfile.findMany({
          where: { isActive: true },
          include: { user: true },
        }),
      ]);
      targetUsers = [...mentors.map((m) => m.user), ...mentees.map((m) => m.user)];
    } else if (data.targetAudience === 'MENTORS') {
      const mentors = await this.prisma.mentorProfile.findMany({
        where: { isActive: true },
        include: { user: true },
      });
      targetUsers = mentors.map((m) => m.user);
    } else if (data.targetAudience === 'MENTEES') {
      const mentees = await this.prisma.menteeProfile.findMany({
        where: { isActive: true },
        include: { user: true },
      });
      targetUsers = mentees.map((m) => m.user);
    } else if (data.targetAudience === 'ACTIVE_MENTORSHIPS') {
      const mentorships = await this.prisma.mentorship.findMany({
        where: { status: 'ACTIVE' },
        include: {
          mentor: true,
          mentee: true,
        },
      });
      targetUsers = [
        ...mentorships.map((m) => m.mentor),
        ...mentorships.map((m) => m.mentee),
      ];
      // Remove duplicates
      targetUsers = targetUsers.filter(
        (user, index, self) => index === self.findIndex((u) => u.id === user.id),
      );
    }

    const notifications = targetUsers.map((user) =>
      this.notificationsService.createAndSend(user.id, {
        title: data.title,
        message: data.message,
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        link: data.cycleId ? `/mentorship/cycles/${data.cycleId}` : '/mentorship',
        mentorshipId: data.cycleId,
      }),
    );

    if (data.sendImmediately) {
      await Promise.all(notifications);
    }

    return {
      announcement: {
        title: data.title,
        message: data.message,
        targetAudience: data.targetAudience,
        cycleId: data.cycleId,
      },
      recipientsCount: targetUsers.length,
      sent: data.sendImmediately || false,
    };
  }

  // Automated Matching
  async runAutomatedMatching(cycleId: string, minScore = 70, autoApprove = false) {
    const cycle = await this.prisma.mentorshipCycle.findUnique({
      where: { id: cycleId },
    });

    if (!cycle) {
      throw new NotFoundException('Cycle not found');
    }

    // Get all active mentees
    const mentees = await this.prisma.menteeProfile.findMany({
      where: { isActive: true },
      include: { user: true },
    });

    // Get all available mentors (not at max capacity)
    const mentors = await this.prisma.mentorProfile.findMany({
      where: {
        isActive: true,
        isVerified: true,
      },
      include: { user: true },
    });

    const matches = [];
    const matchRecords = [];

    for (const mentee of mentees) {
      const menteeMatches = [];
      for (const mentor of mentors) {
        // Check if mentor has capacity
        if (mentor.currentMentees >= mentor.maxMentees) {
          continue;
        }

        // Check if match already exists
        const existingMatch = await this.prisma.mentorshipMatch.findFirst({
          where: {
            mentorId: mentor.userId,
            menteeId: mentee.userId,
            cycleId,
          },
        });

        if (existingMatch) {
          continue;
        }

        // Calculate match score
        const matchScore = await this.mentorshipService.calculateMatchScore(
          mentor.userId,
          mentee.userId,
          cycleId,
        );

        if (matchScore.matchScore >= minScore) {
          menteeMatches.push({
            mentor,
            mentee,
            matchScore,
          });
        }
      }

      // Sort by match score and take top match
      if (menteeMatches.length > 0) {
        const bestMatch = menteeMatches.sort(
          (a, b) => b.matchScore.matchScore - a.matchScore.matchScore,
        )[0];

        // Create match record
        const matchRecord = await this.prisma.mentorshipMatch.create({
          data: {
            mentorId: bestMatch.mentor.userId,
            menteeId: bestMatch.mentee.userId,
            cycleId,
            matchScore: bestMatch.matchScore.matchScore,
            skillMatch: bestMatch.matchScore.skillMatch,
            industryRelevance: bestMatch.matchScore.industryRelevance,
            availabilityMatch: bestMatch.matchScore.availabilityMatch,
            communicationMatch: bestMatch.matchScore.communicationMatch,
            personalityFit: bestMatch.matchScore.personalityFit,
            status: autoApprove ? MatchStatus.AUTO_MATCHED : MatchStatus.PENDING,
            mentorApproved: autoApprove,
            menteeApproved: autoApprove,
            matchedAt: autoApprove ? new Date() : null,
          },
          include: {
            mentor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            mentee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        });

        matchRecords.push(matchRecord);

        // If auto-approve, create mentorship
        if (autoApprove) {
          await this.mentorshipService.createMentorshipFromMatch(matchRecord.id);

          // Notify both parties
          await Promise.all([
            this.notificationsService.createAndSend(bestMatch.mentor.userId, {
              title: 'New Mentorship Match',
              message: `You've been matched with ${bestMatch.mentee.user.firstName} ${bestMatch.mentee.user.lastName}`,
              type: NotificationType.MENTORSHIP_REQUEST,
              link: `/mentorship/matches/${matchRecord.id}`,
            }),
            this.notificationsService.createAndSend(bestMatch.mentee.userId, {
              title: 'New Mentorship Match',
              message: `You've been matched with ${bestMatch.mentor.user.firstName} ${bestMatch.mentor.user.lastName}`,
              type: NotificationType.MENTORSHIP_REQUEST,
              link: `/mentorship/matches/${matchRecord.id}`,
            }),
          ]);
        } else {
          // Notify for approval
          await Promise.all([
            this.notificationsService.createAndSend(bestMatch.mentor.userId, {
              title: 'Mentorship Match Request',
              message: `You have a new mentorship match request with ${bestMatch.mentee.user.firstName} ${bestMatch.mentee.user.lastName}`,
              type: NotificationType.MENTORSHIP_REQUEST,
              link: `/mentorship/matches/${matchRecord.id}`,
            }),
            this.notificationsService.createAndSend(bestMatch.mentee.userId, {
              title: 'Mentorship Match Request',
              message: `You have a new mentorship match request with ${bestMatch.mentor.user.firstName} ${bestMatch.mentor.user.lastName}`,
              type: NotificationType.MENTORSHIP_REQUEST,
              link: `/mentorship/matches/${matchRecord.id}`,
            }),
          ]);
        }
      }
    }

    return {
      cycleId,
      matchesCreated: matchRecords.length,
      autoApproved: autoApprove,
      matches: matchRecords,
    };
  }

  async approveMatches(matchIds: string[]) {
    const matches = await this.prisma.mentorshipMatch.findMany({
      where: { id: { in: matchIds } },
      include: {
        mentor: true,
        mentee: true,
      },
    });

    const results = [];
    for (const match of matches) {
      // Update match to approved
      await this.prisma.mentorshipMatch.update({
        where: { id: match.id },
        data: {
          status: MatchStatus.APPROVED,
          mentorApproved: true,
          menteeApproved: true,
          matchedAt: new Date(),
        },
      });

      // Create mentorship
      const mentorship = await this.mentorshipService.createMentorshipFromMatch(match.id);

      // Notify both parties
      await Promise.all([
        this.notificationsService.createAndSend(match.mentorId, {
          title: 'Mentorship Approved',
          message: `Your mentorship with ${match.mentee.firstName} ${match.mentee.lastName} has been approved!`,
          type: NotificationType.MENTORSHIP_REQUEST,
          link: `/mentorship/${mentorship.id}`,
        }),
        this.notificationsService.createAndSend(match.menteeId, {
          title: 'Mentorship Approved',
          message: `Your mentorship with ${match.mentor.firstName} ${match.mentor.lastName} has been approved!`,
          type: NotificationType.MENTORSHIP_REQUEST,
          link: `/mentorship/${mentorship.id}`,
        }),
      ]);

      results.push(mentorship);
    }

    return {
      approved: results.length,
      mentorships: results,
    };
  }

  // Onboarding Workflows
  async sendOnboardingNotifications(targetRole: 'MENTOR' | 'MENTEE', cycleId?: string) {
    let users: any[] = [];

    if (targetRole === 'MENTOR') {
      const mentors = await this.prisma.mentorProfile.findMany({
        where: { isActive: true },
        include: { user: true },
      });
      users = mentors.map((m) => m.user);
    } else {
      const mentees = await this.prisma.menteeProfile.findMany({
        where: { isActive: true },
        include: { user: true },
      });
      users = mentees.map((m) => m.user);
    }

    const notifications = users.map((user) =>
      this.notificationsService.createAndSend(user.id, {
        title: 'Welcome to Mentorship Program',
        message: targetRole === 'MENTOR'
          ? 'Complete your mentor profile and start helping mentees achieve their goals!'
          : 'Complete your mentee profile and find the perfect mentor for you!',
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        link: cycleId
          ? `/mentorship/cycles/${cycleId}/onboarding`
          : '/mentorship/onboarding',
      }),
    );

    await Promise.all(notifications);

    return {
      role: targetRole,
      notificationsSent: notifications.length,
    };
  }

  // Progress Tracking
  async getMentorshipProgress(cycleId?: string) {
    const where = cycleId ? { cycleId } : {};

    const [activeMentorships, completedMentorships, totalTasks, completedTasks] =
      await Promise.all([
        this.prisma.mentorship.count({
          where: { ...where, status: 'ACTIVE' },
        }),
        this.prisma.mentorship.count({
          where: { ...where, status: 'COMPLETED' },
        }),
        this.prisma.mentorshipTask.count({
          where: cycleId
            ? {
                mentorship: { cycleId },
              }
            : {},
        }),
        this.prisma.mentorshipTask.count({
          where: {
            status: 'COMPLETED',
            ...(cycleId
              ? {
                  mentorship: { cycleId },
                }
              : {}),
          },
        }),
      ]);

    const avgEngagement = await this.prisma.mentorship.aggregate({
      where: { ...where, status: 'ACTIVE' },
      _avg: {
        engagementScore: true,
      },
    });

    const avgSatisfaction = await this.prisma.mentorship.aggregate({
      where: { ...where, status: 'COMPLETED' },
      _avg: {
        satisfactionScore: true,
      },
    });

    return {
      activeMentorships,
      completedMentorships,
      completionRate: activeMentorships + completedMentorships > 0
        ? (completedMentorships / (activeMentorships + completedMentorships)) * 100
        : 0,
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      },
      avgEngagement: avgEngagement._avg.engagementScore || 0,
      avgSatisfaction: avgSatisfaction._avg.satisfactionScore || 0,
    };
  }

  // Analytics
  async getMentorshipAnalytics(cycleId?: string) {
    const where = cycleId ? { cycleId } : {};

    const [
      totalMentorships,
      activeMentorships,
      completedMentorships,
      cancelledMentorships,
      totalMentors,
      totalMentees,
      totalMatches,
      approvedMatches,
    ] = await Promise.all([
      this.prisma.mentorship.count({ where }),
      this.prisma.mentorship.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.mentorship.count({ where: { ...where, status: 'COMPLETED' } }),
      this.prisma.mentorship.count({ where: { ...where, status: 'CANCELLED' } }),
      this.prisma.mentorProfile.count({ where: { isActive: true } }),
      this.prisma.menteeProfile.count({ where: { isActive: true } }),
      this.prisma.mentorshipMatch.count({ where: cycleId ? { cycleId } : {} }),
      this.prisma.mentorshipMatch.count({
        where: {
          ...(cycleId ? { cycleId } : {}),
          status: 'APPROVED',
        },
      }),
    ]);

    // Get mentorship by status over time (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyStats = await this.prisma.mentorship.groupBy({
      by: ['status'],
      where: {
        ...where,
        createdAt: { gte: sixMonthsAgo },
      },
      _count: true,
    });

    return {
      overview: {
        totalMentorships,
        activeMentorships,
        completedMentorships,
        cancelledMentorships,
        completionRate:
          totalMentorships > 0
            ? (completedMentorships / totalMentorships) * 100
            : 0,
      },
      participants: {
        totalMentors,
        totalMentees,
        totalParticipants: totalMentors + totalMentees,
      },
      matching: {
        totalMatches,
        approvedMatches,
        approvalRate: totalMatches > 0 ? (approvedMatches / totalMatches) * 100 : 0,
      },
      monthlyStats,
    };
  }
}

