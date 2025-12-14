import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, MentorshipStatus, NotificationType } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

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
    };
  }

  // User Management
  async getAllUsers(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

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
          points: true,
          createdAt: true,
          _count: {
            select: {
              clubs: true,
              userBadges: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
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
        clubs: {
          select: {
            id: true,
            name: true,
            category: true,
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
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUser(id: string, data: any) {
    return this.prisma.user.update({
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
  }

  async deleteUser(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  async updateUserRole(id: string, role: UserRole) {
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });
  }

  // Club Management
  async getAllClubs(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [clubs, total] = await Promise.all([
      this.prisma.club.findMany({
        skip,
        take: limit,
        include: {
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
      }),
      this.prisma.club.count(),
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

  async deleteClub(id: string) {
    return this.prisma.club.delete({
      where: { id },
    });
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

  async deleteEvent(id: string) {
    return this.prisma.event.delete({
      where: { id },
    });
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
          },
        },
      },
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

    // Get mentorships separately
    const mentorships = await this.prisma.mentorship.findMany({
      where: { menteeId: userId },
      include: {
        mentor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return {
      ...mentee,
      mentorships,
    };
  }
}

