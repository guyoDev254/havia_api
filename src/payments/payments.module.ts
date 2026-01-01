import { Module, forwardRef } from '@nestjs/common';
import { MpesaService } from './mpesa.service';
import { PaymentsController } from './payments.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailService } from '../common/services/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [NotificationsModule, forwardRef(() => EventsModule)],
  providers: [MpesaService, EmailService, PrismaService],
  controllers: [PaymentsController],
  exports: [MpesaService],
})
export class PaymentsModule {}

