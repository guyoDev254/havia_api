import { Module } from '@nestjs/common';
import { StudentsController } from './students.controller';
import { PublicScholarshipsController } from './public-scholarships.controller';
import { StudentsService } from './students.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [StudentsController, PublicScholarshipsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}

