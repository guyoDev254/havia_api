import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClubCategory, ClubType, ClubStatus, ClubRole, MentorshipType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ClubsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async findAll(category?: ClubCategory, limit?: number, status?: ClubStatus, type?: ClubType) {
    try {
      const where: any = {
        isActive: true,
      };

      // Only add filters for fields that exist
      if (category) {
        where.category = category;
      }

      // Note: status and type filters are commented out until all clubs are migrated
      // if (status) {
      //   where.status = status;
      // }
      // if (type) {
      //   where.type = type;
      // }

      return await this.prisma.club.findMany({
        where,
        ...(limit && { take: limit }),
        include: {
          members: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
            },
            take: 5,
          },
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
      });
    } catch (error: any) {
      console.error('Error fetching clubs:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw error;
    }
  }

  async findOne(id: string, userId?: string) {
    const club = await this.prisma.club.findUnique({
      where: { id },
      include: {
        members: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            bio: true,
          },
          take: 10,
        },
        managers: {
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
              },
            },
          },
        },
        events: {
          where: {
            status: 'UPCOMING',
          },
          take: 5,
          orderBy: {
            startDate: 'asc',
          },
        },
        posts: {
          where: {
            isDeleted: false,
          },
          take: 10,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
              },
            },
            _count: {
              select: {
                comments: true,
                reactions: true,
              },
            },
          },
        },
        memberships: userId
          ? {
              where: {
                userId,
              },
              select: {
                role: true,
                joinedAt: true,
              },
            }
          : false,
        _count: {
          select: {
            members: true,
            events: true,
            posts: true,
          },
        },
      },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // Add membership info if user is provided
    const isMember = userId && club.memberships && club.memberships.length > 0;
    const membership = isMember ? club.memberships[0] : null;

    return {
      ...club,
      isMember: !!isMember,
      userRole: membership?.role || null,
      userJoinedAt: membership?.joinedAt || null,
    };
  }

  async createApplication(userId: string, data: {
    name: string;
    description?: string;
    category: ClubCategory;
    problemStatement: string;
    targetAudience: string;
    plannedActivities: string;
    leadId?: string; // Proposed club lead (defaults to creator)
  }) {
    // Community-led clubs start as PENDING
    const club = await this.prisma.club.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        type: ClubType.COMMUNITY_LED,
        status: ClubStatus.PENDING,
        createdBy: userId,
        leadId: data.leadId || userId,
        problemStatement: data.problemStatement,
        targetAudience: data.targetAudience,
        plannedActivities: data.plannedActivities,
        members: {
          connect: { id: userId },
        },
      },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
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
    });

    // Create club membership with LEAD role
    await this.prisma.clubMember.create({
      data: {
        userId: data.leadId || userId,
        clubId: club.id,
        role: ClubRole.LEAD,
      },
    });

    // Notify admins about new club application
    // This would typically be done via a notification service to all admins
    // For now, we'll just return the club

    return club;
  }

  async createOfficialClub(adminId: string, data: {
    name: string;
    description?: string;
    category: ClubCategory;
    leadId?: string;
  }) {
    const leadId = data.leadId || adminId;
    
    const club = await this.prisma.club.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        type: ClubType.OFFICIAL,
        status: ClubStatus.ACTIVE,
        createdBy: adminId,
        leadId: leadId,
        approvedBy: adminId,
        approvedAt: new Date(),
        members: {
          connect: { id: leadId },
        },
      },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Create club membership with LEAD role
    await this.prisma.clubMember.create({
      data: {
        userId: leadId,
        clubId: club.id,
        role: ClubRole.LEAD,
      },
    });

    return club;
  }

  async joinClub(userId: string, clubId: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      include: {
        memberships: {
          where: { userId },
        },
      },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // Check if club is active (backward compatibility)
    if (!club.isActive) {
      throw new ForbiddenException('Club is not active');
    }
    
    // Only block if explicitly frozen or archived
    if (club.status === ClubStatus.FROZEN || club.status === ClubStatus.ARCHIVED) {
      throw new ForbiddenException('Club is not accepting new members');
    }
    
    // For pending clubs, allow if it's public (backward compatibility with old clubs)
    // New clubs should be ACTIVE or PILOT, but we allow PENDING if public for migration
    if (club.status === ClubStatus.PENDING && !club.isPublic) {
      throw new ForbiddenException('Club is pending approval and not accepting new members');
    }

    if (club.memberships.length > 0) {
      throw new ForbiddenException('Already a member of this club');
    }

    // Create club membership
    await this.prisma.clubMember.create({
      data: {
        userId,
        clubId,
        role: ClubRole.MEMBER,
        isActive: true, // Explicitly set to ensure consistency
      },
    });

    // Also connect to members relation for backward compatibility
    const updatedClub = await this.prisma.club.update({
      where: { id: clubId },
      data: {
        members: {
          connect: { id: userId },
        },
      },
      include: {
        members: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        _count: {
          select: {
            members: true,
            events: true,
          },
        },
      },
    });

    // Create notification and send push notification for club lead
    if (club.leadId && club.leadId !== userId) {
      await this.notificationsService.createAndSend(club.leadId, {
        title: 'New Member Joined',
        message: `A new member joined ${club.name}`,
        type: 'CLUB_UPDATE' as any,
        clubId: clubId,
        link: `/clubs/${clubId}`,
      });
    }

    return updatedClub;
  }

  async leaveClub(userId: string, clubId: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      include: {
        memberships: {
          where: { userId },
        },
      },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    if (club.createdBy === userId) {
      throw new ForbiddenException('Cannot leave club you created');
    }

    // Check if user is a member
    if (!club.memberships || club.memberships.length === 0) {
      throw new ForbiddenException('You are not a member of this club');
    }

    // Delete the ClubMember record (this is the source of truth)
    await this.prisma.clubMember.deleteMany({
      where: {
        userId,
        clubId,
      },
    });

    // Also disconnect from the members relation for backward compatibility
    await this.prisma.club.update({
      where: { id: clubId },
      data: {
        members: {
          disconnect: { id: userId },
        },
      },
    });

    return { success: true, message: 'Successfully left the club' };
  }

  async getMembers(
    clubId: string,
    requesterId?: string,
    page: number = 1,
    limit: number = 20,
    search?: string,
  ) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      include: {
        managers: {
          where: {
            userId: requesterId,
            isActive: true,
          },
        },
        lead: requesterId ? {
          select: {
            id: true,
          },
        } : false,
      },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // If requester is manager/owner, return detailed member list with roles
    const isManager = requesterId && (
      club.managers.length > 0 || 
      (club.lead && club.lead.id === requesterId) ||
      club.createdBy === requesterId
    );

    const skip = (page - 1) * limit;

    if (isManager) {
      // Get memberships with pagination and search
      // Managers can see all members (including inactive) for management purposes
      const where: any = {
        clubId,
        // Note: Managers can see inactive members, but we could add a filter option if needed
      };

      if (search) {
        where.user = {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        };
      }

      const [memberships, total] = await Promise.all([
        this.prisma.clubMember.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                profileImage: true,
                bio: true,
                occupation: true,
                points: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: {
            joinedAt: 'desc',
          },
        }),
        this.prisma.clubMember.count({ where }),
      ]);

      return {
        members: memberships.map((membership) => ({
          ...membership.user,
          role: membership.role,
          joinedAt: membership.joinedAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    // For non-managers, return simple member list with pagination
    // Use ClubMember to find members instead of User relation
    const where: any = {
      clubId,
      isActive: true, // Only show active members
    };

    if (search) {
      where.user = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [memberships, total] = await Promise.all([
      this.prisma.clubMember.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
              bio: true,
              occupation: true,
              points: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          joinedAt: 'desc',
        },
      }),
      this.prisma.clubMember.count({ where }),
    ]);

    const members = memberships.map((membership) => ({
      ...membership.user,
      role: membership.role,
      joinedAt: membership.joinedAt,
    }));

    return {
      members,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMyApplications(userId: string) {
    // Get clubs where user is the creator and status is PENDING
    const clubs = await this.prisma.club.findMany({
      where: {
        createdBy: userId,
        status: ClubStatus.PENDING,
      },
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
    });

    return clubs;
  }

  async checkMembership(userId: string, clubId: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      include: {
        members: {
          where: { id: userId },
          select: { id: true },
        },
      },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    return { isMember: club.members.length > 0 };
  }

  async updateMemberRole(
    clubId: string,
    memberId: string,
    newRole: ClubRole,
    requesterId: string,
  ) {
    // Check if requester is a manager/owner of the club
    const isAuthorized = await this.isManagerOrOwner(requesterId, clubId);
    if (!isAuthorized) {
      throw new ForbiddenException('Only club managers or owners can update member roles');
    }

    // Check if the member is actually a member of this club
    const membership = await this.prisma.clubMember.findUnique({
      where: {
        userId_clubId: {
          userId: memberId,
          clubId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('User is not a member of this club');
    }

    // Don't allow changing the lead role
    if (membership.role === ClubRole.LEAD && newRole !== ClubRole.LEAD) {
      throw new ForbiddenException('Cannot change the club lead role');
    }

    // Update the role
    return this.prisma.clubMember.update({
      where: {
        userId_clubId: {
          userId: memberId,
          clubId,
        },
      },
      data: {
        role: newRole,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            email: true,
          },
        },
      },
    });
  }

  async removeMember(clubId: string, memberId: string, requesterId: string) {
    // Check if requester is a manager/owner
    const isAuthorized = await this.isManagerOrOwner(requesterId, clubId);
    if (!isAuthorized) {
      throw new ForbiddenException('Only club managers or owners can remove members');
    }

    // Check if member exists
    const membership = await this.prisma.clubMember.findUnique({
      where: {
        userId_clubId: {
          userId: memberId,
          clubId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('User is not a member of this club');
    }

    // Don't allow removing the lead
    if (membership.role === ClubRole.LEAD) {
      throw new ForbiddenException('Cannot remove the club lead');
    }

    // Remove from both relations
    await Promise.all([
      this.prisma.clubMember.delete({
        where: {
          userId_clubId: {
            userId: memberId,
            clubId,
          },
        },
      }),
      this.prisma.club.update({
        where: { id: clubId },
        data: {
          members: {
            disconnect: { id: memberId },
          },
        },
      }),
    ]);

    return { success: true };
  }

  async isManagerOrOwner(userId: string, clubId: string): Promise<boolean> {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      include: {
        managers: {
          where: {
            userId,
            isActive: true,
          },
        },
        lead: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!club) {
      return false;
    }

    // Check if user is creator, lead, or manager
    return (
      club.createdBy === userId ||
      (club.lead && club.lead.id === userId) ||
      club.managers.length > 0
    );
  }

  async assignManager(clubId: string, userId: string, assignedBy: string) {
    // Check if club exists
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if already a manager of this club
    const existingManager = await this.prisma.clubManager.findUnique({
      where: {
        userId_clubId: {
          userId,
          clubId,
        },
      },
    });

    if (existingManager) {
      throw new BadRequestException('User is already a manager of this club');
    }

    // Create club manager (managers can now manage multiple clubs)
    const clubManager = await this.prisma.clubManager.create({
      data: {
        userId,
        clubId,
        assignedBy,
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
          },
        },
        club: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Update user role to CLUB_MANAGER if not already
    if (user.role !== 'CLUB_MANAGER' && user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { role: 'CLUB_MANAGER' },
      });
    }

    // Send notification to the new manager
    await this.notificationsService.create(userId, {
      title: 'Club Manager Assignment',
      message: `You have been assigned as a manager of ${club.name}`,
      type: 'CLUB_UPDATE' as any,
      clubId: clubId,
    });

    return clubManager;
  }

  async removeManager(clubId: string, userId: string) {
    const clubManager = await this.prisma.clubManager.findUnique({
      where: {
        userId_clubId: {
          userId,
          clubId,
        },
      },
    });

    if (!clubManager) {
      throw new NotFoundException('Club manager not found');
    }

    await this.prisma.clubManager.delete({
      where: {
        userId_clubId: {
          userId,
          clubId,
        },
      },
    });

    // Check if user is still managing other clubs
    const otherManagedClubs = await this.prisma.clubManager.count({
      where: {
        userId,
        isActive: true,
      },
    });

    // If no other clubs, revert role to MEMBER (unless they have other elevated roles)
    if (otherManagedClubs === 0) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (user && user.role === 'CLUB_MANAGER') {
        await this.prisma.user.update({
          where: { id: userId },
          data: { role: 'MEMBER' },
        });
      }
    }

    return { message: 'Club manager removed successfully' };
  }

  async getManagers(clubId: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    const managers = await this.prisma.clubManager.findMany({
      where: {
        clubId,
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
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });

    return managers;
  }

  async getManagedClubs(userId: string) {
    const managedClubs = await this.prisma.clubManager.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        club: {
          include: {
            _count: {
              select: {
                members: true,
                events: true,
              },
            },
          },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });

    return managedClubs;
  }

  async isManager(userId: string, clubId: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      include: {
        managers: {
          where: {
            userId,
            isActive: true,
          },
        },
        lead: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!club) {
      return { isManager: false };
    }

    // User is manager if they are creator, lead, or an active manager
    const isManager = 
      club.createdBy === userId ||
      (club.lead && club.lead.id === userId) ||
      club.managers.length > 0;

    return { isManager };
  }

  // Admin methods for club management
  async approveClub(clubId: string, adminId: string, probationDays = 60) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    if (club.status !== ClubStatus.PENDING) {
      throw new BadRequestException('Club is not in pending status');
    }

    const probationEndDate = new Date();
    probationEndDate.setDate(probationEndDate.getDate() + probationDays);

    const updatedClub = await this.prisma.club.update({
      where: { id: clubId },
      data: {
        status: ClubStatus.PILOT,
        approvedBy: adminId,
        approvedAt: new Date(),
        probationStartDate: new Date(),
        probationEndDate,
      },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Notify club lead
    if (club.leadId) {
      await this.notificationsService.create(club.leadId, {
        title: 'Club Application Approved',
        message: `Your club "${club.name}" has been approved and is now in pilot period.`,
        type: 'CLUB_UPDATE' as any,
        clubId: clubId,
      });
    }

    return updatedClub;
  }

  async rejectClub(clubId: string, adminId: string, reason?: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    if (club.status !== ClubStatus.PENDING) {
      throw new BadRequestException('Club is not in pending status');
    }

    const updatedClub = await this.prisma.club.update({
      where: { id: clubId },
      data: {
        status: ClubStatus.ARCHIVED,
        archivedBy: adminId,
        archivedAt: new Date(),
        archiveReason: reason || 'Application rejected',
      },
    });

    // Notify club lead
    if (club.leadId) {
      await this.notificationsService.createAndSend(club.leadId, {
        title: 'Club Application Rejected',
        message: `Your club application for "${club.name}" has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
        type: 'CLUB_UPDATE' as any,
        clubId: clubId,
        link: `/clubs/${clubId}`,
      });
    }

    return updatedClub;
  }

  async activateClub(clubId: string, adminId: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    if (club.status !== ClubStatus.PILOT) {
      throw new BadRequestException('Club must be in pilot status to be activated');
    }

    return this.prisma.club.update({
      where: { id: clubId },
      data: {
        status: ClubStatus.ACTIVE,
      },
    });
  }

  async archiveClub(clubId: string, adminId: string, reason?: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    return this.prisma.club.update({
      where: { id: clubId },
      data: {
        status: ClubStatus.ARCHIVED,
        archivedBy: adminId,
        archivedAt: new Date(),
        archiveReason: reason || 'Archived by admin',
      },
    });
  }

  async freezeClub(clubId: string, adminId: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    return this.prisma.club.update({
      where: { id: clubId },
      data: {
        status: ClubStatus.FROZEN,
      },
    });
  }

  async updateEngagementScore(clubId: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      include: {
        _count: {
          select: {
            members: true,
            events: true,
            posts: true,
          },
        },
      },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // Calculate engagement score
    // Formula: (posts * 2 + events * 5 + members * 1) / days since creation
    const daysSinceCreation = Math.max(1, Math.floor((Date.now() - club.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
    const engagementScore = (
      (club._count.posts * 2) +
      (club._count.events * 5) +
      (club._count.members * 1)
    ) / daysSinceCreation;

    // Update last activity if there are recent posts
    const recentPost = await this.prisma.post.findFirst({
      where: {
        clubId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return this.prisma.club.update({
      where: { id: clubId },
      data: {
        engagementScore,
        lastActivityAt: recentPost?.createdAt || club.lastActivityAt,
        activityCount: club._count.posts + club._count.events,
      },
    });
  }

  async checkAndArchiveInactiveClubs() {
    // Find clubs in PILOT status that have passed probation period
    const probationEnded = await this.prisma.club.findMany({
      where: {
        status: ClubStatus.PILOT,
        probationEndDate: {
          lte: new Date(),
        },
      },
    });

    const archived = [];
    for (const club of probationEnded) {
      // Check if club meets minimum engagement requirements
      await this.updateEngagementScore(club.id);
      const updatedClub = await this.prisma.club.findUnique({
        where: { id: club.id },
      });

      // If engagement score is too low, archive it
      if (updatedClub && updatedClub.engagementScore < 0.5) {
        await this.archiveClub(club.id, 'system', 'Failed to meet minimum engagement requirements during probation period');
        archived.push(club.id);
      } else if (updatedClub && updatedClub.engagementScore >= 0.5) {
        // Activate if engagement is good
        await this.activateClub(club.id, 'system');
      }
    }

    return { archived, count: archived.length };
  }

  async getClubMentorship(clubId: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // Get all CLUB_BASED mentorship sessions for this club
    // Note: This assumes Mentorship model has a clubId field or we query by club members
    const clubMembers = await this.prisma.clubMember.findMany({
      where: { clubId },
      select: { userId: true },
    });

    const memberIds = clubMembers.map(m => m.userId);

    const mentorshipSessions = await this.prisma.mentorship.findMany({
      where: {
        type: MentorshipType.CLUB_BASED,
        OR: [
          { mentorId: { in: memberIds } },
          { menteeId: { in: memberIds } },
        ],
      },
      include: {
        mentor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        mentee: {
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

    return mentorshipSessions;
  }

  async getClubMentorshipStats(clubId: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    const clubMembers = await this.prisma.clubMember.findMany({
      where: { clubId },
      select: { userId: true },
    });

    const memberIds = clubMembers.map(m => m.userId);

    const [activeMentorships, completedMentorships, pendingMentorships, totalMentorships] = await Promise.all([
      this.prisma.mentorship.count({
        where: {
          type: MentorshipType.CLUB_BASED,
          status: 'ACTIVE',
          OR: [
            { mentorId: { in: memberIds } },
            { menteeId: { in: memberIds } },
          ],
        },
      }),
      this.prisma.mentorship.count({
        where: {
          type: MentorshipType.CLUB_BASED,
          status: 'COMPLETED',
          OR: [
            { mentorId: { in: memberIds } },
            { menteeId: { in: memberIds } },
          ],
        },
      }),
      this.prisma.mentorship.count({
        where: {
          type: MentorshipType.CLUB_BASED,
          status: 'PENDING',
          OR: [
            { mentorId: { in: memberIds } },
            { menteeId: { in: memberIds } },
          ],
        },
      }),
      this.prisma.mentorship.count({
        where: {
          type: MentorshipType.CLUB_BASED,
          OR: [
            { mentorId: { in: memberIds } },
            { menteeId: { in: memberIds } },
          ],
        },
      }),
    ]);

    return {
      active: activeMentorships,
      completed: completedMentorships,
      pending: pendingMentorships,
      total: totalMentorships,
    };
  }

  async getClubAnalytics(clubId: string, userId: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      include: {
        memberships: {
          where: { userId },
        },
        managers: {
          where: {
            userId,
            isActive: true,
          },
        },
        lead: {
          select: { id: true },
        },
      },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // Check permissions - club leads, admins, managers, or platform admins can view analytics
    const isLead = club.lead?.id === userId || club.createdBy === userId;
    const isManager = club.managers.length > 0;
    const membership = club.memberships[0];
    const isAdmin = membership && (membership.role === ClubRole.ADMIN || membership.role === ClubRole.LEAD);

    // For now, we'll allow all members to see basic analytics
    // You can restrict this if needed

    const [
      memberCount,
      eventCount,
      postCount,
      programCount,
      resourceCount,
      activePrograms,
      recentActivity,
    ] = await Promise.all([
      this.prisma.clubMember.count({ where: { clubId, isActive: true } }),
      this.prisma.event.count({ where: { clubId } }),
      this.prisma.post.count({ where: { clubId } }),
      this.prisma.clubProgram.count({ where: { clubId } }),
      this.prisma.clubResource.count({ where: { clubId } }),
      this.prisma.clubProgram.count({
        where: {
          clubId,
          status: { in: ['UPCOMING', 'ONGOING'] },
        },
      }),
      this.prisma.post.findMany({
        where: { clubId },
        orderBy: { createdAt: 'desc' },
        take: 10,
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
      }),
    ]);

    // Member growth over last 30 days (only active members)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newMembersLast30Days = await this.prisma.clubMember.count({
      where: {
        clubId,
        isActive: true,
        joinedAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Engagement score breakdown
    const engagementBreakdown = {
      posts: postCount * 2,
      events: eventCount * 5,
      members: memberCount * 1,
      programs: programCount * 3,
      resources: resourceCount * 1,
    };

    return {
      overview: {
        memberCount,
        eventCount,
        postCount,
        programCount,
        resourceCount,
        activePrograms,
        engagementScore: club.engagementScore,
        lastActivityAt: club.lastActivityAt,
      },
      growth: {
        newMembersLast30Days,
        memberGrowthRate: memberCount > 0 ? (newMembersLast30Days / memberCount) * 100 : 0,
      },
      engagement: {
        score: club.engagementScore,
        breakdown: engagementBreakdown,
        totalEngagementPoints: Object.values(engagementBreakdown).reduce((a, b) => a + b, 0),
      },
      recentActivity,
    };
  }
}


