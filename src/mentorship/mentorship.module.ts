import { Module } from '@nestjs/common';
import { MentorshipService } from './mentorship.service';
import { MentorshipController } from './mentorship.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { BadgesModule } from '../badges/badges.module';

@Module({
  imports: [NotificationsModule, BadgesModule],
  controllers: [MentorshipController],
  providers: [MentorshipService],
  exports: [MentorshipService],
})
export class MentorshipModule {}

