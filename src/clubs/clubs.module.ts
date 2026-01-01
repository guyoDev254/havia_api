import { Module } from '@nestjs/common';
import { ClubsService } from './clubs.service';
import { ClubsController } from './clubs.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProgramsModule } from './programs/programs.module';
import { ResourcesModule } from './resources/resources.module';
import { ClubFeaturesService } from './club-features.service';
import { ClubFeaturesController } from './club-features.controller';

@Module({
  imports: [NotificationsModule, ProgramsModule, ResourcesModule],
  controllers: [ClubsController, ClubFeaturesController],
  providers: [ClubsService, ClubFeaturesService],
  exports: [ClubsService, ClubFeaturesService],
})
export class ClubsModule {}

