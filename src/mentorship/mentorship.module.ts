import { Module } from '@nestjs/common';
import { MentorshipService } from './mentorship.service';
import { MentorshipController } from './mentorship.controller';
import { MentorshipPipelineService } from './mentorship-pipeline.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { BadgesModule } from '../badges/badges.module';

@Module({
  imports: [NotificationsModule, BadgesModule],
  controllers: [MentorshipController],
  providers: [MentorshipService, MentorshipPipelineService],
  exports: [MentorshipService, MentorshipPipelineService],
})
export class MentorshipModule {}

