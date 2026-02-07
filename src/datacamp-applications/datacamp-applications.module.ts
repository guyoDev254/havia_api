import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailService } from '../common/services/email.service';
import { DataCampApplicationsController } from './datacamp-applications.controller';
import { DataCampApplicationsService } from './datacamp-applications.service';

@Module({
  imports: [PrismaModule],
  controllers: [DataCampApplicationsController],
  providers: [DataCampApplicationsService, EmailService],
  exports: [DataCampApplicationsService],
})
export class DataCampApplicationsModule {}
