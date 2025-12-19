import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClubResourceType, ClubRole } from '@prisma/client';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';

@Injectable()
export class ResourcesService {
  constructor(private prisma: PrismaService) {}

  async create(clubId: string, userId: string, data: CreateResourceDto) {
    // Check if club exists and user has permission
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

    // Check permissions: Lead, Admin, Manager, or Moderator can create resources
    const isLead = club.lead?.id === userId || club.createdBy === userId;
    const isManager = club.managers.length > 0;
    const membership = club.memberships[0];
    const isAdmin = membership && (membership.role === ClubRole.ADMIN || membership.role === ClubRole.LEAD);
    const isModerator = membership && membership.role === ClubRole.MODERATOR;

    if (!isLead && !isManager && !isAdmin && !isModerator) {
      throw new ForbiddenException('Only club leads, admins, managers, or moderators can create resources');
    }

    // Validate that at least url or fileUrl is provided
    if (!data.url && !data.fileUrl) {
      throw new BadRequestException('Either url or fileUrl must be provided');
    }

    const resource = await this.prisma.clubResource.create({
      data: {
        ...data,
        clubId,
        createdBy: userId,
        tags: data.tags || [],
        accessibleToRoles: data.accessibleToRoles || [],
        isPinned: data.isPinned || false,
        isPublic: data.isPublic || false,
      },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
    });

    return resource;
  }

  async findAll(clubId: string, userId?: string, type?: ClubResourceType, category?: string) {
    // Get user's membership to check access
    const membership = userId ? await this.prisma.clubMember.findUnique({
      where: {
        userId_clubId: {
          userId,
          clubId,
        },
      },
    }) : null;

    const where: any = { clubId };

    if (type) where.type = type;
    if (category) where.category = category;

    const resources = await this.prisma.clubResource.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Filter resources based on access control
    if (membership) {
      return resources.filter(resource => {
        // Public resources are accessible to all members
        if (resource.isPublic) return true;
        
        // If no role restrictions, accessible to all members
        if (!resource.accessibleToRoles || resource.accessibleToRoles.length === 0) return true;
        
        // Check if user's role is in accessible roles
        return resource.accessibleToRoles.includes(membership.role);
      });
    }

    // Non-authenticated users can only see public resources
    return resources.filter(resource => resource.isPublic);
  }

  async findOne(id: string, userId?: string) {
    const resource = await this.prisma.clubResource.findUnique({
      where: { id },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            logo: true,
            banner: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    // Check access permissions
    if (userId) {
      const membership = await this.prisma.clubMember.findUnique({
        where: {
          userId_clubId: {
            userId,
            clubId: resource.clubId,
          },
        },
      });

      if (!membership) {
        throw new ForbiddenException('You must be a member of the club to access resources');
      }

      // Check role-based access
      if (!resource.isPublic && resource.accessibleToRoles && resource.accessibleToRoles.length > 0) {
        if (!resource.accessibleToRoles.includes(membership.role)) {
          throw new ForbiddenException('You do not have permission to access this resource');
        }
      }
    } else if (!resource.isPublic) {
      throw new ForbiddenException('This resource is not publicly accessible');
    }

    // Increment view count
    await this.prisma.clubResource.update({
      where: { id },
      data: {
        viewCount: { increment: 1 },
      },
    });

    return {
      ...resource,
      viewCount: resource.viewCount + 1,
    };
  }

  async update(id: string, userId: string, data: UpdateResourceDto) {
    const resource = await this.prisma.clubResource.findUnique({
      where: { id },
      include: {
        club: {
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
        },
      },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    // Check permissions
    const isCreator = resource.createdBy === userId;
    const club = resource.club;
    const isLead = club.lead?.id === userId || club.createdBy === userId;
    const isManager = club.managers.length > 0;
    const membership = club.memberships[0];
    const isAdmin = membership && (membership.role === ClubRole.ADMIN || membership.role === ClubRole.LEAD);
    const isModerator = membership && membership.role === ClubRole.MODERATOR;

    if (!isCreator && !isLead && !isManager && !isAdmin && !isModerator) {
      throw new ForbiddenException('Only resource creator, club leads, admins, managers, or moderators can update resources');
    }

    return this.prisma.clubResource.update({
      where: { id },
      data: {
        ...data,
        tags: data.tags !== undefined ? data.tags : undefined,
        accessibleToRoles: data.accessibleToRoles !== undefined ? data.accessibleToRoles : undefined,
      },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
        creator: {
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

  async remove(id: string, userId: string) {
    const resource = await this.prisma.clubResource.findUnique({
      where: { id },
      include: {
        club: {
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
        },
      },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    // Check permissions
    const isCreator = resource.createdBy === userId;
    const club = resource.club;
    const isLead = club.lead?.id === userId || club.createdBy === userId;
    const isManager = club.managers.length > 0;
    const membership = club.memberships[0];
    const isAdmin = membership && (membership.role === ClubRole.ADMIN || membership.role === ClubRole.LEAD);

    if (!isCreator && !isLead && !isManager && !isAdmin) {
      throw new ForbiddenException('Only resource creator, club leads, admins, or managers can delete resources');
    }

    await this.prisma.clubResource.delete({
      where: { id },
    });

    return { message: 'Resource deleted successfully' };
  }

  async recordDownload(id: string, userId: string) {
    const resource = await this.prisma.clubResource.findUnique({
      where: { id },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    // Check if user is a member of the club
    const membership = await this.prisma.clubMember.findUnique({
      where: {
        userId_clubId: {
          userId,
          clubId: resource.clubId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You must be a member of the club to download resources');
    }

    // Increment download count
    await this.prisma.clubResource.update({
      where: { id },
      data: {
        downloadCount: { increment: 1 },
      },
    });

    return { message: 'Download recorded' };
  }
}

