import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { EncryptionService } from '../common/services/encryption.service';
import { EmailService } from '../common/services/email.service';
import { AuditService } from '../common/services/audit.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { MentorshipModule } from '../mentorship/mentorship.module';

@Module({
  imports: [NotificationsModule, MentorshipModule],
  controllers: [AdminController],
  providers: [AdminService, EncryptionService, EmailService, AuditService],
  exports: [AdminService],
})
export class AdminModule {}

