import { Module, forwardRef } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { EmailService } from '../common/services/email.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [NotificationsModule, forwardRef(() => PaymentsModule)],
  controllers: [EventsController],
  providers: [EventsService, EmailService, PrismaService],
  exports: [EventsService],
})
export class EventsModule {}

