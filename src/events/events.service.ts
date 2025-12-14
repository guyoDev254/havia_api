import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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
    return this.prisma.event.create({
      data: {
        ...data,
        organizerId: userId,
        startDate: new Date(data.startDate),
        ...(data.endDate && { endDate: new Date(data.endDate) }),
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
}

