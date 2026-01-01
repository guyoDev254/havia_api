import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventType, EventStatus, EventSource, EventLocationType, RegistrationStatus, PaymentStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { MpesaService } from '../payments/mpesa.service';
import { EmailService } from '../common/services/email.service';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private mpesaService: MpesaService,
    private emailService: EmailService,
  ) {}

  async findAll(filters?: { 
    type?: EventType; 
    status?: EventStatus; 
    clubId?: string; 
    limit?: number;
    userId?: string; // For visibility filtering
  }) {
    // Get user's club memberships if userId provided
    let userClubIds: string[] = [];
    if (filters?.userId) {
      const memberships = await this.prisma.clubMember.findMany({
        where: { userId: filters.userId },
        select: { clubId: true },
      });
      userClubIds = memberships.map(m => m.clubId);
    }

    const events = await this.prisma.event.findMany({
      where: {
        ...(filters?.type && { type: filters.type }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.clubId && { clubId: filters.clubId }),
        // Visibility rules:
        // - Platform events: always visible
        // - Club events: visible if isPublic=true OR user is a member of the club
        ...(filters?.userId && {
          OR: [
            { source: 'PLATFORM' },
            { source: 'CLUB', isPublic: true },
            { source: 'CLUB', clubId: { in: userClubIds } },
          ],
        }),
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
        registrations: filters?.userId ? {
          where: { userId: filters.userId },
          select: {
            id: true,
            quantity: true,
            status: true,
            paymentStatus: true,
          },
        } : false,
        _count: {
          select: {
            attendees: true,
            registrations: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    // Calculate total attendees by summing quantities from confirmed registrations
    const eventsWithAttendeeCount = await Promise.all(
      events.map(async (event) => {
        const confirmedRegistrations = await this.prisma.eventRegistration.findMany({
          where: {
            eventId: event.id,
            status: 'CONFIRMED',
          },
          select: {
            quantity: true,
          },
        });

        const totalAttendees = confirmedRegistrations.reduce((sum, reg) => sum + (reg.quantity || 1), 0);

        return {
          ...event,
          _count: {
            ...event._count,
            attendees: totalAttendees, // Override with calculated count
          },
        };
      })
    );

    return eventsWithAttendeeCount;
  }

  async findOne(id: string, userId?: string) {
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
        registrations: userId ? {
          where: { userId },
          select: {
            id: true,
            quantity: true,
            status: true,
            paymentStatus: true,
            receiptNumber: true,
            paymentAmount: true,
            createdAt: true,
          },
        } : false,
        _count: {
          select: {
            attendees: true,
            registrations: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Calculate total attendees by summing quantities from confirmed registrations
    const confirmedRegistrations = await this.prisma.eventRegistration.findMany({
      where: {
        eventId: event.id,
        status: 'CONFIRMED',
      },
      select: {
        quantity: true,
      },
    });

    const totalAttendees = confirmedRegistrations.reduce((sum, reg) => sum + (reg.quantity || 1), 0);

    // Override the attendees count with calculated total
    event._count.attendees = totalAttendees;

    // Check visibility for club events
    if (event.source === 'CLUB' && !event.isPublic && userId) {
      const isMember = await this.prisma.clubMember.findFirst({
        where: {
          clubId: event.clubId!,
          userId: userId,
        },
      });

      if (!isMember) {
        throw new ForbiddenException('This event is only visible to club members');
      }
    }

    return event;
  }

  async create(userId: string, data: any) {
    // Set defaults
    const source = data.source || 'PLATFORM';
    // Normalize locationType to uppercase if provided, otherwise derive from isOnline
    let locationType = data.locationType;
    if (locationType) {
      locationType = locationType.toUpperCase() as 'ONLINE' | 'PHYSICAL' | 'HYBRID';
    } else {
      locationType = data.isOnline ? 'ONLINE' : 'PHYSICAL';
    }
    const isPublic = data.isPublic !== undefined ? data.isPublic : (source === 'PLATFORM' ? true : false);

    // Validate location fields based on locationType
    if (locationType === 'PHYSICAL' || locationType === 'HYBRID') {
      if (!data.location) {
        throw new BadRequestException('Location is required for physical or hybrid events');
      }
    }
    if (locationType === 'ONLINE' || locationType === 'HYBRID') {
      if (!data.onlineLink) {
        throw new BadRequestException('Online link is required for online or hybrid events');
      }
    }

    // Validate payment fields
    if (data.isPaid && (!data.price || data.price <= 0)) {
      throw new BadRequestException('Price is required for paid events');
    }
    if (!data.isPaid) {
      // Clear payment fields if event is free
      data.price = null;
      data.currency = null;
    }

    // Validate club events
    if (source === 'CLUB' && !data.clubId) {
      throw new BadRequestException('Club ID is required for club events');
    }

    return this.prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        image: data.image,
        banner: data.banner,
        type: data.type || 'OTHER',
        status: data.status || 'UPCOMING',
        source: source,
        locationType: locationType,
        startDate: new Date(data.startDate),
        ...(data.endDate && { endDate: new Date(data.endDate) }),
        ...(data.registrationDeadline && { registrationDeadline: new Date(data.registrationDeadline) }),
        location: data.location,
        onlineLink: data.onlineLink,
        maxAttendees: data.maxAttendees || 0,
        organizerId: userId,
        clubId: data.clubId,
        isPublic: isPublic,
        isPaid: data.isPaid || false,
        price: data.isPaid ? data.price : null,
        currency: data.isPaid ? (data.currency || 'KES') : null,
        tags: data.tags || [],
        speakers: data.speakers || [],
        agenda: data.agenda,
        requirements: data.requirements,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
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
            registrations: true,
          },
        },
      },
    });
  }

  /**
   * Register for an event (replaces simple RSVP)
   * Handles both free and paid events with M-Pesa integration
   * Supports multiple tickets per registration
   */
  async register(userId: string, eventId: string, phoneNumber?: string, quantity: number = 1) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        registrations: {
          where: { userId },
        },
        _count: {
          select: {
            registrations: {
              where: { status: 'CONFIRMED' },
            },
            attendees: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Validate quantity
    if (quantity < 1 || quantity > 10) {
      throw new BadRequestException('Quantity must be between 1 and 10 tickets');
    }

    // Check if already registered
    // Query all registrations (including CANCELLED) to handle unique constraint
    const allRegistrations = await this.prisma.eventRegistration.findMany({
      where: {
        eventId: eventId,
        userId: userId,
      },
    });

    const existingRegistration = allRegistrations.find(r => r.status !== 'CANCELLED');
    const cancelledRegistration = allRegistrations.find(r => r.status === 'CANCELLED');

    if (existingRegistration) {
      if (existingRegistration.status === 'CONFIRMED') {
        throw new ForbiddenException('You are already registered for this event. Please cancel your existing registration first to purchase more tickets.');
      }
      if (existingRegistration.status === 'PENDING') {
        throw new ForbiddenException('You have a pending registration for this event. Please complete payment or wait for confirmation.');
      }
    }

    // Check capacity - calculate total attendees by summing quantities from confirmed registrations
    const confirmedRegistrations = await this.prisma.eventRegistration.findMany({
      where: {
        eventId: eventId,
        status: 'CONFIRMED',
      },
      select: {
        quantity: true,
      },
    });
    const totalConfirmedAttendees = confirmedRegistrations.reduce((sum, reg) => sum + (reg.quantity || 1), 0);
    const availableSpots = event.maxAttendees > 0 ? event.maxAttendees - totalConfirmedAttendees : Infinity;
    if (event.maxAttendees > 0 && availableSpots < quantity) {
      throw new ForbiddenException(
        `Only ${availableSpots} ticket${availableSpots === 1 ? '' : 's'} available. You requested ${quantity}.`
      );
    }

    // Handle free events - instant confirmation
    if (!event.isPaid) {
      // If there's a cancelled registration, update it; otherwise create new
      let registration;
      if (cancelledRegistration) {
        registration = await this.prisma.eventRegistration.update({
          where: { id: cancelledRegistration.id },
          data: {
            quantity: quantity,
            status: 'CONFIRMED',
            cancelledAt: null,
            cancellationReason: null,
          },
        });
      } else {
        registration = await this.prisma.eventRegistration.create({
          data: {
            eventId: eventId,
            userId: userId,
            quantity: quantity,
            status: 'CONFIRMED',
          },
        });
      }

      // Add to attendees (for free events, add user once regardless of quantity)
      await this.prisma.event.update({
      where: { id: eventId },
      data: {
        attendees: {
          connect: { id: userId },
        },
      },
      });

      // Get user details for email
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true },
      });

      // Send ticket email and notification to user
      if (user) {
        await this.sendTicketEmail(user.email, user.firstName, user.lastName, event, registration, quantity);
        await this.notificationsService.create(userId, {
          title: 'Registration Confirmed',
          message: `You've successfully registered for "${event.title}" (${quantity} ticket${quantity > 1 ? 's' : ''})`,
          type: 'EVENT_REMINDER' as any,
          eventId: eventId,
        });
      }

      // Send notification to organizer
      if (event.organizerId !== userId) {
        await this.notificationsService.create(event.organizerId, {
          title: 'New Registration',
          message: `Someone registered for your event: ${event.title} (${quantity} ticket${quantity > 1 ? 's' : ''})`,
          type: 'EVENT_REMINDER' as any,
          eventId: eventId,
        });
      }

      return {
        registration,
        requiresPayment: false,
        message: 'Successfully registered for the event',
      };
    }

    // Handle paid events - require phone number and initiate M-Pesa
    if (!phoneNumber) {
      throw new BadRequestException('Phone number is required for paid events');
    }

    // Validate phone number format
    let formattedPhone = phoneNumber.replace(/\s+/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }

    if (!/^2547\d{8}$/.test(formattedPhone)) {
      throw new BadRequestException('Invalid phone number format. Must be 2547XXXXXXXX');
    }

    // Calculate total amount for all tickets
    const totalAmount = (event.price || 0) * quantity;

    // Create or update pending registration
    // If there's a cancelled registration, update it; otherwise create new
    let registration;
    if (cancelledRegistration) {
      registration = await this.prisma.eventRegistration.update({
        where: { id: cancelledRegistration.id },
        data: {
          quantity: quantity,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          phoneNumber: formattedPhone,
          paymentAmount: totalAmount,
          paymentCurrency: event.currency || 'KES',
          cancelledAt: null,
          cancellationReason: null,
        },
      });
    } else {
      registration = await this.prisma.eventRegistration.create({
        data: {
          eventId: eventId,
          userId: userId,
          quantity: quantity,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          phoneNumber: formattedPhone,
          paymentAmount: totalAmount,
          paymentCurrency: event.currency || 'KES',
        },
      });
    }

    // Initiate M-Pesa STK Push
    try {
      const accountReference = `EVENT-${eventId.substring(0, 8)}`;
      const transactionDesc = quantity > 1 
        ? `${event.title.substring(0, 8)} x${quantity}`
        : event.title.substring(0, 13);

      const stkResponse = await this.mpesaService.initiateSTKPush(
        formattedPhone,
        totalAmount,
        accountReference,
        transactionDesc,
      );

      // Update registration with checkout ID
      await this.prisma.eventRegistration.update({
        where: { id: registration.id },
        data: {
          mpesaRequestId: stkResponse.CheckoutRequestID,
          mpesaCheckoutId: stkResponse.CheckoutRequestID,
        },
      });

      return {
        registration: {
          ...registration,
          mpesaCheckoutId: stkResponse.CheckoutRequestID,
        },
        requiresPayment: true,
        checkoutRequestId: stkResponse.CheckoutRequestID,
        message: stkResponse.CustomerMessage || 'Please complete payment on your phone',
      };
    } catch (error: any) {
      // Update registration status to failed
      await this.prisma.eventRegistration.update({
        where: { id: registration.id },
        data: {
          paymentStatus: 'FAILED',
        },
      });

      throw new BadRequestException(
        error.message || 'Failed to initiate payment. Please try again.'
      );
    }
  }

  /**
   * Send ticket email to user after successful registration
   * Made public so it can be called from payment callback
   */
  async sendTicketEmail(
    email: string,
    firstName: string,
    lastName: string,
    event: any,
    registration: any,
    quantity: number,
  ) {
    try {
      const fullName = `${firstName} ${lastName}`.trim();
      const eventDate = new Date(event.startDate);
      const formattedDate = eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const formattedTime = eventDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const ticketId = registration.id.substring(0, 8).toUpperCase();
      const isPaid = event.isPaid && event.price && event.price > 0;

      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Event Ticket - ${event.title}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background-color: #f5f5f5; line-height: 1.6; color: #333;">
          
          <!-- Container -->
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);">
            
            <!-- Logo Section -->
            <div style="background-color: #ffffff; padding: 30px; text-align: center; border-bottom: 1px solid #f0f0f0;">
              <img src="https://res.cloudinary.com/dymlg8elg/image/upload/v1726666635/NB-1-removebg-preview_cevjr5.png" alt="NorthernBox Logo" style="max-width: 180px; height: auto; display: inline-block;">
            </div>

            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; color: white;">
              <div style="font-size: 48px; margin-bottom: 16px;">🎫</div>
              <h1 style="font-size: 28px; font-weight: 700; margin: 0 0 12px 0; color: white;">Your Event Ticket</h1>
              <p style="font-size: 16px; margin: 0; color: rgba(255, 255, 255, 0.95);">Registration Confirmed</p>
            </div>

            <!-- Main Content -->
            <div style="padding: 40px 20px;">
              <p style="font-size: 18px; color: #333; margin-bottom: 20px; font-weight: 500;">Hello ${fullName},</p>
              
              <p style="font-size: 16px; color: #666; margin-bottom: 24px; line-height: 1.7;">
                Thank you for registering for <strong>${event.title}</strong>! Your registration has been confirmed.
              </p>

              <!-- Ticket Details Card -->
              <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%); border: 2px solid #c7d2fe; border-radius: 12px; padding: 24px; margin: 32px 0;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <div style="font-size: 14px; color: #667eea; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; font-weight: 600;">Ticket ID</div>
                  <div style="font-size: 24px; font-weight: 700; color: #333; font-family: 'Courier New', monospace; letter-spacing: 2px;">${ticketId}</div>
                </div>

                <div style="border-top: 1px solid #c7d2fe; padding-top: 20px; margin-top: 20px;">
                  <h2 style="font-size: 22px; color: #333; margin: 0 0 20px 0; font-weight: 600; text-align: center;">${event.title}</h2>
                  
                  ${event.description ? `
                    <p style="font-size: 14px; color: #666; margin-bottom: 20px; line-height: 1.6; text-align: center;">${event.description.substring(0, 150)}${event.description.length > 150 ? '...' : ''}</p>
                  ` : ''}

                  <div style="background-color: white; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; margin-bottom: 12px;">
                      <div style="font-size: 20px; margin-right: 12px;">📅</div>
                      <div>
                        <div style="font-size: 12px; color: #999; text-transform: uppercase; margin-bottom: 4px;">Date & Time</div>
                        <div style="font-size: 16px; color: #333; font-weight: 600;">${formattedDate}</div>
                        <div style="font-size: 14px; color: #666;">${formattedTime}${event.endDate ? ` - ${new Date(event.endDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : ''}</div>
                      </div>
                    </div>
                  </div>

                  ${event.location && (event.locationType === 'PHYSICAL' || event.locationType === 'HYBRID') ? `
                    <div style="background-color: white; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
                      <div style="display: flex; align-items: center;">
                        <div style="font-size: 20px; margin-right: 12px;">📍</div>
                        <div>
                          <div style="font-size: 12px; color: #999; text-transform: uppercase; margin-bottom: 4px;">Location</div>
                          <div style="font-size: 16px; color: #333; font-weight: 600;">${event.location}</div>
                        </div>
                      </div>
                    </div>
                  ` : ''}

                  ${event.onlineLink && (event.locationType === 'ONLINE' || event.locationType === 'HYBRID') ? `
                    <div style="background-color: white; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
                      <div style="display: flex; align-items: center;">
                        <div style="font-size: 20px; margin-right: 12px;">🔗</div>
                        <div>
                          <div style="font-size: 12px; color: #999; text-transform: uppercase; margin-bottom: 4px;">Online Link</div>
                          <div style="font-size: 14px; color: #667eea; word-break: break-all;"><a href="${event.onlineLink}" style="color: #667eea; text-decoration: none;">${event.onlineLink}</a></div>
                        </div>
                      </div>
                    </div>
                  ` : ''}

                  <div style="background-color: white; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                      <div>
                        <div style="font-size: 12px; color: #999; text-transform: uppercase; margin-bottom: 4px;">Number of Tickets</div>
                        <div style="font-size: 20px; color: #333; font-weight: 700;">${quantity}</div>
                      </div>
                      ${isPaid ? `
                        <div style="text-align: right;">
                          <div style="font-size: 12px; color: #999; text-transform: uppercase; margin-bottom: 4px;">Total Paid</div>
                          <div style="font-size: 20px; color: #16a34a; font-weight: 700;">${event.currency || 'KES'} ${registration.paymentAmount?.toLocaleString() || (event.price * quantity).toLocaleString()}</div>
                        </div>
                      ` : `
                        <div style="text-align: right;">
                          <div style="font-size: 12px; color: #999; text-transform: uppercase; margin-bottom: 4px;">Price</div>
                          <div style="font-size: 20px; color: #16a34a; font-weight: 700;">FREE</div>
                        </div>
                      `}
                    </div>
                  </div>

                  ${registration.receiptNumber ? `
                    <div style="background-color: white; border-radius: 8px; padding: 16px;">
                      <div style="display: flex; align-items: center;">
                        <div style="font-size: 20px; margin-right: 12px;">🧾</div>
                        <div>
                          <div style="font-size: 12px; color: #999; text-transform: uppercase; margin-bottom: 4px;">Receipt Number</div>
                          <div style="font-size: 16px; color: #333; font-weight: 600; font-family: 'Courier New', monospace;">${registration.receiptNumber}</div>
                        </div>
                      </div>
                    </div>
                  ` : ''}
                </div>
              </div>

              <!-- Important Information -->
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin: 24px 0; border-radius: 4px;">
                <div style="font-size: 14px; color: #856404; line-height: 1.6;">
                  <strong>📌 Important:</strong><br>
                  • Please save this email as your ticket confirmation<br>
                  • ${event.registrationDeadline ? `Registration deadline: ${new Date(event.registrationDeadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}<br>` : ''}
                  • Arrive on time for the event<br>
                  ${quantity > 1 ? `• This ticket is valid for ${quantity} attendee${quantity > 1 ? 's' : ''}<br>` : ''}
                  • For questions, contact the organizer
                </div>
              </div>

              ${event.contactEmail || event.contactPhone ? `
                <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 24px 0;">
                  <h3 style="font-size: 16px; color: #333; margin: 0 0 12px 0; font-weight: 600;">Need Help?</h3>
                  <p style="font-size: 14px; color: #666; margin: 0 0 8px 0; line-height: 1.6;">
                    ${event.contactEmail ? `Email: <a href="mailto:${event.contactEmail}" style="color: #667eea; text-decoration: none;">${event.contactEmail}</a><br>` : ''}
                    ${event.contactPhone ? `Phone: <a href="tel:${event.contactPhone}" style="color: #667eea; text-decoration: none;">${event.contactPhone}</a>` : ''}
                  </p>
                </div>
              ` : ''}
            </div>

            <!-- Signature Section -->
            <div style="padding: 24px 20px; text-align: center; border-top: 1px solid #eee; background-color: #fafafa;">
              <img src="https://res.cloudinary.com/dymlg8elg/image/upload/v1767153441/nbc_sign_ws7kqb.png" alt="NorthernBox Signature" style="max-width: 150px; height: auto; margin-bottom: 12px;" />
              <p style="font-size: 14px; color: #666; margin: 0 0 8px 0; font-weight: 500;">Best regards,</p>
              <p style="font-size: 14px; color: #333; margin: 0 0 4px 0; font-weight: 600;">The NorthernBox Team</p>
              <p style="font-size: 12px; color: #999; margin: 0;">northernbox.co.ke</p>
            </div>

            <!-- Footer -->
            <div style="background-color: #f5f5f5; padding: 24px 20px; text-align: center; border-top: 1px solid #eee;">
              <p style="font-size: 12px; color: #999; line-height: 1.6; margin: 0;">
                This is your official ticket confirmation. Please keep this email for your records.<br>
                <a href="https://northernbox.co.ke" style="color: #667eea; text-decoration: none; margin: 0 8px;">Website</a> | 
                <a href="https://northernbox.co.ke/support" style="color: #667eea; text-decoration: none; margin: 0 8px;">Support</a>
              </p>
              <p style="font-size: 12px; color: #ccc; line-height: 1.6; margin-top: 16px; margin-bottom: 0;">
                © ${new Date().getFullYear()} NorthernBox. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const text = `Your Event Ticket - ${event.title}\n\nHello ${fullName},\n\nThank you for registering for ${event.title}! Your registration has been confirmed.\n\nTicket ID: ${ticketId}\nEvent: ${event.title}\nDate: ${formattedDate}\nTime: ${formattedTime}${event.endDate ? ` - ${new Date(event.endDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : ''}\n${event.location ? `Location: ${event.location}\n` : ''}${event.onlineLink ? `Online Link: ${event.onlineLink}\n` : ''}Number of Tickets: ${quantity}\n${isPaid ? `Total Paid: ${event.currency || 'KES'} ${registration.paymentAmount?.toLocaleString() || (event.price * quantity).toLocaleString()}\n` : 'Price: FREE\n'}${registration.receiptNumber ? `Receipt Number: ${registration.receiptNumber}\n` : ''}\nPlease save this email as your ticket confirmation.\n\nBest regards,\nThe NorthernBox Team`;

      await this.emailService.sendEmail(
        email,
        `Your Ticket for ${event.title} - NorthernBox`,
        html,
        text,
        {
          type: 'CUSTOM' as any,
          recipientId: registration.userId,
          metadata: {
            eventId: event.id,
            registrationId: registration.id,
            ticketId,
            quantity,
            eventType: 'ticket_confirmation',
          },
        },
      );

      this.logger.log(`Ticket email sent to ${email} for event ${event.title}`);
    } catch (error: any) {
      this.logger.error(`Failed to send ticket email to ${email}:`, error);
      // Don't throw - email failure shouldn't break registration
    }
  }

  /**
   * Legacy RSVP method - kept for backward compatibility
   * Redirects to register() for free events
   */
  async rsvp(userId: string, eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.isPaid) {
      throw new BadRequestException('This is a paid event. Please use the register endpoint with phone number.');
    }

    return this.register(userId, eventId);
  }

  async cancelRsvp(userId: string, eventId: string) {
    // Cancel registration
    const registration = await this.prisma.eventRegistration.findFirst({
      where: {
        eventId: eventId,
        userId: userId,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    if (registration) {
      await this.prisma.eventRegistration.update({
        where: { id: registration.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });
    }

    // Remove from attendees
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

