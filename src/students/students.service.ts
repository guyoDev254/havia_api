import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EducationLevel, ApplicationStatus, ResourceType } from '@prisma/client';
import { StudentOnboardingDto } from './dto/student-onboarding.dto';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.studentProfile.findUnique({
      where: { userId },
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

    // Progress inputs
    const [clubsCount, eventsAttendedCount, mentorshipCount, recentActivity] = await Promise.all([
      this.prisma.clubMember.count({ where: { userId } }),
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
    ]);

    // Engagement score (internal)
    // weights: event 5, club 3, mentorship 7, resource 2 (not tracked yet), consistency bonus 10/week
    const activeDays = new Set(recentActivity.map((a) => a.createdAt.toISOString().slice(0, 10)));
    const weeksWithActivity = Math.ceil(activeDays.size / 7);
    const engagementScore =
      eventsAttendedCount * 5 +
      clubsCount * 3 +
      mentorshipCount * 7 +
      weeksWithActivity * 10;

    const engagementLevel =
      engagementScore >= 120 ? 'HIGH' : engagementScore >= 60 ? 'MEDIUM' : 'LOW';

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

    return {
      goals: {
        currentGoals: [], // TODO: implement persisted goals
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
        engagementScore,
        engagementLevel,
      },
    };
  }
}

