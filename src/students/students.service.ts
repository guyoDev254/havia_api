import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EducationLevel, ApplicationStatus, ResourceType } from '@prisma/client';
import { StudentOnboardingDto } from './dto/student-onboarding.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class StudentsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async saveOnboarding(
    userId: string,
    dto: StudentOnboardingDto,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const locationParts = [dto.county?.trim(), dto.town?.trim()].filter(Boolean);
    const location = locationParts.length ? locationParts.join(', ') : undefined;

    // If not student, just update preference-like fields and return
    if (!dto.isStudent) {
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: {
          isStudent: false,
          role: user.role === 'STUDENT' ? 'MEMBER' : user.role,
          ...(dto.interests ? { interests: dto.interests } : {}),
          ...(location ? { location } : {}),
          educationLevel: null,
        },
        select: { id: true, isStudent: true, role: true, location: true, interests: true, educationLevel: true },
      });
      return { user: updated, studentProfileCreated: false };
    }

    if (!dto.educationLevel) {
      throw new BadRequestException('educationLevel is required when isStudent=true');
    }

    const defaultSchoolName =
      dto.educationLevel === EducationLevel.OUT_OF_SCHOOL ? 'Out of school' : undefined;
    const schoolName = (dto.schoolName || defaultSchoolName || '').trim();
    if (!schoolName) {
      throw new BadRequestException('schoolName is required for students');
    }

    // Update user + upsert minimal StudentProfile (required fields)
    const [updatedUser] = await Promise.all([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          isStudent: true,
          role: 'STUDENT',
          educationLevel: dto.educationLevel,
          schoolName,
          ...(dto.interests ? { interests: dto.interests } : {}),
          ...(location ? { location } : {}),
        },
        select: {
          id: true,
          isStudent: true,
          role: true,
          educationLevel: true,
          location: true,
          interests: true,
          schoolName: true,
        },
      }),
      this.prisma.studentProfile.upsert({
        where: { userId },
        update: {
          educationLevel: dto.educationLevel,
          schoolName,
        },
        create: {
          userId,
          educationLevel: dto.educationLevel,
          schoolName,
          achievements: [],
          extracurriculars: [],
        },
      }),
    ]);

    return { user: updatedUser, studentProfileCreated: true };
  }

  // Student Profile
  async createOrUpdateProfile(userId: string, data: {
    educationLevel: EducationLevel;
    schoolName: string;
    grade?: string;
    yearOfStudy?: number;
    major?: string;
    expectedGraduation?: Date;
    studentId?: string;
    gpa?: number;
    achievements?: string[];
    extracurriculars?: string[];
    careerGoals?: string;
  }) {
    // Update user to mark as student and set student type
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isStudent: true,
        educationLevel: data.educationLevel,
        schoolName: data.schoolName,
        grade: data.grade,
        yearOfStudy: data.yearOfStudy,
        major: data.major,
        expectedGraduation: data.expectedGraduation,
        studentId: data.studentId,
        // Optionally set role to STUDENT if not already set
        role: 'STUDENT',
      },
    });

    return this.prisma.studentProfile.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
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
    });
  }

  async getProfile(userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
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
              },
            },
          },
        },
      },
    });

    if (!profile) {
      return null;
    }

    // Transform clubMemberships to clubs array for frontend compatibility
    const clubs = profile.user.clubMemberships?.map((membership) => membership.club) || [];

    return {
      ...profile,
      user: {
        ...profile.user,
        clubs,
        clubMemberships: undefined, // Remove clubMemberships from response
        _count: {
          ...profile.user._count,
          clubs: profile.user._count?.clubMemberships || 0,
        },
      },
    };
  }

  // Scholarships
  async getScholarships(level?: EducationLevel, isActive = true) {
    const where: any = { isActive };
    if (level) {
      where.level = level;
    }

    return this.prisma.scholarship.findMany({
      where,
      orderBy: {
        deadline: 'asc',
      },
    });
  }

  async getScholarshipById(id: string) {
    const scholarship = await this.prisma.scholarship.findUnique({
      where: { id },
    });

    if (!scholarship) {
      throw new NotFoundException('Scholarship not found');
    }

    return scholarship;
  }

  async applyForScholarship(userId: string, scholarshipId: string, notes?: string) {
    // Check if scholarship exists
    const scholarship = await this.getScholarshipById(scholarshipId);

    // Check if already applied
    const existing = await this.prisma.scholarshipApplication.findFirst({
      where: {
        userId,
        scholarshipId,
      },
    });

    if (existing) {
      throw new BadRequestException('You have already applied for this scholarship');
    }

    return this.prisma.scholarshipApplication.create({
      data: {
        userId,
        scholarshipId,
        notes,
        status: ApplicationStatus.PENDING,
      },
      include: {
        scholarship: true,
      },
    });
  }

  async getMyApplications(userId: string) {
    return this.prisma.scholarshipApplication.findMany({
      where: { userId },
      include: {
        scholarship: true,
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });
  }

  // Study Groups
  async getStudyGroups(level?: EducationLevel, subject?: string) {
    const where: any = { isActive: true };
    if (level) {
      where.level = level;
    }
    if (subject) {
      where.subject = { contains: subject, mode: 'insensitive' };
    }

    return this.prisma.studyGroup.findMany({
      where,
      include: {
        _count: {
          select: {
            members: true,
            posts: {
              where: { isDeleted: false },
            },
            meetups: {
              where: { isCancelled: false },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async createStudyGroup(userId: string, data: {
    name: string;
    description: string;
    subject: string;
    level: EducationLevel;
    maxMembers?: number;
  }) {
    const studyGroup = await this.prisma.studyGroup.create({
      data: {
        ...data,
        createdBy: userId,
        maxMembers: data.maxMembers || 10,
      },
    });

    // Add creator as leader
    await this.prisma.studyGroupMember.create({
      data: {
        studyGroupId: studyGroup.id,
        userId,
        role: 'LEADER',
      },
    });

    return this.getStudyGroupById(studyGroup.id);
  }

  async getStudyGroupById(id: string) {
    const studyGroup = await this.prisma.studyGroup.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        subject: true,
        level: true,
        maxMembers: true,
        isActive: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
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
                profileImage: true,
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
            posts: {
              where: { isDeleted: false },
            },
            meetups: {
              where: { isCancelled: false },
            },
          },
        },
      },
    });

    if (!studyGroup) {
      throw new NotFoundException('Study group not found');
    }

    return studyGroup;
  }

  async joinStudyGroup(userId: string, studyGroupId: string) {
    const studyGroup = await this.getStudyGroupById(studyGroupId);

    // Check if already a member
    const existing = await this.prisma.studyGroupMember.findUnique({
      where: {
        studyGroupId_userId: {
          studyGroupId,
          userId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('You are already a member of this study group');
    }

    // Check if group is full
    if (studyGroup.members.length >= studyGroup.maxMembers) {
      throw new BadRequestException('Study group is full');
    }

    return this.prisma.studyGroupMember.create({
      data: {
        studyGroupId,
        userId,
        role: 'MEMBER',
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
  }

  async leaveStudyGroup(userId: string, studyGroupId: string) {
    const member = await this.prisma.studyGroupMember.findUnique({
      where: {
        studyGroupId_userId: {
          studyGroupId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('You are not a member of this study group');
    }

    // Don't allow leader to leave if they're the only member
    const studyGroup = await this.getStudyGroupById(studyGroupId);
    if (member.role === 'LEADER' && studyGroup.members.length > 1) {
      throw new BadRequestException('Leader cannot leave. Transfer leadership first or delete the group.');
    }

    return this.prisma.studyGroupMember.delete({
      where: {
        id: member.id,
      },
    });
  }

  async removeMemberFromStudyGroup(leaderId: string, studyGroupId: string, memberIdToRemove: string) {
    // Verify the requester is the leader
    const leader = await this.prisma.studyGroupMember.findFirst({
      where: {
        studyGroupId,
        userId: leaderId,
        role: 'LEADER',
      },
    });

    if (!leader) {
      throw new ForbiddenException('Only the group leader can remove members');
    }

    // Verify the member to remove exists and is not the leader
    const memberToRemove = await this.prisma.studyGroupMember.findFirst({
      where: {
        studyGroupId,
        userId: memberIdToRemove,
      },
    });

    if (!memberToRemove) {
      throw new NotFoundException('Member not found in this study group');
    }

    if (memberToRemove.role === 'LEADER') {
      throw new BadRequestException('Cannot remove the group leader. Transfer leadership first.');
    }

    return this.prisma.studyGroupMember.delete({
      where: {
        id: memberToRemove.id,
      },
    });
  }

  async transferLeadership(leaderId: string, studyGroupId: string, newLeaderId: string) {
    // Verify the requester is the current leader
    const currentLeader = await this.prisma.studyGroupMember.findFirst({
      where: {
        studyGroupId,
        userId: leaderId,
        role: 'LEADER',
      },
    });

    if (!currentLeader) {
      throw new ForbiddenException('Only the current leader can transfer leadership');
    }

    // Verify the new leader exists as a member
    const newLeader = await this.prisma.studyGroupMember.findFirst({
      where: {
        studyGroupId,
        userId: newLeaderId,
      },
    });

    if (!newLeader) {
      throw new NotFoundException('New leader must be a member of the study group');
    }

    if (newLeader.role === 'LEADER') {
      throw new BadRequestException('This member is already the leader');
    }

    // Transfer leadership: make current leader a member, make new leader the leader
    await this.prisma.$transaction([
      this.prisma.studyGroupMember.update({
        where: { id: currentLeader.id },
        data: { role: 'MEMBER' },
      }),
      this.prisma.studyGroupMember.update({
        where: { id: newLeader.id },
        data: { role: 'LEADER' },
      }),
    ]);

    return this.getStudyGroupById(studyGroupId);
  }

  async getMyStudyGroups(userId: string) {
    return this.prisma.studyGroupMember.findMany({
      where: { userId },
      include: {
        studyGroup: {
          include: {
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });
  }

  async updateStudyGroup(userId: string, studyGroupId: string, data: {
    name?: string;
    description?: string;
    subject?: string;
    level?: EducationLevel;
    maxMembers?: number;
    isActive?: boolean;
  }) {
    // Check if study group exists
    const studyGroup = await this.getStudyGroupById(studyGroupId);

    // Check if user is the leader
    const member = await this.prisma.studyGroupMember.findUnique({
      where: {
        studyGroupId_userId: {
          studyGroupId,
          userId,
        },
      },
    });

    if (!member || member.role !== 'LEADER') {
      throw new ForbiddenException('Only the group leader can update the study group');
    }

    // If updating maxMembers, ensure it's not less than current member count
    if (data.maxMembers !== undefined && data.maxMembers < studyGroup.members.length) {
      throw new BadRequestException(`Cannot set max members to ${data.maxMembers}. Group currently has ${studyGroup.members.length} members.`);
    }

    return this.prisma.studyGroup.update({
      where: { id: studyGroupId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description && { description: data.description }),
        ...(data.subject && { subject: data.subject }),
        ...(data.level && { level: data.level }),
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

  async deleteStudyGroup(userId: string, studyGroupId: string) {
    // Check if study group exists
    const studyGroup = await this.getStudyGroupById(studyGroupId);

    // Check if user is the leader
    const member = await this.prisma.studyGroupMember.findUnique({
      where: {
        studyGroupId_userId: {
          studyGroupId,
          userId,
        },
      },
    });

    if (!member || member.role !== 'LEADER') {
      throw new ForbiddenException('Only the group leader can delete the study group');
    }

    // Delete all members first (cascade will handle this, but we'll be explicit)
    await this.prisma.studyGroupMember.deleteMany({
      where: { studyGroupId },
    });

    // Delete the study group
    return this.prisma.studyGroup.delete({
      where: { id: studyGroupId },
    });
  }

  // Academic Resources
  async getResources(level?: EducationLevel, subject?: string, type?: ResourceType) {
    const where: any = { isActive: true };
    if (level) {
      where.level = level;
    }
    if (subject) {
      where.subject = { contains: subject, mode: 'insensitive' };
    }
    if (type) {
      where.type = type;
    }

    return this.prisma.academicResource.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
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

  // ==================== STUDY GROUP POSTS ====================
  async createStudyGroupPost(userId: string, studyGroupId: string, data: {
    title?: string;
    content: string;
    images?: string[];
    isPinned?: boolean;
  }) {
    // Verify user is a member of the study group
    const member = await this.prisma.studyGroupMember.findUnique({
      where: {
        studyGroupId_userId: {
          studyGroupId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('You must be a member of this study group to post');
    }

    // Only leaders can pin posts
    if (data.isPinned && member.role !== 'LEADER') {
      throw new ForbiddenException('Only group leaders can pin posts');
    }

    // Unpin other posts if this one is being pinned
    if (data.isPinned) {
      await this.prisma.studyGroupPost.updateMany({
        where: { studyGroupId, isPinned: true },
        data: { isPinned: false },
      });
    }

    return this.prisma.studyGroupPost.create({
      data: {
        studyGroupId,
        authorId: userId,
        title: data.title,
        content: data.content,
        images: data.images || [],
        isPinned: data.isPinned || false,
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
      },
    });
  }

  async getStudyGroupPosts(studyGroupId: string, page = 1, limit = 20, userId?: string) {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.prisma.studyGroupPost.findMany({
        where: {
          studyGroupId,
          isDeleted: false,
        },
        skip,
        take: limit,
        orderBy: [
          { isPinned: 'desc' }, // Pinned posts first
          { createdAt: 'desc' },
        ],
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
            },
          },
          comments: {
            where: { isDeleted: false },
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
            orderBy: { createdAt: 'asc' },
            take: 10, // Show first 10 comments, load more on demand
          },
          reactions: userId
            ? {
                where: { userId },
                take: 1, // Get user's reaction if any
              }
            : false,
          _count: {
            select: {
              comments: { where: { isDeleted: false } },
              reactions: true,
            },
          },
        },
      }),
      this.prisma.studyGroupPost.count({
        where: {
          studyGroupId,
          isDeleted: false,
        },
      }),
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

  async updateStudyGroupPost(userId: string, postId: string, data: {
    title?: string;
    content?: string;
    images?: string[];
    isPinned?: boolean;
  }) {
    const post = await this.prisma.studyGroupPost.findUnique({
      where: { id: postId },
      include: {
        studyGroup: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const member = post.studyGroup.members[0];
    if (!member) {
      throw new ForbiddenException('You must be a member of this study group');
    }

    // Only author or leader can update
    if (post.authorId !== userId && member.role !== 'LEADER') {
      throw new ForbiddenException('Only the post author or group leader can update this post');
    }

    // Only leaders can pin/unpin
    if (data.isPinned !== undefined && member.role !== 'LEADER') {
      throw new ForbiddenException('Only group leaders can pin posts');
    }

    // Unpin other posts if this one is being pinned
    if (data.isPinned === true) {
      await this.prisma.studyGroupPost.updateMany({
        where: {
          studyGroupId: post.studyGroupId,
          isPinned: true,
          id: { not: postId },
        },
        data: { isPinned: false },
      });
    }

    return this.prisma.studyGroupPost.update({
      where: { id: postId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.images !== undefined && { images: data.images }),
        ...(data.isPinned !== undefined && { isPinned: data.isPinned }),
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
      },
    });
  }

  async deleteStudyGroupPost(userId: string, postId: string) {
    const post = await this.prisma.studyGroupPost.findUnique({
      where: { id: postId },
      include: {
        studyGroup: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const member = post.studyGroup.members[0];
    if (!member) {
      throw new ForbiddenException('You must be a member of this study group');
    }

    // Only author or leader can delete
    if (post.authorId !== userId && member.role !== 'LEADER') {
      throw new ForbiddenException('Only the post author or group leader can delete this post');
    }

    return this.prisma.studyGroupPost.update({
      where: { id: postId },
      data: { isDeleted: true },
    });
  }

  // ==================== STUDY GROUP MEETUPS ====================
  async createStudyGroupMeetup(userId: string, studyGroupId: string, data: {
    title: string;
    description?: string;
    startDate: Date;
    endDate?: Date;
    location?: string;
    isOnline?: boolean;
    onlineLink?: string;
    maxAttendees?: number;
  }) {
    // Verify user is a leader of the study group
    const member = await this.prisma.studyGroupMember.findUnique({
      where: {
        studyGroupId_userId: {
          studyGroupId,
          userId,
        },
      },
    });

    if (!member || member.role !== 'LEADER') {
      throw new ForbiddenException('Only group leaders can create meetups');
    }

    const meetup = await this.prisma.studyGroupMeetup.create({
      data: {
        studyGroupId,
        createdById: userId,
        title: data.title,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        location: data.location,
        isOnline: data.isOnline || false,
        onlineLink: data.onlineLink,
        maxAttendees: data.maxAttendees,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        _count: {
          select: {
            attendees: true,
          },
        },
      },
    });

    // Notify all members about the new meetup
    const members = await this.prisma.studyGroupMember.findMany({
      where: { studyGroupId },
      include: { user: { select: { id: true, expoPushToken: true } } },
    });

    for (const m of members) {
      if (m.user.expoPushToken) {
        await this.notificationsService.sendPushNotification(
          m.user.id,
          'New Study Group Meetup',
          `${meetup.title} - ${new Date(meetup.startDate).toLocaleDateString()}`,
          {
            type: 'STUDY_GROUP_MEETUP',
            studyGroupId,
            meetupId: meetup.id,
          },
        );
      }
    }

    return meetup;
  }

  async getStudyGroupMeetups(studyGroupId: string, includePast = false) {
    const where: any = {
      studyGroupId,
      isCancelled: false,
    };

    if (!includePast) {
      where.startDate = { gte: new Date() };
    }

    return this.prisma.studyGroupMeetup.findMany({
      where,
      orderBy: { startDate: 'asc' },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        _count: {
          select: {
            attendees: true,
          },
        },
        attendees: {
          where: {
            status: 'ATTENDING',
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
          take: 5,
        },
      },
    });
  }

  async rsvpToMeetup(
    userId: string,
    meetupId: string,
    status: 'ATTENDING' | 'NOT_ATTENDING' | 'MAYBE',
    notes?: string,
  ) {
    // Verify user is a member of the study group
    const meetup = await this.prisma.studyGroupMeetup.findUnique({
      where: { id: meetupId },
      include: {
        studyGroup: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
        _count: {
          select: {
            attendees: true,
          },
        },
      },
    });

    if (!meetup) {
      throw new NotFoundException('Meetup not found');
    }

    if (meetup.studyGroup.members.length === 0) {
      throw new ForbiddenException('You must be a member of this study group to RSVP');
    }

    // Check max attendees
    if (status === 'ATTENDING' && meetup.maxAttendees && meetup._count.attendees >= meetup.maxAttendees) {
      const existingRSVP = await this.prisma.studyGroupMeetupRSVP.findUnique({
        where: {
          meetupId_userId: {
            meetupId,
            userId,
          },
        },
      });

      if (!existingRSVP || existingRSVP.status !== 'ATTENDING') {
        throw new BadRequestException('Meetup is full');
      }
    }

    return this.prisma.studyGroupMeetupRSVP.upsert({
      where: {
        meetupId_userId: {
          meetupId,
          userId,
        },
      },
      create: {
        meetupId,
        userId,
        status,
        notes,
      },
      update: {
        status,
        notes,
        updatedAt: new Date(),
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
  }

  async updateStudyGroupMeetup(userId: string, meetupId: string, data: {
    title?: string;
    description?: string;
    startDate?: Date;
    endDate?: Date;
    location?: string;
    isOnline?: boolean;
    onlineLink?: string;
    maxAttendees?: number;
  }) {
    const meetup = await this.prisma.studyGroupMeetup.findUnique({
      where: { id: meetupId },
      include: {
        studyGroup: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
        _count: {
          select: {
            attendees: true,
          },
        },
      },
    });

    if (!meetup) {
      throw new NotFoundException('Meetup not found');
    }

    const member = meetup.studyGroup.members[0];
    if (!member || member.role !== 'LEADER') {
      throw new ForbiddenException('Only group leaders can update meetups');
    }

    // If updating maxAttendees, ensure it's not less than current attendee count
    if (data.maxAttendees !== undefined) {
      const attendeeCount = await this.prisma.studyGroupMeetupRSVP.count({
        where: {
          meetupId,
          status: 'ATTENDING',
        },
      });

      if (data.maxAttendees < attendeeCount) {
        throw new BadRequestException(
          `Cannot set max attendees to ${data.maxAttendees}. ${attendeeCount} people have already RSVP'd as attending.`,
        );
      }
    }

    return this.prisma.studyGroupMeetup.update({
      where: { id: meetupId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.startDate !== undefined && { startDate: data.startDate }),
        ...(data.endDate !== undefined && { endDate: data.endDate }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.isOnline !== undefined && { isOnline: data.isOnline }),
        ...(data.onlineLink !== undefined && { onlineLink: data.onlineLink }),
        ...(data.maxAttendees !== undefined && { maxAttendees: data.maxAttendees }),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        _count: {
          select: {
            attendees: true,
          },
        },
      },
    });
  }

  // ==================== STUDY GROUP POST COMMENTS ====================
  async addCommentToPost(userId: string, postId: string, content: string) {
    // Verify user is a member of the study group
    const post = await this.prisma.studyGroupPost.findUnique({
      where: { id: postId },
      include: {
        studyGroup: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.studyGroup.members.length === 0) {
      throw new ForbiddenException('You must be a member of this study group to comment');
    }

    return this.prisma.studyGroupPostComment.create({
      data: {
        postId,
        userId,
        content,
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
  }

  async getPostComments(postId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      this.prisma.studyGroupPostComment.findMany({
        where: {
          postId,
          isDeleted: false,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
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
      }),
      this.prisma.studyGroupPostComment.count({
        where: {
          postId,
          isDeleted: false,
        },
      }),
    ]);

    return {
      comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deleteComment(userId: string, commentId: string) {
    const comment = await this.prisma.studyGroupPostComment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          include: {
            studyGroup: {
              include: {
                members: {
                  where: { userId },
                },
              },
            },
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const member = comment.post.studyGroup.members[0];
    if (!member) {
      throw new ForbiddenException('You must be a member of this study group');
    }

    // Only author or leader can delete
    if (comment.userId !== userId && member.role !== 'LEADER') {
      throw new ForbiddenException('Only the comment author or group leader can delete this comment');
    }

    return this.prisma.studyGroupPostComment.update({
      where: { id: commentId },
      data: { isDeleted: true },
    });
  }

  // ==================== STUDY GROUP POST REACTIONS ====================
  async togglePostReaction(userId: string, postId: string, type: 'LIKE' | 'LOVE' | 'SUPPORT' | 'CELEBRATE' = 'LIKE') {
    // Verify user is a member of the study group
    const post = await this.prisma.studyGroupPost.findUnique({
      where: { id: postId },
      include: {
        studyGroup: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.studyGroup.members.length === 0) {
      throw new ForbiddenException('You must be a member of this study group to react');
    }

    const existing = await this.prisma.studyGroupPostReaction.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existing) {
      // If same type, remove reaction; otherwise update type
      if (existing.type === type) {
        await this.prisma.studyGroupPostReaction.delete({
          where: { id: existing.id },
        });
        return { action: 'removed', reaction: null };
      } else {
        const updated = await this.prisma.studyGroupPostReaction.update({
          where: { id: existing.id },
          data: { type },
        });
        return { action: 'updated', reaction: updated };
      }
    } else {
      const created = await this.prisma.studyGroupPostReaction.create({
        data: {
          postId,
          userId,
          type,
        },
      });
      return { action: 'added', reaction: created };
    }
  }

  async getPostReactions(postId: string) {
    const reactions = await this.prisma.studyGroupPostReaction.findMany({
      where: { postId },
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
      orderBy: { createdAt: 'asc' },
    });

    // Group by type
    const grouped = reactions.reduce((acc: any, reaction) => {
      if (!acc[reaction.type]) {
        acc[reaction.type] = [];
      }
      acc[reaction.type].push(reaction.user);
      return acc;
    }, {});

    return {
      grouped,
      total: reactions.length,
      byType: {
        LIKE: grouped.LIKE?.length || 0,
        LOVE: grouped.LOVE?.length || 0,
        SUPPORT: grouped.SUPPORT?.length || 0,
        CELEBRATE: grouped.CELEBRATE?.length || 0,
      },
    };
  }

  async cancelMeetup(userId: string, meetupId: string) {
    const meetup = await this.prisma.studyGroupMeetup.findUnique({
      where: { id: meetupId },
      include: {
        studyGroup: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!meetup) {
      throw new NotFoundException('Meetup not found');
    }

    const member = meetup.studyGroup.members[0];
    if (!member || member.role !== 'LEADER') {
      throw new ForbiddenException('Only group leaders can cancel meetups');
    }

    return this.prisma.studyGroupMeetup.update({
      where: { id: meetupId },
      data: {
        isCancelled: true,
        cancelledAt: new Date(),
        cancelledBy: userId,
      },
    });
  }

  // ==================== STUDENT DASHBOARD (JOURNEY OVERVIEW) ====================
  async getDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        interests: true,
        skills: true,
        location: true,
        educationLevel: true,
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const since30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Progress inputs - including academic activities
    const [
      clubsCount,
      eventsAttendedCount,
      mentorshipCount,
      recentActivity,
      coursesCount,
      assignmentsCompletedCount,
      studySessionsCount,
      totalStudyHours,
      academicEventsCount,
    ] = await Promise.all([
      this.prisma.clubMember.count({ where: { userId, isActive: true } }),
      this.prisma.event.count({ where: { attendees: { some: { id: userId } } } }),
      this.prisma.mentorship.count({
        where: {
          OR: [{ mentorId: userId }, { menteeId: userId }],
        },
      }),
      this.prisma.activity.findMany({
        where: { userId, createdAt: { gte: since30Days } },
        select: { createdAt: true, type: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      // Academic activities
      this.prisma.course.count({ where: { userId, status: 'ACTIVE' } }),
      this.prisma.assignment.count({
        where: {
          userId,
          status: { in: ['GRADED', 'SUBMITTED'] },
          completedAt: { gte: since30Days },
        },
      }),
      this.prisma.studySession.count({
        where: {
          userId,
          startTime: { gte: since30Days },
        },
      }),
      this.prisma.studySession.aggregate({
        where: {
          userId,
          startTime: { gte: since30Days },
        },
        _sum: {
          duration: true,
        },
      }),
      this.prisma.academicCalendar.count({
        where: {
          userId,
          startDate: { gte: since30Days },
        },
      }),
    ]);

    // Calculate total study hours (from minutes)
    const studyHours = totalStudyHours._sum.duration ? Math.round((totalStudyHours._sum.duration / 60) * 10) / 10 : 0;

    // Engagement score (internal)
    // weights: 
    // - event 5, club 3, mentorship 7 (social/community)
    // - course 4 (per active course), assignment 3 (per completed), study session 2 (per 10 hours), calendar event 1
    // - consistency bonus 10/week
    const activeDays = new Set(recentActivity.map((a) => a.createdAt.toISOString().slice(0, 10)));
    const weeksWithActivity = Math.ceil(activeDays.size / 7);
    
    // Academic engagement components
    const academicScore =
      coursesCount * 4 +
      assignmentsCompletedCount * 3 +
      Math.floor(studyHours / 10) * 2 +
      academicEventsCount * 1;
    
    // Total engagement score
    const engagementScore =
      eventsAttendedCount * 5 +
      clubsCount * 3 +
      mentorshipCount * 7 +
      academicScore +
      weeksWithActivity * 10;

    const engagementLevel =
      engagementScore >= 150 ? 'HIGH' : engagementScore >= 80 ? 'MEDIUM' : 'LOW';

    // Recommended clubs: match by interest tags (best-effort using club.category + name/description)
    const interestTerms = (user.interests || []).slice(0, 10);
    const clubWhere: any = { isActive: true };
    if (interestTerms.length) {
      clubWhere.OR = [
        { name: { contains: interestTerms[0], mode: 'insensitive' } },
        { description: { contains: interestTerms[0], mode: 'insensitive' } },
      ];
    }
    const recommendedClubs = await this.prisma.club.findMany({
      where: clubWhere,
      take: 6,
      orderBy: [{ engagementScore: 'desc' }, { createdAt: 'desc' }],
      include: {
        _count: { select: { members: true, events: true } },
      },
    });

    // Mentor suggestions: use existing mentors endpoint logic via direct query
    const mentors = await this.prisma.mentorProfile.findMany({
      where: { isActive: true, isVerified: true },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            bio: true,
            skills: true,
            interests: true,
            occupation: true,
            location: true,
          },
        },
      },
      take: 30,
      orderBy: { rating: 'desc' },
    });

    const myInterests = new Set(user.interests || []);
    const mySkills = new Set(user.skills || []);
    const mentorSuggestions = mentors
      .map((m) => {
        const mentorSkills = new Set(m.user.skills || []);
        const mentorInterests = new Set(m.user.interests || []);
        const skillOverlap = [...mentorSkills].filter((s) => mySkills.has(s)).length;
        const interestOverlap = [...mentorInterests].filter((i) => myInterests.has(i)).length;
        const score = skillOverlap * 2 + interestOverlap;
        return {
          id: m.user.id,
          firstName: m.user.firstName,
          lastName: m.user.lastName,
          profileImage: m.user.profileImage,
          bio: m.user.bio,
          occupation: m.user.occupation,
          location: m.user.location,
          rating: m.rating,
          expertise: m.user.skills || [],
          matchScore: score,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 6);

    // Upcoming events
    const upcomingEvents = await this.prisma.event.findMany({
      where: { status: 'UPCOMING', startDate: { gte: now, lte: in30Days } },
      take: 6,
      orderBy: { startDate: 'asc' },
      include: {
        club: { select: { id: true, name: true, logo: true } },
        _count: { select: { attendees: true } },
      },
    });

    // Get student goals
    const goals = await this.prisma.studentGoal.findMany({
      where: {
        userId: user.id,
        status: {
          in: ['PENDING', 'IN_PROGRESS'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    return {
      goals: {
        currentGoals: goals.map((goal) => ({
          id: goal.id,
          title: goal.title,
          description: goal.description,
          status: goal.status,
          targetDate: goal.targetDate,
          createdAt: goal.createdAt,
        })),
      },
      recommendations: {
        clubs: recommendedClubs,
        mentors: mentorSuggestions,
      },
      upcomingEvents,
      progress: {
        educationLevel: user.educationLevel,
        clubsJoined: clubsCount,
        eventsAttended: eventsAttendedCount,
        mentorshipSessions: mentorshipCount,
        activeDaysLast30: activeDays.size,
        // Academic progress metrics
        coursesEnrolled: coursesCount,
        assignmentsCompleted: assignmentsCompletedCount,
        studySessionsLogged: studySessionsCount,
        studyHoursLogged: studyHours,
        academicEventsCreated: academicEventsCount,
        // Overall engagement
        engagementScore,
        engagementLevel,
      },
    };
  }

  async getGoals(userId: string) {
    return this.prisma.studentGoal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createGoal(userId: string, dto: any) {
    return this.prisma.studentGoal.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description || null,
        status: dto.status || 'PENDING',
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
      },
    });
  }

  async updateGoal(userId: string, goalId: string, dto: any) {
    const existing = await this.prisma.studentGoal.findFirst({
      where: { id: goalId, userId },
    });

    if (!existing) {
      throw new NotFoundException('Goal not found');
    }

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
        data.completedAt = new Date();
      }
    }
    if (dto.targetDate !== undefined) {
      data.targetDate = dto.targetDate ? new Date(dto.targetDate) : null;
    }

    return this.prisma.studentGoal.update({
      where: { id: goalId },
      data,
    });
  }

  async deleteGoal(userId: string, goalId: string) {
    const existing = await this.prisma.studentGoal.findFirst({
      where: { id: goalId, userId },
    });

    if (!existing) {
      throw new NotFoundException('Goal not found');
    }

    await this.prisma.studentGoal.delete({
      where: { id: goalId },
    });

    return { message: 'Goal deleted successfully' };
  }

  // ========== COURSE MANAGEMENT ==========

  async createCourse(userId: string, data: any) {
    // Check for duplicate course (same course code for same user and academic year)
    const duplicate = await this.prisma.course.findFirst({
      where: {
        userId,
        courseCode: data.courseCode,
        academicYear: data.academicYear || null,
        status: {
          in: ['ACTIVE', 'COMPLETED'], // Allow duplicates only if dropped
        },
      },
    });

    if (duplicate) {
      throw new BadRequestException(
        `You already have a course with code "${data.courseCode}"${data.academicYear ? ` for ${data.academicYear}` : ''}. Please use a different code or edit the existing course.`,
      );
    }

    return this.prisma.course.create({
      data: {
        ...data,
        userId,
        status: data.status || 'ACTIVE',
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
      include: {
        grades: true,
        assignments: {
          where: {
            status: {
              in: ['NOT_STARTED', 'IN_PROGRESS'],
            },
          },
        },
        _count: {
          select: {
            grades: true,
            assignments: true,
          },
        },
      },
    });
  }

  async getCourses(userId: string, status?: string) {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    return this.prisma.course.findMany({
      where,
      include: {
        grades: {
          orderBy: { gradedAt: 'desc' },
        },
        assignments: {
          orderBy: { dueDate: 'asc' },
        },
        _count: {
          select: {
            grades: true,
            assignments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getCourseById(userId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        userId,
      },
      include: {
        grades: {
          orderBy: { gradedAt: 'desc' },
        },
        assignments: {
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  async updateCourse(userId: string, courseId: string, data: any) {
    const course = await this.getCourseById(userId, courseId);

    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
      include: {
        grades: true,
        assignments: true,
      },
    });
  }

  async deleteCourse(userId: string, courseId: string) {
    await this.getCourseById(userId, courseId);
    await this.prisma.course.delete({ where: { id: courseId } });
    return { message: 'Course deleted successfully' };
  }

  // ========== COURSE GRADES ==========

  async addCourseGrade(userId: string, courseId: string, data: any) {
    await this.getCourseById(userId, courseId);

    return this.prisma.courseGrade.create({
      data: {
        ...data,
        courseId,
        maxGrade: data.maxGrade || 100,
        gradedAt: data.gradedAt ? new Date(data.gradedAt) : new Date(),
      },
    });
  }

  async updateCourseGrade(userId: string, courseId: string, gradeId: string, data: any) {
    await this.getCourseById(userId, courseId);

    const grade = await this.prisma.courseGrade.findFirst({
      where: {
        id: gradeId,
        courseId,
      },
    });

    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    return this.prisma.courseGrade.update({
      where: { id: gradeId },
      data: {
        ...data,
        gradedAt: data.gradedAt ? new Date(data.gradedAt) : undefined,
      },
    });
  }

  async deleteCourseGrade(userId: string, courseId: string, gradeId: string) {
    await this.getCourseById(userId, courseId);

    const grade = await this.prisma.courseGrade.findFirst({
      where: {
        id: gradeId,
        courseId,
      },
    });

    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    await this.prisma.courseGrade.delete({ where: { id: gradeId } });
    return { message: 'Grade deleted successfully' };
  }

  // ========== ASSIGNMENT MANAGEMENT ==========

  async createAssignment(userId: string, data: any) {
    if (data.courseId) {
      await this.getCourseById(userId, data.courseId);
    }

    return this.prisma.assignment.create({
      data: {
        ...data,
        userId,
        dueDate: new Date(data.dueDate),
        status: data.status || 'NOT_STARTED',
        priority: data.priority || 1,
      },
      include: {
        course: {
          select: {
            id: true,
            courseCode: true,
            courseName: true,
          },
        },
      },
    });
  }

  async getAssignments(userId: string, courseId?: string, status?: string) {
    const where: any = { userId };
    if (courseId) {
      where.courseId = courseId;
    }
    if (status) {
      where.status = status;
    }

    return this.prisma.assignment.findMany({
      where,
      include: {
        course: {
          select: {
            id: true,
            courseCode: true,
            courseName: true,
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    });
  }

  async getAssignmentById(userId: string, assignmentId: string) {
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        userId,
      },
      include: {
        course: {
          select: {
            id: true,
            courseCode: true,
            courseName: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    return assignment;
  }

  async updateAssignment(userId: string, assignmentId: string, data: any) {
    await this.getAssignmentById(userId, assignmentId);

    if (data.courseId) {
      await this.getCourseById(userId, data.courseId);
    }

    return this.prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        completedAt: data.status === 'SUBMITTED' || data.status === 'GRADED' ? new Date() : undefined,
      },
      include: {
        course: {
          select: {
            id: true,
            courseCode: true,
            courseName: true,
          },
        },
      },
    });
  }

  async deleteAssignment(userId: string, assignmentId: string) {
    await this.getAssignmentById(userId, assignmentId);
    await this.prisma.assignment.delete({ where: { id: assignmentId } });
    return { message: 'Assignment deleted successfully' };
  }

  // ========== ACADEMIC CALENDAR ==========

  async createCalendarEvent(userId: string, data: any) {
    return this.prisma.academicCalendar.create({
      data: {
        ...data,
        userId,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        reminderAt: data.reminderAt ? new Date(data.reminderAt) : undefined,
        isSystem: data.isSystem || false,
      },
    });
  }

  async getCalendarEvents(userId: string, startDate?: string, endDate?: string) {
    const where: any = {
      OR: [
        { userId },
        { isSystem: true },
      ],
    };

    if (startDate && endDate) {
      where.AND = [
        { startDate: { gte: new Date(startDate) } },
        { startDate: { lte: new Date(endDate) } },
      ];
    } else if (startDate) {
      where.startDate = { gte: new Date(startDate) };
    }

    return this.prisma.academicCalendar.findMany({
      where,
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  async getCalendarEventById(userId: string, eventId: string) {
    const event = await this.prisma.academicCalendar.findFirst({
      where: {
        id: eventId,
        OR: [
          { userId },
          { isSystem: true },
        ],
      },
    });

    if (!event) {
      throw new NotFoundException('Calendar event not found');
    }

    return event;
  }

  async updateCalendarEvent(userId: string, eventId: string, data: any) {
    const event = await this.getCalendarEventById(userId, eventId);

    // Only allow updating user's own events (not system events)
    if (event.isSystem && event.userId !== userId) {
      throw new BadRequestException('Cannot update system events');
    }

    return this.prisma.academicCalendar.update({
      where: { id: eventId },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        reminderAt: data.reminderAt ? new Date(data.reminderAt) : undefined,
      },
    });
  }

  async deleteCalendarEvent(userId: string, eventId: string) {
    const event = await this.getCalendarEventById(userId, eventId);

    // Only allow deleting user's own events (not system events)
    if (event.isSystem && event.userId !== userId) {
      throw new BadRequestException('Cannot delete system events');
    }

    await this.prisma.academicCalendar.delete({ where: { id: eventId } });
    return { message: 'Calendar event deleted successfully' };
  }

  // ========== STUDY SESSIONS ==========

  async createStudySession(userId: string, data: any) {
    if (data.courseId) {
      await this.getCourseById(userId, data.courseId);
    }

    const startTime = new Date(data.startTime);
    const endTime = data.endTime ? new Date(data.endTime) : new Date();
    let duration = data.duration;

    // Calculate duration if not provided
    if (!duration && endTime) {
      duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // minutes
    }

    return this.prisma.studySession.create({
      data: {
        ...data,
        userId,
        startTime,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        duration: duration || 0,
      },
      include: {
        course: {
          select: {
            id: true,
            courseCode: true,
            courseName: true,
          },
        },
      },
    });
  }

  async getStudySessions(userId: string, courseId?: string, startDate?: string, endDate?: string) {
    const where: any = { userId };
    if (courseId) {
      where.courseId = courseId;
    }
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) {
        where.startTime.gte = new Date(startDate);
      }
      if (endDate) {
        where.startTime.lte = new Date(endDate);
      }
    }

    return this.prisma.studySession.findMany({
      where,
      include: {
        course: {
          select: {
            id: true,
            courseCode: true,
            courseName: true,
          },
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    });
  }

  async getStudySessionStats(userId: string, startDate?: string, endDate?: string) {
    const where: any = { userId };
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) {
        where.startTime.gte = new Date(startDate);
      }
      if (endDate) {
        where.startTime.lte = new Date(endDate);
      }
    }

    const sessions = await this.prisma.studySession.findMany({
      where,
      include: {
        course: {
          select: {
            id: true,
            courseCode: true,
            courseName: true,
          },
        },
      },
    });

    const totalMinutes = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
    const totalHours = totalMinutes / 60;
    const sessionCount = sessions.length;

    // Group by course
    const byCourse = sessions.reduce((acc: any, session) => {
      const key = session.courseId || 'other';
      if (!acc[key]) {
        acc[key] = {
          course: session.course,
          sessions: 0,
          minutes: 0,
        };
      }
      acc[key].sessions += 1;
      acc[key].minutes += session.duration || 0;
      return acc;
    }, {});

    return {
      totalSessions: sessionCount,
      totalMinutes,
      totalHours: Math.round(totalHours * 100) / 100,
      byCourse: Object.values(byCourse).map((item: any) => ({
        ...item,
        hours: Math.round((item.minutes / 60) * 100) / 100,
      })),
    };
  }

  async updateStudySession(userId: string, sessionId: string, data: any) {
    const session = await this.prisma.studySession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      throw new NotFoundException('Study session not found');
    }

    if (data.courseId) {
      await this.getCourseById(userId, data.courseId);
    }

    const startTime = data.startTime ? new Date(data.startTime) : session.startTime;
    const endTime = data.endTime ? new Date(data.endTime) : session.endTime;
    let duration = data.duration;

    // Recalculate duration if times changed
    if (!duration && (data.startTime || data.endTime) && endTime) {
      duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    }

    return this.prisma.studySession.update({
      where: { id: sessionId },
      data: {
        ...data,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        duration,
      },
      include: {
        course: {
          select: {
            id: true,
            courseCode: true,
            courseName: true,
          },
        },
      },
    });
  }

  async deleteStudySession(userId: string, sessionId: string) {
    const session = await this.prisma.studySession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      throw new NotFoundException('Study session not found');
    }

    await this.prisma.studySession.delete({ where: { id: sessionId } });
    return { message: 'Study session deleted successfully' };
  }

  // ========== ANALYTICS ==========

  async getAcademicAnalytics(userId: string, startDate?: string, endDate?: string) {
    // Get all courses
    const courses = await this.prisma.course.findMany({
      where: { userId },
      include: {
        grades: {
          orderBy: { gradedAt: 'asc' },
        },
        assignments: true,
      },
    });

    // Get study sessions
    const sessionsWhere: any = { userId };
    if (startDate || endDate) {
      sessionsWhere.startTime = {};
      if (startDate) {
        sessionsWhere.startTime.gte = new Date(startDate);
      }
      if (endDate) {
        sessionsWhere.startTime.lte = new Date(endDate);
      }
    }

    const studySessions = await this.prisma.studySession.findMany({
      where: sessionsWhere,
      include: {
        course: {
          select: {
            id: true,
            courseCode: true,
            courseName: true,
          },
        },
      },
    });

    // Get assignments
    const assignmentsWhere: any = { userId };
    if (startDate || endDate) {
      assignmentsWhere.createdAt = {};
      if (startDate) {
        assignmentsWhere.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        assignmentsWhere.createdAt.lte = new Date(endDate);
      }
    }

    const assignments = await this.prisma.assignment.findMany({
      where: assignmentsWhere,
    });

    // Calculate grade trends over time
    const gradeTrends = courses.map((course) => {
      const gradesByDate: { [key: string]: number[] } = {};
      
      course.grades.forEach((grade) => {
        if (grade.gradedAt) {
          const date = new Date(grade.gradedAt);
          const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          if (!gradesByDate[dateKey]) {
            gradesByDate[dateKey] = [];
          }
          const percentage = (grade.grade / grade.maxGrade) * 100;
          gradesByDate[dateKey].push(percentage);
        }
      });

      const trendData = Object.entries(gradesByDate)
        .map(([date, percentages]) => ({
          date,
          average: percentages.reduce((sum, val) => sum + val, 0) / percentages.length,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Calculate course average
      let courseAverage: number | null = null;
      if (course.grades.length > 0) {
        const totalWeight = course.grades.reduce((sum, g) => sum + (g.weight || 100), 0);
        const weightedSum = course.grades.reduce((sum, g) => {
          const percentage = (g.grade / g.maxGrade) * 100;
          return sum + percentage * (g.weight || 100);
        }, 0);
        courseAverage = totalWeight > 0 ? weightedSum / totalWeight : null;
      }

      return {
        courseId: course.id,
        courseCode: course.courseCode,
        courseName: course.courseName,
        average: courseAverage,
        trendData,
        totalGrades: course.grades.length,
      };
    });

    // Study hours by day (last 30 days or date range)
    const studyHoursByDay: { [key: string]: number } = {};
    const thirtyDaysAgo = startDate ? new Date(startDate) : new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    studySessions.forEach((session) => {
      const date = new Date(session.startTime);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (!studyHoursByDay[dateKey]) {
        studyHoursByDay[dateKey] = 0;
      }
      studyHoursByDay[dateKey] += session.duration || 0;
    });

    const studyHoursTrend = Object.entries(studyHoursByDay)
      .map(([date, minutes]) => ({
        date,
        hours: Math.round((minutes / 60) * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Assignment completion rate
    const totalAssignments = assignments.length;
    const completedAssignments = assignments.filter((a) => 
      ['SUBMITTED', 'GRADED'].includes(a.status)
    ).length;
    const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;

    // Study hours by course
    const studyHoursByCourse: { [key: string]: { course: any; hours: number } } = {};
    studySessions.forEach((session) => {
      const key = session.courseId || 'other';
      if (!studyHoursByCourse[key]) {
        studyHoursByCourse[key] = {
          course: session.course || { id: 'other', courseCode: 'Other', courseName: 'Other Topics' },
          hours: 0,
        };
      }
      studyHoursByCourse[key].hours += (session.duration || 0) / 60;
    });

    const studyHoursByCourseData = Object.values(studyHoursByCourse).map((item) => ({
      courseCode: item.course.courseCode,
      courseName: item.course.courseName,
      hours: Math.round(item.hours * 100) / 100,
    }));

    // GPA calculation (if grades are on 4.0 scale)
    const gpaCourses = courses.filter((c) => c.finalGrade !== null && c.credits);
    let gpa: number | null = null;
    if (gpaCourses.length > 0) {
      const totalPoints = gpaCourses.reduce((sum, c) => {
        // Assuming finalGrade is on 0-100 scale, convert to 4.0
        const gradePoints = (c.finalGrade! / 100) * 4;
        return sum + gradePoints * (c.credits || 1);
      }, 0);
      const totalCredits = gpaCourses.reduce((sum, c) => sum + (c.credits || 1), 0);
      gpa = totalCredits > 0 ? totalPoints / totalCredits : null;
    }

    return {
      gradeTrends,
      studyHoursTrend,
      studyHoursByCourse: studyHoursByCourseData,
      assignmentStats: {
        total: totalAssignments,
        completed: completedAssignments,
        pending: assignments.filter((a) => 
          ['NOT_STARTED', 'IN_PROGRESS'].includes(a.status)
        ).length,
        overdue: assignments.filter((a) => {
          if (['SUBMITTED', 'GRADED'].includes(a.status)) return false;
          return new Date(a.dueDate) < new Date();
        }).length,
        completionRate: Math.round(completionRate * 100) / 100,
      },
      gpa: gpa ? Math.round(gpa * 100) / 100 : null,
      totalStudyHours: studySessions.reduce((sum, s) => sum + ((s.duration || 0) / 60), 0),
      totalCourses: courses.length,
      activeCourses: courses.filter((c) => c.status === 'ACTIVE').length,
    };
  }

  // ========== NOTIFICATIONS ==========

  async checkAndNotifyUpcomingDeadlines() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    // Check assignments due in the next 24 hours
    const upcomingAssignments = await this.prisma.assignment.findMany({
      where: {
        dueDate: {
          gte: now,
          lte: tomorrow,
        },
        status: {
          in: ['NOT_STARTED', 'IN_PROGRESS'],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            expoPushToken: true,
          },
        },
        course: {
          select: {
            courseCode: true,
            courseName: true,
          },
        },
      },
    });

    // Send notifications for upcoming assignments
    for (const assignment of upcomingAssignments) {
      const hoursUntilDue = Math.floor(
        (new Date(assignment.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60)
      );

      let title = 'Assignment Due Soon';
      let message = `${assignment.title} is due `;
      
      if (hoursUntilDue < 1) {
        message += 'in less than an hour';
      } else if (hoursUntilDue < 24) {
        message += `in ${hoursUntilDue} hour${hoursUntilDue > 1 ? 's' : ''}`;
      } else {
        message += 'tomorrow';
      }

      if (assignment.course) {
        message += ` (${assignment.course.courseCode})`;
      }

      await this.notificationsService.create(assignment.userId, {
        title,
        message,
        type: 'ASSIGNMENT_DUE',
        link: `/students/assignments/${assignment.id}`,
      });
    }

    // Check calendar events with reminders
    const upcomingCalendarEvents = await this.prisma.academicCalendar.findMany({
      where: {
        reminderAt: {
          gte: now,
          lte: tomorrow,
        },
        OR: [
          { userId: null }, // System events
          { userId: { not: null } }, // User events
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            expoPushToken: true,
          },
        },
      },
    });

    // Send notifications for calendar events
    for (const event of upcomingCalendarEvents) {
      if (event.isSystem && !event.userId) {
        // System event - notify all students
        const students = await this.prisma.user.findMany({
          where: {
            isStudent: true,
            isActive: true,
          },
          select: {
            id: true,
          },
        });

        for (const student of students) {
          await this.notificationsService.create(student.id, {
            title: event.title,
            message: `Reminder: ${event.title}${event.startDate ? ` on ${new Date(event.startDate).toLocaleDateString()}` : ''}`,
            type: event.eventType === 'EXAM' ? 'EXAM_REMINDER' : 'ACADEMIC_DEADLINE',
            link: '/students/calendar',
          });
        }
      } else if (event.userId) {
        // User-specific event
        await this.notificationsService.create(event.userId, {
          title: event.title,
          message: `Reminder: ${event.title}${event.startDate ? ` on ${new Date(event.startDate).toLocaleDateString()}` : ''}`,
          type: event.eventType === 'EXAM' ? 'EXAM_REMINDER' : 'ACADEMIC_DEADLINE',
          link: '/students/calendar',
        });
      }
    }

    return {
      assignmentsNotified: upcomingAssignments.length,
      calendarEventsNotified: upcomingCalendarEvents.length,
    };
  }
}

