import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventType, EventStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async findAll(filters?: { type?: EventType; status?: EventStatus; clubId?: string; limit?: number }) {
    return this.prisma.event.findMany({
      where: {
        ...(filters?.type && { type: filters.type }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.clubId && { clubId: filters.clubId }),
      },
      ...(filters?.limit && { take: filters.limit }),
      include: {
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        club: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            attendees: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            bio: true,
          },
        },
        club: {
          select: {
            id: true,
            name: true,
            description: true,
            image: true,
          },
        },
        attendees: {
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

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  async create(userId: string, data: any) {
    // Validate payment fields
    if (data.isPaid && (!data.price || data.price <= 0)) {
      throw new BadRequestException('Price is required for paid events');
    }
    if (!data.isPaid) {
      // Clear payment fields if event is free
      data.price = null;
      data.currency = null;
      data.paymentLink = null;
    }

    return this.prisma.event.create({
      data: {
        ...data,
        organizerId: userId,
        startDate: new Date(data.startDate),
        ...(data.endDate && { endDate: new Date(data.endDate) }),
        isPaid: data.isPaid || false,
        price: data.isPaid ? data.price : null,
        currency: data.isPaid ? (data.currency || 'KES') : null,
        paymentLink: data.isPaid ? data.paymentLink : null,
      },
      include: {
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        club: {
          select: {
            id: true,
            name: true,
            image: true,
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

  async rsvp(userId: string, eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        attendees: {
          where: { id: userId },
        },
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.maxAttendees > 0 && event.attendees.length >= event.maxAttendees) {
      throw new ForbiddenException('Event is full');
    }

    if (event.attendees.length > 0) {
      throw new ForbiddenException('Already RSVPed to this event');
    }

    const updatedEvent = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        attendees: {
          connect: { id: userId },
        },
      },
      include: {
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        attendees: {
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

    // Create notification for event organizer
    if (event.organizerId !== userId) {
      await this.notificationsService.create(event.organizerId, {
        title: 'New RSVP',
        message: `Someone RSVPed to your event: ${event.title}`,
        type: 'EVENT_REMINDER' as any,
        eventId: eventId,
      });
    }

    return updatedEvent;
  }

  async cancelRsvp(userId: string, eventId: string) {
    return this.prisma.event.update({
      where: { id: eventId },
      data: {
        attendees: {
          disconnect: { id: userId },
        },
      },
    });
  }

  async getAttendees(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        attendees: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            bio: true,
            occupation: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event.attendees;
  }

  async createClubEvent(userId: string, clubId: string, data: any, userRole?: string) {
    // Check if club exists
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      include: {
        memberships: {
          where: { userId },
          select: { role: true },
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

    // Check user role - Super Admin can always create events
    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    
    // Check if user is a manager or lead of the club
    const isManager = club.managers.length > 0;
    const isLead = club.lead?.id === userId;
    
    // Check if user has CLUB_MANAGER role
    const isClubManagerRole = userRole === 'CLUB_MANAGER';
    
    // Check if user is a club lead (has LEAD role in membership)
    const membership = club.memberships[0];
    const isClubLead = membership?.role === 'LEAD' || membership?.role === 'CO_LEAD';

    // Only allow: Super Admin, Club Managers (role), Club Managers (assigned), or Club Leads
    if (!isSuperAdmin && !isClubManagerRole && !isManager && !isLead && !isClubLead) {
      throw new ForbiddenException('Only Super Admins, Club Managers, and Club Leads can create events. Event creation is restricted to the admin panel.');
    }

    // Validate payment fields
    if (data.isPaid && (!data.price || data.price <= 0)) {
      throw new BadRequestException('Price is required for paid events');
    }
    if (!data.isPaid) {
      // Clear payment fields if event is free
      data.price = null;
      data.currency = null;
      data.paymentLink = null;
    }

    // Create event with club association
    return this.prisma.event.create({
      data: {
        ...data,
        organizerId: userId,
        clubId: clubId,
        startDate: new Date(data.startDate),
        ...(data.endDate && { endDate: new Date(data.endDate) }),
        isPaid: data.isPaid || false,
        price: data.isPaid ? data.price : null,
        currency: data.isPaid ? (data.currency || 'KES') : null,
        paymentLink: data.isPaid ? data.paymentLink : null,
      },
      include: {
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        club: {
          select: {
            id: true,
            name: true,
            image: true,
            logo: true,
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
}

