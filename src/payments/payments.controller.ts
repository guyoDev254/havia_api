import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MpesaService } from './mpesa.service';
import { PrismaService } from '../prisma/prisma.service';
import { Logger } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsService } from '../events/events.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private mpesaService: MpesaService,
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private eventsService: EventsService,
  ) {}

  /**
   * M-Pesa STK Push callback endpoint
   * This is called by M-Pesa when payment status changes
   */
  @Post('mpesa/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'M-Pesa STK Push callback (called by M-Pesa)' })
  async mpesaCallback(@Body() callbackData: any) {
    this.logger.log('M-Pesa callback received:', JSON.stringify(callbackData));

    try {
      const body = callbackData.Body || callbackData;
      const stkCallback = body.stkCallback || body;

      if (!stkCallback) {
        this.logger.warn('Invalid callback format');
        return { ResultCode: 0, ResultDesc: 'Callback received' };
      }

      const checkoutRequestId = stkCallback.CheckoutRequestID;
      const resultCode = stkCallback.ResultCode;
      const resultDesc = stkCallback.ResultDesc;
      const callbackMetadata = stkCallback.CallbackMetadata;

      // Find the registration by checkout request ID
      const registration = await this.prisma.eventRegistration.findFirst({
        where: { mpesaCheckoutId: checkoutRequestId },
        include: { event: true, user: true },
      });

      if (!registration) {
        this.logger.warn(`Registration not found for CheckoutRequestID: ${checkoutRequestId}`);
        return { ResultCode: 0, ResultDesc: 'Callback received' };
      }

      // Handle payment result
      if (resultCode === 0) {
        // Payment successful
        const amount = callbackMetadata?.Item?.find((item: any) => item.Name === 'Amount')?.Value;
        const mpesaReceiptNumber = callbackMetadata?.Item?.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value;
        const transactionDate = callbackMetadata?.Item?.find((item: any) => item.Name === 'TransactionDate')?.Value;
        const phoneNumber = callbackMetadata?.Item?.find((item: any) => item.Name === 'PhoneNumber')?.Value;

        // Update registration
        await this.prisma.eventRegistration.update({
          where: { id: registration.id },
          data: {
            status: 'CONFIRMED',
            paymentStatus: 'SUCCESS',
            paymentReference: mpesaReceiptNumber,
            receiptNumber: mpesaReceiptNumber,
            paymentAmount: amount ? amount / 100 : registration.paymentAmount, // M-Pesa returns amount in cents
            paymentDate: transactionDate ? new Date(transactionDate) : new Date(),
          },
        });

        // Add user to event attendees if not already added
        await this.prisma.event.update({
          where: { id: registration.eventId },
          data: {
            attendees: {
              connect: { id: registration.userId },
            },
          },
        });

        // Get updated registration with quantity
        const updatedRegistration = await this.prisma.eventRegistration.findUnique({
          where: { id: registration.id },
        });

        // Send ticket email to user
        if (registration.user.email && updatedRegistration) {
          try {
            await this.eventsService.sendTicketEmail(
              registration.user.email,
              registration.user.firstName || '',
              registration.user.lastName || '',
              registration.event,
              updatedRegistration,
              updatedRegistration.quantity || 1,
            );
          } catch (error) {
            this.logger.error('Failed to send ticket email:', error);
          }
        }

        // Send confirmation notification to user
        await this.notificationsService.createAndSend(registration.userId, {
          title: 'Payment Successful',
          message: `Your payment for "${registration.event.title}" was successful. Receipt: ${mpesaReceiptNumber}. Check your email for your ticket.`,
          type: 'SYSTEM_ANNOUNCEMENT' as any,
          eventId: registration.eventId,
        });

        // Send notification to organizer
        if (registration.event.organizerId !== registration.userId) {
          await this.notificationsService.createAndSend(registration.event.organizerId, {
            title: 'New Paid Registration',
            message: `${registration.user.firstName} ${registration.user.lastName} registered and paid for your event: ${registration.event.title} (${updatedRegistration?.quantity || 1} ticket${(updatedRegistration?.quantity || 1) > 1 ? 's' : ''})`,
            type: 'EVENT_REMINDER' as any,
            eventId: registration.eventId,
          });
        }

        this.logger.log(`Payment successful for registration ${registration.id}, Receipt: ${mpesaReceiptNumber}`);
      } else {
        // Payment failed
        await this.prisma.eventRegistration.update({
          where: { id: registration.id },
          data: {
            paymentStatus: 'FAILED',
          },
        });

        this.logger.warn(`Payment failed for registration ${registration.id}: ${resultDesc}`);
      }

      return { ResultCode: 0, ResultDesc: 'Callback processed' };
    } catch (error: any) {
      this.logger.error('Error processing M-Pesa callback:', error);
      return { ResultCode: 1, ResultDesc: 'Error processing callback' };
    }
  }
}

