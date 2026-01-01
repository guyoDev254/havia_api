import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/services/email.service';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async findOne(id: string, currentUserId?: string) {
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
        points: true,
        userBadges: {
          include: {
            badge: {
              select: {
                id: true,
                name: true,
                description: true,
                icon: true,
                image: true,
                type: true,
                points: true,
              },
            },
          },
        },
        clubMemberships: {
          where: {
            isActive: true,
          },
          select: {
            club: {
              select: {
                id: true,
                name: true,
                description: true,
                image: true,
                category: true,
              },
            },
          },
        },
        _count: {
          select: {
            clubMemberships: {
              where: {
                isActive: true,
              },
            },
            userBadges: true,
            attendedEvents: true,
            followers: true,
            following: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if current user is following this user
    let isFollowing = false;
    if (currentUserId && currentUserId !== id) {
      const follow = await this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: id,
          },
        },
      });
      isFollowing = !!follow;
    }

    // Transform clubMemberships to clubs array for frontend compatibility
    const clubs = user.clubMemberships?.map((membership) => membership.club) || [];

    return {
      ...user,
      clubs,
      clubMemberships: undefined, // Remove clubMemberships from response
      _count: {
        ...user._count,
        clubs: user._count?.clubMemberships || 0,
        clubMemberships: undefined, // Remove clubMemberships count from response
      },
      isFollowing,
    };
  }

  async updateProfile(userId: string, updateData: any) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
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
        points: true,
        userBadges: {
          include: {
            badge: {
              select: {
                id: true,
                name: true,
                description: true,
                icon: true,
                image: true,
                type: true,
                points: true,
              },
            },
          },
        },
        clubMemberships: {
          where: {
            isActive: true,
          },
          select: {
            club: {
              select: {
                id: true,
                name: true,
                description: true,
                image: true,
                category: true,
              },
            },
          },
        },
        _count: {
          select: {
            clubMemberships: {
              where: {
                isActive: true,
              },
            },
            userBadges: true,
            attendedEvents: true,
            followers: true,
            following: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    // Transform clubMemberships to clubs array for frontend compatibility
    const clubs = user.clubMemberships?.map((membership) => membership.club) || [];

    return {
      ...user,
      clubs,
      clubMemberships: undefined, // Remove clubMemberships from response
      _count: {
        ...user._count,
        clubs: user._count?.clubMemberships || 0,
        clubMemberships: undefined, // Remove clubMemberships count from response
      },
    };
  }

  async resendVerificationEmail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Update user with OTP
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationOtp: otpCode,
        emailVerificationOtpExpires: otpExpires,
      },
    });

    // Send verification email with OTP
    await this.emailService.sendVerificationEmail(user.email, otpCode, userId, user.firstName, user.lastName);

    return {
      message: 'Verification email sent. Please check your inbox.',
    };
  }

  async deactivateAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Deactivate account
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
      },
    });

    return { message: 'Account deactivated successfully' };
  }

  async verifyEmail(otpCode: string, email?: string) {
    const where: any = {
      emailVerificationOtp: otpCode,
    };

    // If email is provided, also filter by email
    if (email) {
      where.email = email;
    }

    const user = await this.prisma.user.findFirst({
      where,
    });

    if (!user) {
      throw new BadRequestException('Invalid verification code');
    }

    // Check if OTP has expired
    if (user.emailVerificationOtpExpires && new Date() > user.emailVerificationOtpExpires) {
      throw new BadRequestException('Verification code has expired. Please request a new one.');
    }

    // Verify email
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationOtp: null,
        emailVerificationOtpExpires: null,
      },
    });

    return { message: 'Email verified successfully' };
  }

  async searchUsers(query?: string, limit = 20, currentUserId?: string) {
    const where: any = {
      isActive: true,
      role: 'MEMBER', // Only show members, not admins or moderators
    };

    if (query) {
      where.OR = [
        { firstName: { contains: query, mode: 'insensitive' as const } },
        { lastName: { contains: query, mode: 'insensitive' as const } },
        { email: { contains: query, mode: 'insensitive' as const } },
        { occupation: { contains: query, mode: 'insensitive' as const } },
        { skills: { hasSome: [query] } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      take: limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profileImage: true,
        bio: true,
        location: true,
        occupation: true,
        skills: true,
        points: true,
      },
      orderBy: {
        points: 'desc',
      },
    });

    // Check follow status for each user
    if (currentUserId) {
      const userIds = users.map(u => u.id);
      const follows = await this.prisma.follow.findMany({
        where: {
          followerId: currentUserId,
          followingId: { in: userIds },
        },
        select: {
          followingId: true,
        },
      });

      const followingIds = new Set(follows.map(f => f.followingId));
      
      return users.map(user => ({
        ...user,
        isFollowing: followingIds.has(user.id),
      }));
    }

    return users.map(user => ({ ...user, isFollowing: false }));
  }

  async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    const followingUser = await this.prisma.user.findUnique({
      where: { id: followingId },
    });

    if (!followingUser) {
      throw new NotFoundException('User to follow not found');
    }

    // Check if already following
    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (existingFollow) {
      throw new BadRequestException('Already following this user');
    }

    // Create follow relationship
    const follow = await this.prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    });

    // Get follower name for notification
    const followerName = await this.getUserDisplayName(followerId);

    // Create notification
    await this.prisma.notification.create({
      data: {
        userId: followingId,
        title: 'New Follower',
        message: `${followerName} started following you`,
        type: 'FOLLOW',
        link: `/users/${followerId}`,
      },
    });

    return follow;
  }

  async unfollowUser(followerId: string, followingId: string) {
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (!follow) {
      throw new NotFoundException('Not following this user');
    }

    await this.prisma.follow.delete({
      where: {
        id: follow.id,
      },
    });

    return { message: 'Unfollowed successfully' };
  }

  async getFollowers(userId: string, limit: number = 20) {
    return this.prisma.follow.findMany({
      where: { followingId: userId },
      take: limit,
      include: {
        follower: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            occupation: true,
            bio: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getFollowing(userId: string, limit: number = 20) {
    return this.prisma.follow.findMany({
      where: { followerId: userId },
      take: limit,
      include: {
        following: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            occupation: true,
            bio: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });
    return !!follow;
  }

  private async createActivity(userId: string, activityData: any) {
    // This will be implemented when we create the Activity service
    // For now, we'll just return
    return;
  }

  private async getUserDisplayName(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    return user ? `${user.firstName} ${user.lastName}` : 'Someone';
  }
}

